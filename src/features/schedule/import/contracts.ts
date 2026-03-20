export const WHUT_IMPORT_PRESENTATION = 'settings-modal' as const;

export const WHUT_IMPORT_DEPENDENCIES = {
  semesterStartDate: 'required',
  sessionSource: 'cas-webview-login',
} as const;

export const WHUT_TERM_CODE_RESOLUTION_ORDER = [
  'jwxt-current-term',
  'course-list-term-code',
] as const;

export const WHUT_CLASS_PERIOD_TIME_MAP = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '08:50', end: '09:35' },
  3: { start: '09:55', end: '10:40' },
  4: { start: '10:45', end: '11:30' },
  5: { start: '11:35', end: '12:20' },
  6: { start: '14:00', end: '14:45' },
  7: { start: '14:50', end: '15:35' },
  8: { start: '15:55', end: '16:40' },
  9: { start: '16:45', end: '17:30' },
  10: { start: '17:35', end: '18:20' },
  11: { start: '19:00', end: '19:45' },
  12: { start: '19:50', end: '20:35' },
  13: { start: '20:40', end: '21:25' },
} as const;

export type WhutClassPeriod = keyof typeof WHUT_CLASS_PERIOD_TIME_MAP;

export interface WhutArrangedScheduleItem {
  courseName: string;
  dayOfWeek: number | `${number}`;
  beginSection: number | `${number}`;
  endSection: number | `${number}`;
  week: string;
  location?: string;
  teacher?: string;
  notes?: string;
}

export interface WhutArrangedScheduleItemRaw {
  courseName: string;
  dayOfWeek: number | `${number}`;
  beginSection: number | `${number}`;
  endSection: number | `${number}`;
  week: string;
  placeName?: string;
  teacher?: string;
  weeksAndTeachers?: string;
}

export interface WhutCourseScheduleItemRaw {
  kcmc: string;
  xqj: number | `${number}`;
  ksjc: number | `${number}`;
  jsjc: number | `${number}`;
  zcd: string;
  cdmc?: string;
  jxcdmc?: string;
  jsxx?: string;
  xnxqdm?: string;
}

export interface WhutCourseTableResponseRaw {
  xnxqdm?: string;
  kbList?: WhutCourseScheduleItemRaw[];
  arrangedList?: WhutArrangedScheduleItemRaw[];
}

export function normalizeRawScheduleItem(
  raw: WhutCourseScheduleItemRaw,
): WhutArrangedScheduleItem {
  return {
    courseName: raw.kcmc,
    dayOfWeek: raw.xqj,
    beginSection: raw.ksjc,
    endSection: raw.jsjc,
    week: raw.zcd,
    location: raw.cdmc ?? raw.jxcdmc,
    teacher: raw.jsxx,
  };
}

export function normalizeArrangedScheduleItem(
  raw: WhutArrangedScheduleItemRaw,
): WhutArrangedScheduleItem {
  return {
    courseName: raw.courseName,
    dayOfWeek: raw.dayOfWeek,
    beginSection: raw.beginSection,
    endSection: raw.endSection,
    week: raw.week,
    location: raw.placeName,
    teacher: raw.teacher,
    notes: raw.weeksAndTeachers,
  };
}

export function extractArrangedScheduleItems(
  scheduleDetail: WhutCourseTableResponseRaw,
): WhutArrangedScheduleItem[] {
  if (Array.isArray(scheduleDetail.arrangedList)) {
    return scheduleDetail.arrangedList.map(normalizeArrangedScheduleItem);
  }

  if (Array.isArray(scheduleDetail.kbList)) {
    return scheduleDetail.kbList.map(normalizeRawScheduleItem);
  }

  return [];
}
