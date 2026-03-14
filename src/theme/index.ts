import { ThemeConfig } from './types';
import { cyberTheme } from './cyber';
import { minimalTheme } from './minimal';
import { sakuraTheme } from './sakura';
import { midnightTheme } from './midnight';

export type { ThemeConfig };
export type ThemeName = string;

export const DEFAULT_THEME = 'cyber';

const themes: Record<string, ThemeConfig> = {
  cyber: cyberTheme,
  minimal: minimalTheme,
  sakura: sakuraTheme,
  midnight: midnightTheme,
};

export const THEME_OPTIONS: Array<{ name: string; label: string }> = Object.values(themes).map(
  (t) => ({ name: t.id, label: t.name }),
);

export function isThemeName(value: string): boolean {
  return value in themes;
}

export function getTheme(name: string = DEFAULT_THEME): ThemeConfig {
  return themes[name] ?? themes[DEFAULT_THEME];
}

export function getAllThemes(): Record<string, ThemeConfig> {
  return themes;
}

export { cyberTheme, minimalTheme, sakuraTheme, midnightTheme };
