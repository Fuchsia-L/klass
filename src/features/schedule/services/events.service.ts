import { generateId } from '../../../shared/lib/id';
import { detectConflicts } from '../domain/conflicts';
import { validateTimeRange } from '../domain/validation';
import { loadEventsFromStorage, saveEventsToStorage } from '../storage/events.storage';
import { ScheduleEvent } from '../types';

type EventMutationResult = {
  success: boolean;
  conflicts?: ScheduleEvent[];
  error?: string;
};

type EventInput = Omit<ScheduleEvent, 'id' | 'is_completed'>;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

async function persist(events: ScheduleEvent[]) {
  await saveEventsToStorage(events);
  notify();
}

export async function loadEvents(): Promise<ScheduleEvent[]> {
  return loadEventsFromStorage();
}

export function subscribeToEvents(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function addEvent(event: EventInput): Promise<EventMutationResult> {
  if (!validateTimeRange(event.start_time, event.end_time)) {
    return { success: false, error: '开始时间必须早于结束时间' };
  }

  const nextEvent: ScheduleEvent = {
    ...event,
    id: generateId(),
    is_completed: false,
  };

  const events = await loadEvents();
  const conflicts = detectConflicts(nextEvent, events);
  if (conflicts.length > 0) {
    return { success: false, conflicts, error: '与已有事件时间冲突' };
  }

  await persist([...events, nextEvent]);
  return { success: true };
}

export async function updateEvent(event: ScheduleEvent): Promise<EventMutationResult> {
  if (!validateTimeRange(event.start_time, event.end_time)) {
    return { success: false, error: '开始时间必须早于结束时间' };
  }

  const events = await loadEvents();
  const conflicts = detectConflicts(event, events);
  if (conflicts.length > 0) {
    return { success: false, conflicts, error: '与已有事件时间冲突' };
  }

  await persist(events.map((current) => (current.id === event.id ? event : current)));
  return { success: true };
}

export async function deleteEvent(id: string): Promise<void> {
  const events = await loadEvents();
  await persist(events.filter((event) => event.id !== id));
}

export async function toggleComplete(id: string): Promise<void> {
  const events = await loadEvents();
  await persist(
    events.map((event) =>
      event.id === id ? { ...event, is_completed: !event.is_completed } : event,
    ),
  );
}
