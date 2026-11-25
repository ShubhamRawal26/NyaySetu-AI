/**
 * @fileoverview Core BNS 2023 / IPC 1860 statutory catalog lookup engine and
 * Section 479 BNSS undertrial detention threshold calculator.
 */

import type {
  Section479Calculation,
  StatutorySectionRecord,
} from '../types/legal.ts';
import { DAYS_PER_MONTH } from './constants.ts';
import { BNS_STATUTORY_CATALOG } from './data/bnsPropertySectionsData.ts';
import {
  DEVANAGARI_DIGITS,
  HINDI_EXTRA_KEYWORDS,
} from './data/hinglishKeywordMap.ts';

export { BNS_STATUTORY_CATALOG };

/**
 * Converts Devanagari numerals (०-९) in a string into standard ASCII numerals (0-9).
 *
 * @param input - Raw English, Hindi, or Hinglish text.
 * @returns Text with Devanagari numerals normalized to ASCII digits.
 */
export function normalizeIndicDigits(input: string): string {
  return input.replace(/[०-९]/g, (ch) => DEVANAGARI_DIGITS[ch] ?? ch);
}

/**
 * Detects all matching BNS 2023 / IPC 1860 statutory provisions mentioned in free-form
 * English, Devanagari Hindi, or Romanized Hinglish text.
 *
 * @param input - Citizen's natural-language query or OCR text.
 * @returns Array of matched statutory section records.
 */
export function detectSectionsFromText(
  input: string
): StatutorySectionRecord[] {
  const normalized = normalizeIndicDigits(input).toLowerCase();
  const matches: StatutorySectionRecord[] = [];

  for (const record of BNS_STATUTORY_CATALOG) {
    const allKeywords = [
      ...record.keywords,
      ...(HINDI_EXTRA_KEYWORDS[record.id] ?? []),
    ];
    const matched = allKeywords.some((kw) => {
      const lowerKw = kw.toLowerCase();
      if (/^[a-z0-9]+$/.test(lowerKw) && lowerKw.length <= 5) {
        const regex = new RegExp(`\\b${lowerKw}\\b`, 'i');
        return regex.test(normalized);
      }
      return normalized.includes(lowerKw);
    });
    if (matched) {
      matches.push(record);
    }
  }

  return matches;
}

/**
 * Looks up a specific statutory record by either its BNS 2023 citation (e.g., "115(2) BNS")
 * or its legacy IPC 1860 citation (e.g., "323 IPC", "498A").
 *
 * @param bnsOrIpc - BNS or IPC section string to resolve.
 * @returns The matching `StatutorySectionRecord`, or `undefined` if not found.
 */
export function findCatalogSection(
  bnsOrIpc: string
): StatutorySectionRecord | undefined {
  const normalized = bnsOrIpc.toLowerCase().trim();
  if (!normalized) return undefined;

  const isExplicitBns = /\bbns\b/i.test(normalized);
  const isExplicitIpc = /\bipc\b/i.test(normalized);
  const clean = normalized.replace(/[^0-9a-z]/g, '');

  const normalizedHyphen = normalized.replace(
    /(\d+)\s*-\s*([a-z])\b/gi,
    '$1$2'
  );
  const numMatch = normalizedHyphen.match(
    /\b(\d+[a-z]?)(?:\s*\(\s*(\d+[a-z]?)\s*\))?\b/i
  );
  const queryBaseNum = numMatch?.[1]?.toLowerCase() ?? '';
  const querySubNum = numMatch?.[2]?.toLowerCase() ?? '';

  const exactHit = BNS_STATUTORY_CATALOG.find((item) => {
    const bnsClean = item.bnsSection.toLowerCase().replace(/[^0-9a-z]/g, '');
    const ipcClean = item.ipcSection.toLowerCase().replace(/[^0-9a-z]/g, '');
    const bnsCompact = item.bnsSection
      .toLowerCase()
      .replace(/\bbns\b/g, '')
      .replace(/[^0-9a-z]/g, '');
    const ipcCompact = item.ipcSection
      .toLowerCase()
      .replace(/\bipc\b/g, '')
      .replace(/[^0-9a-z]/g, '');

    if (clean === bnsClean || clean === ipcClean) return true;
    if (!isExplicitIpc && clean === bnsCompact) return true;
    if (!isExplicitBns && clean === ipcCompact) return true;
    return false;
  });
  if (exactHit) return exactHit;

  if (!queryBaseNum) return undefined;
  return BNS_STATUTORY_CATALOG.find((item) => {
    const bnsNumMatch = item.bnsSection.match(
      /\b(\d+[a-z]?)(?:\s*\(\s*(\d+[a-z]?)\s*\))?\b/i
    );
    const ipcNumMatch = item.ipcSection.match(
      /\b(\d+[a-z]?)(?:\s*\(\s*(\d+[a-z]?)\s*\))?\b/i
    );
    const bnsBase = bnsNumMatch?.[1]?.toLowerCase() ?? '';
    const bnsSub = bnsNumMatch?.[2]?.toLowerCase() ?? '';
    const ipcBase = ipcNumMatch?.[1]?.toLowerCase() ?? '';
    const ipcSub = ipcNumMatch?.[2]?.toLowerCase() ?? '';

    const matchesBns =
      !isExplicitIpc &&
      bnsBase === queryBaseNum &&
      (!querySubNum || !bnsSub || querySubNum === bnsSub);
    const matchesIpc =
      !isExplicitBns &&
      ipcBase === queryBaseNum &&
      (!querySubNum || !ipcSub || querySubNum === ipcSub);

    return matchesBns || matchesIpc;
  });
}

/**
 * Computes mandatory undertrial bail eligibility under Section 479 of the
 * Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 (1/3rd threshold for first-time
 * offenders; 1/2 threshold for general undertrials).
 *
 * @param params - Maximum sentence in months, days served, first-time status, and exclusion flag.
 * @returns Complete Section 479 BNSS detention calculation metrics.
 */
export function calculateSection479(params: {
  maxPunishmentMonths: number;
  undergoneDays: number;
  isFirstTimeOffender: boolean;
  excludedForDeathOrLife?: boolean;
}): Section479Calculation {
  const safeMaxMonths = Math.max(1, params.maxPunishmentMonths);
  const maxPunishmentDays = Math.round(safeMaxMonths * DAYS_PER_MONTH);
  const fractionNumerator = 1;
  const fractionDenominator = params.isFirstTimeOffender ? 3 : 2;

  const thresholdDays = Math.ceil(
    (maxPunishmentDays * fractionNumerator) / fractionDenominator
  );
  const thresholdMonthsRounded = Number(
    (thresholdDays / DAYS_PER_MONTH).toFixed(1)
  );
  const undergoneDays = Math.max(0, Math.round(params.undergoneDays));
  const undergoneMonthsRounded = Number(
    (undergoneDays / DAYS_PER_MONTH).toFixed(1)
  );

  const percentOfMax = Math.min(
    100,
    Number(((undergoneDays / maxPunishmentDays) * 100).toFixed(1))
  );
  const percentOfThreshold = Math.min(
    100,
    Number(((undergoneDays / thresholdDays) * 100).toFixed(1))
  );

  const excluded = Boolean(params.excludedForDeathOrLife);
  const isEligible = !excluded && undergoneDays >= thresholdDays;
  const daysDifference = undergoneDays - thresholdDays;

  return {
    maxPunishmentMonths: safeMaxMonths,
    maxPunishmentDays,
    fractionNumerator,
    fractionDenominator,
    fractionLabel: params.isFirstTimeOffender
      ? 'One-Third (1/3rd) Threshold'
      : 'One-Half (1/2) Threshold',
    statutoryProvision: params.isFirstTimeOffender
      ? 'Section 479(1), First Proviso, BNSS 2023 (First-Time Offender)'
      : 'Section 479(1), BNSS 2023 (General Undertrial Maximum Detention)',
    thresholdDays,
    thresholdMonthsRounded,
    undergoneDays,
    undergoneMonthsRounded,
    percentOfMax,
    percentOfThreshold,
    isEligible,
    daysDifference,
    excludedForDeathOrLife: excluded,
  };
}
