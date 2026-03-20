import {
  deriveWhutTermCodeFromDate,
  deriveWhutTermCodeFromSemesterStart,
  resolveWhutTermCode,
} from './term-code';

describe('WHUT term code resolution', () => {
  it('derives the fall term code from an autumn date', () => {
    expect(deriveWhutTermCodeFromDate(new Date('2025-09-01T08:00:00'))).toBe('2025-2026-1');
  });

  it('derives the spring term code from semester config', () => {
    expect(deriveWhutTermCodeFromSemesterStart('2026-02-23')).toBe('2025-2026-2');
  });

  it('prefers the current term code reported by jwxt', () => {
    expect(
      resolveWhutTermCode({
        currentTermCode: '2025-2026-2',
        semesterStartDate: '2026-02-23',
        now: new Date('2026-03-01T00:00:00'),
      }),
    ).toEqual({
      termCode: '2025-2026-2',
      source: 'jwxt-current-term',
      needsConfirmation: false,
    });
  });

  it('falls back to a confirmable default when jwxt does not expose current term', () => {
    expect(
      resolveWhutTermCode({
        currentTermCode: undefined,
        semesterStartDate: '2026-02-23',
      }),
    ).toEqual({
      termCode: '2025-2026-2',
      source: 'semester-config',
      needsConfirmation: true,
    });
  });
});
