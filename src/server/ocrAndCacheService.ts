/**
 * @fileoverview In-memory TTL LRU advisory cache and lazy Tesseract.js OCR worker singleton
 * for the NyayaSetu AI Express server.
 */

import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
import { CACHE_TTL_MS, MAX_CACHE_ENTRIES } from '../shared/constants.ts';
import type { LegalAdvisoryResponse } from '../types/legal.ts';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Shape of a cached `/api/legal-aid` response payload.
 */
export interface CachedLegalAdvisoryPayload {
  advisory: LegalAdvisoryResponse;
  deterministicMatches: Array<{
    id: string;
    bnsSection: string;
    ipcSection: string;
    title: string;
  }>;
}

const advisoryCache = new Map<string, CacheEntry<CachedLegalAdvisoryPayload>>();

/**
 * Retrieves a non-expired legal advisory from the bounded in-memory TTL cache.
 *
 * @param key - Normalized lowercase query key.
 * @returns Cached advisory payload, or `null` on miss/expiry.
 */
export function getCachedAdvisory(
  key: string
): CachedLegalAdvisoryPayload | null {
  const hit = advisoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    advisoryCache.delete(key);
    return null;
  }
  return hit.value;
}

/**
 * Stores a legal advisory response in the bounded in-memory TTL cache.
 *
 * @param key - Normalized lowercase query key.
 * @param value - Advisory payload to cache.
 */
export function setCachedAdvisory(
  key: string,
  value: CachedLegalAdvisoryPayload
): void {
  if (advisoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = advisoryCache.keys().next().value;
    if (oldestKey) advisoryCache.delete(oldestKey);
  }
  advisoryCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

let ocrWorkerPromise: Promise<TesseractWorker> | null = null;

/**
 * Returns a shared, lazily initialized Tesseract.js OCR worker instance.
 *
 * @returns Promise resolving to the active Tesseract OCR worker.
 */
export async function getLocalOcrWorker(): Promise<TesseractWorker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker('eng').catch((err) => {
      ocrWorkerPromise = null;
      throw err;
    });
  }
  return ocrWorkerPromise;
}
