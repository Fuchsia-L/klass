import { sortTodosForDisplay } from './sort';
import type { TodoItem } from '../types';

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

describe('sortTodosForDisplay', () => {
  it('sorts incomplete todos before completed todos', () => {
    const todos = [
      createTodo({ id: 'completed-high', title: 'Completed High', priority: 'high', is_completed: true }),
      createTodo({ id: 'incomplete-low', title: 'Incomplete Low', priority: 'low', is_completed: false }),
      createTodo({ id: 'incomplete-high', title: 'Incomplete High', priority: 'high', is_completed: false }),
      createTodo({ id: 'completed-low', title: 'Completed Low', priority: 'low', is_completed: true }),
    ];

    expect(sortTodosForDisplay(todos).map((todo) => todo.id)).toEqual([
      'incomplete-high',
      'incomplete-low',
      'completed-high',
      'completed-low',
    ]);
  });

  it('keeps priority ordering within the incomplete and completed groups', () => {
    const todos = [
      createTodo({ id: 'completed-medium', priority: 'medium', is_completed: true }),
      createTodo({ id: 'incomplete-low', priority: 'low', is_completed: false }),
      createTodo({ id: 'completed-high', priority: 'high', is_completed: true }),
      createTodo({ id: 'incomplete-medium', priority: 'medium', is_completed: false }),
      createTodo({ id: 'incomplete-high', priority: 'high', is_completed: false }),
      createTodo({ id: 'completed-low', priority: 'low', is_completed: true }),
    ];

    expect(sortTodosForDisplay(todos).map((todo) => todo.id)).toEqual([
      'incomplete-high',
      'incomplete-medium',
      'incomplete-low',
      'completed-high',
      'completed-medium',
      'completed-low',
    ]);
  });

  it('prevents a high-priority completed todo from jumping above an incomplete todo', () => {
    const todos = [
      createTodo({ id: 'completed-high', priority: 'high', is_completed: true }),
      createTodo({ id: 'incomplete-low', priority: 'low', is_completed: false }),
    ];

    expect(sortTodosForDisplay(todos).map((todo) => todo.id)).toEqual([
      'incomplete-low',
      'completed-high',
    ]);
  });
});
