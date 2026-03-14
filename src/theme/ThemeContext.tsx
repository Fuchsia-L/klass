import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../platform/storage/async-storage';
import { ThemeConfig } from './types';
import { ThemeName, getTheme, isThemeName } from './index';

interface ThemeContextValue {
  themeName: ThemeName;
  theme: ThemeConfig;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('cyber');
  const theme = getTheme(themeName);

  useEffect(() => {
    loadJSON<string>(STORAGE_KEYS.theme).then((savedTheme) => {
      if (savedTheme && isThemeName(savedTheme)) {
        setThemeName(savedTheme);
      }
    });
  }, []);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.theme, themeName);
  }, [themeName]);

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
