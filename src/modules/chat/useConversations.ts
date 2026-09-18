import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { chatApi } from '../../lib/chatApi';

export interface ConversationChannel {
  channelName: string;
  displayName?: string | null;
  description?: string | null;
  isPrivate?: boolean;
  unreadCount?: number;
}

export interface ConversationPerson {
  userId: string;
  name: string;
  email: string;
}

export function useConversationChannels() {
  return useQuery({
    queryKey: ['chat', 'channels'],
    queryFn: async () => {
      const response = await chatApi.get<Array<ConversationChannel | string>>('/channels');
      if (!Array.isArray(response.data)) return [];
      return response.data.map((channel) => typeof channel === 'string' ? { channelName: channel } : channel);
    },
  });
}

export function useConversationPeople(orgId?: string, currentUserId?: string) {
  return useQuery({
    queryKey: ['chat', 'people', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const response = await api.get(`/api/v1/orgs/${encodeURIComponent(orgId!)}/employees`);
      const employees = response.data?.data?.employees ?? response.data?.data ?? [];
      if (!Array.isArray(employees)) return [];
      return employees
        .map((employee: any): ConversationPerson => ({
          userId: String(employee.id ?? employee.userId ?? ''),
          name: String(employee.name ?? employee.email ?? ''),
          email: String(employee.email ?? ''),
        }))
        .filter((person: ConversationPerson) => person.userId && person.userId !== currentUserId);
    },
  });
}
