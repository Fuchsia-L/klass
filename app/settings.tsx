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
import { AppBar } from '../src/shared/components/AppBar';
import { useTheme } from '../src/theme/ThemeContext';
import { THEME_OPTIONS, getTheme } from '../src/theme';
import { useSettingsForm } from '../src/features/settings';

const PREVIEW_COLORS: Array<keyof ReturnType<typeof getTheme>['colors']> = [
  'bg',
  'primary',
  'accent',
  'success',
  'card',
];

export default function SettingsScreen() {
  const theme = useTheme();
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

  const handleExport = () => {
    Alert.alert('导出数据', '此功能即将上线，敬请期待。');
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
              onPress={handleExport}
              style={[
                styles.dataButton,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.divider,
                },
              ]}
            >
              <Text style={[styles.dataButtonText, { color: theme.colors.textMain }]}>
                导出数据 (JSON)
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
