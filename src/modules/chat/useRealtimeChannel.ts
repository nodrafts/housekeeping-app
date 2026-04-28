import { useEffect, useState } from 'react';
import { realtimeChatClient, type RealtimeStatus } from './realtimeClient';

export function useRealtimeChannel(params: {
  userId: string | null | undefined;
  token: string | null | undefined;
  channelName: string;
}) {
  const [status, setStatus] = useState<RealtimeStatus>(
    realtimeChatClient.getStatus(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(realtimeChatClient.getStatus());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!params.userId || !params.token) return;
    realtimeChatClient.connect({ userId: params.userId, token: params.token });
  }, [params.userId, params.token]);

  useEffect(() => {
    if (status !== 'connected') return;
    realtimeChatClient.subscribeToChannel(params.channelName);
  }, [status, params.channelName]);

  return {
    status,
    sendText: (text: string, messageId: string) =>
      realtimeChatClient.sendTextToChannel({
        channelName: params.channelName,
        text,
        messageId,
      }),
  };
}

