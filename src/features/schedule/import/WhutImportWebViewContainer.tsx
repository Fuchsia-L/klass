import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../../theme/ThemeContext';
import { WhutCourseTableResponseRaw } from './contracts';
import { resolveWhutTermCode } from './term-code';

const WHUT_CAS_LOGIN_URL =
  'https://zhlgd.whut.edu.cn/tpass/login?service=https%3A%2F%2Fjwxt.whut.edu.cn%2Fjwapp%2Fsys%2Fhomeapp%2Findex.do%3FforceCas%3D1';
const WHUT_LOGIN_SUCCESS_URL_FRAGMENT = 'jwxt.whut.edu.cn/jwapp/sys/homeapp';
const SESSION_POLL_INTERVAL_MS = 1000;
const SESSION_FALLBACK_DELAY_MS = 300;
const SESSION_READY_TIMEOUT_MS = 15000;

type SyncPhase = 'login' | 'session-check' | 'confirm-term' | 'fetching' | 'fetched' | 'error';

type WebViewNavigationState = {
  url: string;
};

type WebViewMessageLikeEvent = {
  nativeEvent: {
    data: string;
  };
};

type WhutWebViewMessage =
  | {
      source: 'whut-import';
      type: 'session-pending';
      attempt?: number;
    }
  | {
      source: 'whut-import';
      type: 'session-ready';
      currentTermCode?: string;
    }
  | {
      source: 'whut-import';
      type: 'session-error';
      message: string;
    }
  | {
      source: 'whut-import';
      type: 'schedule-detail-success';
      termCode: string;
      scheduleDetail: WhutCourseTableResponseRaw;
    }
  | {
      source: 'whut-import';
      type: 'schedule-detail-error';
      message: string;
    };

export type WhutImportWebViewContainerProps = {
  enabled: boolean;
  semesterStartDate: string;
  onLoggedIn: () => void;
  onError: (message: string) => void;
  onScheduleDetailReady: (payload: {
    termCode: string;
    scheduleDetail: WhutCourseTableResponseRaw;
  }) => void | Promise<void>;
};

function buildSessionProbeScript(attempt: number): string {
  return `
    (function () {
      var post = function (message) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
      };
      var extractTermCode = function (value) {
        if (!value) {
          return undefined;
        }
        if (typeof value === 'string' && /^\\d{4}-\\d{4}-[12]$/.test(value)) {
          return value;
        }
        if (typeof value !== 'object') {
          return undefined;
        }

        var candidates = [
          value.xnxqdm,
          value.termCode,
          value.xnxq,
          value.currentTermCode,
          value.currentTerm && value.currentTerm.xnxqdm,
          value.datas && value.datas.xnxqdm,
          value.data && value.data.xnxqdm
        ];

        for (var index = 0; index < candidates.length; index += 1) {
          var candidate = candidates[index];
          if (typeof candidate === 'string' && /^\\d{4}-\\d{4}-[12]$/.test(candidate)) {
            return candidate;
          }
        }

        return undefined;
      };

      var toJson = function (text) {
        try {
          return JSON.parse(text);
        } catch (error) {
          return null;
        }
      };

      var endpoints = [
        '/jwapp/sys/homeapp/api/home/getCurrentTerm.do',
        '/jwapp/sys/homeapp/api/home/student/getCurrentTerm.do',
        '/jwapp/sys/homeapp/api/home/getLoginUserInfo.do'
      ];

      var probe = async function () {
        for (var index = 0; index < endpoints.length; index += 1) {
          var endpoint = endpoints[index];

          try {
            var response = await fetch(endpoint, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json, text/plain, */*'
              }
            });
            var text = await response.text();

            if (response.redirected || /cas\/login/i.test(response.url) || /统一身份认证|login/i.test(text)) {
              continue;
            }

            if (response.ok) {
              var data = toJson(text);
              post({
                source: 'whut-import',
                type: 'session-ready',
                currentTermCode: extractTermCode(data)
              });
              return;
            }
          } catch (error) {
          }
        }

        post({ source: 'whut-import', type: 'session-pending', attempt: ${attempt} });
      };

      probe().catch(function (error) {
        post({
          source: 'whut-import',
          type: 'session-error',
          message: error && error.message ? error.message : '教务会话检查失败'
        });
      });
    })();
    true;
  `;
}

function buildScheduleFetchScript(termCode: string): string {
  return `
    (function () {
      var post = function (message) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
      };

      var request = async function () {
        try {
          var body = new URLSearchParams();
          body.append('termCode', '${termCode}');
          body.append('xnxqdm', '${termCode}');
          body.append('XNXQDM', '${termCode}');

          var response = await fetch('/jwapp/sys/homeapp/api/home/student/getMyScheduleDetail.do', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: body.toString()
          });
          var text = await response.text();

          if (response.redirected || /cas\/login/i.test(response.url) || /统一身份认证|login/i.test(text)) {
            post({
              source: 'whut-import',
              type: 'schedule-detail-error',
              message: '登录状态已失效，请重新登录后重试。'
            });
            return;
          }

          var parsed;
          try {
            parsed = JSON.parse(text);
          } catch (error) {
            post({
              source: 'whut-import',
              type: 'schedule-detail-error',
              message: '课表接口返回了无法解析的数据。'
            });
            return;
          }

          var scheduleDetail = parsed && (parsed.datas || parsed.data || parsed);
          var arrangedList = scheduleDetail && (scheduleDetail.arrangedList || scheduleDetail.kbList);

          if (!Array.isArray(arrangedList)) {
            post({
              source: 'whut-import',
              type: 'schedule-detail-error',
              message: '课表接口未返回有效的课表明细。'
            });
            return;
          }

          post({
            source: 'whut-import',
            type: 'schedule-detail-success',
            termCode: scheduleDetail.xnxqdm || parsed.xnxqdm || '${termCode}',
            scheduleDetail: scheduleDetail
          });
        } catch (error) {
          post({
            source: 'whut-import',
            type: 'schedule-detail-error',
            message: error && error.message ? error.message : '课表接口请求失败'
          });
        }
      };

      request();
    })();
    true;
  `;
}

function parseMessage(rawData: string): WhutWebViewMessage | null {
  try {
    const parsed = JSON.parse(rawData) as WhutWebViewMessage;

    if (parsed.source !== 'whut-import' || typeof parsed.type !== 'string') {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

export function WhutImportWebViewContainer({
  enabled,
  semesterStartDate,
  onLoggedIn,
  onError,
  onScheduleDetailReady,
}: WhutImportWebViewContainerProps) {
  const theme = useTheme();
  const webViewRef = React.useRef<any>(null);
  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackProbeRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginDetectedRef = React.useRef(false);
  const requestedScheduleRef = React.useRef(false);
  const [phase, setPhase] = React.useState<SyncPhase>('login');
  const [helperMessage, setHelperMessage] = React.useState('请在下方 WebView 中完成武汉理工统一认证登录。');
  const [pendingTermCode, setPendingTermCode] = React.useState<string | null>(null);
  const [pendingTermSource, setPendingTermSource] = React.useState<string | null>(null);

  const clearPolling = React.useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    if (fallbackProbeRef.current) {
      clearTimeout(fallbackProbeRef.current);
      fallbackProbeRef.current = null;
    }
  }, []);

  const fail = React.useCallback(
    (message: string) => {
      clearPolling();
      setPhase('error');
      setHelperMessage(message);
      onError(message);
    },
    [clearPolling, onError],
  );

  const injectScript = React.useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(script);
  }, []);

  const requestScheduleDetail = React.useCallback(
    (termCode: string) => {
      if (requestedScheduleRef.current) {
        return;
      }

      requestedScheduleRef.current = true;
      setPendingTermCode(null);
      setPhase('fetching');
      setHelperMessage(`教务会话已建立，正在拉取 ${termCode} 学期课表。`);
      injectScript(buildScheduleFetchScript(termCode));
    },
    [injectScript],
  );

  const startSessionPolling = React.useCallback(() => {
    clearPolling();
    requestedScheduleRef.current = false;
    setPendingTermCode(null);
    setPendingTermSource(null);
    setPhase('session-check');
    setHelperMessage('已识别到教务首页，正在建立会话并检测接口可用性。');

    let attempt = 0;
    const probe = () => {
      attempt += 1;
      injectScript(buildSessionProbeScript(attempt));
    };

    probe();
    fallbackProbeRef.current = setTimeout(probe, SESSION_FALLBACK_DELAY_MS);
    pollIntervalRef.current = setInterval(probe, SESSION_POLL_INTERVAL_MS);
    pollTimeoutRef.current = setTimeout(() => {
      fail('登录成功，但教务会话未在 15 秒内就绪，请返回后重试。');
    }, SESSION_READY_TIMEOUT_MS);
  }, [clearPolling, fail, injectScript]);

  React.useEffect(() => {
    if (!enabled) {
      clearPolling();
      loginDetectedRef.current = false;
      requestedScheduleRef.current = false;
      setPhase('login');
      setHelperMessage('请在下方 WebView 中完成武汉理工统一认证登录。');
      setPendingTermCode(null);
      setPendingTermSource(null);
    }
  }, [clearPolling, enabled]);

  React.useEffect(() => clearPolling, [clearPolling]);

  const handleNavigationStateChange = React.useCallback(
    (navigationState: WebViewNavigationState) => {
      if (!enabled || loginDetectedRef.current) {
        return;
      }

      if (navigationState.url.includes(WHUT_LOGIN_SUCCESS_URL_FRAGMENT)) {
        loginDetectedRef.current = true;
        onLoggedIn();
        startSessionPolling();
      }
    },
    [enabled, onLoggedIn, startSessionPolling],
  );

  const handleMessage = React.useCallback(
    async (event: WebViewMessageLikeEvent) => {
      const message = parseMessage(event.nativeEvent.data);

      if (!message) {
        return;
      }

      if (message.type === 'session-pending') {
        setPhase('session-check');
        setHelperMessage(`教务会话准备中，正在进行第 ${message.attempt ?? 1} 次检测。`);
        return;
      }

      if (message.type === 'session-error') {
        fail(message.message);
        return;
      }

      if (message.type === 'session-ready') {
        clearPolling();

        const resolved = resolveWhutTermCode({
          currentTermCode: message.currentTermCode,
          semesterStartDate,
        });

        if (!resolved.termCode || !resolved.source) {
          fail('无法确定当前学期编码，请检查学期配置后重试。');
          return;
        }

        if (resolved.needsConfirmation) {
          setPendingTermCode(resolved.termCode);
          setPendingTermSource(resolved.source);
          setPhase('confirm-term');
          setHelperMessage(`未从教务系统上下文拿到当前学期，建议使用 ${resolved.termCode} 继续。`);
          return;
        }

        requestScheduleDetail(resolved.termCode);
        return;
      }

      if (message.type === 'schedule-detail-error') {
        fail(message.message);
        return;
      }

      if (message.type === 'schedule-detail-success') {
        setPhase('fetched');
        setHelperMessage(`已收到 ${message.termCode} 学期的结构化课表数据，正在写入本地日程。`);
        await onScheduleDetailReady({
          termCode: message.termCode,
          scheduleDetail: message.scheduleDetail,
        });
      }
    },
    [clearPolling, fail, onScheduleDetailReady, requestScheduleDetail, semesterStartDate],
  );

  return (
    <View style={styles.wrapper} testID="whut-webview-container">
      <View
        style={[
          styles.webviewFrame,
          {
            backgroundColor: theme.colors.inputBg,
            borderColor: phase === 'error' ? theme.colors.danger : theme.colors.divider,
          },
        ]}
      >
        <WebView
          incognito
          javaScriptEnabled
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}
          ref={webViewRef}
          sharedCookiesEnabled
          source={{ uri: WHUT_CAS_LOGIN_URL }}
          startInLoadingState
          testID="whut-import-webview"
        />
      </View>

      <View
        style={[
          styles.helperCard,
          { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.divider },
        ]}
      >
        <View style={styles.helperHeaderRow}>
          <Text style={[styles.helperTitle, { color: theme.colors.textMain }]}>登录与同步状态</Text>
          {(phase === 'session-check' || phase === 'fetching') && (
            <ActivityIndicator color={theme.colors.primary} testID="whut-webview-loading" />
          )}
        </View>
        <Text style={[styles.helperText, { color: theme.colors.textSub }]}>{helperMessage}</Text>
        {pendingTermSource ? (
          <Text style={[styles.termHint, { color: theme.colors.textSub }]}>
            默认值来源：{pendingTermSource === 'semester-config' ? '学期配置' : '当前日期'}
          </Text>
        ) : null}
        {phase === 'confirm-term' && pendingTermCode ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => requestScheduleDetail(pendingTermCode)}
            style={[
              styles.confirmButton,
              { backgroundColor: theme.colors.primary },
            ]}
            testID="whut-confirm-term-button"
          >
            <Text style={[styles.confirmButtonText, { color: theme.colors.bg }]}>
              使用 {pendingTermCode} 继续
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  webviewFrame: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 320,
  },
  helperCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  helperHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  helperTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
  },
  termHint: {
    fontSize: 12,
  },
  confirmButton: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
