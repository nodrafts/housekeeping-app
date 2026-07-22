export type RoomStatus = 'TO_CLEAN' | 'IN_PROGRESS' | 'DONE' | 'OUT_OF_ORDER';

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'WAITING' | 'COMPLETED' | 'SKIPPED';
  done: boolean;
  skipped?: boolean;
  notes?: string;
  photoUri?: string;
}

export interface RoomAssignment {
  id: string; // assignment id
  taskId: number;
  roomId: string;
  roomNumber: string;
  floor: string;
  type?: string; // “King”, “Double”, etc.
  status: RoomStatus;
  guestStatus?: 'CHECKED_IN' | 'CHECKED_OUT' | 'STAYOVER';
  startedAt?: string;
  completedAt?: string;
  checklist: ChecklistItem[];
}

