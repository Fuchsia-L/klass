import type { ThemeConfig } from '../theme/types';
import type { ThemePackage, ThemePalette } from './types';
import { legacyPackage } from './legacy/package';
import { minimalPackage } from './minimal/package';

export type { ThemePackage, ThemePalette, ThemePaletteMeta, RouteName } from './types';
export { legacyPackage } from './legacy/package';
export { minimalPackage } from './minimal/package';

export const themePackages: ThemePackage[] = [legacyPackage, minimalPackage];

export function getAllPalettes(): ThemePalette[] {
  return themePackages.flatMap((pkg) => pkg.palettes);
}

export interface ResolvedPalette {
  pkg: ThemePackage;
  palette: ThemePalette;
}

export function resolvePalette(id: string): ResolvedPalette | null {
  for (const pkg of themePackages) {
    const palette = pkg.palettes.find((p) => p.id === id);
    if (palette) return { pkg, palette };
  }
  return null;
}

export function getThemeConfigById(id: string): ThemeConfig | null {
  return resolvePalette(id)?.palette.themeConfig ?? null;
}
