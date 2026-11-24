import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  Type,
} from '@google/genai';
import {
  calculateSection479,
  detectSectionsFromText,
  findCatalogSection,
} from './src/shared/bnsCatalog.ts';
import type {
  BailDossierRequest,
  FIROCRExtractionResponse,
  LegalAdvisoryResponse,
} from './src/types/legal.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const parsed = Number(process.argv[portArgIdx + 1]);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  const eqArg = process.argv.find((arg) => arg.startsWith('--port='));
  if (eqArg) {
    const parsed = Number(eqArg.split('=')[1]);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return Number(process.env.PORT || 3000);
}

const PORT = resolvePort();
const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';

const REQUEST_TIMEOUT_MS = 18_000;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB decoded file limit
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimitApi(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const now = Date.now();
  // Periodic pruning to prevent unbounded memory growth
  if (rateLimitStore.size > 500) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) rateLimitStore.delete(key);
    }
  }

  const forwarded = req.headers['x-forwarded-for'];
  const clientIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip) || 'local';

  const existing = rateLimitStore.get(clientIp);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      error: 'Too many requests in a short time. Please wait a moment and try again.',
    });
    return;
  }

  existing.count += 1;
  next();
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function parseBoundedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function validateUploadedDocument(
  rawBase64: unknown,
  mimeType: unknown
): { ok: true; data: string; mimeType: string } | { ok: false; error: string } {
  const allowedMimes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);
  if (typeof mimeType !== 'string' || !allowedMimes.has(mimeType)) {
    return {
      ok: false,
      error: 'Unsupported document format. Please upload JPG, PNG, WEBP, or PDF.',
    };
  }
  if (typeof rawBase64 !== 'string' || rawBase64.trim().length < 16) {
    return {
      ok: false,
      error: 'Please upload an FIR image or select the sample FIR document to scan.',
    };
  }

  const stripped = (rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64)
    .replace(/\s+/g, '');

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(stripped)) {
    return { ok: false, error: 'Uploaded file data is invalid or corrupted.' };
  }

  const estimatedBytes = Math.floor((stripped.length * 3) / 4);
  if (estimatedBytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: 'Document exceeds the 8 MB limit. Please upload a smaller image or PDF.',
    };
  }

  // Verify magic bytes match declared MIME type to block spoofed uploads
  const headerBuf = Buffer.from(stripped.slice(0, 32), 'base64');
  const isJpeg =
    headerBuf.length >= 3 &&
    headerBuf[0] === 0xff &&
    headerBuf[1] === 0xd8 &&
    headerBuf[2] === 0xff;
  const isPng =
    headerBuf.length >= 4 &&
    headerBuf[0] === 0x89 &&
    headerBuf[1] === 0x50 &&
    headerBuf[2] === 0x4e &&
    headerBuf[3] === 0x47;
  const isWebp =
    headerBuf.length >= 12 &&
    headerBuf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    headerBuf.subarray(8, 12).toString('ascii') === 'WEBP';
  const isPdf =
    headerBuf.length >= 5 && headerBuf.subarray(0, 5).toString('ascii') === '%PDF-';

  const magicMatches =
    (mimeType === 'image/jpeg' && isJpeg) ||
    (mimeType === 'image/png' && isPng) ||
    (mimeType === 'image/webp' && isWebp) ||
    (mimeType === 'application/pdf' && isPdf);

  if (!magicMatches) {
    return {
      ok: false,
      error: 'File content does not match the declared document format.',
    };
  }

  return { ok: true, data: stripped, mimeType };
}

function getGeminiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('500') ||
    msg.includes('INTERNAL') ||
    msg.includes('504') ||
    msg.includes('DEADLINE_EXCEEDED') ||
    msg.includes('AbortError') ||
    msg.includes('timeout')
  );
}

async function generateWithResilience(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  const attempts: Array<{ model: string; useThinking: boolean; delayMs: number }> = [
    { model: PRIMARY_MODEL, useThinking: true, delayMs: 0 },
    { model: FALLBACK_MODEL, useThinking: false, delayMs: 500 },
  ];

  let lastErr: unknown;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
    }
    try {
      return await ai.models.generateContent({
        ...params,
        model: attempt.model,
        config: {
          ...params.config,
          ...(attempt.useThinking
            ? {
                seed: 42,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              }
            : {}),
        },
      });
    } catch (err) {
      lastErr = err;
      const codeMatch = String(err instanceof Error ? err.message : err).match(/\b(4\d\d|5\d\d)\b/);
      console.warn(
        `[NyayaSetu] Gemini attempt failed (${attempt.model}, status=${codeMatch?.[1] ?? 'unknown'})`
      );
      if (!isTransientError(err)) throw err;
    }
  }
  throw lastErr;
}

const LEGAL_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

const SYSTEM_PROMPT_CONVERSATIONAL = `You are "NyayaSetu AI" (न्यायसेतु), an elite, compassionate digital legal aid paralegal engineered specifically for the Indian Justice System under the 2024 criminal law transition:
1. Bharatiya Nyaya Sanhita, 2023 (BNS) [Replaced Indian Penal Code, 1860]
2. Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Replaced Code of Criminal Procedure, 1973]
3. Bharatiya Sakshya Adhiniyam, 2023 (BSA) [Replaced Indian Evidence Act, 1872]
4. Legal Services Authorities Act, 1987 [NALSA / DLSA Framework]

PRIMARY OBJECTIVE & EMOTIONAL PSYCHOLOGY:
- Over 77% of Indian prisoners are undertrials (4.3 lakh citizens). Most families seeking your help are terrified, poor, illiterate, and under immense anxiety over an arrested relative.
- Your primary duty is to immediately alleviate panic, provide utter clarity on legal rights in simple mother-tongue vernacular language, and calculate their statutory bail eligibility.
- Tone: Empathetic, reassuring, dignified, and legally precise. Never use intimidating legal jargon without immediately breaking it down into plain words. Never use emojis.

MANDATORY LEGAL REASONING DIRECTIVES:
1. DUAL STATUTORY CITATIONS:
   Always state BOTH the new BNS 2023 section and the legacy IPC section in parentheses, e.g.:
   "धारा 115(2) BNS [पुराणी धारा 323 IPC]".
2. RIGOROUS BAIL CLASSIFICATION:
   - If BAILABLE (जमानती): State unequivocally that release on bail is a CONSTITUTIONAL & STATUTORY RIGHT under Section 478 of BNSS. The Police Station (SHO) is legally bound to release the person upon executing a personal bond. They cannot legally demand court appearance or detention.
   - If NON-BAILABLE (गैर-जमानती): Explain gently that the police station cannot grant bail, but a regular bail petition must be filed immediately before the Judicial Magistrate or Sessions Court under Section 480/483 of BNSS.
3. THE 2024 UNDERTRIAL REFORM (SECTION 479 BNSS):
   - Highlight Section 479 BNSS: If the undertrial has no prior convictions (First-Time Offender), they are legally entitled to MANDATORY BAIL upon serving ONE-THIRD (1/3rd) of the maximum sentence.
4. MITIGATING CLAUSES (PETTY THEFT):
   - Under Section 303(2) BNS proviso, if the stolen property value is under ₹5,000 and it is a first offense, the law provides for Community Service instead of imprisonment.
5. CONSTITUTIONAL FREE LEGAL COUNSEL (NALSA):
   - Under Section 12 of the Legal Services Authorities Act, 1987, all undertrials in custody and poor citizens have a constitutional right to a 100% FREE defense lawyer from NALSA/DLSA (Helpline: 15100).
6. LANGUAGE & FORMAT:
   - Provide empathetic_summary_en in clear, simple English and empathetic_summary_hi in warm, simple Hindi (Devanagari).
   - Provide 3 concise, practical immediate_citizen_actions (in the same language as the user's query, or bilingual Hindi/English if mixed).
   - Provide spoken_tts_script as 30-55 words of calm, reassuring spoken guidance suitable for TTS playback with zero emojis.
   - Return strictly valid JSON matching the specified schema. Never include markdown code fences or conversational preamble.`;

const GOLDEN_FEW_SHOT_CONTENTS = [
  {
    role: 'user' as const,
    parts: [
      {
        text: 'कल रात पुलिस मेरे भाई को ले गई। पड़ोसी से मामूली कहासुनी हुई थी, पुलिस धारा 115 और 351 लगा रही है। क्या उसे जेल होगी?',
      },
    ],
  },
  {
    role: 'model' as const,
    parts: [
      {
        text: JSON.stringify({
          empathetic_summary_hi:
            'घबराएं बिल्कुल नहीं। आपके भाई पर लगाई गई दोनों धाराएं (धारा 115(2) साधारण चोट एवं धारा 351(2) धमकी) पूर्णतः जमानती (Bailable) हैं। इसका अर्थ है कि थाने से ही जमानत पाना उनका कानूनी अधिकार है। पुलिस उन्हें गैर-कानूनी तरीके से जेल नहीं भेज सकती।',
          empathetic_summary_en:
            'Do not panic. Both sections applied (Section 115(2) simple hurt and Section 351(2) intimidation under BNS 2023) are strictly BAILABLE. Bail is a statutory right directly at the police station upon executing a personal bond.',
          detected_sections: [
            {
              bns_section: '115(2)',
              ipc_section: '323',
              title: 'Voluntarily causing hurt / साधारण मारपीट',
              is_bailable: true,
              max_punishment: '1 year',
              is_compoundable: true,
            },
            {
              bns_section: '351(2)',
              ipc_section: '506',
              title: 'Criminal intimidation / धमकी देना',
              is_bailable: true,
              max_punishment: '2 years',
              is_compoundable: true,
            },
          ],
          overall_bailable: true,
          statutory_bail_sec_479_applicable: false,
          immediate_citizen_actions: [
            'थानेदार (SHO) से तुरंत धारा 478 BNSS के तहत थाने से जमानत (Bail at Police Station) देने की मांग करें।',
            'एक स्थानीय जमानती (Surety) या निजी मुचलका (Personal Bond) प्रस्तुत करें।',
            'यदि पुलिस मना करे, तो तुरंत NALSA विधिक सेवा हेल्पलाइन 15100 पर संपर्क करें।',
          ],
          nalsa_legal_aid_eligible: true,
          spoken_tts_script:
            'घबराइए मत। आपके भाई पर लगी धारा 115 और 351 पूर्णतः जमानती हैं। थाने से ही जमानत उनका कानूनी अधिकार है। आप थाने जाकर निजी मुचलका भरकर उन्हें तुरंत रिहा करवा सकते हैं।',
        }),
      },
    ],
  },
  {
    role: 'user' as const,
    parts: [
      {
        text: 'Police arrested Ramesh for stealing a bicycle worth Rs 3500 under Section 303 BNS. It is his first mistake.',
      },
    ],
  },
  {
    role: 'model' as const,
    parts: [
      {
        text: JSON.stringify({
          empathetic_summary_hi:
            'यह मामला धारा 303(2) BNS (पुरानी IPC 379) चोरी का है। महत्वपूर्ण राहत यह है कि चोरी की गई साइकिल का मूल्य ₹5,000 से कम (₹3,500) है। नए BNS कानून के तहत पहले अपराधी के लिए जेल की जगह सामुदायिक सेवा (Community Service) का विशेष प्रावधान है।',
          empathetic_summary_en:
            'This matter falls under Section 303(2) BNS (Old IPC 379). Crucially, because the value is under ₹5,000 (₹3,500), the new BNS 2023 provides a special reform: first-time offenders are eligible for Community Service rather than harsh imprisonment.',
          detected_sections: [
            {
              bns_section: '303(2)',
              ipc_section: '379',
              title: 'Theft / चोरी',
              is_bailable: false,
              max_punishment: '3 years or Community Service',
              is_compoundable: true,
            },
          ],
          overall_bailable: false,
          statutory_bail_sec_479_applicable: true,
          immediate_citizen_actions: [
            'Request Community Service relief under the Section 303(2) BNS proviso at the very first Magistrate hearing.',
            'Place on record that the accused is a first-time offender with no prior criminal record.',
            'Contact the District Legal Services Authority (DLSA / NALSA 15100) for a free defense lawyer immediately.',
          ],
          nalsa_legal_aid_eligible: true,
          spoken_tts_script:
            'चिंता न करें। चोरी की वस्तु ₹5000 से कम की है, इसलिए नए कानून में पहली बार के अपराधी के लिए जेल के बजाय सामुदायिक सेवा का प्रावधान है। मजिस्ट्रेट के सामने तुरंत जमानत अर्जी लगाएं।',
        }),
      },
    ],
  },
  {
    role: 'user' as const,
    parts: [
      {
        text: 'My uncle has been in district jail for 9 months for a theft case with 2 years max punishment. Trial has not even started. Can he get bail?',
      },
    ],
  },
  {
    role: 'model' as const,
    parts: [
      {
        text: JSON.stringify({
          empathetic_summary_hi:
            'हाँ, बिल्कुल। आपके चाचा नए कानून BNSS की धारा 479 के तहत अनिवार्य वैधानिक जमानत (Mandatory Statutory Bail) के पूर्ण हकदार हैं। 2 वर्ष की अधिकतम सजा का एक-तिहाई (1/3rd) समय 8 महीने होता है, जबकि वे 9 महीने काट चुके हैं। अदालत को उन्हें व्यक्तिगत मुचलके पर रिहा करना होगा।',
          empathetic_summary_en:
            'Yes, absolutely. Your uncle is entitled to MANDATORY statutory bail under Section 479 of BNSS 2023. For a 2-year maximum sentence, the 1/3rd threshold for a first-time offender is 8 months. Having served 9 months, the Court MUST release him on personal bond.',
          detected_sections: [
            {
              bns_section: '303(2)',
              ipc_section: '379',
              title: 'Theft (Under Inquiry/Trial) / विचाराधीन चोरी',
              is_bailable: false,
              max_punishment: '2 years',
              is_compoundable: true,
            },
          ],
          overall_bailable: false,
          statutory_bail_sec_479_applicable: true,
          immediate_citizen_actions: [
            'File a Mandatory Statutory Bail application under Section 479 BNSS before the trial court immediately.',
            'Attach an updated Custody Certificate from the Jail Superintendent confirming 9 months undergone.',
            'Request a free DLSA Legal Aid lawyer via NALSA Helpline 15100 to press for release on personal bond.',
          ],
          nalsa_legal_aid_eligible: true,
          spoken_tts_script:
            'बधाई हो, आपके चाचा धारा 479 के तहत अनिवार्य जमानत के हकदार हैं। उन्होंने 1/3 से ज्यादा सजा काट ली है। कोर्ट को उन्हें तुरंत निजी मुचलके पर रिहा करना होगा।',
        }),
      },
    ],
  },
  {
    role: 'user' as const,
    parts: [
      {
        text: 'Someone accused my brother of cheating and taking money under 420. Police arrested him today.',
      },
    ],
  },
  {
    role: 'model' as const,
    parts: [
      {
        text: JSON.stringify({
          empathetic_summary_hi:
            'यह मामला धारा 318(4) BNS (पुरानी IPC 420 - धोखाधड़ी) का है। यह गैर-जमानती अपराध है, इसलिए पुलिस थाने से जमानत नहीं दे सकती। इसके लिए मजिस्ट्रेट या सत्र अदालत में नियमित जमानत (Regular Bail) अर्जी लगानी होगी।',
          empathetic_summary_en:
            'This matter falls under Section 318(4) BNS (Old IPC 420 - Cheating). It is a non-bailable offense, meaning the police station cannot grant bail. A formal bail application must be moved before the competent Magistrate or Sessions Court under Section 480 BNSS.',
          detected_sections: [
            {
              bns_section: '318(4)',
              ipc_section: '420',
              title: 'Cheating / धोखाधड़ी',
              is_bailable: false,
              max_punishment: '7 years',
              is_compoundable: true,
            },
          ],
          overall_bailable: false,
          statutory_bail_sec_479_applicable: false,
          immediate_citizen_actions: [
            'Move a Regular Bail petition under Section 480 BNSS at the first Magistrate production.',
            'Highlight any documents showing a civil or commercial money dispute rather than criminal fraud.',
            'Ask the court for a free DLSA defense counsel under Section 12 of the Legal Services Authorities Act (15100).',
          ],
          nalsa_legal_aid_eligible: true,
          spoken_tts_script:
            'यह धारा 318 BNS यानी पुरानी 420 का मामला है। यह गैर-जमानती है, लेकिन मजिस्ट्रेट कोर्ट से नियमित जमानत मिल सकती है। आप अदालत में तुरंत मुफ्त सरकारी वकील की सहायता ले सकते हैं।',
        }),
      },
    ],
  },
];

const SYSTEM_PROMPT_FIR_OCR = `You are an Indian Police FIR document reader. Extract details cleanly from photographed, scanned, or handwritten Indian FIRs, Arrest Memos, and Remand Papers.

RULES:
- Extract FIR Number, Police Station, Date of Incident, Complainant Name, Accused Name (or "Unknown"), and a short 1-2 sentence plain-English summary of the allegation.
- Identify all penal sections and map any old IPC numbers to BNS 2023 (e.g., 323 IPC -> 115(2) BNS, 504 IPC -> 352 BNS, 379 IPC -> 303(2) BNS, 420 IPC -> 318(4) BNS).
- Set petty_theft_community_service_flag to true if theft value is under Rs. 5,000 (BNS 303(2) Proviso).
- Write recommended_immediate_action in 1-2 short plain-English sentences with zero emojis and zero legal jargon.

Return strictly valid JSON matching the schema.`;

const SYSTEM_PROMPT_BAIL_DOSSIER = `You are a Senior Legal Aid Defense Counsel in India drafting an expedited Bail Representation / Application under Section 479 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.

STATUTORY FOUNDATION (SECTION 479 BNSS):
- Replaced Section 436A of CrPC 1973.
- Section 479(1) First Proviso mandates: Where a person is a first-time offender (never previously convicted of any offence), he SHALL be released on bail by the Court upon undergoing detention for ONE-THIRD (1/3rd) of the maximum period of imprisonment specified for that offence (excluding offences punishable with death or life imprisonment).
- Section 479(1) main clause mandates release on bond after ONE-HALF (1/2) of maximum punishment for other undertrials.
- The Supreme Court of India in In Re: Policy Strategy for Grant of Bail (Writ Petition (C) No. 406/2013, August 2024 orders) held Section 479 BNSS to be retrospective and binding on all trial courts and Jail Superintendents (who must file an application under Section 479(3) BNSS).

DRAFTING DIRECTIVES:
- Maintain authentic Indian judicial formatting addressed to the competent Chief Judicial Magistrate (CJM) or Court of Sessions.
- Include proper cause title ("IN THE COURT OF..."), Case/FIR particulars, "APPLICATION FOR MANDATORY STATUTORY BAIL UNDER SECTION 479 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023", numbered paragraphs, exact detention arithmetic table/lines, Prayer clause requesting release on Personal Bond without onerous sureties (citing financial hardship & Legal Services Authorities Act Sec. 12), and Verification/Signature block.
- Cite Supreme Court precedents accurately:
  1. In Re: Policy Strategy for Grant of Bail (2024)
  2. Arnesh Kumar v. State of Bihar (2014) 8 SCC 273
  3. Satender Kumar Antil v. CBI (2022) 10 SCC 51
  4. In Re: Inhuman Conditions in 1382 Prisons (2016) 3 SCC 700
- Output clean plain text formatted like an official court filing (no markdown fences or asterisks).`;

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY')) {
    return {
      status: 503,
      message:
        'Gemini API key is not configured yet. Please check Settings > Secrets to attach your API key.',
    };
  }
  if (
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('403')
  ) {
    return {
      status: 403,
      message:
        'Gemini API authentication failed. Please verify your API key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API rate limit reached temporarily. Please wait a moment and try again.',
    };
  }
  if (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('high demand') ||
    raw.includes('DEADLINE_EXCEEDED') ||
    raw.includes('timeout')
  ) {
    return {
      status: 503,
      message:
        'The Gemini AI service is experiencing a brief traffic spike. Please try again in a few seconds.',
    };
  }
  return {
    status: 500,
    message:
      'Unable to complete AI analysis right now. Please try again in a moment.',
  };
}

function normalizeAdvisoryPayload(raw: Partial<LegalAdvisoryResponse>): LegalAdvisoryResponse {
  const sections = Array.isArray(raw.detected_sections)
    ? raw.detected_sections.map((sec) => ({
        bns_section: String(sec?.bns_section || 'Pending Verification'),
        ipc_section: String(sec?.ipc_section || 'N/A'),
        title: String(sec?.title || 'Alleged Offence'),
        is_bailable: Boolean(sec?.is_bailable),
        max_punishment: String(sec?.max_punishment || 'As per statute'),
        is_compoundable: Boolean(sec?.is_compoundable),
      }))
    : [];

  const overallBailable =
    sections.length > 0 ? sections.every((s) => s.is_bailable) : Boolean(raw.overall_bailable);

  const actions =
    Array.isArray(raw.immediate_citizen_actions) && raw.immediate_citizen_actions.length > 0
      ? raw.immediate_citizen_actions.map((step) => String(step)).filter(Boolean)
      : [
          'Request a copy of the FIR and Arrest Memo (Section 47 BNSS) from the police station.',
          'Call NALSA Free Legal Aid Helpline 15100 for immediate assistance from a government lawyer.',
        ];

  return {
    empathetic_summary_hi: String(
      raw.empathetic_summary_hi ||
        'घबराएं नहीं। कृपया पुलिस से FIR और अरेस्ट मेमो की कॉपी मांगें और मुफ्त कानूनी सहायता के लिए NALSA हेल्पलाइन 15100 पर कॉल करें।'
    ),
    empathetic_summary_en: String(
      raw.empathetic_summary_en ||
        'Please stay calm. Ask the police station for a copy of the FIR and Arrest Memo, and call NALSA Helpline 15100 for a free government defense lawyer.'
    ),
    detected_sections: sections,
    overall_bailable: overallBailable,
    statutory_bail_sec_479_applicable: Boolean(raw.statutory_bail_sec_479_applicable),
    immediate_citizen_actions: actions,
    nalsa_legal_aid_eligible: raw.nalsa_legal_aid_eligible !== false,
    spoken_tts_script: String(
      raw.spoken_tts_script || raw.empathetic_summary_hi || raw.empathetic_summary_en || ''
    ),
  };
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers (iframe-compatible for AI Studio preview)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), geolocation=(), microphone=(self)'
    );
    next();
  });

  // Strict no-store caching and per-IP rate limiting on all API routes
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
  });
  app.use('/api', rateLimitApi);

  const smallJsonParser = express.json({ limit: '256kb' });
  const uploadJsonParser = express.json({ limit: '12mb' });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nyayasetu-ai' });
  });

  const advisoryCache = new Map<
    string,
    {
      advisory: LegalAdvisoryResponse;
      deterministicMatches: Array<{
        id: string;
        bnsSection: string;
        ipcSection: string;
        title: string;
      }>;
      expiresAt: number;
    }
  >();
  const ADVISORY_CACHE_TTL_MS = 5 * 60_000;

  // 1. Conversational Legal First-Aid & Empathetic Paralegal
  app.post('/api/legal-aid', smallJsonParser, async (req, res) => {
    try {
      const { query } = (req.body ?? {}) as {
        query?: unknown;
        language?: unknown;
      };

      const trimmedQuery = sanitizeText(query, 3000);
      if (trimmedQuery.length < 3) {
        res.status(400).json({
          error: 'Please describe the legal situation or arrest details in at least a few words.',
        });
        return;
      }

      const cacheKey = trimmedQuery.toLowerCase().replace(/\s+/g, ' ');
      const cached = advisoryCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        res.json({
          advisory: cached.advisory,
          deterministicMatches: cached.deterministicMatches,
        });
        return;
      }

      // Deterministic Rule Engine First: pre-match known BNS/IPC citations
      const deterministicMatches = detectSectionsFromText(trimmedQuery);
      const deterministicContext =
        deterministicMatches.length > 0
          ? `\n\n[VERIFIED BNS 2023 <-> IPC 1860 REFERENCE — prioritize exact bail & punishment status]:\n${deterministicMatches
              .map(
                (m) =>
                  `- BNS ${m.bnsSection} [IPC ${m.ipcSection}]: ${m.title} | Bailable: ${m.isBailable} | Max Punishment: ${m.maxPunishmentLabel} | Compoundable: ${m.isCompoundable} | Community Service Proviso: ${m.communityServiceEligible}`
              )
              .join('\n')}`
          : '';

      const ai = getGeminiClient();
      const response = await generateWithResilience(ai, {
        contents: [
          ...GOLDEN_FEW_SHOT_CONTENTS,
          {
            role: 'user',
            parts: [{ text: `${trimmedQuery}${deterministicContext}` }],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT_CONVERSATIONAL,
          safetySettings: LEGAL_SAFETY_SETTINGS,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              empathetic_summary_hi: {
                type: Type.STRING,
                description:
                  'Warm, reassuring explanation in simple spoken Hindi (Devanagari) answering the user primary fear.',
              },
              empathetic_summary_en: {
                type: Type.STRING,
                description: 'Clear empathetic explanation in plain, accessible English.',
              },
              detected_sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    bns_section: { type: Type.STRING },
                    ipc_section: { type: Type.STRING },
                    title: { type: Type.STRING },
                    is_bailable: { type: Type.BOOLEAN },
                    max_punishment: { type: Type.STRING },
                    is_compoundable: { type: Type.BOOLEAN },
                  },
                  required: [
                    'bns_section',
                    'ipc_section',
                    'title',
                    'is_bailable',
                    'max_punishment',
                    'is_compoundable',
                  ],
                },
              },
              overall_bailable: {
                type: Type.BOOLEAN,
                description:
                  'True ONLY if ALL detected offences are bailable. False if any single offence is non-bailable.',
              },
              statutory_bail_sec_479_applicable: {
                type: Type.BOOLEAN,
              },
              immediate_citizen_actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 concise, practical immediate steps for the family.',
              },
              nalsa_legal_aid_eligible: {
                type: Type.BOOLEAN,
              },
              spoken_tts_script: {
                type: Type.STRING,
                description:
                  '30-55 word warm audio reassurance script in spoken Hindi (Devanagari) for TTS playback.',
              },
            },
            required: [
              'empathetic_summary_hi',
              'empathetic_summary_en',
              'detected_sections',
              'overall_bailable',
              'statutory_bail_sec_479_applicable',
              'immediate_citizen_actions',
              'nalsa_legal_aid_eligible',
              'spoken_tts_script',
            ],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error('Empty response received from Gemini legal engine.');
      }

      const cleanedJson = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = normalizeAdvisoryPayload(
        JSON.parse(cleanedJson) as Partial<LegalAdvisoryResponse>
      );

      const matchSummary = deterministicMatches.map((m) => ({
        id: m.id,
        bnsSection: m.bnsSection,
        ipcSection: m.ipcSection,
        title: m.title,
      }));

      if (advisoryCache.size >= 50) {
        const oldestKey = advisoryCache.keys().next().value;
        if (oldestKey) advisoryCache.delete(oldestKey);
      }
      advisoryCache.set(cacheKey, {
        advisory: parsed,
        deterministicMatches: matchSummary,
        expiresAt: Date.now() + ADVISORY_CACHE_TTL_MS,
      });

      res.json({
        advisory: parsed,
        deterministicMatches: matchSummary,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 2. Multimodal FIR & Police Document Vision OCR
  app.post('/api/fir-ocr', uploadJsonParser, async (req, res) => {
    try {
      const { imageBase64, mimeType, notes } = (req.body ?? {}) as {
        imageBase64?: unknown;
        mimeType?: unknown;
        notes?: unknown;
      };

      const validatedDoc = validateUploadedDocument(imageBase64, mimeType);
      if (!validatedDoc.ok) {
        res.status(400).json({ error: validatedDoc.error });
        return;
      }

      const cleanNotes = sanitizeText(notes, 500);
      const ai = getGeminiClient();
      const response = await generateWithResilience(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: validatedDoc.mimeType,
                data: validatedDoc.data,
              },
            },
            {
              text: `Analyze this Indian Police FIR / Arrest Memo / Remand document carefully. Extract all party details, police station, FIR number, date, brief allegation, and every cited penal section mapped accurately between BNS 2023 and legacy IPC 1860.${
                cleanNotes ? ` Additional context from family: ${cleanNotes}` : ''
              }`,
            },
          ],
        },
        config: {
          systemInstruction: SYSTEM_PROMPT_FIR_OCR,
          safetySettings: LEGAL_SAFETY_SETTINGS,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fir_number: { type: Type.STRING },
              police_station: { type: Type.STRING },
              date_of_incident: { type: Type.STRING },
              complainant_name: { type: Type.STRING },
              accused_name: { type: Type.STRING },
              brief_allegation: { type: Type.STRING },
              extracted_sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    bns_section: { type: Type.STRING },
                    ipc_section: { type: Type.STRING },
                    title: { type: Type.STRING },
                    is_bailable: { type: Type.BOOLEAN },
                    max_punishment: { type: Type.STRING },
                    is_compoundable: { type: Type.BOOLEAN },
                  },
                  required: [
                    'bns_section',
                    'ipc_section',
                    'title',
                    'is_bailable',
                    'max_punishment',
                    'is_compoundable',
                  ],
                },
              },
              is_overall_bailable: { type: Type.BOOLEAN },
              petty_theft_community_service_flag: { type: Type.BOOLEAN },
              recommended_immediate_action: { type: Type.STRING },
            },
            required: [
              'fir_number',
              'police_station',
              'date_of_incident',
              'complainant_name',
              'accused_name',
              'brief_allegation',
              'extracted_sections',
              'is_overall_bailable',
              'petty_theft_community_service_flag',
              'recommended_immediate_action',
            ],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error('Empty OCR response from Gemini vision engine.');
      }

      const parsed = JSON.parse(rawText) as FIROCRExtractionResponse;

      // Cross-verify extracted sections against deterministic BNS catalog
      if (Array.isArray(parsed.extracted_sections)) {
        parsed.extracted_sections = parsed.extracted_sections.map((sec) => {
          const catalogHit =
            findCatalogSection(sec.bns_section) || findCatalogSection(sec.ipc_section);
          if (!catalogHit) return sec;
          return {
            bns_section: catalogHit.bnsSection,
            ipc_section: catalogHit.ipcSection,
            title: catalogHit.title,
            is_bailable: catalogHit.isBailable,
            max_punishment: catalogHit.maxPunishmentLabel,
            is_compoundable: catalogHit.isCompoundable,
          };
        });
        if (parsed.extracted_sections.length > 0) {
          parsed.is_overall_bailable = parsed.extracted_sections.every(
            (s) => s.is_bailable
          );
        }
      }

      res.json({ extraction: parsed });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. BNSS Section 479 Statutory Bail Dossier Generator
  app.post('/api/bail-dossier', smallJsonParser, async (req, res) => {
    try {
      const payload = (req.body ?? {}) as Partial<BailDossierRequest>;
      const accusedName = sanitizeText(payload.accusedName, 120);
      const firNumber = sanitizeText(payload.firNumber, 80);
      const policeStation = sanitizeText(payload.policeStation, 120);

      if (!accusedName || !firNumber || !policeStation) {
        res.status(400).json({
          error: 'Accused name, FIR number, and Police Station are required to draft a court petition.',
        });
        return;
      }

      const fatherOrSpouseName = sanitizeText(payload.fatherOrSpouseName, 120);
      const district = sanitizeText(payload.district, 100) || 'Lucknow';
      const courtName =
        sanitizeText(payload.courtName, 160) ||
        'Court of the Learned Chief Judicial Magistrate';
      const jailName = sanitizeText(payload.jailName, 120) || 'District Jail';
      const custodyStartDate =
        sanitizeText(payload.custodyStartDate, 40) || 'As per Jail Custody Certificate';
      const bnsSection = sanitizeText(payload.bnsSection, 60) || '303(2) BNS';
      const ipcSection = sanitizeText(payload.ipcSection, 60) || '379 IPC';
      const offenceTitle = sanitizeText(payload.offenceTitle, 160) || 'Alleged Offence';
      const maxPunishmentLabel = sanitizeText(payload.maxPunishmentLabel, 60);
      const additionalFacts = sanitizeText(payload.additionalFacts, 600);

      const maxMonths = parseBoundedNumber(payload.maxPunishmentMonths, 36, 1, 600);
      const undergoneDays = parseBoundedNumber(payload.undergoneDays, 0, 0, 18250);
      const isFirstTime = payload.isFirstTimeOffender !== false;
      const catalogMatch = bnsSection ? findCatalogSection(bnsSection) : undefined;

      const calc = calculateSection479({
        maxPunishmentMonths: maxMonths,
        undergoneDays,
        isFirstTimeOffender: isFirstTime,
        excludedForDeathOrLife: catalogMatch?.excludedFromSec479 ?? false,
      });

      const prompt = `Draft a complete, court-ready Bail Representation / Petition under Section 479 BNSS 2023 (or Regular Bail under Section 480 BNSS with Section 479 computation clearly noted if threshold is not yet reached) with these exact verified particulars:

- Court: ${courtName}
- District: ${district}
- FIR / Crime No.: ${firNumber}
- Police Station (Thana): ${policeStation}
- Accused / Applicant: ${accusedName}${fatherOrSpouseName ? ` S/o / W/o ${fatherOrSpouseName}` : ''}
- Judicial Custody Facility / Jail: ${jailName}
- Custody Start Date: ${custodyStartDate}
- Charged Offence: ${bnsSection} [Corresponding Legacy IPC: ${ipcSection}] — ${offenceTitle}
- Offender Status: ${isFirstTime ? 'FIRST-TIME OFFENDER (No prior conviction — eligible for 1/3rd mandatory bail under Sec. 479(1) First Proviso BNSS)' : 'GENERAL UNDERTRIAL (Eligible for 1/2 mandatory bail under Sec. 479(1) BNSS)'}
- VERIFIED STATUTORY ARITHMETIC (Do NOT alter these exact figures):
  * Maximum Statutory Punishment: ${maxPunishmentLabel || `${calc.maxPunishmentMonths} months`} (${calc.maxPunishmentDays} days)
  * Applicable Statutory Threshold (${calc.fractionLabel}): ${calc.thresholdMonthsRounded} months (${calc.thresholdDays} days)
  * Actual Period Undergone in Detention: ${calc.undergoneMonthsRounded} months (${calc.undergoneDays} days)
  * Statutory Eligibility Status: ${
    calc.excludedForDeathOrLife
      ? 'EXCLUDED FROM SEC 479 (Death/Life Punishment) — Draft under Section 483 BNSS Regular Bail citing personal liberty precedents.'
      : calc.isEligible
        ? `ELIGIBLE FOR MANDATORY RELEASE (Surplus of ${calc.daysDifference} days beyond threshold — release on Personal Bond mandatory under Sec. 479 BNSS)`
        : `APPROACHING THRESHOLD (${Math.abs(calc.daysDifference)} days remaining to reach Sec. 479 threshold — draft Regular Bail under Sec. 480 BNSS & direct Jail Superintendent under Sec. 479(3) BNSS to calendar mandatory release date)`
  }
${additionalFacts ? `- Additional Family / Humanitarian Facts: ${additionalFacts}` : ''}

Draft the formal petition clearly so the accused's family or a DLSA Legal Aid Counsel can print and present it directly before the Magistrate.`;

      const ai = getGeminiClient();
      const response = await generateWithResilience(ai, {
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT_BAIL_DOSSIER,
          safetySettings: LEGAL_SAFETY_SETTINGS,
        },
      });

      const dossierText = response.text?.trim();
      if (!dossierText) {
        throw new Error('Unable to generate bail representation text.');
      }

      res.json({
        dossier_text: dossierText,
        calculation: calc,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. Compassionate Hindi / English Voice Reassurance TTS (Gemini 3.8 Flash Lite TTS via v1beta)
  app.post('/api/tts', smallJsonParser, async (req, res) => {
    try {
      const { text } = (req.body ?? {}) as { text?: unknown };
      const cleanText = sanitizeText(text, 800);
      if (cleanText.length === 0) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      const ai = getGeminiClient('v1beta');
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: 'Calm, warm, reassuring, empathetic Indian legal aid helper',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioBase64 =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!audioBase64) {
        throw new Error('No audio waveform was returned by the TTS model.');
      }

      res.json({
        audioBase64,
        mimeType: 'audio/wav',
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Catch-all JSON error handler for malformed JSON bodies or oversized payloads
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (req.path.startsWith('/api')) {
        const status =
          typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          typeof (err as { status?: unknown }).status === 'number'
            ? (err as { status: number }).status
            : 400;
        res.status(status).json({
          error:
            status === 413
              ? 'Request payload is too large. Please reduce the file or message size.'
              : 'Invalid request payload.',
        });
        return;
      }
      next(err);
    }
  );

  return app;
}

async function startServer() {
  const app = createApp();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Start Vite middleware initialization in parallel so port 3000 binds immediately on cold boot
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
          watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
        },
        appType: 'spa',
      })
    );

    vitePromise.catch((err) => {
      console.error('Vite middleware initialization failed:', err);
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NyayaSetu AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NyayaSetu AI server:', err);
  process.exit(1);
});
