export interface DetectedSection {
  bns_section: string;
  ipc_section: string;
  title: string;
  is_bailable: boolean;
  max_punishment: string;
  is_compoundable: boolean;
}

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

export interface StatutorySectionRecord {
  id: string;
  bnsSection: string;
  ipcSection: string;
  title: string;
  hindiTitle: string;
  category: 'Body & Hurt' | 'Property & Theft' | 'Fraud & Trust' | 'Public Peace & Road' | 'Family & Safeguards';
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

export interface BailDossierResponse {
  dossier_text: string;
  calculation: Section479Calculation;
}

export interface BailTransferPayload {
  accusedName?: string;
  firNumber?: string;
  policeStation?: string;
  sectionId?: string;
  bnsSection?: string;
  ipcSection?: string;
  offenceTitle?: string;
}
