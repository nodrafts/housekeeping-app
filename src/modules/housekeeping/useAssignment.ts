import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChecklistItem, RoomAssignment, RoomStatus } from './types';
import {
  assignmentKey,
  fetchAssignment,
  fetchRoomHistory,
  roomHistoryKey,
  updateHousekeepingRoom,
} from './roomAssignmentsApi';

export function useAssignment(id: string, hotelCode?: string) {
  return useQuery({
    queryKey: assignmentKey(hotelCode, id),
    queryFn: () => fetchAssignment(hotelCode, id),
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

function needsCleaningStep(current: RoomStatus, next: RoomStatus) {
  return next === 'READY' && (current === 'CHECKOUT' || current === 'STAY_OVER');
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
      if (needsCleaningStep(assignment.status, status)) {
        const cleaningAssignment = await updateHousekeepingRoom(assignment, {
          status: 'CLEANING',
          checklist: finalChecklist,
        }, hotelCode);
        return updateHousekeepingRoom(cleaningAssignment, {
          status: 'READY',
          checklist: finalChecklist,
        }, hotelCode);
      }
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
