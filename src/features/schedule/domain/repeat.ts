import { formatLocalDate } from '../../../shared/lib/date';
import { ScheduleEvent } from '../types';

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isAfterRepeatUntil(date: Date, repeatUntil?: string): boolean {
  return repeatUntil !== undefined && formatLocalDate(date) > repeatUntil;
}

export function expandRepeatingEvents(
  events: ScheduleEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): ScheduleEvent[] {
  const result: ScheduleEvent[] = [];

  for (const event of events) {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const duration = eventEnd.getTime() - eventStart.getTime();

    if (event.repeat === 'none') {
      if (eventStart <= rangeEnd && eventEnd >= rangeStart) {
        result.push(event);
      }
      continue;
    }

    const stepDays = event.repeat === 'daily' ? 1 : 7;
    let cursor = new Date(eventStart);

    while (cursor.getTime() + duration < rangeStart.getTime()) {
      cursor = addDays(cursor, stepDays);
    }

    if (isAfterRepeatUntil(cursor, event.repeat_until)) {
      continue;
    }

    while (cursor <= rangeEnd) {
      if (isAfterRepeatUntil(cursor, event.repeat_until)) {
        break;
      }

      const instanceEnd = new Date(cursor.getTime() + duration);
      if (instanceEnd >= rangeStart) {
        result.push({
          ...event,
          start_time: cursor.toISOString(),
          end_time: instanceEnd.toISOString(),
        });
      }
      cursor = addDays(cursor, stepDays);
    }
  }

  return result;
}
