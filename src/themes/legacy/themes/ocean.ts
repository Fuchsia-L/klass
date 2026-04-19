import { ThemeConfig } from '../../../theme/types';

export const oceanTheme: ThemeConfig = {
  id: 'ocean',
  name: 'Ocean',
  colors: {
    bg: '#071824',
    card: '#0C2433',
    cardBorder: '#12384E',
    primary: '#4CC9F0',
    accent: '#7B8CFF',
    success: '#34D399',
    ratingFill: '#F59E0B',
    danger: '#F87171',
    warning: '#FBBF24',
    textMain: '#E0F2FE',
    textSub: '#7AA7BE',
    overlay: 'rgba(7, 24, 36, 0.88)',
    inputBg: '#102B3C',
    divider: '#16415A',
    priorityHigh: '#F87171',
    priorityMedium: '#FBBF24',
    priorityLow: '#6B8A9D',
  },
  categoryColors: {
    学习: '#38BDF8',
    工作: '#818CF8',
    生活: '#2DD4BF',
    运动: '#F59E0B',
    娱乐: '#F472B6',
    其他: '#94A3B8',
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
