import {
  calculateSection479,
  detectSectionsFromText,
  findCatalogSection,
  normalizeIndicDigits,
} from './bnsCatalog.ts';
import type {
  BailDossierRequest,
  FIROCRExtractionResponse,
  LegalAdvisoryResponse,
  Section479Calculation,
  StatutorySectionRecord,
} from '../types/legal.ts';

function extractCustodyMonthsFromText(text: string): number | null {
  const normalized = normalizeIndicDigits(text).toLowerCase();

  // Match phrases like "9 months", "14 month", "9 महीने", "9 माह", "1.5 years", "2 साल"
  const monthMatch = normalized.match(
    /(?:for|since|past|last|in jail(?: for)?|custody(?: for)?|detained(?: for)?|जेल में|हिरासत में)?\s*(\d+(?:\.\d+)?)\s*(?:months?|mos?|महीने|महीनों|माह)\b/i
  );
  if (monthMatch) {
    // Avoid matching max punishment phrase like "2 years max punishment"
    const idx = monthMatch.index ?? 0;
    const after = normalized.slice(idx + monthMatch[0].length, idx + monthMatch[0].length + 24);
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
    if (Number.isFinite(val) && val >= 15) return Number((val / 30.4375).toFixed(1));
  }

  return null;
}

function extractExplicitMaxPunishmentMonths(text: string): number | null {
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

function extractRupeeValueFromText(text: string): number | null {
  const normalized = normalizeIndicDigits(text);
  const match = normalized.match(
    /(?:₹|rs\.?|inr|rupees?)\s*([0-9][0-9,]*(?:\.\d+)?)|([0-9][0-9,]*)\s*(?:rupees?|रुपये|रुपए|₹)/i
  );
  const rawNum = match?.[1] || match?.[2];
  if (!rawNum) return null;
  const parsed = Number(rawNum.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function isPettyTheftMentioned(text: string, matches: StatutorySectionRecord[]): boolean {
  const normalized = normalizeIndicDigits(text).toLowerCase();
  const hasTheftContext =
    matches.some((m) => m.id === 'bns-303-2') ||
    /\b(theft|stolen|steal|chori|bicycle|cycle|petty|303|379)\b|चोरी|साइकिल/i.test(normalized);
  if (!hasTheftContext) return false;

  const amount = extractRupeeValueFromText(text);
  if (amount !== null && amount < 5000) return true;
  if (/(?:under|below|less than|<)\s*(?:₹|rs\.?)?\s*5[,]?000|5000\s*से\s*कम/i.test(normalized)) {
    return true;
  }
  return false;
}

function isRepeatOffenderMentioned(text: string): boolean {
  return /\b(repeat offender|second offence|second offense|prior conviction|previously convicted|habitual)\b|पहले भी सजा/i.test(
    text
  );
}

function formatDualCitation(sec: StatutorySectionRecord): string {
  return `Section ${sec.bnsSection} [${sec.ipcSection}]`;
}

function formatDualCitationHi(sec: StatutorySectionRecord): string {
  return `धारा ${sec.bnsSection} [पुरानी ${sec.ipcSection}]`;
}

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
  const mentionsSec479 = /\b479\b|undertrial|trial has not|in jail|custody|जेल में|विचाराधीन/i.test(
    normalizeIndicDigits(query)
  );

  // Compute Section 479 BNSS eligibility if custody duration or Section 479 context is present
  const primaryNonExcluded = matches.find((m) => !m.excludedFromSec479);
  const maxMonthsFor479 =
    explicitMaxMonths ?? primaryNonExcluded?.maxPunishmentMonths ?? null;
  const anyExcluded = matches.some((m) => m.excludedFromSec479);

  let sec479Calc: Section479Calculation | null = null;
  if (custodyMonths !== null && maxMonthsFor479 !== null && !anyExcluded) {
    sec479Calc = calculateSection479({
      maxPunishmentMonths: maxMonthsFor479,
      undergoneDays: Math.round(custodyMonths * 30.4375),
      isFirstTimeOffender: isFirstTime,
      excludedForDeathOrLife: false,
    });
  }

  const statutoryBail479Applicable = Boolean(
    sec479Calc?.isEligible ||
      (!anyExcluded && custodyMonths !== null && custodyMonths >= 6) ||
      (!anyExcluded && mentionsSec479 && /\b479\b/i.test(query))
  );

  const detectedSections = matches.map((m) => ({
    bns_section: m.bnsSection,
    ipc_section: m.ipcSection,
    title: m.title,
    is_bailable: m.isBailable,
    max_punishment: m.maxPunishmentLabel,
    is_compoundable: m.isCompoundable,
  }));

  const overallBailable =
    matches.length > 0 ? matches.every((m) => m.isBailable) : true;

  let summaryEn = '';
  let summaryHi = '';
  let actions: string[] = [];
  let spokenScript = '';

  if (matches.length === 0) {
    // General legal first-aid / custody query without a matched catalog section
    if (sec479Calc && custodyMonths !== null) {
      if (sec479Calc.isEligible) {
        summaryEn = `Do not panic. Based on ${custodyMonths} months already spent in jail against a ${sec479Calc.maxPunishmentMonths}-month maximum sentence, a first-time undertrial qualifies for MANDATORY STATUTORY BAIL under Section 479 BNSS after serving 1/3rd (${sec479Calc.thresholdMonthsRounded} months). The Court must consider release on a personal bond, and you can also get a 100% free defense lawyer by calling NALSA Helpline 15100.`;
        summaryHi = `घबराएं बिल्कुल नहीं। ${sec479Calc.maxPunishmentMonths} महीने की अधिकतम सजा के मुकाबले ${custodyMonths} महीने जेल में बिताने के बाद, पहली बार के विचाराधीन बंदी को धारा 479 BNSS के तहत एक-तिहाई (${sec479Calc.thresholdMonthsRounded} महीने) अवधि पूरी होने पर अनिवार्य जमानत (Mandatory Bail) का कानूनी अधिकार है। मुफ्त सरकारी वकील के लिए तुरंत NALSA हेल्पलाइन 15100 पर कॉल करें।`;
        actions = hasDevanagari
          ? [
              'जेल अधीक्षक से तुरंत कस्टडी सर्टिफिकेट (Custody Certificate) प्राप्त करें और धारा 479 BNSS के तहत अनिवार्य जमानत अर्जी दाखिल करें।',
              'यदि परिवार जमानती (Surety) की व्यवस्था नहीं कर सकता, तो निजी मुचलके (Personal Bond) पर रिहाई की मांग करें।',
              '100% मुफ्त सरकारी वकील के लिए NALSA हेल्पलाइन 15100 पर कॉल करें।',
            ]
          : [
              'Obtain an updated Custody Certificate from the Jail Superintendent and file a Section 479 BNSS Mandatory Bail application before the Magistrate.',
              'Request release on a Personal Bond without heavy sureties if the family faces financial hardship (citing SC 2024 orders on Section 479 BNSS).',
              'Call NALSA Free Legal Aid Helpline 15100 (Section 12, Legal Services Authorities Act) for a free government defense lawyer.',
            ];
        spokenScript = `घबराइए मत। धारा 479 बीएनएसएस के तहत एक-तिहाई सजा जेल में बिताने के बाद पहली बार के बंदी को अनिवार्य जमानत का कानूनी अधिकार मिलता है। आप तुरंत मुफ्त सरकारी वकील के लिए 15100 पर कॉल करें।`;
      } else {
        summaryEn = `Stay calm. Under Section 479 BNSS, a first-time undertrial becomes entitled to mandatory statutory bail once they complete 1/3rd (${sec479Calc.thresholdMonthsRounded} months) of the ${sec479Calc.maxPunishmentMonths}-month maximum punishment. They currently have ${Math.abs(sec479Calc.daysDifference)} days remaining to reach the mandatory threshold, and can still apply for Regular Bail under Section 480 BNSS immediately with a free NALSA lawyer (15100).`;
        summaryHi = `घबराएं नहीं। धारा 479 BNSS के तहत पहली बार के विचाराधीन बंदी को अधिकतम सजा का एक-तिहाई (${sec479Calc.thresholdMonthsRounded} महीने) पूरा होते ही अनिवार्य जमानत का अधिकार मिलता है। अभी ${Math.abs(sec479Calc.daysDifference)} दिन शेष हैं, लेकिन आप अभी भी धारा 480 BNSS के तहत नियमित जमानत अर्जी दायर कर सकते हैं।`;
        actions = [
          'Ask a DLSA / NALSA free lawyer (Helpline 15100) to file a Regular Bail application under Section 480 BNSS immediately.',
          'Obtain the Custody Certificate from the Jail Superintendent and request noting the exact Section 479(3) BNSS mandatory release date.',
          'Use the Bail Check tab above to generate a printable court bail letter for the Magistrate.',
        ];
        spokenScript =
          'घबराएं नहीं। आप अभी धारा 480 बीएनएसएस के तहत नियमित जमानत की अर्जी लगा सकते हैं और एक-तिहाई समय पूरा होने पर अनिवार्य जमानत का अधिकार मिलेगा। मुफ्त वकील के लिए 15100 पर कॉल करें।';
      }
    } else {
      summaryEn =
        'Stay calm—you have strong constitutional rights under BNSS 2023. Police must inform the arrested person and family of the exact FIR section and bail status (Section 47 & 48 BNSS), prepare a signed Arrest Memo (Section 36 BNSS), and produce the person before a Magistrate within 24 hours (Section 58 BNSS). Share the exact BNS/IPC section number (or upload a photo of the FIR in the Scan FIR tab) so we can check instant bail eligibility.';
      summaryHi =
        'घबराएं बिल्कुल नहीं—भारतीय नागरिक सुरक्षा संहिता (BNSS 2023) आपको मजबूत कानूनी अधिकार देती है। पुलिस के लिए गिरफ्तारी का कारण व धारा बताना (धारा 47 BNSS), परिवार को सूचना देना (धारा 48 BNSS), अरेस्ट मेमो बनाना और 24 घंटे के भीतर मजिस्ट्रेट के सामने पेश करना अनिवार्य है। सटीक जमानत जांच के लिए कृपया FIR की धारा लिखें या ऊपर Scan FIR टैब में FIR की फोटो अपलोड करें।';
      actions = hasDevanagari
        ? [
            'थाने से तुरंत FIR और अरेस्ट मेमो (धारा 36 व 47 BNSS) की कॉपी मांगें और उसमें लिखी BNS या IPC धारा नोट करें।',
            'ध्यान रखें कि पुलिस किसी भी व्यक्ति को बिना मजिस्ट्रेट के आदेश के 24 घंटे से अधिक हिरासत में नहीं रख सकती (धारा 58 BNSS)।',
            '100% मुफ्त सरकारी वकील के लिए तुरंत NALSA विधिक सेवा हेल्पलाइन 15100 पर कॉल करें।',
          ]
        : [
            'Ask the police station for the exact FIR copy and signed Arrest Memo (Sections 36 & 47 BNSS) and note the BNS/IPC section numbers.',
            'Remember that police must produce any arrested person before a Judicial Magistrate within 24 hours (Section 58 BNSS / Article 22).',
            'Call NALSA Free Legal Aid Helpline 15100 right now for a 100% free government defense lawyer, or upload the FIR photo in the Scan FIR tab.',
          ];
      spokenScript =
        'घबराइए मत। पुलिस के लिए गिरफ्तारी की धारा बताना, परिवार को सूचना देना और 24 घंटे के अंदर मजिस्ट्रेट के सामने पेश करना अनिवार्य है। मुफ्त सरकारी वकील के लिए तुरंत 15100 पर कॉल करें।';
    }
  } else if (overallBailable) {
    const citationListEn = matches.map(formatDualCitation).join(' and ');
    const citationListHi = matches.map(formatDualCitationHi).join(' और ');
    const anyCompoundable = matches.some((m) => m.isCompoundable);

    summaryEn = `Do not panic. Every section identified (${citationListEn}) is strictly BAILABLE under Schedule I of BNSS 2023. Release on bail is a statutory right directly at the police station under Section 478 BNSS upon executing a personal bond—the police (SHO) cannot legally force detention or refuse station bail.${
      anyCompoundable
        ? ' These offences are also compoundable, meaning both sides can legally settle the dispute peacefully.'
        : ''
    }`;
    summaryHi = `घबराएं बिल्कुल नहीं। इस मामले में लगी धाराएं (${citationListHi}) पूर्णतः जमानती (Bailable) हैं। धारा 478 BNSS के तहत थाने से ही जमानत पाना कानूनी अधिकार है—थानेदार (SHO) निजी मुचलका (Personal Bond) या जमानती पर तुरंत रिहा करने के लिए बाध्य हैं और गैर-कानूनी रूप से जेल नहीं भेज सकते।${
      anyCompoundable
        ? ' यह मामला समझौता योग्य (Compoundable) भी है, यानी दोनों पक्ष आपसी सहमति से केस खत्म कर सकते हैं।'
        : ''
    }`;

    actions = hasDevanagari
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

    spokenScript = `घबराइए मत। ${citationListHi} पूर्णतः जमानती धाराएं हैं। धारा 478 बीएनएसएस के तहत थाने से ही जमानत पाना आपका कानूनी अधिकार है। आप थाने जाकर निजी मुचलका भरकर तुरंत रिहाई करवा सकते हैं।`;
  } else {
    // Non-bailable section(s)
    const citationListEn = matches.map(formatDualCitation).join(', ');
    const citationListHi = matches.map(formatDualCitationHi).join(', ');
    const allArneshEligible = matches.every((m) => m.arneshKumarNoticeApplies);

    const partsEn: string[] = [
      `Stay calm and act step-by-step. ${citationListEn} includes a NON-BAILABLE offence, so the police station cannot grant bail directly—a Regular Bail application must be filed before the ${
        anyExcluded ? 'Sessions Court or High Court under Section 483 BNSS' : 'Judicial Magistrate under Section 480 BNSS'
      }.`,
    ];
    const partsHi: string[] = [
      `घबराएं नहीं और सही कानूनी कदम उठाएं। ${citationListHi} गैर-जमानती (Non-Bailable) धारा है, इसलिए थाने से जमानत नहीं मिलेगी—इसके लिए ${
        anyExcluded ? 'सत्र न्यायालय (Sessions Court) में धारा 483 BNSS' : 'मजिस्ट्रेट कोर्ट में धारा 480 BNSS'
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

    summaryEn = partsEn.join(' ');
    summaryHi = partsHi.join(' ');

    if (hasDevanagari) {
      actions = [
        pettyTheft
          ? 'मजिस्ट्रेट के सामने धारा 303(2) BNS (₹5,000 से कम पहली चोरी पर सामुदायिक सेवा) का हवाला देकर जमानत अर्जी दाखिल करें।'
          : `FIR और अरेस्ट मेमो की कॉपी लेकर ${anyExcluded ? 'सत्र न्यायालय (धारा 483 BNSS)' : 'मजिस्ट्रेट कोर्ट (धारा 480 BNSS)'} में तुरंत जमानत अर्जी दाखिल करें।`,
        sec479Calc?.isEligible
          ? 'जेल से कस्टडी सर्टिफिकेट लेकर धारा 479 BNSS के तहत निजी मुचलके (Personal Bond) पर अनिवार्य रिहाई की मांग करें।'
          : '100% मुफ्त सरकारी वकील पाने के लिए तुरंत NALSA हेल्पलाइन 15100 या जिला विधिक सेवा प्राधिकरण (DLSA) से संपर्क करें।',
        'ऊपर "Bail Check" टैब से कोर्ट में पेश करने के लिए तैयार जमानत आवेदन पत्र (Bail Letter) प्रिंट करें।',
      ];
    } else {
      actions = [
        pettyTheft
          ? 'File a bail petition before the Magistrate citing the Section 303(2) BNS petty theft proviso (under ₹5,000, first offence — eligible for Community Service).'
          : `Collect the FIR & Arrest Memo copy and file a Regular Bail petition before the ${anyExcluded ? 'Sessions Court under Section 483 BNSS' : 'Judicial Magistrate under Section 480 BNSS'}.`,
        sec479Calc?.isEligible
          ? 'Attach the Jail Custody Certificate and invoke Section 479 BNSS for mandatory release on Personal Bond without onerous sureties.'
          : 'Call NALSA Free Legal Aid Helpline 15100 (Section 12, Legal Services Authorities Act) for a 100% free DLSA defense lawyer.',
        'Click "Check Bail Eligibility" below to calculate Section 479 BNSS timelines and print a ready-to-file court bail letter.',
      ];
    }

    spokenScript = pettyTheft
      ? 'घबराएं नहीं। पांच हजार रुपये से कम की पहली चोरी में धारा 303(2) बीएनएस के तहत सामुदायिक सेवा की राहत मिल सकती है। मुफ्त सरकारी वकील के लिए तुरंत 15100 पर कॉल करें।'
      : sec479Calc?.isEligible
        ? 'चिंता न करें। जेल में एक-तिहाई समय पूरा होने पर धारा 479 बीएनएसएस के तहत अनिवार्य जमानत का अधिकार बनता है। मुफ्त सरकारी वकील के लिए तुरंत 15100 पर कॉल करें।'
        : 'घबराएं नहीं। यह गैर-जमानती धारा है इसलिए कोर्ट से जमानत अर्जी लगानी होगी। आप 100 प्रतिशत मुफ्त सरकारी वकील के लिए तुरंत नालसा हेल्पलाइन 15100 पर कॉल करें।';
  }

  return {
    advisory: {
      empathetic_summary_hi: summaryHi,
      empathetic_summary_en: summaryEn,
      detected_sections: detectedSections,
      overall_bailable: overallBailable,
      statutory_bail_sec_479_applicable: statutoryBail479Applicable,
      immediate_citizen_actions: actions,
      nalsa_legal_aid_eligible: true,
      spoken_tts_script: spokenScript,
    },
    deterministicMatches: matches.map((m) => ({
      id: m.id,
      bnsSection: m.bnsSection,
      ipcSection: m.ipcSection,
      title: m.title,
    })),
  };
}

function cleanOcrValue(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/[|~_`[\]{}\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:.\-,]+|[\s:.\-,]+$/g, '')
    .trim();
  return cleaned.length >= 2 ? cleaned : fallback;
}

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
    ) || normalized.match(/\b([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.](?:19|20)[0-9]{2})\b/);

  const complainantMatch = normalized.match(
    /(?:Complainant|Informant)\s*(?:Name)?\s*[:\-]?\s*([A-Za-z .'-]{2,45}?)(?:\s*(?:\[|\||S\/O|W\/O|D\/O|510|S10|Address|\n))/i
  );
  const accusedMatch = normalized.match(
    /(?:Accused)\s*(?:Name(?:\(s\))?)?\s*[:\-]?\s*([A-Za-z .'-]{2,45}?)(?:\s*(?:~|\[|\||S\/O|W\/O|s\/o|Address|\n))/i
  );

  // Extract brief allegation section if present
  const factsMatch = normalized.match(
    /(?:Brief\s*Facts(?:\s*of\s*Incident)?(?:\s*\([^)]*\))?|Allegation|Incident\s*Details)\s*[:\-]?\s*([\s\S]{15,520}?)(?:\n\s*(?:FIR\s*registered|Complainant\s*Sign|SHO|Signature|$))/i
  );

  // Detect sections from explicit "Sections:" line first, then full OCR text
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
    const tokens = sectionsLineMatch[1].split(/[,;&]+/);
    for (const token of tokens) {
      addRecord(findCatalogSection(token));
    }
    for (const rec of detectSectionsFromText(sectionsLineMatch[1])) {
      addRecord(rec);
    }
  }

  // Also scan full text for explicit numeric section references (e.g. "323 IPC", "115(2) BNS", "Sec 379")
  const explicitRegex =
    /(?:(?:Sec(?:tion)?\.?|U\/s|धारा)\s*(\d{2,3}[A-Za-z]?(?:\(\d+\))?)\s*(BNS|IPC)?|(\d{2,3}[A-Za-z]?(?:\(\d+\))?)\s*(BNS|IPC))/gi;
  let m: RegExpExecArray | null;
  while ((m = explicitRegex.exec(combinedForDetection)) !== null) {
    const num = m[1] || m[3];
    const code = m[2] || m[4] || '';
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
    extractedSections.length > 0
      ? extractedSections.every((s) => s.is_bailable)
      : false;

  const pettyTheftFlag = isPettyTheftMentioned(combinedForDetection, sectionCandidates);

  let briefAllegation = cleanOcrValue(
    factsMatch?.[1]?.replace(/\n+/g, ' '),
    ''
  );
  if (!briefAllegation) {
    const readableLines = normalized
      .split('\n')
      .map((l) => l.replace(/[|~_`[\]{}\\]+/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((l) => l.length >= 20 && /[a-zA-Z]{4,}/.test(l));
    briefAllegation =
      readableLines.slice(0, 3).join(' ').slice(0, 280) ||
      'Text was scanned from the uploaded document. Please verify the exact allegation and cited sections directly against the original police station FIR copy.';
  }

  let recommendedAction = '';
  if (extractedSections.length === 0) {
    recommendedAction =
      'Section numbers were not clearly legible in this scan. Please confirm the exact BNS/IPC sections on the physical FIR copy or call NALSA Free Legal Aid Helpline 15100.';
  } else if (isOverallBailable) {
    recommendedAction =
      'All extracted sections are BAILABLE under BNSS 2023. Ask the Police Station (SHO) for immediate station bail on a Personal Bond under Section 478 BNSS, or call NALSA 15100 if refused.';
  } else if (pettyTheftFlag) {
    recommendedAction =
      'Apply for Regular Bail before the Judicial Magistrate citing the Section 303(2) BNS petty theft proviso (value under Rs. 5,000, first offence qualifies for Community Service). Call NALSA 15100 for a free lawyer.';
  } else {
    recommendedAction =
      'Because a non-bailable section is listed, file a Regular Bail petition before the Judicial Magistrate / Sessions Court under Section 480/483 BNSS and call NALSA Helpline 15100 for free legal aid.';
  }

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

export function generateBailDossierLocally(payload: {
  accusedName: string;
  fatherOrSpouseName?: string;
  firNumber: string;
  policeStation: string;
  district: string;
  courtName: string;
  jailName: string;
  custodyStartDate: string;
  bnsSection: string;
  ipcSection: string;
  offenceTitle: string;
  maxPunishmentLabel: string;
  maxPunishmentMonths: number;
  undergoneDays: number;
  isFirstTimeOffender: boolean;
  additionalFacts?: string;
}): { dossier_text: string; calculation: Section479Calculation } {
  const catalogMatch = payload.bnsSection
    ? findCatalogSection(payload.bnsSection)
    : undefined;

  const calc = calculateSection479({
    maxPunishmentMonths: payload.maxPunishmentMonths,
    undergoneDays: payload.undergoneDays,
    isFirstTimeOffender: payload.isFirstTimeOffender,
    excludedForDeathOrLife: catalogMatch?.excludedFromSec479 ?? false,
  });

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const applicationHeading = calc.excludedForDeathOrLife
    ? 'APPLICATION FOR REGULAR BAIL UNDER SECTION 483 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023'
    : calc.isEligible
      ? 'APPLICATION FOR MANDATORY STATUTORY BAIL UNDER SECTION 479 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023'
      : 'APPLICATION FOR REGULAR BAIL UNDER SECTION 480 BNSS & DIRECTION UNDER SECTION 479(3) BNSS, 2023';

  const eligibilityLine = calc.excludedForDeathOrLife
    ? 'Offence is excluded from Section 479 BNSS automatic detention bail (punishable with life imprisonment/death); Regular Bail is sought on merits and personal liberty safeguards under Section 483 BNSS.'
    : calc.isEligible
      ? `ELIGIBLE FOR MANDATORY RELEASE NOW — The Applicant has exceeded the statutory ${calc.fractionLabel} by ${calc.daysDifference} days and is legally entitled to release on Personal Bond under Section 479 BNSS.`
      : `APPROACHING STATUTORY THRESHOLD — ${Math.abs(calc.daysDifference)} days remain to reach the mandatory ${calc.fractionLabel}; Regular Bail is sought under Section 480 BNSS with direction to the Jail Superintendent under Section 479(3) BNSS to calendar the statutory release date.`;

  const fatherLine = payload.fatherOrSpouseName
    ? `, S/o / W/o ${payload.fatherOrSpouseName}`
    : '';

  const extraFactBlock = payload.additionalFacts
    ? `\n6. ADDITIONAL HUMANITARIAN FACTS: ${payload.additionalFacts}\n`
    : '';

  const dossierText = `IN THE ${payload.courtName.toUpperCase()}, DISTRICT ${payload.district.toUpperCase()}

BAIL APPLICATION NO. ________ OF ${new Date().getFullYear()}
IN
FIR / CRIME NO.: ${payload.firNumber}
POLICE STATION: ${payload.policeStation}, District ${payload.district}
UNDER SECTION: ${payload.bnsSection} [Corresponding Legacy ${payload.ipcSection}] — ${payload.offenceTitle}

IN THE MATTER OF:
${payload.accusedName}${fatherLine}
Presently confined at: ${payload.jailName}
                                                    ... APPLICANT / ACCUSED
VERSUS
THE STATE
                                                    ... RESPONDENT

${applicationHeading}

MOST RESPECTFULLY SHOWETH:

1. That the Applicant/Accused is a law-abiding citizen who has been in judicial custody at ${payload.jailName} since ${payload.custodyStartDate} in connection with FIR No. ${payload.firNumber}, registered at Police Station ${payload.policeStation}, under ${payload.bnsSection} [${payload.ipcSection}].

2. That the Applicant is a ${
    payload.isFirstTimeOffender
      ? 'FIRST-TIME OFFENDER with no prior criminal convictions, squarely covered by the First Proviso to Section 479(1) of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 (mandatory bail upon completing 1/3rd of the maximum prescribed imprisonment)'
      : 'general undertrial prisoner covered under Section 479(1) of the BNSS, 2023 (mandatory bail upon completing 1/2 of the maximum prescribed imprisonment)'
  }.

3. VERIFIED DETENTION ARITHMETIC (${calc.statutoryProvision}):
   - Maximum Statutory Punishment : ${payload.maxPunishmentLabel || `${calc.maxPunishmentMonths} months`} (${calc.maxPunishmentDays} days)
   - Statutory Bail Threshold     : ${calc.thresholdMonthsRounded} months (${calc.thresholdDays} days) [${calc.fractionLabel}]
   - Period Undergone in Custody  : ${calc.undergoneMonthsRounded} months (${calc.undergoneDays} days)
   - Current Eligibility Status   : ${eligibilityLine}

4. That the Hon'ble Supreme Court of India in In Re: Policy Strategy for Grant of Bail (Writ Petition (C) No. 406/2013, August 2024 Orders) held Section 479 BNSS to be retrospective and binding on all trial courts and Jail Superintendents under Section 479(3) BNSS. Reliance is further placed on Arnesh Kumar v. State of Bihar (2014) 8 SCC 273, Satender Kumar Antil v. CBI (2022) 10 SCC 51, and In Re: Inhuman Conditions in 1382 Prisons (2016) 3 SCC 700 affirming that bail is the rule and jail is the exception.

5. That the Applicant belongs to an economically weaker household and qualifies for free legal aid under Section 12 of the Legal Services Authorities Act, 1987 (NALSA / DLSA Helpline 15100). The Applicant undertakes to attend all court dates and not tamper with witnesses or evidence.
${extraFactBlock}
PRAYER

It is therefore most respectfully prayed that this Hon'ble Court may graciously be pleased to:
(a) Enlarge the Applicant/Accused ${payload.accusedName} on ${
    calc.isEligible
      ? 'Mandatory Statutory Bail under Section 479 BNSS, 2023'
      : calc.excludedForDeathOrLife
        ? 'Regular Bail under Section 483 BNSS, 2023'
        : 'Regular Bail under Section 480 BNSS, 2023'
  } in FIR No. ${payload.firNumber}, P.S. ${payload.policeStation};
(b) Permit release on a Personal Bond without onerous local sureties considering financial hardship;
(c) Direct the Jail Superintendent, ${payload.jailName}, to verify the Custody Certificate and comply with Section 479(3) BNSS, 2023; and
(d) Pass any other order deemed fit in the interest of justice.

PLACE : ${payload.district}
DATE  : ${todayFormatted}

                                                    THROUGH COUNSEL / DLSA LEGAL AID
                                                    (Signature of Applicant / Family / Advocate)

VERIFICATION:
Verified at ${payload.district} on ${todayFormatted} that the contents of the above application are true and correct to the best of my knowledge and belief based on FIR and custody records.

                                                    APPLICANT / PAROKAR`;

  return {
    dossier_text: dossierText,
    calculation: calc,
  };
}
