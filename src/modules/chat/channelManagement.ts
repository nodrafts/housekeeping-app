import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { chatApi } from '../../lib/chatApi';
import type { ConversationPerson } from './useConversations';

export interface ChannelDetails {
  channelName: string;
  description?: string | null;
  hotelCode?: string | null;
  isPrivate?: boolean;
  isArchived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  members: string[];
  admins: string[];
  memberCount?: number;
}

export interface CreateChannelInput {
  channelName: string;
  description?: string;
  hotelCode: string;
  isPrivate: boolean;
}

function unwrap<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function unpackEmployees(payload: any): any[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data?.employees)) return data.data.employees;
  return [];
}

function normalizeChannel(payload: any): ChannelDetails {
  const channel = unwrap<any>(payload);
  return {
    ...channel,
    channelName: String(channel.channelName ?? ''),
    members: Array.isArray(channel.members) ? channel.members.map(String) : [],
    admins: Array.isArray(channel.admins) ? channel.admins.map(String) : [],
  };
}

export function useChannelDetails(channelName?: string) {
  return useQuery({
    queryKey: ['chat', 'channel-details', channelName],
    enabled: !!channelName,
    retry: false,
    queryFn: async () => normalizeChannel((await chatApi.get(`/channels/${encodeURIComponent(channelName!)}`)).data),
  });
}

export function useChannelEmployees(orgId?: string, hotelCode?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['chat', 'channel-employees', orgId, hotelCode],
    enabled: enabled && !!orgId && !!hotelCode,
    retry: false,
    queryFn: async () => {
      const response = await api.get(
        `/api/v1/orgs/${encodeURIComponent(orgId!)}/hotels/${encodeURIComponent(hotelCode!)}/employee-directory`,
        { headers: { 'X-Org-Id': orgId! }, timeout: 15000 },
      );
      return unpackEmployees(response.data)
        .map((employee: any): ConversationPerson => ({
          userId: String(employee.id ?? employee.userId ?? employee.employeeId ?? ''),
          name: String(employee.name || [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.email || ''),
          email: String(employee.email ?? ''),
        }))
        .filter((employee: ConversationPerson) => !!employee.userId)
        .sort((left: ConversationPerson, right: ConversationPerson) => left.name.localeCompare(right.name));
    },
  });
}

export async function createChannel(input: CreateChannelInput): Promise<ChannelDetails> {
  return normalizeChannel((await chatApi.post('/channels', input)).data);
}

export async function addChannelMember(channelName: string, userId: string): Promise<ChannelDetails> {
  return normalizeChannel((await chatApi.post(`/channels/${encodeURIComponent(channelName)}/members`, { userId })).data);
}

export async function removeChannelMember(channelName: string, userId: string): Promise<ChannelDetails> {
  return normalizeChannel((await chatApi.delete(`/channels/${encodeURIComponent(channelName)}/members/${encodeURIComponent(userId)}`)).data);
}

export async function promoteChannelAdmin(channelName: string, userId: string): Promise<ChannelDetails> {
  return normalizeChannel((await chatApi.post(`/channels/${encodeURIComponent(channelName)}/admins`, { userId })).data);
}

export async function archiveChannel(channelName: string): Promise<ChannelDetails> {
  return normalizeChannel((await chatApi.post(`/channels/${encodeURIComponent(channelName)}/archive`)).data);
}

export async function leaveChannel(channelName: string): Promise<ChannelDetails> {
  return normalizeChannel((await chatApi.delete(`/channels/${encodeURIComponent(channelName)}/leave`)).data);
}
