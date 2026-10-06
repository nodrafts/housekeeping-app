import type { TaskChecklistItem } from './types';

export function setTaskChecklistItemCompleted(
  checklist: TaskChecklistItem[],
  itemId: string,
  completed: boolean,
) {
  return checklist.map((item) => (
    item.id === itemId
      ? { ...item, status: completed ? 'COMPLETED' as const : 'SKIPPED' as const }
      : item
  ));
}

export function finalizeTaskChecklist(checklist: TaskChecklistItem[]) {
  return checklist.map((item) => (
    item.status === 'COMPLETED'
      ? item
      : { ...item, status: 'SKIPPED' as const }
  ));
}
