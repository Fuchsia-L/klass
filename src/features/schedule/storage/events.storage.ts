import { loadJSON, saveJSON, STORAGE_KEYS } from '../../../platform/storage/async-storage';
import { CategoryKey, CATEGORIES, RepeatType, ScheduleEvent } from '../types';

let cachedEvents: ScheduleEvent[] | null = null;

function cloneEvents(events: ScheduleEvent[]): ScheduleEvent[] {
  return events.map((event) => ({ ...event }));
}

function isValidRepeatType(value: unknown): value is RepeatType {
  return value === 'none' || value === 'daily' || value === 'weekly';
}

function isValidCategory(value: unknown): value is CategoryKey {
  return typeof value === 'string' && value in CATEGORIES;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function isValidReminder(value: unknown): value is ScheduleEvent['reminder_minutes'] {
  return value === undefined || value === 5 || value === 15 || value === 30;
}

function isScheduleEvent(value: unknown): value is ScheduleEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    isValidCategory(event.category) &&
    isValidDateString(event.start_time) &&
    isValidDateString(event.end_time) &&
    isValidRepeatType(event.repeat) &&
    isValidReminder(event.reminder_minutes)
  );
}

export async function loadEventsFromStorage(): Promise<ScheduleEvent[]> {
  if (cachedEvents) return cloneEvents(cachedEvents);

  const data = await loadJSON<unknown>(STORAGE_KEYS.events);
  const rawEvents = Array.isArray(data) ? data : [];
  const validEvents = rawEvents.filter((value, index): value is ScheduleEvent => {
    const valid = isScheduleEvent(value);
    if (!valid) {
      console.warn(`Discarded invalid event at index ${index} from storage`);
    }
    return valid;
  });

  cachedEvents = cloneEvents(validEvents);
  return cloneEvents(cachedEvents);
}

export async function saveEventsToStorage(events: ScheduleEvent[]): Promise<void> {
  cachedEvents = cloneEvents(events);
  await saveJSON(STORAGE_KEYS.events, cachedEvents);
}
