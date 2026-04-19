import { ThemeConfig } from './types';

export const minimalTheme: ThemeConfig = {
  id: 'minimal',
  name: 'Minimal',
  colors: {
    bg: '#FAFAFA',
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    primary: '#1F2937',
    accent: '#6B7280',
    success: '#059669',
    ratingFill: '#3B82F6',
    danger: '#EF4444',
    textMain: '#111827',
    textSub: '#9CA3AF',
    overlay: 'rgba(250, 250, 250, 0.9)',
    inputBg: '#F3F4F6',
    divider: '#E5E7EB',
    priorityHigh: '#DC2626',
    priorityMedium: '#D97706',
    priorityLow: '#9CA3AF',
  },
  fonts: {
    heading: 'Orbitron-Bold',
    body: 'System',
  },
  radius: {
    card: 10,
    button: 6,
    sheet: 16,
  },
};
