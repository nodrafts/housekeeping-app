import { mapRoomToAssignment, normalizeServiceDate } from './roomAssignmentsApi';

describe('housekeeping room date mapping', () => {
  it('normalizes a backend LocalDate array', () => {
    expect(normalizeServiceDate([2026, 9, 2])).toBe('2026-09-02');
  });

  it('preserves an ISO date string', () => {
    expect(normalizeServiceDate('2026-09-02')).toBe('2026-09-02');
  });

  it('maps the room due date before navigation and API reuse', () => {
    const assignment = mapRoomToAssignment({
      roomNo: '104',
      status: 'cleaning',
      dueDate: [2026, 9, 2],
      checklist: [],
    });

    expect(assignment.dueDate).toBe('2026-09-02');
  });
});
