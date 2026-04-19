import type { ThemeConfig } from '../../../theme/types';
import type { ThemePalette } from '../../types';

export const MINIMAL_GHOST_COLORS = {
  bg: '#0c0c0d',
  ink: '#f5f5f4',
  dim: '#4a4a4a',
  line: '#1f1f21',
  subtle: '#8a8a86',
  panel: '#151517',
  accent: '#f5f5f4',
  nowLine: '#f5f5f4',
  sheetScrim: 'rgba(0,0,0,0.55)',
} as const;

export type MinimalPaletteColors = typeof MINIMAL_GHOST_COLORS;

export function buildThemeConfig(id: string): ThemeConfig {
  return {
    id,
    name: 'Minimal Ghost',
    colors: {
      bg: MINIMAL_GHOST_COLORS.bg,
      card: MINIMAL_GHOST_COLORS.panel,
      cardBorder: MINIMAL_GHOST_COLORS.line,
      primary: MINIMAL_GHOST_COLORS.ink,
      accent: MINIMAL_GHOST_COLORS.accent,
      success: '#2E7D32',
      ratingFill: MINIMAL_GHOST_COLORS.accent,
      danger: '#C62828',
      textMain: MINIMAL_GHOST_COLORS.ink,
      textSub: MINIMAL_GHOST_COLORS.subtle,
      overlay: MINIMAL_GHOST_COLORS.sheetScrim,
      inputBg: MINIMAL_GHOST_COLORS.panel,
      divider: MINIMAL_GHOST_COLORS.line,
      priorityHigh: '#C62828',
      priorityMedium: '#EF6C00',
      priorityLow: MINIMAL_GHOST_COLORS.subtle,
    },
    fonts: { heading: 'Orbitron-Bold', body: 'System' },
    radius: { card: 10, button: 6, sheet: 16 },
  };
}

export const minimalGhostPalette: ThemePalette = {
  id: 'minimal-ghost',
  label: 'Minimal Ghost',
  sub: 'dark mode',
  preview: {
    bg: MINIMAL_GHOST_COLORS.bg,
    ink: MINIMAL_GHOST_COLORS.ink,
    accent: MINIMAL_GHOST_COLORS.accent,
    line: MINIMAL_GHOST_COLORS.line,
  },
  themeConfig: buildThemeConfig('minimal-ghost'),
};
