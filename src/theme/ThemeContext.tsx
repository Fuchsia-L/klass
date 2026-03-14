import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../platform/storage/async-storage';
import { ThemeConfig } from './types';
import { DEFAULT_THEME, getTheme, isThemeName } from './index';

interface ThemeContextValue {
  themeName: string;
  theme: ThemeConfig;
  setThemeName: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<string>(DEFAULT_THEME);
  const theme = getTheme(themeName);

  useEffect(() => {
    loadJSON<string>(STORAGE_KEYS.theme).then((savedTheme) => {
      if (savedTheme && isThemeName(savedTheme)) {
        setThemeNameState(savedTheme);
      }
    });
  }, []);

  const setThemeName = (name: string) => {
    if (isThemeName(name)) {
      setThemeNameState(name);
      saveJSON(STORAGE_KEYS.theme, name);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeName, theme, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeConfig {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useThemeSettings(): Pick<ThemeContextValue, 'themeName' | 'setThemeName'> {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeSettings must be used within ThemeProvider');
  return {
    themeName: ctx.themeName,
    setThemeName: ctx.setThemeName,
  };
}
