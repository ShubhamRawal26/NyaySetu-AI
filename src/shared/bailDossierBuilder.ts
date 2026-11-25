/**
 * @fileoverview Court-formatted BNSS Section 479 / 480 / 483 bail petition generator
 * citing verified detention arithmetic and binding Supreme Court precedents.
 */

import { calculateSection479, findCatalogSection } from './bnsCatalog.ts';
import type { Section479Calculation } from '../types/legal.ts';

/** Input parameters required to build a court-formatted BNSS bail application. */
export interface BailDossierBuildInput {
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
}

/**
 * Generates a formal, court-ready Section 479 / 480 / 483 BNSS bail petition
 * along with verified statutory detention calculations.
 *
 * @param payload - Accused, FIR, court, and detention parameters.
 * @returns Court application text and underlying Section 479 arithmetic result.
 */
export function generateBailDossierLocally(payload: BailDossierBuildInput): {
  dossier_text: string;
  calculation: Section479Calculation;
} {
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

  const prayerReliefClause = calc.isEligible
    ? 'Mandatory Statutory Bail under Section 479 BNSS, 2023'
    : calc.excludedForDeathOrLife
      ? 'Regular Bail under Section 483 BNSS, 2023'
      : 'Regular Bail under Section 480 BNSS, 2023';

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
(a) Enlarge the Applicant/Accused ${payload.accusedName} on ${prayerReliefClause} in FIR No. ${payload.firNumber}, P.S. ${payload.policeStation};
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
