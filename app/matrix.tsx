import React from 'react';
import { useThemeSettings } from '../src/theme/ThemeContext';
import { resolvePalette, legacyPackage } from '../src/themes';

export default function MatrixRoute() {
  const { themeName } = useThemeSettings();
  const resolved = resolvePalette(themeName) ?? { pkg: legacyPackage };
  return <>{resolved.pkg.renderRoot('matrix')}</>;
}
