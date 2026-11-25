/**
 * @fileoverview Centralized statutory, security, and runtime constants for NyayaSetu AI.
 * Grounded in the Bharatiya Nyaya Sanhita (BNS), 2023 and Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.
 */

/** Standard Gregorian average days per month used for BNSS Section 479 detention conversion. */
export const DAYS_PER_MONTH = 30.4375;

/** Statutory monetary threshold (in INR) for first-time petty theft community service under Section 303(2) BNS. */
export const PETTY_THEFT_THRESHOLD_INR = 5000;

/** National Legal Services Authority (NALSA) toll-free 24x7 legal aid helpline number. */
export const NALSA_HELPLINE_NUMBER = '15100';

/** Maximum decoded binary size (8 MB) permitted for FIR image and PDF uploads. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Sliding window duration (60 seconds) for per-IP API rate limiting. */
export const RATE_WINDOW_MS = 60_000;

/** Maximum requests permitted per IP address within a single sliding window. */
export const MAX_REQUESTS_PER_WINDOW = 60;

/** Time-to-live (5 minutes) for in-memory legal advisory LRU cache entries. */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum entries retained in the bounded in-memory advisory cache. */
export const MAX_CACHE_ENTRIES = 200;

/** Cooldown duration (10 minutes) when upstream free-tier Gemini API returns 503/429. */
export const GEMINI_CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000;

/** Allowed MIME types for multimodal FIR and Arrest Memo vision OCR scanning. */
export const ALLOWED_FIR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
