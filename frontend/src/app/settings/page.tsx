'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronRight, ArrowLeft, Check, Settings2, Sparkles, X } from 'lucide-react';
import { settingsService, UserSettings } from '@/services/settings.service';
import { useTranslation, SupportedLanguage } from '@/lib/i18n';

export default function SettingsPage() {
  const { language, setLanguage, t } = useTranslation();
  const [currentView, setCurrentView] = useState<'main' | 'language'>('main');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getSettings();
        setSettings(data);
        if (data.language === 'bn-BD' || data.language === 'bn') {
          setLanguage('bn');
        } else if (data.language === 'en-US' || data.language === 'en') {
          setLanguage('en');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [setLanguage]);

  const handleLanguageSelect = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    if (settings) {
      setSettings({
        ...settings,
        language: newLang === 'bn' ? 'bn-BD' : 'en-US',
      });
    }
    // Persist to backend settings
    settingsService.updateSettings({
      language: newLang === 'bn' ? 'bn-BD' : 'en-US',
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="settings-panel flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <div className="text-xs text-[var(--text-muted)]">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="settings-panel"
      >
        <AnimatePresence mode="wait">
          {currentView === 'main' ? (
            <motion.div
              key="settings-main"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header */}
              <div className="settings-header">
                <div className="settings-header-title">
                  <div className="settings-header-icon">
                    <Settings2 size={15} />
                  </div>
                  <span>{t.settings}</span>
                </div>
                <Link href="/dashboard" className="settings-close-btn" title={t.done}>
                  <X size={16} />
                </Link>
              </div>

              {/* ONLY Language item */}
              <div style={{ marginBottom: '1.2rem' }}>
                <button
                  type="button"
                  onClick={() => setCurrentView('language')}
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

              {/* Action footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.8rem', borderTop: '1px solid rgba(70, 105, 200, 0.2)' }}>
                <Link href="/dashboard" className="settings-action-btn">
                  {t.done}
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="settings-language"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header with Back button */}
              <div className="settings-header">
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="settings-back-btn"
                >
                  <ArrowLeft size={14} />
                  <span>{t.settings}</span>
                </button>
                <span className="settings-header-title" style={{ fontSize: '0.9rem' }}>
                  {t.language}
                </span>
                <Link href="/dashboard" className="settings-close-btn" title={t.done}>
                  <X size={16} />
                </Link>
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

              {/* Action footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.8rem', borderTop: '1px solid rgba(70, 105, 200, 0.2)' }}>
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="settings-back-btn"
                >
                  <ArrowLeft size={13} />
                  <span>{t.back}</span>
                </button>
                <Link href="/dashboard" className="settings-action-btn">
                  {t.done}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}