import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BNS_STATUTORY_CATALOG,
  calculateSection479,
  detectSectionsFromText,
  findCatalogSection,
} from '../src/shared/bnsCatalog.ts';
import {
  analyzeLegalQueryLocally,
  generateBailDossierLocally,
  parseFirOcrTextLocally,
} from '../src/shared/localLegalEngine.ts';
import {
  hasValidFileSignature,
  sanitizeInputText,
} from '../server.ts';

test('BNS/IPC Statutory Catalog contains 16 verified sections with required fields', () => {
  assert.equal(BNS_STATUTORY_CATALOG.length, 16);
  for (const item of BNS_STATUTORY_CATALOG) {
    assert.ok(item.bnsSection.length > 0);
    assert.ok(item.ipcSection.length > 0);
    assert.ok(item.title.length > 0);
    assert.ok(item.hindiTitle.length > 0);
    assert.ok(item.maxPunishmentMonths > 0);
  }
});

test('findCatalogSection resolves exact BNS, bare subsection, and legacy IPC citations without false substring matches', () => {
  const s115 = findCatalogSection('115(2)');
  assert.ok(s115);
  assert.equal(s115.bnsSection, '115(2) BNS');
  assert.equal(s115.ipcSection, '323 IPC');
  assert.equal(s115.isBailable, true);

  const s420 = findCatalogSection('420 IPC');
  assert.ok(s420);
  assert.equal(s420.bnsSection, '318(4) BNS');
  assert.equal(s420.isBailable, false);

  // Must not false-match 185 BNS to 85 BNS or 2323 IPC to 323 IPC
  assert.equal(findCatalogSection('185 BNS'), undefined);
  assert.equal(findCatalogSection('2323 IPC'), undefined);
});

test('detectSectionsFromText detects English, Hindi Devanagari, Indic digits, and Romanized Hinglish queries', () => {
  const hindiDigits = detectSectionsFromText(
    'कल रात पुलिस मेरे भाई को ले गई, धारा ११५ और ३५१ लगा रही है'
  );
  const hindiBns = hindiDigits.map((s) => s.bnsSection);
  assert.ok(hindiBns.includes('115(2) BNS'));
  assert.ok(hindiBns.includes('351(2) BNS'));

  const hinglishAttack = detectSectionsFromText(
    'bhai padosi ne mujh par attack kiya aur maara peeta'
  );
  assert.ok(hinglishAttack.some((s) => s.bnsSection === '115(2) BNS'));

  const hinglishFraud = detectSectionsFromText(
    'mere saath online otp scam aur dhokadhadi hui hai'
  );
  assert.ok(hinglishFraud.some((s) => s.bnsSection === '318(4) BNS'));
});

test('calculateSection479 computes 1/3rd first-time offender and 1/2 general undertrial thresholds accurately', () => {
  const firstTimer = calculateSection479({
    maxPunishmentMonths: 36,
    undergoneDays: 400,
    isFirstTimeOffender: true,
  });
  assert.equal(firstTimer.fractionNumerator, 1);
  assert.equal(firstTimer.fractionDenominator, 3);
  assert.equal(firstTimer.thresholdDays, 366);
  assert.equal(firstTimer.isEligible, true);

  const repeatUndertrial = calculateSection479({
    maxPunishmentMonths: 36,
    undergoneDays: 400,
    isFirstTimeOffender: false,
  });
  assert.equal(repeatUndertrial.fractionNumerator, 1);
  assert.equal(repeatUndertrial.fractionDenominator, 2);
  assert.equal(repeatUndertrial.isEligible, false);

  const lifeOffence = calculateSection479({
    maxPunishmentMonths: 120,
    undergoneDays: 900,
    isFirstTimeOffender: true,
    excludedForDeathOrLife: true,
  });
  assert.equal(lifeOffence.excludedForDeathOrLife, true);
  assert.equal(lifeOffence.isEligible, false);
});

test('analyzeLegalQueryLocally handles victim attack/self-defence, petty theft < Rs 5000, Hinglish arrest, and greetings', () => {
  const victimAttack = analyzeLegalQueryLocally(
    'What should I do if someone attack on me?'
  );
  assert.ok(victimAttack.advisory.detected_sections.length > 0);
  assert.match(
    victimAttack.advisory.empathetic_summary_en,
    /Self-Defence|Sections 34 to 44 BNS/i
  );

  const pettyTheft = analyzeLegalQueryLocally(
    'Police arrested Ramesh for stealing a bicycle worth Rs 3500 under Section 303 BNS. First mistake.'
  );
  assert.ok(
    pettyTheft.advisory.detected_sections.some(
      (s) => s.bns_section === '303(2) BNS'
    )
  );
  assert.match(
    pettyTheft.advisory.empathetic_summary_en,
    /303\(2\) BNS|Community Service/i
  );

  const greeting = analyzeLegalQueryLocally('hi how are you bro');
  assert.equal(greeting.advisory.detected_sections.length, 0);
});

test('parseFirOcrTextLocally and generateBailDossierLocally produce valid structured outputs', () => {
  const sampleOcr = `
    FIRST INFORMATION REPORT
    FIR No: 0142/2026
    Police Station: Kotwali Nagar
    Date: 14/03/2026
    Complainant: Suresh Verma
    Accused: Ramesh Kumar
    Sections: 115(2) BNS and 351(2) BNS
    Brief Facts: Minor neighborhood altercation.
  `;
  const extraction = parseFirOcrTextLocally(sampleOcr);
  assert.equal(extraction.fir_number, '0142/2026');
  assert.equal(extraction.is_overall_bailable, true);
  assert.ok(extraction.extracted_sections.length >= 2);

  const dossierResult = generateBailDossierLocally({
    accusedName: 'Ramesh Kumar',
    firNumber: '0142/2026',
    policeStation: 'Kotwali Nagar',
    district: 'Lucknow',
    courtName: 'Court of the Chief Judicial Magistrate',
    jailName: 'District Jail Lucknow',
    custodyStartDate: '01/01/2025',
    bnsSection: '303(2) BNS',
    ipcSection: '379 IPC',
    offenceTitle: 'Theft',
    maxPunishmentLabel: 'Up to 3 Years',
    maxPunishmentMonths: 36,
    undergoneDays: 420,
    isFirstTimeOffender: true,
  });
  assert.match(
    dossierResult.dossier_text,
    /SECTION 479 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA/i
  );
  assert.match(dossierResult.dossier_text, /Ramesh Kumar/);
  assert.match(dossierResult.dossier_text, /0142\/2026/);
  assert.equal(dossierResult.calculation.isEligible, true);
});

test('Security helpers sanitize control characters and validate binary magic-byte signatures', () => {
  const dirty = 'Hello\u0000\u0007World   ';
  assert.equal(sanitizeInputText(dirty, 100), 'HelloWorld');

  const validJpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).toString('base64');
  const validPngBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]).toString('base64');
  const validPdfBase64 = Buffer.from('%PDF-1.7\n').toString('base64');
  const spoofedExeBase64 = Buffer.from('MZ\x90\x00\x03\x00').toString('base64');

  assert.equal(hasValidFileSignature(validJpegBase64, 'image/jpeg'), true);
  assert.equal(hasValidFileSignature(validPngBase64, 'image/png'), true);
  assert.equal(hasValidFileSignature(validPdfBase64, 'application/pdf'), true);
  assert.equal(hasValidFileSignature(spoofedExeBase64, 'image/jpeg'), false);
  assert.equal(hasValidFileSignature(spoofedExeBase64, 'application/pdf'), false);
});
