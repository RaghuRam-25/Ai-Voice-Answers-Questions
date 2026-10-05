'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ClapDetectorSettings } from '@/types/assistant';
import { audioManager } from '@/lib/audioManager';

interface ClapDetectionCallbackResult {
  confidence: number;
  gapMs: number;
  timestamp: number;
}

interface UseClapDetectorOptions {
  enabled?: boolean;
  settings?: Partial<ClapDetectorSettings>;
  onDoubleClap?: (result: ClapDetectionCallbackResult) => void;
  onClapDetected?: (count: number) => void;
}

export function useClapDetector({
  enabled = true,
  onDoubleClap,
}: UseClapDetectorOptions = {}) {
  const onDoubleClapRef = useRef(onDoubleClap);
  onDoubleClapRef.current = onDoubleClap;

  useEffect(() => {
    if (!enabled) {
      audioManager.setOnDoubleClap(null);
      return;
    }

    audioManager.setOnDoubleClap((res) => {
      onDoubleClapRef.current?.(res);
    });

    return () => {
      audioManager.setOnDoubleClap(null);
    };
  }, [enabled]);

  const startClapDetection = useCallback(async () => {
    const stream = await audioManager.initMicrophone();
    return Boolean(stream);
  }, []);

  const triggerSimulatedDoubleClap = useCallback(() => {
    audioManager.triggerSimulatedDoubleClap();
  }, []);

  return {
    isListeningForClaps: audioManager.isMicActive(),
    startClapDetection,
    triggerSimulatedDoubleClap,
  };
}
