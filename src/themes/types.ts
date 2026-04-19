import type { ReactNode } from 'react';
import type { ThemeConfig } from '../theme/types';

export interface ThemePaletteMeta {
  /** Stable unique id, e.g. 'cyber' or 'minimal-black' */
  id: string;
  /** Human-readable label for UI pickers */
  label: string;
  /** Short description, optional */
  sub?: string;
  /** Background color shown as the palette swatch base */
  preview: {
    bg: string;
    ink: string;
    accent: string;
    line: string;
  };
}

export interface ThemePalette extends ThemePaletteMeta {
  /**
   * Adapter to the legacy ThemeConfig shape that `useTheme()` returns.
   * Every palette MUST provide this so existing components keep working.
   */
  themeConfig: ThemeConfig;
}

export type RouteName = 'home' | 'matrix' | 'rating' | 'settings';

export interface ThemePackage {
  /** Package id, e.g. 'legacy' or 'minimal' */
  id: string;
  /** Human-readable name */
  name: string;
  /** All palettes this package ships */
  palettes: ThemePalette[];
  /** Render the page for a given route, under this package + palette */
  renderRoot(route: RouteName): ReactNode;
}
