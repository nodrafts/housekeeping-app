export type RoomStatus = 'STAY_OVER' | 'CHECKOUT' | 'CLEANING' | 'READY';

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  done: boolean;
  notes?: string;
  photoUri?: string;
}

export interface Housekeeper {
  employeeId?: string;
  name?: string;
  email?: string;
  titleName?: string;
}

export interface RoomAssignment {
  id: string; // room number, kept as id for existing navigation
  roomId: string;
  roomNumber: string;
  floor: string;
  type?: string;
  roomType?: string;
  status: RoomStatus;
  housekeeper?: Housekeeper | null;
  cleaningStartTime?: string | null;
  cleaningEndTime?: string | null;
  checklist: ChecklistItem[];
}

export interface HousekeepingHistoryEntry {
  action: string;
  changes: Record<string, unknown>;
  changedBy?: string | null;
  changedByType?: string | null;
  dateTime: string;
}

export interface HousekeepingHistoryTask {
  taskId: number;
  status: string;
  housekeeper?: Housekeeper | null;
  cleaningStartTime?: string | null;
  cleaningEndTime?: string | null;
  createdAt: string;
  completedAt?: string | null;
  history: HousekeepingHistoryEntry[];
}

export interface HousekeepingRoomHistory {
  roomNo: string;
  floor?: number | null;
  date: string;
  tasks: HousekeepingHistoryTask[];
}
