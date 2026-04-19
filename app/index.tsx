import React from 'react';
import { useThemeSettings } from '../src/theme/ThemeContext';
import { resolvePalette, legacyPackage } from '../src/themes';

export default function HomeRoute() {
  const { themeName } = useThemeSettings();
  const resolved = resolvePalette(themeName) ?? { pkg: legacyPackage };
  return <>{resolved.pkg.renderRoot('home')}</>;
}
