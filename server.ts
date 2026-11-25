import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
import {
  analyzeLegalQueryLocally,
  generateBailDossierLocally,
  parseFirOcrTextLocally,
} from './src/shared/localLegalEngine.ts';
import type {
  BailDossierRequest,
  FIROCRExtractionResponse,
  LegalAdvisoryResponse,
} from './src/types/legal.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Security & Rate Limiting Middleware (Per-IP Sliding Window)
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const ipHits = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'local';
  const now = Date.now();

  if (ipHits.size > 2000) {
    for (const [key, val] of ipHits.entries()) {
      if (now > val.resetAt) ipHits.delete(key);
    }
  }

  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    res.setHeader(
      'Retry-After',
      String(Math.ceil((entry.resetAt - now) / 1000))
    );
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before trying again.',
    });
  }

  entry.count += 1;
  return next();
}

export function sanitizeInputText(input: unknown, maxLength = 3000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

// ---------------------------------------------------------------------------
// Bounded TTL In-Memory Cache for Efficiency
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const advisoryCache = new Map<
  string,
  CacheEntry<{
    advisory: LegalAdvisoryResponse;
    deterministicMatches: {
      id: string;
      bnsSection: string;
      ipcSection: string;
      title: string;
    }[];
  }>
>();

function getCachedAdvisory(key: string) {
  const hit = advisoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    advisoryCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedAdvisory(
  key: string,
  value: {
    advisory: LegalAdvisoryResponse;
    deterministicMatches: {
      id: string;
      bnsSection: string;
      ipcSection: string;
      title: string;
    }[];
  }
): void {
  if (advisoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = advisoryCache.keys().next().value;
    if (oldestKey) advisoryCache.delete(oldestKey);
  }
  advisoryCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Binary Magic-Byte Signature Verification for Uploaded Files
// ---------------------------------------------------------------------------
export function hasValidFileSignature(
  base64Data: string,
  mimeType: string
): boolean {
  try {
    const head = Buffer.from(base64Data.slice(0, 64), 'base64');
    if (head.length < 4) return false;

    if (mimeType === 'image/jpeg') {
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return (
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47
      );
    }
    if (mimeType === 'image/webp') {
      return (
        head.length >= 12 &&
        head.subarray(0, 4).toString('ascii') === 'RIFF' &&
        head.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    if (mimeType === 'application/pdf') {
      return head.subarray(0, 4).toString('ascii') === '%PDF';
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Google Services Integration (@google/genai) + Zero-Fail Circuit Breaker
// ---------------------------------------------------------------------------
const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const TTS_GEMINI_MODEL = 'gemini-3.8-flash-lite-tts';

// Circuit breaker trips into instant (<5ms) deterministic local mode when
// upstream free-tier Gemini returns 503/429 or when running offline/without key.
let geminiCircuitOpenUntil = 0;

function getGeminiClient(apiVersion?: string): GoogleGenAI | null {
  if (Date.now() < geminiCircuitOpenUntil) return null;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

const LEGAL_ADVISORY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    empathetic_summary_en: { type: Type.STRING },
    empathetic_summary_hi: { type: Type.STRING },
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
    overall_bailable: { type: Type.BOOLEAN },
    statutory_bail_sec_479_applicable: { type: Type.BOOLEAN },
    immediate_citizen_actions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    nalsa_legal_aid_eligible: { type: Type.BOOLEAN },
    spoken_tts_script: { type: Type.STRING },
  },
  required: [
    'empathetic_summary_en',
    'empathetic_summary_hi',
    'detected_sections',
    'overall_bailable',
    'statutory_bail_sec_479_applicable',
    'immediate_citizen_actions',
    'nalsa_legal_aid_eligible',
    'spoken_tts_script',
  ],
};

async function enrichWithGeminiIfAvailable(
  query: string,
  localResult: {
    advisory: LegalAdvisoryResponse;
    deterministicMatches: {
      id: string;
      bnsSection: string;
      ipcSection: string;
      title: string;
    }[];
  }
): Promise<LegalAdvisoryResponse> {
  // When deterministic engine already matched specific BNS/IPC sections or
  // handled a greeting/self-defence query, return immediately in <5ms for
  // guaranteed statutory precision and zero latency.
  if (
    localResult.advisory.detected_sections.length > 0 ||
    query.split(/\s+/).length <= 12
  ) {
    return localResult.advisory;
  }

  const ai = getGeminiClient();
  if (!ai) return localResult.advisory;

  for (const model of [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL]) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `You are NyayaSetu AI, an Indian legal first-aid assistant grounded in BNS 2023, BNSS 2023, and IPC 1860. Understand English, Hindi, and Romanized Hinglish. Analyze: "${query}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: LEGAL_ADVISORY_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(2500),
        },
      });
      if (response.text) {
        return JSON.parse(response.text) as LegalAdvisoryResponse;
      }
    } catch {
      // Trip circuit breaker for 10 minutes on transient upstream 503/429
      geminiCircuitOpenUntil = Date.now() + 10 * 60 * 1000;
      break;
    }
  }
  return localResult.advisory;
}

// ---------------------------------------------------------------------------
// Built-In Local Tesseract Vision OCR Singleton Worker
// ---------------------------------------------------------------------------
let ocrWorkerPromise: Promise<TesseractWorker> | null = null;

async function getLocalOcrWorker(): Promise<TesseractWorker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker('eng').catch((err) => {
      ocrWorkerPromise = null;
      throw err;
    });
  }
  return ocrWorkerPromise;
}

// ---------------------------------------------------------------------------
// Express Server Initialization
// ---------------------------------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), geolocation=(), microphone=(self)'
    );
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
  });

  const jsonSmall = express.json({ limit: '256kb' });
  const jsonLargeUpload = express.json({ limit: '12mb' });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'nyayasetu-ai',
      engine: 'hybrid-gemini-and-local-bns-bnss-engine',
    });
  });

  // -------------------------------------------------------------------------
  // 1. Conversational Legal First-Aid (English + Hindi + Hinglish)
  // -------------------------------------------------------------------------
  app.post(
    '/api/legal-aid',
    rateLimitMiddleware,
    jsonSmall,
    async (req: Request, res: Response) => {
      try {
        const rawQuery = sanitizeInputText(req.body?.query, 3000);
        if (!rawQuery || rawQuery.length < 2) {
          return res.status(400).json({
            error: 'Please enter a legal question or describe the situation.',
          });
        }

        const cacheKey = rawQuery.toLowerCase();
        const cached = getCachedAdvisory(cacheKey);
        if (cached) {
          return res.json(cached);
        }

        const localResult = analyzeLegalQueryLocally(rawQuery);
        const advisory = await enrichWithGeminiIfAvailable(
          rawQuery,
          localResult
        );
        const payload = {
          advisory,
          deterministicMatches: localResult.deterministicMatches,
        };

        setCachedAdvisory(cacheKey, payload);

        return res.json(payload);
      } catch (err: unknown) {
        console.error('[NyayaSetu] /api/legal-aid error:', err);
        return res.status(500).json({
          error: 'Unable to process legal query right now. Please try again.',
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // 2. Multimodal FIR Vision Scanner (Local Tesseract OCR + Statutory Parser)
  // -------------------------------------------------------------------------
  app.post(
    '/api/fir-ocr',
    rateLimitMiddleware,
    jsonLargeUpload,
    async (req: Request, res: Response) => {
      try {
        const imageBase64Raw =
          typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '';
        const mimeType = sanitizeInputText(req.body?.mimeType, 64);
        const userNotes = sanitizeInputText(req.body?.notes, 500);

        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        if (!imageBase64Raw || !allowedMimes.includes(mimeType)) {
          return res.status(400).json({
            error:
              'Please upload a valid FIR image or PDF (JPEG, PNG, WEBP, or PDF).',
          });
        }

        const cleanBase64 = imageBase64Raw.includes(',')
          ? imageBase64Raw.split(',')[1]
          : imageBase64Raw;

        const approxBytes = Math.ceil((cleanBase64.length * 3) / 4);
        if (approxBytes > 8 * 1024 * 1024) {
          return res.status(413).json({
            error:
              'Uploaded document exceeds the 8 MB limit. Please upload a smaller image.',
          });
        }

        if (!hasValidFileSignature(cleanBase64, mimeType)) {
          return res.status(400).json({
            error:
              'The uploaded file content does not match a valid JPEG, PNG, WEBP, or PDF header.',
          });
        }

        let rawOcrText = '';
        if (mimeType !== 'application/pdf') {
          try {
            const imgBuffer = Buffer.from(cleanBase64, 'base64');
            const worker = await getLocalOcrWorker();
            const result = await worker.recognize(imgBuffer);
            rawOcrText = result?.data?.text || '';
          } catch (ocrErr) {
            console.warn(
              '[NyayaSetu] Local OCR fallback notice:',
              ocrErr instanceof Error ? ocrErr.message : ocrErr
            );
          }
        }

        const extraction: FIROCRExtractionResponse = parseFirOcrTextLocally(
          rawOcrText,
          userNotes
        );

        return res.json({ extraction });
      } catch (err: unknown) {
        console.error('[NyayaSetu] /api/fir-ocr error:', err);
        return res.status(500).json({
          error:
            'Could not read the FIR image right now. Please try a clearer image.',
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // 3. BNSS Section 479 Statutory Bail Dossier Generator
  // -------------------------------------------------------------------------
  app.post(
    '/api/bail-dossier',
    rateLimitMiddleware,
    jsonSmall,
    async (req: Request, res: Response) => {
      try {
        const body = (req.body || {}) as Partial<BailDossierRequest>;

        const accusedName = sanitizeInputText(body.accusedName, 120);
        const fatherOrSpouseName = sanitizeInputText(
          body.fatherOrSpouseName,
          120
        );
        const firNumber = sanitizeInputText(body.firNumber, 80);
        const policeStation = sanitizeInputText(body.policeStation, 120);
        const district = sanitizeInputText(
          body.district || 'District Court',
          120
        );
        const courtName = sanitizeInputText(
          body.courtName || 'Court of the Chief Judicial Magistrate',
          160
        );
        const jailName = sanitizeInputText(
          body.jailName || 'Central / District Jail',
          120
        );
        const custodyStartDate = sanitizeInputText(
          body.custodyStartDate || 'As per judicial remand warrant',
          60
        );
        const bnsSection = sanitizeInputText(body.bnsSection || '303(2) BNS', 80);
        const ipcSection = sanitizeInputText(body.ipcSection || '379 IPC', 80);
        const offenceTitle = sanitizeInputText(
          body.offenceTitle || 'Offence under BNS',
          150
        );
        const maxPunishmentLabel = sanitizeInputText(
          body.maxPunishmentLabel || 'Up to 3 Years',
          100
        );
        const additionalFacts = sanitizeInputText(body.additionalFacts, 1000);

        if (!accusedName || !firNumber || !policeStation) {
          return res.status(400).json({
            error:
              'Accused Name, FIR Number, and Police Station are required to generate a court bail dossier.',
          });
        }

        const maxPunishmentMonths = Math.max(
          1,
          Math.min(1200, Number(body.maxPunishmentMonths) || 36)
        );
        const undergoneDays = Math.max(
          0,
          Math.min(36500, Number(body.undergoneDays) || 0)
        );
        const isFirstTimeOffender = Boolean(body.isFirstTimeOffender);

        const result = generateBailDossierLocally({
          accusedName,
          fatherOrSpouseName,
          firNumber,
          policeStation,
          district,
          courtName,
          jailName,
          custodyStartDate,
          bnsSection,
          ipcSection,
          offenceTitle,
          maxPunishmentLabel,
          maxPunishmentMonths,
          undergoneDays,
          isFirstTimeOffender,
          additionalFacts,
        });

        return res.json(result);
      } catch (err: unknown) {
        console.error('[NyayaSetu] /api/bail-dossier error:', err);
        return res.status(500).json({
          error:
            'Could not generate the bail application right now. Please try again.',
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // 4. Text-to-Speech Endpoint (Gemini 3.8 Flash Lite TTS + Graceful Fallback)
  // -------------------------------------------------------------------------
  app.post(
    '/api/tts',
    rateLimitMiddleware,
    jsonSmall,
    async (req: Request, res: Response) => {
      try {
        const text = sanitizeInputText(req.body?.text, 800);
        if (!text) {
          return res.status(400).json({
            error: 'Text is required for speech synthesis.',
          });
        }

        const ai = getGeminiClient('v1beta');
        if (!ai) {
          return res.status(200).json({
            useBrowserSpeechSynthesis: true,
            text,
          });
        }

        try {
          const response = await ai.models.generateContent({
            model: TTS_GEMINI_MODEL,
            contents: [
              {
                parts: [
                  {
                    text: `Read this legal reassurance message in a calm, warm, supportive Indian voice: ${text}`,
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Aoede' },
                },
              },
              abortSignal: AbortSignal.timeout(3000),
            },
          });

          const inlineAudio =
            response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (inlineAudio?.data) {
            return res.json({
              audioBase64: inlineAudio.data,
              mimeType: inlineAudio.mimeType || 'audio/wav',
            });
          }
        } catch {
          geminiCircuitOpenUntil = Date.now() + 10 * 60 * 1000;
        }

        return res.status(200).json({
          useBrowserSpeechSynthesis: true,
          text,
        });
      } catch (err: unknown) {
        console.error('[NyayaSetu] /api/tts error:', err);
        return res.status(200).json({
          useBrowserSpeechSynthesis: true,
        });
      }
    }
  );

  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({
      error: 'API endpoint not found.',
    });
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err && typeof err === 'object' && 'type' in err) {
      const errType = (err as { type?: string }).type;
      if (errType === 'entity.too.large') {
        return res.status(413).json({
          error:
            'Request payload is too large. Please upload an image under 8 MB.',
        });
      }
      if (errType === 'entity.parse.failed') {
        return res.status(400).json({
          error: 'Invalid JSON request payload.',
        });
      }
    }
    return next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
      })
    );
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[NyayaSetu AI] Server running on http://0.0.0.0:${PORT} (Hybrid Gemini + Built-in BNS/BNSS/Hinglish Engine)`
    );
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
