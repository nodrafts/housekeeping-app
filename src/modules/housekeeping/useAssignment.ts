import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChecklistItem, RoomAssignment, RoomStatus } from './types';
import {
  assignmentKey,
  fetchAssignment,
  fetchRoomHistory,
  roomHistoryKey,
  updateHousekeepingRoom,
} from './roomAssignmentsApi';

export function useAssignment(id: string, hotelCode?: string, dueDate?: string) {
  return useQuery({
    queryKey: assignmentKey(hotelCode, id, dueDate),
    queryFn: () => fetchAssignment(hotelCode, id, dueDate),
    enabled: !!id && !!hotelCode,
  });
}

export function useRoomHistory(roomNumber: string, date: string, hotelCode?: string) {
  return useQuery({
    queryKey: roomHistoryKey(hotelCode, roomNumber, date),
    queryFn: () => fetchRoomHistory(hotelCode, roomNumber, date),
    enabled: !!roomNumber && !!date && !!hotelCode,
  });
}

interface UpdateChecklistPayload {
  hotelCode: string;
  assignment: RoomAssignment;
  checklist: ChecklistItem[];
}

interface UpdateStatusPayload {
  hotelCode: string;
  assignment: RoomAssignment;
  status: RoomStatus;
  checklist?: ChecklistItem[];
}

function updateAssignmentList(
  list: RoomAssignment[] | undefined,
  assignmentId: string,
  updater: (assignment: RoomAssignment) => RoomAssignment,
) {
  return (list ?? []).map((assignment) =>
    assignment.id === assignmentId ? updater(assignment) : assignment,
  );
}

function writeAssignmentToCaches(queryClient: ReturnType<typeof useQueryClient>, assignment: RoomAssignment) {
  queryClient.setQueriesData<RoomAssignment[]>(
    { queryKey: ['assignments'] },
    (prev) => updateAssignmentList(prev, assignment.id, () => assignment),
  );
  queryClient.setQueriesData<RoomAssignment | undefined>(
    { queryKey: ['assignment'] },
    (prev) => (prev?.id === assignment.id ? assignment : prev),
  );
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hotelCode, assignment, checklist }: UpdateChecklistPayload) => {
      return updateHousekeepingRoom(assignment, { checklist }, hotelCode);
    },
    onSuccess: (assignment) => {
      writeAssignmentToCaches(queryClient, assignment);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-room-history'] });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hotelCode, assignment, status, checklist }: UpdateStatusPayload) => {
      const finalChecklist = checklist ?? assignment.checklist;
      return updateHousekeepingRoom(assignment, {
        status,
        checklist: finalChecklist,
      }, hotelCode);
    },
    onSuccess: (assignment) => {
      writeAssignmentToCaches(queryClient, assignment);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-room-history'] });
    },
  });
}
