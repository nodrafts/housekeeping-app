import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Screen } from '../components/layout/Screen';
import { useHousekeepingChannel } from '../modules/chat/useChannel';
import { useAuthContext } from '../modules/auth/AuthProvider';
import { useMessages, type ChatMessage } from '../modules/chat/useMessages';
import { useRealtimeChannel } from '../modules/chat/useRealtimeChannel';
import { realtimeChatClient } from '../modules/chat/realtimeClient';
import { createMessageId } from '../modules/chat/avro';
import { markMessagesRead } from '../modules/chat/useUnreadCount';

type Props = NativeStackScreenProps<AppStackParamList, 'Messaging'>;

type ParsedIncidentLink = {
  incidentId: string;
  roomNumber: string | null;
  item: string | null;
  issue: string | null;
  category: string | null;
  severity: string | null;
};

function parseIncidentFromText(text: string): ParsedIncidentLink | null {
  // Format: [INCIDENT:id] Room 101 | Item: Issue | Category: X | Severity: Y
  // Category is optional
  const newPattern = /\[INCIDENT:([^\]]+)\]\s+Room\s+(\S+)\s+\|\s+([^:]+):\s+([^|]+)\s+\|(?:\s+Category:\s+([^|]+)\s+\|)?\s+Severity:\s+(.+)/i;
  const newMatch = text.match(newPattern);
  if (newMatch) {
    const [, incidentId, roomNumber, item, issue, category, severity] = newMatch;
    return {
      incidentId: incidentId.trim(),
      roomNumber: roomNumber.trim(),
      item: item.trim(),
      issue: issue.trim(),
      category: category ? category.trim() : null,
      severity: severity.trim(),
    };
  }

  // Legacy format: "Incident 123 created for Room 101 on issue Leaking"
  const legacyPattern = /Incident\s+(\S+)\s+created\s+for\s+Room\s+(\S+)(?:\s+on\s+issue\s+(.+))?/i;
  const legacyMatch = text.match(legacyPattern);
  if (legacyMatch) {
    const [, incidentIdRaw, roomRaw, issueRaw] = legacyMatch;
    return {
      incidentId: incidentIdRaw,
      roomNumber: roomRaw ?? null,
      item: null,
      issue: issueRaw ? issueRaw.trim() : null,
      category: null,
      severity: null,
    };
  }

  return null;
}

export function MessagingScreen({}: Partial<Props>) {
  const { user, accessToken } = useAuthContext();
  const { data: channel, isLoading: channelLoading } = useHousekeepingChannel();
  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
  } = useMessages('housekeeping-maintenance', 50);
  const [draft, setDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<ParsedIncidentLink | null>(
    null,
  );

  const combinedMessages = useMemo(
    () => {
      const all = [...messages, ...localMessages];
      const byId = new Map<string, ChatMessage>();
      for (const m of all) {
        if (!m?.id) continue;
        byId.set(m.id, m);
      }
      return Array.from(byId.values()).sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
      );
    },
    [messages, localMessages],
  );

  const realtime = useRealtimeChannel({
    userId: user?.id,
    token: accessToken,
    channelName: 'housekeeping-maintenance',
  });

  // Mark all messages as read when this screen mounts
  useEffect(() => {
    markMessagesRead();
  }, []);

  useEffect(() => {
    const unsubscribe = realtimeChatClient.onEvent((evt) => {
      if (evt.kind !== 'text') return;
      if (evt.groupName !== 'housekeeping-maintenance') return;

      const next: ChatMessage = {
        id: evt.messageId || `rt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        groupName: evt.groupName,
        senderEmail: null,
        senderName: evt.userId,
        text: evt.text,
        createdAt: evt.createdAt ? new Date(evt.createdAt).toISOString() : null,
      };

      setLocalMessages((prev) => [...prev, next]);
    });
    return unsubscribe;
  }, []);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;

    const messageId = createMessageId();
    const localMessage: ChatMessage = {
      id: messageId,
      groupName: 'housekeeping-maintenance',
      senderEmail: user?.email ?? null,
      senderName: null,
      text,
      createdAt: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, localMessage]);
    setDraft('');

    realtime.sendText(text, messageId);
  };

  return (
    <Screen showMessagesButton={false}>
      <View
        style={{
          flex: 1,
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#0f172a',
            marginBottom: 8,
          }}
        >
          {channel?.channelName ?? 'Messaging'}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: '#6b7280',
            marginBottom: 12,
          }}
        >
          {channelLoading
            ? 'Loading channel…'
            : (channel?.description ??
              'Showing recent messages for housekeeping-maintenance.')}
        </Text>

        <View style={{ flex: 1 }}>
          {messagesError ? (
            <Text style={{ fontSize: 13, color: '#b91c1c' }}>
              Could not load messages.
            </Text>
          ) : (
            <FlatList
              data={combinedMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingBottom: 12,
              }}
              renderItem={({ item }) => {
                const isMine =
                  item.senderEmail &&
                  user?.email &&
                  item.senderEmail.toLowerCase() === user.email.toLowerCase();

                const parsedIncident =
                  typeof item.text === 'string' ? parseIncidentFromText(item.text) : null;

                const BubbleComponent = parsedIncident
                  ? TouchableOpacity
                  : View;

                const getSeverityColor = (severity: string | null) => {
                  if (!severity) return '#2563eb';
                  const s = severity.toLowerCase();
                  if (s === 'critical') return '#dc2626';
                  if (s === 'high') return '#ea580c';
                  if (s === 'medium') return '#f59e0b';
                  if (s === 'low') return '#10b981';
                  return '#2563eb';
                };

                const severityColor = parsedIncident ? getSeverityColor(parsedIncident.severity) : '#2563eb';

                return (
                  <BubbleComponent
                    onPress={
                      parsedIncident
                        ? () => {
                            setSelectedIncident(parsedIncident);
                          }
                        : undefined
                    }
                    activeOpacity={parsedIncident ? 0.8 : 1}
                    style={{
                      marginBottom: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 14,
                      borderWidth: parsedIncident ? 2 : 1,
                      borderColor: parsedIncident ? severityColor : '#e5e7eb',
                      backgroundColor: isMine ? '#2563eb' : parsedIncident ? '#ffffff' : '#ffffff',
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                    }}
                  >
                    {!isMine && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: 4,
                        }}
                      >
                        {item.senderName ?? item.senderEmail ?? 'Unknown'}
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 13,
                        color: isMine ? '#ffffff' : '#111827',
                        textDecorationLine: parsedIncident ? 'underline' : 'none',
                      }}
                    >
                      {item.text}
                    </Text>
                  </BubbleComponent>
                );
              }}
              ListEmptyComponent={
                messagesLoading ? (
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>
                    Loading messages…
                  </Text>
                ) : (
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>
                    No messages yet.
                  </Text>
                )
              }
            />
          )}
        </View>

        {/* Input bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingTop: 8,
            marginTop: 8,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type your message..."
            placeholderTextColor="#9ca3af"
            style={{
              flex: 1,
              height: 40,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#d1d5db',
              backgroundColor: '#ffffff',
              fontSize: 13,
              color: '#111827',
              marginRight: 8,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            activeOpacity={0.8}
            style={{
              height: 40,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: draft.trim() ? '#2563eb' : '#9ca3af',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            disabled={!draft.trim()}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#ffffff',
              }}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Incident details modal (triggered when tapping an incident message) */}
      <Modal
        visible={selectedIncident != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIncident(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: 24,
          }}
          onPress={() => setSelectedIncident(null)}
        >
          {selectedIncident && (
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
              onStartShouldSetResponder={() => true}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#0f172a',
                  marginBottom: 8,
                }}
              >
                Incident {selectedIncident.incidentId}
              </Text>
              {selectedIncident.roomNumber && (
                <Text
                  style={{
                    fontSize: 13,
                    color: '#4b5563',
                    marginBottom: 4,
                  }}
                >
                  Room: {selectedIncident.roomNumber}
                </Text>
              )}
              {selectedIncident.item && (
                <Text
                  style={{
                    fontSize: 13,
                    color: '#4b5563',
                    marginBottom: 4,
                  }}
                >
                  Item: {selectedIncident.item}
                </Text>
              )}
              {selectedIncident.issue && (
                <Text
                  style={{
                    fontSize: 13,
                    color: '#4b5563',
                    marginBottom: 4,
                  }}
                >
                  Issue: {selectedIncident.issue}
                </Text>
              )}
              {selectedIncident.category && (
                <Text
                  style={{
                    fontSize: 13,
                    color: '#4b5563',
                    marginBottom: 4,
                  }}
                >
                  Category: {selectedIncident.category}
                </Text>
              )}
              {selectedIncident.severity && (
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#4b5563',
                    marginBottom: 8,
                  }}
                >
                  Severity: {selectedIncident.severity}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 12,
                  color: '#6b7280',
                  marginBottom: 12,
                }}
              >
                This information is parsed from the incident notification message.
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedIncident(null)}
                style={{
                  alignSelf: 'flex-end',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: '#2563eb',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#ffffff',
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Modal>
    </Screen>
  );
}

