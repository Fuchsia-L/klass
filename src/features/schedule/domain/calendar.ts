export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export function getISOWeekNumber(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getSemesterWeek(semesterStart: string, date: Date): number | null {
  const start = getWeekStart(new Date(semesterStart));
  const current = getWeekStart(date);
  const diff = current.getTime() - start.getTime();
  const weeks = Math.floor(diff / (7 * 86400000)) + 1;
  return weeks >= 1 ? weeks : null;
}
