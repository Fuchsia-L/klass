import type { ThemeConfig } from '../../theme';
import { CATEGORIES, CategoryKey } from './types';

export function getCategoryColor(theme: ThemeConfig, category: CategoryKey): string {
  return theme.categoryColors?.[category] ?? CATEGORIES[category].color;
}
