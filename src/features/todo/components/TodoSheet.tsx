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
import { X } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { TodoItem, TodoType, Priority, TODO_TYPE_LABELS, PRIORITY_LABELS } from '../types';
import { addTodo, updateTodo } from '../services/todo.service';

interface Props {
  visible: boolean;
  todo: TodoItem | null;
  onClose: () => void;
}

const TODO_TYPES: TodoType[] = ['daily', 'weekly', 'longterm'];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export function TodoSheet({ visible, todo, onClose }: Props) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TodoType>('daily');
  const [priority, setPriority] = useState<Priority>('medium');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setError('');
      if (todo) {
        setTitle(todo.title);
        setType(todo.type);
        setPriority(todo.priority);
      } else {
        setTitle('');
        setType('daily');
        setPriority('medium');
      }
    }
  }, [visible, todo]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('请输入标题');
      return;
    }
    if (todo) {
      await updateTodo(todo.id, { title: trimmed, type, priority });
    } else {
      await addTodo({ title: trimmed, type, priority });
    }
    onClose();
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
                {todo ? '编辑待办' : '新建待办'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={theme.colors.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body}>
              {/* Title input */}
              <Text style={[styles.label, { color: theme.colors.textSub }]}>标题</Text>
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
              />

              {/* Type selector */}
              <Text style={[styles.label, { color: theme.colors.textSub }]}>类型</Text>
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

              {/* Priority selector */}
              <Text style={[styles.label, { color: theme.colors.textSub }]}>优先级</Text>
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
            </ScrollView>

            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.accent }]}>{error}</Text>
            ) : null}

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.saveBtnText, { color: theme.colors.bg, fontFamily: theme.fonts.heading }]}>
                {todo ? '保存' : '创建'}
              </Text>
            </TouchableOpacity>
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
  body: {
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
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
