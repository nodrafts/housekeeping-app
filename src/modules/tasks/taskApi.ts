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

function taskRef(task: Task): Task {
  const id = String(task.id);
  return { ...task, id: id.includes(':') ? id : `${task.taskType}:${id}` };
}

function taskPath(taskId: string) {
  const separator = taskId.indexOf(':');
  if (separator < 1 || separator === taskId.length - 1) {
    throw new Error('Task reference must include both task type and job ID');
  }
  return `${encodeURIComponent(taskId.slice(0, separator))}/${encodeURIComponent(taskId.slice(separator + 1))}`;
}

export async function listTasks(params: ListTasksParams = {}, orgId = DEFAULT_ORG_ID): Promise<Task[]> {
  const res = await api.get<any>(`/api/v1/orgs/${orgId}/tasks`, { params });
  const data = unpackData<any>(res.data);
  const tasks: Task[] = Array.isArray(data) ? data : data?.tasks ?? [];
  return tasks.map(taskRef);
}

export async function getTask(taskId: string, orgId = DEFAULT_ORG_ID): Promise<Task> {
  const res = await api.get<any>(`/api/v1/orgs/${orgId}/tasks/${taskPath(taskId)}`);
  return taskRef(unpackData<Task>(res.data));
}

export async function createTask(payload: CreateTaskPayload, orgId = DEFAULT_ORG_ID): Promise<Task> {
  const res = await api.post<any>(
    `/api/v1/orgs/${orgId}/tasks`,
    normalizeTaskPayload(payload),
  );
  return taskRef(unpackData<Task>(res.data));
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload, orgId = DEFAULT_ORG_ID): Promise<Task> {
  const res = await api.patch<any>(
    `/api/v1/orgs/${orgId}/tasks/${taskPath(taskId)}`,
    normalizeTaskPayload(payload),
  );
  return taskRef(unpackData<Task>(res.data));
}

export async function getTaskHistory(taskId: string, orgId = DEFAULT_ORG_ID): Promise<TaskHistoryEntry[]> {
  const res = await api.get<any>(`/api/v1/orgs/${orgId}/tasks/${taskPath(taskId)}/history`);
  const data = unpackData<any>(res.data);
  const history: TaskHistoryEntry[] = Array.isArray(data) ? data : data?.history ?? [];
  return history.map(entry => ({
    ...entry,
    taskId: String(entry.taskId).includes(':')
      ? String(entry.taskId)
      : `${entry.taskType}:${entry.taskId}`,
  }));
}

export function buildIncidentTaskSource(incidentId: number | string): TaskSource {
  return {
    sourceName: 'incidents',
    sourceId: String(incidentId),
  };
}

export function useTasks(
  params: ListTasksParams = {},
  orgId = DEFAULT_ORG_ID,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['tasks', orgId, params],
    queryFn: () => listTasks(params, orgId),
    enabled: options.enabled ?? true,
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
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskPayload }) =>
      updateTask(taskId, payload, orgId),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', orgId] });
      queryClient.invalidateQueries({ queryKey: ['task-history', orgId, task.id] });
    },
  });
}

export function useTaskHistory(taskId?: string, orgId = DEFAULT_ORG_ID) {
  return useQuery({
    queryKey: ['task-history', orgId, taskId],
    queryFn: () => getTaskHistory(taskId as string, orgId),
    enabled: taskId != null,
  });
}
