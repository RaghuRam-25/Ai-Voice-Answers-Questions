'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface VoiceVisualizerProps {
  isActive: boolean;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive }) => {
  // 13 bars — odd count so middle bar is truly centered
  const bars = Array.from({ length: 13 }, (_, i) => i);

  // Center bars are taller — creates a mountain silhouette
  const getBaseHeight = (i: number) => {
    const center = 6; // index of middle bar
    const dist = Math.abs(i - center);
    return Math.max(3, 14 - dist * 1.8);
  };

  const getPeakHeight = (i: number) => {
    const center = 6;
    const dist = Math.abs(i - center);
    return Math.max(6, 32 - dist * 2.2);
  };

  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height: '36px' }}>
      {bars.map((i) => {
        const base = getBaseHeight(i);
        const peak = getPeakHeight(i);

        return (
          <motion.div
            key={i}
            className="rounded-full gpu"
            style={{
              width: '2.5px',
              background: isActive
                ? `linear-gradient(to top, var(--primary), var(--secondary))`
                : 'var(--border-light)',
            }}
            initial={{ height: base }}
            animate={{
              height: isActive ? [base, peak, base] : [base * 0.6, base * 0.8, base * 0.6],
              opacity: isActive ? [0.5, 1, 0.5] : [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: isActive ? 0.7 + (i % 4) * 0.12 : 2.5,
              repeat: Infinity,
              repeatType: 'mirror',
              delay: Math.abs(i - 6) * 0.04 + (i % 3) * 0.03,
              ease: [0.4, 0, 0.6, 1],
            }}
          />
        );
      })}
    </div>
  );
};