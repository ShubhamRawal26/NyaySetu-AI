/**
 * @fileoverview Server-side Google Gemini SDK (@google/genai) integration with
 * an automatic 10-minute zero-fail circuit breaker to the built-in BNS/BNSS engine.
 */

import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { GEMINI_CIRCUIT_COOLDOWN_MS } from '../shared/constants.ts';
import type { LegalAdvisoryResponse } from '../types/legal.ts';

const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const TTS_GEMINI_MODEL = 'gemini-3.8-flash-lite-tts';

let geminiCircuitOpenUntil = 0;

/**
 * Instantiates a configured `@google/genai` client when a valid API key is present
 * and the circuit breaker is closed.
 */
export function getGeminiClient(apiVersion?: string): GoogleGenAI | null {
  if (Date.now() < geminiCircuitOpenUntil) return null;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

const LEGAL_ADVISORY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    empathetic_summary_en: { type: Type.STRING },
    empathetic_summary_hi: { type: Type.STRING },
    detected_sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          bns_section: { type: Type.STRING },
          ipc_section: { type: Type.STRING },
          title: { type: Type.STRING },
          is_bailable: { type: Type.BOOLEAN },
          max_punishment: { type: Type.STRING },
          is_compoundable: { type: Type.BOOLEAN },
        },
        required: [
          'bns_section',
          'ipc_section',
          'title',
          'is_bailable',
          'max_punishment',
          'is_compoundable',
        ],
      },
    },
    overall_bailable: { type: Type.BOOLEAN },
    statutory_bail_sec_479_applicable: { type: Type.BOOLEAN },
    immediate_citizen_actions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    nalsa_legal_aid_eligible: { type: Type.BOOLEAN },
    spoken_tts_script: { type: Type.STRING },
  },
  required: [
    'empathetic_summary_en',
    'empathetic_summary_hi',
    'detected_sections',
    'overall_bailable',
    'statutory_bail_sec_479_applicable',
    'immediate_citizen_actions',
    'nalsa_legal_aid_eligible',
    'spoken_tts_script',
  ],
};

/**
 * Enriches open-ended legal queries with Google Gemini (`gemini-4-hydrogen` / `gemini-3.1-flash-lite`)
 * when available, falling back instantaneously to the deterministic local BNS/BNSS/Hinglish engine.
 */
export async function enrichWithGeminiIfAvailable(
  query: string,
  localResult: {
    advisory: LegalAdvisoryResponse;
    deterministicMatches: {
      id: string;
      bnsSection: string;
      ipcSection: string;
      title: string;
    }[];
  }
): Promise<LegalAdvisoryResponse> {
  if (
    localResult.advisory.detected_sections.length > 0 ||
    query.split(/\s+/).length <= 12
  ) {
    return localResult.advisory;
  }

  const ai = getGeminiClient();
  if (!ai) return localResult.advisory;

  for (const model of [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL]) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `You are NyayaSetu AI, an Indian legal first-aid assistant grounded in BNS 2023, BNSS 2023, and IPC 1860. Understand English, Hindi, and Romanized Hinglish. Analyze: "${query}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: LEGAL_ADVISORY_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(2500),
        },
      });
      if (response.text) {
        return JSON.parse(response.text) as LegalAdvisoryResponse;
      }
    } catch {
      geminiCircuitOpenUntil = Date.now() + GEMINI_CIRCUIT_COOLDOWN_MS;
      break;
    }
  }
  return localResult.advisory;
}

/**
 * Synthesizes spoken reassurance audio via `gemini-3.8-flash-lite-tts` (`v1beta`),
 * falling back gracefully to browser-native `window.speechSynthesis`.
 */
export async function synthesizeSpeechWithGemini(text: string): Promise<{
  audioBase64?: string;
  mimeType?: string;
  useBrowserSpeechSynthesis?: boolean;
  text?: string;
}> {
  const ai = getGeminiClient('v1beta');
  if (!ai) {
    return { useBrowserSpeechSynthesis: true, text };
  }

  try {
    const response = await ai.models.generateContent({
      model: TTS_GEMINI_MODEL,
      contents: [
        {
          parts: [
            {
              text: `Read this legal reassurance message in a calm, warm, supportive Indian voice: ${text}`,
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
        abortSignal: AbortSignal.timeout(3000),
      },
    });

    const inlineAudio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (inlineAudio?.data) {
      return {
        audioBase64: inlineAudio.data,
        mimeType: inlineAudio.mimeType || 'audio/wav',
      };
    }
  } catch {
    geminiCircuitOpenUntil = Date.now() + GEMINI_CIRCUIT_COOLDOWN_MS;
  }

  return { useBrowserSpeechSynthesis: true, text };
}
