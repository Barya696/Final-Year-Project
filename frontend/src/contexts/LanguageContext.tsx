import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface LanguageContextType {
  language: "english" | "arabic";
  setLanguage: (lang: "english" | "arabic") => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<"english" | "arabic">(() => {
    const saved = localStorage.getItem("language") as "english" | "arabic" | null;
    return saved || "english";
  });

  const setLanguage = (lang: "english" | "arabic") => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    document.documentElement.dir = lang === "arabic" ? "rtl" : "ltr";
    document.documentElement.lang = lang === "arabic" ? "ar" : "en";
  };

  useEffect(() => {
    document.documentElement.dir = language === "arabic" ? "rtl" : "ltr";
    document.documentElement.lang = language === "arabic" ? "ar" : "en";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
