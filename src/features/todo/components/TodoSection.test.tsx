import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TodoSection } from './TodoSection';
import type { TodoItem } from '../types';

const mockToggleTodoComplete = jest.fn();
const mockDeleteTodo = jest.fn();

jest.mock('../../../theme/ThemeContext', () => {
  const { getTheme } = require('../../../theme');

  return {
    useTheme: () => getTheme('cyber'),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    ClipboardList: () => <Text>clipboard-icon</Text>,
    Plus: () => <Text>plus-icon</Text>,
  };
});

jest.mock('../services/todo.service', () => ({
  toggleTodoComplete: (...args: unknown[]) => mockToggleTodoComplete(...args),
  deleteTodo: (...args: unknown[]) => mockDeleteTodo(...args),
}));

jest.mock('./TodoSheet', () => ({
  TodoSheet: () => null,
}));

jest.mock('./TodoItemCard', () => ({
  TodoItemCard: ({ todo, onToggle, onPress, onDelete }: any) => {
    const React = require('react');
    const { Text, TouchableOpacity, View } = require('react-native');

    return (
      <View>
        <Text testID={`todo-title-${todo.id}`}>{todo.title}</Text>
        <TouchableOpacity testID={`todo-toggle-${todo.id}`} onPress={onToggle}>
          <Text>toggle-{todo.id}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`todo-open-${todo.id}`} onPress={onPress}>
          <Text>open-{todo.id}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`todo-delete-${todo.id}`} onPress={onDelete}>
          <Text>delete-{todo.id}</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

function createTodo(overrides: Partial<TodoItem>): TodoItem {
  return {
    id: overrides.id ?? 'todo-id',
    title: overrides.title ?? 'Todo',
    type: overrides.type ?? 'daily',
    priority: overrides.priority ?? 'medium',
    is_completed: overrides.is_completed ?? false,
    last_reset: overrides.last_reset ?? '2026-03-10T08:00:00.000Z',
    created_at: overrides.created_at ?? '2026-03-10T08:00:00.000Z',
    notes: overrides.notes,
  };
}

describe('TodoSection', () => {
  beforeEach(() => {
    mockToggleTodoComplete.mockReset();
    mockDeleteTodo.mockReset();
  });

  it('renders incomplete todos before completed todos while preserving priority within each group', () => {
    const todos = [
      createTodo({ id: 'completed-high', title: 'Completed High', priority: 'high', is_completed: true }),
      createTodo({ id: 'incomplete-low', title: 'Incomplete Low', priority: 'low', is_completed: false }),
      createTodo({ id: 'completed-medium', title: 'Completed Medium', priority: 'medium', is_completed: true }),
      createTodo({ id: 'incomplete-high', title: 'Incomplete High', priority: 'high', is_completed: false }),
    ];

    const { getAllByTestId } = render(<TodoSection todos={todos} />);

    expect(getAllByTestId(/^todo-title-/).map((node) => node.props.children)).toEqual([
      'Incomplete High',
      'Incomplete Low',
      'Completed High',
      'Completed Medium',
    ]);
  });

  it('keeps an incomplete low-priority todo above a completed high-priority todo', () => {
    const todos = [
      createTodo({ id: 'completed-high', title: 'Completed High', priority: 'high', is_completed: true }),
      createTodo({ id: 'incomplete-low', title: 'Incomplete Low', priority: 'low', is_completed: false }),
    ];

    const { getAllByTestId } = render(<TodoSection todos={todos} />);

    expect(getAllByTestId(/^todo-title-/).map((node) => node.props.children)).toEqual([
      'Incomplete Low',
      'Completed High',
    ]);
  });

  it('moves a todo into the completed group when toggled complete', () => {
    const initialTodos = [
      createTodo({ id: 'target', title: 'Target Todo', priority: 'medium', is_completed: false }),
      createTodo({ id: 'other-incomplete', title: 'Other Incomplete', priority: 'low', is_completed: false }),
      createTodo({ id: 'completed-high', title: 'Completed High', priority: 'high', is_completed: true }),
    ];

    const { getAllByTestId, getByTestId, rerender } = render(<TodoSection todos={initialTodos} />);

    expect(getAllByTestId(/^todo-title-/).map((node) => node.props.children)).toEqual([
      'Target Todo',
      'Other Incomplete',
      'Completed High',
    ]);

    fireEvent.press(getByTestId('todo-toggle-target'));
    expect(mockToggleTodoComplete).toHaveBeenCalledWith('target');

    rerender(
      <TodoSection
        todos={[
          createTodo({ id: 'target', title: 'Target Todo', priority: 'medium', is_completed: true }),
          createTodo({ id: 'other-incomplete', title: 'Other Incomplete', priority: 'low', is_completed: false }),
          createTodo({ id: 'completed-high', title: 'Completed High', priority: 'high', is_completed: true }),
        ]}
      />,
    );

    expect(getAllByTestId(/^todo-title-/).map((node) => node.props.children)).toEqual([
      'Other Incomplete',
      'Completed High',
      'Target Todo',
    ]);
  });
});
