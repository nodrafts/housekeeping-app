import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ChannelActionsModal, ChannelMembersModal, CreateChannelModal } from '../components/chat/ChannelManagementModals';
import { Screen } from '../components/layout/Screen';
import { colors, radii } from '../lib/theme';
import { useAuthContext } from '../modules/auth/AuthProvider';
import { createMessageId } from '../modules/chat/avro';
import { realtimeChatClient } from '../modules/chat/realtimeClient';
import { useConversationChannels, useConversationPeople, type ConversationChannel, type ConversationPerson } from '../modules/chat/useConversations';
import { useDirectMessages, useMessages, type ChatMessage } from '../modules/chat/useMessages';
import { useRealtimeChannel } from '../modules/chat/useRealtimeChannel';
import { useChannelDetails, type ChannelDetails } from '../modules/chat/channelManagement';
import { markMessagesRead } from '../modules/chat/useUnreadCount';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { hasHotelPermission, hasPermissionAtHotel } from '../modules/auth/permissions';

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
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthContext();
  const { selectedHotel } = useHotelStore();
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [channelActionsOpen, setChannelActionsOpen] = useState(false);
  const [channelMembersOpen, setChannelMembersOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const canUseDirectMessages = hasHotelPermission(user, 'perm_chat_direct');

  const channelsQuery = useConversationChannels();
  const peopleQuery = useConversationPeople(user?.orgId, selectedHotel?.hotelCode ?? user?.hotelCode, user?.id, canUseDirectMessages);
  const groupName = selected?.kind === 'channel' ? selected.id : '';
  const channelDetailsQuery = useChannelDetails(groupName);
  const channelDetails = channelDetailsQuery.data;
  const personId = selected?.kind === 'person' ? selected.id : '';
  const channelMessages = useMessages(groupName, 50);
  const directMessages = useDirectMessages(personId, 50);
  const realtime = useRealtimeChannel({ userId: user?.id, token: accessToken, channelName: groupName, allowDirectMessages: canUseDirectMessages });
  const baseMessages = useMemo(
    () => selected?.kind === 'person' ? directMessages.data ?? [] : channelMessages.data ?? [],
    [channelMessages.data, directMessages.data, selected?.kind],
  );
  const messagesLoading = selected?.kind === 'person' ? directMessages.isLoading : channelMessages.isLoading;
  const messagesError = selected?.kind === 'person' ? directMessages.isError : channelMessages.isError;
  const isTeamChannel = selected?.kind === 'channel' && !selected.id.endsWith('-nodrafts-ai');
  const canManageChannel = !!channelDetails
    && !!user?.id
    && channelDetails.admins.includes(user.id)
    && hasPermissionAtHotel(user, channelDetails.hotelCode, 'perm_chat_channel_manage');
  const canCreateChannel = !!(selectedHotel?.hotelCode ?? user?.hotelCode)
    && hasPermissionAtHotel(user, selectedHotel?.hotelCode ?? user?.hotelCode, 'perm_chat_channel_create');
  const channelIsArchived = selected?.kind === 'channel' && !!channelDetails?.isArchived;

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
    if (!text || !selected || channelIsArchived) return;
    const id = createMessageId();
    setLocalMessages((current) => [...current, { id, groupName: selected.id, senderEmail: user?.email, senderName: user?.name, text, createdAt: new Date().toISOString() }]);
    setDraft('');
    if (selected.kind === 'person') realtimeChatClient.sendTextToUser({ targetUserId: selected.id, text, messageId: id });
    else realtime.sendText(text, id);
  };

  if (!selected) {
    return (
      <Screen safeAreaColor={colors.primary}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, backgroundColor: colors.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><BrandLogo width={36} height={24} /><Text style={{ color: colors.primaryForeground, fontSize: 20, fontWeight: '800' }}>noDrafts</Text></View>
          <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: colors.primaryForeground, fontSize: 28, fontWeight: '800' }}>{t('chat.title')}</Text>{canCreateChannel ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create channel" onPress={() => setCreateChannelOpen(true)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryForeground, fontSize: 30 }}>＋</Text></TouchableOpacity> : null}</View>
          <TextInput value={search} onChangeText={setSearch} placeholder={t('chat.search')} placeholderTextColor="#8b7a8b" style={{ marginTop: 14, height: 46, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 14, color: colors.foreground }} />
        </View>
        <FlatList
          data={[{ type: 'heading', id: 'channels' }, ...(channels.length ? channels.map((value) => ({ type: 'channel', id: value.channelName, value })) : [{ type: 'empty', id: 'channels-empty' }]), ...(canUseDirectMessages ? [{ type: 'heading', id: 'people' }, ...(people.length ? people.map((value) => ({ type: 'person', id: value.userId, value })) : [{ type: 'empty', id: 'people-empty' }])] : [])] as any[]}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => {
            if (item.type === 'heading') return <Text style={{ marginTop: item.id === 'people' ? 22 : 4, marginBottom: 8, fontSize: 12, fontWeight: '800', color: colors.mutedForeground, textTransform: 'uppercase' }}>{t(item.id === 'people' ? 'chat.directMessages' : 'chat.channels')}</Text>;
            if (item.type === 'empty') {
              const query = item.id === 'people-empty' ? peopleQuery : channelsQuery;
              if (query.isLoading) return <View style={{ minHeight: 52, alignItems: 'flex-start', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
              if (query.isError) return <View style={{ paddingVertical: 10 }}><Text style={{ color: colors.destructive, fontSize: 13 }}>{t(item.id === 'people-empty' ? 'chat.peopleLoadFailed' : 'chat.channelsLoadFailed')}</Text><TouchableOpacity onPress={() => query.refetch()} style={{ alignSelf: 'flex-start', minHeight: 40, marginTop: 8, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '800' }}>{t('common.retry')}</Text></TouchableOpacity></View>;
              return <Text style={{ paddingVertical: 12, color: colors.mutedForeground, fontSize: 13 }}>{t(item.id === 'people-empty' ? 'chat.noPeople' : 'chat.noChannels')}</Text>;
            }
            const title = item.type === 'person' ? item.value.name : item.value.displayName ?? item.value.channelName;
            const description = item.type === 'person' ? item.value.email : item.value.description ?? t('chat.channelDescription');
            return <TouchableOpacity onPress={() => setSelected({ kind: item.type, id: item.id, title, description })} style={{ minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}><View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.selected }}><Text style={{ color: colors.primary, fontWeight: '800' }}>{item.type === 'channel' ? '#' : initials(title)}</Text></View><View style={{ flex: 1, marginLeft: 12 }}><Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: colors.foreground }}>{title}</Text><Text numberOfLines={1} style={{ marginTop: 3, fontSize: 12, color: colors.mutedForeground }}>{description}</Text></View><Text style={{ color: colors.mutedForeground, fontSize: 22 }}>›</Text></TouchableOpacity>;
          }}
        />
        {canCreateChannel && (selectedHotel?.hotelCode ?? user?.hotelCode) ? <CreateChannelModal visible={createChannelOpen} hotelCode={(selectedHotel?.hotelCode ?? user?.hotelCode)!} onClose={() => setCreateChannelOpen(false)} onCreated={(channel) => { setCreateChannelOpen(false); setSelected({ kind: 'channel', id: channel.channelName, title: channel.channelName, description: channel.description }); }} /> : null}
      </Screen>
    );
  }

  return (
    <Screen safeAreaColor={colors.primary}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
        <View style={{ minHeight: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary }}>
          <TouchableOpacity onPress={() => setSelected(null)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryForeground, fontSize: 30 }}>‹</Text></TouchableOpacity>
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.primaryForeground, fontSize: 17, fontWeight: '800' }}>{selected.kind === 'channel' ? `# ${selected.title}` : selected.title}</Text><Text style={{ marginTop: 2, color: '#e4d8e4', fontSize: 11 }}>{channelIsArchived ? 'Archived channel' : realtime.status === 'connected' ? t('chat.connected') : t('chat.reconnecting')}</Text></View>
          {isTeamChannel ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Channel options" disabled={!channelDetails} onPress={() => setChannelActionsOpen(true)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: channelDetails ? 1 : 0.45 }}><Text style={{ color: colors.primaryForeground, fontSize: 28 }}>⋮</Text></TouchableOpacity> : null}
        </View>
        {messagesLoading ? <ActivityIndicator style={{ flex: 1 }} color={colors.primary} /> : messagesError ? <Text style={{ padding: 20, color: colors.destructive }}>{t('chat.loadFailed')}</Text> : (
          <FlatList data={combinedMessages} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 16, paddingBottom: 18 }} ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.mutedForeground }}>{t('chat.noMessages')}</Text>} renderItem={({ item }) => {
            const mine = (!!item.senderEmail && !!user?.email && item.senderEmail.toLowerCase() === user.email.toLowerCase()) || item.senderName === user?.id;
            const parsed = parseIncident(item.text);
            return <TouchableOpacity disabled={!parsed} onPress={() => parsed && setIncident(parsed)} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '84%', marginBottom: 12, borderRadius: 16, borderBottomRightRadius: mine ? 5 : 16, borderBottomLeftRadius: mine ? 16 : 5, backgroundColor: mine ? colors.primary : colors.card, borderWidth: mine ? 0 : 1, borderColor: parsed ? colors.warning : colors.border, paddingHorizontal: 13, paddingVertical: 10 }}>{!mine && <Text style={{ marginBottom: 4, fontSize: 11, fontWeight: '800', color: colors.primary }}>{item.senderName ?? item.senderEmail ?? t('chat.unknown')}</Text>}<Text style={{ color: mine ? colors.primaryForeground : colors.foreground, fontSize: 14, lineHeight: 19 }}>{item.text}</Text>{item.createdAt ? <Text style={{ marginTop: 5, alignSelf: 'flex-end', fontSize: 10, color: mine ? '#dfd2df' : colors.mutedForeground }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text> : null}</TouchableOpacity>;
          }} />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}><TextInput value={draft} onChangeText={setDraft} editable={!channelIsArchived} multiline placeholder={channelIsArchived ? 'This channel is archived' : t('chat.typeMessage')} placeholderTextColor={colors.mutedForeground} style={{ flex: 1, maxHeight: 100, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 11, color: colors.foreground, backgroundColor: channelIsArchived ? colors.muted : colors.card }} /><TouchableOpacity disabled={!draft.trim() || channelIsArchived} onPress={send} style={{ minWidth: 62, height: 44, marginLeft: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: draft.trim() && !channelIsArchived ? 1 : 0.45 }}><Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '800' }}>{t('chat.send')}</Text></TouchableOpacity></View>
      </KeyboardAvoidingView>
      {channelDetails ? <ChannelActionsModal visible={channelActionsOpen} channel={channelDetails} canManage={canManageChannel} isCreator={channelDetails.createdBy === user?.id} onClose={() => setChannelActionsOpen(false)} onViewMembers={() => { setChannelActionsOpen(false); setChannelMembersOpen(true); }} onUpdated={(channel: ChannelDetails) => queryClient.setQueryData(['chat', 'channel-details', channel.channelName], channel)} onLeft={() => { setSelected(null); queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] }); }} /> : null}
      {channelDetails ? <ChannelMembersModal visible={channelMembersOpen} channel={channelDetails} orgId={user?.orgId} currentUserId={user?.id} canManage={canManageChannel} onClose={() => setChannelMembersOpen(false)} onUpdated={(channel: ChannelDetails) => queryClient.setQueryData(['chat', 'channel-details', channel.channelName], channel)} /> : null}
      <Modal visible={!!incident} transparent animationType="fade" onRequestClose={() => setIncident(null)}><Pressable onPress={() => setIncident(null)} style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.45)' }}>{incident ? <View onStartShouldSetResponder={() => true} style={{ borderRadius: radii.lg, backgroundColor: colors.card, padding: 18 }}><Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{t('chat.incident', { id: incident.incidentId })}</Text>{([['room', incident.roomNumber], ['item', incident.item], ['issue', incident.issue], ['category', incident.category], ['severity', incident.severity]] as const).map(([label, value]) => value ? <Text key={label} style={{ marginTop: 8, color: colors.foreground }}><Text style={{ fontWeight: '800' }}>{t(`chat.${label}`)}: </Text>{value}</Text> : null)}<Text style={{ marginTop: 14, color: colors.mutedForeground, fontSize: 12 }}>{t('chat.incidentHelp')}</Text><TouchableOpacity onPress={() => setIncident(null)} style={{ marginTop: 18, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryForeground, fontWeight: '800' }}>{t('chat.close')}</Text></TouchableOpacity></View> : null}</Pressable></Modal>
    </Screen>
  );
}
