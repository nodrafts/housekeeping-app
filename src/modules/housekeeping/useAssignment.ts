import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChecklistItem, RoomAssignment, RoomStatus } from './types';
import {
  assignmentKey,
  fetchAssignment,
  updateHousekeepingTask,
} from './roomAssignmentsApi';

export function useAssignment(id: string, hotelCode?: string) {
  return useQuery({
    queryKey: assignmentKey(hotelCode, id),
    queryFn: () => fetchAssignment(hotelCode, id),
    enabled: !!id && !!hotelCode,
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
    mutationFn: async ({ assignment, checklist }: UpdateChecklistPayload) => {
      return updateHousekeepingTask(assignment, { checklist });
    },
    onSuccess: (assignment) => {
      writeAssignmentToCaches(queryClient, assignment);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignment, status, checklist }: UpdateStatusPayload) => {
      const finalChecklist = checklist ?? assignment.checklist;
      return updateHousekeepingTask(assignment, {
        status,
        checklist: finalChecklist,
      });
    },
    onSuccess: (assignment) => {
      writeAssignmentToCaches(queryClient, assignment);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}
