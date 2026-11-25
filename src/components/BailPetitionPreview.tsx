/**
 * @fileoverview Live Section 479 BNSS eligibility gauge and printable court bail petition preview.
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Printer,
  Scale,
} from 'lucide-react';
import type { Section479Calculation } from '../types/legal';

interface BailPetitionPreviewProps {
  bnsSection: string;
  calculation: Section479Calculation;
  dossierText: string;
  copied: boolean;
  onCopy: () => void;
}

const WAVE_BARS = [
  24, 38, 52, 30, 66, 44, 78, 56, 36, 70, 48, 84, 62, 40, 74, 52, 88, 60, 42,
  68, 54, 76, 38, 64, 46, 82, 58, 34, 72, 50,
];

/**
 * Renders the Section 479 BNSS detention threshold progress card and ready-to-print bail petition.
 */
export const BailPetitionPreview: React.FC<BailPetitionPreviewProps> = ({
  bnsSection,
  calculation,
  dossierText,
  copied,
  onCopy,
}) => {
  const litBarCount = Math.round(
    (calculation.percentOfThreshold / 100) * WAVE_BARS.length
  );

  return (
    <div className="lg:col-span-7 space-y-6">
      <div className="no-print rounded-[24px] border-2 border-[#1A1A1A] bg-[#034F46] text-[#FFFFEB] p-6 sm:p-8 shadow-[4px_4px_0_#1A1A1A] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#FFFFEB]/15 pb-4">
          <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
            {calculation.excludedForDeathOrLife ? (
              <>
                <AlertTriangle
                  className="h-5 w-5 text-[#FFBCF2] shrink-0"
                  aria-hidden="true"
                />
                <span className="text-[#FFBCF2]">
                  Regular Court Bail Needed (Not Covered by Sec. 479)
                </span>
              </>
            ) : calculation.isEligible ? (
              <>
                <CheckCircle2
                  className="h-5 w-5 text-[#F0D7FF] shrink-0"
                  aria-hidden="true"
                />
                <span className="text-[#F0D7FF]">
                  Eligible for Mandatory Bail Now
                </span>
              </>
            ) : (
              <>
                <Scale
                  className="h-5 w-5 text-[#FFA946] shrink-0"
                  aria-hidden="true"
                />
                <span className="text-[#FFA946]">
                  {Math.abs(calculation.daysDifference)} Days Left for Mandatory
                  Bail
                </span>
              </>
            )}
          </div>
          <span className="font-mono text-xs font-semibold text-[#F0D7FF] tabular-nums">
            {bnsSection}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-[#FFFFEB]/10 p-3.5 sm:p-4">
            <div className="text-xs text-[#FFFFEB]/75">Max Jail</div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#FFFFEB] tabular-nums">
              {calculation.maxPunishmentMonths} mo
            </div>
          </div>
          <div className="rounded-2xl bg-[#FFFFEB]/10 p-3.5 sm:p-4">
            <div className="text-xs text-[#FFFFEB]/75">Bail After</div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#F0D7FF] tabular-nums">
              {calculation.thresholdMonthsRounded} mo
            </div>
          </div>
          <div className="rounded-2xl bg-[#FFFFEB]/10 p-3.5 sm:p-4">
            <div className="text-xs text-[#FFFFEB]/75">Served</div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#FFA946] tabular-nums">
              {calculation.undergoneMonthsRounded} mo
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs sm:text-[13px] text-[#FFFFEB]/85">
            <span>Bail Threshold Progress</span>
            <span className="font-mono font-bold text-[#F0D7FF] tabular-nums">
              {calculation.percentOfThreshold}%
            </span>
          </div>

          <div
            className="relative flex h-14 items-center justify-between gap-1 px-1"
            aria-hidden="true"
          >
            {WAVE_BARS.map((height, i) => {
              const isLit = i < litBarCount;
              return (
                <span
                  key={i}
                  className={`w-1.5 rounded-full transition-colors duration-200 ${
                    isLit
                      ? calculation.excludedForDeathOrLife
                        ? 'bg-[#FFBCF2]'
                        : 'bg-[#F0D7FF]'
                      : 'bg-[#FFFFEB]/25'
                  }`}
                  style={{ height: `${Math.round((height / 100) * 48)}px` }}
                />
              );
            })}
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-[#FFA946] transition-all duration-200"
              style={{
                left: `clamp(0%, ${calculation.percentOfThreshold}%, 99%)`,
              }}
            >
              <span className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 rounded-full bg-[#FFA946]" />
            </div>
          </div>
        </div>
      </div>

      {dossierText && (
        <div className="print-only-dossier ink-card rounded-[24px] bg-[#FFFFEB] p-6 sm:p-7">
          <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E4D0] pb-4">
            <h4 className="font-display text-base font-bold text-[#1A1A1A]">
              Ready-to-Print Court Bail Letter
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopy}
                className="btn-cream inline-flex min-h-[36px] items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-cobalt inline-flex min-h-[36px] items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <pre className="mt-4 max-h-[520px] overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs sm:text-[13px] leading-relaxed text-[#1A1A1A] bg-[#F6F6E0] p-5 rounded-2xl border-2 border-[#1A1A1A] print:max-h-none print:overflow-visible print:bg-white print:text-black print:border-0 print:p-0">
            {dossierText}
          </pre>
        </div>
      )}
    </div>
  );
};
