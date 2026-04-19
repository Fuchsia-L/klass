import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import RatingScreen from './rating';
import { createRating } from '../src/features/rating/services';
import { clearRatingsCache } from '../src/features/rating/storage';

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockModal = ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? <View testID="mock-modal">{children}</View> : null;

  return {
    __esModule: true,
    default: MockModal,
  };
});

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
  FAB: ({ onPress }: { onPress: () => void }) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');

    return (
      <TouchableOpacity onPress={onPress} testID="fab-button">
        <Text>FAB</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useThemeSettings: () => ({ themeName: 'cyber', setThemeName: jest.fn() }),
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

jest.mock('../src/features/schedule/hooks/useEvents', () => ({
  useEvents: () => ({
    events: [],
    loading: false,
    refresh: jest.fn(),
  }),
}));

jest.mock('../src/features/rating', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  const actual = jest.requireActual('../src/features/rating');

  return {
    ...actual,
    RatingInputSheet: ({ visible, defaultStart, defaultEnd, onSave, onClose }: any) =>
      visible ? (
        <View testID="mock-rating-input-sheet">
          <Text testID="mock-rating-default-start">{defaultStart.toISOString()}</Text>
          <Text testID="mock-rating-default-end">{defaultEnd.toISOString()}</Text>
          <TouchableOpacity
            testID="mock-save-rating"
            onPress={async () => {
              await onSave({
                slot_start: defaultStart.toISOString(),
                slot_end: defaultEnd.toISOString(),
                rating: 4,
                efficiency: 5,
                activity: 'Mock focus',
              });
              onClose();
            }}
          >
            <Text>save rating</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

describe('RatingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));
    clearRatingsCache();
  });

  afterEach(() => {
    jest.useRealTimers();
    clearRatingsCache();
  });

  it('shows the empty history quip with the FAB direction indicator', async () => {
    const { getByTestId, getByText } = render(<RatingScreen />);

    fireEvent.press(getByTestId('rating-tab-list'));

    await waitFor(() => {
      expect(getByTestId('rating-empty-state')).toBeTruthy();
    });

    expect(getByText('↘')).toBeTruthy();
  });

  it('opens the input sheet from the FAB with a one-hour default slot', async () => {
    const { getByTestId } = render(<RatingScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('fab-button'));
    });

    expect(getByTestId('mock-rating-default-start').props.children).toBe('2026-04-17T11:00:00.000Z');
    expect(getByTestId('mock-rating-default-end').props.children).toBe('2026-04-17T12:00:00.000Z');
  });

  it('saves through useRatings, closes the sheet, and refreshes the history list', async () => {
    const { getByTestId, queryByTestId, getByText } = render(<RatingScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('fab-button'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('mock-save-rating'));
    });

    fireEvent.press(getByTestId('rating-tab-list'));

    await waitFor(() => {
      expect(queryByTestId('mock-rating-input-sheet')).toBeNull();
      expect(getByText('Mock focus')).toBeTruthy();
    });
  });

  it('loads previously saved ratings from AsyncStorage-backed storage', async () => {
    await act(async () => {
      await createRating({
        slot_start: '2026-04-17T08:00:00.000Z',
        slot_end: '2026-04-17T09:00:00.000Z',
        rating: 5,
        efficiency: 4,
        activity: 'Persisted study block',
      });
    });

    clearRatingsCache();

    const { getByTestId, getByText } = render(<RatingScreen />);

    fireEvent.press(getByTestId('rating-tab-list'));

    await waitFor(() => {
      expect(getByText('Persisted study block')).toBeTruthy();
    });
  });

  it('opens a read-only detail modal from a history card', async () => {
    let savedId = '';

    await act(async () => {
      const saved = await createRating({
        slot_start: '2026-04-17T08:00:00.000Z',
        slot_end: '2026-04-17T09:00:00.000Z',
        rating: 5,
        efficiency: 4,
        activity: 'Detail study block',
        mood: 'focused',
        reflection: 'Kept a clean pace.',
      });
      savedId = saved.id;
    });

    const { getAllByText, getByTestId, getByText, queryByText } = render(<RatingScreen />);

    fireEvent.press(getByTestId('rating-tab-list'));

    await waitFor(() => {
      expect(getByTestId(`rating-history-card-${savedId}`)).toBeTruthy();
    });

    fireEvent.press(getByTestId(`rating-history-card-${savedId}`));

    expect(getByTestId('rating-detail-modal')).toBeTruthy();
    expect(getByText('RATING DETAIL')).toBeTruthy();
    expect(getAllByText('Detail study block').length).toBeGreaterThanOrEqual(2);
    expect(getByText('focused')).toBeTruthy();
    expect(getByText('Kept a clean pace.')).toBeTruthy();
    expect(queryByText('保存')).toBeNull();
  });

  it('renders a 删除 button in the detail modal and triggers the Alert with the spec copy', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    let savedId = '';

    await act(async () => {
      const saved = await createRating({
        slot_start: '2026-04-17T08:00:00.000Z',
        slot_end: '2026-04-17T09:00:00.000Z',
        rating: 3,
        efficiency: 3,
        activity: 'Block to delete',
      });
      savedId = saved.id;
    });

    const { getByTestId, getByText } = render(<RatingScreen />);

    fireEvent.press(getByTestId('rating-tab-list'));

    await waitFor(() => {
      expect(getByTestId(`rating-history-card-${savedId}`)).toBeTruthy();
    });

    fireEvent.press(getByTestId(`rating-history-card-${savedId}`));

    const deleteButton = getByTestId('rating-detail-delete-button');
    expect(deleteButton).toBeTruthy();
    expect(getByText('删除')).toBeTruthy();

    fireEvent.press(deleteButton);

    expect(alertSpy).toHaveBeenCalledWith(
      '删除这条打分？',
      '删除后本地列表和云端都不再显示，可通过同步协议恢复。',
      expect.any(Array),
    );

    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      style?: string;
      onPress?: () => void;
    }>;
    const cancelButton = buttons.find((button) => button.text === '取消');
    const deleteConfirmButton = buttons.find((button) => button.text === '删除');

    expect(cancelButton?.style).toBe('cancel');
    expect(deleteConfirmButton?.style).toBe('destructive');
  });

  it('leaves the record untouched when Alert is canceled', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    let savedId = '';

    await act(async () => {
      const saved = await createRating({
        slot_start: '2026-04-17T08:00:00.000Z',
        slot_end: '2026-04-17T09:00:00.000Z',
        rating: 4,
        efficiency: 4,
        activity: 'Do not delete me',
      });
      savedId = saved.id;
    });

    const { getAllByText, getByTestId, queryByText } = render(<RatingScreen />);

    fireEvent.press(getByTestId('rating-tab-list'));

    await waitFor(() => {
      expect(getByTestId(`rating-history-card-${savedId}`)).toBeTruthy();
    });

    fireEvent.press(getByTestId(`rating-history-card-${savedId}`));
    fireEvent.press(getByTestId('rating-detail-delete-button'));

    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const cancelButton = buttons.find((button) => button.text === '取消');

    act(() => {
      cancelButton?.onPress?.();
    });

    expect(getByTestId('rating-detail-modal')).toBeTruthy();
    expect(getAllByText('Do not delete me').length).toBeGreaterThanOrEqual(2);
    expect(queryByText('未填写活动')).toBeNull();
  });

  it('removes the rating, closes the modal, and refreshes the list on destructive confirm', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    let savedId = '';

    await act(async () => {
      const saved = await createRating({
        slot_start: '2026-04-17T08:00:00.000Z',
        slot_end: '2026-04-17T09:00:00.000Z',
        rating: 2,
        efficiency: 2,
        activity: 'About to be deleted',
      });
      savedId = saved.id;
    });

    const { getByTestId, queryByTestId, queryByText } = render(<RatingScreen />);

    fireEvent.press(getByTestId('rating-tab-list'));

    await waitFor(() => {
      expect(getByTestId(`rating-history-card-${savedId}`)).toBeTruthy();
    });

    fireEvent.press(getByTestId(`rating-history-card-${savedId}`));
    fireEvent.press(getByTestId('rating-detail-delete-button'));

    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const confirmButton = buttons.find((button) => button.text === '删除');

    await act(async () => {
      await confirmButton?.onPress?.();
    });

    await waitFor(() => {
      expect(queryByTestId('rating-detail-modal')).toBeNull();
      expect(queryByTestId(`rating-history-card-${savedId}`)).toBeNull();
      expect(queryByText('About to be deleted')).toBeNull();
    });
  });

  it('defaults to 日视图 and reveals the history list from 列表', async () => {
    const { getByTestId, getByText } = render(<RatingScreen />);

    expect(getByTestId('day-view')).toBeTruthy();

    fireEvent.press(getByTestId('rating-tab-list'));

    await waitFor(() => {
      expect(getByTestId('rating-empty-state')).toBeTruthy();
      expect(getByText('列表')).toBeTruthy();
    });
  });
});
