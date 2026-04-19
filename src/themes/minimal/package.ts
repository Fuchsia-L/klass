import React from 'react';
import type { ThemePackage, RouteName } from '../types';
import { minimalBlackPalette } from './palettes/black';
import { minimalInkPalette } from './palettes/ink';
import { minimalSlatePalette } from './palettes/slate';
import { minimalPaperPalette } from './palettes/paper';
import { minimalGhostPalette } from './palettes/ghost';
import { MinimalRoot } from './components/MinimalRoot';

export const minimalPackage: ThemePackage = {
  id: 'minimal',
  name: 'Minimal',
  palettes: [
    minimalBlackPalette,
    minimalInkPalette,
    minimalSlatePalette,
    minimalPaperPalette,
    minimalGhostPalette,
  ],
  renderRoot(route: RouteName) {
    return React.createElement(MinimalRoot, { route });
  },
};
