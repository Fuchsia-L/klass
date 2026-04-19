import type { ThemeConfig } from './types';
import { getAllPalettes, resolvePalette } from '../themes';

export type { ThemeConfig };
export type ThemeName = string;

export const DEFAULT_THEME = 'cyber';

export function isThemeName(value: string): boolean {
  return resolvePalette(value) !== null;
}

export function getTheme(name: string = DEFAULT_THEME): ThemeConfig {
  return (
    resolvePalette(name)?.palette.themeConfig ??
    resolvePalette(DEFAULT_THEME)!.palette.themeConfig
  );
}

export function getAllThemes(): Record<string, ThemeConfig> {
  const out: Record<string, ThemeConfig> = {};
  for (const p of getAllPalettes()) {
    out[p.id] = p.themeConfig;
  }
  return out;
}

export const THEME_OPTIONS: Array<{ name: string; label: string }> = getAllPalettes().map((p) => ({
  name: p.id,
  label: p.label,
}));
