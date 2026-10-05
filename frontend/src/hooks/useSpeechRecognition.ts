'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAssistantStore } from '@/store/assistant.store';

interface UseSpeechRecognitionOptions {
  onResult?: (finalText: string) => void;
  onInterim?: (interimText: string) => void;
  onSpeechStart?: () => void;
  continuous?: boolean;
  language?: string;
}

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  hasSupport: boolean;
  isPermissionDenied: boolean;
}

export const useSpeechRecognition = (
  options?: UseSpeechRecognitionOptions | ((text: string) => void)
): SpeechRecognitionHook => {
  const onResultCallback = typeof options === 'function' ? options : options?.onResult;
  const onInterimCallback = typeof options === 'object' ? options?.onInterim : undefined;
  const onSpeechStartCallback = typeof options === 'object' ? options?.onSpeechStart : undefined;
  const continuous = typeof options === 'object' ? options?.continuous ?? true : true;
  const language = typeof options === 'object' ? options?.language ?? 'en-US' : 'en-US';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const updateDebug = useAssistantStore((s) => s.updateDebug);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const shouldBeListeningRef = useRef(false);
  const submittedTurnRef = useRef(false);
  const latestTranscriptRef = useRef('');

  const onResultRef = useRef(onResultCallback);
  const onInterimRef = useRef(onInterimCallback);
  const onSpeechStartRef = useRef(onSpeechStartCallback);
  onResultRef.current = onResultCallback;
  onInterimRef.current = onInterimCallback;
  onSpeechStartRef.current = onSpeechStartCallback;

  // 1. Initialize SpeechRecognition instance once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      setHasSupport(true);
      const instance = new SpeechRecognitionClass();
      instance.continuous = continuous;
      instance.interimResults = true;
      instance.lang = language;
      instance.maxAlternatives = 1;

      instance.onspeechstart = () => {
        console.log('[VOICE] User started speaking');
        updateDebug({ speechRecognition: 'LISTENING', lastLog: `Speech started (${instance.lang})` });
        onSpeechStartRef.current?.();
      };

      instance.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalText += text + ' ';
          } else {
            interimText += text + ' ';
          }
        }

        const combined = (finalText + interimText).trim();
        if (combined) {
          latestTranscriptRef.current = combined;
          setTranscript(combined);
          console.log(`[STT] Transcript: "${combined}"`);
        }

        if (interimText) {
          onInterimRef.current?.(interimText.trim());
        }

        const trimmedFinal = finalText.trim();
        if (trimmedFinal && !submittedTurnRef.current) {
          submittedTurnRef.current = true;
          console.log(`[STT] Final transcript: "${trimmedFinal}"`);
          updateDebug({
            speechRecognition: 'ACTIVE',
            lastLog: `STT: "${trimmedFinal.slice(0, 30)}"`,
          });
          if (onResultRef.current) {
            onResultRef.current(trimmedFinal);
          }
        }
      };

      instance.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setIsPermissionDenied(true);
          updateDebug({ microphone: 'FAILED', lastLog: 'Microphone permission denied' });
        }
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[STT] Speech recognition error:', event.error);
        }
      };

      instance.onspeechend = () => {
        // When speech ends, if we have a non-empty transcript that wasn't submitted yet, submit it
        const pending = latestTranscriptRef.current.trim();
        if (pending && !submittedTurnRef.current) {
          submittedTurnRef.current = true;
          console.log(`[STT] Final transcript: "${pending}"`);
          if (onResultRef.current) {
            onResultRef.current(pending);
          }
        }
      };

      instance.onend = () => {
        // Fallback on end to guarantee pending speech is processed
        const pending = latestTranscriptRef.current.trim();
        if (pending && !submittedTurnRef.current) {
          submittedTurnRef.current = true;
          console.log(`[STT] Final transcript: "${pending}"`);
          if (onResultRef.current) {
            onResultRef.current(pending);
          }
        }

        isListeningRef.current = false;
        setIsListening(false);
        if (shouldBeListeningRef.current && !submittedTurnRef.current) {
          try {
            instance.start();
            isListeningRef.current = true;
            setIsListening(true);
            updateDebug({ speechRecognition: 'ACTIVE' });
          } catch {
            // will restart on next trigger
          }
        } else {
          updateDebug({ speechRecognition: 'INACTIVE' });
        }
      };

      recognitionRef.current = instance;
      console.log('[VOICE] STT ready');
    }
  }, [continuous, updateDebug]);

  // 2. Dynamically update language on existing instance
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const startListening = useCallback(() => {
    shouldBeListeningRef.current = true;
    submittedTurnRef.current = false;
    latestTranscriptRef.current = '';
    console.log(`[STT] Locale: ${language}`);
    console.log(`[VOICE] LISTENING (${language})`);
    updateDebug({ speechRecognition: 'ACTIVE', lastLog: `Listening (${language})` });
    if (recognitionRef.current && !isListeningRef.current) {
      setTranscript('');
      try {
        recognitionRef.current.start();
        isListeningRef.current = true;
        setIsListening(true);
      } catch (err: any) {
        if (err?.name === 'InvalidStateError') {
          isListeningRef.current = true;
          setIsListening(true);
        } else {
          console.warn('[STT] Could not start speech recognition:', err);
        }
      }
    }
  }, [language, updateDebug]);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    updateDebug({ speechRecognition: 'INACTIVE' });
  }, [updateDebug]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasSupport,
    isPermissionDenied,
  };
};