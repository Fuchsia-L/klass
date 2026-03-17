import { generateId } from '../../../shared/lib/id';
import { refreshTodos } from '../domain/refresh';
import { clearTodosCache, loadTodosFromStorage, saveTodosToStorage } from '../storage/todo.storage';
import { Priority, TodoItem, TodoType } from '../types';

export type TodoInput = {
  title: string;
  type: TodoType;
  priority: Priority;
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function persist(todos: TodoItem[]) {
  await saveTodosToStorage(todos);
  notify();
}

export async function loadTodos(): Promise<TodoItem[]> {
  const todos = await loadTodosFromStorage();
  const refreshed = refreshTodos(todos);
  if (refreshed !== todos) {
    await persist(refreshed);
    return refreshed;
  }
  return todos;
}

export function subscribeToTodos(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function addTodo(input: TodoInput): Promise<void> {
  const now = new Date().toISOString();
  const todo: TodoItem = {
    id: generateId(),
    title: input.title,
    type: input.type,
    priority: input.priority,
    is_completed: false,
    last_reset: now,
    created_at: now,
  };
  const todos = await loadTodos();
  await persist([...todos, todo]);
}

export async function updateTodo(id: string, input: TodoInput): Promise<void> {
  const todos = await loadTodos();
  await persist(
    todos.map((t) => (t.id === id ? { ...t, title: input.title, type: input.type, priority: input.priority } : t)),
  );
}

export async function deleteTodo(id: string): Promise<void> {
  const todos = await loadTodos();
  await persist(todos.filter((t) => t.id !== id));
}

export async function toggleTodoComplete(id: string): Promise<void> {
  const todos = await loadTodos();
  const now = new Date().toISOString();
  await persist(
    todos.map((t) =>
      t.id === id ? { ...t, is_completed: !t.is_completed, last_reset: now } : t,
    ),
  );
}

export function resetTodosState(): void {
  clearTodosCache();
  notify();
}
