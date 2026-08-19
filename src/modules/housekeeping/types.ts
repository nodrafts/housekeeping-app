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
  id: string; // task id, kept as id for existing navigation
  taskId?: number;
  hotelCode?: string;
  roomId: string;
  roomNumber: string;
  floor: string;
  type?: string;
  roomType?: string;
  status: RoomStatus;
  housekeeper?: Housekeeper | null;
  cleaningStartTime?: string | null;
  cleaningEndTime?: string | null;
  cleaningOriginStatus?: RoomStatus | null;
  checklist: ChecklistItem[];
}
