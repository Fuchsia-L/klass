import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { EventSheet } from './EventSheet';
import { formatLocalDate } from '../../../shared/lib/date';
import type { ScheduleEvent } from '../types';

const mockAddEvent = jest.fn();
const mockUpdateEvent = jest.fn();
const mockDeleteEvent = jest.fn();
const mockToggleComplete = jest.fn();

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      overlay: 'rgba(0, 0, 0, 0.4)',
      bg: '#050816',
      primary: '#00F0FF',
      success: '#39FF14',
      accent: '#FF2D78',
      textSub: '#94A3B8',
      textMain: '#F8FAFC',
      inputBg: '#111827',
      divider: '#1E293B',
    },
    radius: {
      button: 12,
      sheet: 20,
    },
    fonts: {
      heading: 'System',
    },
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Check: ({ color }: { color: string }) => <Text>{`check-${color}`}</Text>,
    Edit3: ({ color }: { color: string }) => <Text>{`edit-${color}`}</Text>,
    Trash2: ({ color }: { color: string }) => <Text>{`trash-${color}`}</Text>,
    X: ({ color }: { color: string }) => <Text>{`close-${color}`}</Text>,
  };
});

jest.mock('../services/events.service', () => ({
  addEvent: (...args: unknown[]) => mockAddEvent(...args),
  updateEvent: (...args: unknown[]) => mockUpdateEvent(...args),
  deleteEvent: (...args: unknown[]) => mockDeleteEvent(...args),
  toggleComplete: (...args: unknown[]) => mockToggleComplete(...args),
}));

jest.mock('./DateTimePicker', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  const { formatLocalDate } = require('../../../shared/lib/date');

  return {
    __esModule: true,
    default: ({ value, onChange, mode, testID }: any) => (
      <View testID={testID ?? `mock-picker-${mode ?? 'datetime'}`}>
        <Text>{`${mode ?? 'datetime'}:${formatLocalDate(value)}`}</Text>
        <TouchableOpacity
          testID={`${testID ?? `mock-picker-${mode ?? 'datetime'}`}-advance`}
          onPress={() => {
            const nextValue = new Date(value);
            nextValue.setDate(nextValue.getDate() + 1);
            nextValue.setHours(mode === 'date' ? 12 : nextValue.getHours(), 0, 0, 0);
            onChange(nextValue);
          }}
        >
          <Text>advance</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

function createEvent(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  const start = new Date(2026, 2, 20, 8, 0, 0, 0);
  const end = new Date(2026, 2, 20, 9, 0, 0, 0);

  return {
    id: overrides.id ?? 'event-1',
    title: overrides.title ?? 'Weekly Review',
    category: overrides.category ?? '学习',
    start_time: overrides.start_time ?? start.toISOString(),
    end_time: overrides.end_time ?? end.toISOString(),
    repeat: overrides.repeat ?? 'weekly',
    repeat_until: overrides.repeat_until,
    location: overrides.location,
    reminder_minutes: overrides.reminder_minutes,
    notes: overrides.notes,
    source: overrides.source,
    is_completed: overrides.is_completed ?? false,
  };
}

describe('EventSheet repeat_until flow', () => {
  beforeEach(() => {
    mockAddEvent.mockReset();
    mockUpdateEvent.mockReset();
    mockDeleteEvent.mockReset();
    mockToggleComplete.mockReset();
    mockAddEvent.mockResolvedValue({ success: true });
    mockUpdateEvent.mockResolvedValue({ success: true });
  });

  it('shows the repeat-until picker for repeating events and clears it when repeat returns to none', () => {
    const defaultStart = new Date(2026, 2, 20, 8, 0, 0, 0);
    const defaultEnd = new Date(2026, 2, 20, 9, 0, 0, 0);
    const { queryByTestId, getByText, getByTestId } = render(
      <EventSheet
        visible
        mode="create"
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        onClose={jest.fn()}
      />,
    );

    expect(queryByTestId('repeat-until-picker')).toBeNull();

    fireEvent.press(getByText('每天'));

    expect(getByTestId('repeat-until-picker')).toBeTruthy();
    expect(getByText('未设置截止日期')).toBeTruthy();

    fireEvent.press(getByTestId('repeat-until-picker-advance'));

    expect(getByText('已选择：2026-03-21')).toBeTruthy();

    fireEvent.press(getByText('不重复'));

    expect(queryByTestId('repeat-until-picker')).toBeNull();

    fireEvent.press(getByText('每天'));

    expect(getByText('未设置截止日期')).toBeTruthy();
  });

  it('shows the correct weekly weekday hint from startTime', () => {
    const defaultStart = new Date(2026, 2, 20, 8, 0, 0, 0);
    const defaultEnd = new Date(2026, 2, 20, 9, 0, 0, 0);
    const { getByText } = render(
      <EventSheet
        visible
        mode="create"
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByText('每周'));

    expect(getByText('每周五重复')).toBeTruthy();
  });

  it('saves repeat_until as an ISO date string for create mode', async () => {
    const defaultStart = new Date(2026, 2, 20, 8, 0, 0, 0);
    const defaultEnd = new Date(2026, 2, 20, 9, 0, 0, 0);
    const onClose = jest.fn();
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <EventSheet
        visible
        mode="create"
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        onClose={onClose}
      />,
    );

    fireEvent.changeText(getByPlaceholderText('事件标题'), 'Daily Standup');
    fireEvent.press(getByText('每天'));
    fireEvent.press(getByTestId('repeat-until-picker-advance'));
    fireEvent.press(getByText('保存'));

    await waitFor(() => {
      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Daily Standup',
          repeat: 'daily',
          repeat_until: '2026-03-21',
        }),
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders repeat_until in view mode', () => {
    const { getByText } = render(
      <EventSheet
        visible
        mode="view"
        event={createEvent({ repeat: 'weekly', repeat_until: '2026-03-27' })}
        onClose={jest.fn()}
      />,
    );

    expect(getByText('截止日期')).toBeTruthy();
    expect(getByText('2026-03-27')).toBeTruthy();
  });

  it('pre-populates and saves repeat_until in edit mode', async () => {
    const event = createEvent({ repeat: 'weekly', repeat_until: '2026-03-27' });
    const { getByText } = render(
      <EventSheet visible mode="edit" event={event} onClose={jest.fn()} />,
    );

    expect(getByText(`已选择：${event.repeat_until}`)).toBeTruthy();

    fireEvent.press(getByText('保存'));

    await waitFor(() => {
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: event.id,
          repeat: 'weekly',
          repeat_until: event.repeat_until,
        }),
      );
    });
  });

  it('formats picked repeat_until dates with the shared local-date helper', () => {
    const defaultStart = new Date(2026, 2, 20, 8, 0, 0, 0);
    const defaultEnd = new Date(2026, 2, 20, 9, 0, 0, 0);
    const { getByText, getByTestId } = render(
      <EventSheet
        visible
        mode="create"
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByText('每天'));
    fireEvent.press(getByTestId('repeat-until-picker-advance'));

    expect(getByText(`已选择：${formatLocalDate(new Date(2026, 2, 21, 12, 0, 0, 0))}`)).toBeTruthy();
  });
});
