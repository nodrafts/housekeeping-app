export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'DONE' | 'CANCELLED' | 'CLOSED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskChecklistStatus = 'WAITING' | 'COMPLETED' | 'SKIPPED';

export type TaskSource = {
  sourceName: 'incidents' | string;
  sourceId: string;
};

export type TaskNote = {
  comment: string;
  dateTime: string;
  commentBy: string;
};

export type TaskChecklistItem = {
  id: string;
  title: string;
  status: TaskChecklistStatus;
  notes?: string;
};

export type Task = {
  id: number;
  orgId: string;
  hotelCode: string;
  templateId?: string | null;
  taskType: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  ownerId?: string | null;
  assigneeId?: string | null;
  dueDate?: number | null;
  source?: TaskSource | null;
  additionalInfo?: Record<string, unknown> | null;
  notes: TaskNote[];
  checklist: TaskChecklistItem[];
  createdBy?: string | null;
  updatedBy?: string | null;
  completedAt?: number | null;
  createdAt?: number | null;
  updatedAt?: number | null;
};

export type CreateTaskPayload = {
  hotelCode: string;
  templateId?: string | null;
  taskType: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  ownerId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | number | Date | null;
  source?: TaskSource | null;
  additionalInfo?: Record<string, unknown> | null;
  checklist?: TaskChecklistItem[] | null;
  completedAt?: string | number | Date | null;
};

export type UpdateTaskPayload = Partial<CreateTaskPayload> & {
  notes?: string;
};

export type TaskHistoryEntry = {
  id: number;
  taskId: number;
  orgId: string;
  hotelCode: string;
  action: string;
  changes: Record<string, unknown>;
  changedBy?: string | null;
  changedByType?: string | null;
  createdAt?: number | null;
};
