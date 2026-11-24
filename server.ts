import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
import {
  analyzeLegalQueryLocally,
  generateBailDossierLocally,
  parseFirOcrTextLocally,
} from './src/shared/localLegalEngine.ts';
import type { BailDossierRequest } from './src/types/legal.ts';

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
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB decoded file limit
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimitApi(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const now = Date.now();
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

  // Verify magic bytes match declared MIME type
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

// Reusable in-process Tesseract OCR worker with serialized queue
let ocrWorkerPromise: Promise<TesseractWorker> | null = null;
let ocrQueue: Promise<unknown> = Promise.resolve();

function getOcrWorker(): Promise<TesseractWorker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker('eng').catch((err) => {
      ocrWorkerPromise = null;
      throw err;
    });
  }
  return ocrWorkerPromise;
}

function recognizeImageBuffer(buffer: Buffer): Promise<string> {
  const run = ocrQueue.then(async () => {
    const worker = await getOcrWorker();
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text || '';
  });
  ocrQueue = run.catch(() => undefined);
  return run;
}

function extractReadablePdfText(buffer: Buffer): string {
  // Extract literal text strings embedded in uncompressed PDF streams
  const latin = buffer.toString('latin1');
  const chunks: string[] = [];
  const regex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(latin)) !== null) {
    const cleaned = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .trim();
    if (cleaned.length >= 2) {
      chunks.push(cleaned);
    }
  }
  return chunks.join(' ');
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

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
  });
  app.use('/api', rateLimitApi);

  const smallJsonParser = express.json({ limit: '256kb' });
  const uploadJsonParser = express.json({ limit: '12mb' });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nyayasetu-local-engine' });
  });

  // 1. Built-In Citizen Legal First-Aid Engine (100% Local BNS/BNSS/NALSA Engine)
  app.post('/api/legal-aid', smallJsonParser, (req, res) => {
    try {
      const { query } = (req.body ?? {}) as { query?: unknown };
      const trimmedQuery = sanitizeText(query, 3000);
      if (trimmedQuery.length < 3) {
        res.status(400).json({
          error: 'Please describe the legal situation or arrest details in at least a few words.',
        });
        return;
      }

      const result = analyzeLegalQueryLocally(trimmedQuery);
      res.json(result);
    } catch {
      res.status(500).json({
        error: 'Unable to analyze this query right now. Please try again.',
      });
    }
  });

  // 2. Built-In Local FIR Vision OCR (Tesseract.js + BNS/IPC Statutory Mapper)
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
      const buffer = Buffer.from(validatedDoc.data, 'base64');

      let ocrText = '';
      if (validatedDoc.mimeType === 'application/pdf') {
        ocrText = extractReadablePdfText(buffer);
        if (ocrText.trim().length < 12) {
          res.status(400).json({
            error:
              'This PDF appears to be a scanned image without embedded text. Please upload a JPG or PNG photo/screenshot of the FIR page.',
          });
          return;
        }
      } else {
        ocrText = await recognizeImageBuffer(buffer);
      }

      const parsed = parseFirOcrTextLocally(ocrText, cleanNotes);
      res.json({ extraction: parsed });
    } catch {
      res.status(500).json({
        error: 'Could not read text from this document. Please try a clearer JPG or PNG photo.',
      });
    }
  });

  // 3. Built-In BNSS Section 479 Statutory Bail Application Generator
  app.post('/api/bail-dossier', smallJsonParser, (req, res) => {
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

      const result = generateBailDossierLocally({
        accusedName,
        fatherOrSpouseName: sanitizeText(payload.fatherOrSpouseName, 120),
        firNumber,
        policeStation,
        district: sanitizeText(payload.district, 100) || 'Lucknow',
        courtName:
          sanitizeText(payload.courtName, 160) ||
          'Court of the Learned Chief Judicial Magistrate',
        jailName: sanitizeText(payload.jailName, 120) || 'District Jail',
        custodyStartDate:
          sanitizeText(payload.custodyStartDate, 40) || 'As per Jail Custody Certificate',
        bnsSection: sanitizeText(payload.bnsSection, 60) || '303(2) BNS',
        ipcSection: sanitizeText(payload.ipcSection, 60) || '379 IPC',
        offenceTitle: sanitizeText(payload.offenceTitle, 160) || 'Alleged Offence',
        maxPunishmentLabel: sanitizeText(payload.maxPunishmentLabel, 60),
        maxPunishmentMonths: parseBoundedNumber(payload.maxPunishmentMonths, 36, 1, 600),
        undergoneDays: parseBoundedNumber(payload.undergoneDays, 0, 0, 18250),
        isFirstTimeOffender: payload.isFirstTimeOffender !== false,
        additionalFacts: sanitizeText(payload.additionalFacts, 600),
      });

      res.json(result);
    } catch {
      res.status(500).json({
        error: 'Could not generate bail letter right now. Please try again.',
      });
    }
  });

  // Return proper JSON 404 for unknown /api/* endpoints instead of falling through to SPA HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
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
