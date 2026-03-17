import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Circle, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { TodoItem, Priority, PRIORITY_LABELS } from '../types';

interface Props {
  todo: TodoItem;
  onToggle: () => void;
  onPress: () => void;
  onDelete: () => void;
}

const PRIORITY_COLOR_KEYS: Record<Priority, 'priorityHigh' | 'priorityMedium' | 'priorityLow'> = {
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
};

export function TodoItemCard({ todo, onToggle, onPress, onDelete }: Props) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.cardBorder,
        },
      ]}
    >
      <TouchableOpacity onPress={onToggle} style={styles.checkArea}>
        {todo.is_completed ? (
          <Check size={20} color={theme.colors.success} />
        ) : (
          <Circle size={20} color={theme.colors.textSub} />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: todo.is_completed ? theme.colors.textSub : theme.colors.textMain,
              textDecorationLine: todo.is_completed ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.priorityDot, { backgroundColor: theme.colors[PRIORITY_COLOR_KEYS[todo.priority]] }]} />
          <Text style={[styles.priorityText, { color: theme.colors.textSub }]}>
            {PRIORITY_LABELS[todo.priority]}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onDelete} style={styles.deleteArea}>
        <Trash2 size={16} color={theme.colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkArea: {
    paddingRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  priorityText: {
    fontSize: 11,
  },
  deleteArea: {
    paddingLeft: 12,
  },
});
