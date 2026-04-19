import type { ThemeConfig } from '../../../theme/types';
import type { ThemePalette } from '../../types';

export const MINIMAL_BLACK_COLORS = {
  bg: '#ffffff',
  ink: '#000000',
  dim: '#9e9e9e',
  line: '#e5e5e5',
  subtle: '#6b6b6b',
  panel: '#fafafa',
  accent: '#000000',
  nowLine: '#000000',
  sheetScrim: 'rgba(0,0,0,0.35)',
} as const;

export type MinimalPaletteColors = typeof MINIMAL_BLACK_COLORS;

export function buildThemeConfig(id: string): ThemeConfig {
  return {
    id,
    name: 'Minimal Black',
    colors: {
      bg: MINIMAL_BLACK_COLORS.bg,
      card: MINIMAL_BLACK_COLORS.panel,
      cardBorder: MINIMAL_BLACK_COLORS.line,
      primary: MINIMAL_BLACK_COLORS.ink,
      accent: MINIMAL_BLACK_COLORS.accent,
      success: '#2E7D32',
      ratingFill: MINIMAL_BLACK_COLORS.accent,
      danger: '#C62828',
      textMain: MINIMAL_BLACK_COLORS.ink,
      textSub: MINIMAL_BLACK_COLORS.subtle,
      overlay: MINIMAL_BLACK_COLORS.sheetScrim,
      inputBg: MINIMAL_BLACK_COLORS.panel,
      divider: MINIMAL_BLACK_COLORS.line,
      priorityHigh: '#C62828',
      priorityMedium: '#EF6C00',
      priorityLow: MINIMAL_BLACK_COLORS.subtle,
    },
    fonts: { heading: 'Orbitron-Bold', body: 'System' },
    radius: { card: 10, button: 6, sheet: 16 },
  };
}

export const minimalBlackPalette: ThemePalette = {
  id: 'minimal-black',
  label: 'Minimal Black',
  sub: 'pure black on white',
  preview: {
    bg: MINIMAL_BLACK_COLORS.bg,
    ink: MINIMAL_BLACK_COLORS.ink,
    accent: MINIMAL_BLACK_COLORS.accent,
    line: MINIMAL_BLACK_COLORS.line,
  },
  themeConfig: buildThemeConfig('minimal-black'),
};
