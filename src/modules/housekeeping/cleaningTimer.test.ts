import { formatCleaningElapsed } from './cleaningTimer';

describe('formatCleaningElapsed', () => {
  it('formats a same-day backend time as a live duration', () => {
    const now = new Date(2026, 7, 27, 10, 12, 34);
    expect(formatCleaningElapsed('9:10', now)).toBe('1:02:34');
  });

  it('formats a full timestamp', () => {
    const now = new Date('2026-08-27T10:05:30.000Z');
    expect(formatCleaningElapsed('2026-08-27T10:00:00.000Z', now)).toBe('05:30');
  });

  it('returns null for a missing or invalid start time', () => {
    expect(formatCleaningElapsed(null)).toBeNull();
    expect(formatCleaningElapsed('not-a-time')).toBeNull();
  });
});
