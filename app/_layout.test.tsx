import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from './_layout';

const tabScreens: Array<{ name: string; title: string; icon: string }> = [];

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  function Tabs({ children }: { children: React.ReactNode }) {
    return <View testID="tabs-root">{children}</View>;
  }

  Tabs.Screen = ({ name, options }: { name: string; options: any }) => {
    const icon = options.tabBarIcon({ color: 'active-color', size: 24 });
    tabScreens.push({ name, title: options.title, icon: icon.type.iconName });
    return null;
  };

  return { Tabs };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const icon = (name: string) => {
    function MockIcon(props: any) {
      return <Text data-icon={name} {...props}>{name}</Text>;
    }

    MockIcon.iconName = name;
    return MockIcon;
  };

  return {
    Grid3X3: icon('Grid3X3'),
    Home: icon('Home'),
    Settings: icon('Settings'),
    Star: icon('Star'),
  };
});

jest.mock('../src/theme/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    colors: {
      bg: '#050816',
      card: '#111827',
      divider: '#334155',
      primary: '#00F0FF',
      textSub: '#94A3B8',
    },
    fonts: {
      heading: 'Orbitron-Bold',
    },
  }),
}));

describe('RootLayout tabs', () => {
  beforeEach(() => {
    tabScreens.length = 0;
  });

  it('renders TODAY, MATRIX, RATING, SETTINGS in order with matching tab styles', () => {
    render(<RootLayout />);

    expect(tabScreens).toEqual([
      { name: 'index', title: 'TODAY', icon: 'Home' },
      { name: 'matrix', title: 'MATRIX', icon: 'Grid3X3' },
      { name: 'rating', title: 'RATING', icon: 'Star' },
      { name: 'settings', title: 'SETTINGS', icon: 'Settings' },
    ]);
  });
});
