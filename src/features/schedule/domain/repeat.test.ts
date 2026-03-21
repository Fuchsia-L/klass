import { expandRepeatingEvents } from './repeat';
import type { ScheduleEvent } from '../types';

function createRepeatingEvent(overrides: Partial<ScheduleEvent>): ScheduleEvent {
  return {
    id: overrides.id ?? 'event-1',
    title: overrides.title ?? 'Repeating Event',
    category: overrides.category ?? '学习',
    start_time: overrides.start_time ?? '2026-03-19T08:00:00.000Z',
    end_time: overrides.end_time ?? '2026-03-19T09:00:00.000Z',
    repeat: overrides.repeat ?? 'daily',
    repeat_until: overrides.repeat_until,
    is_completed: overrides.is_completed ?? false,
  };
}

describe('expandRepeatingEvents', () => {
  it('expands daily events until the repeat_until date inclusively', () => {
    const events = [createRepeatingEvent({ repeat: 'daily', repeat_until: '2026-03-21' })];

    const expanded = expandRepeatingEvents(
      events,
      new Date('2026-03-19T00:00:00.000Z'),
      new Date('2026-03-25T23:59:59.999Z'),
    );

    expect(expanded.map((event) => event.start_time.slice(0, 10))).toEqual([
      '2026-03-19',
      '2026-03-20',
      '2026-03-21',
    ]);
  });

  it('expands weekly events on the same weekday without exceeding repeat_until', () => {
    const events = [
      createRepeatingEvent({
        repeat: 'weekly',
        repeat_until: '2026-04-02',
      }),
    ];

    const expanded = expandRepeatingEvents(
      events,
      new Date('2026-03-19T00:00:00.000Z'),
      new Date('2026-04-10T23:59:59.999Z'),
    );

    expect(expanded.map((event) => event.start_time.slice(0, 10))).toEqual([
      '2026-03-19',
      '2026-03-26',
      '2026-04-02',
    ]);
  });

  it('keeps daily events without repeat_until on the original expansion behavior', () => {
    const events = [createRepeatingEvent({ repeat: 'daily' })];

    const expanded = expandRepeatingEvents(
      events,
      new Date('2026-03-19T00:00:00.000Z'),
      new Date('2026-03-22T23:59:59.999Z'),
    );

    expect(expanded.map((event) => event.start_time.slice(0, 10))).toEqual([
      '2026-03-19',
      '2026-03-20',
      '2026-03-21',
      '2026-03-22',
    ]);
  });

  it('keeps weekly events without repeat_until on the original expansion behavior', () => {
    const events = [createRepeatingEvent({ repeat: 'weekly' })];

    const expanded = expandRepeatingEvents(
      events,
      new Date('2026-03-19T00:00:00.000Z'),
      new Date('2026-04-09T23:59:59.999Z'),
    );

    expect(expanded.map((event) => event.start_time.slice(0, 10))).toEqual([
      '2026-03-19',
      '2026-03-26',
      '2026-04-02',
      '2026-04-09',
    ]);
  });

  it('includes exactly one instance when repeat_until matches the start date', () => {
    const events = [
      createRepeatingEvent({
        start_time: new Date(2026, 2, 21, 0, 0, 0, 0).toISOString(),
        end_time: new Date(2026, 2, 21, 1, 0, 0, 0).toISOString(),
        repeat: 'daily',
        repeat_until: '2026-03-21',
      }),
    ];

    const expanded = expandRepeatingEvents(
      events,
      new Date(2026, 2, 21, 0, 0, 0, 0),
      new Date(2026, 2, 25, 23, 59, 59, 999),
    );

    expect(expanded).toHaveLength(1);
    expect(expanded[0].start_time).toBe(events[0].start_time);
  });

  it('returns no instances when repeat_until is before the visible range', () => {
    const events = [createRepeatingEvent({ repeat: 'daily', repeat_until: '2026-03-20' })];

    const expanded = expandRepeatingEvents(
      events,
      new Date('2026-03-22T00:00:00.000Z'),
      new Date('2026-03-25T23:59:59.999Z'),
    );

    expect(expanded).toEqual([]);
  });

  it('stops weekly expansion when repeat_until falls between recurrence dates', () => {
    const events = [
      createRepeatingEvent({
        repeat: 'weekly',
        repeat_until: '2026-03-30',
      }),
    ];

    const expanded = expandRepeatingEvents(
      events,
      new Date('2026-03-19T00:00:00.000Z'),
      new Date('2026-04-10T23:59:59.999Z'),
    );

    expect(expanded.map((event) => event.start_time.slice(0, 10))).toEqual(['2026-03-19', '2026-03-26']);
  });

  it('includes an instance that starts on repeat_until even if it ends after midnight', () => {
    const start = new Date(2026, 2, 21, 23, 0, 0, 0);
    const end = new Date(2026, 2, 22, 1, 0, 0, 0);
    const events = [
      createRepeatingEvent({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        repeat: 'daily',
        repeat_until: '2026-03-21',
      }),
    ];

    const expanded = expandRepeatingEvents(
      events,
      new Date(2026, 2, 21, 0, 0, 0, 0),
      new Date(2026, 2, 22, 23, 59, 59, 999),
    );

    expect(expanded).toHaveLength(1);
    expect(new Date(expanded[0].end_time).getTime()).toBe(end.getTime());
  });
});
