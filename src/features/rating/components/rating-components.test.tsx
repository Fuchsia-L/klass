import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { DayView } from './DayView';
import { EfficiencySlider } from './EfficiencySlider';
import { EventPicker } from './EventPicker';
import { RatingHistoryList } from './RatingHistoryList';
import { RatingInputSheet } from './RatingInputSheet';
import { StarRating } from './StarRating';
import type { TimeSlotRating } from '../types';
import type { ScheduleEvent } from '../../schedule/types';

let mockEvents: ScheduleEvent[] = [];

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
    ChevronLeft: ({ color }: { color: string }) => <Text>{`chevron-left-${color}`}</Text>,
    ChevronRight: ({ color }: { color: string }) => <Text>{`chevron-right-${color}`}</Text>,
  };
});

jest.mock('../../schedule/hooks/useEvents', () => ({
  useEvents: () => ({
    events: mockEvents,
    loading: false,
    refresh: jest.fn(),
  }),
}));

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
    linked_event_id: overrides.linked_event_id,
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

function createEvent(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: overrides.id ?? 'event-1',
    title: overrides.title ?? 'Linear algebra',
    category: overrides.category ?? '学习',
    start_time: overrides.start_time ?? '2026-04-17T11:00:00.000Z',
    end_time: overrides.end_time ?? '2026-04-17T11:55:00.000Z',
    repeat: overrides.repeat ?? 'none',
    repeat_until: overrides.repeat_until,
    location: overrides.location,
    reminder_minutes: overrides.reminder_minutes,
    notes: overrides.notes,
    source: overrides.source,
    is_completed: overrides.is_completed ?? false,
  };
}

describe('rating UI components', () => {
  beforeEach(() => {
    mockEvents = [];
  });

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

  it('RatingInputSheet event mode pre-selects the just-finished event when created within 30min window', () => {
    mockEvents = [
      createEvent({
        id: 'just-finished',
        title: '刚结束的日程',
        start_time: '2026-04-17T11:00:00.000Z',
        end_time: '2026-04-17T11:55:00.000Z',
      }),
    ];

    const { getByTestId } = render(
      <RatingInputSheet
        visible
        now={new Date('2026-04-17T12:00:00.000Z')}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByTestId('rating-event-picker-item-just-finished').props.style).toEqual(
      expect.objectContaining({ borderColor: 'primary' }),
    );
    expect(getByTestId('rating-event-picker')).toBeTruthy();
  });

  it('RatingInputSheet saves linked_event_id when event mode is used', async () => {
    mockEvents = [
      createEvent({
        id: 'event-save',
        title: 'Saved event title',
        start_time: '2026-04-17T10:00:00.000Z',
        end_time: '2026-04-17T10:45:00.000Z',
      }),
    ];
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByTestId, getByText } = render(
      <RatingInputSheet
        visible
        now={new Date('2026-04-17T12:00:00.000Z')}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId('rating-mode-event'));
    fireEvent.press(getByTestId('rating-event-picker-item-event-save'));
    fireEvent.press(getByTestId('star-rating-5'));
    fireEvent.press(getByTestId('efficiency-slider-5'));
    fireEvent.press(getByText('保存'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          slot_start: '2026-04-17T10:00:00.000Z',
          slot_end: '2026-04-17T10:45:00.000Z',
          linked_event_id: 'event-save',
          rating: 5,
          efficiency: 5,
          activity: 'Saved event title',
        }),
        undefined,
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('EventPicker renders events, selects rows, and shows an empty state', () => {
    const onSelect = jest.fn();
    const event = createEvent({ id: 'picker-event', title: 'Picker event' });
    const { getByTestId, getByText, rerender } = render(
      <EventPicker events={[event]} selectedEventId="picker-event" onSelect={onSelect} />,
    );

    expect(getByText('Picker event')).toBeTruthy();
    fireEvent.press(getByTestId('rating-event-picker-item-picker-event'));
    expect(onSelect).toHaveBeenCalledWith(event);

    rerender(<EventPicker events={[]} onSelect={onSelect} />);
    expect(getByText('最近没有日程')).toBeTruthy();
  });

  it('DayView renders same-day events and ratings and handles block taps', () => {
    const event = createEvent({
      id: 'day-event',
      title: 'Day event',
      start_time: '2026-04-17T08:00:00.000Z',
      end_time: '2026-04-17T09:00:00.000Z',
    });
    const outsideEvent = createEvent({
      id: 'outside-event',
      title: 'Outside event',
      start_time: '2026-04-18T08:00:00.000Z',
      end_time: '2026-04-18T09:00:00.000Z',
    });
    const rating = createRating({
      id: 'day-rating',
      slot_start: '2026-04-17T10:00:00.000Z',
      slot_end: '2026-04-17T11:00:00.000Z',
      activity: 'Day rating',
    });
    const outsideRating = createRating({
      id: 'outside-rating',
      slot_start: '2026-04-18T10:00:00.000Z',
      slot_end: '2026-04-18T11:00:00.000Z',
    });
    const onPressEvent = jest.fn();
    const onPressRating = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <DayView
        events={[event, outsideEvent]}
        ratings={[rating, outsideRating]}
        date={new Date('2026-04-17T00:00:00.000Z')}
        onDateChange={jest.fn()}
        onPressEvent={onPressEvent}
        onPressRating={onPressRating}
        now={new Date('2026-04-17T12:00:00.000Z')}
      />,
    );

    fireEvent.press(getByTestId('day-view-event-day-event-0'));
    fireEvent.press(getByTestId('day-view-rating-day-rating'));

    expect(onPressEvent).toHaveBeenCalledWith(event);
    expect(onPressRating).toHaveBeenCalledWith(rating);
    expect(queryByTestId('day-view-event-outside-event-0')).toBeNull();
    expect(queryByTestId('day-view-rating-outside-rating')).toBeNull();
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
