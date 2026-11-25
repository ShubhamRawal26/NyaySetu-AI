/**
 * @fileoverview Regex-based custody duration, maximum sentence, and citation formatting
 * helpers for the deterministic multilingual BNS/BNSS engine.
 */

import type { StatutorySectionRecord } from '../types/legal.ts';
import { normalizeIndicDigits } from './bnsCatalog.ts';
import { DAYS_PER_MONTH } from './constants.ts';

/**
 * Bilingual advisory content structure returned by template builders.
 */
export interface AdvisoryContentParts {
  summaryEn: string;
  summaryHi: string;
  actions: string[];
  spokenScript: string;
}

/**
 * Extracts detention duration in months from English, Hindi, or Hinglish text.
 *
 * @param text - Citizen's free-form query.
 * @returns Number of months spent in custody, or `null` if none mentioned.
 */
export function extractCustodyMonthsFromText(text: string): number | null {
  const normalized = normalizeIndicDigits(text).toLowerCase();

  const monthMatch = normalized.match(
    /(?:for|since|past|last|in jail(?: for)?|custody(?: for)?|detained(?: for)?|जेल में|हिरासत में)?\s*(\d+(?:\.\d+)?)\s*(?:months?|mos?|महीने|महीनों|माह)\b/i
  );
  if (monthMatch) {
    const idx = monthMatch.index ?? 0;
    const after = normalized.slice(
      idx + monthMatch[0].length,
      idx + monthMatch[0].length + 24
    );
    if (!/\b(?:max|maximum|punishment|sentence|सजा)\b/i.test(after)) {
      const val = Number(monthMatch[1]);
      if (Number.isFinite(val) && val > 0 && val <= 360) return val;
    }
  }

  const yearMatch = normalized.match(
    /(?:in jail|custody|detained|inside|prison|जेल में|बंद)(?:[^0-9]{0,20})(\d+(?:\.\d+)?)\s*(?:years?|yrs?|साल|वर्ष)/i
  );
  if (yearMatch) {
    const val = Number(yearMatch[1]);
    if (Number.isFinite(val) && val > 0 && val <= 30) return val * 12;
  }

  const dayMatch = normalized.match(
    /(?:in jail|custody|detained|जेल में)(?:[^0-9]{0,20})(\d+)\s*(?:days?|दिन)/i
  );
  if (dayMatch) {
    const val = Number(dayMatch[1]);
    if (Number.isFinite(val) && val >= 15) {
      return Number((val / DAYS_PER_MONTH).toFixed(1));
    }
  }

  return null;
}

/**
 * Extracts an explicitly stated maximum sentence duration (in months) from user text.
 *
 * @param text - Citizen's free-form query.
 * @returns Maximum sentence in months, or `null` if not explicitly stated.
 */
export function extractExplicitMaxPunishmentMonths(text: string): number | null {
  const normalized = normalizeIndicDigits(text).toLowerCase();
  const yrMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:years?|yrs?|साल|वर्ष)\s*(?:max|maximum|punishment|sentence|imprisonment|सजा)/i
  );
  if (yrMatch) {
    const val = Number(yrMatch[1]);
    if (Number.isFinite(val) && val >= 0.5 && val <= 30) return Math.round(val * 12);
  }
  const maxYrMatch = normalized.match(
    /(?:max|maximum)\s*(?:punishment|sentence|jail)?\s*(?:is|of)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i
  );
  if (maxYrMatch) {
    const val = Number(maxYrMatch[1]);
    if (Number.isFinite(val) && val >= 0.5 && val <= 30) return Math.round(val * 12);
  }
  return null;
}

/**
 * Checks if the query indicates a repeat or habitual offender with prior convictions.
 *
 * @param text - Citizen's query text.
 * @returns `true` if a prior conviction is mentioned.
 */
export function isRepeatOffenderMentioned(text: string): boolean {
  return /\b(repeat offender|second offence|second offense|prior conviction|previously convicted|habitual)\b|पहले भी सजा/i.test(
    text
  );
}

/**
 * Formats an English dual BNS 2023 + old IPC 1860 statutory citation.
 *
 * @param sec - Statutory section record.
 * @returns Dual English citation string.
 */
export function formatDualCitation(sec: StatutorySectionRecord): string {
  return `Section ${sec.bnsSection} [${sec.ipcSection}]`;
}

/**
 * Formats a Hindi dual BNS 2023 + old IPC 1860 statutory citation.
 *
 * @param sec - Statutory section record.
 * @returns Dual Hindi citation string.
 */
export function formatDualCitationHi(sec: StatutorySectionRecord): string {
  return `धारा ${sec.bnsSection} [पुरानी ${sec.ipcSection}]`;
}
