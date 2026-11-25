/**
 * @fileoverview Custom React hook encapsulating Web Speech API voice input
 * (`SpeechRecognition`) and bilingual speech synthesis (`speechSynthesis`).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LegalAdvisoryResponse } from '../types/legal';

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

/**
 * Provides voice recognition and bilingual text-to-speech playback controls.
 *
 * @param onTranscript - Callback invoked when spoken text is transcribed.
 * @param onSpeechError - Callback invoked when microphone access fails.
 * @returns Voice input and TTS playback state and handlers.
 */
export function useSpeechAssistant(
  onTranscript: (text: string) => void,
  onSpeechError: (msg: string) => void
) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

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

  const stopAudio = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setTtsPlaying(false);
  }, []);

  const toggleVoiceInput = useCallback(() => {
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
      onSpeechError(
        'Voice input is not supported in this browser. Please type below.'
      );
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
        onTranscript(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      onSpeechError(
        'Microphone permission denied. Please type your question below.'
      );
    }
  }, [isListening, onSpeechError, onTranscript]);

  const handlePlayAudio = useCallback(
    (advisory: LegalAdvisoryResponse | null, summaryLang: 'en' | 'hi') => {
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
          voices.find(
            (v) => v.lang.toLowerCase() === targetLang.toLowerCase()
          ) ||
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
    },
    [stopAudio, ttsPlaying]
  );

  return {
    isListening,
    speechSupported,
    ttsPlaying,
    ttsError,
    setTtsError,
    stopAudio,
    toggleVoiceInput,
    handlePlayAudio,
  };
}
