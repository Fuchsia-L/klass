import { ThemeConfig } from './types';

export const cyberTheme: ThemeConfig = {
  id: 'cyber',
  name: 'Cyber',
  colors: {
    bg: '#06090F',
    card: '#0D1117',
    cardBorder: '#1B2332',
    primary: '#00F0FF',
    accent: '#FF2D78',
    success: '#39FF14',
    ratingFill: '#39FF14',
    danger: '#EF4444',
    textMain: '#E2E8F0',
    textSub: '#64748B',
    overlay: 'rgba(6, 9, 15, 0.85)',
    inputBg: '#161B22',
    divider: '#1B2332',
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
