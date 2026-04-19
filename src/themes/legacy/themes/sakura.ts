import { ThemeConfig } from '../../../theme/types';

export const sakuraTheme: ThemeConfig = {
  id: 'sakura',
  name: 'Sakura',
  colors: {
    bg: '#FFF5F7',
    card: '#FFFFFF',
    cardBorder: '#FECDD3',
    primary: '#E11D48',
    accent: '#F472B6',
    success: '#10B981',
    ratingFill: '#0EA5E9',
    danger: '#EF4444',
    textMain: '#1C1917',
    textSub: '#A8A29E',
    overlay: 'rgba(255, 245, 247, 0.9)',
    inputBg: '#FFF1F2',
    divider: '#FECDD3',
    priorityHigh: '#E11D48',
    priorityMedium: '#F59E0B',
    priorityLow: '#A8A29E',
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
