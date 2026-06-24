// ============================================================
// LanguageContext – Sprache global verfügbar machen
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type Lang, type Translations } from './translations';

interface LanguageContextValue {
  lang: Lang;
  t: Translations;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem('wif-doggy-lang');
    if (stored === 'de' || stored === 'en') return stored;
  } catch { /* ignore */ }
  return 'de'; // Standard: Deutsch
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang);

  useEffect(() => {
    try { localStorage.setItem('wif-doggy-lang', lang); } catch { /* ignore */ }
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const toggleLang = () => setLang(l => (l === 'de' ? 'en' : 'de'));

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook für einfachen Zugriff auf Übersetzungen */
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
