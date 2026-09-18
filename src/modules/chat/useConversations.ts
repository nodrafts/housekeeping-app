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

function unpackChannels(payload: any): Array<ConversationChannel | string> {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.channels)) return data.channels;
  return [];
}

function unpackEmployees(payload: any): any[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data?.employees)) return data.data.employees;
  return [];
}

export function useConversationChannels() {
  return useQuery({
    queryKey: ['chat', 'channels'],
    retry: false,
    queryFn: async () => {
      const response = await chatApi.get('/channels');
      return unpackChannels(response.data)
        .map((channel) => typeof channel === 'string' ? { channelName: channel } : channel)
        .filter((channel) => !!channel.channelName);
    },
  });
}

export function useConversationPeople(orgId?: string, currentUserId?: string) {
  return useQuery({
    queryKey: ['chat', 'people', orgId],
    enabled: !!orgId,
    retry: false,
    queryFn: async () => {
      const response = await api.get(`/api/v1/orgs/${encodeURIComponent(orgId!)}/employees`, {
        headers: { 'X-Org-Id': orgId! },
        params: { view: 'flat' },
        timeout: 15000,
      });
      return unpackEmployees(response.data)
        .map((employee: any): ConversationPerson => ({
          userId: String(employee.id ?? employee.userId ?? employee.employeeId ?? ''),
          name: String(employee.name || [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.email || ''),
          email: String(employee.email ?? ''),
        }))
        .filter((person: ConversationPerson) => person.userId && person.userId !== currentUserId);
    },
  });
}
