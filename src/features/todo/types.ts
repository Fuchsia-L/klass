export type TodoType = 'daily' | 'weekly' | 'longterm';

export type Priority = 'high' | 'medium' | 'low';

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const TODO_TYPE_LABELS: Record<TodoType, string> = {
  daily: '每日',
  weekly: '每周',
  longterm: '长期',
};

export interface TodoItem {
  id: string;
  title: string;
  type: TodoType;
  priority: Priority;
  is_completed: boolean;
  /** ISO date string of last completion reset */
  last_reset: string;
  created_at: string;
}
