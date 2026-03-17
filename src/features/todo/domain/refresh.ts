import { TodoItem } from '../types';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getISOWeekAndYear(date: Date): { week: number; year: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const isoYear = d.getFullYear();
  const week1 = new Date(isoYear, 0, 4);
  const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return { week, year: isoYear };
}

/**
 * Refresh completion status for daily/weekly todos.
 * Returns a new array if any todo was reset, otherwise returns the same reference.
 */
export function refreshTodos(todos: TodoItem[], now: Date = new Date()): TodoItem[] {
  let changed = false;
  const refreshed = todos.map((todo) => {
    if (!todo.is_completed) return todo;

    const lastReset = new Date(todo.last_reset);

    if (todo.type === 'daily') {
      const todayStart = startOfDay(now);
      const resetStart = startOfDay(lastReset);
      if (todayStart.getTime() > resetStart.getTime()) {
        changed = true;
        return { ...todo, is_completed: false, last_reset: now.toISOString() };
      }
    }

    if (todo.type === 'weekly') {
      const { week: nowWeek, year: nowYear } = getISOWeekAndYear(now);
      const { week: resetWeek, year: resetYear } = getISOWeekAndYear(lastReset);
      if (nowYear > resetYear || (nowYear === resetYear && nowWeek > resetWeek)) {
        changed = true;
        return { ...todo, is_completed: false, last_reset: now.toISOString() };
      }
    }

    return todo;
  });

  return changed ? refreshed : todos;
}
