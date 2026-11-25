/**
 * @fileoverview Core TypeScript domain contracts for NyayaSetu AI:
 * BNS 2023 / IPC 1860 statutory records, Section 479 BNSS detention calculations,
 * FIR vision OCR payload structures, and court bail petition dossiers.
 */

/**
 * Represents a matched criminal code provision with dual BNS 2023 and legacy IPC 1860 citation.
 */
export interface DetectedSection {
  bns_section: string;
  ipc_section: string;
  title: string;
  is_bailable: boolean;
  max_punishment: string;
  is_compoundable: boolean;
}

/**
 * Bilingual legal first-aid advisory returned by `/api/legal-aid`.
 */
export interface LegalAdvisoryResponse {
  empathetic_summary_hi: string;
  empathetic_summary_en: string;
  detected_sections: DetectedSection[];
  overall_bailable: boolean;
  statutory_bail_sec_479_applicable: boolean;
  immediate_citizen_actions: string[];
  nalsa_legal_aid_eligible: boolean;
  spoken_tts_script: string;
}

/**
 * Structured FIR / Arrest Memo metadata extracted by `/api/fir-ocr`.
 */
export interface FIROCRExtractionResponse {
  fir_number: string;
  police_station: string;
  date_of_incident: string;
  complainant_name: string;
  accused_name: string;
  brief_allegation: string;
  extracted_sections: DetectedSection[];
  is_overall_bailable: boolean;
  petty_theft_community_service_flag: boolean;
  recommended_immediate_action: string;
}

/**
 * Authoritative statutory directory entry mapping a BNS 2023 section to its old IPC 1860 section.
 */
export interface StatutorySectionRecord {
  id: string;
  bnsSection: string;
  ipcSection: string;
  title: string;
  hindiTitle: string;
  category:
    | 'Body & Hurt'
    | 'Property & Theft'
    | 'Fraud & Trust'
    | 'Public Peace & Road'
    | 'Family & Safeguards';
  isBailable: boolean;
  isCompoundable: boolean;
  maxPunishmentLabel: string;
  maxPunishmentMonths: number;
  excludedFromSec479: boolean;
  communityServiceEligible: boolean;
  arneshKumarNoticeApplies: boolean;
  citizenNote: string;
  keywords: string[];
}

/**
 * Computed Section 479 BNSS undertrial detention threshold and bail eligibility metrics.
 */
export interface Section479Calculation {
  maxPunishmentMonths: number;
  maxPunishmentDays: number;
  fractionNumerator: number;
  fractionDenominator: number;
  fractionLabel: string;
  statutoryProvision: string;
  thresholdDays: number;
  thresholdMonthsRounded: number;
  undergoneDays: number;
  undergoneMonthsRounded: number;
  percentOfMax: number;
  percentOfThreshold: number;
  isEligible: boolean;
  daysDifference: number;
  excludedForDeathOrLife: boolean;
}

/**
 * Request payload submitted to `/api/bail-dossier` to draft a formal court bail petition.
 */
export interface BailDossierRequest {
  accusedName: string;
  fatherOrSpouseName: string;
  firNumber: string;
  policeStation: string;
  district: string;
  courtName: string;
  jailName: string;
  bnsSection: string;
  ipcSection: string;
  offenceTitle: string;
  maxPunishmentLabel: string;
  maxPunishmentMonths: number;
  undergoneDays: number;
  isFirstTimeOffender: boolean;
  custodyStartDate?: string;
  additionalFacts?: string;
}

/**
 * Response returned by `/api/bail-dossier` containing the formatted court petition and Section 479 math.
 */
export interface BailDossierResponse {
  dossier_text: string;
  calculation: Section479Calculation;
}

/**
 * Cross-tab payload used to pre-populate the Bail Check engine from Ask Help, Scan FIR, or Your Rights.
 */
export interface BailTransferPayload {
  accusedName?: string;
  firNumber?: string;
  policeStation?: string;
  sectionId?: string;
  bnsSection?: string;
  ipcSection?: string;
  offenceTitle?: string;
}
