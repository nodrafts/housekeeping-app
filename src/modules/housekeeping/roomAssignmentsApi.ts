import { api } from '../../lib/api';
import { DEFAULT_ORG_ID } from '../../lib/propertyConfig';
import type { ChecklistItem, HousekeepingRoomHistory, RoomAssignment, RoomStatus } from './types';

type HousekeepingChecklistItemResponse = { id: string; title: string; status?: string | null };
type HousekeepingRoomResponse = {
  roomNo: string;
  floor?: number | null;
  status?: string | null;
  housekeeper?: { employeeId?: string | null; name?: string | null } | null;
  roomType?: string | null;
  cleaningStartTime?: string | null;
  cleaningEndTime?: string | null;
  dueDate?: string | null;
  checklist?: HousekeepingChecklistItemResponse[] | null;
};

export const assignmentsKey = (hotelCode?: string) => ['assignments', hotelCode ?? 'fallback', 'me'];
export const assignmentKey = (hotelCode: string | undefined, roomNumber: string) => [
  'assignment', hotelCode ?? 'fallback', roomNumber,
];
export const roomHistoryKey = (hotelCode: string | undefined, roomNumber: string, date: string) => [
  'housekeeping-room-history', hotelCode ?? 'fallback', roomNumber, date,
];

function unpackData<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function normalizeRoomStatus(status?: string | null): RoomStatus {
  const value = (status ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  if (value === 'READY') return 'READY';
  if (value === 'CLEANING') return 'CLEANING';
  if (value === 'STAY_OVER' || value === 'STAYOVER') return 'STAY_OVER';
  return 'CHECKOUT';
}

function roomStatusPayload(status: RoomStatus) {
  if (status === 'STAY_OVER') return 'stay over';
  if (status === 'CHECKOUT') return 'check out';
  return status.toLowerCase();
}

function normalizeChecklistStatus(status?: string | null): ChecklistItem['status'] {
  const value = (status ?? '').trim().toUpperCase();
  if (value === 'COMPLETED') return 'COMPLETED';
  if (value === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (value === 'SKIPPED') return 'SKIPPED';
  return 'WAITING';
}

function mapChecklistItem(item: HousekeepingChecklistItemResponse): ChecklistItem {
  const status = normalizeChecklistStatus(item.status);
  return {
    id: String(item.id),
    label: item.title,
    status,
    done: status === 'COMPLETED',
  };
}

export function mapRoomToAssignment(room: HousekeepingRoomResponse): RoomAssignment {
  return {
    id: room.roomNo,
    roomId: room.roomNo,
    roomNumber: room.roomNo,
    floor: room.floor == null ? '' : String(room.floor),
    type: room.roomType ?? undefined,
    roomType: room.roomType ?? undefined,
    status: normalizeRoomStatus(room.status),
    housekeeper: room.housekeeper ? {
      employeeId: room.housekeeper.employeeId ?? undefined,
      name: room.housekeeper.name ?? undefined,
    } : null,
    cleaningStartTime: room.cleaningStartTime ?? null,
    cleaningEndTime: room.cleaningEndTime ?? null,
    dueDate: room.dueDate ?? null,
    checklist: (room.checklist ?? []).map(mapChecklistItem),
  };
}

function checklistPayload(checklist: ChecklistItem[]) {
  return checklist.map((item) => ({ id: item.id, status: item.status }));
}

export async function fetchAssignments(hotelCode?: string): Promise<RoomAssignment[]> {
  if (!hotelCode) return [];
  const response = await api.get<any>(
    `/api/v1/orgs/${DEFAULT_ORG_ID}/hotels/${hotelCode}/housekeeping/rooms/me`,
  );
  const data = unpackData<{ rooms?: HousekeepingRoomResponse[] }>(response.data);
  return (data.rooms ?? [])
    .filter((room) => normalizeRoomStatus(room.status) !== 'READY')
    .map(mapRoomToAssignment);
}

export async function fetchAssignment(
  hotelCode: string | undefined,
  roomNumber: string,
): Promise<RoomAssignment | undefined> {
  if (!hotelCode || !roomNumber) return undefined;
  const response = await api.get<any>(
    `/api/v1/orgs/${DEFAULT_ORG_ID}/hotels/${hotelCode}/housekeeping/room/${encodeURIComponent(roomNumber)}`,
  );
  return mapRoomToAssignment(unpackData<HousekeepingRoomResponse>(response.data));
}

export async function fetchRoomHistory(
  hotelCode: string | undefined,
  roomNumber: string,
  date: string,
): Promise<HousekeepingRoomHistory | undefined> {
  if (!hotelCode || !roomNumber || !date) return undefined;
  const response = await api.get<any>(
    `/api/v1/orgs/${DEFAULT_ORG_ID}/hotels/${hotelCode}/housekeeping/room/${encodeURIComponent(roomNumber)}/history`,
    { params: { date } },
  );
  return unpackData<HousekeepingRoomHistory>(response.data);
}

export async function updateHousekeepingRoom(
  assignment: RoomAssignment,
  updates: { status?: RoomStatus; checklist?: ChecklistItem[] },
  hotelCode: string,
): Promise<RoomAssignment> {
  const response = await api.put<any>(
    `/api/v1/orgs/${DEFAULT_ORG_ID}/hotels/${hotelCode}/housekeeping/room`,
    {
      roomNumber: assignment.roomNumber,
      status: roomStatusPayload(updates.status ?? assignment.status),
      employeeId: assignment.housekeeper?.employeeId ?? null,
      ...(assignment.dueDate ? { dueDate: assignment.dueDate } : {}),
      ...(updates.checklist ? { checklist: checklistPayload(updates.checklist) } : {}),
    },
  );
  return mapRoomToAssignment(unpackData<HousekeepingRoomResponse>(response.data));
}
