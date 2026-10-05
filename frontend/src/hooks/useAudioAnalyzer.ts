'use client';

import { useCallback, useEffect, useState } from 'react';
import { audioManager } from '@/lib/audioManager';

export interface AudioReactiveState {
  audioLevel: number;
  waveform: number[];
  isActive: boolean;
  startAudio: () => Promise<boolean>;
  stopAudio: () => void;
}

const EMPTY_WAVEFORM = Array.from({ length: 32 }, () => 0);

export function useAudioAnalyzer(): AudioReactiveState {
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveform, setWaveform] = useState(EMPTY_WAVEFORM);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const unsubscribe = audioManager.subscribeVisualizer((level, wave) => {
      setAudioLevel(level);
      setWaveform(wave);
      setIsActive(level > 0.02);
    });
    return unsubscribe;
  }, []);

  const startAudio = useCallback(async () => {
    const stream = await audioManager.initMicrophone();
    if (stream) {
      setIsActive(true);
      return true;
    }
    return false;
  }, []);

  const stopAudio = useCallback(() => {
    setAudioLevel(0);
    setWaveform(EMPTY_WAVEFORM);
    setIsActive(false);
  }, []);

  return { audioLevel, waveform, isActive, startAudio, stopAudio };
}
