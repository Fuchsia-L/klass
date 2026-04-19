import { ThemeConfig } from '../../../theme/types';

export const midnightTheme: ThemeConfig = {
  id: 'midnight',
  name: 'Midnight',
  colors: {
    bg: '#0F0A1A',
    card: '#1A1128',
    cardBorder: '#2D2145',
    primary: '#C9A84C',
    accent: '#8B5CF6',
    success: '#34D399',
    ratingFill: '#00F0FF',
    danger: '#EF4444',
    textMain: '#EDE9FE',
    textSub: '#7C6F9B',
    overlay: 'rgba(15, 10, 26, 0.9)',
    inputBg: '#1E1533',
    divider: '#2D2145',
    priorityHigh: '#EF4444',
    priorityMedium: '#F59E0B',
    priorityLow: '#6B7280',
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
