/**
 * @fileoverview Interactive Legal First-Aid panel ("Ask Help") supporting
 * voice/typed queries in English, Hindi, and Hinglish.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, Mic, MicOff, Send } from 'lucide-react';
import { useSpeechAssistant } from '../hooks/useSpeechAssistant';
import type { BailTransferPayload, LegalAdvisoryResponse } from '../types/legal';
import { postJsonWithRetry } from '../utils/apiClient';
import { LegalAdvisoryResultCard } from './LegalAdvisoryResultCard';

interface LegalFirstAidPanelProps {
  onTransferToBail: (payload: BailTransferPayload) => void;
  onOpenNalsa: () => void;
  prefillQuery?: string | null;
  onPrefillConsumed?: () => void;
}

const QUICK_EXAMPLES = [
  {
    label: 'Neighbor fight (Sec. 115 / 351 BNS)',
    query: 'कल रात पुलिस मेरे भाई को ले गई। पड़ोसी से मामूली कहासुनी हुई थी, पुलिस धारा 115 और 351 लगा रही है। क्या उसे जेल होगी?',
  },
  {
    label: 'Small theft under ₹5,000 (Sec. 303 BNS)',
    query: 'Police arrested Ramesh for stealing a bicycle worth Rs 3500 under Section 303 BNS. It is his first mistake.',
  },
  {
    label: 'In jail 9 months (Sec. 479 BNSS bail)',
    query: 'My uncle has been in district jail for 9 months for a theft case with 2 years max punishment. Trial has not even started. Can he get bail?',
  },
  {
    label: 'Cheating case (Sec. 420 IPC / 318 BNS)',
    query: 'Someone accused my brother of cheating and taking money under 420. Police arrested him today.',
  },
];

/**
 * Main Ask Help workspace panel combining voice/text input with instant BNS/BNSS guidance.
 */
export const LegalFirstAidPanel: React.FC<LegalFirstAidPanelProps> = ({
  onTransferToBail,
  onOpenNalsa,
  prefillQuery,
  onPrefillConsumed,
}) => {
  const [query, setQuery] = useState('');
  const [summaryLang, setSummaryLang] = useState<'en' | 'hi'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<LegalAdvisoryResponse | null>(null);
  const analyzeRequestIdRef = useRef<number>(0);

  const handleTranscript = useCallback((transcript: string) => {
    setQuery(transcript);
    setError(null);
  }, []);

  const {
    isListening,
    speechSupported,
    ttsPlaying,
    ttsError,
    setTtsError,
    stopAudio,
    toggleVoiceInput,
    handlePlayAudio,
  } = useSpeechAssistant(handleTranscript, setError);

  useEffect(() => {
    if (prefillQuery) {
      setQuery(prefillQuery);
      onPrefillConsumed?.();
    }
  }, [prefillQuery, onPrefillConsumed]);

  const handleAnalyze = async (overrideQuery?: string) => {
    const textToSend = (overrideQuery ?? query).trim();
    if (textToSend.length < 3) {
      setError('Please write or speak what happened first.');
      return;
    }

    const reqId = ++analyzeRequestIdRef.current;
    stopAudio();
    setLoading(true);
    setError(null);
    setTtsError(null);

    try {
      const data = await postJsonWithRetry<{ advisory?: LegalAdvisoryResponse; error?: string }>(
        '/api/legal-aid',
        { query: textToSend, language: 'bilingual' },
        'Could not get an answer right now.'
      );
      if (reqId !== analyzeRequestIdRef.current) return;
      if (!data.advisory) throw new Error(data.error || 'Could not get an answer right now.');

      setAdvisory(data.advisory);
      setSummaryLang(/[\u0900-\u097F]/.test(textToSend) ? 'hi' : 'en');
    } catch (err) {
      if (reqId !== analyzeRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      if (reqId === analyzeRequestIdRef.current) setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="ink-card rounded-[24px] bg-[#F6F6E0] p-6 sm:p-7">
          <h3 className="font-display text-lg font-bold leading-snug text-[#1A1A1A]">
            Tell us what happened
          </h3>
          <p id="legal-query-helper" className="mt-1 text-xs sm:text-[13px] leading-relaxed text-[#4A4A43]">
            Write or speak in simple English or Hindi.
          </p>

          <div className="mt-4">
            <label htmlFor="legal-query-input" className="sr-only">Describe your legal question</label>
            <textarea
              id="legal-query-input"
              aria-describedby="legal-query-helper"
              rows={4}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Example: Police arrested my brother for a neighbor fight under Section 323 IPC. Can we get bail today?"
              className="w-full rounded-2xl border-2 border-[#1A1A1A] bg-[#FFFFEB] p-4 text-sm text-[#1A1A1A] placeholder:text-[#8C8C80] focus:outline-none focus:ring-2 focus:ring-[#0041CA] resize-none leading-relaxed"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={!speechSupported}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop voice input' : 'Speak your legal question'}
              className={`inline-flex min-h-[42px] items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border-2 border-[#1A1A1A] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                isListening ? 'bg-[#FFA946] text-[#1A1A1A]' : 'bg-[#FFFFEB] text-[#1A1A1A] hover:bg-[#F0D7FF]'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-[#0041CA]" aria-hidden="true" />
                  <span>Speak</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={loading || query.trim().length < 3}
              className="btn-cobalt inline-flex min-h-[42px] items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Get Help</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border-2 border-[#1A1A1A] bg-[#FFBCF2]/50 p-3.5 text-xs leading-relaxed font-medium text-[#1A1A1A]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="ink-card rounded-[24px] bg-[#F6F6E0] overflow-hidden">
          <div className="px-6 py-3.5 border-b border-[#E4E4D0] bg-[#FFFFEB]/60">
            <h4 className="font-display text-xs font-bold tracking-wide text-[#4A4A43]">Try an example</h4>
          </div>
          <div className="divide-y divide-[#E4E4D0]">
            {QUICK_EXAMPLES.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={loading}
                onClick={() => {
                  setQuery(item.query);
                  handleAnalyze(item.query);
                }}
                className="group flex min-h-[46px] w-full items-center justify-between gap-3 px-6 py-3 text-left text-xs sm:text-sm font-medium text-[#1A1A1A] hover:bg-[#FFFFEB] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate">{item.label}</span>
                <ArrowRight className="h-4 w-4 text-[#8C8C80] group-hover:text-[#0041CA] group-hover:translate-x-0.5 transition-transform shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 flex flex-col" aria-live="polite">
        <LegalAdvisoryResultCard
          loading={loading}
          advisory={advisory}
          summaryLang={summaryLang}
          onSummaryLangChange={setSummaryLang}
          ttsPlaying={ttsPlaying}
          ttsError={ttsError}
          onPlayAudio={() => handlePlayAudio(advisory, summaryLang)}
          onOpenNalsa={onOpenNalsa}
          onTransferToBail={onTransferToBail}
        />
      </div>
    </div>
  );
};
