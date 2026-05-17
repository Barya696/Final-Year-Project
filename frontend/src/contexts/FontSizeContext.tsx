import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface FontSizeContextType {
  fontSize: number;
  setFontSize: (size: number) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const FontSizeProvider = ({ children }: { children: ReactNode }) => {
  const [fontSize, setFontSizeState] = useState<number>(() => {
    const saved = localStorage.getItem("fontSize");
    return saved ? parseInt(saved, 10) : 100;
  });

  const setFontSize = (size: number) => {
    setFontSizeState(size);
    localStorage.setItem("fontSize", size.toString());
  };

  useEffect(() => {
    const scale = fontSize / 100;
    document.documentElement.style.fontSize = `${16 * scale}px`;
  }, [fontSize]);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error("useFontSize must be used within FontSizeProvider");
  }
  return context;
};
