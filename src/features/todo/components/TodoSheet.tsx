import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Edit3, X } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { TodoItem, TodoType, Priority, TODO_TYPE_LABELS, PRIORITY_LABELS } from '../types';
import { addTodo, updateTodo } from '../services/todo.service';

type SheetMode = 'create' | 'detail' | 'edit';

interface Props {
  visible: boolean;
  mode: 'create' | 'detail';
  todo: TodoItem | null;
  onClose: () => void;
}

const TODO_TYPES: TodoType[] = ['daily', 'weekly', 'longterm'];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export function TodoSheet({ visible, mode: initialMode, todo, onClose }: Props) {
  const theme = useTheme();
  const [mode, setMode] = useState<SheetMode>(initialMode);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TodoType>('daily');
  const [priority, setPriority] = useState<Priority>('medium');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setError('');
      if (todo) {
        setTitle(todo.title);
        setType(todo.type);
        setPriority(todo.priority);
        setNotes(todo.notes ?? '');
      } else {
        setTitle('');
        setType('daily');
        setPriority('medium');
        setNotes('');
      }
    }
  }, [visible, todo, initialMode]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('请输入标题');
      return;
    }
    const input = { title: trimmed, type, priority, notes: notes.trim() || undefined };
    if (todo && mode === 'edit') {
      await updateTodo(todo.id, input);
    } else {
      await addTodo(input);
    }
    onClose();
  };

  const isEditable = mode === 'create' || mode === 'edit';
  const isDetail = mode === 'detail';

  const headerTitle = mode === 'create' ? '新建待办' : mode === 'edit' ? '编辑待办' : '待办详情';

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.bg,
                borderTopLeftRadius: theme.radius.sheet,
                borderTopRightRadius: theme.radius.sheet,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.colors.textMain, fontFamily: theme.fonts.heading }]}>
                {headerTitle}
              </Text>
              <View style={styles.headerActions}>
                {isDetail ? (
                  <TouchableOpacity onPress={() => setMode('edit')} style={styles.headerBtn}>
                    <Edit3 size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                  <X size={24} color={theme.colors.textSub} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.body}>
              {/* Title */}
              <Text style={[styles.label, { color: theme.colors.textSub }]}>标题</Text>
              {isEditable ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.inputBg,
                      color: theme.colors.textMain,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="待办内容"
                  placeholderTextColor={theme.colors.textSub}
                  maxLength={20}
                />
              ) : (
                <Text style={[styles.value, { color: theme.colors.textMain }]}>{title}</Text>
              )}

              {/* Type */}
              <Text style={[styles.label, { color: theme.colors.textSub }]}>类型</Text>
              {isEditable ? (
                <View style={styles.optionRow}>
                  {TODO_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setType(t)}
                      style={[
                        styles.optionBtn,
                        {
                          backgroundColor: type === t ? theme.colors.primary : theme.colors.inputBg,
                          borderColor: theme.colors.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: type === t ? theme.colors.bg : theme.colors.textMain },
                        ]}
                      >
                        {TODO_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.value, { color: theme.colors.textMain }]}>{TODO_TYPE_LABELS[type]}</Text>
              )}

              {/* Priority */}
              <Text style={[styles.label, { color: theme.colors.textSub }]}>优先级</Text>
              {isEditable ? (
                <View style={styles.optionRow}>
                  {PRIORITIES.map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      style={[
                        styles.optionBtn,
                        {
                          backgroundColor: priority === p ? theme.colors.primary : theme.colors.inputBg,
                          borderColor: theme.colors.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: priority === p ? theme.colors.bg : theme.colors.textMain },
                        ]}
                      >
                        {PRIORITY_LABELS[p]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.value, { color: theme.colors.textMain }]}>{PRIORITY_LABELS[priority]}</Text>
              )}

              {/* Notes */}
              <Text style={[styles.label, { color: theme.colors.textSub }]}>备注</Text>
              {isEditable ? (
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: theme.colors.inputBg,
                      color: theme.colors.textMain,
                      borderColor: theme.colors.cardBorder,
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

              {/* Created date (detail/edit only) */}
              {todo ? (
                <>
                  <Text style={[styles.label, { color: theme.colors.textSub }]}>创建日期</Text>
                  <Text style={[styles.value, { color: theme.colors.textMain }]}>{formatDate(todo.created_at)}</Text>
                </>
              ) : null}
            </ScrollView>

            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.accent }]}>{error}</Text>
            ) : null}

            {/* Save button (only in create/edit mode) */}
            {isEditable ? (
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.saveBtnText, { color: theme.colors.bg, fontFamily: theme.fonts.heading }]}>
                  {mode === 'edit' ? '保存' : '创建'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
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
    marginTop: 16,
    marginBottom: 8,
  },
  value: {
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
  },
  errorText: {
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 13,
  },
  saveBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
  },
});
