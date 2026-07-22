import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChecklistItem, RoomAssignment, RoomStatus } from './types';
import {
  assignmentKey,
  assignmentsKey,
  fetchAssignment,
  mapChecklistToTaskChecklist,
  mapTaskToAssignment,
} from './roomAssignmentsApi';
import { updateTask } from '../tasks/taskApi';

export function useAssignment(id: string, hotelCode?: string) {
  return useQuery({
    queryKey: assignmentKey(hotelCode, id),
    queryFn: () => fetchAssignment(hotelCode, id),
    enabled: !!id && !!hotelCode,
  });
}

interface UpdateChecklistPayload {
  assignmentId: string;
  checklist: ChecklistItem[];
}

interface UpdateStatusPayload {
  assignmentId: string;
  status: RoomStatus;
}

function backendTaskStatus(status: RoomStatus) {
  if (status === 'DONE') return 'COMPLETED';
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'OPEN';
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
  queryClient.setQueriesData<RoomAssignment>(
    { queryKey: ['assignment'] },
    (prev) => (prev?.id === assignment.id ? assignment : prev),
  );
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, checklist }: UpdateChecklistPayload) => {
      const updatedTask = await updateTask(Number(assignmentId), {
        checklist: mapChecklistToTaskChecklist(checklist),
      });
      return mapTaskToAssignment(updatedTask);
    },
    onSuccess: (assignment) => {
      writeAssignmentToCaches(queryClient, assignment);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: assignmentsKey(undefined, undefined) });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, status }: UpdateStatusPayload) => {
      const updatedTask = await updateTask(Number(assignmentId), {
        status: backendTaskStatus(status),
      });
      return mapTaskToAssignment(updatedTask);
    },
    onSuccess: (assignment) => {
      writeAssignmentToCaches(queryClient, assignment);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['task-history', assignment.taskId] });
    },
  });
}
