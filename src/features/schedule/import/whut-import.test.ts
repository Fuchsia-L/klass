import { clearEventsCache, saveEventsToStorage } from '../storage/events.storage';
import { loadEvents, resetEventsState, subscribeToEvents } from '../services/events.service';
import { ScheduleEvent } from '../types';
import { convertWhutArrangedListToEvents, importWhutArrangedList } from './whut-import';
import { normalizeRawScheduleItem } from './contracts';

function toIsoDateTime(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): string {
  return `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}T${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}:00`;
}

describe('WHUT arranged list conversion', () => {
  beforeEach(() => {
    resetEventsState();
    clearEventsCache();
  });

  it('expands only active bitmap weeks into discrete imported events', () => {
    const events = convertWhutArrangedListToEvents({
      arrangedList: [
        {
          courseName: '高等数学',
          dayOfWeek: 3,
          beginSection: 1,
          endSection: 2,
          week: '101010000000000000000000000000',
          location: '南湖校区博学主楼',
          teacher: '张老师',
        },
      ],
      semesterConfig: {
        start_date: '2026-02-23',
        total_weeks: 18,
      },
    });

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.start_time)).toEqual([
      toIsoDateTime(2026, 2, 25, 8, 0),
      toIsoDateTime(2026, 3, 11, 8, 0),
      toIsoDateTime(2026, 3, 25, 8, 0),
    ]);
    expect(events.map((event) => event.end_time)).toEqual([
      toIsoDateTime(2026, 2, 25, 9, 35),
      toIsoDateTime(2026, 3, 11, 9, 35),
      toIsoDateTime(2026, 3, 25, 9, 35),
    ]);
    expect(events[0]).toMatchObject({
      title: '高等数学',
      category: '学习',
      repeat: 'none',
      location: '南湖校区博学主楼',
      source: 'whut-import',
      is_completed: false,
    });
    expect(events[0].notes).toContain('教师：张老师');
    expect(events[0].notes).toContain('周次：第1周、第3周、第5周');
  });

  it('derives the natural date and class time window from start_date and dayOfWeek', () => {
    const [event] = convertWhutArrangedListToEvents({
      arrangedList: [
        {
          courseName: '大学英语',
          dayOfWeek: 5,
          beginSection: 6,
          endSection: 8,
          week: '100000000000000000000000000000',
          teacher: '李老师',
        },
      ],
      semesterConfig: {
        start_date: '2026-02-23',
        total_weeks: 20,
      },
    });

    expect(event.start_time).toBe(toIsoDateTime(2026, 2, 27, 14, 0));
    expect(event.end_time).toBe(toIsoDateTime(2026, 2, 27, 16, 40));
  });

  it('maps dayOfWeek 7 to sunday of the same teaching week', () => {
    const [event] = convertWhutArrangedListToEvents({
      arrangedList: [
        {
          courseName: '体育',
          dayOfWeek: 7,
          beginSection: 11,
          endSection: 12,
          week: '100000000000000000000000000000',
        },
      ],
      semesterConfig: {
        start_date: '2026-02-23',
        total_weeks: 18,
      },
    });

    expect(event.start_time).toBe(toIsoDateTime(2026, 3, 1, 19, 0));
    expect(event.end_time).toBe(toIsoDateTime(2026, 3, 1, 20, 35));
  });

  it('reports invalid dayOfWeek before section-range errors', () => {
    expect(() =>
      convertWhutArrangedListToEvents({
        arrangedList: [
          {
            courseName: '测试课程',
            dayOfWeek: 8,
            beginSection: 99,
            endSection: 100,
            week: '100000000000000000000000000000',
          },
        ],
        semesterConfig: {
          start_date: '2026-02-23',
          total_weeks: 18,
        },
      }),
    ).toThrow('Invalid dayOfWeek: 8');
  });
});

describe('WHUT raw schedule normalization', () => {
  it('maps raw api fields to arranged schedule fields', () => {
    expect(
      normalizeRawScheduleItem({
        kcmc: '离散数学',
        xqj: '4',
        ksjc: '3',
        jsjc: '4',
        zcd: '101000000000000000000000000000',
        cdmc: '南湖综合楼',
        jsxx: '陈老师',
      }),
    ).toEqual({
      courseName: '离散数学',
      dayOfWeek: '4',
      beginSection: '3',
      endSection: '4',
      week: '101000000000000000000000000000',
      location: '南湖综合楼',
      teacher: '陈老师',
    });
  });
});

describe('WHUT import persistence', () => {
  beforeEach(() => {
    resetEventsState();
    clearEventsCache();
  });

  it('keeps whut-import event count stable across repeated imports of the same payload', async () => {
    const payload = {
      arrangedList: [
        {
          courseName: '数据库系统',
          dayOfWeek: 3,
          beginSection: 1,
          endSection: 2,
          week: '101000000000000000000000000000',
          location: '南湖综合楼',
          teacher: '黄老师',
        },
      ],
      semesterConfig: {
        start_date: '2026-02-23',
        total_weeks: 18,
      },
    };

    await importWhutArrangedList(payload);
    const firstImportEvents = (await loadEvents()).filter((event) => event.source === 'whut-import');
    await importWhutArrangedList(payload);

    const storedEvents = await loadEvents();
    const importedEvents = storedEvents.filter((event) => event.source === 'whut-import');

    expect(importedEvents).toHaveLength(2);
    expect(importedEvents.every((event) => !firstImportEvents.some((previous) => previous.id === event.id))).toBe(true);
  });

  it('deduplicates identical class occurrences within a single imported payload', async () => {
    const importedEvents = await importWhutArrangedList({
      arrangedList: [
        {
          courseName: '计算机网络',
          dayOfWeek: 4,
          beginSection: 3,
          endSection: 4,
          week: '100000000000000000000000000000',
          location: '鉴湖教学楼',
          teacher: '陈老师',
        },
        {
          courseName: '计算机网络',
          dayOfWeek: 4,
          beginSection: 3,
          endSection: 4,
          week: '100000000000000000000000000000',
          location: '鉴湖教学楼',
          teacher: '陈老师',
        },
      ],
      semesterConfig: {
        start_date: '2026-02-23',
        total_weeks: 18,
      },
    });

    expect(importedEvents).toHaveLength(1);
  });

  it('does not collapse distinct events when title or location contains delimiter-like text', async () => {
    const importedEvents = await importWhutArrangedList({
      arrangedList: [
        {
          courseName: '计算机组成原理',
          dayOfWeek: 4,
          beginSection: 3,
          endSection: 4,
          week: '100000000000000000000000000000',
          location: '鉴湖教学楼::A101',
          teacher: '陈老师',
        },
        {
          courseName: '计算机组成原理::鉴湖教学楼',
          dayOfWeek: 4,
          beginSection: 3,
          endSection: 4,
          week: '100000000000000000000000000000',
          location: 'A101',
          teacher: '陈老师',
        },
      ],
      semesterConfig: {
        start_date: '2026-02-23',
        total_weeks: 18,
      },
    });

    expect(importedEvents).toHaveLength(2);
  });

  it('replaces previous whut-import events while preserving manual events', async () => {
    const existingManualEvent: ScheduleEvent = {
      id: 'manual-1',
      title: '手动创建会议',
      category: '工作',
      start_time: toIsoDateTime(2026, 2, 24, 10, 0),
      end_time: toIsoDateTime(2026, 2, 24, 11, 0),
      repeat: 'none',
      source: 'manual',
      is_completed: false,
    };
    const existingImportedEvent: ScheduleEvent = {
      id: 'imported-old-1',
      title: '旧课表',
      category: '学习',
      start_time: toIsoDateTime(2026, 2, 23, 8, 0),
      end_time: toIsoDateTime(2026, 2, 23, 9, 0),
      repeat: 'none',
      source: 'whut-import',
      is_completed: false,
    };

    await saveEventsToStorage([existingManualEvent, existingImportedEvent]);

    const importedEvents = await importWhutArrangedList({
      arrangedList: [
        {
          courseName: '线性代数',
          dayOfWeek: 2,
          beginSection: 3,
          endSection: 4,
          week: '110000000000000000000000000000',
          location: '鉴湖教学楼',
          teacher: '王老师',
        },
      ],
      semesterConfig: {
        start_date: '2026-02-23',
        total_weeks: 16,
      },
    });

    const storedEvents = await loadEvents();

    expect(storedEvents).toEqual([existingManualEvent, ...importedEvents]);
    expect(storedEvents.find((event) => event.id === existingImportedEvent.id)).toBeUndefined();
    expect(storedEvents.filter((event) => event.source === 'manual')).toEqual([existingManualEvent]);
    expect(storedEvents.filter((event) => event.source === 'whut-import')).toHaveLength(2);
  });

  it('notifies event subscribers once after imported events are persisted', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToEvents(listener);

    try {
      await importWhutArrangedList({
        arrangedList: [
          {
            courseName: '数据结构',
            dayOfWeek: 1,
            beginSection: 1,
            endSection: 2,
            week: '100000000000000000000000000000',
            teacher: '周老师',
          },
        ],
        semesterConfig: {
          start_date: '2026-02-23',
          total_weeks: 18,
        },
      });
    } finally {
      unsubscribe();
    }

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
