import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RoomAssignment, ChecklistItem, RoomStatus } from './types';
import {
  CURRENT_ASSIGNMENTS,
  setCurrentAssignments,
  MOCK_ASSIGNMENTS,
} from './mockData';

const assignmentKey = (id: string) => ['assignment', id];

async function fetchAssignment(id: string): Promise<RoomAssignment | undefined> {
  // Front-end only: read from in-memory mock data
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve(
          CURRENT_ASSIGNMENTS.find((assignment) => assignment.id === id),
        ),
      200,
    );
  });
}

export function useAssignment(id: string) {
  return useQuery({
    queryKey: assignmentKey(id),
    queryFn: () => fetchAssignment(id),
    enabled: !!id,
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

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, checklist }: UpdateChecklistPayload) => {
      const current =
        queryClient.getQueryData<RoomAssignment[]>(['assignments']) ||
        CURRENT_ASSIGNMENTS;

      // Derive status from new checklist state
      const total = checklist.length;
      const doneCount = checklist.filter((c) => c.done).length;
      let nextStatus: RoomStatus = 'TO_CLEAN';
      if (doneCount === total && total > 0) {
        nextStatus = 'DONE';
      } else if (doneCount > 0) {
        nextStatus = 'IN_PROGRESS';
      }

      const nextAssignments = current.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, checklist, status: nextStatus }
          : assignment,
      );

      setCurrentAssignments(nextAssignments);

      const updated =
        nextAssignments.find((assignment) => assignment.id === assignmentId) ??
        { ...MOCK_ASSIGNMENTS[0], id: assignmentId, checklist, status: nextStatus };

      return updated;
    },
    onSuccess: (data) => {
      // Update detail view
      queryClient.setQueryData<RoomAssignment>(assignmentKey(data.id), data);
      // Update list view
      queryClient.setQueryData<RoomAssignment[]>(
        ['assignments'],
        (prev = CURRENT_ASSIGNMENTS) =>
          prev.map((assignment) =>
            assignment.id === data.id ? data : assignment,
          ),
      );
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, status }: UpdateStatusPayload) => {
      const current =
        queryClient.getQueryData<RoomAssignment[]>(['assignments']) ||
        CURRENT_ASSIGNMENTS;

      const now = new Date().toISOString();
      const nextAssignments = current.map((assignment) => {
        if (assignment.id !== assignmentId) return assignment;
        return {
          ...assignment,
          status,
          startedAt: status === 'IN_PROGRESS' && !assignment.startedAt ? now : assignment.startedAt,
          completedAt: status === 'DONE' ? now : assignment.completedAt,
        };
      });

      setCurrentAssignments(nextAssignments);

      const updated =
        nextAssignments.find((a) => a.id === assignmentId) ??
        { ...MOCK_ASSIGNMENTS[0], id: assignmentId, status };

      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<RoomAssignment>(assignmentKey(data.id), data);
      queryClient.setQueryData<RoomAssignment[]>(
        ['assignments'],
        (prev = CURRENT_ASSIGNMENTS) =>
          prev.map((assignment) =>
            assignment.id === data.id ? data : assignment,
          ),
      );
    },
  });
}

