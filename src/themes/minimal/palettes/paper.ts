import type { ThemeConfig } from '../../../theme/types';
import type { ThemePalette } from '../../types';

export const MINIMAL_PAPER_COLORS = {
  bg: '#faf7f2',
  ink: '#1c1a15',
  dim: '#b5ad9e',
  line: '#e8e2d5',
  subtle: '#7a7364',
  panel: '#f3eee4',
  accent: '#1c1a15',
  nowLine: '#1c1a15',
  sheetScrim: 'rgba(28,26,21,0.35)',
} as const;

export type MinimalPaletteColors = typeof MINIMAL_PAPER_COLORS;

export function buildThemeConfig(id: string): ThemeConfig {
  return {
    id,
    name: 'Minimal Paper',
    colors: {
      bg: MINIMAL_PAPER_COLORS.bg,
      card: MINIMAL_PAPER_COLORS.panel,
      cardBorder: MINIMAL_PAPER_COLORS.line,
      primary: MINIMAL_PAPER_COLORS.ink,
      accent: MINIMAL_PAPER_COLORS.accent,
      success: '#2E7D32',
      ratingFill: MINIMAL_PAPER_COLORS.accent,
      danger: '#C62828',
      textMain: MINIMAL_PAPER_COLORS.ink,
      textSub: MINIMAL_PAPER_COLORS.subtle,
      overlay: MINIMAL_PAPER_COLORS.sheetScrim,
      inputBg: MINIMAL_PAPER_COLORS.panel,
      divider: MINIMAL_PAPER_COLORS.line,
      priorityHigh: '#C62828',
      priorityMedium: '#EF6C00',
      priorityLow: MINIMAL_PAPER_COLORS.subtle,
    },
    fonts: { heading: 'Orbitron-Bold', body: 'System' },
    radius: { card: 10, button: 6, sheet: 16 },
  };
}

export const minimalPaperPalette: ThemePalette = {
  id: 'minimal-paper',
  label: 'Minimal Paper',
  sub: 'warm off-white',
  preview: {
    bg: MINIMAL_PAPER_COLORS.bg,
    ink: MINIMAL_PAPER_COLORS.ink,
    accent: MINIMAL_PAPER_COLORS.accent,
    line: MINIMAL_PAPER_COLORS.line,
  },
  themeConfig: buildThemeConfig('minimal-paper'),
};
