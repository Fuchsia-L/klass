import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  events: 'cyberschedule_events',
  semester: 'cyberschedule_semester',
  theme: 'cyberschedule_theme',
  todos: 'cyberschedule_todos',
} as const;

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveJSON<T>(key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}
