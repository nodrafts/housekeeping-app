import { useQuery } from '@tanstack/react-query';
import { assignmentsKey, fetchAssignments } from './roomAssignmentsApi';
import { useTimeZone } from '../settings/timeZoneStore';

export function useAssignments(hotelCode?: string) {
  const { timeZone } = useTimeZone();
  return useQuery({
    queryKey: assignmentsKey(hotelCode, timeZone),
    queryFn: () => fetchAssignments(hotelCode, timeZone),
    enabled: !!hotelCode,
  });
}
