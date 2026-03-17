import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Edit3, Trash2, X } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { formatTime } from '../../../shared/lib/date';
import { addEvent, deleteEvent, toggleComplete, updateEvent } from '../services/events.service';
import { CATEGORIES, CategoryKey, RepeatType, ScheduleEvent } from '../types';
import DateTimePicker from './DateTimePicker';

type SheetMode = 'view' | 'create' | 'edit';

interface EventSheetProps {
  visible: boolean;
  mode: SheetMode;
  event?: ScheduleEvent | null;
  defaultStart?: Date;
  defaultEnd?: Date;
  onClose: () => void;
}

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
];

const REMINDER_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: '无' },
  { value: 5, label: '5分钟' },
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
];

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export function EventSheet({
  visible,
  mode: initialMode,
  event,
  defaultStart,
  defaultEnd,
  onClose,
}: EventSheetProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<SheetMode>(initialMode);
  const handlePickerActive = useCallback((active: boolean) => setPickerActive(active), []);
  const [pickerActive, setPickerActive] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryKey>('其他');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError('');
    if (initialMode === 'create') {
      setTitle('');
      setCategory('其他');
      setStartTime(defaultStart ?? new Date());
      setEndTime(defaultEnd ?? new Date(Date.now() + 3600000));
      setRepeat('none');
      setLocation('');
      setNotes('');
      setReminder(undefined);
      return;
    }

    if (event) {
      setTitle(event.title);
      setCategory(event.category);
      setStartTime(new Date(event.start_time));
      setEndTime(new Date(event.end_time));
      setRepeat(event.repeat);
      setLocation(event.location ?? '');
      setNotes(event.notes ?? '');
      setReminder(event.reminder_minutes);
    }
  }, [defaultEnd, defaultStart, event, initialMode, visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入标题');
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      repeat,
      location: location.trim() || undefined,
      reminder_minutes: reminder as ScheduleEvent['reminder_minutes'],
      notes: notes.trim() || undefined,
    };

    const result =
      mode === 'create'
        ? await addEvent(payload)
        : mode === 'edit' && event
          ? await updateEvent({ ...event, ...payload })
          : undefined;

    if (result && !result.success) {
      setError(result.error ?? '保存失败');
      return;
    }

    onClose();
  };

  const handleDelete = () => {
    if (!event) return;
    Alert.alert('删除事件', `确定删除「${event.title}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteEvent(event.id);
          onClose();
        },
      },
    ]);
  };

  const handleToggleComplete = async () => {
    if (!event) return;
    await toggleComplete(event.id);
    onClose();
  };

  const formatDateTime = (date: Date) =>
    `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate()
      .toString()
      .padStart(2, '0')} ${formatTime(date)}`;

  const isViewMode = mode === 'view';
  const isEditable = mode === 'create' || mode === 'edit';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.bg,
              borderTopLeftRadius: theme.radius.sheet,
              borderTopRightRadius: theme.radius.sheet,
            },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.textSub }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
              {mode === 'create' ? '新建事件' : mode === 'edit' ? '编辑事件' : '事件详情'}
            </Text>
            <View style={styles.headerActions}>
              {isViewMode && event ? (
                <>
                  <TouchableOpacity onPress={handleToggleComplete} style={styles.headerBtn}>
                    <Check size={20} color={theme.colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMode('edit')} style={styles.headerBtn}>
                    <Edit3 size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
                    <Trash2 size={20} color={theme.colors.accent} />
                  </TouchableOpacity>
                </>
              ) : null}
              <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                <X size={20} color={theme.colors.textSub} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} scrollEnabled={!pickerActive}>
            <Text style={[styles.label, { color: theme.colors.textSub }]}>标题</Text>
            {isEditable ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.inputBg,
                    color: theme.colors.textMain,
                    borderRadius: theme.radius.button,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="事件标题"
                placeholderTextColor={theme.colors.textSub}
              />
            ) : (
              <Text style={[styles.value, { color: theme.colors.textMain }]}>{title}</Text>
            )}

            <Text style={[styles.label, { color: theme.colors.textSub }]}>分类</Text>
            {isEditable ? (
              <View style={styles.chipRow}>
                {CATEGORY_KEYS.map((key) => {
                  const categoryInfo = CATEGORIES[key];
                  const selected = category === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setCategory(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? `${categoryInfo.color}30` : theme.colors.inputBg,
                          borderColor: selected ? categoryInfo.color : 'transparent',
                          borderRadius: theme.radius.button,
                        },
                      ]}
                    >
                      <View style={[styles.chipDot, { backgroundColor: categoryInfo.color }]} />
                      <Text style={[styles.chipText, { color: selected ? categoryInfo.color : theme.colors.textSub }]}>
                        {key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.chipRow}>
                <View style={[styles.chipDot, { backgroundColor: CATEGORIES[category].color }]} />
                <Text style={{ color: CATEGORIES[category].color, fontWeight: '600' }}>
                  {category} ({CATEGORIES[category].label})
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: theme.colors.textSub }]}>开始时间</Text>
            {isEditable ? (
              <DateTimePicker
                value={startTime}
                onChange={setStartTime}
                theme={theme}
                minimumHour={6}
                onPickerActive={handlePickerActive}
              />
            ) : (
              <Text style={[styles.value, { color: theme.colors.textMain }]}>{formatDateTime(startTime)}</Text>
            )}

            <Text style={[styles.label, { color: theme.colors.textSub }]}>结束时间</Text>
            {isEditable ? (
              <DateTimePicker
                value={endTime}
                onChange={setEndTime}
                theme={theme}
                minimumHour={6}
                allowMidnight24
                onPickerActive={handlePickerActive}
              />
            ) : (
              <Text style={[styles.value, { color: theme.colors.textMain }]}>{formatDateTime(endTime)}</Text>
            )}

            <Text style={[styles.label, { color: theme.colors.textSub }]}>重复</Text>
            {isEditable ? (
              <View style={styles.chipRow}>
                {REPEAT_OPTIONS.map((option) => {
                  const selected = repeat === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setRepeat(option.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? `${theme.colors.primary}30` : theme.colors.inputBg,
                          borderColor: selected ? theme.colors.primary : 'transparent',
                          borderRadius: theme.radius.button,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? theme.colors.primary : theme.colors.textSub }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.value, { color: theme.colors.textMain }]}>
                {REPEAT_OPTIONS.find((option) => option.value === repeat)?.label}
              </Text>
            )}

            <Text style={[styles.label, { color: theme.colors.textSub }]}>地点</Text>
            {isEditable ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.inputBg,
                    color: theme.colors.textMain,
                    borderRadius: theme.radius.button,
                  },
                ]}
                value={location}
                onChangeText={setLocation}
                placeholder="可选"
                placeholderTextColor={theme.colors.textSub}
              />
            ) : (
              <Text style={[styles.value, { color: theme.colors.textMain }]}>{location || '-'}</Text>
            )}

            <Text style={[styles.label, { color: theme.colors.textSub }]}>提醒</Text>
            {isEditable ? (
              <View style={styles.chipRow}>
                {REMINDER_OPTIONS.map((option) => {
                  const selected = reminder === option.value;
                  return (
                    <TouchableOpacity
                      key={option.label}
                      onPress={() => setReminder(option.value as ScheduleEvent['reminder_minutes'])}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? `${theme.colors.primary}30` : theme.colors.inputBg,
                          borderColor: selected ? theme.colors.primary : 'transparent',
                          borderRadius: theme.radius.button,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? theme.colors.primary : theme.colors.textSub }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.value, { color: theme.colors.textMain }]}>
                {REMINDER_OPTIONS.find((option) => option.value === reminder)?.label ?? '无'}
              </Text>
            )}

            <Text style={[styles.label, { color: theme.colors.textSub }]}>备注</Text>
            {isEditable ? (
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.inputBg,
                    color: theme.colors.textMain,
                    borderRadius: theme.radius.button,
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="可选"
                placeholderTextColor={theme.colors.textSub}
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={[styles.value, { color: theme.colors.textMain }]}>{notes || '-'}</Text>
            )}

            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.accent }]}>{error}</Text>
            ) : null}

            {isEditable ? (
              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.saveBtn,
                  { backgroundColor: theme.colors.primary, borderRadius: theme.radius.button },
                ]}
              >
                <Text style={[styles.saveBtnText, { color: theme.colors.bg }]}>保存</Text>
              </TouchableOpacity>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
