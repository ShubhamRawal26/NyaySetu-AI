/**
 * @fileoverview Deterministic parser and BNS 2023 / IPC 1860 statutory normalizer
 * for optical character recognition (OCR) text extracted from photographed FIR documents.
 */

import {
  detectSectionsFromText,
  findCatalogSection,
  normalizeIndicDigits,
} from './bnsCatalog.ts';
import { PETTY_THEFT_THRESHOLD_INR } from './constants.ts';
import type {
  FIROCRExtractionResponse,
  StatutorySectionRecord,
} from '../types/legal.ts';

/**
 * Extracts a numeric INR currency amount from English, Hindi, or Hinglish text.
 *
 * @param text - Input query or OCR text potentially containing a rupee amount.
 * @returns Parsed rupee value or `null` when no monetary figure is present.
 */
export function extractRupeeValueFromText(text: string): number | null {
  const normalized = normalizeIndicDigits(text);
  const match = normalized.match(
    /(?:₹|rs\.?|inr|rupees?)\s*([0-9][0-9,]*(?:\.\d+)?)|([0-9][0-9,]*)\s*(?:rupees?|रुपये|रुपए|₹)/i
  );
  const rawNum = match?.[1] || match?.[2];
  if (!rawNum) return null;
  const parsed = Number(rawNum.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Determines whether a theft scenario qualifies for the Section 303(2) BNS Proviso
 * (first-time theft of property valued under INR 5,000 eligible for Community Service).
 *
 * @param text - User description or OCR text.
 * @param matches - Matched statutory records from the BNS/IPC catalog.
 * @returns `true` if petty theft under INR 5,000 is indicated.
 */
export function isPettyTheftMentioned(
  text: string,
  matches: StatutorySectionRecord[]
): boolean {
  const normalized = normalizeIndicDigits(text).toLowerCase();
  const hasTheftContext =
    matches.some((m) => m.id === 'bns-303-2') ||
    /\b(theft|stolen|steal|chori|bicycle|cycle|petty|303|379)\b|चोरी|साइकिल/i.test(
      normalized
    );
  if (!hasTheftContext) return false;

  const amount = extractRupeeValueFromText(text);
  if (amount !== null && amount < PETTY_THEFT_THRESHOLD_INR) return true;
  return /(?:under|below|less than|<)\s*(?:₹|rs\.?)?\s*5[,]?000|5000\s*से\s*कम/i.test(
    normalized
  );
}

/**
 * Sanitizes raw OCR field captures by stripping punctuation artifacts and whitespace noise.
 */
function cleanOcrValue(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/[|~_`[\]{}\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:.\-,]+|[\s:.\-,]+$/g, '')
    .trim();
  return cleaned.length >= 2 ? cleaned : fallback;
}

/**
 * Parses raw Tesseract or multimodal OCR text from an Indian Police First Information Report (FIR)
 * or Arrest Memo into structured fields and cross-verified BNS 2023 / IPC 1860 sections.
 *
 * @param ocrText - Raw text recognized from the uploaded FIR image or PDF.
 * @param notes - Optional citizen context notes accompanying the document.
 * @returns Normalized FIR extraction payload with bail classification and immediate actions.
 */
export function parseFirOcrTextLocally(
  ocrText: string,
  notes?: string
): FIROCRExtractionResponse {
  const normalized = normalizeIndicDigits(ocrText).replace(/\r\n/g, '\n');
  const combinedForDetection = `${normalized}\n${notes || ''}`;

  const firMatch = normalized.match(
    /(?:F\.?\s*I\.?\s*R\.?|Crime)\s*(?:No\.?|Number|#)?\s*[:\-]?\s*([0-9]{1,6}\s*[\/\-]\s*[0-9]{2,4}|[A-Z0-9\/\-]{4,18})/i
  );
  const psMatch = normalized.match(
    /(?:Police\s*Station|P\.?\s*S\.?|Thana)\s*[:\-]?\s*([A-Za-z0-9 .,'-]{2,48}?)(?:\s*[|\n\r]|\s+Date|\s+Dist)/i
  );
  const dateMatch =
    normalized.match(
      /(?:Date(?:\s*&\s*Time)?|Dated?)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}(?:,?\s*[0-9]{1,2}:[0-9]{2}(?:\s*(?:hrs?|am|pm))?)?)/i
    ) ||
    normalized.match(/\b([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.](?:19|20)[0-9]{2})\b/);

  const complainantMatch = normalized.match(
    /(?:Complainant|Informant)\s*(?:Name)?\s*[:\-]?\s*([A-Za-z .'-]{2,45}?)(?:\s*(?:\[|\||S\/O|W\/O|D\/O|510|S10|Address|\n))/i
  );
  const accusedMatch = normalized.match(
    /(?:Accused)\s*(?:Name(?:\(s\))?)?\s*[:\-]?\s*([A-Za-z .'-]{2,45}?)(?:\s*(?:~|\[|\||S\/O|W\/O|s\/o|Address|\n))/i
  );
  const factsMatch = normalized.match(
    /(?:Brief\s*Facts(?:\s*of\s*Incident)?(?:\s*\([^)]*\))?|Allegation|Incident\s*Details)\s*[:\-]?\s*([\s\S]{15,520}?)(?:\n\s*(?:FIR\s*registered|Complainant\s*Sign|SHO|Signature|$))/i
  );

  const sectionsLineMatch = normalized.match(
    /(?:Sections?|U\/s|Under\s*Section(?:s)?)\s*[:\-]?\s*([^\n]{3,120})/i
  );
  const sectionCandidates: StatutorySectionRecord[] = [];
  const seenIds = new Set<string>();

  const addRecord = (rec: StatutorySectionRecord | undefined) => {
    if (rec && !seenIds.has(rec.id)) {
      seenIds.add(rec.id);
      sectionCandidates.push(rec);
    }
  };

  if (sectionsLineMatch?.[1]) {
    for (const token of sectionsLineMatch[1].split(/[,;&]+/)) {
      addRecord(findCatalogSection(token));
    }
    for (const rec of detectSectionsFromText(sectionsLineMatch[1])) {
      addRecord(rec);
    }
  }

  const explicitRegex =
    /(?:(?:Sec(?:tion)?\.?|U\/s|धारा)\s*(\d{2,3}[A-Za-z]?(?:\(\d+\))?)\s*(BNS|IPC)?|(\d{2,3}[A-Za-z]?(?:\(\d+\))?)\s*(BNS|IPC))/gi;
  let matchIter: RegExpExecArray | null;
  while ((matchIter = explicitRegex.exec(combinedForDetection)) !== null) {
    const num = matchIter[1] || matchIter[3];
    const code = matchIter[2] || matchIter[4] || '';
    addRecord(findCatalogSection(`${num} ${code}`.trim()));
  }

  if (sectionCandidates.length === 0) {
    for (const rec of detectSectionsFromText(combinedForDetection)) {
      addRecord(rec);
    }
  }

  const extractedSections = sectionCandidates.map((sec) => ({
    bns_section: sec.bnsSection,
    ipc_section: sec.ipcSection,
    title: sec.title,
    is_bailable: sec.isBailable,
    max_punishment: sec.maxPunishmentLabel,
    is_compoundable: sec.isCompoundable,
  }));

  const isOverallBailable =
    extractedSections.length > 0 && extractedSections.every((s) => s.is_bailable);
  const pettyTheftFlag = isPettyTheftMentioned(
    combinedForDetection,
    sectionCandidates
  );

  let briefAllegation = cleanOcrValue(factsMatch?.[1]?.replace(/\n+/g, ' '), '');
  if (!briefAllegation) {
    const readableLines = normalized
      .split('\n')
      .map((l) => l.replace(/[|~_`[\]{}\\]+/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((l) => l.length >= 20 && /[a-zA-Z]{4,}/.test(l));
    briefAllegation =
      readableLines.slice(0, 3).join(' ').slice(0, 280) ||
      'Text was scanned from the uploaded document. Please verify the exact allegation and cited sections directly against the original police station FIR copy.';
  }

  const recommendedAction =
    extractedSections.length === 0
      ? 'Section numbers were not clearly legible in this scan. Please confirm the exact BNS/IPC sections on the physical FIR copy or call NALSA Free Legal Aid Helpline 15100.'
      : isOverallBailable
        ? 'All extracted sections are BAILABLE under BNSS 2023. Ask the Police Station (SHO) for immediate station bail on a Personal Bond under Section 478 BNSS, or call NALSA 15100 if refused.'
        : pettyTheftFlag
          ? 'Apply for Regular Bail before the Judicial Magistrate citing the Section 303(2) BNS petty theft proviso (value under Rs. 5,000, first offence qualifies for Community Service). Call NALSA 15100 for a free lawyer.'
          : 'Because a non-bailable section is listed, file a Regular Bail petition before the Judicial Magistrate / Sessions Court under Section 480/483 BNSS and call NALSA Helpline 15100 for free legal aid.';

  return {
    fir_number: cleanOcrValue(firMatch?.[1], 'Not clear'),
    police_station: cleanOcrValue(psMatch?.[1], 'Not clear'),
    date_of_incident: cleanOcrValue(dateMatch?.[1], 'Not clear'),
    complainant_name: cleanOcrValue(complainantMatch?.[1], 'Not clear'),
    accused_name: cleanOcrValue(accusedMatch?.[1], 'Unknown'),
    brief_allegation: briefAllegation,
    extracted_sections: extractedSections,
    is_overall_bailable: isOverallBailable,
    petty_theft_community_service_flag: pettyTheftFlag,
    recommended_immediate_action: recommendedAction,
  };
}
