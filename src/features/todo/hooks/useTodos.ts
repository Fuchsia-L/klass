import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTodos, subscribeToTodos } from '../services/todo.service';
import { TodoItem } from '../types';

export function useTodos(): {
  todos: TodoItem[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const data = await loadTodos();
    if (!isMountedRef.current) return;
    setTodos(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    const unsubscribe = subscribeToTodos(() => {
      loadTodos().then((data) => {
        if (!isMountedRef.current) return;
        setTodos(data);
      });
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [refresh]);

  return { todos, loading, refresh };
}
