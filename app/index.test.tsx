import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import HomeScreen from './index';
import { importWhutArrangedList, resetEventsState } from '../src/features/schedule';
import { clearEventsCache } from '../src/features/schedule/storage/events.storage';

jest.mock('../src/shared/components/AppBar', () => ({
  AppBar: ({ title, subtitle }: { title: string; subtitle?: string }) => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return (
      <View>
        <Text>{title}</Text>
        {subtitle ? <Text>{subtitle}</Text> : null}
      </View>
    );
  },
}));

jest.mock('../src/shared/components/FAB', () => ({
  FAB: () => null,
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useThemeSettings: () => ({ themeName: 'cyber', setThemeName: jest.fn() }),
  useTheme: () => ({
    colors: {
      bg: '#050816',
      primary: '#00F0FF',
      accent: '#FF2D78',
      success: '#39FF14',
      card: '#111827',
      cardBorder: '#1F2937',
      textSub: '#94A3B8',
      textMain: '#F8FAFC',
      inputBg: '#0F172A',
      divider: '#334155',
      danger: '#EF4444',
    },
    fonts: {
      heading: 'System',
    },
    radius: {
      card: 12,
    },
  }),
}));

jest.mock('../src/features/todo', () => ({
  TodoSection: () => null,
  useTodos: () => ({
    todos: [],
    loading: false,
    refresh: jest.fn(),
  }),
}));

jest.mock('lucide-react-native', () => ({
  Calendar: () => null,
}));

jest.mock('../src/features/schedule', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const actual = jest.requireActual('../src/features/schedule');

  return {
    ...actual,
    EventCard: ({ event }: { event: { title: string } }) => <Text>{event.title}</Text>,
    EventSheet: () => null,
  };
});

describe('HomeScreen WHUT import linkage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-23T12:00:00'));
    resetEventsState();
    clearEventsCache();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reloads subscribed events and renders imported course titles after a successful import', async () => {
    const renderResult = render(<HomeScreen />);

    await act(async () => {});

    const { getByText, queryByText } = renderResult;

    expect(getByText('今日')).toBeTruthy();
    expect(queryByText('数据结构')).toBeNull();

    await act(async () => {
      await importWhutArrangedList({
        arrangedList: [
          {
            courseName: '数据结构',
            dayOfWeek: 1,
            beginSection: 1,
            endSection: 2,
            week: '100000000000000000000000000000',
            location: '南湖综合楼',
            teacher: '周老师',
          },
        ],
        semesterConfig: {
          start_date: '2026-02-23',
          total_weeks: 18,
        },
      });
    });

    await waitFor(() => {
      expect(getByText('数据结构')).toBeTruthy();
    });
  });
});
