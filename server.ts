/**
 * @fileoverview Express 4 full-stack server for NyayaSetu AI.
 * Exposes `/api/health`, `/api/legal-aid`, `/api/fir-ocr`, `/api/bail-dossier`, and `/api/tts`
 * backed by the hybrid Google Gemini + deterministic BNS/BNSS/Hinglish engine.
 */

import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { ALLOWED_FIR_MIME_TYPES, MAX_UPLOAD_BYTES } from './src/shared/constants.ts';
import {
  analyzeLegalQueryLocally,
  generateBailDossierLocally,
  parseFirOcrTextLocally,
} from './src/shared/localLegalEngine.ts';
import {
  hasValidFileSignature,
  rateLimitMiddleware,
  sanitizeInputText,
  securityHeadersMiddleware,
} from './src/server/securityMiddleware.ts';
import { enrichWithGeminiIfAvailable, synthesizeSpeechWithGemini } from './src/server/geminiService.ts';
import {
  getCachedAdvisory,
  getLocalOcrWorker,
  setCachedAdvisory,
  type CachedLegalAdvisoryPayload,
} from './src/server/ocrAndCacheService.ts';
import type { BailDossierRequest, FIROCRExtractionResponse } from './src/types/legal.ts';

export { hasValidFileSignature, rateLimitMiddleware, sanitizeInputText };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Handles `POST /api/legal-aid` requests with caching, local BNS/BNSS matching, and optional Gemini enrichment.
 */
async function handleLegalAidRequest(req: Request, res: Response) {
  try {
    const rawQuery = sanitizeInputText(req.body?.query, 3000);
    if (!rawQuery || rawQuery.length < 2) {
      return res.status(400).json({ error: 'Please enter a legal question or describe the situation.' });
    }
    const cacheKey = rawQuery.toLowerCase();
    const cached = getCachedAdvisory(cacheKey);
    if (cached) return res.json(cached);

    const localResult = analyzeLegalQueryLocally(rawQuery);
    const advisory = await enrichWithGeminiIfAvailable(rawQuery, localResult);
    const payload: CachedLegalAdvisoryPayload = {
      advisory,
      deterministicMatches: localResult.deterministicMatches,
    };
    setCachedAdvisory(cacheKey, payload);
    return res.json(payload);
  } catch (err: unknown) {
    console.error('[NyayaSetu] /api/legal-aid error:', err);
    return res.status(500).json({ error: 'Unable to process legal query right now. Please try again.' });
  }
}

/**
 * Handles `POST /api/fir-ocr` requests with magic-byte validation and Tesseract OCR fallback.
 */
async function handleFirOcrRequest(req: Request, res: Response) {
  try {
    const imageBase64Raw = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '';
    const mimeType = sanitizeInputText(req.body?.mimeType, 64);
    const userNotes = sanitizeInputText(req.body?.notes, 500);

    if (!imageBase64Raw || !(ALLOWED_FIR_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return res.status(400).json({
        error: 'Please upload a valid FIR image or PDF (JPEG, PNG, WEBP, or PDF).',
      });
    }
    const cleanBase64 = imageBase64Raw.includes(',') ? imageBase64Raw.split(',')[1] : imageBase64Raw;
    if (Math.ceil((cleanBase64.length * 3) / 4) > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        error: 'Uploaded document exceeds the 8 MB limit. Please upload a smaller image.',
      });
    }
    if (!hasValidFileSignature(cleanBase64, mimeType)) {
      return res.status(400).json({
        error: 'The uploaded file content does not match a valid JPEG, PNG, WEBP, or PDF header.',
      });
    }

    let rawOcrText = '';
    if (mimeType !== 'application/pdf') {
      try {
        const worker = await getLocalOcrWorker();
        const result = await worker.recognize(Buffer.from(cleanBase64, 'base64'));
        rawOcrText = result?.data?.text || '';
      } catch (ocrErr) {
        console.warn('[NyayaSetu] Local OCR fallback:', ocrErr instanceof Error ? ocrErr.message : ocrErr);
      }
    }

    const extraction: FIROCRExtractionResponse = parseFirOcrTextLocally(rawOcrText, userNotes);
    return res.json({ extraction });
  } catch (err: unknown) {
    console.error('[NyayaSetu] /api/fir-ocr error:', err);
    return res.status(500).json({ error: 'Could not read the FIR image right now. Please try a clearer image.' });
  }
}

/**
 * Handles `POST /api/bail-dossier` requests to generate a Section 479/480 BNSS court petition.
 */
function handleBailDossierRequest(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as Partial<BailDossierRequest>;
    const accusedName = sanitizeInputText(body.accusedName, 120);
    const firNumber = sanitizeInputText(body.firNumber, 80);
    const policeStation = sanitizeInputText(body.policeStation, 120);

    if (!accusedName || !firNumber || !policeStation) {
      return res.status(400).json({
        error: 'Accused Name, FIR Number, and Police Station are required to generate a court bail dossier.',
      });
    }

    return res.json(
      generateBailDossierLocally({
        accusedName,
        fatherOrSpouseName: sanitizeInputText(body.fatherOrSpouseName, 120),
        firNumber,
        policeStation,
        district: sanitizeInputText(body.district || 'District Court', 120),
        courtName: sanitizeInputText(body.courtName || 'Court of the Chief Judicial Magistrate', 160),
        jailName: sanitizeInputText(body.jailName || 'Central / District Jail', 120),
        custodyStartDate: sanitizeInputText(body.custodyStartDate || 'As per judicial remand warrant', 60),
        bnsSection: sanitizeInputText(body.bnsSection || '303(2) BNS', 80),
        ipcSection: sanitizeInputText(body.ipcSection || '379 IPC', 80),
        offenceTitle: sanitizeInputText(body.offenceTitle || 'Offence under BNS', 150),
        maxPunishmentLabel: sanitizeInputText(body.maxPunishmentLabel || 'Up to 3 Years', 100),
        maxPunishmentMonths: Math.max(1, Math.min(1200, Number(body.maxPunishmentMonths) || 36)),
        undergoneDays: Math.max(0, Math.min(36500, Number(body.undergoneDays) || 0)),
        isFirstTimeOffender: Boolean(body.isFirstTimeOffender),
        additionalFacts: sanitizeInputText(body.additionalFacts, 1000),
      })
    );
  } catch (err: unknown) {
    console.error('[NyayaSetu] /api/bail-dossier error:', err);
    return res.status(500).json({ error: 'Could not generate the bail application right now. Please try again.' });
  }
}

/**
 * Creates and configures the Express application with security middleware and API routes.
 *
 * @returns Configured Express application instance.
 */
export function createApiApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);

  const jsonSmall = express.json({ limit: '256kb' });
  const jsonLargeUpload = express.json({ limit: '12mb' });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'nyayasetu-ai', engine: 'hybrid-gemini-and-local-bns-bnss-engine' });
  });

  app.post('/api/legal-aid', rateLimitMiddleware, jsonSmall, handleLegalAidRequest);
  app.post('/api/fir-ocr', rateLimitMiddleware, jsonLargeUpload, handleFirOcrRequest);
  app.post('/api/bail-dossier', rateLimitMiddleware, jsonSmall, handleBailDossierRequest);
  app.post('/api/tts', rateLimitMiddleware, jsonSmall, async (req: Request, res: Response) => {
    try {
      const text = sanitizeInputText(req.body?.text, 800);
      if (!text) return res.status(400).json({ error: 'Text is required for speech synthesis.' });
      return res.status(200).json(await synthesizeSpeechWithGemini(text));
    } catch {
      return res.status(200).json({ useBrowserSpeechSynthesis: true });
    }
  });

  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err && typeof err === 'object' && 'type' in err) {
      const errType = (err as { type?: string }).type;
      if (errType === 'entity.too.large') {
        return res.status(413).json({ error: 'Request payload is too large. Please upload an image under 8 MB.' });
      }
      if (errType === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON request payload.' });
      }
    }
    return next(err);
  });

  return app;
}

async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT) || 3000;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '1y', immutable: true }));
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NyayaSetu AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
