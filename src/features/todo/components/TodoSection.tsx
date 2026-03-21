import React, { useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, UIManager, Platform } from 'react-native';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
import { ClipboardList, Plus } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { TodoItem, TodoType, TODO_TYPE_LABELS } from '../types';
import { sortTodosForDisplay } from '../domain/sort';
import { toggleTodoComplete, deleteTodo } from '../services/todo.service';
import { TodoItemCard } from './TodoItemCard';
import { TodoSheet } from './TodoSheet';

interface Props {
  todos: TodoItem[];
  loading?: boolean;
}

const TABS: TodoType[] = ['daily', 'weekly', 'longterm'];

export function TodoSection({ todos, loading }: Props) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TodoType>('daily');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

  const filtered = useMemo(
    () =>
      sortTodosForDisplay(todos.filter((t) => t.type === activeTab)),
    [todos, activeTab],
  );

  const [sheetMode, setSheetMode] = useState<'create' | 'detail'>('create');

  const openCreate = () => {
    setEditingTodo(null);
    setSheetMode('create');
    setSheetVisible(true);
  };

  const openDetail = (todo: TodoItem) => {
    setEditingTodo(todo);
    setSheetMode('detail');
    setSheetVisible(true);
  };

  const confirmDelete = (todo: TodoItem) => {
    Alert.alert('确认删除', '确定要删除这个待办吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteTodo(todo.id) },
    ]);
  };

  return (
    <View>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: theme.colors.primary }]} />
        <Text style={[styles.sectionTitle, { color: theme.colors.textMain, fontFamily: theme.fonts.heading }]}>
          待办
        </Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Plus size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = tab === activeTab;
          const count = todos.filter((t) => t.type === tab).length;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                {
                  borderBottomColor: active ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? theme.colors.primary : theme.colors.textSub },
                ]}
              >
                {TODO_TYPE_LABELS[tab]} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? null : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <ClipboardList size={28} color={theme.colors.textSub} />
          <Text style={[styles.emptyText, { color: theme.colors.textSub }]}>暂无待办</Text>
        </View>
      ) : (
        filtered.map((todo) => (
          <TodoItemCard
            key={todo.id}
            todo={todo}
            onToggle={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              toggleTodoComplete(todo.id);
            }}
            onPress={() => openDetail(todo)}
            onDelete={() => confirmDelete(todo)}
          />
        ))
      )}

      <TodoSheet visible={sheetVisible} mode={sheetMode} todo={editingTodo} onClose={() => setSheetVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    flex: 1,
  },
  addBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});
