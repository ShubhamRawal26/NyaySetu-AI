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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('500') ||
    msg.includes('INTERNAL')
  );
}

async function generateWithResilience(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  try {
    return await ai.models.generateContent({
      ...params,
      model: PRIMARY_MODEL,
      config: {
        ...params.config,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
  } catch (err) {
    if (!isTransientError(err)) throw err;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return await ai.models.generateContent({
      ...params,
      model: FALLBACK_MODEL,
    });
  }
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
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

const SYSTEM_PROMPT_CONVERSATIONAL = `You are NyayaSetu, a calm, clear Indian legal-aid helper trained on BNS 2023, BNSS 2023, and the NALSA Free Legal Aid Act (1987).

TONE & CLARITY RULES:
- Use very simple, everyday English. Keep sentences short and calm. No heavy legal jargon, no emojis, no filler.
- empathetic_summary_en: 2-3 short, reassuring plain-English sentences directly answering what to do next.
- empathetic_summary_hi: 2-3 short, warm sentences in simple Hindi (Devanagari).
- immediate_citizen_actions: Exactly 3 short, practical steps (under 15 words each).
- spoken_tts_script: 30-45 words of calm, reassuring spoken English or Hindi (match the user's language) with zero emojis or special symbols.

LEGAL RULES:
1. Always cite both BNS 2023 and old IPC numbers (e.g., "115(2) BNS" and "323 IPC").
2. If all sections are BAILABLE: clearly state police MUST grant bail at the police station on personal bond (Section 478 BNSS).
3. If NON-BAILABLE: gently explain bail must be requested in Magistrate or Sessions Court (Section 480/483 BNSS).
4. Mention Section 479 BNSS (1/3rd mandatory bail for first-time offenders) when detention or jail is involved.
5. Remind families that NALSA Helpline 15100 provides a 100% free government lawyer for anyone in custody.

Return strictly valid JSON matching the schema.`;

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
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
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
  return {
    status: 500,
    message: `Unable to complete AI analysis: ${raw}`,
  };
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nyayasetu-ai' });
  });

  // 1. Conversational Legal First-Aid & Empathetic Paralegal
  app.post('/api/legal-aid', async (req, res) => {
    try {
      const { query, language = 'bilingual' } = req.body as {
        query?: string;
        language?: string;
      };

      if (!query || typeof query !== 'string' || query.trim().length < 3) {
        res.status(400).json({
          error: 'Please describe the legal situation or arrest details in at least a few words.',
        });
        return;
      }

      const trimmedQuery = query.trim().slice(0, 3000);
      // Deterministic Rule Engine First: pre-match known BNS/IPC citations
      const deterministicMatches = detectSectionsFromText(trimmedQuery);
      const deterministicContext =
        deterministicMatches.length > 0
          ? `\n\nDETERMINISTIC STATUTORY PRE-CHECK (Verified BNS 2023 <-> IPC 1860 table — prioritize these exact legal classifications):\n${deterministicMatches
              .map(
                (m) =>
                  `- ${m.bnsSection} [${m.ipcSection}]: ${m.title} | Bailable: ${m.isBailable} | Max Punishment: ${m.maxPunishmentLabel} | Compoundable: ${m.isCompoundable} | Community Service Proviso: ${m.communityServiceEligible}`
              )
              .join('\n')}`
          : '';

      const ai = getGeminiClient();
      const response = await generateWithResilience(ai, {
        contents: `Citizen Inquiry (Preferred language mode: ${language}):\n"${trimmedQuery}"${deterministicContext}`,
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
                description: '3-4 concise, practical immediate steps for the family.',
              },
              nalsa_legal_aid_eligible: {
                type: Type.BOOLEAN,
              },
              spoken_tts_script: {
                type: Type.STRING,
                description:
                  '40-60 word warm audio reassurance script in spoken Hindi (Devanagari) for TTS playback.',
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

      const parsed = JSON.parse(rawText) as LegalAdvisoryResponse;
      // Deterministic invariant verification on overall_bailable
      if (parsed.detected_sections && parsed.detected_sections.length > 0) {
        parsed.overall_bailable = parsed.detected_sections.every((s) => s.is_bailable);
      }

      res.json({
        advisory: parsed,
        deterministicMatches: deterministicMatches.map((m) => ({
          id: m.id,
          bnsSection: m.bnsSection,
          ipcSection: m.ipcSection,
          title: m.title,
        })),
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 2. Multimodal FIR & Police Document Vision OCR
  app.post('/api/fir-ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType, notes } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        notes?: string;
      };

      if (!imageBase64 || !mimeType) {
        res.status(400).json({
          error: 'Please upload an FIR image or select the sample FIR document to scan.',
        });
        return;
      }

      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedMimes.includes(mimeType)) {
        res.status(400).json({
          error: 'Unsupported document format. Please upload JPG, PNG, WEBP, or PDF.',
        });
        return;
      }

      const ai = getGeminiClient();
      const response = await generateWithResilience(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this Indian Police FIR / Arrest Memo / Remand document carefully. Extract all party details, police station, FIR number, date, brief allegation, and every cited penal section mapped accurately between BNS 2023 and legacy IPC 1860.${
                notes ? ` Additional context from family: ${notes.slice(0, 500)}` : ''
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
  app.post('/api/bail-dossier', async (req, res) => {
    try {
      const payload = req.body as Partial<BailDossierRequest>;
      if (!payload.accusedName || !payload.firNumber || !payload.policeStation) {
        res.status(400).json({
          error: 'Accused name, FIR number, and Police Station are required to draft a court petition.',
        });
        return;
      }

      const maxMonths = Number(payload.maxPunishmentMonths || 36);
      const undergoneDays = Number(payload.undergoneDays || 0);
      const isFirstTime = payload.isFirstTimeOffender !== false;
      const catalogMatch = payload.bnsSection
        ? findCatalogSection(payload.bnsSection)
        : undefined;

      const calc = calculateSection479({
        maxPunishmentMonths: maxMonths,
        undergoneDays,
        isFirstTimeOffender: isFirstTime,
        excludedForDeathOrLife: catalogMatch?.excludedFromSec479 ?? false,
      });

      const prompt = `Draft a complete, court-ready Bail Representation / Petition under Section 479 BNSS 2023 (or Regular Bail under Section 480 BNSS with Section 479 computation clearly noted if threshold is not yet reached) with these exact verified particulars:

- Court: ${payload.courtName || 'Court of the Learned Chief Judicial Magistrate'}
- District: ${payload.district || 'Lucknow'}
- FIR / Crime No.: ${payload.firNumber}
- Police Station (Thana): ${payload.policeStation}
- Accused / Applicant: ${payload.accusedName}${payload.fatherOrSpouseName ? ` S/o / W/o ${payload.fatherOrSpouseName}` : ''}
- Judicial Custody Facility / Jail: ${payload.jailName || 'District Jail'}
- Custody Start Date: ${payload.custodyStartDate || 'As per Jail Custody Certificate'}
- Charged Offence: ${payload.bnsSection || '303(2) BNS'} [Corresponding Legacy IPC: ${payload.ipcSection || '379 IPC'}] — ${payload.offenceTitle || 'Alleged Offence'}
- Offender Status: ${isFirstTime ? 'FIRST-TIME OFFENDER (No prior conviction — eligible for 1/3rd mandatory bail under Sec. 479(1) First Proviso BNSS)' : 'GENERAL UNDERTRIAL (Eligible for 1/2 mandatory bail under Sec. 479(1) BNSS)'}
- VERIFIED STATUTORY ARITHMETIC (Do NOT alter these exact figures):
  * Maximum Statutory Punishment: ${payload.maxPunishmentLabel || `${calc.maxPunishmentMonths} months`} (${calc.maxPunishmentDays} days)
  * Applicable Statutory Threshold (${calc.fractionLabel}): ${calc.thresholdMonthsRounded} months (${calc.thresholdDays} days)
  * Actual Period Undergone in Detention: ${calc.undergoneMonthsRounded} months (${calc.undergoneDays} days)
  * Statutory Eligibility Status: ${
    calc.excludedForDeathOrLife
      ? 'EXCLUDED FROM SEC 479 (Death/Life Punishment) — Draft under Section 483 BNSS Regular Bail citing personal liberty precedents.'
      : calc.isEligible
        ? `ELIGIBLE FOR MANDATORY RELEASE (Surplus of ${calc.daysDifference} days beyond threshold — release on Personal Bond mandatory under Sec. 479 BNSS)`
        : `APPROACHING THRESHOLD (${Math.abs(calc.daysDifference)} days remaining to reach Sec. 479 threshold — draft Regular Bail under Sec. 480 BNSS & direct Jail Superintendent under Sec. 479(3) BNSS to calendar mandatory release date)`
  }
${payload.additionalFacts ? `- Additional Family / Humanitarian Facts: ${payload.additionalFacts.slice(0, 600)}` : ''}

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

  // 4. Compassionate Hindi / English Voice Reassurance TTS (Gemini 3.8 Flash Lite TTS)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text } = req.body as { text?: string };
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Speak in a calm, warm, reassuring, empathetic voice to comfort a worried Indian family:\n${text.trim().slice(0, 800)}`,
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
