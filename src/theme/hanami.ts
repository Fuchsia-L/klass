import { ThemeConfig } from './types';

export const hanamiTheme: ThemeConfig = {
  id: 'hanami',
  name: 'Sakura 桜',
  colors: {
    bg: '#FFF7FB',
    card: '#FFFDFE',
    cardBorder: '#F6D7E4',
    primary: '#C84C7A',
    accent: '#F28AB2',
    success: '#4CA97A',
    ratingFill: '#F59E0B',
    danger: '#D94B6A',
    warning: '#E6A23C',
    textMain: '#402A35',
    textSub: '#8C7180',
    overlay: 'rgba(255, 247, 251, 0.9)',
    inputBg: '#FFF0F6',
    divider: '#F2D3E0',
    priorityHigh: '#D94B6A',
    priorityMedium: '#E6A23C',
    priorityLow: '#B79AA8',
  },
  categoryColors: {
    学习: '#D46AA0',
    工作: '#8B6FE8',
    生活: '#57B88A',
    运动: '#F29A4A',
    娱乐: '#F06292',
    其他: '#8F7C8A',
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
