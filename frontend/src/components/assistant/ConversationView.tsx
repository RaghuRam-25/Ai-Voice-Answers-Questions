'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types/assistant';
import { Bot, User, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ConversationViewProps {
  messages: Message[];
  currentTranscript?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  currentTranscript,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef(true);

  // Handle user manual scroll: if user scrolls up to read history, don't force auto-scroll down
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isAutoScrollEnabledRef.current = distanceFromBottom < 140;
  };

  // Scroll to bottom smoothly when a new message is appended or live transcript updates
  useEffect(() => {
    if (isAutoScrollEnabledRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, currentTranscript]);

  const isEmpty = messages.length === 0 && !currentTranscript;

  return (
    <div
      style={{
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="conversation-scroll-container"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '1.1rem 1.1rem 2rem 1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          scrollBehavior: 'smooth',
        }}
      >
        {/* Empty state */}
        {isEmpty && (
          <div
            style={{
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px',
              gap: '0.85rem',
              textAlign: 'center',
              padding: '2rem 1rem',
            }}
          >
            <div
              style={{
                width: '3.2rem',
                height: '3.2rem',
                borderRadius: '1rem',
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(124, 58, 237, 0.2))',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: '#93c5fd' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.92rem', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>
                {t.noMessages}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'rgba(148, 163, 184, 0.75)', marginTop: '0.25rem' }}>
                {t.noMessagesSub}
              </p>
            </div>
          </div>
        )}

        {/* Message history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex',
                  gap: '0.65rem',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                }}
              >
                {/* Assistant Avatar */}
                {msg.sender === 'assistant' && (
                  <div
                    style={{
                      flexShrink: 0,
                      width: '1.9rem',
                      height: '1.9rem',
                      borderRadius: '0.6rem',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'radial-gradient(circle at 34% 30%, #3b82f6 0%, #1d4ed8 55%, #6366f1 100%)',
                      border: '1px solid rgba(147, 197, 253, 0.5)',
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                      marginTop: '0.15rem',
                    }}
                  >
                    <Bot className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  style={
                    msg.sender === 'user'
                      ? {
                          maxWidth: '82%',
                          padding: '0.7rem 0.95rem',
                          fontSize: '0.875rem',
                          lineHeight: '1.45',
                          background: 'linear-gradient(135deg, #2563eb, #6366f1)',
                          color: '#ffffff',
                          borderRadius: '1.1rem 1.1rem 0.25rem 1.1rem',
                          boxShadow: '0 4px 18px -4px rgba(37, 99, 235, 0.55)',
                          wordBreak: 'break-word',
                        }
                      : {
                          maxWidth: '85%',
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          background: 'rgba(10, 24, 60, 0.65)',
                          color: '#f8fafc',
                          borderRadius: '1.1rem 1.1rem 1.1rem 0.25rem',
                          border: '1px solid rgba(77, 107, 198, 0.35)',
                          boxShadow: '0 4px 16px -6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                          wordBreak: 'break-word',
                        }
                  }
                >
                  <p style={{ margin: 0 }}>{msg.text}</p>

                  {/* Action execution status */}
                  {msg.actionExecuted && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        paddingTop: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.72rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        opacity: 0.85,
                      }}
                    >
                      {msg.actionExecuted.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>
                        {msg.actionExecuted.tool} — {msg.actionExecuted.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div
                    style={{
                      flexShrink: 0,
                      width: '1.9rem',
                      height: '1.9rem',
                      borderRadius: '0.6rem',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: '#cbd5e1',
                      marginTop: '0.15rem',
                    }}
                  >
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Live speech transcript */}
          {currentTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}
            >
              <div
                style={{
                  maxWidth: '82%',
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  background: 'rgba(37, 99, 235, 0.18)',
                  color: '#bfdbfe',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: '1.1rem 1.1rem 0.25rem 1.1rem',
                  boxShadow: '0 0 14px rgba(59, 130, 246, 0.2)',
                }}
              >
                {currentTranscript}…
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};