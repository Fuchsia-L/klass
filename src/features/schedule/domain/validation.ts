export function validateTimeRange(start: string, end: string): boolean {
  return new Date(start) < new Date(end);
}
