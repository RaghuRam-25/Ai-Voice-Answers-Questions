'use client';

import React from 'react';
import { useAssistantStore } from '@/store/assistant.store';
import { Activity, Volume2, Mic, Cpu, Zap, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface DebugPanelProps {
  onSimulateClap?: () => void;
  onSimulateDoubleClap?: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ onSimulateDoubleClap }) => {
  const { debug, showDebugPanel, toggleDebugPanel } = useAssistantStore();
  const { t } = useTranslation();

  if (!showDebugPanel) {
    return (
      <button
        onClick={toggleDebugPanel}
        aria-label="Toggle Live Debug Status"
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 9999,
          background: 'rgba(8, 16, 40, 0.85)',
          border: '1px solid rgba(80, 150, 255, 0.4)',
          borderRadius: '999px',
          padding: '0.4rem 0.8rem',
          color: '#93c5fd',
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          cursor: 'pointer',
        }}
      >
        <Activity size={13} className="text-cyan-400 animate-pulse" />
        <span>{t.liveDiagnostics}</span>
      </button>
    );
  }

  const badgeColor = (val: string) => {
    if (val === 'CONNECTED' || val === 'ACTIVE' || val === 'DETECTED' || val === 'ACTIVATED' || val === 'RECEIVED' || val === 'PLAYING' || val === 'FOREGROUNDED') {
      return { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399' };
    }
    if (val === 'PENDING' || val === 'WAITING' || val === 'SENT' || val === 'LISTENING') {
      return { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24' };
    }
    if (val === 'FAILED') {
      return { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171' };
    }
    return { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)', text: '#94a3b8' };
  };

  const rows = [
    { label: t.microphone, val: debug.microphone, icon: Mic },
    { label: t.clapDetector, val: debug.clapDetector, icon: Activity },
    { label: t.firstClap, val: debug.firstClap, icon: Zap },
    { label: t.secondClap, val: debug.secondClap, icon: Zap },
    { label: t.doubleClap, val: debug.doubleClap, icon: Zap },
    { label: t.assistantWindow, val: debug.assistantWindow, icon: Cpu },
    { label: t.tts, val: debug.tts, icon: Volume2 },
    { label: t.speechRecognition, val: debug.speechRecognition, icon: Mic },
    { label: t.aiRequest, val: debug.aiRequest, icon: Cpu },
    { label: t.conversation, val: debug.conversation, icon: Activity },
  ];

  return (
    <aside
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        width: '19.5rem',
        background: 'rgba(5, 12, 32, 0.94)',
        border: '1px solid rgba(80, 160, 255, 0.45)',
        borderRadius: '1rem',
        padding: '0.85rem 1rem',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75), 0 0 24px rgba(45, 120, 255, 0.25)',
        backdropFilter: 'blur(16px)',
        color: '#e2e8f0',
        fontSize: '0.74rem',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#67e8f9' }}>
          <Activity size={14} />
          <span>{t.systemDiagnostics}</span>
        </div>
        <button onClick={toggleDebugPanel} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>
        {rows.map(({ label, val, icon: Icon }) => {
          const style = badgeColor(val);
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(203, 213, 225, 0.85)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Icon size={12} style={{ opacity: 0.7 }} />
                {label}:
              </span>
              <span
                style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  color: style.text,
                  padding: '0.12rem 0.45rem',
                  borderRadius: '0.35rem',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {val}
              </span>
            </div>
          );
        })}
      </div>

      {onSimulateDoubleClap && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={onSimulateDoubleClap}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(124, 58, 237, 0.7))',
              border: '1px solid rgba(147, 197, 253, 0.4)',
              borderRadius: '0.45rem',
              color: '#fff',
              padding: '0.35rem 0.5rem',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {t.testDoubleClap}
          </button>
        </div>
      )}
    </aside>
  );
};
