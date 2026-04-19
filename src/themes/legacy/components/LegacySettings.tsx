import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Cloud } from 'lucide-react-native';
import { AppBar } from '../../../shared/components/AppBar';
import { useTheme } from '../../../theme/ThemeContext';
import { THEME_OPTIONS, getTheme } from '../../../theme';
import { useSettingsForm } from '../../../features/settings';
import { exportLocalRatingsAsJson } from '../../../features/settings/services/rating-export.service';
import {
  getConfiguredSyncScheduler,
  saveSyncToken,
  type SyncSchedulerStatus,
} from '../../../features/rating';
import {
  extractArrangedScheduleItems,
  importWhutArrangedList,
  WhutCourseTableResponseRaw,
} from '../../../features/schedule';
import { WhutImportModal, WhutImportStatus } from '../../../features/schedule/import/WhutImportModal';

const RELATIVE_TIME_REFRESH_MS = 30_000;

function formatRelativeSyncTime(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '未知';
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function describeSyncStatus(status: SyncSchedulerStatus, now: number): string {
  switch (status.kind) {
    case 'unconfigured':
      return '未配置云端同步';
    case 'syncing':
      return '同步中...';
    case 'error':
      return status.message;
    case 'idle':
    default:
      if (!status.lastSyncAt) return '尚未同步';
      return `同步于 ${formatRelativeSyncTime(status.lastSyncAt, now)}`;
  }
}

const PREVIEW_COLORS: Array<keyof ReturnType<typeof getTheme>['colors']> = [
  'bg',
  'primary',
  'accent',
  'success',
  'card',
];

export function LegacySettings() {
  const theme = useTheme();
  const [isImportModalVisible, setImportModalVisible] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState<WhutImportStatus>('idle');
  const [importErrorMessage, setImportErrorMessage] = React.useState('');
  const [importedCount, setImportedCount] = React.useState<number | undefined>(undefined);
  const [importedTermCode, setImportedTermCode] = React.useState<string | undefined>(undefined);
  const [hasStartedImport, setHasStartedImport] = React.useState(false);
  const [isExportingRatings, setIsExportingRatings] = React.useState(false);
  const [syncTokenInput, setSyncTokenInput] = React.useState('');
  const [isSavingToken, setIsSavingToken] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<SyncSchedulerStatus>(() =>
    getConfiguredSyncScheduler().getStatus(),
  );
  const [relativeTimeTick, setRelativeTimeTick] = React.useState(() => Date.now());
  const importGenerationRef = React.useRef(0);

  React.useEffect(() => {
    const scheduler = getConfiguredSyncScheduler();
    setSyncStatus(scheduler.getStatus());
    const unsubscribe = scheduler.onStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTimeTick(Date.now());
    }, RELATIVE_TIME_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSyncToken = async () => {
    if (isSavingToken) return;
    setIsSavingToken(true);
    try {
      const trimmed = syncTokenInput.trim();
      await saveSyncToken(trimmed);
      setSyncTokenInput('');
      if (trimmed.length > 0) {
        const scheduler = getConfiguredSyncScheduler();
        scheduler.start();
        await scheduler.pullNow();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存 token 失败，请稍后重试。';
      Alert.alert('保存失败', message);
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleManualSync = async () => {
    const scheduler = getConfiguredSyncScheduler();
    scheduler.notifyLocalChange();
    await scheduler.pullNow();
  };
  const {
    form,
    loading,
    saving,
    message,
    themeName,
    updateField,
    save,
    setThemeName,
    resetAll,
  } = useSettingsForm();

  const handleClearAll = () => {
    Alert.alert('清除所有数据', '确定要删除所有事件、学期设置和主题配置吗？此操作不可撤销。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认清除',
        style: 'destructive',
        onPress: resetAll,
      },
    ]);
  };

  const handleExportRatings = async () => {
    if (isExportingRatings) return;

    setIsExportingRatings(true);
    try {
      const result = await exportLocalRatingsAsJson();
      Alert.alert('导出打分数据', `已准备 ${result.count} 条打分记录。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出打分数据失败，请稍后重试。';
      Alert.alert('导出打分数据失败', message);
    } finally {
      setIsExportingRatings(false);
    }
  };

  const resetImportState = React.useCallback(() => {
    importGenerationRef.current += 1;
    setImportModalVisible(false);
    setImportStatus('idle');
    setImportErrorMessage('');
    setImportedCount(undefined);
    setImportedTermCode(undefined);
    setHasStartedImport(false);
  }, []);

  const handleOpenImportModal = () => {
    setImportModalVisible(true);
    setImportStatus('idle');
    setImportErrorMessage('');
    setImportedCount(undefined);
    setImportedTermCode(undefined);
    setHasStartedImport(false);
  };

  const handleBeginImport = React.useCallback(() => {
    importGenerationRef.current += 1;
    setImportErrorMessage('');
    setImportedCount(undefined);
    setImportedTermCode(undefined);
    setHasStartedImport(true);
    setImportStatus('waiting-login');
  }, []);

  const handleScheduleDetailReady = React.useCallback(
    async ({
      termCode,
      scheduleDetail,
      semesterStart: autoSemesterStart,
      totalWeeks: autoTotalWeeks,
    }: {
      termCode: string;
      scheduleDetail: WhutCourseTableResponseRaw;
      semesterStart?: string;
      totalWeeks?: number;
    }) => {
      const importGeneration = importGenerationRef.current;

      try {
        const startDate = autoSemesterStart || form.semesterStart.trim();
        const weeks = autoTotalWeeks ?? (Number.parseInt(form.totalWeeks.trim(), 10) || 30);

        if (!startDate) {
          throw new Error('未能自动获取开学日期，请在设置中手动填写后重试。');
        }

        const arrangedList = extractArrangedScheduleItems(scheduleDetail);

        if (arrangedList.length === 0) {
          throw new Error('课表接口未返回任何可导入的排课记录。');
        }

        const importedEvents = await importWhutArrangedList({
          arrangedList,
          semesterConfig: {
            start_date: startDate,
            total_weeks: weeks,
          },
        });

        if (importGeneration !== importGenerationRef.current) {
          return;
        }

        setImportErrorMessage('');
        setImportedCount(importedEvents.length);
        setImportedTermCode(termCode);
        setImportStatus('success');
      } catch (error) {
        if (importGeneration !== importGenerationRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : '导入课表失败，请稍后重试。';
        setImportedCount(undefined);
        setImportedTermCode(undefined);
        setImportStatus('error');
        setImportErrorMessage(message);
      }
    },
    [form.semesterStart, form.totalWeeks],
  );

  const handleRequestCloseImportModal = () => {
    if (!hasStartedImport || importStatus === 'success' || importStatus === 'error') {
      resetImportState();
      return;
    }

    Alert.alert('取消导入', '当前导入流程尚未完成，确定要取消吗？', [
      { text: '继续导入', style: 'cancel' },
      {
        text: '确认取消',
        style: 'destructive',
        onPress: resetImportState,
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <AppBar title="SETTINGS" subtitle="配置应用与学期参数" />

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Theme Section */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.primary, fontFamily: theme.fonts.heading },
              ]}
            >
              主题
            </Text>
            <View style={styles.themeGrid}>
              {THEME_OPTIONS.map((option) => {
                const preview = getTheme(option.name);
                const isSelected = option.name === themeName;
                return (
                  <TouchableOpacity
                    key={option.name}
                    activeOpacity={0.7}
                    onPress={() => setThemeName(option.name)}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: preview.colors.bg,
                        borderColor: isSelected
                          ? preview.colors.primary
                          : preview.colors.cardBorder,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={styles.colorDots}>
                      {PREVIEW_COLORS.map((colorKey) => (
                        <View
                          key={colorKey}
                          style={[
                            styles.colorDot,
                            {
                              backgroundColor: preview.colors[colorKey],
                              borderColor:
                                colorKey === 'bg'
                                  ? preview.colors.cardBorder
                                  : 'transparent',
                              borderWidth: colorKey === 'bg' ? 1 : 0,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.themeLabel,
                        {
                          color: isSelected
                            ? preview.colors.primary
                            : preview.colors.textSub,
                          fontWeight: isSelected ? '700' : '400',
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <View
                        style={[
                          styles.selectedBadge,
                          { backgroundColor: preview.colors.primary },
                        ]}
                      >
                        <Text style={[styles.selectedBadgeText, { color: preview.colors.bg }]}>
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Semester Section */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.primary, fontFamily: theme.fonts.heading },
              ]}
            >
              学期设置
            </Text>
            <Text style={[styles.label, { color: theme.colors.textSub }]}>开始日期</Text>
            <TextInput
              value={form.semesterStart}
              onChangeText={(value) => updateField('semesterStart', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textSub}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBg,
                  color: theme.colors.textMain,
                  borderColor: theme.colors.divider,
                },
              ]}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: theme.colors.textSub }]}>总周数</Text>
            <TextInput
              value={form.totalWeeks}
              onChangeText={(value) => updateField('totalWeeks', value.replace(/[^\d]/g, ''))}
              placeholder="18"
              placeholderTextColor={theme.colors.textSub}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBg,
                  color: theme.colors.textMain,
                  borderColor: theme.colors.divider,
                },
              ]}
              keyboardType="number-pad"
            />
          </View>

          {/* Cloud Sync Section */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
            testID="cloud-sync-section"
          >
            <View style={styles.sectionHeaderRow}>
              <Cloud size={18} color={theme.colors.primary} />
              <Text
                style={[
                  styles.sectionTitle,
                  styles.sectionTitleInline,
                  { color: theme.colors.primary, fontFamily: theme.fonts.heading },
                ]}
              >
                云端同步
              </Text>
            </View>

            <Text style={[styles.label, { color: theme.colors.textSub }]}>API Token</Text>
            <TextInput
              value={syncTokenInput}
              onChangeText={setSyncTokenInput}
              placeholder="输入 API token（留空可清除）"
              placeholderTextColor={theme.colors.textSub}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBg,
                  color: theme.colors.textMain,
                  borderColor: theme.colors.divider,
                },
              ]}
              testID="sync-token-input"
            />

            <TouchableOpacity
              onPress={handleSaveSyncToken}
              disabled={isSavingToken}
              style={[
                styles.dataButton,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.primary,
                  opacity: isSavingToken ? 0.7 : 1,
                },
              ]}
              testID="save-sync-token-button"
            >
              <Text style={[styles.dataButtonText, { color: theme.colors.primary }]}>
                {isSavingToken ? '保存中...' : '保存 token'}
              </Text>
            </TouchableOpacity>

            <View style={styles.syncStatusRow} testID="sync-status-row">
              <Text style={[styles.label, { color: theme.colors.textSub }]}>同步状态</Text>
              <Text
                style={[
                  styles.syncStatusText,
                  {
                    color:
                      syncStatus.kind === 'error'
                        ? theme.colors.danger
                        : syncStatus.kind === 'syncing'
                          ? theme.colors.accent
                          : theme.colors.textMain,
                  },
                ]}
                testID="sync-status-text"
              >
                {describeSyncStatus(syncStatus, relativeTimeTick)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleManualSync}
              style={[
                styles.dataButton,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.divider,
                  marginTop: 12,
                },
              ]}
              testID="manual-sync-button"
            >
              <Text style={[styles.dataButtonText, { color: theme.colors.textMain }]}>立即同步</Text>
            </TouchableOpacity>
          </View>

          {/* Data Management Section */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.primary, fontFamily: theme.fonts.heading },
              ]}
            >
              数据管理
            </Text>
            <TouchableOpacity
              onPress={handleOpenImportModal}
              style={[
                styles.dataButton,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.primary,
                },
              ]}
              testID="open-whut-import-button"
            >
              <Text style={[styles.dataButtonText, { color: theme.colors.primary }]}>导入武汉理工课表</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExportRatings}
              disabled={isExportingRatings}
              style={[
                styles.dataButton,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.divider,
                  opacity: isExportingRatings ? 0.7 : 1,
                },
              ]}
              testID="export-ratings-button"
            >
              <Text style={[styles.dataButtonText, { color: theme.colors.textMain }]}>
                {isExportingRatings ? '导出中...' : '导出打分数据'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearAll}
              style={[
                styles.dataButton,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.danger,
                },
              ]}
            >
              <Text style={[styles.dataButtonText, { color: theme.colors.danger }]}>清除所有数据</Text>
            </TouchableOpacity>
          </View>

          {message ? (
            <Text
              style={[
                styles.message,
                {
                  color:
                    message === '设置已保存' || message === '所有数据已清除'
                      ? theme.colors.success
                      : theme.colors.accent,
                },
              ]}
            >
              {message}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={[
              styles.saveButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: saving ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.saveText, { color: theme.colors.bg }]}>
              {saving ? '保存中...' : '保存学期设置'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <WhutImportModal
        errorMessage={importErrorMessage}
        importedCount={importedCount}
        importedTermCode={importedTermCode}
        onBeginImport={handleBeginImport}
        onImportError={(message) => setImportErrorMessage(message)}
        onImportStatusChange={setImportStatus}
        onScheduleDetailReady={handleScheduleDetailReady}
        onRequestClose={handleRequestCloseImportModal}
        semesterConfig={{
          start_date: form.semesterStart.trim(),
          total_weeks: Number.parseInt(form.totalWeeks.trim(), 10) || 30,
        }}
        status={importStatus}
        visible={isImportModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 96,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  syncStatusRow: {
    marginTop: 4,
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '47%' as any,
    borderRadius: 10,
    padding: 12,
    position: 'relative',
  },
  colorDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  themeLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dataButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  dataButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
