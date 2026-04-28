import SockJS from 'sockjs-client';
import { Client, type IMessage } from '@stomp/stompjs';
import {
  createGroupTextMessageEvent,
  decodeChatEventFromBase64,
  encodeChatEventToBase64,
} from './avro';

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type IncomingChatEvent =
  | {
      kind: 'text';
      messageId: string;
      groupName: string;
      userId: string;
      text: string;
      createdAt?: number | null;
    }
  | { kind: 'reaction' }
  | { kind: 'attachment' }
  | { kind: 'unknown' };

type Listener = (event: IncomingChatEvent) => void;

const WS_URL = 'https://nodrafts-chat.fly.dev/ws-sockjs';
const SEND_DESTINATION = '/no-drafts/channels.send';

class RealtimeChatClient {
  private client: Client | null = null;
  private status: RealtimeStatus = 'disconnected';
  private listeners = new Set<Listener>();
  private currentUserId: string | null = null;
  private currentToken: string | null = null;

  getStatus() {
    return this.status;
  }

  onEvent(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: IncomingChatEvent) {
    for (const l of this.listeners) l(event);
  }

  connect(params: { userId: string; token: string }) {
    if (this.client && (this.status === 'connecting' || this.status === 'connected')) {
      return;
    }

    this.currentUserId = params.userId;
    this.currentToken = params.token;
    this.status = 'connecting';

    const sock = new SockJS(WS_URL);

    const client = new Client({
      webSocketFactory: () => sock as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 30000,
      heartbeatOutgoing: 30000,
      connectHeaders: {
        Authorization: `Bearer ${params.token}`,
        'X-User-Id': params.userId,
      },
      beforeConnect: async () => {
        if (!this.currentUserId || !this.currentToken) return;
        client.connectHeaders = {
          Authorization: `Bearer ${this.currentToken}`,
          'X-User-Id': this.currentUserId,
        };
      },
      onConnect: () => {
        this.status = 'connected';
        // Subscribe to personal queue for DMs/notifications.
        client.subscribe(`/users/${params.userId}`, (msg) => this.handleIncoming(msg));
      },
      onWebSocketClose: () => {
        this.status = 'disconnected';
      },
      onStompError: () => {
        this.status = 'error';
      },
    });

    client.activate();
    this.client = client;
  }

  disconnect() {
    this.status = 'disconnected';
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  subscribeToChannel(channelName: string) {
    if (!this.client || this.status !== 'connected') return;
    this.client.subscribe(`/channels/${channelName}`, (msg) => this.handleIncoming(msg));
  }

  sendTextToChannel(params: { channelName: string; text: string; messageId: string }) {
    if (!this.client || this.status !== 'connected') return;
    if (!this.currentUserId || !this.currentToken) return;

    const chatEvent = createGroupTextMessageEvent({
      userId: this.currentUserId,
      groupName: params.channelName,
      text: params.text,
      messageId: params.messageId,
    });

    const content = encodeChatEventToBase64(chatEvent);

    this.client.publish({
      destination: SEND_DESTINATION,
      body: JSON.stringify({
        userId: this.currentUserId,
        token: this.currentToken,
        content,
      }),
    });
  }

  private handleIncoming(message: IMessage) {
    try {
      const chatEvent = decodeChatEventFromBase64(message.body);
      const body = chatEvent?.body ?? null;

      if (body && body['com.nodrafts.ChatTextMessage']) {
        const m = body['com.nodrafts.ChatTextMessage'];
        const destination = m?.destination;
        const groupName = destination?.group_name ?? '';

        this.emit({
          kind: 'text',
          messageId: String(m?.message_id ?? ''),
          groupName,
          userId: String(m?.user_id ?? ''),
          text: String(m?.text ?? ''),
          createdAt: typeof m?.created_at === 'number' ? m.created_at : null,
        });
        return;
      }

      if (body && body['com.nodrafts.ChatReaction']) {
        this.emit({ kind: 'reaction' });
        return;
      }

      if (body && body['com.nodrafts.ChatAttachment']) {
        this.emit({ kind: 'attachment' });
        return;
      }

      this.emit({ kind: 'unknown' });
    } catch {
      this.emit({ kind: 'unknown' });
    }
  }
}

export const realtimeChatClient = new RealtimeChatClient();

