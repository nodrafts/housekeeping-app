import { skipIncompleteChecklist } from './checklist';
import type { ChecklistItem } from './types';

describe('skipIncompleteChecklist', () => {
  it('skips waiting and in-progress items while preserving completed items', () => {
    const checklist: ChecklistItem[] = [
      { id: 'bed', label: 'Make bed', status: 'COMPLETED', done: true },
      { id: 'bath', label: 'Clean bathroom', status: 'WAITING', done: false },
      { id: 'floor', label: 'Mop floor', status: 'IN_PROGRESS', done: false },
    ];

    expect(skipIncompleteChecklist(checklist).map((item) => item.status)).toEqual([
      'COMPLETED',
      'SKIPPED',
      'SKIPPED',
    ]);
    expect(skipIncompleteChecklist(checklist).map((item) => item.done)).toEqual([true, false, false]);
  });
});
