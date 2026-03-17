import { loadJSON, saveJSON, STORAGE_KEYS } from '../../../platform/storage/async-storage';
import { TodoItem, TodoType, Priority, PRIORITY_ORDER } from '../types';

let cachedTodos: TodoItem[] | null = null;

function cloneTodos(todos: TodoItem[]): TodoItem[] {
  return todos.map((t) => ({ ...t }));
}

function isValidTodoType(v: unknown): v is TodoType {
  return v === 'daily' || v === 'weekly' || v === 'longterm';
}

function isValidPriority(v: unknown): v is Priority {
  return v === 'high' || v === 'medium' || v === 'low';
}

function isTodoItem(v: unknown): v is TodoItem {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    isValidTodoType(t.type) &&
    isValidPriority(t.priority) &&
    typeof t.is_completed === 'boolean' &&
    typeof t.last_reset === 'string' &&
    typeof t.created_at === 'string'
  );
}

export async function loadTodosFromStorage(): Promise<TodoItem[]> {
  if (cachedTodos) return cloneTodos(cachedTodos);

  const data = await loadJSON<unknown>(STORAGE_KEYS.todos);
  const raw = Array.isArray(data) ? data : [];
  const valid = raw.filter((v, i): v is TodoItem => {
    const ok = isTodoItem(v);
    if (!ok) console.warn(`Discarded invalid todo at index ${i}`);
    return ok;
  });

  cachedTodos = cloneTodos(valid);
  return cloneTodos(cachedTodos);
}

export async function saveTodosToStorage(todos: TodoItem[]): Promise<void> {
  const snapshot = cloneTodos(todos);
  await saveJSON(STORAGE_KEYS.todos, snapshot);
  cachedTodos = snapshot;
}

export function clearTodosCache(): void {
  cachedTodos = null;
}
