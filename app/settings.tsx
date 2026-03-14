import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppBar } from '../src/shared/components/AppBar';
import { useTheme } from '../src/theme/ThemeContext';
import { THEME_OPTIONS } from '../src/theme';
import { useSettingsForm } from '../src/features/settings';

export default function SettingsScreen() {
  const theme = useTheme();
  const { form, loading, saving, message, updateField, save, setThemeName } = useSettingsForm();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <AppBar title="SETTINGS" subtitle="配置应用与学期参数" />

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
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

          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
              主题
            </Text>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((option) => {
                const selected = option.name === form.themeName;
                return (
                  <TouchableOpacity
                    key={option.name}
                    onPress={() => setThemeName(option.name)}
                    style={[
                      styles.themeChip,
                      {
                        backgroundColor: selected ? `${theme.colors.primary}20` : theme.colors.inputBg,
                        borderColor: selected ? theme.colors.primary : theme.colors.divider,
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? theme.colors.primary : theme.colors.textMain }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
              后续预留
            </Text>
            <Text style={[styles.helperText, { color: theme.colors.textSub }]}>
              提醒、导入导出、账号同步都会继续放在这个 feature 下扩展。
            </Text>
          </View>

          {message ? (
            <Text
              style={[
                styles.message,
                { color: message === '设置已保存' ? theme.colors.success : theme.colors.accent },
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
              {saving ? '保存中...' : '保存设置'}
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
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  themeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
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
