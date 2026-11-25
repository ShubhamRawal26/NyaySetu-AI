import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  PhoneCall,
  Scale,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  BailTransferPayload,
  LegalAdvisoryResponse,
} from '../types/legal';
import { postJsonWithRetry } from '../utils/apiClient';

interface LegalFirstAidPanelProps {
  onTransferToBail: (payload: BailTransferPayload) => void;
  onOpenNalsa: () => void;
  prefillQuery?: string | null;
  onPrefillConsumed?: () => void;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const QUICK_EXAMPLES = [
  {
    label: 'Neighbor fight (Sec. 115 / 351 BNS)',
    query:
      'कल रात पुलिस मेरे भाई को ले गई। पड़ोसी से मामूली कहासुनी हुई थी, पुलिस धारा 115 और 351 लगा रही है। क्या उसे जेल होगी?',
  },
  {
    label: 'Small theft under ₹5,000 (Sec. 303 BNS)',
    query:
      'Police arrested Ramesh for stealing a bicycle worth Rs 3500 under Section 303 BNS. It is his first mistake.',
  },
  {
    label: 'In jail 9 months (Sec. 479 BNSS bail)',
    query:
      'My uncle has been in district jail for 9 months for a theft case with 2 years max punishment. Trial has not even started. Can he get bail?',
  },
  {
    label: 'Cheating case (Sec. 420 IPC / 318 BNS)',
    query:
      'Someone accused my brother of cheating and taking money under 420. Police arrested him today.',
  },
];

function formatCitation(prefix: 'BNS' | 'IPC', value: string): string {
  const clean = value
    .replace(/^(?:Sec\.?|Section|BNS|IPC)\s*/gi, '')
    .replace(/\s*(?:of\s+)?(?:BNS|IPC)$/gi, '')
    .trim();
  if (!clean || /^(n\/a|none|pending)$/i.test(clean)) {
    return clean || 'N/A';
  }
  return `${prefix} ${clean}`;
}

export const LegalFirstAidPanel: React.FC<LegalFirstAidPanelProps> = ({
  onTransferToBail,
  onOpenNalsa,
  prefillQuery,
  onPrefillConsumed,
}) => {
  const [query, setQuery] = useState('');
  const [summaryLang, setSummaryLang] = useState<'en' | 'hi'>('en');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<LegalAdvisoryResponse | null>(null);

  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const analyzeRequestIdRef = useRef<number>(0);

  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    if (win.SpeechRecognition || win.webkitSpeechRecognition) {
      setSpeechSupported(true);
    }
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (prefillQuery) {
      setQuery(prefillQuery);
      onPrefillConsumed?.();
    }
  }, [prefillQuery, onPrefillConsumed]);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as Record<string, unknown>;
    const SpeechRecCtor = (win.SpeechRecognition ||
      win.webkitSpeechRecognition) as
      | (new () => SpeechRecognitionLike)
      | undefined;

    if (!SpeechRecCtor) {
      setError('Voice input is not supported in this browser. Please type below.');
      return;
    }

    try {
      const recognition = new SpeechRecCtor();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuery(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch {
      setIsListening(false);
      setError('Microphone permission denied. Please type your question below.');
    }
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setTtsPlaying(false);
  };

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
      const data = await postJsonWithRetry<{
        advisory?: LegalAdvisoryResponse;
        error?: string;
      }>(
        '/api/legal-aid',
        {
          query: textToSend,
          language: 'bilingual',
        },
        'Could not get an answer right now.'
      );

      if (reqId !== analyzeRequestIdRef.current) return;

      if (!data.advisory) {
        throw new Error(data.error || 'Could not get an answer right now.');
      }

      setAdvisory(data.advisory);
      const hasDevanagari = /[\u0900-\u097F]/.test(textToSend);
      setSummaryLang(hasDevanagari ? 'hi' : 'en');
    } catch (err) {
      if (reqId !== analyzeRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      if (reqId === analyzeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handlePlayAudio = () => {
    if (!advisory) return;
    if (ttsPlaying) {
      stopAudio();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsError('Voice playback is not supported in this browser.');
      return;
    }

    const textToSpeak =
      summaryLang === 'hi'
        ? advisory.spoken_tts_script || advisory.empathetic_summary_hi
        : advisory.empathetic_summary_en;

    if (!textToSpeak) return;

    try {
      setTtsError(null);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const targetLang = summaryLang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.lang = targetLang;
      utterance.rate = 0.96;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase()) ||
        voices.find((v) =>
          v.lang.toLowerCase().startsWith(summaryLang === 'hi' ? 'hi' : 'en')
        );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => setTtsPlaying(true);
      utterance.onend = () => setTtsPlaying(false);
      utterance.onerror = () => {
        setTtsPlaying(false);
        setTtsError('Voice playback could not start on this device.');
      };

      window.speechSynthesis.speak(utterance);
      setTtsPlaying(true);
    } catch {
      setTtsPlaying(false);
      setTtsError('Could not play voice audio on this device.');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
      {/* Left Simple Input Box */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="ink-card rounded-[24px] bg-[#F6F6E0] p-6 sm:p-7">
          <h3 className="font-display text-lg font-bold leading-snug text-[#1A1A1A]">
            Tell us what happened
          </h3>
          <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-[#4A4A43]">
            Write or speak in simple English or Hindi.
          </p>

          <div className="mt-4">
            <label htmlFor="legal-query-input" className="sr-only">
              Describe your legal question
            </label>
            <textarea
              id="legal-query-input"
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
                isListening
                  ? 'bg-[#FFA946] text-[#1A1A1A]'
                  : 'bg-[#FFFFEB] text-[#1A1A1A] hover:bg-[#F0D7FF]'
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
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-xl border-2 border-[#1A1A1A] bg-[#FFBCF2]/50 p-3.5 text-xs leading-relaxed font-medium text-[#1A1A1A]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* 4 Quick Examples */}
        <div className="ink-card rounded-[24px] bg-[#F6F6E0] overflow-hidden">
          <div className="px-6 py-3.5 border-b border-[#E4E4D0] bg-[#FFFFEB]/60">
            <h4 className="font-display text-xs font-bold tracking-wide text-[#4A4A43]">
              Try an example
            </h4>
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
                <ArrowRight
                  className="h-4 w-4 text-[#8C8C80] group-hover:text-[#0041CA] group-hover:translate-x-0.5 transition-transform shrink-0"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Clear Answer Panel */}
      <div className="lg:col-span-7 flex flex-col" aria-live="polite">
        {loading ? (
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
        ) : !advisory ? (
          <div className="flex flex-1 min-h-[360px] flex-col justify-between rounded-[24px] border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] p-6 sm:p-8 shadow-[4px_4px_0_#034F46]">
            <div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-[#FFFFEB]">
                Clear answers,{' '}
                <span className="font-editorial-italic text-[#F0D7FF]">
                  zero jargon.
                </span>
              </h3>
              <p className="mt-3.5 max-w-lg text-sm sm:text-[15px] leading-relaxed text-[#FFFFEB]/80">
                Ask any question on the left or pick an example. You will get a
                plain-English answer, bail status, and 3 clear next steps.
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
        ) : (
          <div className="flex flex-1 flex-col justify-between rounded-[24px] border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] p-6 sm:p-8 shadow-[4px_4px_0_#034F46] space-y-6">
            <div className="space-y-6">
              {/* Bail Verdict + Listen Audio */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#FFFFEB]/15 pb-5">
                <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
                  {advisory.detected_sections.length === 0 ? (
                    <>
                      <Scale
                        className="h-5 w-5 text-[#F0D7FF] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[#F0D7FF]">
                        {advisory.statutory_bail_sec_479_applicable
                          ? 'Section 479 BNSS Bail Guidance'
                          : 'NyayaSetu Legal Helper'}
                      </span>
                    </>
                  ) : advisory.overall_bailable ? (
                    <>
                      <CheckCircle2
                        className="h-5 w-5 text-[#34D399] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[#34D399]">
                        Police Must Grant Bail (Bailable)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle
                        className="h-5 w-5 text-[#FFA946] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[#FFA946]">
                        Court Bail Needed (Non-Bailable)
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-9 items-center rounded-xl bg-[#121211] p-1 border border-[#FFFFEB]/15">
                    <button
                      type="button"
                      onClick={() => setSummaryLang('en')}
                      className={`h-full px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        summaryLang === 'en'
                          ? 'bg-[#FFFFEB] text-[#1A1A1A]'
                          : 'text-[#FFFFEB]/70 hover:text-[#FFFFEB]'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryLang('hi')}
                      className={`h-full px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        summaryLang === 'hi'
                          ? 'bg-[#FFFFEB] text-[#1A1A1A]'
                          : 'text-[#FFFFEB]/70 hover:text-[#FFFFEB]'
                      }`}
                    >
                      Hindi
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    aria-pressed={ttsPlaying}
                    aria-label={ttsPlaying ? 'Stop reading answer aloud' : 'Listen to answer aloud'}
                    className="inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold text-[#1A1A1A] bg-[#F0D7FF] hover:bg-[#FFFFEB] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {ttsPlaying ? (
                      <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{ttsPlaying ? 'Stop' : 'Listen'}</span>
                  </button>
                </div>
              </div>

              {ttsError && (
                <div className="rounded-xl bg-[#FFA946]/15 px-4 py-2.5 text-xs text-[#FFA946]">
                  {ttsError}
                </div>
              )}

              {/* Simple Plain-Language Answer */}
              <p className="text-[15px] sm:text-base leading-[1.7] text-[#FFFFEB]">
                {summaryLang === 'en'
                  ? advisory.empathetic_summary_en
                  : advisory.empathetic_summary_hi}
              </p>

              {/* Section 479 BNSS Statutory Relief Highlight */}
              {advisory.statutory_bail_sec_479_applicable && (
                <div className="flex items-start gap-3 rounded-2xl border border-[#34D399]/35 bg-[#034F46]/45 px-4 py-3.5 text-xs sm:text-sm leading-relaxed text-[#FFFFEB]">
                  <Scale
                    className="h-4 w-4 text-[#34D399] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>
                    <strong className="font-semibold text-[#34D399]">
                      Section 479 BNSS Applies:
                    </strong>{' '}
                    First-time undertrials qualify for mandatory statutory bail after serving 1/3rd of the maximum sentence.
                  </span>
                </div>
              )}

              {/* 3 Clear Next Steps */}
              <div className="space-y-3 rounded-2xl bg-[#121211] p-5 border border-[#FFFFEB]/10">
                <h4 className="font-display text-xs font-bold tracking-wide text-[#F0D7FF]">
                  What to do right now
                </h4>
                <ol className="space-y-2.5 text-sm text-[#FFFFEB]/90 list-decimal pl-5">
                  {advisory.immediate_citizen_actions.slice(0, 3).map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Matched Sections */}
              {advisory.detected_sections.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="font-display text-xs font-bold tracking-wide text-[#FFFFEB]/70">
                    Matched Law Sections
                  </h4>
                  <div className="divide-y divide-[#FFFFEB]/10 rounded-2xl border border-[#FFFFEB]/15 overflow-hidden">
                    {advisory.detected_sections.map((sec, idx) => (
                      <div
                        key={`${sec.bns_section}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-xs sm:text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-[#F0D7FF] tabular-nums">
                            {formatCitation('BNS', sec.bns_section)}
                          </span>
                          <span className="mx-2 text-[#FFFFEB]/40">/</span>
                          <span className="font-mono text-[#FFFFEB]/70 tabular-nums">
                            {formatCitation('IPC', sec.ipc_section)}
                          </span>
                          <span className="mx-2 text-[#FFFFEB]/40">·</span>
                          <span className="text-[#FFFFEB]">{sec.title}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-[#FFFFEB]/65 tabular-nums">
                            Max: {sec.max_punishment}
                          </span>
                          <span
                            className={`font-semibold whitespace-nowrap ${
                              sec.is_bailable ? 'text-[#34D399]' : 'text-[#FFA946]'
                            }`}
                          >
                            {sec.is_bailable ? 'Bailable' : 'Non-Bailable'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Simple Bottom Action Bar */}
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
        )}
      </div>
    </div>
  );
};
