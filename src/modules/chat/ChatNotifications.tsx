import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthContext } from '../auth/AuthProvider';
import { hasHotelPermission } from '../auth/permissions';
import { realtimeChatClient } from './realtimeClient';
import { useConversationChannels } from './useConversations';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function ChatNotifications() {
  const { user, accessToken } = useAuthContext();
  const canAccess = hasHotelPermission(user, 'perm_chat_access');
  const canDirect = hasHotelPermission(user, 'perm_chat_direct');
  const channels = useConversationChannels();

  useEffect(() => {
    if (!canAccess || !user?.id || !accessToken) return;
    realtimeChatClient.connect({
      userId: user.id,
      token: accessToken,
      allowDirectMessages: canDirect,
    });
    const interval = setInterval(() => {
      if (realtimeChatClient.getStatus() !== 'connected') return;
      (channels.data ?? []).forEach(channel =>
        realtimeChatClient.subscribeToChannel(channel.channelName),
      );
    }, 500);
    return () => clearInterval(interval);
  }, [accessToken, canAccess, canDirect, channels.data, user?.id]);

  useEffect(() => {
    if (!canAccess || Platform.OS === 'web') return;
    void Notifications.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
      });
    }
  }, [canAccess]);

  useEffect(
    () =>
      realtimeChatClient.onEvent(event => {
        if (
          event.kind !== 'text' ||
          event.userId === user?.id ||
          Platform.OS === 'web'
        )
          return;
        if (
          event.groupName &&
          realtimeChatClient.getActiveChannel() === event.groupName
        )
          return;
        const channel = (channels.data ?? []).find(
          item => item.channelName === event.groupName,
        );
        void Notifications.scheduleNotificationAsync({
          content: {
            title:
              channel?.displayName ||
              (event.groupName ? `#${event.groupName}` : 'New message'),
            body: event.text,
            sound: true,
            data: { channelName: event.groupName },
          },
          trigger: null,
        });
      }),
    [channels.data, user?.id],
  );

  return null;
}
