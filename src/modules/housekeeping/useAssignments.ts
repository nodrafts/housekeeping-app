import { useQuery } from '@tanstack/react-query';
import { assignmentsKey, fetchAssignments } from './roomAssignmentsApi';

function todayInput() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useAssignments(hotelCode?: string, dueDate?: string) {
  const resolvedDueDate = dueDate ?? todayInput();
  return useQuery({
    queryKey: assignmentsKey(hotelCode, resolvedDueDate),
    queryFn: () => fetchAssignments(hotelCode, resolvedDueDate),
    enabled: !!hotelCode,
  });
}
