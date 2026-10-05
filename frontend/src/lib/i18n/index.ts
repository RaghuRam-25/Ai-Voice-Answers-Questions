import { create } from 'zustand';
import { useEffect, useState } from 'react';
import { translations, SupportedLanguage, Translations } from './translations';

interface LanguageState {
  language: SupportedLanguage;
  t: Translations;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  hydrateLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  // Default to 'en' so server render and initial client render match identically
  language: 'en',
  t: translations.en,

  hydrateLanguage: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('app_language');
        if (saved === 'bn' || saved === 'en') {
          set({
            language: saved,
            t: translations[saved] || translations.en,
          });
        }
      } catch {}
    }
  },

  setLanguage: (language: SupportedLanguage) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('app_language', language);
      } catch {}
    }
    set({
      language,
      t: translations[language] || translations.en,
    });
  },

  toggleLanguage: () => {
    set((state) => {
      const nextLang: SupportedLanguage = state.language === 'en' ? 'bn' : 'en';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('app_language', nextLang);
        } catch {}
      }
      return {
        language: nextLang,
        t: translations[nextLang] || translations.en,
      };
    });
  },
}));

export const useTranslation = () => {
  const { language, t, setLanguage, toggleLanguage, hydrateLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    hydrateLanguage();
    setMounted(true);
  }, [hydrateLanguage]);

  return {
    language,
    t,
    setLanguage,
    toggleLanguage,
    mounted,
    isBangla: language === 'bn',
    isEnglish: language === 'en',
    sttLang: language === 'bn' ? 'bn-BD' : 'en-US',
    ttsLang: language === 'bn' ? 'bn-BD' : 'en-US',
  };
};

export * from './translations';
