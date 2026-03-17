const MIN_START_MINUTES = 6 * 60;
const MAX_END_MINUTES = 24 * 60;

function isExactMidnight(date: Date): boolean {
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
}

function getMinutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function validateTimeRange(start: string, end: string): boolean {
  return new Date(start) < new Date(end);
}

export function validateTimeHour(isoTime: string, options?: { allowMidnight?: boolean }): boolean {
  const date = new Date(isoTime);
  const minutes = getMinutesOfDay(date);
  if (options?.allowMidnight && isExactMidnight(date)) {
    return true;
  }
  return minutes >= MIN_START_MINUTES && minutes < MAX_END_MINUTES;
}

export function validateEventTimeWindow(start: string, end: string): boolean {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (!validateTimeRange(start, end)) {
    return false;
  }

  if (!validateTimeHour(start)) {
    return false;
  }

  if (isSameCalendarDay(startDate, endDate)) {
    return validateTimeHour(end);
  }

  const nextDayMidnight = new Date(startDate);
  nextDayMidnight.setDate(nextDayMidnight.getDate() + 1);
  nextDayMidnight.setHours(0, 0, 0, 0);

  return endDate.getTime() === nextDayMidnight.getTime();
}
