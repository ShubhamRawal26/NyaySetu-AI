/**
 * @fileoverview Bilingual (English & Hindi) advisory response builders for matched
 * BNS 2023 / IPC 1860 offences across victim, bailable, and non-bailable perspectives.
 */

import type {
  Section479Calculation,
  StatutorySectionRecord,
} from '../types/legal.ts';
import { buildNoSectionMatchAdvisory } from './legalFallbackTemplates.ts';
import {
  formatDualCitation,
  formatDualCitationHi,
  type AdvisoryContentParts,
} from './legalTextExtractors.ts';

export { buildNoSectionMatchAdvisory, type AdvisoryContentParts };

/**
 * Builds advisory copy when the user is a victim of an attack, theft, or fraud.
 *
 * @param effectiveMatches - Matched BNS/IPC statutory records.
 * @param hasDevanagari - Whether the user typed in Devanagari script.
 * @returns Bilingual advisory parts and TTS script.
 */
export function buildVictimPerspectiveAdvisory(
  effectiveMatches: StatutorySectionRecord[],
  hasDevanagari: boolean
): AdvisoryContentParts {
  const citationListEn = effectiveMatches.map(formatDualCitation).join(', ');
  const citationListHi = effectiveMatches.map(formatDualCitationHi).join(', ');
  const hasPhysicalAssault = effectiveMatches.some((m) =>
    ['bns-115-2', 'bns-117-2', 'bns-118-1', 'bns-109'].includes(m.id)
  );
  const hasFraudOrCyber = effectiveMatches.some((m) =>
    ['bns-318-4', 'bns-316-2'].includes(m.id)
  );

  const summaryEn = `Under BNS 2023, this incident is covered under ${citationListEn} (${effectiveMatches
    .map((m) => m.title)
    .join(', ')}).${
    hasPhysicalAssault
      ? ' You also have the legal Right of Private Defence (Self-Defence) under Sections 34 to 44 of BNS 2023 (formerly Sections 96–106 IPC) to protect yourself and your property from unlawful harm.'
      : ''
  } You have the right to register an immediate FIR (or Zero FIR at any police station) under Section 173 BNSS and receive a free copy of the FIR.`;

  const summaryHi = `भारतीय न्याय संहिता (BNS 2023) के तहत यह मामला ${citationListHi} (${effectiveMatches
    .map((m) => m.hindiTitle)
    .join(', ')}) के अंतर्गत दंडनीय अपराध है।${
    hasPhysicalAssault
      ? ' साथ ही धारा 34 से 44 BNS 2023 (पुरानी धारा 96–106 IPC) के तहत आपको अपनी और अपने परिवार की सुरक्षा के लिए आत्मरक्षा (Right of Private Defence / Self-Defence) का पूरा कानूनी अधिकार है।'
      : ''
  } आप धारा 173 BNSS के तहत किसी भी नजदीकी थाने में तुरंत FIR (या Zero FIR) दर्ज करा सकते हैं।`;

  const actions = hasDevanagari
    ? [
        hasPhysicalAssault
          ? 'तुरंत 112 पर पुलिस को कॉल करें, किसी सरकारी अस्पताल से अपनी चोट की मेडिकल जांच (MLC रिपोर्ट) कराएं और फोटो/गवाह सुरक्षित रखें।'
          : hasFraudOrCyber
            ? 'तुरंत साइबर क्राइम हेल्पलाइन 1930 पर कॉल करें (या cybercrime.gov.in पर रिपोर्ट करें) ताकि बैंक ट्रांजैक्शन फ्रीज हो सके।'
            : 'तुरंत 112 पर कॉल करें और घटना के सबूत (CCTV, फोटो, मैसेज या गवाहों के नाम) सुरक्षित करें।',
        `नजदीकी थाने में धारा 173 BNSS के तहत ${citationListHi} में लिखित FIR (या Zero FIR) दर्ज कराएं और उसकी मुफ्त रिसीविंग कॉपी लें।`,
        'मुफ्त कानूनी सलाह या कोर्ट केस में सरकारी वकील की सहायता के लिए NALSA हेल्पलाइन 15100 पर कॉल करें।',
      ]
    : [
        hasPhysicalAssault
          ? 'Call Emergency 112 immediately, get a Medico-Legal Certificate (MLC) injury examination at the nearest government hospital, and preserve photos/CCTV.'
          : hasFraudOrCyber
            ? 'Call National Cyber Crime Helpline 1930 immediately (or report on cybercrime.gov.in) to freeze the fraudulent bank/UPI transfer.'
            : 'Call Police Helpline 112 immediately and preserve all evidence (CCTV footage, photos, call logs, or witness contacts).',
        `File an FIR (or Zero FIR at any police station) under Section 173 BNSS citing ${citationListEn} and collect your free signed FIR copy.`,
        'Call NALSA Free Legal Aid Helpline 15100 if police delay FIR registration or if you need a free lawyer.',
      ];

  const spokenScript = hasPhysicalAssault
    ? `भारतीय न्याय संहिता के तहत हमला और मारपीट ${citationListHi} में दंडनीय अपराध है, और धारा 34 से 44 बीएनएस आपको आत्मरक्षा का अधिकार देती है। तुरंत 112 पर कॉल करें, सरकारी अस्पताल में मेडिकल जांच कराएं और थाने में एफआईआर दर्ज कराएं।`
    : `यह मामला ${citationListHi} के तहत दंडनीय अपराध है। आप तुरंत नजदीकी थाने में धारा 173 बीएनएसएस के तहत एफआईआर दर्ज कराएं और मुफ्त कानूनी मदद के लिए 15100 पर कॉल करें।`;

  return { summaryEn, summaryHi, actions, spokenScript };
}

/**
 * Builds advisory copy when all detected offences are Bailable under Schedule I of BNSS 2023.
 *
 * @param effectiveMatches - Matched bailable statutory records.
 * @param hasDevanagari - Whether the user typed in Devanagari script.
 * @returns Bilingual advisory parts and TTS script.
 */
export function buildBailableAdvisory(
  effectiveMatches: StatutorySectionRecord[],
  hasDevanagari: boolean
): AdvisoryContentParts {
  const citationListEn = effectiveMatches.map(formatDualCitation).join(' and ');
  const citationListHi = effectiveMatches.map(formatDualCitationHi).join(' और ');
  const anyCompoundable = effectiveMatches.some((m) => m.isCompoundable);

  const summaryEn = `Do not panic. Every section identified (${citationListEn}) is strictly BAILABLE under Schedule I of BNSS 2023. Release on bail is a statutory right directly at the police station under Section 478 BNSS upon executing a personal bond—the police (SHO) cannot legally force detention or refuse station bail.${
    anyCompoundable
      ? ' These offences are also compoundable, meaning both sides can legally settle the dispute peacefully.'
      : ''
  }`;
  const summaryHi = `घबराएं बिल्कुल नहीं। इस मामले में लगी धाराएं (${citationListHi}) पूर्णतः जमानती (Bailable) हैं। धारा 478 BNSS के तहत थाने से ही जमानत पाना कानूनी अधिकार है—थानेदार (SHO) निजी मुचलका (Personal Bond) या जमानती पर तुरंत रिहा करने के लिए बाध्य हैं और गैर-कानूनी रूप से जेल नहीं भेज सकते।${
    anyCompoundable
      ? ' यह मामला समझौता योग्य (Compoundable) भी है, यानी दोनों पक्ष आपसी सहमति से केस खत्म कर सकते हैं।'
      : ''
  }`;

  const actions = hasDevanagari
    ? [
        'थानेदार (SHO) से धारा 478 BNSS के तहत थाने से ही तुरंत जमानत (Police Station Bail) की मांग करें।',
        'व्यक्तिगत मुचलका (Personal Bond) या एक स्थानीय जमानती (Surety) तथा आधार/पहचान पत्र प्रस्तुत करें।',
        'यदि पुलिस जमानत देने से मना करे, तो तुरंत NALSA मुफ्त कानूनी सहायता हेल्पलाइन 15100 या नजदीकी मजिस्ट्रेट से संपर्क करें।',
      ]
    : [
        'Request immediate Police Station Bail from the Station House Officer (SHO) as a statutory right under Section 478 BNSS.',
        'Offer to sign a Personal Bond (or provide one local surety with ID proof) and collect a copy of the FIR and bail memo.',
        'If police unlawfully refuse bailable release, call NALSA Free Legal Aid Helpline 15100 immediately for free counsel.',
      ];

  const spokenScript = `घबराइए मत। ${citationListHi} पूर्णतः जमानती धाराएं हैं। धारा 478 बीएनएसएस के तहत थाने से ही जमानत पाना आपका कानूनी अधिकार है। आप थाने जाकर निजी मुचलका भरकर तुरंत रिहाई करवा सकते हैं।`;

  return { summaryEn, summaryHi, actions, spokenScript };
}

/**
 * Builds advisory copy when one or more Non-Bailable sections are detected.
 *
 * @param params - Non-bailable match details, petty theft flag, and Section 479 metrics.
 * @returns Bilingual advisory parts and TTS script.
 */
export function buildNonBailableAdvisory(params: {
  effectiveMatches: StatutorySectionRecord[];
  hasDevanagari: boolean;
  anyExcluded: boolean;
  pettyTheft: boolean;
  sec479Calc: Section479Calculation | null;
}): AdvisoryContentParts {
  const {
    effectiveMatches,
    hasDevanagari,
    anyExcluded,
    pettyTheft,
    sec479Calc,
  } = params;

  const citationListEn = effectiveMatches.map(formatDualCitation).join(', ');
  const citationListHi = effectiveMatches.map(formatDualCitationHi).join(', ');
  const allArneshEligible = effectiveMatches.every(
    (m) => m.arneshKumarNoticeApplies
  );

  const partsEn: string[] = [
    `Stay calm and act step-by-step. ${citationListEn} includes a NON-BAILABLE offence, so the police station cannot grant bail directly—a Regular Bail application must be filed before the ${
      anyExcluded
        ? 'Sessions Court or High Court under Section 483 BNSS'
        : 'Judicial Magistrate under Section 480 BNSS'
    }.`,
  ];
  const partsHi: string[] = [
    `घबराएं नहीं और सही कानूनी कदम उठाएं। ${citationListHi} गैर-जमानती (Non-Bailable) धारा है, इसलिए थाने से जमानत नहीं मिलेगी—इसके लिए ${
      anyExcluded
        ? 'सत्र न्यायालय (Sessions Court) में धारा 483 BNSS'
        : 'मजिस्ट्रेट कोर्ट में धारा 480 BNSS'
    } के तहत नियमित जमानत अर्जी दाखिल करनी होगी।`,
  ];

  if (pettyTheft) {
    partsEn.push(
      'Important relief: Under the Section 303(2) BNS Proviso, for a first-time theft of property valued under ₹5,000, the law allows Community Service upon return of property instead of imprisonment.'
    );
    partsHi.push(
      'बड़ी राहत: धारा 303(2) BNS के प्रावधान के अनुसार यदि चोरी की वस्तु ₹5,000 से कम की है और यह पहला अपराध है, तो संपत्ति लौटाने पर जेल के बजाय सामुदायिक सेवा (Community Service) का प्रावधान है।'
    );
  }

  if (sec479Calc && !anyExcluded) {
    if (sec479Calc.isEligible) {
      partsEn.push(
        `Mandatory Bail Applies: Having served ${sec479Calc.undergoneMonthsRounded} months (exceeding the ${sec479Calc.thresholdMonthsRounded}-month ${sec479Calc.fractionLabel} of ${sec479Calc.maxPunishmentMonths} months), the undertrial is legally entitled to MANDATORY STATUTORY BAIL under Section 479 BNSS.`
      );
      partsHi.push(
        `अनिवार्य जमानत का अधिकार: जेल में ${sec479Calc.undergoneMonthsRounded} महीने पूरे हो चुके हैं (जो ${sec479Calc.maxPunishmentMonths} महीने की अधिकतम सजा की ${sec479Calc.thresholdMonthsRounded} महीने की सीमा से अधिक है), इसलिए धारा 479 BNSS के तहत अनिवार्य जमानत का अधिकार बनता है।`
      );
    } else {
      partsEn.push(
        `Under Section 479 BNSS, mandatory bail triggers at ${sec479Calc.thresholdMonthsRounded} months (${Math.abs(sec479Calc.daysDifference)} days remaining); meanwhile, Regular Bail under Section 480 BNSS can be moved right away.`
      );
      partsHi.push(
        `धारा 479 BNSS के तहत ${sec479Calc.thresholdMonthsRounded} महीने पूरे होने पर अनिवार्य जमानत का अधिकार मिलेगा (अभी ${Math.abs(sec479Calc.daysDifference)} दिन शेष हैं); तब तक धारा 480 BNSS में नियमित जमानत अर्जी लगाई जा सकती है।`
      );
    }
  } else if (allArneshEligible && !anyExcluded) {
    partsEn.push(
      'Because the maximum punishment is up to 7 years, the Arnesh Kumar Supreme Court safeguard and Section 35(3) BNSS notice requirement protect against routine unnecessary arrest.'
    );
    partsHi.push(
      'चूंकि अधिकतम सजा 7 वर्ष तक है, सुप्रीम कोर्ट के अर्नेश कुमार फैसले और धारा 35(3) BNSS के तहत पुलिस को गिरफ्तारी से पहले नोटिस देना अनिवार्य है।'
    );
  } else if (anyExcluded) {
    partsEn.push(
      'Note: Offences punishable with life imprisonment or death are excluded from Section 479 BNSS automatic detention bail, so engage a defense advocate or free DLSA counsel immediately.'
    );
    partsHi.push(
      'ध्यान दें: आजीवन कारावास या मृत्युदंड वाली धाराओं पर धारा 479 BNSS की स्वतः जमानत लागू नहीं होती, इसलिए तुरंत वकील या मुफ्त DLSA सरकारी वकील की मदद लें।'
    );
  }

  const actions = hasDevanagari
    ? [
        pettyTheft
          ? 'मजिस्ट्रेट के सामने धारा 303(2) BNS (₹5,000 से कम पहली चोरी पर सामुदायिक सेवा) का हवाला देकर जमानत अर्जी दाखिल करें।'
          : `FIR और अरेस्ट मेमो की कॉपी लेकर ${anyExcluded ? 'सत्र न्यायालय (धारा 483 BNSS)' : 'मजिस्ट्रेट कोर्ट (धारा 480 BNSS)'} में तुरंत जमानत अर्जी दाखिल करें।`,
        sec479Calc?.isEligible
          ? 'जेल से कस्टडी सर्टिफिकेट लेकर धारा 479 BNSS के तहत निजी मुचलके (Personal Bond) पर अनिवार्य रिहाई की मांग करें।'
          : '100% मुफ्त सरकारी वकील पाने के लिए तुरंत NALSA हेल्पलाइन 15100 या जिला विधिक सेवा प्राधिकरण (DLSA) से संपर्क करें।',
        'ऊपर "Bail Check" टैब से कोर्ट में पेश करने के लिए तैयार जमानत आवेदन पत्र (Bail Letter) प्रिंट करें।',
      ]
    : [
        pettyTheft
          ? 'File a bail petition before the Magistrate citing the Section 303(2) BNS petty theft proviso (under ₹5,000, first offence — eligible for Community Service).'
          : `Collect the FIR & Arrest Memo copy and file a Regular Bail petition before the ${anyExcluded ? 'Sessions Court under Section 483 BNSS' : 'Judicial Magistrate under Section 480 BNSS'}.`,
        sec479Calc?.isEligible
          ? 'Attach the Jail Custody Certificate and invoke Section 479 BNSS for mandatory release on Personal Bond without onerous sureties.'
          : 'Call NALSA Free Legal Aid Helpline 15100 (Section 12, Legal Services Authorities Act) for a 100% free DLSA defense lawyer.',
        'Click "Check Bail Eligibility" below to calculate Section 479 BNSS timelines and print a ready-to-file court bail letter.',
      ];

  const spokenScript = pettyTheft
    ? 'घबराएं नहीं। पांच हजार रुपये से कम की पहली चोरी में धारा 303(2) बीएनएस के तहत सामुदायिक सेवा की राहत मिल सकती है। मुफ्त सरकारी वकील के लिए तुरंत 15100 पर कॉल करें।'
    : sec479Calc?.isEligible
      ? 'चिंता न करें। जेल में एक-तिहाई समय पूरा होने पर धारा 479 बीएनएसएस के तहत अनिवार्य जमानत का अधिकार बनता है। मुफ्त सरकारी वकील के लिए तुरंत 15100 पर कॉल करें।'
      : 'घबराएं नहीं। यह गैर-जमानती धारा है इसलिए कोर्ट से जमानत अर्जी लगानी होगी। आप 100 प्रतिशत मुफ्त सरकारी वकील के लिए तुरंत नालसा हेल्पलाइन 15100 पर कॉल करें।';

  return {
    summaryEn: partsEn.join(' '),
    summaryHi: partsHi.join(' '),
    actions,
    spokenScript,
  };
}
