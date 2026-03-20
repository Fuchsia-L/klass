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

const WHUT_CAS_LOGIN_URL =
  'https://zhlgd.whut.edu.cn/tpass/login?service=https%3A%2F%2Fjwxt.whut.edu.cn%2Fjwapp%2Fsys%2Fhomeapp%2Findex.do%3FforceCas%3D1';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60000;
const SESSION_READY_TIMEOUT_MS = 15000;

type SyncPhase = 'login' | 'session-check' | 'confirm-term' | 'fetching' | 'fetched' | 'error';

type WebViewMessageLikeEvent = {
  nativeEvent: {
    data: string;
  };
};

type WhutWebViewMessage =
  | { source: 'whut-import'; type: 'probe-login' }
  | { source: 'whut-import'; type: 'probe-waiting' }
  | { source: 'whut-import'; type: 'probe-ready'; termCode?: string; semesterStart?: string; totalWeeks?: number }
  | { source: 'whut-import'; type: 'probe-error'; message: string }
  | { source: 'whut-import'; type: 'session-ready'; currentTermCode?: string }
  | {
      source: 'whut-import';
      type: 'schedule-detail-success';
      termCode: string;
      scheduleDetail: WhutCourseTableResponseRaw;
    }
  | { source: 'whut-import'; type: 'schedule-detail-error'; message: string };

export type WhutImportWebViewContainerProps = {
  enabled: boolean;
  semesterStartDate: string;
  onLoggedIn: () => void;
  onError: (message: string) => void;
  onScheduleDetailReady: (payload: {
    termCode: string;
    scheduleDetail: WhutCourseTableResponseRaw;
    semesterStart?: string;
    totalWeeks?: number;
  }) => void | Promise<void>;
};

/**
 * All-in-one probe script.
 * It checks the current page URL and tries the API.
 * Posts one of: probe-login, probe-waiting, probe-ready, probe-error.
 */
function buildProbeScript(): string {
  return `
    (function () {
      var post = function (msg) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      };

      var currentUrl = window.location.href || '';

      if (/tpass\\/login|cas\\/login/i.test(currentUrl) || /zhlgd\\.whut\\.edu\\.cn/i.test(currentUrl)) {
        post({ source: 'whut-import', type: 'probe-login' });
        return;
      }

      var tryApi = async function () {
        try {
          // Step 1: check if session is alive
          var r = await fetch('/jwapp/sys/homeapp/api/home/getCurrentTerm.do', {
            method: 'GET', credentials: 'include',
            headers: { 'Accept': 'application/json, text/plain, */*' }
          });
          var text = await r.text();
          var data = null;
          try { data = JSON.parse(text); } catch (e) {}

          if (!data) {
            post({ source: 'whut-import', type: 'probe-waiting' });
            return;
          }

          // Step 2: session alive — figure out current term via getTermWeeks
          // We try a reasonable default term code first
          var now = new Date();
          var year = now.getFullYear();
          var month = now.getMonth() + 1;
          var guessedTerm = month >= 8 ? (year + '-' + (year + 1) + '-1') : ((year - 1) + '-' + year + '-2');

          var termCode = guessedTerm;
          var semesterStart = undefined;
          var totalWeeks = undefined;

          try {
            var twBody = new URLSearchParams();
            twBody.append('termCode', guessedTerm);
            var twR = await fetch('/jwapp/sys/homeapp/api/home/getTermWeeks.do', {
              method: 'POST', credentials: 'include',
              headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
              },
              body: twBody.toString()
            });
            var twText = await twR.text();
            var twData = null;
            try { twData = JSON.parse(twText); } catch (e) {}

            if (twData && twData.code === '0' && Array.isArray(twData.datas) && twData.datas.length > 0) {
              var weeks = twData.datas;
              totalWeeks = weeks.length;
              // First week's startDate = semester start
              var firstWeek = weeks[0];
              if (firstWeek.startDate) {
                semesterStart = firstWeek.startDate.substring(0, 10);
              }
              // Extract termCode from data if available
              if (firstWeek.term && /^\\d{4}-\\d{4}-[12]$/.test(firstWeek.term)) {
                termCode = firstWeek.term;
              }
            }
          } catch (e) {
            // getTermWeeks failed — continue with guessed term, user will need manual date
          }

          post({
            source: 'whut-import',
            type: 'probe-ready',
            termCode: termCode,
            semesterStart: semesterStart,
            totalWeeks: totalWeeks
          });
        } catch (e) {
          post({ source: 'whut-import', type: 'probe-waiting' });
        }
      };

      tryApi();
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

          if (response.redirected || /cas\\/login|tpass\\/login/i.test(response.url)) {
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
  } catch {
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
  const sessionReadyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginNotifiedRef = React.useRef(false);
  const sessionReadyRef = React.useRef(false);
  const requestedScheduleRef = React.useRef(false);
  const probeDataRef = React.useRef<{ semesterStart: string; totalWeeks: number } | null>(null);
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
    if (sessionReadyTimeoutRef.current) {
      clearTimeout(sessionReadyTimeoutRef.current);
      sessionReadyTimeoutRef.current = null;
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
      if (requestedScheduleRef.current) return;
      requestedScheduleRef.current = true;
      setPendingTermCode(null);
      setPhase('fetching');
      setHelperMessage(`教务会话已建立，正在拉取 ${termCode} 学期课表。`);
      injectScript(buildScheduleFetchScript(termCode));
    },
    [injectScript],
  );

  const notifyLoggedIn = React.useCallback(() => {
    if (!loginNotifiedRef.current) {
      loginNotifiedRef.current = true;
      onLoggedIn();
    }

    setPhase('session-check');
    setHelperMessage('登录成功，等待教务系统初始化...');

    if (!sessionReadyRef.current && !sessionReadyTimeoutRef.current) {
      sessionReadyTimeoutRef.current = setTimeout(() => {
        if (!sessionReadyRef.current) {
          fail('登录成功，但教务会话未在 15 秒内就绪，请返回后重试。');
        }
      }, SESSION_READY_TIMEOUT_MS);
    }
  }, [fail, onLoggedIn]);

  // Start polling as soon as the WebView is enabled.
  // The probe script checks the page state itself.
  React.useEffect(() => {
    if (!enabled) {
      clearPolling();
      loginNotifiedRef.current = false;
      sessionReadyRef.current = false;
      requestedScheduleRef.current = false;
      probeDataRef.current = null;
      setPhase('login');
      setHelperMessage('请在下方 WebView 中完成武汉理工统一认证登录。');
      setPendingTermCode(null);
      setPendingTermSource(null);
      return;
    }

    // Start probing immediately and repeatedly
    const probe = () => injectScript(buildProbeScript());

    // First probe after a short delay (let WebView load)
    const initialDelay = setTimeout(probe, 1500);

    pollIntervalRef.current = setInterval(probe, POLL_INTERVAL_MS);
    pollTimeoutRef.current = setTimeout(() => {
      if (!sessionReadyRef.current) {
        clearPolling();
        setPhase('error');
        setHelperMessage('教务系统连接超时（60秒），请关闭后重试。');
        onError('教务系统连接超时');
      }
    }, POLL_TIMEOUT_MS);

    return () => {
      clearTimeout(initialDelay);
      clearPolling();
    };
  }, [enabled, clearPolling, injectScript, onError]);

  const handleMessage = React.useCallback(
    async (event: WebViewMessageLikeEvent) => {
      const message = parseMessage(event.nativeEvent.data);
      if (!message) return;

      // --- Probe responses ---

      if (message.type === 'probe-login') {
        // Still on CAS login page — do nothing, keep waiting
        return;
      }

      if (message.type === 'probe-waiting') {
        notifyLoggedIn();
        return;
      }

      if (message.type === 'probe-ready') {
        if (sessionReadyRef.current) return;
        sessionReadyRef.current = true;
        clearPolling();

        notifyLoggedIn();

        // Store semester info from the probe for later use
        if (message.semesterStart) {
          probeDataRef.current = {
            semesterStart: message.semesterStart,
            totalWeeks: message.totalWeeks ?? 30,
          };
        }

        const termCode = message.termCode;
        if (!termCode) {
          fail('无法确定当前学期编码。');
          return;
        }

        requestScheduleDetail(termCode);
        return;
      }

      if (message.type === 'session-ready') {
        if (sessionReadyRef.current) {
          return;
        }

        sessionReadyRef.current = true;
        clearPolling();
        notifyLoggedIn();

        const termCode = message.currentTermCode;
        if (!termCode) {
          fail('无法确定当前学期编码。');
          return;
        }

        requestScheduleDetail(termCode);
        return;
      }

      if (message.type === 'probe-error') {
        fail(message.message);
        return;
      }

      // --- Schedule fetch responses ---

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
          semesterStart: probeDataRef.current?.semesterStart,
          totalWeeks: probeDataRef.current?.totalWeeks,
        });
      }
    },
    [clearPolling, fail, notifyLoggedIn, onScheduleDetailReady, requestScheduleDetail, semesterStartDate],
  );

  const handleNavigationStateChange = React.useCallback(
    (event: { url?: string }) => {
      const url = event.url ?? '';
      if (!/jwxt\.whut\.edu\.cn\/jwapp\/sys\/homeapp/i.test(url)) {
        return;
      }

      notifyLoggedIn();
      injectScript(buildProbeScript());
    },
    [injectScript, notifyLoggedIn],
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
    minHeight: 480,
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
