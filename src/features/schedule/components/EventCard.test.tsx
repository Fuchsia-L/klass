import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { EventCard } from './EventCard';
import type { ScheduleEvent } from '../types';

let mockThemeName = 'cyber';

jest.mock('../../../theme/ThemeContext', () => {
  const { getTheme } = require('../../../theme');

  return {
    useTheme: () => getTheme(mockThemeName),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Clock: ({ color }: { color: string }) => <Text>{`clock-${color}`}</Text>,
    MapPin: ({ color }: { color: string }) => <Text>{`pin-${color}`}</Text>,
  };
});

const baseEvent: ScheduleEvent = {
  id: 'evt-study',
  title: 'Deep Work Session',
  category: '学习',
  start_time: '2026-03-10T09:00:00.000Z',
  end_time: '2026-03-10T10:30:00.000Z',
  repeat: 'none',
  location: 'Library',
  is_completed: false,
};

describe('EventCard theme-aware category colors', () => {
  afterEach(() => {
    mockThemeName = 'cyber';
  });

  it('applies distinct hanami category colors within the same theme', () => {
    mockThemeName = 'hanami';

    const { getByTestId, rerender } = render(<EventCard event={baseEvent} />);
    const studyBar = StyleSheet.flatten(getByTestId('event-card-category-bar-evt-study').props.style);
    const studyContainer = StyleSheet.flatten(getByTestId('event-card-evt-study').props.style);

    const funEvent: ScheduleEvent = { ...baseEvent, id: 'evt-fun', category: '娱乐' };
    rerender(<EventCard event={funEvent} />);

    const funBar = StyleSheet.flatten(getByTestId('event-card-category-bar-evt-fun').props.style);
    const funContainer = StyleSheet.flatten(getByTestId('event-card-evt-fun').props.style);

    expect(studyBar.backgroundColor).toBe('#D46AA0');
    expect(funBar.backgroundColor).toBe('#F06292');
    expect(studyBar.backgroundColor).not.toBe(funBar.backgroundColor);
    expect(studyContainer.backgroundColor).toBe('#D46AA018');
    expect(funContainer.backgroundColor).toBe('#F0629218');
  });

  it('applies distinct ocean category colors within the same theme', () => {
    mockThemeName = 'ocean';

    const workEvent: ScheduleEvent = { ...baseEvent, id: 'evt-work', category: '工作' };
    const sportEvent: ScheduleEvent = { ...baseEvent, id: 'evt-sport', category: '运动' };

    const { getByTestId, rerender } = render(<EventCard event={workEvent} />);
    const workLabel = StyleSheet.flatten(getByTestId('event-card-category-label-evt-work').props.style);

    rerender(<EventCard event={sportEvent} />);

    const sportLabel = StyleSheet.flatten(getByTestId('event-card-category-label-evt-sport').props.style);

    expect(workLabel.color).toBe('#818CF8');
    expect(sportLabel.color).toBe('#F59E0B');
    expect(workLabel.color).not.toBe(sportLabel.color);
  });

  it('renders safely with a legacy theme that lacks optional tokens', () => {
    mockThemeName = 'cyber';

    const { getByTestId } = render(<EventCard event={{ ...baseEvent, id: 'evt-legacy', category: '学习' }} />);

    const bar = StyleSheet.flatten(getByTestId('event-card-category-bar-evt-legacy').props.style);
    const container = StyleSheet.flatten(getByTestId('event-card-evt-legacy').props.style);

    expect(bar.backgroundColor).toBe('#00F0FF');
    expect(container.backgroundColor).toBe('#00F0FF18');
  });
});
