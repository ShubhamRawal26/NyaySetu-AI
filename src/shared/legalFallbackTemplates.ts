/**
 * @fileoverview Fallback and procedural rights bilingual advisory builders for
 * queries that do not cite a specific BNS/IPC section (Section 479 custody math,
 * Zero FIR under Section 173 BNSS, Anticipatory Bail under Section 482 BNSS, and greetings).
 */

import type { Section479Calculation } from '../types/legal.ts';
import type { AdvisoryContentParts } from './legalTextExtractors.ts';

/**
 * Builds bilingual advisory copy when no specific BNS/IPC section was cited directly.
 *
 * @param params - Normalized query flags and optional Section 479 calculation.
 * @returns Bilingual English/Hindi summary, 3 action steps, and TTS script.
 */
export function buildNoSectionMatchAdvisory(params: {
  qLower: string;
  hasDevanagari: boolean;
  custodyMonths: number | null;
  sec479Calc: Section479Calculation | null;
  isAnticipatoryBailQuery: boolean;
  isArrestOrCustodyQuery: boolean;
}): AdvisoryContentParts {
  const {
    qLower,
    hasDevanagari,
    custodyMonths,
    sec479Calc,
    isAnticipatoryBailQuery,
    isArrestOrCustodyQuery,
  } = params;

  if (sec479Calc && custodyMonths !== null) {
    if (sec479Calc.isEligible) {
      return {
        summaryEn: `Do not panic. Based on ${custodyMonths} months already spent in jail against a ${sec479Calc.maxPunishmentMonths}-month maximum sentence, a first-time undertrial qualifies for MANDATORY STATUTORY BAIL under Section 479 BNSS after serving 1/3rd (${sec479Calc.thresholdMonthsRounded} months). The Court must consider release on a personal bond, and you can also get a 100% free defense lawyer by calling NALSA Helpline 15100.`,
        summaryHi: `घबराएं बिल्कुल नहीं। ${sec479Calc.maxPunishmentMonths} महीने की अधिकतम सजा के मुकाबले ${custodyMonths} महीने जेल में बिताने के बाद, पहली बार के विचाराधीन बंदी को धारा 479 BNSS के तहत एक-तिहाई (${sec479Calc.thresholdMonthsRounded} महीने) अवधि पूरी होने पर अनिवार्य जमानत (Mandatory Bail) का कानूनी अधिकार है। मुफ्त सरकारी वकील के लिए तुरंत NALSA हेल्पलाइन 15100 पर कॉल करें।`,
        actions: hasDevanagari
          ? [
              'जेल अधीक्षक से तुरंत कस्टडी सर्टिफिकेट (Custody Certificate) प्राप्त करें और धारा 479 BNSS के तहत अनिवार्य जमानत अर्जी दाखिल करें।',
              'यदि परिवार जमानती (Surety) की व्यवस्था नहीं कर सकता, तो निजी मुचलके (Personal Bond) पर रिहाई की मांग करें।',
              '100% मुफ्त सरकारी वकील के लिए NALSA हेल्पलाइन 15100 पर कॉल करें।',
            ]
          : [
              'Obtain an updated Custody Certificate from the Jail Superintendent and file a Section 479 BNSS Mandatory Bail application before the Magistrate.',
              'Request release on a Personal Bond without heavy sureties if the family faces financial hardship (citing SC 2024 orders on Section 479 BNSS).',
              'Call NALSA Free Legal Aid Helpline 15100 (Section 12, Legal Services Authorities Act) for a free government defense lawyer.',
            ],
        spokenScript:
          'घबराइए मत। धारा 479 बीएनएसएस के तहत एक-तिहाई सजा जेल में बिताने के बाद पहली बार के बंदी को अनिवार्य जमानत का कानूनी अधिकार मिलता है। आप तुरंत मुफ्त सरकारी वकील के लिए 15100 पर कॉल करें।',
      };
    }

    return {
      summaryEn: `Stay calm. Under Section 479 BNSS, a first-time undertrial becomes entitled to mandatory statutory bail once they complete 1/3rd (${sec479Calc.thresholdMonthsRounded} months) of the ${sec479Calc.maxPunishmentMonths}-month maximum punishment. They currently have ${Math.abs(sec479Calc.daysDifference)} days remaining to reach the mandatory threshold, and can still apply for Regular Bail under Section 480 BNSS immediately with a free NALSA lawyer (15100).`,
      summaryHi: `घबराएं नहीं। धारा 479 BNSS के तहत पहली बार के विचाराधीन बंदी को अधिकतम सजा का एक-तिहाई (${sec479Calc.thresholdMonthsRounded} महीने) पूरा होते ही अनिवार्य जमानत का अधिकार मिलता है। अभी ${Math.abs(sec479Calc.daysDifference)} दिन शेष हैं, लेकिन आप अभी भी धारा 480 BNSS के तहत नियमित जमानत अर्जी दायर कर सकते हैं।`,
      actions: [
        'Ask a DLSA / NALSA free lawyer (Helpline 15100) to file a Regular Bail application under Section 480 BNSS immediately.',
        'Obtain the Custody Certificate from the Jail Superintendent and request noting the exact Section 479(3) BNSS mandatory release date.',
        'Use the Bail Check tab above to generate a printable court bail letter for the Magistrate.',
      ],
      spokenScript:
        'घबराएं नहीं। आप अभी धारा 480 बीएनएसएस के तहत नियमित जमानत की अर्जी लगा सकते हैं और एक-तिहाई समय पूरा होने पर अनिवार्य जमानत का अधिकार मिलेगा। मुफ्त वकील के लिए 15100 पर कॉल करें।',
    };
  }

  const isGreetingOrSmallTalk =
    /^(?:hi+|he+y+|hello+|hlo+|yo+|sup|namaste|namaskar|pranam|salaam|good\s*(?:morning|afternoon|evening|night)|how\s+are\s+you|how\s*r\s*u|kaise\s+ho|kya\s+haal|what'?s\s+up|thanks|thank\s+you|thx|dhanyawad|shukriya|ok|okay|bro|bhai|friend|aur\s+batao|sab\s+badhiya)(?:[\s,!?.]*(?:bro|bhai|sir|ji|friend|there|how\s+are\s+you|how\s*r\s*u|kaise\s+ho|kya\s+haal|what'?s\s+up|all\s+good|can\s+you\s+help(?:\s+me)?|please))*[\s,!?.]*$/i.test(
      qLower
    ) ||
    /^(?:नमस्ते|नमस्कार|प्रणाम|हेलो|हाय|भाई|दोस्त|कैसे हो|कैसे हैं|क्या हाल है|क्या हाल|धन्यवाद|शुक्रिया)(?:[\s,!?.।]*(?:नमस्ते|नमस्कार|भाई|जी|दोस्त|कैसे हो|कैसे हैं|क्या हाल है|क्या हाल|सब ठीक))*[\s,!?.।]*$/i.test(
      qLower
    );

  const isCapabilityQuestion =
    /\b(?:who\s+are\s+you|what\s+can\s+you\s+do|how\s+does\s+this\s+work|what\s+is\s+nyayasetu|tum\s+kaun\s+ho|aap\s+kaun\s+ho|kya\s+kar\s+sakte\s+ho)\b|आप कौन हैं|क्या कर सकते/i.test(
      qLower
    );

  if (isGreetingOrSmallTalk || isCapabilityQuestion) {
    return {
      summaryEn:
        'Hey! I\'m doing well and ready to help—you can write in English, Hindi, or Hinglish. Tell me what happened (for example: "what if someone attacks me", "kisi ne mujhe maara", "police bhai ko le gayi", or mention a section like 323 IPC, 303 BNS, 420 IPC), and I\'ll give you the exact BNS/IPC law, bail rights, and next steps.',
      summaryHi:
        'नमस्ते! मैं बिल्कुल ठीक हूँ और आपकी मदद के लिए तैयार हूँ—आप हिंदी, इंग्लिश या हिंग्लिश में लिख सकते हैं। कृपया बताएं क्या हुआ (जैसे "किसी ने मुझ पर हमला किया", "पड़ोसी से मारपीट", "चोरी धारा 303" या "धोखाधड़ी 420"), मैं तुरंत लागू BNS/IPC धारा, जमानत नियम और अगले कदम बताऊंगा।',
      actions: hasDevanagari
        ? [
            'बाईं ओर अपनी समस्या हिंदी, इंग्लिश या हिंग्लिश में लिखें (जैसे "किसी ने मुझे मारा" या "धारा 323 झगड़ा")।',
            'यदि आपके पास FIR की फोटो है, तो ऊपर "Scan FIR" टैब में अपलोड करके तुरंत धाराएं और जमानत स्थिति जानें।',
            'जेल में बिताए समय के आधार पर अनिवार्य जमानत जांचने के लिए "Bail Check" टैब खोलें।',
          ]
        : [
            'Ask in English, Hindi, or Hinglish on the left (e.g., "someone attacked me", "kisi ne paise thag liye", or "Section 323 IPC fight").',
            'Have an FIR photo? Switch to the "Scan FIR" tab above to read the sections and bail status automatically.',
            'Need to check 1/3rd mandatory bail or print a court letter? Open the "Bail Check" tab above.',
          ],
      spokenScript:
        'नमस्ते! मैं न्यायसेतु हूँ। आप अपनी समस्या हिंदी, इंग्लिश या हिंग्लिश में बता सकते हैं और मैं आपको तुरंत सही कानूनी धारा और जमानत के नियम समझाऊंगा।',
    };
  }

  const isCyberOrWomenHarassmentQuery =
    /\b(?:stalking|eve\s*teasing|molest|molestation|harass|harassing|harassment|chhedkhani|chedkhani|bad\s+touch|morphed\s+photo|blackmail\s+photo|private\s+photo)\b|छेड़खानी|परेशान कर रहा/i.test(
      qLower
    );

  if (isCyberOrWomenHarassmentQuery) {
    return {
      summaryEn:
        'Under BNS 2023, stalking (Section 78 BNS / old IPC 354D), criminal force to outrage modesty (Section 74 BNS / old IPC 354), and sexual harassment (Section 75 BNS / old IPC 354A) are strict cognizable offences. Police are legally bound to register a Zero FIR immediately under Section 173 BNSS (recorded by a woman officer), and women are entitled to 100% free legal counsel under Section 12 of the Legal Services Authorities Act (NALSA 15100).',
      summaryHi:
        'भारतीय न्याय संहिता (BNS 2023) के तहत पीछा करना/स्टॉकिंग (धारा 78 BNS / पुरानी 354D IPC), छेड़खानी या लज्जा भंग (धारा 74 व 75 BNS / पुरानी 354 IPC) गंभीर अपराध हैं। धारा 173 BNSS के तहत महिला पुलिस अधिकारी द्वारा तुरंत FIR या Zero FIR दर्ज करना अनिवार्य है, और महिलाओं को NALSA 15100 से 100% मुफ्त सरकारी वकील का अधिकार है।',
      actions: [
        'Call Emergency 112 or Women Helpline 1091 / 181 immediately if you are in danger, and preserve screenshots, call logs, or witnesses.',
        'File a Zero FIR at any nearby police station under Section 173 BNSS (you have the right to have your statement recorded by a woman officer).',
        'Call NALSA Helpline 15100 for a 100% free government lawyer under Section 12(c) of the Legal Services Authorities Act.',
      ],
      spokenScript:
        'भारतीय न्याय संहिता की धारा 74, 75 और 78 के तहत छेड़खानी या पीछा करना गंभीर अपराध है। तुरंत 112 या महिला हेल्पलाइन 1091 पर कॉल करें और नजदीकी थाने में एफआईआर दर्ज कराएं।',
    };
  }

  if (isAnticipatoryBailQuery) {
    return {
      summaryEn:
        'If you fear arrest in a false or non-bailable FIR, you can apply for Anticipatory Bail before arrest under Section 482 BNSS, 2023 (formerly Section 438 CrPC) before the Sessions Court or High Court. Also, for offences punishable up to 7 years, police must follow Section 35(3) BNSS (Arnesh Kumar notice rule) before arresting.',
      summaryHi:
        'यदि आपको किसी झूठी FIR या गैर-जमानती मामले में गिरफ्तारी का डर है, तो आप गिरफ्तारी से पहले धारा 482 BNSS, 2023 (पुरानी धारा 438 CrPC) के तहत सत्र न्यायालय (Sessions Court) या हाई कोर्ट में अग्रिम जमानत (Anticipatory Bail) की अर्जी लगा सकते हैं। साथ ही 7 वर्ष तक की सजा वाले मामलों में पुलिस को गिरफ्तारी से पहले धारा 35(3) BNSS का नोटिस देना अनिवार्य है।',
      actions: [
        'Gather proof of innocence (messages, call logs, CCTV, location proof, or prior written complaints) immediately.',
        'Contact a defense advocate or call NALSA Free Legal Aid Helpline 15100 to file a Section 482 BNSS Anticipatory Bail petition in the Sessions Court.',
        'If you receive a Section 35(3) BNSS police notice, cooperate with the inquiry in writing with a lawyer so police cannot justify arrest.',
      ],
      spokenScript:
        'यदि आपको झूठे केस में गिरफ्तारी का डर है तो आप धारा 482 बीएनएसएस के तहत कोर्ट में अग्रिम जमानत की अर्जी लगा सकते हैं। मुफ्त कानूनी मदद के लिए 15100 पर कॉल करें।',
    };
  }

  const isFirRefusalQuery =
    /\b(?:refus(?:e|ing|ed)\s+(?:to\s+)?(?:file|write|register|lodge)\s+fir|not\s+(?:writing|registering|filing)\s+fir|zero\s+fir|how\s+to\s+file\s+(?:an?\s+)?fir|fir\s+kaise\s+kar(?:e|ein|u)|police\s+fir\s+nahi\s+likh|complaint\s+nahi\s+le)\b|एफआईआर\s*नहीं\s*लिख|fir\s*nahi\s*likh|जीरो एफआईआर/i.test(
      qLower
    );

  if (isFirRefusalQuery) {
    return {
      summaryEn:
        'Under Section 173 of BNSS, 2023, police cannot refuse to register an FIR for a cognizable offence—even if the incident happened outside their area, they must register a "Zero FIR" and transfer it. You can also file an e-FIR online or send a written complaint to the Superintendent of Police (SP) under Section 173(4) BNSS.',
      summaryHi:
        'धारा 173 BNSS, 2023 के तहत संज्ञेय अपराध (Cognizable Offence) में पुलिस FIR लिखने से मना नहीं कर सकती—घटना किसी भी क्षेत्र की हो, थाना "जीरो एफआईआर" (Zero FIR) दर्ज करने के लिए बाध्य है। यदि थाना मना करे, तो आप धारा 173(4) BNSS के तहत पुलिस अधीक्षक (SP) को लिखित शिकायत भेज सकते हैं।',
      actions: [
        'Submit a dated written complaint at the police station and ask for a stamped receiving copy (or file an online e-FIR on your State Police portal).',
        'If the SHO refuses, send the written complaint by Registered Post to the Superintendent of Police (SP) / DCP under Section 173(4) BNSS.',
        'If no action is taken, approach the Judicial Magistrate under Section 175(3) BNSS (with free help from NALSA 15100) for a court order directing FIR registration.',
      ],
      spokenScript:
        'धारा 173 बीएनएसएस के तहत पुलिस संज्ञेय अपराध में एफआईआर लिखने से मना नहीं कर सकती और किसी भी थाने में जीरो एफआईआर दर्ज की जा सकती है। मदद के लिए 15100 पर कॉल करें।',
    };
  }

  if (isArrestOrCustodyQuery) {
    return {
      summaryEn:
        'Stay calm—you have strong constitutional rights under BNSS 2023. Police must inform the arrested person and family of the exact FIR section and bail status (Sections 47 & 48 BNSS), prepare a signed Arrest Memo (Section 36 BNSS), and produce the person before a Magistrate within 24 hours (Section 58 BNSS). Share the exact BNS/IPC section number (or upload the FIR photo in Scan FIR) to check bail eligibility.',
      summaryHi:
        'घबराएं बिल्कुल नहीं—भारतीय नागरिक सुरक्षा संहिता (BNSS 2023) आपको मजबूत कानूनी अधिकार देती है। पुलिस के लिए गिरफ्तारी का कारण व धारा बताना (धारा 47 BNSS), परिवार को सूचना देना (धारा 48 BNSS), अरेस्ट मेमो बनाना और 24 घंटे के भीतर मजिस्ट्रेट के सामने पेश करना अनिवार्य है। सटीक जमानत जांच के लिए कृपया FIR की धारा लिखें या ऊपर Scan FIR टैब में फोटो अपलोड करें।',
      actions: hasDevanagari
        ? [
            'थाने से तुरंत FIR और अरेस्ट मेमो (धारा 36 व 47 BNSS) की कॉपी मांगें और उसमें लिखी BNS या IPC धारा नोट करें।',
            'ध्यान रखें कि पुलिस किसी भी व्यक्ति को बिना मजिस्ट्रेट के आदेश के 24 घंटे से अधिक हिरासत में नहीं रख सकती (धारा 58 BNSS)।',
            '100% मुफ्त सरकारी वकील के लिए तुरंत NALSA विधिक सेवा हेल्पलाइन 15100 पर कॉल करें।',
          ]
        : [
            'Ask the police station for the exact FIR copy and signed Arrest Memo (Sections 36 & 47 BNSS) and note the BNS/IPC section numbers.',
            'Remember that police must produce any arrested person before a Judicial Magistrate within 24 hours (Section 58 BNSS / Article 22).',
            'Call NALSA Free Legal Aid Helpline 15100 right now for a 100% free government defense lawyer, or upload the FIR photo in the Scan FIR tab.',
          ],
      spokenScript:
        'घबराइए मत। पुलिस के लिए गिरफ्तारी की धारा बताना, परिवार को सूचना देना और 24 घंटे के अंदर मजिस्ट्रेट के सामने पेश करना अनिवार्य है। मुफ्त सरकारी वकील के लिए तुरंत 15100 पर कॉल करें।',
    };
  }

  return {
    summaryEn:
      'I can help you in English, Hindi, or Hinglish with any police, FIR, assault, theft, fraud, or bail situation. Tell me briefly what happened (e.g., "someone attacked me", "kisi ne paise thag liye", "police bhai ko le gayi", or a section like 323 / 303 / 420) and I will give you the exact BNS 2023 law and next steps.',
    summaryHi:
      'मैं हिंदी, इंग्लिश या हिंग्लिश में पुलिस, FIR, मारपीट, चोरी, धोखाधड़ी या जमानत से जुड़ी किसी भी समस्या में आपकी मदद कर सकता हूँ। कृपया संक्षेप में बताएं क्या हुआ (जैसे: "किसी ने मुझ पर हमला किया", "पड़ोसी से झगड़ा", "पैसे ठग लिए", या धारा 323 / 303 / 420)।',
    actions: [
      'Describe what happened in your own words (English, Hindi, or Hinglish) or mention any BNS/IPC section number.',
      'Or tap one of the 4 quick examples on the left to see an instant legal breakdown.',
      'For urgent live legal advice from a government lawyer, call NALSA Free Legal Aid Helpline 15100.',
    ],
    spokenScript:
      'कृपया अपनी कानूनी समस्या हिंदी, इंग्लिश या हिंग्लिश में लिखें, या मुफ्त सरकारी वकील के लिए 15100 पर कॉल करें।',
  };
}
