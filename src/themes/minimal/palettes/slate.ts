import type { ThemeConfig } from '../../../theme/types';
import type { ThemePalette } from '../../types';

export const MINIMAL_SLATE_COLORS = {
  bg: '#f4f4f3',
  ink: '#262623',
  dim: '#a8a8a5',
  line: '#dcdcd8',
  subtle: '#70706c',
  panel: '#ebebe8',
  accent: '#262623',
  nowLine: '#262623',
  sheetScrim: 'rgba(38,38,35,0.35)',
} as const;

export type MinimalPaletteColors = typeof MINIMAL_SLATE_COLORS;

export function buildThemeConfig(id: string): ThemeConfig {
  return {
    id,
    name: 'Minimal Slate',
    colors: {
      bg: MINIMAL_SLATE_COLORS.bg,
      card: MINIMAL_SLATE_COLORS.panel,
      cardBorder: MINIMAL_SLATE_COLORS.line,
      primary: MINIMAL_SLATE_COLORS.ink,
      accent: MINIMAL_SLATE_COLORS.accent,
      success: '#2E7D32',
      ratingFill: MINIMAL_SLATE_COLORS.accent,
      danger: '#C62828',
      textMain: MINIMAL_SLATE_COLORS.ink,
      textSub: MINIMAL_SLATE_COLORS.subtle,
      overlay: MINIMAL_SLATE_COLORS.sheetScrim,
      inputBg: MINIMAL_SLATE_COLORS.panel,
      divider: MINIMAL_SLATE_COLORS.line,
      priorityHigh: '#C62828',
      priorityMedium: '#EF6C00',
      priorityLow: MINIMAL_SLATE_COLORS.subtle,
    },
    fonts: { heading: 'Orbitron-Bold', body: 'System' },
    radius: { card: 10, button: 6, sheet: 16 },
  };
}

export const minimalSlatePalette: ThemePalette = {
  id: 'minimal-slate',
  label: 'Minimal Slate',
  sub: 'cold neutral gray',
  preview: {
    bg: MINIMAL_SLATE_COLORS.bg,
    ink: MINIMAL_SLATE_COLORS.ink,
    accent: MINIMAL_SLATE_COLORS.accent,
    line: MINIMAL_SLATE_COLORS.line,
  },
  themeConfig: buildThemeConfig('minimal-slate'),
};
