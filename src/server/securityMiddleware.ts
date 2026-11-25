/**
 * @fileoverview HTTP security headers, per-IP sliding-window rate limiter,
 * control-character input sanitizer, and binary magic-byte file signature verifier.
 */

import type { NextFunction, Request, Response } from 'express';
import {
  MAX_REQUESTS_PER_WINDOW,
  RATE_WINDOW_MS,
} from '../shared/constants.ts';

/**
 * Iframe-safe and Tesseract.js WASM/Blob-compatible Content Security Policy.
 * Permits AI Studio / Cloud Run preview embedding (`frame-ancestors *`) and WebAssembly workers (`blob:`).
 */
export const IFRAME_AND_WASM_SAFE_CSP = [
  "default-src 'self' https: data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https: blob:",
  "worker-src 'self' blob:",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: ws: wss: data: blob:",
  'frame-ancestors *',
].join('; ');

const ipHits = new Map<string, { count: number; resetAt: number }>();

/**
 * Attaches security headers to all outgoing responses while preserving iframe embedding
 * and WebAssembly worker support.
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), geolocation=(), microphone=(self)'
  );
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Content-Security-Policy', IFRAME_AND_WASM_SAFE_CSP);

  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
}

/**
 * Per-IP sliding-window rate limiter (60 requests per 60 seconds) returning
 * standard `Retry-After` headers when exceeded.
 */
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

/**
 * Strips non-printable ASCII control characters and trims user input to a safe maximum length.
 *
 * @param input - Untrusted user input value.
 * @param maxLength - Maximum character count allowed.
 * @returns Sanitized plain-text string.
 */
export function sanitizeInputText(input: unknown, maxLength = 3000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Verifies the binary magic-byte header of a Base64-encoded upload against its declared MIME type.
 *
 * @param base64Data - Raw Base64 payload (without data URL prefix).
 * @param mimeType - Declared MIME type (`image/jpeg`, `image/png`, `image/webp`, or `application/pdf`).
 * @returns `true` if the leading bytes match the canonical file signature.
 */
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
