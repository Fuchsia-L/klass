import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from './settings';
import { WhutImportModal } from '../src/features/schedule/import/WhutImportModal';
import { loadEvents, resetEventsState } from '../src/features/schedule/services/events.service';
import { clearEventsCache } from '../src/features/schedule/storage/events.storage';
import type { SyncSchedulerStatus, SyncSchedulerStatusListener } from '../src/features/rating';

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = require('react-native');

  return ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? React.createElement(View, { testID: 'mock-modal' }, children) : null;
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
  }),
}));

jest.mock('../src/features/settings', () => ({
  useSettingsForm: jest.fn(),
}));

jest.mock('../src/features/settings/services/rating-export.service', () => ({
  exportLocalRatingsAsJson: jest.fn(),
}));

jest.mock('../src/features/rating/sync/wiring', () => {
  const mockScheduler = {
    start: jest.fn(),
    stop: jest.fn(),
    pullNow: jest.fn().mockResolvedValue(undefined),
    notifyLocalChange: jest.fn(),
    getStatus: jest.fn(),
    onStatusChange: jest.fn(),
  };

  return {
    __esModule: true,
    SYNC_TOKEN_STORAGE_KEY: 'cs-rn:sync-token',
    getConfiguredSyncScheduler: jest.fn(() => mockScheduler),
    loadSyncToken: jest.fn().mockResolvedValue(null),
    saveSyncToken: jest.fn().mockResolvedValue(undefined),
    clearSyncToken: jest.fn().mockResolvedValue(undefined),
    __mockScheduler: mockScheduler,
  };
});

jest.mock('../src/features/schedule/import/WhutImportWebViewContainer', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');

  const successPayload = {
    termCode: '2025-2026-2',
    scheduleDetail: {
      xnxqdm: '2025-2026-2',
      kbList: [
        {
          kcmc: '高等数学',
          xqj: '1',
          ksjc: '1',
          jsjc: '2',
          zcd: '110000000000000000000000000000',
          cdmc: '鉴湖教学楼',
          jsxx: '张老师',
        },
      ],
    },
  };

  return {
    WhutImportWebViewContainer: ({ onError, onLoggedIn, onScheduleDetailReady }: any) => (
      <View testID="mock-whut-webview-container">
        <Text>登录与同步状态</Text>
        <Text>Mock WHUT WebView</Text>
        <TouchableOpacity
          testID="mock-whut-error-button"
          onPress={() => onError('课表接口请求失败')}
        >
          <Text>模拟失败</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="mock-whut-success-button"
          onPress={async () => {
            onLoggedIn();
            await onScheduleDetailReady(successPayload);
          }}
        >
          <Text>模拟成功</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

const { useSettingsForm } = jest.requireMock('../src/features/settings') as {
  useSettingsForm: jest.Mock;
};
const { exportLocalRatingsAsJson } = jest.requireMock(
  '../src/features/settings/services/rating-export.service',
) as {
  exportLocalRatingsAsJson: jest.Mock;
};

const wiringMock = jest.requireMock('../src/features/rating/sync/wiring') as {
  getConfiguredSyncScheduler: jest.Mock;
  loadSyncToken: jest.Mock;
  saveSyncToken: jest.Mock;
  clearSyncToken: jest.Mock;
  __mockScheduler: {
    start: jest.Mock;
    stop: jest.Mock;
    pullNow: jest.Mock;
    notifyLocalChange: jest.Mock;
    getStatus: jest.Mock<SyncSchedulerStatus, []>;
    onStatusChange: jest.Mock<() => void, [SyncSchedulerStatusListener]>;
  };
};

function resetSyncSchedulerMock(initialStatus: SyncSchedulerStatus = { kind: 'idle', lastSyncAt: null }) {
  const scheduler = wiringMock.__mockScheduler;
  scheduler.start.mockReset();
  scheduler.stop.mockReset();
  scheduler.pullNow.mockReset().mockResolvedValue(undefined);
  scheduler.notifyLocalChange.mockReset();
  scheduler.getStatus.mockReset().mockReturnValue(initialStatus);
  scheduler.onStatusChange.mockReset().mockImplementation(() => () => {});
  wiringMock.getConfiguredSyncScheduler.mockClear();
  wiringMock.loadSyncToken.mockReset().mockResolvedValue(null);
  wiringMock.saveSyncToken.mockReset().mockResolvedValue(undefined);
  wiringMock.clearSyncToken.mockReset().mockResolvedValue(undefined);
}

function buildSettingsFormMock(overrides?: Partial<ReturnType<typeof useSettingsForm>>) {
  return {
    form: {
      semesterStart: '2026-02-23',
      totalWeeks: '18',
    },
    loading: false,
    saving: false,
    message: '',
    themeName: 'cyber',
    updateField: jest.fn(),
    save: jest.fn(),
    setThemeName: jest.fn(),
    resetAll: jest.fn(),
    ...overrides,
  };
}

describe('SettingsScreen WHUT import entry', () => {
  beforeEach(() => {
    useSettingsForm.mockReturnValue(buildSettingsFormMock());
    exportLocalRatingsAsJson.mockResolvedValue({
      count: 0,
      json: '[]',
      method: 'react-native-share',
    });
    resetSyncSchedulerMock();
    resetEventsState();
    clearEventsCache();
  });

  it('opens the import modal and hides it when closed before import starts', () => {
    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('open-whut-import-button'));

    expect(getByText('武汉理工教务导入')).toBeTruthy();

    fireEvent.press(getByTestId('whut-import-close-button'));

    expect(queryByText('武汉理工教务导入')).toBeNull();
  });

  it('blocks import continuation when semester start date is missing', () => {
    useSettingsForm.mockReturnValue(
      buildSettingsFormMock({
        form: {
          semesterStart: '',
          totalWeeks: '18',
        },
      }),
    );

    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('open-whut-import-button'));
    fireEvent.press(getByTestId('whut-import-begin-button'));

    expect(getByText('请先填写学期开始日期，再导入武汉理工课表。')).toBeTruthy();
    expect(queryByText('等待登录武汉理工教务系统')).toBeNull();
  });

  it('confirms cancellation during an active import flow and closes safely after confirmation', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('open-whut-import-button'));
    fireEvent.press(getByTestId('whut-import-begin-button'));

    expect(getByText('等待登录武汉理工教务系统')).toBeTruthy();

    fireEvent.press(getByTestId('whut-import-close-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      '取消导入',
      '当前导入流程尚未完成，确定要取消吗？',
      expect.any(Array),
    );

    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const confirmButton = buttons.find((button) => button.text === '确认取消');

    act(() => {
      confirmButton?.onPress?.();
    });

    expect(queryByText('武汉理工教务导入')).toBeNull();
  });

  it('completes the import flow, persists events, and shows imported count before closing', async () => {
    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('open-whut-import-button'));
    fireEvent.press(getByTestId('whut-import-begin-button'));

    await act(async () => {
      fireEvent.press(getByTestId('mock-whut-success-button'));
    });

    expect(getByText('导入成功')).toBeTruthy();
    expect(getByText('本次共导入 2 条课程事件。')).toBeTruthy();
    expect(getByText('学期：2025-2026-2')).toBeTruthy();

    await waitFor(async () => {
      const storedEvents = await loadEvents();

      expect(storedEvents.filter((event) => event.source === 'whut-import')).toHaveLength(2);
      expect(storedEvents.map((event) => event.title)).toEqual(['高等数学', '高等数学']);
    });

    fireEvent.press(getByTestId('whut-import-begin-button'));

    expect(queryByText('武汉理工教务导入')).toBeNull();
  });

  it('allows retrying after a failed import and succeeds without leaving the modal', async () => {
    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('open-whut-import-button'));
    fireEvent.press(getByTestId('whut-import-begin-button'));
    fireEvent.press(getByTestId('mock-whut-error-button'));

    expect(getByText('导入失败')).toBeTruthy();
    expect(getByText('课表接口请求失败')).toBeTruthy();
    expect(getByText('重试导入')).toBeTruthy();

    fireEvent.press(getByTestId('whut-import-begin-button'));

    expect(queryByText('课表接口请求失败')).toBeNull();
    expect(getByText('等待登录武汉理工教务系统')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('mock-whut-success-button'));
    });

    await waitFor(async () => {
      const storedEvents = await loadEvents();

      expect(storedEvents.filter((event) => event.source === 'whut-import')).toHaveLength(2);
    });

    expect(getByText('导入成功')).toBeTruthy();
  });
});

describe('SettingsScreen rating export', () => {
  beforeEach(() => {
    useSettingsForm.mockReturnValue(buildSettingsFormMock());
    exportLocalRatingsAsJson.mockResolvedValue({
      count: 1,
      json: '[{"id":"rating-1"}]',
      method: 'react-native-share',
    });
    resetSyncSchedulerMock();
  });

  it('renders the rating export action and delegates to the export helper', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const { getByTestId, getByText } = render(<SettingsScreen />);

    expect(getByText('导出打分数据')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('export-ratings-button'));
    });

    expect(exportLocalRatingsAsJson).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('导出打分数据', '已准备 1 条打分记录。');
  });
});

describe('SettingsScreen cloud sync section', () => {
  beforeEach(() => {
    useSettingsForm.mockReturnValue(buildSettingsFormMock());
    exportLocalRatingsAsJson.mockResolvedValue({
      count: 0,
      json: '[]',
      method: 'react-native-share',
    });
    resetSyncSchedulerMock();
  });

  it('renders the 云端同步 section above 数据管理 with a status row', async () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('cloud-sync-section')).toBeTruthy();
    });

    expect(getByText('云端同步')).toBeTruthy();
    expect(getByTestId('sync-token-input')).toBeTruthy();
    expect(getByTestId('save-sync-token-button')).toBeTruthy();
    expect(getByTestId('sync-status-row')).toBeTruthy();
    expect(getByTestId('manual-sync-button')).toBeTruthy();
  });

  it('uses a secureTextEntry TextInput for the token field', async () => {
    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('sync-token-input')).toBeTruthy();
    });

    const input = getByTestId('sync-token-input');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('persists a new token to AsyncStorage and triggers scheduler.start + pullNow', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    const actualWiring = jest.requireActual('../src/features/rating/sync/wiring') as {
      saveSyncToken: (token: string) => Promise<void>;
    };
    wiringMock.saveSyncToken.mockImplementation(actualWiring.saveSyncToken);

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('sync-token-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('sync-token-input'), 'secret-token-123');

    await act(async () => {
      fireEvent.press(getByTestId('save-sync-token-button'));
    });

    expect(wiringMock.saveSyncToken).toHaveBeenCalledWith('secret-token-123');
    expect(setItemSpy).toHaveBeenCalledWith('cs-rn:sync-token', 'secret-token-123');
    expect(wiringMock.__mockScheduler.start).toHaveBeenCalledTimes(1);
    expect(wiringMock.__mockScheduler.pullNow).toHaveBeenCalledTimes(1);
  });

  it('removes the AsyncStorage key when saving an empty token', async () => {
    await AsyncStorage.setItem('cs-rn:sync-token', 'previous-token');
    const removeSpy = jest.spyOn(AsyncStorage, 'removeItem');
    const actualWiring = jest.requireActual('../src/features/rating/sync/wiring') as {
      saveSyncToken: (token: string) => Promise<void>;
    };
    wiringMock.saveSyncToken.mockImplementation(actualWiring.saveSyncToken);

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('sync-token-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('sync-token-input'), '   ');

    await act(async () => {
      fireEvent.press(getByTestId('save-sync-token-button'));
    });

    expect(wiringMock.saveSyncToken).toHaveBeenCalledWith('');
    expect(removeSpy).toHaveBeenCalledWith('cs-rn:sync-token');
    expect(wiringMock.__mockScheduler.start).not.toHaveBeenCalled();
    expect(wiringMock.__mockScheduler.pullNow).not.toHaveBeenCalled();
    await waitFor(async () => {
      expect(await AsyncStorage.getItem('cs-rn:sync-token')).toBeNull();
    });
  });

  it('invokes scheduler.notifyLocalChange and scheduler.pullNow from the 立即同步 button', async () => {
    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('manual-sync-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('manual-sync-button'));
    });

    expect(wiringMock.__mockScheduler.notifyLocalChange).toHaveBeenCalledTimes(1);
    expect(wiringMock.__mockScheduler.pullNow).toHaveBeenCalledTimes(1);
  });

  it('renders the unconfigured status copy', async () => {
    wiringMock.__mockScheduler.getStatus.mockReturnValue({ kind: 'unconfigured' });

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('sync-status-text').props.children).toBe('未配置云端同步');
    });
  });

  it('renders the syncing status copy', async () => {
    wiringMock.__mockScheduler.getStatus.mockReturnValue({
      kind: 'syncing',
      lastSyncAt: null,
    });

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('sync-status-text').props.children).toBe('同步中...');
    });
  });

  it('renders idle(never) and error message copy', async () => {
    wiringMock.__mockScheduler.getStatus.mockReturnValue({
      kind: 'idle',
      lastSyncAt: null,
    });

    let listenerCapture: SyncSchedulerStatusListener | null = null;
    wiringMock.__mockScheduler.onStatusChange.mockImplementation((listener) => {
      listenerCapture = listener;
      return () => {};
    });

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('sync-status-text').props.children).toBe('尚未同步');
    });

    act(() => {
      listenerCapture?.({
        kind: 'error',
        message: '网络异常 · 5s 后重试',
        lastSyncAt: null,
      });
    });

    expect(getByTestId('sync-status-text').props.children).toBe('网络异常 · 5s 后重试');

    act(() => {
      listenerCapture?.({
        kind: 'error',
        message: 'token 无效',
        lastSyncAt: null,
      });
    });

    expect(getByTestId('sync-status-text').props.children).toBe('token 无效');
  });

  it('refreshes relative-time label after 30 seconds without manual remount', async () => {
    const baseTime = new Date('2026-04-18T12:00:00.000Z').getTime();
    jest.useFakeTimers();
    jest.setSystemTime(baseTime);

    try {
      wiringMock.__mockScheduler.getStatus.mockReturnValue({
        kind: 'idle',
        lastSyncAt: new Date(baseTime - 30 * 1000).toISOString(),
      });

      const { getByTestId } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByTestId('sync-status-text').props.children).toBe('同步于 刚刚');
      });

      act(() => {
        jest.setSystemTime(baseTime + 90 * 1000);
        jest.advanceTimersByTime(30_000);
      });

      expect(getByTestId('sync-status-text').props.children).toBe('同步于 2 分钟前');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('WhutImportModal state rendering', () => {
  it('renders waiting, syncing, success, and error states', () => {
    const onBeginImport = jest.fn();
    const onRequestClose = jest.fn();
    const { getByText, getByTestId, rerender } = render(
      <WhutImportModal
        semesterConfig={{ start_date: '2026-02-23', total_weeks: 18 }}
        visible
        status="waiting-login"
        onBeginImport={onBeginImport}
        onImportError={jest.fn()}
        onImportStatusChange={jest.fn()}
        onScheduleDetailReady={jest.fn()}
        onRequestClose={onRequestClose}
      />,
    );

    expect(getByText('等待登录武汉理工教务系统')).toBeTruthy();
    expect(getByText('登录与同步状态')).toBeTruthy();

    rerender(
      <WhutImportModal
        semesterConfig={{ start_date: '2026-02-23', total_weeks: 18 }}
        visible
        status="syncing"
        onBeginImport={onBeginImport}
        onImportError={jest.fn()}
        onImportStatusChange={jest.fn()}
        onScheduleDetailReady={jest.fn()}
        onRequestClose={onRequestClose}
      />,
    );

    expect(getByText('正在同步课表数据')).toBeTruthy();
    expect(getByTestId('whut-import-loading')).toBeTruthy();

    rerender(
      <WhutImportModal
        semesterConfig={{ start_date: '2026-02-23', total_weeks: 18 }}
        visible
        status="success"
        importedCount={6}
        importedTermCode="2025-2026-2"
        onBeginImport={onBeginImport}
        onImportError={jest.fn()}
        onImportStatusChange={jest.fn()}
        onScheduleDetailReady={jest.fn()}
        onRequestClose={onRequestClose}
      />,
    );

    expect(getByText('导入成功')).toBeTruthy();
    expect(getByText('本次共导入 6 条课程事件。')).toBeTruthy();
    expect(getByText('完成并关闭')).toBeTruthy();

    rerender(
      <WhutImportModal
        semesterConfig={{ start_date: '2026-02-23', total_weeks: 18 }}
        visible
        status="error"
        errorMessage="导入失败，请稍后重试。"
        onBeginImport={onBeginImport}
        onImportError={jest.fn()}
        onImportStatusChange={jest.fn()}
        onScheduleDetailReady={jest.fn()}
        onRequestClose={onRequestClose}
      />,
    );

    expect(getByText('导入失败')).toBeTruthy();
    expect(getByText('导入失败，请稍后重试。')).toBeTruthy();
    expect(getByText('重试导入')).toBeTruthy();
  });

  it('blocks retry when semester start date is unavailable', () => {
    const onBeginImport = jest.fn();
    const onImportError = jest.fn();
    const onImportStatusChange = jest.fn();
    const { getByTestId } = render(
      <WhutImportModal
        semesterConfig={{ start_date: '   ', total_weeks: 18 }}
        visible
        status="error"
        errorMessage="课表接口请求失败"
        onBeginImport={onBeginImport}
        onImportError={onImportError}
        onImportStatusChange={onImportStatusChange}
        onScheduleDetailReady={jest.fn()}
        onRequestClose={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('whut-import-begin-button'));

    expect(onBeginImport).not.toHaveBeenCalled();
    expect(onImportStatusChange).toHaveBeenCalledWith('idle');
    expect(onImportError).toHaveBeenCalledWith('请先填写学期开始日期，再导入武汉理工课表。');
  });
});
