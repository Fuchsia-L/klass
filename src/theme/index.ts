import { ThemeConfig } from './types';
import { cyberTheme } from './cyber';

export type { ThemeConfig };
export type ThemeName = 'cyber';

const themes: Record<ThemeName, ThemeConfig> = {
  cyber: cyberTheme,
};

export const THEME_OPTIONS: Array<{ name: ThemeName; label: string }> = [
  { name: 'cyber', label: 'Cyber' },
];

export function isThemeName(value: string): value is ThemeName {
  return value in themes;
}

export function getTheme(name: ThemeName = 'cyber'): ThemeConfig {
  return themes[name] ?? cyberTheme;
}

export { cyberTheme };
