import type { ThemeConfig } from '../../../theme/types';
import type { ThemePalette } from '../../types';

export const MINIMAL_INK_COLORS = {
  bg: '#fbfbfd',
  ink: '#0a1528',
  dim: '#93a0b5',
  line: '#dfe3eb',
  subtle: '#5a6a82',
  panel: '#f2f4f8',
  accent: '#0a1528',
  nowLine: '#0a1528',
  sheetScrim: 'rgba(10,21,40,0.38)',
} as const;

export type MinimalPaletteColors = typeof MINIMAL_INK_COLORS;

export function buildThemeConfig(id: string): ThemeConfig {
  return {
    id,
    name: 'Minimal Ink',
    colors: {
      bg: MINIMAL_INK_COLORS.bg,
      card: MINIMAL_INK_COLORS.panel,
      cardBorder: MINIMAL_INK_COLORS.line,
      primary: MINIMAL_INK_COLORS.ink,
      accent: MINIMAL_INK_COLORS.accent,
      success: '#2E7D32',
      ratingFill: MINIMAL_INK_COLORS.accent,
      danger: '#C62828',
      textMain: MINIMAL_INK_COLORS.ink,
      textSub: MINIMAL_INK_COLORS.subtle,
      overlay: MINIMAL_INK_COLORS.sheetScrim,
      inputBg: MINIMAL_INK_COLORS.panel,
      divider: MINIMAL_INK_COLORS.line,
      priorityHigh: '#C62828',
      priorityMedium: '#EF6C00',
      priorityLow: MINIMAL_INK_COLORS.subtle,
    },
    fonts: { heading: 'Orbitron-Bold', body: 'System' },
    radius: { card: 10, button: 6, sheet: 16 },
  };
}

export const minimalInkPalette: ThemePalette = {
  id: 'minimal-ink',
  label: 'Minimal Ink',
  sub: 'deep blue ink',
  preview: {
    bg: MINIMAL_INK_COLORS.bg,
    ink: MINIMAL_INK_COLORS.ink,
    accent: MINIMAL_INK_COLORS.accent,
    line: MINIMAL_INK_COLORS.line,
  },
  themeConfig: buildThemeConfig('minimal-ink'),
};
