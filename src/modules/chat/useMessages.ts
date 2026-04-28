import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../../lib/chatApi';
import { decodeChatEventFromBase64 } from './avro';

export interface ChatMessage {
  id: string;
  groupName: string;
  senderEmail?: string | null;
  senderName?: string | null;
  text: string;
  createdAt?: string | null;
}

function normalizeMessages(payload: unknown, groupName: string): ChatMessage[] {
  const asAny = payload as any;

  // New shape we observed from the web app:
  // { groupName, count, messages: [ "<base64>" ... ] }
  if (Array.isArray(asAny?.messages) && asAny.messages.every((m: any) => typeof m === 'string')) {
    const list = asAny.messages as string[];
    const messages: ChatMessage[] = [];

    for (const encoded of list) {
      try {
        const evt = decodeChatEventFromBase64(encoded);
        const body = evt?.body;
        if (!body || !body['com.nodrafts.ChatTextMessage']) continue;
        const m = body['com.nodrafts.ChatTextMessage'];
        const destination = m?.destination;
        const g = destination?.group_name ?? groupName;

        messages.push({
          id: String(m?.message_id ?? encoded),
          groupName: String(g),
          senderEmail: null,
          senderName: String(m?.user_id ?? ''),
          text: String(m?.text ?? ''),
          createdAt:
            typeof m?.created_at === 'number'
              ? new Date(m.created_at).toISOString()
              : null,
        });
      } catch {
        // ignore undecodable items (reactions/attachments etc.)
      }
    }

    return messages;
  }

  return [];
}

export function useMessages(groupName: string, limit = 50) {
  return useQuery({
    queryKey: ['chat', 'messages', groupName, limit],
    queryFn: async () => {
      const res = await chatApi.get('/messages/history', {
        params: { groupName, limit },
      });
      return normalizeMessages(res.data, groupName);
    },
    enabled: !!groupName,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

