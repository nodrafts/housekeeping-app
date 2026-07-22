import type { Task, TaskChecklistItem } from '../tasks/types';
import { getTask, listTasks } from '../tasks/taskApi';
import type { ChecklistItem, RoomAssignment, RoomStatus } from './types';

export const HOUSEKEEPING_TASK_TYPE = 'House keeping';

export const assignmentsKey = (hotelCode?: string, dueDate?: string) => [
  'assignments',
  hotelCode ?? 'fallback',
  dueDate ?? 'today',
];

export const assignmentKey = (hotelCode: string | undefined, id: string) => [
  'assignment',
  hotelCode ?? 'fallback',
  id,
];

function normalizeStatus(status?: string): RoomStatus {
  const value = (status ?? '').toUpperCase();
  if (value === 'COMPLETED' || value === 'DONE' || value === 'CLOSED') return 'DONE';
  if (value === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (value === 'OUT_OF_ORDER' || value === 'OOO') return 'OUT_OF_ORDER';
  return 'TO_CLEAN';
}

function stringField(fields: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = fields?.[key];
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function mapChecklistItem(item: TaskChecklistItem): ChecklistItem {
  const status = item.status ?? 'WAITING';
  return {
    id: item.id,
    label: item.title,
    status,
    done: status === 'COMPLETED',
    skipped: status === 'SKIPPED',
    notes: item.notes,
  };
}

export function mapTaskToAssignment(task: Task): RoomAssignment {
  const additionalInfo = task.additionalInfo ?? {};
  const roomNumber =
    stringField(additionalInfo, 'roomNumber') ??
    stringField(additionalInfo, 'unitId') ??
    String(task.id);
  const floor = stringField(additionalInfo, 'floor') ?? '';
  const unitType = stringField(additionalInfo, 'unitType');

  return {
    id: String(task.id),
    taskId: task.id,
    roomId: roomNumber,
    roomNumber,
    floor,
    type: unitType,
    status: normalizeStatus(task.status),
    completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : undefined,
    checklist: (task.checklist ?? []).map(mapChecklistItem),
  };
}

export function mapChecklistToTaskChecklist(checklist: ChecklistItem[]): TaskChecklistItem[] {
  return checklist.map((item) => ({
    id: item.id,
    title: item.label,
    status: item.status,
    notes: item.notes,
  }));
}

export async function fetchAssignments(hotelCode?: string, dueDate?: string): Promise<RoomAssignment[]> {
  if (!hotelCode || !dueDate) return [];

  const tasks = await listTasks({
    hotelCode,
    taskType: HOUSEKEEPING_TASK_TYPE,
    dueAfter: dueDate,
    dueBefore: dueDate,
    pageSize: 100,
  });

  return tasks.map(mapTaskToAssignment);
}

export async function fetchAssignment(hotelCode: string | undefined, id: string): Promise<RoomAssignment | undefined> {
  if (!hotelCode || !id) return undefined;
  const task = await getTask(Number(id));
  return mapTaskToAssignment(task);
}
