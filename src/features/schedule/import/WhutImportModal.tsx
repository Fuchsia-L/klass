import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { SemesterConfig } from '../types';
import { WhutCourseTableResponseRaw } from './contracts';
import { WhutImportWebViewContainer } from './WhutImportWebViewContainer';

export type WhutImportStatus = 'idle' | 'waiting-login' | 'syncing' | 'success' | 'error';

type WhutImportModalProps = {
  visible: boolean;
  status: WhutImportStatus;
  errorMessage?: string;
  semesterConfig?: Pick<SemesterConfig, 'start_date' | 'total_weeks'>;
  onBeginImport: () => void;
  onImportError: (message: string) => void;
  onImportStatusChange: (status: WhutImportStatus) => void;
  onScheduleDetailReady: (payload: {
    termCode: string;
    scheduleDetail: WhutCourseTableResponseRaw;
  }) => void | Promise<void>;
  onRequestClose: () => void;
};

const STATUS_COPY: Record<WhutImportStatus, { title: string; description: string }> = {
  idle: {
    title: '准备开始导入',
    description: '确认学期配置后，即可进入武汉理工教务系统登录流程。',
  },
  'waiting-login': {
    title: '等待登录武汉理工教务系统',
    description: '请在内嵌登录页完成统一认证，成功跳转后会自动建立会话。',
  },
  syncing: {
    title: '正在同步课表数据',
    description: '正在建立会话、解析学期并拉取结构化课表数据。',
  },
  success: {
    title: '导入成功',
    description: '课表数据已同步并写入本地日程。',
  },
  error: {
    title: '导入失败',
    description: '登录或同步过程中出现问题，请检查后重试。',
  },
};

export function WhutImportModal({
  visible,
  status,
  errorMessage,
  semesterConfig,
  onBeginImport,
  onImportError,
  onImportStatusChange,
  onScheduleDetailReady,
  onRequestClose,
}: WhutImportModalProps) {
  const theme = useTheme();
  const statusCopy = STATUS_COPY[status];
  const showWebView = Boolean(
    semesterConfig?.start_date && (status === 'waiting-login' || status === 'syncing'),
  );

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        styles.overlay,
        { backgroundColor: theme.colors.bg },
      ]}
      testID="whut-import-modal"
    >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.cardBorder,
            },
          ]}
        >
          <View style={styles.headerText}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.primary, fontFamily: theme.fonts.heading },
              ]}
            >
              武汉理工教务导入
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSub }]}>
              使用校园统一认证登录后同步课表
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onRequestClose}
            style={[styles.closeButton, { borderColor: theme.colors.divider }]}
            testID="whut-import-close-button"
          >
            <Text style={[styles.closeButtonText, { color: theme.colors.textMain }]}>关闭导入</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>导入说明</Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSub }]}>
              登录完成后会自动检测教务会话，解析学期编码，并通过接口拉取结构化课表明细。
            </Text>
          </View>

          {errorMessage ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.danger,
                },
              ]}
            >
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errorMessage}</Text>
            </View>
          ) : null}

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
            testID="whut-import-status-panel"
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>状态</Text>
            <Text style={[styles.statusTitle, { color: theme.colors.textMain }]}>{statusCopy.title}</Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSub }]}>{statusCopy.description}</Text>

            {status === 'syncing' ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.colors.primary} testID="whut-import-loading" />
                <Text style={[styles.loadingText, { color: theme.colors.textMain }]}>同步中...</Text>
              </View>
            ) : null}

            {showWebView ? (
              <WhutImportWebViewContainer
                enabled={showWebView}
                onError={(message) => {
                  onImportStatusChange('error');
                  onImportError(message);
                }}
                onLoggedIn={() => {
                  onImportStatusChange('syncing');
                }}
                onScheduleDetailReady={onScheduleDetailReady}
                semesterStartDate={semesterConfig?.start_date ?? ''}
              />
            ) : (
              <View
                style={[
                  styles.placeholder,
                  {
                    backgroundColor: theme.colors.inputBg,
                    borderColor: theme.colors.divider,
                  },
                ]}
              >
                <Text style={[styles.placeholderText, { color: theme.colors.textSub }]}>
                  {status === 'waiting-login'
                    ? '点击“继续导入”后将在这里打开教务系统登录页。'
                    : '这里将展示登录态、同步进度与结果摘要。'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.bg,
              borderTopColor: theme.colors.divider,
            },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onRequestClose}
            style={[
              styles.secondaryAction,
              {
                backgroundColor: theme.colors.inputBg,
                borderColor: theme.colors.divider,
              },
            ]}
          >
            <Text style={[styles.secondaryActionText, { color: theme.colors.textMain }]}>取消</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={status === 'syncing' || status === 'success' || status === 'waiting-login'}
            onPress={onBeginImport}
            activeOpacity={0.9}
            style={[
              styles.primaryAction,
              {
                backgroundColor:
                  status === 'syncing' || status === 'success' || status === 'waiting-login'
                    ? theme.colors.divider
                    : theme.colors.primary,
                opacity: status === 'syncing' || status === 'success' || status === 'waiting-login' ? 0.7 : 1,
              },
            ]}
            testID="whut-import-begin-button"
          >
            <Text style={[styles.primaryActionText, { color: theme.colors.bg }]}>继续导入</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  placeholder: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryAction: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
