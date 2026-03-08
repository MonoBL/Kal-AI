"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language } from "@/lib/i18n";

type LanguageContextType = {
  lang: Language;
  setLang: (l: Language) => void;
  t: typeof translations.en;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("kal-lang") as Language;
    if (saved && (saved === "en" || saved === "pt")) setLangState(saved);
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("kal-lang", l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
