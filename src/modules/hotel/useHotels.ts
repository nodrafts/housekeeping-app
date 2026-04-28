import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DEFAULT_ORG_ID } from '../../lib/propertyConfig';

type HotelItem = {
  hotelCode: string;
  name: string;
};

async function fetchHotels(): Promise<HotelItem[]> {
  const res = await api.get(
    `/api/v1/orgs/${DEFAULT_ORG_ID}/hotels`,
  );
  const payload: any = res.data;
  if (__DEV__) {
    console.log('[useHotels] raw response:', JSON.stringify(payload));
  }
  const list: any[] =
    Array.isArray(payload) ? payload :
    Array.isArray(payload?.hotels) ? payload.hotels :
    Array.isArray(payload?.data) ? payload.data :
    Array.isArray(payload?.data?.hotels) ? payload.data.hotels :
    [];
  return list
    .filter((h) => h?.hotelCode && h?.name)
    .map((h) => ({ hotelCode: h.hotelCode, name: h.name }));
}

export function useHotels() {
  return useQuery({
    queryKey: ['hotels', DEFAULT_ORG_ID],
    queryFn: fetchHotels,
  });
}
