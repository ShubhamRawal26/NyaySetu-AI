/**
 * @fileoverview Presentational result card displaying bilingual legal first-aid
 * summary, matched BNS 2023 / IPC 1860 sections, Section 479 relief badge, and TTS playback.
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, PhoneCall, Scale, Volume2, VolumeX } from 'lucide-react';
import type { BailTransferPayload, LegalAdvisoryResponse } from '../types/legal';

interface LegalAdvisoryResultCardProps {
  loading: boolean;
  advisory: LegalAdvisoryResponse | null;
  summaryLang: 'en' | 'hi';
  onSummaryLangChange: (lang: 'en' | 'hi') => void;
  ttsPlaying: boolean;
  ttsError: string | null;
  onPlayAudio: () => void;
  onOpenNalsa: () => void;
  onTransferToBail: (payload: BailTransferPayload) => void;
}

function formatCitation(prefix: 'BNS' | 'IPC', value: string): string {
  const clean = value
    .replace(/^(?:Sec\.?|Section|BNS|IPC)\s*/gi, '')
    .replace(/\s*(?:of\s+)?(?:BNS|IPC)$/gi, '')
    .trim();
  if (!clean || /^(n\/a|none|pending)$/i.test(clean)) return clean || 'N/A';
  return `${prefix} ${clean}`;
}

/**
 * Renders the right-hand bilingual advisory answer panel in Ask Help.
 */
export const LegalAdvisoryResultCard: React.FC<LegalAdvisoryResultCardProps> = ({
  loading,
  advisory,
  summaryLang,
  onSummaryLangChange,
  ttsPlaying,
  ttsError,
  onPlayAudio,
  onOpenNalsa,
  onTransferToBail,
}) => {
  if (loading) {
    return (
      <div className="flex flex-1 flex-col justify-center rounded-[24px] border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] p-6 sm:p-8 space-y-5 shadow-[4px_4px_0_#034F46]">
        <div className="flex items-center gap-3 text-sm font-medium text-[#F0D7FF]">
          <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden="true" />
          <span>Checking Indian law and bail rules...</span>
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-2xl bg-[#FFFFEB]/10" />
          <div className="h-28 rounded-2xl bg-[#FFFFEB]/10" />
          <div className="h-14 rounded-2xl bg-[#FFFFEB]/10" />
        </div>
      </div>
    );
  }

  if (!advisory) {
    return (
      <div className="flex flex-1 min-h-[360px] flex-col justify-between rounded-[24px] border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] p-6 sm:p-8 shadow-[4px_4px_0_#034F46]">
        <div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-[#FFFFEB]">
            Clear answers, <span className="font-editorial-italic text-[#F0D7FF]">zero jargon.</span>
          </h3>
          <p className="mt-3.5 max-w-lg text-sm sm:text-[15px] leading-relaxed text-[#FFFFEB]/80">
            Ask any question on the left or pick an example. You will get a plain-English answer, bail status, and 3 clear next steps.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#FFFFEB]/15 pt-5 text-xs sm:text-sm text-[#FFFFEB]/75">
          <span>Need a free lawyer right away?</span>
          <button
            type="button"
            onClick={onOpenNalsa}
            className="inline-flex min-h-[36px] items-center gap-1.5 font-semibold text-[#F0D7FF] hover:text-[#FFFFEB] transition-colors cursor-pointer whitespace-nowrap"
          >
            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Call NALSA 15100</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-between rounded-[24px] border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] p-6 sm:p-8 shadow-[4px_4px_0_#034F46] space-y-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#FFFFEB]/15 pb-5">
          <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
            {advisory.detected_sections.length === 0 ? (
              <>
                <Scale className="h-5 w-5 text-[#F0D7FF] shrink-0" aria-hidden="true" />
                <span className="text-[#F0D7FF]">
                  {advisory.statutory_bail_sec_479_applicable
                    ? 'Section 479 BNSS Bail Guidance'
                    : 'NyayaSetu Legal Helper'}
                </span>
              </>
            ) : advisory.overall_bailable ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-[#34D399] shrink-0" aria-hidden="true" />
                <span className="text-[#34D399]">Police Must Grant Bail (Bailable)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-[#FFA946] shrink-0" aria-hidden="true" />
                <span className="text-[#FFA946]">Court Bail Needed (Non-Bailable)</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center rounded-xl bg-[#121211] p-1 border border-[#FFFFEB]/15">
              {(['en', 'hi'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onSummaryLangChange(lang)}
                  className={`h-full px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    summaryLang === lang
                      ? 'bg-[#FFFFEB] text-[#1A1A1A]'
                      : 'text-[#FFFFEB]/70 hover:text-[#FFFFEB]'
                  }`}
                >
                  {lang === 'en' ? 'English' : 'Hindi'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onPlayAudio}
              aria-pressed={ttsPlaying}
              aria-label={ttsPlaying ? 'Stop reading answer aloud' : 'Listen to answer aloud'}
              className="inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold text-[#1A1A1A] bg-[#F0D7FF] hover:bg-[#FFFFEB] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {ttsPlaying ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{ttsPlaying ? 'Stop' : 'Listen'}</span>
            </button>
          </div>
        </div>

        {ttsError && (
          <div className="rounded-xl bg-[#FFA946]/15 px-4 py-2.5 text-xs text-[#FFA946]">{ttsError}</div>
        )}

        <p className="text-[15px] sm:text-base leading-[1.7] text-[#FFFFEB]">
          {summaryLang === 'en' ? advisory.empathetic_summary_en : advisory.empathetic_summary_hi}
        </p>

        {advisory.statutory_bail_sec_479_applicable && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#34D399]/35 bg-[#034F46]/45 px-4 py-3.5 text-xs sm:text-sm leading-relaxed text-[#FFFFEB]">
            <Scale className="h-4 w-4 text-[#34D399] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-[#34D399]">Section 479 BNSS Applies:</strong>{' '}
              First-time undertrials qualify for mandatory statutory bail after serving 1/3rd of the maximum sentence.
            </span>
          </div>
        )}

        <div className="space-y-3 rounded-2xl bg-[#121211] p-5 border border-[#FFFFEB]/10">
          <h4 className="font-display text-xs font-bold tracking-wide text-[#F0D7FF]">What to do right now</h4>
          <ol className="space-y-2.5 text-sm text-[#FFFFEB]/90 list-decimal pl-5">
            {advisory.immediate_citizen_actions.slice(0, 3).map((step, i) => (
              <li key={i} className="leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>

        {advisory.detected_sections.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="font-display text-xs font-bold tracking-wide text-[#FFFFEB]/70">Matched Law Sections</h4>
            <div className="divide-y divide-[#FFFFEB]/10 rounded-2xl border border-[#FFFFEB]/15 overflow-hidden">
              {advisory.detected_sections.map((sec, idx) => (
                <div key={`${sec.bns_section}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-xs sm:text-sm">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-[#F0D7FF] tabular-nums">{formatCitation('BNS', sec.bns_section)}</span>
                    <span className="mx-2 text-[#FFFFEB]/40">/</span>
                    <span className="font-mono text-[#FFFFEB]/70 tabular-nums">{formatCitation('IPC', sec.ipc_section)}</span>
                    <span className="mx-2 text-[#FFFFEB]/40">·</span>
                    <span className="text-[#FFFFEB]">{sec.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[#FFFFEB]/65 tabular-nums">Max: {sec.max_punishment}</span>
                    <span className={`font-semibold whitespace-nowrap ${sec.is_bailable ? 'text-[#34D399]' : 'text-[#FFA946]'}`}>
                      {sec.is_bailable ? 'Bailable' : 'Non-Bailable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#FFFFEB]/15 pt-5">
        <button
          type="button"
          onClick={onOpenNalsa}
          className="inline-flex min-h-[38px] items-center text-xs sm:text-sm font-semibold text-[#FFFFEB]/80 hover:text-[#FFFFEB] underline underline-offset-4 transition-colors cursor-pointer"
        >
          Free Lawyer (15100)
        </button>

        {advisory.detected_sections.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const primary = advisory.detected_sections[0];
              onTransferToBail({
                bnsSection: primary.bns_section,
                ipcSection: primary.ipc_section,
                offenceTitle: primary.title,
              });
            }}
            className="inline-flex min-h-[40px] items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-[#1A1A1A] bg-[#FFA946] hover:bg-[#FFFFEB] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Check Bail Eligibility</span>
          </button>
        )}
      </div>
    </div>
  );
};
