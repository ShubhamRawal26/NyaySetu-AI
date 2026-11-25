/**
 * @fileoverview Deterministic multilingual (English, Hindi, and Romanized Hinglish)
 * Legal First-Aid Engine grounded in BNS 2023, BNSS 2023, and legacy IPC 1860.
 */

import {
  calculateSection479,
  detectSectionsFromText,
  normalizeIndicDigits,
} from './bnsCatalog.ts';
import { DAYS_PER_MONTH } from './constants.ts';
import { isPettyTheftMentioned, parseFirOcrTextLocally } from './firOcrParser.ts';
import { generateBailDossierLocally } from './bailDossierBuilder.ts';
import {
  buildBailableAdvisory,
  buildNonBailableAdvisory,
  buildNoSectionMatchAdvisory,
  buildVictimPerspectiveAdvisory,
  type AdvisoryContentParts,
} from './legalAdvisoryTemplates.ts';
import {
  extractCustodyMonthsFromText,
  extractExplicitMaxPunishmentMonths,
  isRepeatOffenderMentioned,
} from './legalTextExtractors.ts';
import type {
  LegalAdvisoryResponse,
  Section479Calculation,
} from '../types/legal.ts';

export { parseFirOcrTextLocally, generateBailDossierLocally };

/**
 * Analyzes any citizen legal question in English, Hindi, or Romanized Hinglish
 * and returns a bilingual advisory with matched BNS 2023 / IPC 1860 sections.
 *
 * @param query - Citizen's spoken or typed legal question.
 * @returns Bilingual legal advisory and deterministic statutory catalog matches.
 */
export function analyzeLegalQueryLocally(query: string): {
  advisory: LegalAdvisoryResponse;
  deterministicMatches: Array<{
    id: string;
    bnsSection: string;
    ipcSection: string;
    title: string;
  }>;
} {
  const hasDevanagari = /[\u0900-\u097F]/.test(query);
  const matches = detectSectionsFromText(query);
  const custodyMonths = extractCustodyMonthsFromText(query);
  const explicitMaxMonths = extractExplicitMaxPunishmentMonths(query);
  const pettyTheft = isPettyTheftMentioned(query, matches);
  const isFirstTime = !isRepeatOffenderMentioned(query);
  const mentionsSec479 =
    /\b479\b|undertrial|trial has not|in jail|custody|जेल में|विचाराधीन/i.test(
      normalizeIndicDigits(query)
    );

  const primaryNonExcluded = matches.find((m) => !m.excludedFromSec479);
  const maxMonthsFor479 =
    explicitMaxMonths ?? primaryNonExcluded?.maxPunishmentMonths ?? null;
  const anyExcluded = matches.some((m) => m.excludedFromSec479);

  let sec479Calc: Section479Calculation | null = null;
  if (custodyMonths !== null && maxMonthsFor479 !== null && !anyExcluded) {
    sec479Calc = calculateSection479({
      maxPunishmentMonths: maxMonthsFor479,
      undergoneDays: Math.round(custodyMonths * DAYS_PER_MONTH),
      isFirstTimeOffender: isFirstTime,
      excludedForDeathOrLife: false,
    });
  }

  const statutoryBail479Applicable = Boolean(
    sec479Calc?.isEligible ||
      (!anyExcluded && custodyMonths !== null && custodyMonths >= 6) ||
      (!anyExcluded && mentionsSec479 && /\b479\b/i.test(query))
  );

  const qLower = normalizeIndicDigits(query).toLowerCase().trim();
  const isAnticipatoryBailQuery =
    /\b(?:anticipatory\s+bail|agrim\s+jamanat|agrim\s+bail|before\s+arrest|false\s+(?:fir|case)|jhoota\s+case|jhoothi\s+fir|jhuthi\s+fir|framed|phasaya|fasa\s+diya|threaten(?:ing)?\s+to\s+file\s+fir|438\s*crpc|482\s*bnss)\b|अग्रिम जमानत|झूठी\s*(?:एफआईआर|fir|केस)|झूठा केस/i.test(
      qLower
    );

  const isArrestOrCustodyQuery =
    /\b(?:arrest|arrested|police\s+took|police\s+le\s+gay[ei]|police\s+pakad|pakad\s+ke\s+le|utha\s+le\s+gay[ei]|thana|thane|police\s+station|custody|lockup|detained|jail|bail|jamaanat|jmanat|jamanat|fir|remand|warrant|magistrate|court|lawyer|vakil|vakeel)\b|गिरफ्तार|पुलिस|थाने|जेल|जमानत|वकील|अरेस्ट|हिरासत/i.test(
      qLower
    );

  const isVictimPerspective =
    !isArrestOrCustodyQuery &&
    /\b(?:attack(?:ed|ing)?\s+(?:on\s+)?me|someone\s+(?:attack|hit|beat|slap|punch|threaten|cheat|scam|stole|rob|stab)|(?:hit|beat|slapped|punched|assaulted|threatened|cheated|scammed|robbed|stabbed)\s+me|what\s+(?:should|can|do)\s+i\s+do\s+if|self\s*defen[cs]e|kisi\s+ne\s+(?:mujhe|mujh\s*par|mere|mera|meri|chaku|lathi|dande|sariya|online|otp|fraud|dhoka|paise|hamla|humla|chori)|mujhe\s+(?:maara|mara|peeta|pita|dhamki|dhoka|thappad|luta|thag)|mujh\s*par\s+hamla|mere\s+saath\s+(?:marpit|maar\s*peet|dhoka|fraud|chori|galat|scam|thagi)|mera\s+(?:phone|mobile|paisa|paise|wallet|cycle|saman|account)\s+(?:chori|gayab|khali|hack)|paise\s+(?:le\s+liye|thag\s+liye|chori\s+ho|kat\s+gaye|nikal\s+liye)|pati\s+(?:marta|peetta|pareshan)|sasural\s+wale\s+(?:dahej|pareshan|maarte)|agar\s+koi\s+(?:mujhe|mujh\s*par|hamla|maare|dhamki|chori))\b|किसी ने मुझे|मुझ पर हमला|मुझे मारा|मेरे साथ धोखा|मेरा फोन चोरी/i.test(
      qLower
    );

  const hasExplicitNumericSection = /\b\d{2,3}[a-z]?(?:\(\d+\))?\b/i.test(qLower);
  const effectiveMatches =
    isAnticipatoryBailQuery && !hasExplicitNumericSection ? [] : matches;

  const detectedSections = effectiveMatches.map((m) => ({
    bns_section: m.bnsSection,
    ipc_section: m.ipcSection,
    title: m.title,
    is_bailable: m.isBailable,
    max_punishment: m.maxPunishmentLabel,
    is_compoundable: m.isCompoundable,
  }));

  const overallBailable =
    effectiveMatches.length > 0 && effectiveMatches.every((m) => m.isBailable);

  const content: AdvisoryContentParts =
    effectiveMatches.length === 0
      ? buildNoSectionMatchAdvisory({
          qLower,
          hasDevanagari,
          custodyMonths,
          sec479Calc,
          isAnticipatoryBailQuery,
          isArrestOrCustodyQuery,
        })
      : isVictimPerspective
        ? buildVictimPerspectiveAdvisory(effectiveMatches, hasDevanagari)
        : overallBailable
          ? buildBailableAdvisory(effectiveMatches, hasDevanagari)
          : buildNonBailableAdvisory({
              effectiveMatches,
              hasDevanagari,
              anyExcluded,
              pettyTheft,
              sec479Calc,
            });

  return {
    advisory: {
      empathetic_summary_hi: content.summaryHi,
      empathetic_summary_en: content.summaryEn,
      detected_sections: detectedSections,
      overall_bailable: overallBailable,
      statutory_bail_sec_479_applicable: statutoryBail479Applicable,
      immediate_citizen_actions: content.actions,
      nalsa_legal_aid_eligible: true,
      spoken_tts_script: content.spokenScript,
    },
    deterministicMatches: matches.map((m) => ({
      id: m.id,
      bnsSection: m.bnsSection,
      ipcSection: m.ipcSection,
      title: m.title,
    })),
  };
}
