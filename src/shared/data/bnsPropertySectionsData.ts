/**
 * @fileoverview Property, theft, fraud, trust, and family safeguard records under BNS 2023 & IPC 1860,
 * plus the combined `BNS_STATUTORY_CATALOG` array preserving the exact canonical record ordering.
 */

import type { StatutorySectionRecord } from '../../types/legal.ts';
import { BNS_PERSON_AND_PEACE_SECTIONS } from './bnsSectionsData.ts';

/**
 * Offences relating to property, theft, cheating, criminal breach of trust, trespass, and family cruelty.
 */
export const BNS_PROPERTY_AND_SAFEGUARD_SECTIONS: StatutorySectionRecord[] = [
  {
    id: 'bns-303-2',
    bnsSection: '303(2) BNS',
    ipcSection: '379 IPC',
    title: 'Theft (Petty Theft Proviso < ₹5,000)',
    hindiTitle: 'चोरी (₹5,000 से कम पहली चोरी पर सामुदायिक सेवा)',
    category: 'Property & Theft',
    isBailable: false,
    isCompoundable: true,
    maxPunishmentLabel: '3 Years (Community Service if first offence & value < ₹5,000)',
    maxPunishmentMonths: 36,
    excludedFromSec479: false,
    communityServiceEligible: true,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'BNS Sec. 303(2) Proviso: If property value is below ₹5,000 and it is a first conviction, return of property enables Community Service instead of prison. Sec. 35(3) BNSS notice applies.',
    keywords: ['303', '379', 'theft', 'chori', 'stolen', 'cycle', 'phone', 'petty'],
  },
  {
    id: 'bns-305',
    bnsSection: '305 BNS',
    ipcSection: '380 IPC',
    title: 'Theft in a dwelling house, transport, or place of worship',
    hindiTitle: 'घर या निवास स्थान में चोरी',
    category: 'Property & Theft',
    isBailable: false,
    isCompoundable: false,
    maxPunishmentLabel: '7 Years and Fine',
    maxPunishmentMonths: 84,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Non-bailable, but punishable up to 7 years: Arnesh Kumar / Sec. 35(3) BNSS notice safeguards apply. Eligible for Sec. 479 BNSS bail after 28 months (1/3rd) for first-time offenders.',
    keywords: ['305', '380', 'dwelling', 'house theft', 'ghar me chori'],
  },
  {
    id: 'bns-318-4',
    bnsSection: '318(4) BNS',
    ipcSection: '420 IPC',
    title: 'Cheating and dishonestly inducing delivery of property',
    hindiTitle: 'धोखाधड़ी और बेईमानी से संपत्ति प्राप्त करना',
    category: 'Fraud & Trust',
    isBailable: false,
    isCompoundable: true,
    maxPunishmentLabel: '7 Years and Fine',
    maxPunishmentMonths: 84,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Non-bailable (Court bail under Sec. 480 BNSS). Compoundable with Court permission. First-time undertrials qualify for mandatory Sec. 479 bail after 28 months.',
    keywords: ['318', '420', 'cheating', 'fraud', 'dhokha', 'scam', 'upi', 'money'],
  },
  {
    id: 'bns-316-2',
    bnsSection: '316(2) BNS',
    ipcSection: '406 IPC',
    title: 'Criminal breach of trust',
    hindiTitle: 'आपराधिक विश्वासघात (अमानत में खयानत)',
    category: 'Fraud & Trust',
    isBailable: false,
    isCompoundable: true,
    maxPunishmentLabel: '5 Years or Fine or Both',
    maxPunishmentMonths: 60,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Max 5 years under BNS (increased from 3 years under IPC 406). First-time offenders hit 1/3rd Sec. 479 threshold at 20 months.',
    keywords: ['316', '406', 'breach of trust', 'amanat', 'entrusted'],
  },
  {
    id: 'bns-329-3',
    bnsSection: '329(3) BNS',
    ipcSection: '447 IPC',
    title: 'Criminal trespass',
    hindiTitle: 'आपराधिक अतिचार (अनाधिकृत प्रवेश)',
    category: 'Property & Theft',
    isBailable: true,
    isCompoundable: true,
    maxPunishmentLabel: '3 Months or Fine up to ₹5,000',
    maxPunishmentMonths: 3,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Bailable and compoundable. Police must grant station bail on personal bond.',
    keywords: ['329', '447', 'trespass', 'land dispute', 'zameen', 'ghusna'],
  },
  {
    id: 'bns-85',
    bnsSection: '85 BNS',
    ipcSection: '498A IPC',
    title: 'Husband or relative subjecting woman to cruelty',
    hindiTitle: 'पति या रिश्तेदारों द्वारा क्रूरता',
    category: 'Family & Safeguards',
    isBailable: false,
    isCompoundable: false,
    maxPunishmentLabel: '3 Years and Fine',
    maxPunishmentMonths: 36,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Strict Arnesh Kumar v. State of Bihar compliance mandatory: Police must issue Sec. 35(3) BNSS notice before arrest instead of mechanical arrest. First-time Sec. 479 threshold is 12 months.',
    keywords: ['85', '498a', '498', 'dowry', 'dahej', 'cruelty', 'matrimonial', 'wife'],
  },
];

const ALL_SECTIONS_BY_ID = new Map<string, StatutorySectionRecord>(
  [...BNS_PERSON_AND_PEACE_SECTIONS, ...BNS_PROPERTY_AND_SAFEGUARD_SECTIONS].map(
    (s) => [s.id, s]
  )
);

const CANONICAL_SECTION_ORDER = [
  'bns-115-2',
  'bns-352',
  'bns-351-2',
  'bns-303-2',
  'bns-305',
  'bns-318-4',
  'bns-316-2',
  'bns-117-2',
  'bns-118-1',
  'bns-126-2',
  'bns-329-3',
  'bns-281',
  'bns-85',
  'bns-106-1',
  'bns-355',
  'bns-109',
] as const;

/**
 * Complete BNS 2023 / IPC 1860 statutory directory in canonical priority order.
 */
export const BNS_STATUTORY_CATALOG: StatutorySectionRecord[] =
  CANONICAL_SECTION_ORDER.map((id) => ALL_SECTIONS_BY_ID.get(id)!);
