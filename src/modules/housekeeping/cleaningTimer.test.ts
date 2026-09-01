import { formatCleaningElapsed } from './cleaningTimer';

describe('formatCleaningElapsed', () => {
  it('formats a same-day backend time as a live duration', () => {
    const now = new Date(2026, 7, 27, 10, 12, 34);
    expect(formatCleaningElapsed('9:10', now)).toBe('1h 02m 34s');
  });

  it('formats a full timestamp', () => {
    const now = new Date('2026-08-27T10:05:30.000Z');
    expect(formatCleaningElapsed('2026-08-27T10:00:00.000Z', now)).toBe('05m 30s');
  });

  it('combines a legacy clock value with the housekeeping service date', () => {
    const now = new Date(2026, 8, 1, 21, 5, 0);
    expect(formatCleaningElapsed('21:00:00', now, '2026-09-01')).toBe('05m 00s');
  });

  it('returns null for a missing or invalid start time', () => {
    expect(formatCleaningElapsed(null)).toBeNull();
    expect(formatCleaningElapsed('not-a-time')).toBeNull();
  });
});
