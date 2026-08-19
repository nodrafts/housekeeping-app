import type { Task, TaskChecklistItem } from '../tasks/types';
import { api } from '../../lib/api';
import { DEFAULT_ORG_ID } from '../../lib/propertyConfig';
import { getTask } from '../tasks/taskApi';
import type { ChecklistItem, RoomAssignment, RoomStatus } from './types';

export const HOUSEKEEPING_TASK_TYPE = 'HOUSEKEEPING';

export const assignmentsKey = (hotelCode?: string) => [
  'assignments',
  hotelCode ?? 'fallback',
  'me',
  'today',
];

export const assignmentKey = (hotelCode: string | undefined, id: string) => [
  'assignment',
  hotelCode ?? 'fallback',
  id,
];

function normalizeRoomStatus(status?: string | null): RoomStatus {
  const value = (status ?? '').trim().toUpperCase().replace(/[-\s]+/g, '_');
  if (value === 'COMPLETED' || value === 'DONE' || value === 'CLOSED' || value === 'READY') return 'READY';
  if (value === 'IN_PROGRESS' || value === 'CLEANING') return 'CLEANING';
  if (value === 'STAY_OVER' || value === 'STAYOVER') return 'STAY_OVER';
  if (value === 'CHECKED_OUT' || value === 'CHECKEDOUT') return 'CHECKOUT';
  return 'CHECKOUT';
}

function taskStatusForRoomStatus(status: RoomStatus) {
  if (status === 'READY') return 'ready';
  if (status === 'CLEANING') return 'cleaning';
  if (status === 'STAY_OVER') return 'stay over';
  return 'check out';
}

function normalizeChecklistStatus(status?: string | null): ChecklistItem['status'] {
  const value = (status ?? '').trim().toUpperCase();
  if (value === 'COMPLETED') return 'COMPLETED';
  if (value === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (value === 'SKIPPED') return 'SKIPPED';
  return 'WAITING';
}

function stringField(fields: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = fields?.[key];
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function checklistFallbackId(item: TaskChecklistItem, index: number) {
  const rawId = item.id == null ? '' : String(item.id).trim();
  if (rawId.length > 0) return rawId;

  const base = String(item.title ?? 'item')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base || 'item'}-${index}`;
}

function mapChecklistItem(item: TaskChecklistItem, index: number): ChecklistItem {
  const status = normalizeChecklistStatus(item.status);
  return {
    id: checklistFallbackId(item, index),
    label: item.title,
    status,
    done: status === 'COMPLETED' || status === 'SKIPPED',
    notes: item.notes,
  };
}

export function mapTaskToAssignment(task: Task): RoomAssignment {
  const additionalInfo = task.additionalInfo ?? {};
  const roomNumber =
    stringField(additionalInfo, 'roomNumber') ??
    stringField(additionalInfo, 'roomNo') ??
    stringField(additionalInfo, 'unitId') ??
    String(task.id);
  const floor = stringField(additionalInfo, 'floor') ?? '';
  const roomType = stringField(additionalInfo, 'roomType') ?? stringField(additionalInfo, 'unitType');
  const roomStatus =
    task.status ??
    stringField(additionalInfo, 'housekeepingStatus') ??
    stringField(additionalInfo, 'roomStatus') ??
    stringField(additionalInfo, 'status');
  const cleaningOriginStatus = stringField(additionalInfo, 'cleaningOriginStatus');

  return {
    id: String(task.id),
    taskId: task.id,
    hotelCode: task.hotelCode,
    roomId: roomNumber,
    roomNumber,
    floor,
    type: roomType,
    roomType,
    status: normalizeRoomStatus(roomStatus),
    housekeeper: task.assigneeId ? { employeeId: task.assigneeId } : null,
    cleaningStartTime: null,
    cleaningEndTime: null,
    cleaningOriginStatus: cleaningOriginStatus ? normalizeRoomStatus(cleaningOriginStatus) : null,
    checklist: (task.checklist ?? []).map(mapChecklistItem),
  };
}

function shouldShowHousekeepingAssignment(task: Task) {
  const assignment = mapTaskToAssignment(task);
  return assignment.status === 'CHECKOUT' || assignment.status === 'STAY_OVER' || assignment.status === 'CLEANING';
}

function checklistPayload(checklist: ChecklistItem[]): TaskChecklistItem[] {
  return checklist.map((item) => ({
    id: item.id,
    title: item.label,
    status: item.status,
    notes: item.notes,
  }));
}

function unpackHousekeepingTasks(payload: any): Task[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  return [];
}

export async function fetchAssignments(hotelCode?: string): Promise<RoomAssignment[]> {
  if (!hotelCode) return [];

  const response = await api.get<any>(`/api/v1/orgs/${DEFAULT_ORG_ID}/hotels/${hotelCode}/housekeeping/tasks/me/today`);
  const tasks = unpackHousekeepingTasks(response.data);

  return tasks.filter(shouldShowHousekeepingAssignment).map(mapTaskToAssignment);
}

export async function fetchAssignment(hotelCode: string | undefined, id: string): Promise<RoomAssignment | undefined> {
  if (!hotelCode || !id) return undefined;
  const task = await getTask(Number(id));
  return mapTaskToAssignment(task);
}

export async function updateHousekeepingTask(
  assignment: RoomAssignment,
  updates: { status?: RoomStatus; checklist?: ChecklistItem[] },
  hotelCode?: string,
): Promise<RoomAssignment> {
  const taskId = assignment.taskId ?? Number(assignment.id);
  const selectedHotelCode = hotelCode ?? assignment.hotelCode;
  if (!selectedHotelCode) {
    throw new Error('Hotel code is required to update housekeeping work.');
  }

  await api.put<any>(`/api/v1/orgs/${DEFAULT_ORG_ID}/hotels/${selectedHotelCode}/housekeeping/room`, {
    roomNumber: assignment.roomNumber,
    status: taskStatusForRoomStatus(updates.status ?? assignment.status),
    employeeId: assignment.housekeeper?.employeeId,
    checklist: checklistPayload(updates.checklist ?? assignment.checklist),
  });

  const updatedTask = await getTask(taskId);
  return mapTaskToAssignment(updatedTask);
}
