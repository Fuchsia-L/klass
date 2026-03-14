import { ScheduleEvent } from '../types';

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
      cursor.setDate(cursor.getDate() + stepDays);
    }

    while (cursor <= rangeEnd) {
      const instanceEnd = new Date(cursor.getTime() + duration);
      if (instanceEnd >= rangeStart) {
        result.push({
          ...event,
          start_time: cursor.toISOString(),
          end_time: instanceEnd.toISOString(),
        });
      }
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + stepDays);
    }
  }

  return result;
}
