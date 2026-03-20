export type WhutTermCodeSource = 'jwxt-current-term' | 'semester-config' | 'current-date';

export type ResolvedWhutTermCode = {
  termCode: string | null;
  source: WhutTermCodeSource | null;
  needsConfirmation: boolean;
};

function padAcademicYear(year: number): string {
  return `${year}-${year + 1}`;
}

export function isValidWhutTermCode(termCode: unknown): termCode is string {
  return typeof termCode === 'string' && /^\d{4}-\d{4}-[12]$/.test(termCode.trim());
}

export function deriveWhutTermCodeFromDate(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month >= 8) {
    return `${padAcademicYear(year)}-1`;
  }

  if (month >= 2) {
    return `${padAcademicYear(year - 1)}-2`;
  }

  return `${padAcademicYear(year - 1)}-1`;
}

export function deriveWhutTermCodeFromSemesterStart(semesterStartDate: string): string {
  const parsedDate = new Date(semesterStartDate);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid semester start date: ${semesterStartDate}`);
  }

  return deriveWhutTermCodeFromDate(parsedDate);
}

export function resolveWhutTermCode(options: {
  currentTermCode?: string | null;
  semesterStartDate?: string | null;
  now?: Date;
}): ResolvedWhutTermCode {
  const { currentTermCode, semesterStartDate, now = new Date() } = options;

  if (isValidWhutTermCode(currentTermCode)) {
    return {
      termCode: currentTermCode.trim(),
      source: 'jwxt-current-term',
      needsConfirmation: false,
    };
  }

  if (semesterStartDate) {
    return {
      termCode: deriveWhutTermCodeFromSemesterStart(semesterStartDate),
      source: 'semester-config',
      needsConfirmation: true,
    };
  }

  return {
    termCode: deriveWhutTermCodeFromDate(now),
    source: 'current-date',
    needsConfirmation: true,
  };
}
