import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DEFAULT_ORG_ID } from '../../lib/propertyConfig';
import type {
  CreateTaskPayload,
  Task,
  TaskHistoryEntry,
  TaskSource,
  UpdateTaskPayload,
} from './types';

type ListTasksParams = {
  hotelCode?: string;
  status?: string;
  taskType?: string;
  ownerId?: string;
  assigneeId?: string;
  priority?: string;
  unitId?: string;
  sourceName?: string;
  search?: string;
  kpi?: string;
  dueBefore?: string;
  dueAfter?: string;
  page?: number;
  pageSize?: number;
};

function unpackData<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function normalizeDate(value: string | number | Date | null | undefined) {
  if (value == null || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return value.toISOString().slice(0, 10);
}

function normalizeTaskPayload<T extends CreateTaskPayload | UpdateTaskPayload>(payload: T) {
  return {
    ...payload,
    dueDate: normalizeDate(payload.dueDate),
    completedAt: normalizeDate(payload.completedAt),
  };
}

export async function listTasks(params: ListTasksParams = {}, orgId = DEFAULT_ORG_ID): Promise<Task[]> {
  const res = await api.get<any>(`/api/v1/orgs/${orgId}/tasks`, { params });
  const data = unpackData<any>(res.data);
  return Array.isArray(data) ? data : data?.tasks ?? [];
}

export async function getTask(taskId: number, orgId = DEFAULT_ORG_ID): Promise<Task> {
  const res = await api.get<any>(`/api/v1/orgs/${orgId}/tasks/${taskId}`);
  return unpackData<Task>(res.data);
}

export async function createTask(payload: CreateTaskPayload, orgId = DEFAULT_ORG_ID): Promise<Task> {
  const res = await api.post<any>(
    `/api/v1/orgs/${orgId}/tasks`,
    normalizeTaskPayload(payload),
  );
  return unpackData<Task>(res.data);
}

export async function updateTask(taskId: number, payload: UpdateTaskPayload, orgId = DEFAULT_ORG_ID): Promise<Task> {
  const res = await api.patch<any>(
    `/api/v1/orgs/${orgId}/tasks/${taskId}`,
    normalizeTaskPayload(payload),
  );
  return unpackData<Task>(res.data);
}

export async function getTaskHistory(taskId: number, orgId = DEFAULT_ORG_ID): Promise<TaskHistoryEntry[]> {
  const res = await api.get<any>(`/api/v1/orgs/${orgId}/tasks/${taskId}/history`);
  const data = unpackData<any>(res.data);
  return Array.isArray(data) ? data : data?.history ?? [];
}

export function buildIncidentTaskSource(incidentId: number | string): TaskSource {
  return {
    sourceName: 'incidents',
    sourceId: String(incidentId),
  };
}

export function useTasks(params: ListTasksParams = {}, orgId = DEFAULT_ORG_ID) {
  return useQuery({
    queryKey: ['tasks', orgId, params],
    queryFn: () => listTasks(params, orgId),
  });
}

export function useCreateTask(orgId = DEFAULT_ORG_ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(payload, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', orgId] });
    },
  });
}

export function useUpdateTask(orgId = DEFAULT_ORG_ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: UpdateTaskPayload }) =>
      updateTask(taskId, payload, orgId),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', orgId] });
      queryClient.invalidateQueries({ queryKey: ['task-history', orgId, task.id] });
    },
  });
}

export function useTaskHistory(taskId?: number, orgId = DEFAULT_ORG_ID) {
  return useQuery({
    queryKey: ['task-history', orgId, taskId],
    queryFn: () => getTaskHistory(taskId as number, orgId),
    enabled: taskId != null,
  });
}
