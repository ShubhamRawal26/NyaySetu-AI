/**
 * @fileoverview Presentational result card displaying extracted FIR / Arrest Memo
 * facts, IPC-to-BNS 2023 section mappings, and Section 303(2) community service eligibility.
 */

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import type {
  BailTransferPayload,
  FIROCRExtractionResponse,
} from '../types/legal';

interface FirAnalysisResultCardProps {
  loading: boolean;
  result: FIROCRExtractionResponse | null;
  onTransferToBail: (payload: BailTransferPayload) => void;
}

/**
 * Renders the right-hand FIR OCR analysis card in Scan FIR.
 */
export const FirAnalysisResultCard: React.FC<FirAnalysisResultCardProps> = ({
  loading,
  result,
  onTransferToBail,
}) => {
  if (loading) {
    return (
      <div className="ink-card flex flex-1 flex-col justify-center rounded-[24px] bg-[#F6F6E0] p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#1A1A1A]">
          <Loader2
            className="h-5 w-5 animate-spin text-[#0041CA] shrink-0"
            aria-hidden="true"
          />
          <span>Reading FIR photo and checking bail rules...</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
          <div className="h-16 rounded-2xl bg-[#E4E4D0]" />
          <div className="h-16 rounded-2xl bg-[#E4E4D0]" />
        </div>
        <div className="h-32 rounded-2xl bg-[#E4E4D0] animate-pulse" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="ink-card flex flex-1 min-h-[360px] flex-col justify-center rounded-[24px] bg-[#F6F6E0] p-6 sm:p-8">
        <h3 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-[#1A1A1A]">
          Read any handwritten FIR in{' '}
          <span className="font-editorial-italic">one tap.</span>
        </h3>
        <p className="mt-3.5 max-w-lg text-sm sm:text-[15px] leading-relaxed text-[#4A4A43]">
          Upload a phone photo of the FIR or tap{' '}
          <strong className="text-[#1A1A1A]">Try Sample FIR</strong>. We
          extract the sections, translate old IPC numbers to BNS 2023, and tell
          you if bail is available.
        </p>
      </div>
    );
  }

  return (
    <div className="ink-card flex flex-1 flex-col rounded-[24px] bg-[#FFFFEB] overflow-hidden">
      <div className="bg-[#1A1A1A] text-[#FFFFEB] px-6 py-4 sm:px-7">
        <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
          {result.is_overall_bailable ? (
            <>
              <CheckCircle2
                className="h-5 w-5 text-[#34D399] shrink-0"
                aria-hidden="true"
              />
              <span className="text-[#34D399]">
                Bailable — Police Station Bail Applies
              </span>
            </>
          ) : (
            <>
              <AlertTriangle
                className="h-5 w-5 text-[#FFA946] shrink-0"
                aria-hidden="true"
              />
              <span className="text-[#FFA946]">
                Non-Bailable — Court Bail Required
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6 sm:p-7 space-y-5">
        <div className="space-y-5">
          {result.petty_theft_community_service_flag && (
            <div className="flex items-start gap-2.5 rounded-2xl border-2 border-[#1A1A1A] bg-[#F0D7FF] p-4 text-xs sm:text-sm leading-relaxed text-[#1A1A1A]">
              <ShieldCheck
                className="h-5 w-5 text-[#034F46] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <strong>Community Service Possible:</strong> First-time theft
                under ₹5,000 can qualify for community service instead of jail
                (Section 303(2) BNS).
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A]">
            <div className="bg-[#F6F6E0] p-4">
              <div className="text-xs font-medium text-[#4A4A43]">FIR Number</div>
              <div className="mt-1 font-mono text-sm font-bold text-[#1A1A1A] tabular-nums">
                {result.fir_number || 'Not clear'}
              </div>
            </div>
            <div className="bg-[#F6F6E0] p-4">
              <div className="text-xs font-medium text-[#4A4A43]">
                Police Station
              </div>
              <div className="mt-1 text-sm font-bold text-[#1A1A1A]">
                {result.police_station || 'Not clear'}
              </div>
            </div>
            <div className="bg-[#F6F6E0] p-4">
              <div className="text-xs font-medium text-[#4A4A43]">Accused</div>
              <div className="mt-1 text-sm font-bold text-[#1A1A1A]">
                {result.accused_name || 'Unknown'}
              </div>
            </div>
            <div className="bg-[#F6F6E0] p-4">
              <div className="text-xs font-medium text-[#4A4A43]">Date</div>
              <div className="mt-1 text-sm font-bold text-[#1A1A1A] tabular-nums">
                {result.date_of_incident || 'Not clear'}
              </div>
            </div>
          </div>

          <p className="text-sm sm:text-[15px] leading-relaxed text-[#1A1A1A]">
            {result.brief_allegation}
          </p>

          <div className="divide-y divide-[#E4E4D0] rounded-2xl border-2 border-[#1A1A1A] bg-[#FFFFEB] overflow-hidden">
            {result.extracted_sections.map((sec, idx) => (
              <div
                key={`${sec.bns_section}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-xs sm:text-sm"
              >
                <div className="min-w-0">
                  <span className="font-mono font-bold text-[#0041CA] tabular-nums">
                    {sec.bns_section}
                  </span>
                  <span className="mx-2 text-[#8C8C80]">/</span>
                  <span className="font-mono text-[#4A4A43] tabular-nums">
                    {sec.ipc_section}
                  </span>
                  <span className="mx-2 text-[#8C8C80]">·</span>
                  <span className="font-medium text-[#1A1A1A]">{sec.title}</span>
                </div>
                <span
                  className={`font-bold whitespace-nowrap shrink-0 ${
                    sec.is_bailable ? 'text-[#034F46]' : 'text-[#B45309]'
                  }`}
                >
                  {sec.is_bailable ? 'Bailable' : 'Non-Bailable'}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#F6F6E0] border border-[#E4E4D0] p-4 text-sm leading-relaxed text-[#1A1A1A]">
            <span className="font-bold text-[#0041CA]">Next step: </span>
            {result.recommended_immediate_action}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => {
              const primary = result.extracted_sections[0];
              onTransferToBail({
                accusedName: result.accused_name,
                firNumber: result.fir_number,
                policeStation: result.police_station,
                bnsSection: primary?.bns_section,
                ipcSection: primary?.ipc_section,
                offenceTitle: primary?.title,
              });
            }}
            className="btn-cobalt inline-flex min-h-[42px] items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Scale className="h-4 w-4" aria-hidden="true" />
            <span>Check Bail Eligibility</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
