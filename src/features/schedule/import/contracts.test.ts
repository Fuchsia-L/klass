import {
  WHUT_CLASS_PERIOD_TIME_MAP,
  WHUT_IMPORT_DEPENDENCIES,
  WHUT_IMPORT_PRESENTATION,
  WHUT_TERM_CODE_RESOLUTION_ORDER,
} from './contracts';

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);

  return hours * 60 + minutes;
}

describe('WHUT import contracts', () => {
  it('covers the expected class period range with valid time windows', () => {
    const periods = Object.keys(WHUT_CLASS_PERIOD_TIME_MAP).map(Number);

    expect(periods).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

    for (const period of periods) {
      const { start, end } = WHUT_CLASS_PERIOD_TIME_MAP[period as keyof typeof WHUT_CLASS_PERIOD_TIME_MAP];

      expect(toMinutes(start)).toBeLessThan(toMinutes(end));
    }
  });

  it('pins the modal presentation and term resolution strategy', () => {
    expect(WHUT_IMPORT_PRESENTATION).toBe('settings-modal');
    expect(WHUT_IMPORT_DEPENDENCIES.semesterStartDate).toBe('required');
    expect(WHUT_TERM_CODE_RESOLUTION_ORDER).toEqual([
      'jwxt-current-term',
      'course-list-term-code',
    ]);
  });
});
