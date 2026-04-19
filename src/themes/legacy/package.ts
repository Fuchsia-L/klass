import React from 'react';
import type { ReactNode } from 'react';
import type { ThemePackage, ThemePalette, RouteName } from '../types';
import { cyberTheme } from './themes/cyber';
import { hanamiTheme } from './themes/hanami';
import { midnightTheme } from './themes/midnight';
import { oceanTheme } from './themes/ocean';
import { sakuraTheme } from './themes/sakura';

function paletteFromConfig(cfg: typeof cyberTheme, label: string, sub?: string): ThemePalette {
  return {
    id: cfg.id,
    label,
    sub,
    preview: {
      bg: cfg.colors.bg,
      ink: cfg.colors.textMain,
      accent: cfg.colors.accent,
      line: cfg.colors.cardBorder,
    },
    themeConfig: cfg,
  };
}

export const legacyPalettes: ThemePalette[] = [
  paletteFromConfig(cyberTheme, cyberTheme.name),
  paletteFromConfig(hanamiTheme, hanamiTheme.name),
  paletteFromConfig(midnightTheme, midnightTheme.name),
  paletteFromConfig(oceanTheme, oceanTheme.name),
  paletteFromConfig(sakuraTheme, sakuraTheme.name),
];

function renderRoot(route: RouteName): ReactNode {
  switch (route) {
    case 'home':
      // Lazy require keeps the theme registry free of route component import cycles.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LegacyHome } = require('./components/LegacyHome') as typeof import('./components/LegacyHome');
      return React.createElement(LegacyHome);
    case 'matrix':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LegacyMatrix } = require('./components/LegacyMatrix') as typeof import('./components/LegacyMatrix');
      return React.createElement(LegacyMatrix);
    case 'rating':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LegacyRating } = require('./components/LegacyRating') as typeof import('./components/LegacyRating');
      return React.createElement(LegacyRating);
    case 'settings':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LegacySettings } = require('./components/LegacySettings') as typeof import('./components/LegacySettings');
      return React.createElement(LegacySettings);
  }
}

export const legacyPackage: ThemePackage = {
  id: 'legacy',
  name: 'Legacy',
  palettes: legacyPalettes,
  renderRoot,
};
