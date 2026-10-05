'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAssistantStore } from '@/store/assistant.store';

interface SpeakOptions {
  label?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

const isMaleVoice = (v: SpeechSynthesisVoice): boolean => {
  const name = v.name.toLowerCase();
  return (
    name.includes('david') ||
    name.includes('mark') ||
    name.includes('george') ||
    name.includes('james') ||
    name.includes('richard') ||
    name.includes('guy') ||
    name.includes('ryan') ||
    name.includes('bashkar') ||
    name.includes('pradeep') ||
    (name.includes('male') && !name.includes('female'))
  );
};

const resolveFemaleVoice = (voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) return null;

  const isBangla = lang.startsWith('bn');

  if (isBangla) {
    // 1. Priority: Bangladeshi Female voice (e.g. Nabami, Google বাংলা (বাংলাদেশ), bn-BD female)
    const bangladeshiFemale = voices.find(
      (v) =>
        !isMaleVoice(v) &&
        (v.lang.toLowerCase().includes('bn-bd') || v.lang.toLowerCase().includes('bn_bd')) &&
        (v.name.toLowerCase().includes('nabami') ||
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('google') ||
          v.name.includes('বাংলা'))
    );
    if (bangladeshiFemale) return bangladeshiFemale;

    // 2. Any non-male bn-BD voice
    const anyBanglaBD = voices.find(
      (v) => !isMaleVoice(v) && (v.lang.toLowerCase().includes('bn-bd') || v.lang.toLowerCase().includes('bn_bd'))
    );
    if (anyBanglaBD) return anyBanglaBD;

    // 3. Any natural Bengali female voice (Google বাংলা, Tanishaa, etc.)
    const anyBanglaFemale = voices.find(
      (v) =>
        !isMaleVoice(v) &&
        (v.lang.startsWith('bn') ||
          v.name.toLowerCase().includes('bengali') ||
          v.name.toLowerCase().includes('bangla') ||
          v.name.includes('বাংলা')) &&
        (v.name.toLowerCase().includes('tanishaa') ||
          v.name.toLowerCase().includes('google') ||
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('natural'))
    );
    if (anyBanglaFemale) return anyBanglaFemale;

    // 4. Any general non-male Bengali voice
    const anyBangla = voices.find(
      (v) =>
        !isMaleVoice(v) &&
        (v.lang.startsWith('bn') ||
          v.name.toLowerCase().includes('bengali') ||
          v.name.includes('বাংলা'))
    );
    if (anyBangla) return anyBangla;
  } else {
    // English: Priority is natural South Asian female voice (closest to natural Bangladeshi woman speaking English)
    const southAsianFemale = voices.find(
      (v) =>
        !isMaleVoice(v) &&
        (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) &&
        (v.name.toLowerCase().includes('neerja') ||
          v.name.toLowerCase().includes('heera') ||
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('google'))
    );
    if (southAsianFemale) return southAsianFemale;

    // 2. High-quality natural female English voice (warm, friendly young adult)
    const naturalFemaleEnglish = voices.find(
      (v) =>
        !isMaleVoice(v) &&
        (v.lang.startsWith('en') || v.lang.includes('EN')) &&
        (v.name.toLowerCase().includes('jenny') ||
          v.name.toLowerCase().includes('aria') ||
          v.name.toLowerCase().includes('natasha') ||
          v.name.toLowerCase().includes('sonia') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('female') ||
          (v.name.toLowerCase().includes('google') && !isMaleVoice(v)))
    );
    if (naturalFemaleEnglish) return naturalFemaleEnglish;

    // 3. Any non-male English voice
    const anyFemaleEnglish = voices.find(
      (v) => !isMaleVoice(v) && (v.lang.startsWith('en') || v.lang.includes('EN'))
    );
    if (anyFemaleEnglish) return anyFemaleEnglish;
  }

  // Fallback: any voice that is not male
  return voices.find((v) => !isMaleVoice(v)) || voices[0] || null;
};

export const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateDebug = useAssistantStore((s) => s.updateDebug);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);

      // Pre-warm speech synthesis voices
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
      window.speechSynthesis.getVoices();
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      window.speechSynthesis.cancel();
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
      updateDebug({ tts: 'IDLE' });
    }
  }, [updateDebug]);

  const speak = useCallback(
    (text: string, onEndOrOptions?: (() => void) | SpeakOptions) => {
      const onEnd = typeof onEndOrOptions === 'function' ? onEndOrOptions : onEndOrOptions?.onEnd;
      const onStart = typeof onEndOrOptions === 'object' ? onEndOrOptions?.onStart : undefined;
      const onError = typeof onEndOrOptions === 'object' ? onEndOrOptions?.onError : undefined;
      const label = typeof onEndOrOptions === 'object' ? onEndOrOptions?.label : undefined;
      const lang = typeof onEndOrOptions === 'object' && onEndOrOptions?.lang ? onEndOrOptions.lang : 'en-US';
      const isBangla = lang.startsWith('bn');
      const rate = typeof onEndOrOptions === 'object' && onEndOrOptions?.rate ? onEndOrOptions.rate : isBangla ? 0.98 : 1.0;
      const pitch = typeof onEndOrOptions === 'object' && onEndOrOptions?.pitch ? onEndOrOptions.pitch : isBangla ? 1.10 : 1.08;

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('[TTS] SpeechSynthesis not supported in this browser.');
        onEnd?.();
        return;
      }

      // 1. Clean formatted text
      const cleanText = text
        .replace(/[*_~`#\[\]\(\)]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (!cleanText) {
        onEnd?.();
        return;
      }

      console.log(`[TTS] Started (${lang}): "${cleanText.slice(0, 35)}..."`);
      updateDebug({ tts: 'PLAYING', lastLog: `TTS (${lang}): ${cleanText.slice(0, 32)}...` });

      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      window.speechSynthesis.cancel();

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // 2. Split text into sensible chunks (sentences)
      const chunks = cleanText.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [cleanText];
      const validChunks = chunks.map((c) => c.trim()).filter(Boolean);

      if (validChunks.length === 0) {
        onEnd?.();
        return;
      }

      let currentChunkIndex = 0;
      let hasEnded = false;

      const handleEnd = () => {
        if (hasEnded) return;
        hasEnded = true;
        console.log('[TTS] Finished full text');
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
        updateDebug({ tts: 'IDLE' });
        onEnd?.();
      };

      const speakNextChunk = () => {
        if (currentChunkIndex >= validChunks.length) {
          handleEnd();
          return;
        }

        const chunkText = validChunks[currentChunkIndex];
        console.log(`[TTS] Speaking chunk ${currentChunkIndex + 1}/${validChunks.length}: "${chunkText}"`);

        try {
          const utterance = new SpeechSynthesisUtterance(chunkText);
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.lang = lang;

          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = resolveFemaleVoice(voices, lang);

          if (femaleVoice) {
            utterance.voice = femaleVoice;
            console.log(`[TTS] Selected Female Voice: ${femaleVoice.name} (${femaleVoice.lang})`);
          }

          utterance.onstart = () => {
            if (currentChunkIndex === 0) {
              setIsSpeaking(true);
              onStart?.();
            }
          };

          utterance.onend = () => {
            currentChunkIndex++;
            speakNextChunk();
          };

          utterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
              console.warn('[TTS] Synthesis error on chunk:', e);
              onError?.(e);
            }
            handleEnd();
          };

          activeUtteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error('[TTS] Speak failed on chunk:', err);
          setIsSpeaking(false);
          onError?.(err);
          handleEnd();
        }
      };

      // Start speaking the first chunk
      speakNextChunk();
    },
    [updateDebug]
  );

  return { isSpeaking, supported, speak, stop };
};