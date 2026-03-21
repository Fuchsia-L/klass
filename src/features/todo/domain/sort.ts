import { PRIORITY_ORDER, TodoItem } from '../types';

export function sortTodosForDisplay(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    const completionDiff = Number(a.is_completed) - Number(b.is_completed);
    if (completionDiff !== 0) return completionDiff;

    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}
