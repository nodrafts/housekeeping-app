import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Screen } from '../components/layout/Screen';
import { colors, radii } from '../lib/theme';
import { useAuthContext } from '../modules/auth/AuthProvider';
import { createMessageId } from '../modules/chat/avro';
import { realtimeChatClient } from '../modules/chat/realtimeClient';
import { useConversationChannels, useConversationPeople, type ConversationChannel, type ConversationPerson } from '../modules/chat/useConversations';
import { useDirectMessages, useMessages, type ChatMessage } from '../modules/chat/useMessages';
import { useRealtimeChannel } from '../modules/chat/useRealtimeChannel';
import { markMessagesRead } from '../modules/chat/useUnreadCount';

type Conversation =
  | { kind: 'channel'; id: string; title: string; description?: string | null }
  | { kind: 'person'; id: string; title: string; description?: string | null };

type Incident = { incidentId: string; roomNumber: string | null; item: string | null; issue: string | null; category: string | null; severity: string | null };

function parseIncident(text: string): Incident | null {
  const match = text.match(/\[INCIDENT:([^\]]+)\]\s+Room\s+(\S+)\s+\|\s+([^:]+):\s+([^|]+)\s+\|(?:\s+Category:\s+([^|]+)\s+\|)?\s+Severity:\s+(.+)/i);
  if (!match) return null;
  return { incidentId: match[1].trim(), roomNumber: match[2].trim(), item: match[3].trim(), issue: match[4].trim(), category: match[5]?.trim() ?? null, severity: match[6].trim() };
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '#';
}

export function MessagingScreen() {
  const { t } = useTranslation();
  const { user, accessToken } = useAuthContext();
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [incident, setIncident] = useState<Incident | null>(null);

  const channelsQuery = useConversationChannels();
  const peopleQuery = useConversationPeople(user?.orgId, user?.id);
  const groupName = selected?.kind === 'channel' ? selected.id : '';
  const personId = selected?.kind === 'person' ? selected.id : '';
  const channelMessages = useMessages(groupName, 50);
  const directMessages = useDirectMessages(personId, 50);
  const realtime = useRealtimeChannel({ userId: user?.id, token: accessToken, channelName: groupName });
  const baseMessages = selected?.kind === 'person' ? directMessages.data ?? [] : channelMessages.data ?? [];
  const messagesLoading = selected?.kind === 'person' ? directMessages.isLoading : channelMessages.isLoading;
  const messagesError = selected?.kind === 'person' ? directMessages.isError : channelMessages.isError;

  const combinedMessages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    [...baseMessages, ...localMessages].forEach((message) => message?.id && byId.set(message.id, message));
    return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
  }, [baseMessages, localMessages]);

  useEffect(() => { markMessagesRead(); }, []);
  useEffect(() => { setLocalMessages([]); }, [selected?.kind, selected?.id]);
  useEffect(() => realtimeChatClient.onEvent((event) => {
    if (event.kind !== 'text' || !selected) return;
    if (selected.kind === 'channel' && event.groupName !== selected.id) return;
    if (selected.kind === 'person' && event.groupName) return;
    if (selected.kind === 'person' && event.userId !== selected.id) return;
    setLocalMessages((current) => [...current, { id: event.messageId, groupName: event.groupName || selected.id, senderName: event.userId, text: event.text, createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null }]);
  }), [selected]);

  const normalizedSearch = search.trim().toLowerCase();
  const channels = (channelsQuery.data ?? []).filter((channel: ConversationChannel) => (channel.displayName ?? channel.channelName).toLowerCase().includes(normalizedSearch));
  const people = (peopleQuery.data ?? []).filter((person: ConversationPerson) => `${person.name} ${person.email}`.toLowerCase().includes(normalizedSearch));

  const send = () => {
    const text = draft.trim();
    if (!text || !selected) return;
    const id = createMessageId();
    setLocalMessages((current) => [...current, { id, groupName: selected.id, senderEmail: user?.email, senderName: user?.name, text, createdAt: new Date().toISOString() }]);
    setDraft('');
    if (selected.kind === 'person') realtimeChatClient.sendTextToUser({ targetUserId: selected.id, text, messageId: id });
    else realtime.sendText(text, id);
  };

  if (!selected) {
    return (
      <Screen>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, backgroundColor: colors.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><BrandLogo width={36} height={24} /><Text style={{ color: colors.primaryForeground, fontSize: 20, fontWeight: '800' }}>noDrafts</Text></View>
          <Text style={{ marginTop: 18, color: colors.primaryForeground, fontSize: 28, fontWeight: '800' }}>{t('chat.title')}</Text>
          <TextInput value={search} onChangeText={setSearch} placeholder={t('chat.search')} placeholderTextColor="#8b7a8b" style={{ marginTop: 14, height: 46, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 14, color: colors.foreground }} />
        </View>
        <FlatList
          data={[{ type: 'heading', id: 'channels' }, ...(channels.length ? channels.map((value) => ({ type: 'channel', id: value.channelName, value })) : [{ type: 'empty', id: 'channels-empty' }]), { type: 'heading', id: 'people' }, ...(people.length ? people.map((value) => ({ type: 'person', id: value.userId, value })) : [{ type: 'empty', id: 'people-empty' }])] as any[]}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => {
            if (item.type === 'heading') return <Text style={{ marginTop: item.id === 'people' ? 22 : 4, marginBottom: 8, fontSize: 12, fontWeight: '800', color: colors.mutedForeground, textTransform: 'uppercase' }}>{t(item.id === 'people' ? 'chat.directMessages' : 'chat.channels')}</Text>;
            if (item.type === 'empty') return <Text style={{ paddingVertical: 12, color: colors.mutedForeground, fontSize: 13 }}>{t(item.id === 'people-empty' ? 'chat.noPeople' : 'chat.noChannels')}</Text>;
            const title = item.type === 'person' ? item.value.name : item.value.displayName ?? item.value.channelName;
            const description = item.type === 'person' ? item.value.email : item.value.description ?? t('chat.channelDescription');
            return <TouchableOpacity onPress={() => setSelected({ kind: item.type, id: item.id, title, description })} style={{ minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}><View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.selected }}><Text style={{ color: colors.primary, fontWeight: '800' }}>{item.type === 'channel' ? '#' : initials(title)}</Text></View><View style={{ flex: 1, marginLeft: 12 }}><Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: colors.foreground }}>{title}</Text><Text numberOfLines={1} style={{ marginTop: 3, fontSize: 12, color: colors.mutedForeground }}>{description}</Text></View><Text style={{ color: colors.mutedForeground, fontSize: 22 }}>›</Text></TouchableOpacity>;
          }}
          ListEmptyComponent={(channelsQuery.isLoading || peopleQuery.isLoading) ? <ActivityIndicator color={colors.primary} /> : null}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
        <View style={{ minHeight: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary }}>
          <TouchableOpacity onPress={() => setSelected(null)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryForeground, fontSize: 30 }}>‹</Text></TouchableOpacity>
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.primaryForeground, fontSize: 17, fontWeight: '800' }}>{selected.kind === 'channel' ? `# ${selected.title}` : selected.title}</Text><Text style={{ marginTop: 2, color: '#e4d8e4', fontSize: 11 }}>{realtime.status === 'connected' ? t('chat.connected') : t('chat.reconnecting')}</Text></View>
        </View>
        {messagesLoading ? <ActivityIndicator style={{ flex: 1 }} color={colors.primary} /> : messagesError ? <Text style={{ padding: 20, color: colors.destructive }}>{t('chat.loadFailed')}</Text> : (
          <FlatList data={combinedMessages} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 16, paddingBottom: 18 }} ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.mutedForeground }}>{t('chat.noMessages')}</Text>} renderItem={({ item }) => {
            const mine = (!!item.senderEmail && !!user?.email && item.senderEmail.toLowerCase() === user.email.toLowerCase()) || item.senderName === user?.id;
            const parsed = parseIncident(item.text);
            return <TouchableOpacity disabled={!parsed} onPress={() => parsed && setIncident(parsed)} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '84%', marginBottom: 12, borderRadius: 16, borderBottomRightRadius: mine ? 5 : 16, borderBottomLeftRadius: mine ? 16 : 5, backgroundColor: mine ? colors.primary : colors.card, borderWidth: mine ? 0 : 1, borderColor: parsed ? colors.warning : colors.border, paddingHorizontal: 13, paddingVertical: 10 }}>{!mine && <Text style={{ marginBottom: 4, fontSize: 11, fontWeight: '800', color: colors.primary }}>{item.senderName ?? item.senderEmail ?? t('chat.unknown')}</Text>}<Text style={{ color: mine ? colors.primaryForeground : colors.foreground, fontSize: 14, lineHeight: 19 }}>{item.text}</Text>{item.createdAt ? <Text style={{ marginTop: 5, alignSelf: 'flex-end', fontSize: 10, color: mine ? '#dfd2df' : colors.mutedForeground }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text> : null}</TouchableOpacity>;
          }} />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}><TextInput value={draft} onChangeText={setDraft} multiline placeholder={t('chat.typeMessage')} placeholderTextColor={colors.mutedForeground} style={{ flex: 1, maxHeight: 100, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 11, color: colors.foreground }} /><TouchableOpacity disabled={!draft.trim()} onPress={send} style={{ minWidth: 62, height: 44, marginLeft: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.45 }}><Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '800' }}>{t('chat.send')}</Text></TouchableOpacity></View>
      </KeyboardAvoidingView>
      <Modal visible={!!incident} transparent animationType="fade" onRequestClose={() => setIncident(null)}><Pressable onPress={() => setIncident(null)} style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.45)' }}>{incident ? <View onStartShouldSetResponder={() => true} style={{ borderRadius: radii.lg, backgroundColor: colors.card, padding: 18 }}><Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{t('chat.incident', { id: incident.incidentId })}</Text>{([['room', incident.roomNumber], ['item', incident.item], ['issue', incident.issue], ['category', incident.category], ['severity', incident.severity]] as const).map(([label, value]) => value ? <Text key={label} style={{ marginTop: 8, color: colors.foreground }}><Text style={{ fontWeight: '800' }}>{t(`chat.${label}`)}: </Text>{value}</Text> : null)}<Text style={{ marginTop: 14, color: colors.mutedForeground, fontSize: 12 }}>{t('chat.incidentHelp')}</Text><TouchableOpacity onPress={() => setIncident(null)} style={{ marginTop: 18, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryForeground, fontWeight: '800' }}>{t('chat.close')}</Text></TouchableOpacity></View> : null}</Pressable></Modal>
    </Screen>
  );
}
