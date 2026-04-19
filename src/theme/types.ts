import type { CategoryKey } from '../features/schedule/types';

export interface ThemeConfig {
  id: string;
  name: string;
  colors: {
    bg: string;
    card: string;
    cardBorder: string;
    primary: string;
    accent: string;
    success: string;
    ratingFill: string;
    danger: string;
    warning?: string;
    textMain: string;
    textSub: string;
    overlay: string;
    inputBg: string;
    divider: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityLow: string;
  };
  categoryColors?: Partial<Record<CategoryKey, string>>;
  fonts: {
    heading: string;
    body: string;
  };
  radius: {
    card: number;
    button: number;
    sheet: number;
  };
}
