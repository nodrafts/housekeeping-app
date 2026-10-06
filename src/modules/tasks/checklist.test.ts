import { finalizeTaskChecklist, setTaskChecklistItemCompleted } from './checklist';
import type { TaskChecklistItem } from './types';

const checklist: TaskChecklistItem[] = [
  { id: 'one', title: 'First check', status: 'WAITING' },
  { id: 'two', title: 'Second check', status: 'COMPLETED' },
];

describe('compliance task checklist', () => {
  it('toggles one item without changing the others', () => {
    expect(setTaskChecklistItemCompleted(checklist, 'one', true).map((item) => item.status))
      .toEqual(['COMPLETED', 'COMPLETED']);
  });

  it('marks unfinished items as skipped when completing the task', () => {
    expect(finalizeTaskChecklist(checklist).map((item) => item.status))
      .toEqual(['SKIPPED', 'COMPLETED']);
  });
});
