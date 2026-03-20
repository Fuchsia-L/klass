import { generateId } from '../../../shared/lib/id';
import { replaceImportedEvents } from '../services/events.service';
import { ScheduleEvent, SemesterConfig } from '../types';
import { WHUT_CLASS_PERIOD_TIME_MAP, WhutArrangedScheduleItem, WhutClassPeriod } from './contracts';

type ClassPeriodTimeMap = typeof WHUT_CLASS_PERIOD_TIME_MAP;

function toPositiveInteger(value: number | `${number}`, fieldName: string): number {
  const normalized = typeof value === 'string' ? Number.parseInt(value, 10) : value;

  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }

  return normalized;
}

function parseSemesterStartDate(startDate: string): Date {
  const [year, month, day] = startDate.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid semester start date: ${startDate}`);
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getPeriodWindow(
  beginSection: number,
  endSection: number,
  classPeriodTimeMap: ClassPeriodTimeMap,
): { start: string; end: string } {
  if (beginSection > endSection) {
    throw new Error(`Invalid section range: ${beginSection}-${endSection}`);
  }

  const startPeriod = classPeriodTimeMap[beginSection as WhutClassPeriod];
  const endPeriod = classPeriodTimeMap[endSection as WhutClassPeriod];

  if (!startPeriod || !endPeriod) {
    throw new Error(`Unsupported section range: ${beginSection}-${endSection}`);
  }

  return {
    start: startPeriod.start,
    end: endPeriod.end,
  };
}

function buildDateTime(baseDate: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const year = baseDate.getFullYear();
  const month = `${baseDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${baseDate.getDate()}`.padStart(2, '0');
  const normalizedHours = `${hours}`.padStart(2, '0');
  const normalizedMinutes = `${minutes}`.padStart(2, '0');

  return `${year}-${month}-${day}T${normalizedHours}:${normalizedMinutes}:00`;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function expandWeekBitmap(weekBitmap: string, totalWeeks?: number): number[] {
  const bits = weekBitmap.replace(/[^01]/g, '').slice(0, totalWeeks ?? 30);
  const weeks: number[] = [];

  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] === '1') {
      weeks.push(index + 1);
    }
  }

  return weeks;
}

function formatWeekList(weeks: number[]): string {
  if (weeks.length === 0) {
    return '无';
  }

  return weeks.map((week) => `第${week}周`).join('、');
}

function buildNotes(item: WhutArrangedScheduleItem, weeks: number[]): string | undefined {
  const lines = [
    item.teacher ? `教师：${item.teacher}` : undefined,
    `周次：${formatWeekList(weeks)}`,
    `节次：第${item.beginSection}-${item.endSection}节`,
    item.notes,
  ].filter((value): value is string => Boolean(value));

  return lines.length > 0 ? lines.join('\n') : undefined;
}

export function convertWhutArrangedListToEvents(options: {
  arrangedList: WhutArrangedScheduleItem[];
  semesterConfig: Pick<SemesterConfig, 'start_date' | 'total_weeks'>;
  classPeriodTimeMap?: ClassPeriodTimeMap;
}): ScheduleEvent[] {
  const {
    arrangedList,
    semesterConfig,
    classPeriodTimeMap = WHUT_CLASS_PERIOD_TIME_MAP,
  } = options;
  const semesterStartDate = parseSemesterStartDate(semesterConfig.start_date);

  return arrangedList.flatMap((item) => {
    const dayOfWeek = toPositiveInteger(item.dayOfWeek, 'dayOfWeek');
    const beginSection = toPositiveInteger(item.beginSection, 'beginSection');
    const endSection = toPositiveInteger(item.endSection, 'endSection');
    const activeWeeks = expandWeekBitmap(item.week, semesterConfig.total_weeks);

    if (dayOfWeek > 7) {
      throw new Error(`Invalid dayOfWeek: ${item.dayOfWeek}`);
    }

    const periodWindow = getPeriodWindow(beginSection, endSection, classPeriodTimeMap);
    const notes = buildNotes(item, activeWeeks);

    return activeWeeks.map((weekNumber) => {
      const classDate = addDays(semesterStartDate, (weekNumber - 1) * 7 + (dayOfWeek - 1));
      const startTime = buildDateTime(classDate, periodWindow.start);
      const endTime = buildDateTime(classDate, periodWindow.end);

      return {
        id: generateId(),
        title: item.courseName,
        category: '学习',
        start_time: startTime,
        end_time: endTime,
        repeat: 'none',
        location: item.location,
        notes,
        source: 'whut-import',
        is_completed: false,
      } satisfies ScheduleEvent;
    });
  });
}

export async function importWhutArrangedList(options: {
  arrangedList: WhutArrangedScheduleItem[];
  semesterConfig: Pick<SemesterConfig, 'start_date' | 'total_weeks'>;
  classPeriodTimeMap?: ClassPeriodTimeMap;
}): Promise<ScheduleEvent[]> {
  const events = convertWhutArrangedListToEvents(options);

  await replaceImportedEvents(events);

  return events;
}
