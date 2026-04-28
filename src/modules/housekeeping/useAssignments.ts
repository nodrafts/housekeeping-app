import { useQuery } from '@tanstack/react-query';
import type { RoomAssignment } from './types';
import { CURRENT_ASSIGNMENTS } from './mockData';

const ASSIGNMENTS_KEY = ['assignments'];

async function fetchAssignments(): Promise<RoomAssignment[]> {
  // Front-end only: return the in-memory assignments with a small delay
  return new Promise((resolve) => {
    setTimeout(() => resolve(CURRENT_ASSIGNMENTS), 150);
  });
}

export function useAssignments() {
  return useQuery({
    queryKey: ASSIGNMENTS_KEY,
    queryFn: fetchAssignments,
  });
}

