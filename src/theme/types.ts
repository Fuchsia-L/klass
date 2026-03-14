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
    danger: string;
    textMain: string;
    textSub: string;
    overlay: string;
    inputBg: string;
    divider: string;
  };
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
