import type { ChecklistItem } from './types';

export function skipIncompleteChecklist(checklist: ChecklistItem[]) {
  return checklist.map((item) => (
    item.status === 'COMPLETED' || item.status === 'SKIPPED'
      ? item
      : { ...item, status: 'SKIPPED' as const, done: false }
  ));
}
