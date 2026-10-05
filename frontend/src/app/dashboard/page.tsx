'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Globe2, MessageSquare, Mic, Radio, Sparkles, Wifi, Settings2, X, Globe, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { AssistantOrb } from '@/components/assistant/AssistantOrb';
import { ConversationView } from '@/components/assistant/ConversationView';
import { MicButton } from '@/components/assistant/MicButton';
import { DebugPanel } from '@/components/assistant/DebugPanel';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useClapDetector } from '@/hooks/useClapDetector';
import { assistantService } from '@/services/assistant.service';
import { settingsService } from '@/services/settings.service';
import { useAssistantStore } from '@/store/assistant.store';
import { useTranslation, SupportedLanguage } from '@/lib/i18n';
import { getSocket } from '@/lib/socket';

const STATES = [
  { label: 'Listening', icon: Mic },
  { label: 'Processing', icon: Brain },
  { label: 'Responding', icon: MessageSquare },
] as const;

export default function DashboardPage() {
  const { status, messages, currentTranscript, debug, setStatus, setTranscript, addMessage, updateDebug } = useAssistantStore();
  const { language, setLanguage, isBangla, sttLang, ttsLang, t } = useTranslation();
  const { speak, stop: stopTts, isSpeaking, supported: hasTts } = useSpeechSynthesis();
  const { audioLevel, waveform, startAudio, stopAudio } = useAudioAnalyzer();

  const [timeText, setTimeText] = useState('');
  const [dateText, setDateText] = useState('');
  const [internetConnected, setInternetConnected] = useState(true);
  const [microphoneState, setMicrophoneState] = useState<'Active' | 'Inactive'>('Inactive');
  const [engineState, setEngineState] = useState<'Ready' | 'Processing' | 'Offline'>('Ready');
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsModalView, setSettingsModalView] = useState<'main' | 'language'>('main');

  // Persistent show/hide state for conversation panel (User controlled only)
  const [showChat, setShowChatState] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('show_conversation_panel');
        if (saved !== null) {
          setShowChatState(saved === 'true');
        }
      } catch {}
    }
  }, []);

  const setShowChat = useCallback((valueOrFn: boolean | ((prev: boolean) => boolean)) => {
    setShowChatState((prev) => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('show_conversation_panel', String(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const isActivatingRef = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  // Track initial UI render timestamp
  useEffect(() => {
    console.log('[BOOT] UI rendered');
    // Background voice system pre-warm
    const initVoiceInBackground = async () => {
      console.log('[VOICE] Background initialization started');
      try {
        const socket = getSocket();
        if (socket.connected) {
          console.log('[VOICE] Backend connected');
        } else {
          socket.once('connect', () => console.log('[VOICE] Backend connected'));
        }
      } catch {}
      console.log('[VOICE] Voice system ready');
    };
    void initVoiceInBackground();
  }, []);

  const welcomeSpokenRef = useRef(false);

  // 1. One-time welcome message on session start
  const playOneTimeWelcome = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (welcomeSpokenRef.current) return;
    if (sessionStorage.getItem('session_welcome_spoken') === 'true') {
      welcomeSpokenRef.current = true;
      return;
    }

    welcomeSpokenRef.current = true;
    sessionStorage.setItem('session_welcome_spoken', 'true');

    const welcomePhrase = isBangla
      ? 'স্বাগতম। আমি কীভাবে আপনাকে সাহায্য করতে পারি?'
      : 'Welcome. How can I help you?';

    console.log('[STATE] RESPONDING');
    console.log(`[TTS] Speaking... "${welcomePhrase}"`);
    setStatus('responding');

    speak(welcomePhrase, {
      lang: ttsLang,
      onEnd: () => {
        console.log('[TTS] Finished');
        console.log('[STATE] IDLE');
        setStatus('idle');
      },
      onError: () => {
        console.log('[TTS] Finished');
        console.log('[STATE] IDLE');
        setStatus('idle');
      },
    });
  }, [isBangla, speak, setStatus, ttsLang]);

  // Trigger one-time welcome immediately when voice/TTS is ready
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('session_welcome_spoken') !== 'true') {
      const timer = setTimeout(() => {
        playOneTimeWelcome();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [playOneTimeWelcome]);

  // 2. Core turn execution with language-aware AI generation & real asynchronous PROCESSING
  const handleAssistantTurn = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      console.log(`[STT] Final transcript: "${trimmed}"`);

      // Handle exit phrases in both Bengali & English
      const isExit = isBangla
        ? /^(বিদায়|খোদা হাফেজ|বন্ধ করো|থেমে যাও|stop|goodbye|bye|cancel|quit|exit|dismiss)\b/i.test(trimmed)
        : /^(goodbye|bye|stop|cancel|quit|exit|dismiss|shut down|close)\b/i.test(trimmed);

      if (isExit) {
        addMessage({ id: `user-${Date.now()}`, sender: 'user', text: trimmed, timestamp: new Date().toISOString() });
        const farewell = isBangla
          ? 'খোদা হাফেজ! প্রয়োজনে আমাকে আবার ডাকবেন।'
          : 'Goodbye! Feel free to tap the mic whenever you need me.';
        addMessage({ id: `assistant-${Date.now()}`, sender: 'assistant', text: farewell, timestamp: new Date().toISOString() });
        setStatus('responding');
        console.log('[STATE] RESPONDING');
        console.log(`[TTS] Speaking... "${farewell}"`);
        speak(farewell, {
          lang: ttsLang,
          onEnd: () => {
            console.log('[TTS] Finished');
            console.log('[STATE] IDLE');
            setStatus('idle');
            setMicrophoneState('Inactive');
            stopAudio();
            updateDebug({ conversation: 'IDLE' });
          },
          onError: () => {
            console.log('[TTS] Finished');
            console.log('[STATE] IDLE');
            setStatus('idle');
            setMicrophoneState('Inactive');
            stopAudio();
          },
        });
        return;
      }

      console.log(`[LANGUAGE] Selected: ${language}`);
      console.log(`[STT] Locale: ${sttLang}`);
      console.log(`[STT] Final transcript: "${trimmed}"`);

      addMessage({ id: `user-${Date.now()}`, sender: 'user', text: trimmed, timestamp: new Date().toISOString() });
      setStatus('processing');
      console.log('[STATE] PROCESSING');
      setTranscript('');

      console.log(`[AI] Provider: Google Gemini`);
      console.log(`[AI] Request started`);
      updateDebug({ aiRequest: 'SENT', lastLog: `AI generating (${sttLang}): "${trimmed.slice(0, 25)}"` });

      try {
        const turn = await assistantService.sendMessage(trimmed, language);
        const assistantText =
          turn.assistantMessage?.text ||
          (isBangla ? 'আমি আপনাকে সাহায্য করতে প্রস্তুত আছি।' : 'I am here to help you.');

        console.log(`[AI] Response received`);
        console.log(`[AI] Response text: "${assistantText}"`);
        console.log(`[AI] Response length: ${assistantText.length}`);
        updateDebug({ aiRequest: 'RECEIVED', lastLog: `AI reply: "${assistantText.slice(0, 25)}"` });

        addMessage({
          id: turn.assistantMessage?.id ?? `assistant-${Date.now()}`,
          sender: 'assistant',
          text: assistantText,
          timestamp: turn.assistantMessage?.createdAt ?? new Date().toISOString(),
          
        });

        setStatus('responding');
        console.log('[STATE] RESPONDING');
        console.log(`[TTS] Locale: ${ttsLang}`);
        if (language === 'bn') {
          console.log('[TTS] Speaking Bengali response');
        }
        console.log(`[TTS] Speaking... "${assistantText}"`);

        if (hasTts) {
          speak(assistantText, {
            lang: ttsLang,
            onEnd: () => {
              console.log('[TTS] Finished');
              console.log('[STATE] IDLE');
              setStatus('idle');
              setMicrophoneState('Inactive');
            },
            onError: () => {
              console.log('[TTS] Finished');
              console.log('[STATE] IDLE');
              setStatus('idle');
              setMicrophoneState('Inactive');
            },
          });
        } else {
          window.setTimeout(() => {
            console.log('[TTS] Finished');
            console.log('[STATE] IDLE');
            setStatus('idle');
            setMicrophoneState('Inactive');
          }, 1500);
        }
      } catch (err) {
        console.error('[AI ERROR] Request failed:', err);
        updateDebug({ aiRequest: 'FAILED', lastLog: 'AI request failed' });
        const errorText = isBangla
          ? 'দুঃখিত, এই মুহূর্তে উত্তর দিতে সমস্যা হচ্ছে। অনুগ্রহ করে আবার বলুন।'
          : 'Sorry, I had trouble processing that. Please try again.';
        addMessage({
          id: `assistant-error-${Date.now()}`,
          sender: 'assistant',
          text: errorText,
          timestamp: new Date().toISOString(),
        });
        setStatus('error');
        window.setTimeout(() => {
          console.log('[STATE] IDLE');
          setStatus('idle');
          setMicrophoneState('Inactive');
        }, 2000);
      }
    },
    [addMessage, hasTts, isBangla, language, setStatus, setTranscript, speak, startAudio, stopAudio, sttLang, ttsLang, updateDebug]
  );

  // 3. Speech recognition configured dynamically for sttLang with barge-in support
  const { transcript, startListening, stopListening, hasSupport, isPermissionDenied } = useSpeechRecognition({
    language: sttLang,
    continuous: false,
    onResult: (finalText) => {
      stopListening();
      void handleAssistantTurn(finalText);
    },
    onSpeechStart: () => {
      // Barge-in: cancel TTS immediately when user speaks
      if (statusRef.current === 'responding' || statusRef.current === 'speaking' || isActivatingRef.current) {
        console.log('[INTERRUPT] User barge-in detected');
        stopTts();
        isActivatingRef.current = false;
        const socket = getSocket();
        socket.emit('assistant:interrupt');
        setStatus('listening');
        console.log('[VOICE] LISTENING');
      }
    },
  });

  // 4. Activate direct listening
  const activateListening = useCallback(async () => {
    stopTts();
    setStatus('listening');
    console.log('[VOICE] LISTENING');
    setMicrophoneState('Active');
    await startAudio();
    startListening();
  }, [startAudio, startListening, stopTts, setStatus]);

  // 5. Double-Clap Detection Hook
  const { startClapDetection, triggerSimulatedDoubleClap } = useClapDetector({
    enabled: true,
    onDoubleClap: (result) => {
      const socket = getSocket();
      socket.emit('assistant:clap-event', {
        timestamp: result.timestamp,
        confidence: result.confidence,
        gapMs: result.gapMs,
      });
      void activateListening();
    },
  });

  const enableHandsFreeAudio = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('session_welcome_spoken') !== 'true') {
        playOneTimeWelcome();
      }
      const started = await startClapDetection();
      if (started) {
        setMicPermissionGranted(true);
        setMicrophoneState('Active');
        updateDebug({ microphone: 'CONNECTED', clapDetector: 'ACTIVE', lastLog: `Microphone enabled (${sttLang})` });
      }
    } catch (err) {
      console.warn('Microphone permission request:', err);
    }
  }, [playOneTimeWelcome, startClapDetection, sttLang, updateDebug]);

  // 6. Socket.io Events Listener
  useEffect(() => {
    const socket = getSocket();

    socket.on('assistant:activated', () => {
      void activateListening();
    });

    socket.on('assistant:interrupted', () => {
      stopTts();
      isActivatingRef.current = false;
      setStatus('listening');
      console.log('[VOICE] LISTENING');
      void startAudio();
      startListening();
    });

    return () => {
      socket.off('assistant:activated');
      socket.off('assistant:interrupted');
    };
  }, [activateListening, startAudio, startListening, stopTts, setStatus]);

  // 6. Clock and Network status
  useEffect(() => {
    const syncClock = () => {
      const now = new Date();
      setTimeText(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateText(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    syncClock();
    const interval = window.setInterval(syncClock, 30000);
    const updateNetwork = () => setInternetConnected(navigator.onLine);
    updateNetwork();
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  useEffect(() => setTranscript(transcript), [transcript, setTranscript]);

  useEffect(() => {
    if (status === 'processing') setEngineState('Processing');
    else if (status === 'error') setEngineState('Offline');
    else setEngineState('Ready');
  }, [status]);

  useEffect(() => {
    const load = async () => {
      try {
        const health = await assistantService.getStatus();
        if (health.status === 'degraded') setEngineState('Offline');
      } catch {
        setEngineState('Offline');
      }
    };
    void load();
  }, []);

  // 7. Manual Mic Toggle
  const handleMicToggle = async () => {
    if (isSpeaking || status === 'responding' || status === 'speaking') {
      stopTts();
      isActivatingRef.current = false;
      setStatus('listening');
      console.log('[VOICE] LISTENING');
      setMicrophoneState('Active');
      void startAudio();
      startListening();
      return;
    }

    if (status === 'listening') {
      stopListening();
      stopAudio();
      setStatus('idle');
      console.log('[STATE] IDLE');
      setMicrophoneState('Inactive');
      return;
    }

    if (!hasSupport || isPermissionDenied) {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 1800);
      return;
    }

    try {
      const audioStarted = await startAudio();
      if (!audioStarted) throw new Error('Audio analyser unavailable');
      setMicrophoneState('Active');
      setStatus('listening');
      console.log('[VOICE] LISTENING');
      startListening();
    } catch {
      stopAudio();
      setStatus('error');
      setMicrophoneState('Inactive');
      window.setTimeout(() => setStatus('idle'), 1800);
    }
  };

  const cardCopy = useMemo(() => {
    if (status === 'activating') return t.cardActivating;
    if (status === 'listening') return t.cardListening;
    if (status === 'processing') return t.cardProcessing;
    if (status === 'responding' || status === 'speaking') return t.cardResponding;
    return t.cardIdle;
  }, [status, t]);

  const activeVisual = status === 'listening' || status === 'processing' || status === 'responding' || status === 'speaking' || status === 'activating';

  const handleLanguageSelect = (newLang: SupportedLanguage) => {
    console.log(`[LANGUAGE] Selected: ${newLang}`);
    setLanguage(newLang);
    settingsService.updateSettings({
      language: newLang === 'bn' ? 'bn-BD' : 'en-US',
    }).catch(() => {});
  };

  return (
    <div className="reference-dashboard" onClick={!micPermissionGranted ? enableHandsFreeAudio : undefined}>
      <div className="reference-ambient reference-ambient-top" />
      <div className="reference-ambient reference-ambient-bottom" />
      <header className="reference-header">
        <div className="reference-brand-block">
          <div className="reference-logo" aria-hidden="true"><Radio size={22} /></div>
          <div>
            <div className="reference-brand-name">{t.brandName}</div>
            <div className="reference-tagline">
              {t.tagline.includes('•') ? (
                <>
                  {t.tagline.split('•')[0]}
                  <span>•</span>
                  {t.tagline.split('•')[1]}
                </>
              ) : (
                t.tagline
              )}
            </div>
          </div>
        </div>
        <div className="reference-top-meta">
          {/* Conversation Show/Hide Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowChat((prev) => !prev);
            }}
            title={showChat ? t.hideChat : t.showChat}
            aria-label={showChat ? t.hideChat : t.showChat}
            suppressHydrationWarning
            style={{
              background: showChat ? 'var(--primary-muted, rgba(80,120,255,0.18))' : 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-light, rgba(255,255,255,0.12))',
              borderRadius: '999px',
              padding: '0.35rem 0.75rem',
              color: showChat ? 'var(--primary-light, #93c5fd)' : 'var(--text-muted, #94a3b8)',
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <MessageSquare size={14} />
            <span suppressHydrationWarning>{showChat ? t.hideChat : t.showChat}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSettingsModalView('main');
              setShowSettingsModal(true);
            }}
            title={t.settings}
            aria-label={t.settings}
            style={{
              background: showSettingsModal ? 'var(--primary-muted, rgba(80,120,255,0.18))' : 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-light, rgba(255,255,255,0.12))',
              borderRadius: '999px',
              padding: '0.35rem 0.75rem',
              color: showSettingsModal ? 'var(--primary-light, #93c5fd)' : 'var(--text-muted, #94a3b8)',
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Settings2 size={14} />
            <span>{t.settings}</span>
          </button>

          <div className="reference-online"><span />{internetConnected ? t.online : t.offline}</div>
          <Wifi className="reference-wifi" size={22} />
          <span suppressHydrationWarning>{timeText}</span>
          <span suppressHydrationWarning>{dateText}</span>
        </div>
      </header>

      <main className="reference-main">
        <section className="reference-intro">
          <div className="reference-intro-icon"><span /><span /><span /><span /><span /></div>
          <h1>{t.welcome}</h1>
          <p>{t.welcomeSub}</p>
        </section>

        <section className="reference-orb-stage">
          <AssistantOrb status={status === 'speaking' ? 'responding' : status === 'activating' ? 'listening' : status} audioLevel={audioLevel} waveform={waveform} />
          <div className="reference-orb-spark reference-spark-left" />
          <div className="reference-orb-spark reference-spark-right" />
        </section>

        <div className="reference-state-row" aria-live="polite">
          {STATES.map(({ label, icon: Icon }) => {
            const active =
              (label === 'Listening' && (status === 'listening' || status === 'activating')) ||
              (label === 'Processing' && status === 'processing') ||
              (label === 'Responding' && (status === 'responding' || status === 'speaking'));
            const localizedLabel = label === 'Listening' ? t.listening : label === 'Processing' ? t.processing : t.responding;
            return (
              <div key={label} className={`reference-state ${active ? 'is-active' : ''}`}>
                <span className="reference-state-icon"><Icon size={18} /></span>
                <span>{localizedLabel}</span>
              </div>
            );
          })}
        </div>

        <div className="reference-mic-area">
          <MicButton status={status === 'speaking' ? 'responding' : status === 'activating' ? 'listening' : status} onClick={handleMicToggle} audioLevel={audioLevel} />
          <p>{status === 'listening' ? t.listeningState : status === 'responding' || status === 'speaking' ? t.speakingState : t.tapToSpeak}</p>
        </div>

        <div className="reference-waveform" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
            <span key={bar} className={activeVisual ? 'is-active' : ''} style={{ ['--bar-delay' as string]: `${bar * 90}ms` }} />
          ))}
        </div>
      </main>

      <aside className="reference-listening-card">
        <div className="reference-card-icon"><Radio size={22} /></div>
        <div>
          <strong>{status === 'listening' ? t.listeningCardTitleListening : t.listeningCardTitleDefault}</strong>
          <p>{cardCopy}</p>
        </div>
      </aside>

      <aside className="reference-system-card">
        <div className="reference-system-title"><span />{t.systemStatus}</div>
        <div className="reference-system-grid">
          <div><Mic size={22} /><span>{t.microphone}<strong>{debug.microphone === 'CONNECTED' ? t.active : debug.microphone === 'FAILED' ? t.denied : microphoneState === 'Active' ? t.active : t.inactive}</strong></span></div>
          <div><Globe2 size={22} /><span>{t.internet}<strong>{internetConnected ? t.connected : t.disconnected}</strong></span></div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSettingsModalView('language');
              setShowSettingsModal(true);
            }}
            style={{ cursor: 'pointer' }}
            title={t.language}
          >
            <Settings2 size={22} />
            <span>{t.language}<strong suppressHydrationWarning>{language === 'bn' ? 'বাংলা' : 'English'}</strong></span>
          </div>
        </div>
      </aside>

      {/* Conversation History Sidebar */}
      <AnimatePresence>
        {showChat && (
          <motion.aside
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="reference-chat-panel"
          >
            {/* Fixed Sidebar Header */}
            <div className="chat-panel-header">
              <div className="chat-panel-title">
                <div className="chat-panel-icon">
                  <MessageSquare size={15} />
                </div>
                <div>
                  <span className="chat-panel-heading">{t.conversationTitle}</span>
                  <span className="chat-panel-count">
                    {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                  </span>
                </div>
              </div>

              <div className="chat-panel-actions">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChat(false);
                  }}
                  aria-label={t.hideChat}
                  title={t.hideChat}
                  className="chat-panel-close-btn"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Scrollable Conversation History Body */}
            <div className="chat-panel-body">
              <ConversationView messages={messages} currentTranscript={currentTranscript} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Settings Modal with Dedicated Language View Panel */}
      <AnimatePresence>
        {showSettingsModal && (
          <div
            className="settings-modal-backdrop"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="settings-panel"
            >
              <AnimatePresence mode="wait">
                {settingsModalView === 'main' ? (
                  <motion.div
                    key="modal-main"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Settings Header */}
                    <div className="settings-header">
                      <div className="settings-header-title">
                        <div className="settings-header-icon">
                          <Settings2 size={15} />
                        </div>
                        <span>{t.settings}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(false)}
                        className="settings-close-btn"
                        aria-label={t.done}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* ONLY Language setting row */}
                    <div style={{ marginBottom: '1.2rem' }}>
                      <button
                        type="button"
                        onClick={() => setSettingsModalView('language')}
                        className="settings-item-row"
                      >
                        <div className="settings-item-left">
                          <div className="settings-item-icon">
                            <Globe size={16} />
                          </div>
                          <div>
                            <div className="settings-item-label">{t.language}</div>
                            <div className="settings-item-desc" suppressHydrationWarning>
                              {language === 'bn' ? t.banglaDesc : t.englishDesc}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span className="settings-item-badge" suppressHydrationWarning>
                            {language === 'bn' ? 'বাংলা' : 'English'}
                          </span>
                          <ChevronRight size={15} style={{ color: 'rgba(185, 205, 248, 0.6)' }} />
                        </div>
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.8rem', borderTop: '1px solid rgba(70, 105, 200, 0.2)' }}>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(false)}
                        className="settings-action-btn"
                      >
                        {t.done}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="modal-language"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Language Header with Back button */}
                    <div className="settings-header">
                      <button
                        type="button"
                        onClick={() => setSettingsModalView('main')}
                        className="settings-back-btn"
                      >
                        <ArrowLeft size={14} />
                        <span>{t.settings}</span>
                      </button>
                      <span className="settings-header-title" style={{ fontSize: '0.9rem' }}>
                        {t.language}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(false)}
                        className="settings-close-btn"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'rgba(185, 205, 248, 0.65)', marginBottom: '0.65rem' }}>
                      {t.selectLangPrompt}
                    </div>

                    {/* ONLY TWO Language Options: English & বাংলা */}
                    <div className="settings-lang-list">
                      {/* English Card */}
                      <button
                        type="button"
                        onClick={() => handleLanguageSelect('en')}
                        className={`settings-lang-card ${language === 'en' ? 'is-selected' : ''}`}
                      >
                        <div className="settings-lang-left">
                          <div className="settings-lang-radio">
                            {language === 'en' && <div className="settings-lang-radio-dot" />}
                          </div>
                          <div>
                            <div className="settings-lang-name">English</div>
                            <div className="settings-lang-tag">{t.englishTag}</div>
                          </div>
                        </div>

                        {language === 'en' && (
                          <Check size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
                        )}
                      </button>

                      {/* বাংলা Card */}
                      <button
                        type="button"
                        onClick={() => handleLanguageSelect('bn')}
                        className={`settings-lang-card ${language === 'bn' ? 'is-selected' : ''}`}
                      >
                        <div className="settings-lang-left">
                          <div className="settings-lang-radio">
                            {language === 'bn' && <div className="settings-lang-radio-dot" />}
                          </div>
                          <div>
                            <div className="settings-lang-name">বাংলা</div>
                            <div className="settings-lang-tag">{t.banglaTag}</div>
                          </div>
                        </div>

                        {language === 'bn' && (
                          <Check size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
                        )}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.8rem', borderTop: '1px solid rgba(70, 105, 200, 0.2)' }}>
                      <button
                        type="button"
                        onClick={() => setSettingsModalView('main')}
                        className="settings-back-btn"
                      >
                        <ArrowLeft size={13} />
                        <span>{t.back}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(false)}
                        className="settings-action-btn"
                      >
                        {t.done}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Diagnostics Panel */}
      <DebugPanel onSimulateDoubleClap={triggerSimulatedDoubleClap} />
    </div>
  );
}
