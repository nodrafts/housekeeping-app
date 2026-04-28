import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../../lib/chatApi';

export interface ChatChannel {
  channelName: string;
  description: string | null;
  // plus whatever other fields you need later
}

export function useHousekeepingChannel() {
  return useQuery({
    queryKey: ['chat', 'channel', 'housekeeping-maintenance'],
    queryFn: async () => {
      const res = await chatApi.get<ChatChannel>(
        '/channels/housekeeping-maintenance',
      );
      return res.data;
    },
  });
}