import { ScheduleEvent } from '../types';
import { expandRepeatingEvents } from './repeat';

export function detectConflicts(
  candidate: ScheduleEvent,
  allEvents: ScheduleEvent[],
): ScheduleEvent[] {
  const candidateStart = new Date(candidate.start_time);
  const candidateEnd = new Date(candidate.end_time);
  const rangeStart = new Date(candidateStart);
  rangeStart.setMonth(rangeStart.getMonth() - 1);
  const rangeEnd = new Date(candidateEnd);
  rangeEnd.setMonth(rangeEnd.getMonth() + 1);

  const expandedEvents = expandRepeatingEvents(
    allEvents.filter((event) => event.id !== candidate.id),
    rangeStart,
    rangeEnd,
  );
  const candidateInstances = expandRepeatingEvents([candidate], rangeStart, rangeEnd);
  const conflicts: ScheduleEvent[] = [];

  for (const instance of candidateInstances) {
    const instanceStart = new Date(instance.start_time).getTime();
    const instanceEnd = new Date(instance.end_time).getTime();

    for (const event of expandedEvents) {
      const eventStart = new Date(event.start_time).getTime();
      const eventEnd = new Date(event.end_time).getTime();
      if (instanceStart < eventEnd && instanceEnd > eventStart) {
        if (!conflicts.find((conflict) => conflict.id === event.id)) {
          conflicts.push(event);
        }
      }
    }
  }

  return conflicts;
}
