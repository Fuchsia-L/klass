import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { WhutImportWebViewContainer } from './WhutImportWebViewContainer';

jest.useFakeTimers();

jest.mock('../../../theme/ThemeContext', () => ({
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

const { __mock } = jest.requireMock('react-native-webview') as {
  __mock: {
    injectJavaScriptMock: jest.Mock;
    reloadMock: jest.Mock;
  };
};

function buildContainer() {
  const onLoggedIn = jest.fn();
  const onError = jest.fn();
  const onScheduleDetailReady = jest.fn().mockResolvedValue(undefined);
  const renderResult = render(
    <WhutImportWebViewContainer
      enabled
      onError={onError}
      onLoggedIn={onLoggedIn}
      onScheduleDetailReady={onScheduleDetailReady}
      semesterStartDate="2026-02-23"
    />,
  );

  return {
    ...renderResult,
    onLoggedIn,
    onError,
    onScheduleDetailReady,
  };
}

describe('WhutImportWebViewContainer', () => {
  beforeEach(() => {
    __mock.injectJavaScriptMock.mockClear();
    __mock.reloadMock.mockClear();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('enters syncing after jwxt home redirect and triggers schedule fetch', async () => {
    const { getByTestId, getByText, onLoggedIn } = buildContainer();

    fireEvent(getByTestId('whut-import-webview'), 'navigationStateChange', {
      url: 'https://jwxt.whut.edu.cn/jwapp/sys/homeapp/index.do',
    });

    expect(onLoggedIn).toHaveBeenCalledTimes(1);
    expect(__mock.injectJavaScriptMock).toHaveBeenCalled();

    fireEvent(getByTestId('whut-import-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          source: 'whut-import',
          type: 'session-ready',
          currentTermCode: '2025-2026-2',
        }),
      },
    });

    expect(getByText('登录与同步状态')).toBeTruthy();
    expect(__mock.injectJavaScriptMock.mock.calls.at(-1)?.[0]).toContain(
      '/jwapp/sys/homeapp/api/home/student/getMyScheduleDetail.do',
    );
  });

  it('updates state correctly for success and failure WebView messages', async () => {
    const { getByTestId, findByText, onError, onScheduleDetailReady, rerender } = buildContainer();

    fireEvent(getByTestId('whut-import-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          source: 'whut-import',
          type: 'schedule-detail-success',
          termCode: '2025-2026-2',
          scheduleDetail: {
            arrangedList: [
              {
                courseName: '高等数学',
                dayOfWeek: 1,
                beginSection: 1,
                endSection: 2,
                week: '100000000000000000000000000000',
              },
            ],
          },
        }),
      },
    });

    await waitFor(() => {
      expect(onScheduleDetailReady).toHaveBeenCalledWith({
        termCode: '2025-2026-2',
        scheduleDetail: {
          arrangedList: [
            {
              courseName: '高等数学',
              dayOfWeek: 1,
              beginSection: 1,
              endSection: 2,
              week: '100000000000000000000000000000',
            },
          ],
        },
      });
    });

    await findByText('已收到 2025-2026-2 学期的结构化课表数据，正在写入本地日程。');
    expect(onError).not.toHaveBeenCalled();

    rerender(
      <WhutImportWebViewContainer
        enabled
        onError={onError}
        onLoggedIn={jest.fn()}
        onScheduleDetailReady={onScheduleDetailReady}
        semesterStartDate="2026-02-23"
      />,
    );

    fireEvent(getByTestId('whut-import-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          source: 'whut-import',
          type: 'schedule-detail-error',
          message: '课表接口请求失败',
        }),
      },
    });

    await findByText('课表接口请求失败');
    expect(onError).toHaveBeenCalledWith('课表接口请求失败');
  });

  it('stops polling after session timeout and shows a visible error', () => {
    const { getByTestId, getByText, onError } = buildContainer();

    fireEvent(getByTestId('whut-import-webview'), 'navigationStateChange', {
      url: 'https://jwxt.whut.edu.cn/jwapp/sys/homeapp/index.do',
    });

    const callsBeforeTimeout = __mock.injectJavaScriptMock.mock.calls.length;
    expect(callsBeforeTimeout).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    expect(getByText('登录成功，但教务会话未在 15 秒内就绪，请返回后重试。')).toBeTruthy();
    expect(onError).toHaveBeenCalledWith('登录成功，但教务会话未在 15 秒内就绪，请返回后重试。');

    const callsAtTimeout = __mock.injectJavaScriptMock.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(__mock.injectJavaScriptMock.mock.calls.length).toBe(callsAtTimeout);
  });
});
