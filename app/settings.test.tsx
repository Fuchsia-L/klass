import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from './settings';
import { WhutImportModal } from '../src/features/schedule/import/WhutImportModal';
import { loadEvents, resetEventsState } from '../src/features/schedule/services/events.service';
import { clearEventsCache } from '../src/features/schedule/storage/events.storage';

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
