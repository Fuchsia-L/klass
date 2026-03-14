export type CategoryKey = '学习' | '工作' | '生活' | '运动' | '娱乐' | '其他';

export interface CategoryInfo {
  key: CategoryKey;
  label: string;
  color: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryInfo> = {
  '学习': { key: '学习', label: 'STUDY', color: '#00F0FF' },
  '工作': { key: '工作', label: 'WORK', color: '#A855F7' },
  '生活': { key: '生活', label: 'LIFE', color: '#39FF14' },
  '运动': { key: '运动', label: 'SPORT', color: '#F59E0B' },
  '娱乐': { key: '娱乐', label: 'FUN', color: '#FF2D78' },
  '其他': { key: '其他', label: 'OTHER', color: '#64748B' },
};

export type RepeatType = 'none' | 'daily' | 'weekly';

export interface ScheduleEvent {
  id: string;
  title: string;
  category: CategoryKey;
  start_time: string;
  end_time: string;
  repeat: RepeatType;
  location?: string;
  reminder_minutes?: 5 | 15 | 30;
  notes?: string;
  is_completed: boolean;
}

export interface SemesterConfig {
  start_date: string;
  total_weeks: number;
}
