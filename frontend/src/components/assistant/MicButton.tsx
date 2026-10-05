'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AssistantStatusType } from '@/types/assistant';

interface MicButtonProps {
  status: AssistantStatusType;
  onClick: () => void;
  audioLevel?: number;
}

export const MicButton: React.FC<MicButtonProps> = ({ status, onClick, audioLevel = 0 }) => {
  const isProcessing = status === 'processing';
  const isListening = status === 'listening';
  const isResponding = status === 'responding' || status === 'speaking';
  const energy = Math.min(1, audioLevel * 2.2 + (isListening ? .16 : 0));
  const ringScale = 1 + energy * .16;

  return (
    <div className={`mic-control-shell mic-state-${status}`} style={{ '--mic-energy': energy } as React.CSSProperties}>
      <motion.span className="mic-orbit mic-orbit-one" animate={{ rotate: 360 }} transition={{ duration: isListening ? 4 : 9, repeat: Infinity, ease: 'linear' }} />
      <motion.span className="mic-orbit mic-orbit-two" animate={{ rotate: -360 }} transition={{ duration: isListening ? 5.5 : 12, repeat: Infinity, ease: 'linear' }} />
      <motion.span className="mic-orbit mic-orbit-three" animate={{ scale: [1, ringScale, 1], opacity: [0.35, .8, .35] }} transition={{ duration: isListening ? .9 : 2.5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.button
        onClick={onClick}
        disabled={isProcessing}
        whileHover={isProcessing ? {} : { scale: 1.07 }}
        whileTap={isProcessing ? {} : { scale: .9 }}
        className="mic-glass-button gpu"
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        <span className="mic-button-shine" />
        <span className="mic-button-ripple" />
        <span className="mic-button-icon">
          {isProcessing ? <Loader2 className="animate-spin" /> : isListening ? <MicOff /> : <Mic />}
        </span>
      </motion.button>
      {isResponding && <span className="mic-response-pulse" />}
    </div>
  );
};
