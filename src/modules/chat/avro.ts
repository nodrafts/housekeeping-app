import * as avro from 'avsc';
import { Buffer } from 'buffer';

// Avro schema derived from the NoDrafts web client guide.
const chatEventProtocol: any[] = [
  {
    type: 'enum',
    name: 'DestinationType',
    namespace: 'com.nodrafts',
    symbols: ['GROUP', 'USER'],
  },
  {
    type: 'record',
    name: 'Destination',
    namespace: 'com.nodrafts',
    fields: [
      { name: 'type', type: 'com.nodrafts.DestinationType' },
      { name: 'group_name', type: ['null', 'string'], default: null },
      { name: 'user_id', type: ['null', 'string'], default: null },
    ],
  },
  {
    type: 'record',
    name: 'ReplyContext',
    namespace: 'com.nodrafts',
    fields: [
      { name: 'thread_id', type: 'string' },
      {
        name: 'reply_to_message_id',
        type: ['null', 'string'],
        default: null,
      },
    ],
  },
  {
    type: 'record',
    name: 'ChatTextMessage',
    namespace: 'com.nodrafts',
    fields: [
      { name: 'message_id', type: 'string' },
      { name: 'user_id', type: 'string' },
      { name: 'text', type: 'string' },
      {
        name: 'created_at',
        type: ['null', { type: 'long', logicalType: 'timestamp-millis' }],
        default: null,
      },
      { name: 'destination', type: 'com.nodrafts.Destination' },
      { name: 'reply', type: ['null', 'com.nodrafts.ReplyContext'], default: null },
    ],
  },
  {
    type: 'record',
    name: 'ChatReaction',
    namespace: 'com.nodrafts',
    fields: [
      { name: 'reaction_id', type: 'string' },
      { name: 'message_id', type: 'string' },
      { name: 'user_id', type: 'string' },
      { name: 'emoji', type: 'string' },
      {
        name: 'reacted_at',
        type: ['null', { type: 'long', logicalType: 'timestamp-millis' }],
        default: null,
      },
      { name: 'destination', type: 'com.nodrafts.Destination' },
    ],
  },
  {
    type: 'record',
    name: 'ChatAttachment',
    namespace: 'com.nodrafts',
    fields: [
      { name: 'attachment_id', type: 'string' },
      { name: 'user_id', type: 'string' },
      { name: 'file_name', type: 'string' },
      { name: 'content_type', type: 'string' },
      { name: 'file_size_bytes', type: 'long' },
      {
        name: 'uploaded_at',
        type: ['null', { type: 'long', logicalType: 'timestamp-millis' }],
        default: null,
      },
      { name: 'destination', type: 'com.nodrafts.Destination' },
    ],
  },
  {
    type: 'record',
    name: 'ChatEvent',
    namespace: 'com.nodrafts',
    fields: [
      { name: 'event_id', type: 'string' },
      {
        name: 'occurred_at',
        type: { type: 'long', logicalType: 'timestamp-millis' },
      },
      { name: 'producer', type: ['null', 'string'], default: null },
      {
        name: 'body',
        type: [
          'com.nodrafts.ChatTextMessage',
          'com.nodrafts.ChatReaction',
          'com.nodrafts.ChatAttachment',
        ],
      },
    ],
  },
];

const registry: Record<string, any> = {};
for (const schema of chatEventProtocol) {
  avro.Type.forSchema(schema, { registry });
}

export const ChatEventType = registry['com.nodrafts.ChatEvent'] as avro.Type;

export type DecodedChatEvent = any;

function randomId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createMessageId() {
  return randomId('msg');
}

export function createEventId() {
  return randomId('evt');
}

export function encodeChatEventToBase64(chatEvent: unknown): string {
  const bytes = ChatEventType.toBuffer(chatEvent as any);
  return Buffer.from(bytes).toString('base64');
}

export function decodeChatEventFromBase64(base64: string): DecodedChatEvent {
  const bytes = Buffer.from(base64, 'base64');
  return ChatEventType.fromBuffer(bytes);
}

export function createGroupTextMessageEvent(params: {
  userId: string;
  groupName: string;
  text: string;
  messageId?: string;
  eventId?: string;
}): unknown {
  const now = Date.now();

  return {
    event_id: params.eventId ?? createEventId(),
    occurred_at: now,
    producer: 'mobile-app',
    body: {
      'com.nodrafts.ChatTextMessage': {
        message_id: params.messageId ?? createMessageId(),
        user_id: params.userId,
        text: params.text,
        created_at: now,
        destination: {
          type: 'GROUP',
          group_name: params.groupName,
          user_id: null,
        },
        reply: null,
      },
    },
  };
}

