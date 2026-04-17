import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { EfficiencySlider } from './EfficiencySlider';
import { RatingHistoryList } from './RatingHistoryList';
import { RatingInputSheet } from './RatingInputSheet';
import { StarRating } from './StarRating';
import type { TimeSlotRating } from '../types';

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      overlay: 'overlay',
      bg: 'bg',
      card: 'card',
      cardBorder: 'cardBorder',
      primary: 'primary',
      accent: 'accent',
      success: 'success',
      danger: 'danger',
      textMain: 'textMain',
      textSub: 'textSub',
      inputBg: 'inputBg',
      divider: 'divider',
    },
    radius: {
      card: 10,
      button: 6,
      sheet: 16,
    },
    fonts: {
      heading: 'Orbitron-Bold',
      body: 'System',
    },
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Star: ({ color, fill }: { color: string; fill: string }) => <Text>{`star-${color}-${fill}`}</Text>,
    X: ({ color }: { color: string }) => <Text>{`x-${color}`}</Text>,
  };
});

jest.mock('../../schedule/components/DateTimePicker', () => ({
  __esModule: true,
  default: ({ value, onChange, testID }: any) => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return (
      <View testID={testID}>
        <Text>{value.toISOString()}</Text>
        <Text
          testID={`${testID}-advance`}
          onPress={() => {
            const next = new Date(value);
            next.setMinutes(next.getMinutes() + 30);
            onChange(next);
          }}
        >
          advance
        </Text>
      </View>
    );
  },
}));

function createRating(overrides: Partial<TimeSlotRating> = {}): TimeSlotRating {
  return {
    id: overrides.id ?? 'rating-1',
    slot_start: overrides.slot_start ?? '2026-04-17T08:00:00.000Z',
    slot_end: overrides.slot_end ?? '2026-04-17T09:00:00.000Z',
    rating: overrides.rating ?? 4,
    efficiency: overrides.efficiency ?? 5,
    activity: overrides.activity,
    mood: overrides.mood,
    reflection: overrides.reflection,
    created_at: overrides.created_at ?? '2026-04-17T09:01:00.000Z',
    updated_at: overrides.updated_at ?? '2026-04-17T09:01:00.000Z',
    synced_at: overrides.synced_at ?? null,
    schema_version: 1,
  };
}

describe('rating UI components', () => {
  it('StarRating changes selected value when pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<StarRating value={2} onChange={onChange} />);

    fireEvent.press(getByTestId('star-rating-5'));

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('EfficiencySlider snaps to one of five discrete values and displays the current value', () => {
    const onChange = jest.fn();
    const { getByText, getByTestId } = render(<EfficiencySlider value={3} onChange={onChange} />);

    expect(getByText('3')).toBeTruthy();

    fireEvent.press(getByTestId('efficiency-slider-1'));
    fireEvent.press(getByTestId('efficiency-slider-5'));

    expect(onChange).toHaveBeenNthCalledWith(1, 1);
    expect(onChange).toHaveBeenNthCalledWith(2, 5);
  });

  it('RatingInputSheet submits slot, ratings, optional fields, and enforces max lengths', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getAllByPlaceholderText, getByTestId, getByText } = render(
      <RatingInputSheet
        visible
        defaultStart={new Date('2026-04-17T08:00:00.000Z')}
        defaultEnd={new Date('2026-04-17T09:00:00.000Z')}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    const optionalInputs = getAllByPlaceholderText('可选');
    expect(optionalInputs[0].props.maxLength).toBe(50);
    expect(optionalInputs[1].props.maxLength).toBe(20);
    expect(optionalInputs[2].props.maxLength).toBe(200);

    fireEvent.press(getByTestId('star-rating-5'));
    fireEvent.press(getByTestId('efficiency-slider-5'));
    fireEvent.changeText(optionalInputs[0], 'Linear algebra');
    fireEvent.changeText(optionalInputs[1], 'focused');
    fireEvent.changeText(optionalInputs[2], 'The first half was better than the second.');

    fireEvent.press(getByText('保存'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          slot_start: '2026-04-17T08:00:00.000Z',
          slot_end: '2026-04-17T09:00:00.000Z',
          rating: 5,
          efficiency: 5,
          activity: 'Linear algebra',
          mood: 'focused',
          reflection: 'The first half was better than the second.',
        }),
        undefined,
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('RatingHistoryList groups by date descending and renders themed cards', () => {
    const ratings = [
      createRating({
        id: 'older',
        slot_start: '2026-04-16T08:00:00.000Z',
        slot_end: '2026-04-16T09:00:00.000Z',
        activity: 'Read docs',
      }),
      createRating({
        id: 'newer',
        slot_start: '2026-04-17T10:00:00.000Z',
        slot_end: '2026-04-17T11:00:00.000Z',
        activity: 'Practice',
      }),
    ];
    const { getAllByText, getByText, getByTestId } = render(<RatingHistoryList ratings={ratings} />);

    expect(getByText('2026-04-17')).toBeTruthy();
    expect(getByText('2026-04-16')).toBeTruthy();
    expect(getByText('18:00 - 19:00')).toBeTruthy();
    expect(getAllByText(/EFF/)).toHaveLength(2);
    expect(getByText('Practice')).toBeTruthy();
    expect(getByTestId('rating-history-card-newer')).toBeTruthy();
  });

  it('RatingHistoryList empty state selects one quip on mount', () => {
    const { getByTestId, rerender } = render(<RatingHistoryList ratings={[]} />);
    const first = getByTestId('rating-empty-state').props.children[1].props.children;

    rerender(<RatingHistoryList ratings={[]} refreshing />);

    const second = getByTestId('rating-empty-state').props.children[1].props.children;
    expect(second).toBe(first);
  });
});
