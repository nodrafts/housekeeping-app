import type { RoomAssignment } from './types';

export const MOCK_ASSIGNMENTS: RoomAssignment[] = [
  {
    id: 'a1',
    taskId: 1,
    roomId: '101',
    roomNumber: '101',
    floor: '10',
    type: 'King',
    status: 'TO_CLEAN',
    guestStatus: 'CHECKED_OUT',
    checklist: [
      { id: 'sheets', label: 'Replace bedsheets and pillow covers', status: 'WAITING', done: false },
      { id: 'bathroom', label: 'Clean bathroom and replace towels', status: 'WAITING', done: false },
      { id: 'amenities', label: 'Restock soaps and amenities', status: 'WAITING', done: false },
      { id: 'trash', label: 'Empty trash bins', status: 'WAITING', done: false },
      { id: 'vacuum', label: 'Vacuum and mop the floor', status: 'WAITING', done: false },
    ],
  },
  {
    id: 'a2',
    taskId: 2,
    roomId: '203',
    roomNumber: '203',
    floor: '20',
    type: 'Double',
    status: 'IN_PROGRESS',
    guestStatus: 'STAYOVER',
    startedAt: new Date().toISOString(),
    checklist: [
      { id: 'beds', label: 'Make the beds', status: 'COMPLETED', done: true },
      { id: 'dust', label: 'Dust all surfaces', status: 'WAITING', done: false },
      { id: 'remote', label: 'Check TV remote and replace batteries', status: 'WAITING', done: false },
      { id: 'minibar', label: 'Check minibar items', status: 'WAITING', done: false },
    ],
  },
  {
    id: 'a3',
    taskId: 3,
    roomId: '305',
    roomNumber: '305',
    floor: '30',
    type: 'Suite',
    status: 'DONE',
    guestStatus: 'CHECKED_IN',
    completedAt: new Date().toISOString(),
    checklist: [
      { id: 'overview', label: 'General room inspection', status: 'COMPLETED', done: true },
      { id: 'windows', label: 'Clean windows and curtains', status: 'COMPLETED', done: true },
      { id: 'supplies', label: 'Check housekeeping supplies closet', status: 'COMPLETED', done: true },
    ],
  },
];

// Mutable copy used by front-end-only mocks so that
// progress and status changes persist while the app is running.
export let CURRENT_ASSIGNMENTS: RoomAssignment[] = [...MOCK_ASSIGNMENTS];

export function setCurrentAssignments(next: RoomAssignment[]) {
  CURRENT_ASSIGNMENTS = next;
}

