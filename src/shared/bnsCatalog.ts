import type {
  Section479Calculation,
  StatutorySectionRecord,
} from '../types/legal.ts';

export const BNS_STATUTORY_CATALOG: StatutorySectionRecord[] = [
  {
    id: 'bns-115-2',
    bnsSection: '115(2) BNS',
    ipcSection: '323 IPC',
    title: 'Voluntarily causing hurt',
    hindiTitle: 'स्वेच्छा से साधारण चोट पहुंचाना',
    category: 'Body & Hurt',
    isBailable: true,
    isCompoundable: true,
    maxPunishmentLabel: '1 Year or Fine up to ₹10,000',
    maxPunishmentMonths: 12,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Bailable right under Sec. 478 BNSS. Station House Officer (SHO) must release on personal bond.',
    keywords: ['115', '323', 'hurt', 'quarrel', 'slap', 'fight', 'maarpeet', 'jhagda', 'neighbor', 'neighbour'],
  },
  {
    id: 'bns-352',
    bnsSection: '352 BNS',
    ipcSection: '504 IPC',
    title: 'Intentional insult with intent to provoke breach of peace',
    hindiTitle: 'शांति भंग करने के इरादे से जानबूझकर अपमान',
    category: 'Public Peace & Road',
    isBailable: true,
    isCompoundable: true,
    maxPunishmentLabel: '2 Years or Fine or Both',
    maxPunishmentMonths: 24,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Bailable and compoundable. Police cannot refuse bail at the police station under Sec. 478 BNSS.',
    keywords: ['352', '504', 'insult', 'abuse', 'abusive', 'gali', 'galoch', 'provoke'],
  },
  {
    id: 'bns-351-2',
    bnsSection: '351(2) BNS',
    ipcSection: '506 IPC',
    title: 'Criminal intimidation',
    hindiTitle: 'आपराधिक धमकी देना',
    category: 'Public Peace & Road',
    isBailable: true,
    isCompoundable: true,
    maxPunishmentLabel: '2 Years or Fine or Both',
    maxPunishmentMonths: 24,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Standard intimidation under 351(2) BNS is bailable; police station bail applies upon bond.',
    keywords: ['351', '506', 'intimidation', 'threat', 'dhamki', 'threaten'],
  },
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
    id: 'bns-117-2',
    bnsSection: '117(2) BNS',
    ipcSection: '325 IPC',
    title: 'Voluntarily causing grievous hurt',
    hindiTitle: 'स्वेच्छा से गंभीर चोट पहुंचाना',
    category: 'Body & Hurt',
    isBailable: true,
    isCompoundable: true,
    maxPunishmentLabel: '7 Years and Fine',
    maxPunishmentMonths: 84,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Bailable under First Schedule of BNSS despite 7-year max punishment. Bail is a statutory right under Sec. 478 BNSS.',
    keywords: ['117', '325', 'grievous', 'fracture', 'haddi', 'gambhir chot'],
  },
  {
    id: 'bns-118-1',
    bnsSection: '118(1) BNS',
    ipcSection: '324 IPC',
    title: 'Voluntarily causing hurt by dangerous weapons or means',
    hindiTitle: 'खतरनाक हथियार या साधनों से चोट पहुंचाना',
    category: 'Body & Hurt',
    isBailable: false,
    isCompoundable: false,
    maxPunishmentLabel: '3 Years or Fine up to ₹20,000 or Both',
    maxPunishmentMonths: 36,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Non-bailable; bail petition moved before Judicial Magistrate under Sec. 480 BNSS. First-time undertrials reach 1/3rd Sec. 479 bail at 12 months.',
    keywords: ['118', '324', 'weapon', 'stick', 'knife', 'rod', 'hathiyar'],
  },
  {
    id: 'bns-126-2',
    bnsSection: '126(2) BNS',
    ipcSection: '341 IPC',
    title: 'Wrongful restraint',
    hindiTitle: 'गलत तरीके से रास्ता रोकना',
    category: 'Body & Hurt',
    isBailable: true,
    isCompoundable: true,
    maxPunishmentLabel: '1 Month or Fine up to ₹5,000',
    maxPunishmentMonths: 1,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Bailable and compoundable minor offence. Immediate release on personal bond at police station.',
    keywords: ['126', '341', 'restraint', 'rasta rokna', 'blocked'],
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
    id: 'bns-281',
    bnsSection: '281 BNS',
    ipcSection: '279 IPC',
    title: 'Rash driving or riding on a public way',
    hindiTitle: 'सार्वजनिक मार्ग पर लापरवाही से वाहन चलाना',
    category: 'Public Peace & Road',
    isBailable: true,
    isCompoundable: false,
    maxPunishmentLabel: '6 Months or Fine up to ₹1,000',
    maxPunishmentMonths: 6,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Bailable right at the Police Station under Sec. 478 BNSS. No custody required upon executing bail bond.',
    keywords: ['281', '279', 'rash', 'driving', 'accident', 'bike', 'car', 'road'],
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
  {
    id: 'bns-106-1',
    bnsSection: '106(1) BNS',
    ipcSection: '304A IPC',
    title: 'Causing death by negligence',
    hindiTitle: 'लापरवाही से मृत्यु कारित करना',
    category: 'Public Peace & Road',
    isBailable: true,
    isCompoundable: false,
    maxPunishmentLabel: '5 Years and Fine',
    maxPunishmentMonths: 60,
    excludedFromSec479: false,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Sub-section (1) is Bailable under BNSS Schedule I. First-time Sec. 479 bail applies at 20 months if in custody.',
    keywords: ['106', '304a', 'negligence', 'fatal accident', 'laparwahi'],
  },
  {
    id: 'bns-355',
    bnsSection: '355 BNS',
    ipcSection: '510 IPC',
    title: 'Misconduct in public by a drunken person',
    hindiTitle: 'नशे की हालत में सार्वजनिक स्थान पर दुर्व्यवहार',
    category: 'Public Peace & Road',
    isBailable: true,
    isCompoundable: false,
    maxPunishmentLabel: '24 Hours or Fine up to ₹1,000 or Community Service',
    maxPunishmentMonths: 1,
    excludedFromSec479: false,
    communityServiceEligible: true,
    arneshKumarNoticeApplies: true,
    citizenNote:
      'Bailable minor offence explicitly eligible for Community Service under BNS 2023.',
    keywords: ['355', '510', 'drunk', 'alcohol', 'public nuisance', 'sharab'],
  },
  {
    id: 'bns-109',
    bnsSection: '109 BNS',
    ipcSection: '307 IPC',
    title: 'Attempt to murder',
    hindiTitle: 'हत्या का प्रयास',
    category: 'Body & Hurt',
    isBailable: false,
    isCompoundable: false,
    maxPunishmentLabel: '10 Years to Life Imprisonment',
    maxPunishmentMonths: 120,
    excludedFromSec479: true,
    communityServiceEligible: false,
    arneshKumarNoticeApplies: false,
    citizenNote:
      'Serious non-bailable offence triable by Sessions Court (Sec. 483 BNSS). Note: Offences punishable with Life Imprisonment or Death are excluded from Sec. 479 mandatory detention bail.',
    keywords: ['109', '307', 'attempt to murder', 'hatya ka prayas'],
  },
];

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

const HINDI_EXTRA_KEYWORDS: Record<string, string[]> = {
  'bns-115-2': [
    'मारपीट',
    'झगड़ा',
    'कहासुनी',
    'पड़ोसी',
    'थप्पड़',
    'साधारण चोट',
    'हमला',
    'पीटा',
    'मारा',
    'attack',
    'attacked',
    'attacking',
    'assault',
    'assaulted',
    'beat',
    'beaten',
    'beating',
    'hit',
    'hitting',
    'punch',
    'punched',
    'slapped',
    'kick',
    'kicked',
    'violence',
    'physical fight',
    'scuffle',
    'brawl',
    'maara',
    'mara',
    'peeta',
    'pita',
    'maar peet',
    'marpit',
    'maarpit',
    'thappad',
    'ghusa',
    'mukka',
    'laath',
    'hamla',
    'humla',
    'chot',
    'ladai',
    'laddai',
    'larai',
    'padosi',
    'parosi',
    'haath uthaya',
    'hathapai',
  ],
  'bns-352': [
    'गाली',
    'अपमान',
    'अभद्र',
    'बदतमीजी',
    'insulted',
    'humiliate',
    'humiliated',
    'cuss',
    'swearing',
    'vulgar',
    'gaali',
    'gali galoch',
    'gaali galoj',
    'beizzati',
    'badtameezi',
    'apshabd',
  ],
  'bns-351-2': [
    'धमकी',
    'धमकाना',
    'जान से मारने की धमकी',
    'डराना',
    'threatened',
    'threatening',
    'blackmail',
    'blackmailing',
    'extort',
    'intimidate',
    'dhamkana',
    'dhamkiya',
    'dhamkiyan',
    'jaan se maarne',
    'jan se marne',
    'darana',
    'dara raha',
  ],
  'bns-303-2': [
    'चोरी',
    'साइकिल',
    'मोबाइल चोरी',
    'चोर',
    'पर्स चोरी',
    'steal',
    'stealing',
    'stole',
    'robbed',
    'robbery',
    'pickpocket',
    'snatch',
    'snatched',
    'snatching',
    'shoplifting',
    'wallet',
    'purse',
    'laptop',
    'chori ho gaya',
    'chori kar liya',
    'chura liya',
    'churaya',
    'chor',
    'gayab kar diya',
    'mobile chori',
    'phone chori',
    'paisa chori',
  ],
  'bns-305': [
    'घर में चोरी',
    'मकान में चोरी',
    'दुकान में चोरी',
    'ताला तोड़कर',
    'burglary',
    'house break',
    'broke into house',
    'shop theft',
    'ghar mein chori',
    'dukan me chori',
    'dukaan mein chori',
    'tala tod',
    'taala tod',
  ],
  'bns-318-4': [
    'धोखाधड़ी',
    'धोखा',
    'ठगी',
    'फ्रॉड',
    'पैसे ठग',
    'साइबर ठगी',
    'cheated',
    'scammed',
    'scammer',
    'duped',
    'conman',
    'fake job',
    'online fraud',
    'cyber fraud',
    'cyber crime',
    'otp fraud',
    'bank fraud',
    'investment scam',
    'financial fraud',
    'forgery',
    'dhoka',
    'dhokhadhadi',
    'dhokadhadi',
    'thagi',
    'thuggi',
    'thag liya',
    'paise le liye',
    'paisa kha gaya',
    'paise wapas nahi',
    'farzi',
    'nakli',
    'loot liya',
    'chuna laga',
  ],
  'bns-316-2': [
    'अमानत में खयानत',
    'विश्वासघात',
    'embezzlement',
    'misappropriation',
    'kept my property',
    'not returning money',
    'vishwasghat',
    'amanat me khayanat',
    'saman wapas nahi',
  ],
  'bns-117-2': [
    'गंभीर चोट',
    'हड्डी टूट',
    'फ्रैक्चर',
    'सिर फोड़',
    'लहूलुहान',
    'broken bone',
    'severe injury',
    'serious injury',
    'hospitalized',
    'bleeding heavily',
    'stitches',
    'head injury',
    'haddi tod',
    'sir phod',
    'sar fod',
    'khoon nikal',
    'lahuluhan',
  ],
  'bns-118-1': [
    'हथियार',
    'चाकू',
    'लाठी',
    'डंडे',
    'सरिया',
    'तलवार',
    'गोली',
    'stabbed',
    'stabbing',
    'dagger',
    'sword',
    'iron rod',
    'club',
    'lathi',
    'danda',
    'dande',
    'chaku',
    'chaaku',
    'chhuri',
    'sariya',
    'talwar',
    'bandook',
    'katta',
    'sharp weapon',
    'attacked with knife',
    'attacked with stick',
  ],
  'bns-126-2': [
    'रास्ता रोकना',
    'रास्ता रोका',
    'बंधक',
    'कमरे में बंद',
    'blocked my way',
    'blocking road',
    'stopped me from going',
    'locked in room',
    'confined',
    'confinement',
    'held hostage',
    'rasta rok',
    'raasta roka',
    'jaane nahi diya',
    'kamre me band',
    'gher liya',
  ],
  'bns-329-3': [
    'जमीन विवाद',
    'अवैध कब्जा',
    'घर में घुस',
    'प्रॉपर्टी विवाद',
    'trespassing',
    'entered my house',
    'entered my property',
    'encroachment',
    'illegal occupation',
    'land grab',
    'kabza',
    'kabja',
    'jamin vivad',
    'zameen kabza',
    'ghar me ghus',
    'ghar mein ghus',
    'zabarjasti ghus',
  ],
  'bns-281': [
    'एक्सीडेंट',
    'दुर्घटना',
    'लापरवाही से गाड़ी',
    'तेज गाड़ी',
    'टक्कर',
    'road accident',
    'car crash',
    'bike crash',
    'hit and run',
    'over speeding',
    'reckless driving',
    'drunk driving',
    'takkar',
    'gaadi thok',
    'gadi se takkar',
    'bike se takkar',
    'tez रफ़्तार',
    'tez gadi',
  ],
  'bns-85': [
    'दहेज',
    'क्रूरता',
    'प्रताड़ना',
    'ससुराल',
    'घरेलू हिंसा',
    'domestic violence',
    'husband beating',
    'in-laws harassment',
    'in laws torture',
    'marital cruelty',
    'mental torture',
    'husband harassing',
    'sasural',
    'pati marta hai',
    'pati peetta hai',
    'dahej mang',
    'gharelu hinsa',
    'pratadna',
  ],
  'bns-106-1': [
    'लापरवाही से मौत',
    'सड़क दुर्घटना में मौत',
    'accidental death',
    'died in accident',
    'killed in road accident',
    'medical negligence',
    'death due to negligence',
    'accident me maut',
    'takkar se maut',
    'laparwahi se jaan',
  ],
  'bns-355': [
    'शराब',
    'नशे में',
    'हंगामा',
    'intoxicated',
    'drinking in public',
    'creating ruckus',
    'drunken brawl',
    'daaru',
    'daru peekar',
    'nashe me',
    'nashe mein',
    'hungama',
    'bewda',
  ],
  'bns-109': [
    'हत्या का प्रयास',
    'जानलेवा हमला',
    'गोली चलाई',
    'tried to kill',
    'trying to kill',
    'murder attempt',
    'attempted murder',
    'life threatening attack',
    'shot at',
    'strangled',
    'poisoned',
    'jaan se maarne ki koshish',
    'janleva hamla',
    'jaanleva hamla',
    'gala dabane',
    'goli chala',
  ],
};

export function normalizeIndicDigits(input: string): string {
  return input.replace(/[०-९]/g, (ch) => DEVANAGARI_DIGITS[ch] ?? ch);
}

export function detectSectionsFromText(input: string): StatutorySectionRecord[] {
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

export function findCatalogSection(bnsOrIpc: string): StatutorySectionRecord | undefined {
  const normalized = bnsOrIpc.toLowerCase().trim();
  if (!normalized) return undefined;

  const isExplicitBns = /\bbns\b/i.test(normalized);
  const isExplicitIpc = /\bipc\b/i.test(normalized);
  const clean = normalized.replace(/[^0-9a-z]/g, '');

  // Extract primary section number (e.g. "115" from "115(2) BNS", "304a" from "304-A IPC", "498a" from "498A")
  const normalizedHyphen = normalized.replace(/(\d+)\s*-\s*([a-z])\b/gi, '$1$2');
  const numMatch = normalizedHyphen.match(/\b(\d+[a-z]?)(?:\s*\(\s*(\d+[a-z]?)\s*\))?\b/i);
  const queryBaseNum = numMatch?.[1]?.toLowerCase() ?? '';
  const querySubNum = numMatch?.[2]?.toLowerCase() ?? '';

  // Pass 1: exact normalized match or exact base+sub match
  const exactHit = BNS_STATUTORY_CATALOG.find((item) => {
    const bnsClean = item.bnsSection.toLowerCase().replace(/[^0-9a-z]/g, '');
    const ipcClean = item.ipcSection.toLowerCase().replace(/[^0-9a-z]/g, '');
    const bnsCompact = item.bnsSection.toLowerCase().replace(/\bbns\b/g, '').replace(/[^0-9a-z]/g, '');
    const ipcCompact = item.ipcSection.toLowerCase().replace(/\bipc\b/g, '').replace(/[^0-9a-z]/g, '');

    if (clean === bnsClean || clean === ipcClean) return true;
    if (!isExplicitIpc && clean === bnsCompact) return true;
    if (!isExplicitBns && clean === ipcCompact) return true;
    return false;
  });
  if (exactHit) return exactHit;

  // Pass 2: exact base section number match (respecting explicit BNS vs IPC qualifier)
  if (!queryBaseNum) return undefined;
  return BNS_STATUTORY_CATALOG.find((item) => {
    const bnsNumMatch = item.bnsSection.match(/\b(\d+[a-z]?)(?:\s*\(\s*(\d+[a-z]?)\s*\))?\b/i);
    const ipcNumMatch = item.ipcSection.match(/\b(\d+[a-z]?)(?:\s*\(\s*(\d+[a-z]?)\s*\))?\b/i);
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

export function calculateSection479(params: {
  maxPunishmentMonths: number;
  undergoneDays: number;
  isFirstTimeOffender: boolean;
  excludedForDeathOrLife?: boolean;
}): Section479Calculation {
  const safeMaxMonths = Math.max(1, params.maxPunishmentMonths);
  const maxPunishmentDays = Math.round(safeMaxMonths * 30.4375);
  const fractionNumerator = 1;
  const fractionDenominator = params.isFirstTimeOffender ? 3 : 2;

  const thresholdDays = Math.ceil(
    (maxPunishmentDays * fractionNumerator) / fractionDenominator
  );
  const thresholdMonthsRounded = Number((thresholdDays / 30.4375).toFixed(1));
  const undergoneDays = Math.max(0, Math.round(params.undergoneDays));
  const undergoneMonthsRounded = Number((undergoneDays / 30.4375).toFixed(1));

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
