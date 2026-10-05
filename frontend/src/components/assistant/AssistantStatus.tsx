'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssistantStatusType } from '@/types/assistant';

interface AssistantStatusProps {
  status: AssistantStatusType;
}

const STATUS_CONFIG: Record<AssistantStatusType, { label: string; dot: string; bg: string; pulse: boolean }> = {
  idle: { label: 'Ready', dot: 'hsl(152,58%,48%)', bg: 'hsla(152,58%,48%,0.08)', pulse: false },
  activating: { label: 'Activating', dot: 'hsl(280,85%,65%)', bg: 'hsla(280,85%,65%,0.12)', pulse: true },
  listening: { label: 'Listening', dot: 'hsl(350,82%,60%)', bg: 'hsla(350,82%,60%,0.10)', pulse: true },
  processing: { label: 'Processing', dot: 'hsl(38,90%,56%)', bg: 'hsla(38,90%,56%,0.08)', pulse: true },
  responding: { label: 'Responding', dot: 'hsl(190,78%,52%)', bg: 'hsla(190,78%,52%,0.08)', pulse: true },
  speaking: { label: 'Responding', dot: 'hsl(190,78%,52%)', bg: 'hsla(190,78%,52%,0.08)', pulse: true },
  error: { label: 'Error', dot: 'hsl(0,70%,56%)', bg: 'hsla(0,70%,56%,0.08)', pulse: false },
};

export const AssistantStatus: React.FC<AssistantStatusProps> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium"
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.dot}22`,
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="relative flex items-center justify-center w-1.5 h-1.5">
          {cfg.pulse && (
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: cfg.dot }}
              animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <span className="w-1.5 h-1.5 rounded-full block" style={{ background: cfg.dot }} />
        </span>
        <span>{cfg.label}</span>
      </motion.div>
    </AnimatePresence>
  );
};