import { useQuery } from '@tanstack/react-query';
import { assignmentsKey, fetchAssignments } from './roomAssignmentsApi';

export function useAssignments(hotelCode?: string) {
  return useQuery({
    queryKey: assignmentsKey(hotelCode),
    queryFn: () => fetchAssignments(hotelCode),
    enabled: !!hotelCode,
  });
}
