import { createUserTextMessageEvent, decodeChatEventFromBase64, encodeChatEventToBase64 } from './avro';

describe('direct chat events', () => {
  it('encodes a message with a USER destination', () => {
    const encoded = encodeChatEventToBase64(createUserTextMessageEvent({
      userId: 'sender-1',
      targetUserId: 'recipient-2',
      text: 'Hello',
      messageId: 'message-3',
      eventId: 'event-4',
    }));
    const decoded = decodeChatEventFromBase64(encoded);
    const message = decoded.body['com.nodrafts.ChatTextMessage'];

    expect(message.message_id).toBe('message-3');
    expect(message.destination).toEqual({ type: 'USER', group_name: null, user_id: 'recipient-2' });
  });
});
