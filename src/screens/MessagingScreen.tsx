import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Screen } from '../components/layout/Screen';
import { colors, radii } from '../lib/theme';
import { useAuthContext } from '../modules/auth/AuthProvider';
import { createMessageId } from '../modules/chat/avro';
import { realtimeChatClient } from '../modules/chat/realtimeClient';
import {
  useConversationChannels,
  useConversationPeople,
  type ConversationChannel,
  type ConversationPerson,
} from '../modules/chat/useConversations';
import {
  useDirectMessages,
  useMessages,
  type ChatMessage,
} from '../modules/chat/useMessages';
import { useRealtimeChannel } from '../modules/chat/useRealtimeChannel';
import { markMessagesRead } from '../modules/chat/useUnreadCount';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { hasHotelPermission } from '../modules/auth/permissions';
import {
  addChannelMember,
  demoteChannelAdmin,
  leaveChannel,
  promoteChannelAdmin,
  removeChannelMember,
  transferChannelOwner,
  updateChannel,
  type ChannelDetails,
} from '../modules/chat/channelApi';

type Conversation =
  | {
      kind: 'channel';
      id: string;
      title: string;
      description?: string | null;
      channel: ConversationChannel;
    }
  | { kind: 'person'; id: string; title: string; description?: string | null };

type Incident = {
  incidentId: string;
  roomNumber: string | null;
  item: string | null;
  issue: string | null;
  category: string | null;
  severity: string | null;
};

function parseIncident(text: string): Incident | null {
  const match = text.match(
    /\[INCIDENT:([^\]]+)\]\s+Room\s+(\S+)\s+\|\s+([^:]+):\s+([^|]+)\s+\|(?:\s+Category:\s+([^|]+)\s+\|)?\s+Severity:\s+(.+)/i,
  );
  if (!match) return null;
  return {
    incidentId: match[1].trim(),
    roomNumber: match[2].trim(),
    item: match[3].trim(),
    issue: match[4].trim(),
    category: match[5]?.trim() ?? null,
    severity: match[6].trim(),
  };
}

function initials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || '#'
  );
}

export function MessagingScreen() {
  const { t } = useTranslation();
  const { user, accessToken } = useAuthContext();
  const { selectedHotel } = useHotelStore();
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [channelMenu, setChannelMenu] = useState(false);
  const [channelDetails, setChannelDetails] = useState<ChannelDetails | null>(
    null,
  );
  const [channelEditor, setChannelEditor] = useState(false);
  const [memberManager, setMemberManager] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrivate, setEditPrivate] = useState(false);
  const [channelBusy, setChannelBusy] = useState(false);
  const canUseDirectMessages = hasHotelPermission(user, 'perm_chat_direct');
  const canManageChannels = hasHotelPermission(
    user,
    'perm_chat_channel_manage',
  );

  const channelsQuery = useConversationChannels();
  const peopleQuery = useConversationPeople(
    user?.orgId,
    selectedHotel?.hotelCode ?? user?.hotelCode,
    user?.id,
    canUseDirectMessages || canManageChannels,
  );
  const groupName = selected?.kind === 'channel' ? selected.id : '';
  const personId = selected?.kind === 'person' ? selected.id : '';
  const channelMessages = useMessages(groupName, 50);
  const directMessages = useDirectMessages(personId, 50);
  const realtime = useRealtimeChannel({
    userId: user?.id,
    token: accessToken,
    channelName: groupName,
    allowDirectMessages: canUseDirectMessages,
  });
  const baseMessages =
    selected?.kind === 'person'
      ? directMessages.data ?? []
      : channelMessages.data ?? [];
  const messagesLoading =
    selected?.kind === 'person'
      ? directMessages.isLoading
      : channelMessages.isLoading;
  const messagesError =
    selected?.kind === 'person'
      ? directMessages.isError
      : channelMessages.isError;

  const combinedMessages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    [...baseMessages, ...localMessages].forEach(
      message => message?.id && byId.set(message.id, message),
    );
    return Array.from(byId.values()).sort(
      (a, b) =>
        new Date(a.createdAt ?? 0).getTime() -
        new Date(b.createdAt ?? 0).getTime(),
    );
  }, [baseMessages, localMessages]);

  useEffect(() => {
    markMessagesRead();
  }, []);
  useEffect(() => {
    setLocalMessages([]);
  }, [selected?.kind, selected?.id]);
  useEffect(() => {
    realtimeChatClient.setActiveChannel(
      selected?.kind === 'channel' ? selected.id : null,
    );
    return () => realtimeChatClient.setActiveChannel(null);
  }, [selected]);
  useEffect(() => {
    if (selected?.kind !== 'channel') {
      setChannelDetails(null);
      return;
    }
    setChannelDetails(selected.channel as ChannelDetails);
  }, [selected]);
  useEffect(
    () =>
      realtimeChatClient.onEvent(event => {
        if (event.kind !== 'text' || !selected) return;
        if (selected.kind === 'channel' && event.groupName !== selected.id)
          return;
        if (selected.kind === 'person' && event.groupName) return;
        if (selected.kind === 'person' && event.userId !== selected.id) return;
        setLocalMessages(current => [
          ...current,
          {
            id: event.messageId,
            groupName: event.groupName || selected.id,
            senderName: event.userId,
            text: event.text,
            createdAt: event.createdAt
              ? new Date(event.createdAt).toISOString()
              : null,
          },
        ]);
      }),
    [selected],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const channels = (channelsQuery.data ?? []).filter(
    (channel: ConversationChannel) =>
      (channel.displayName ?? channel.channelName)
        .toLowerCase()
        .includes(normalizedSearch),
  );
  const people = (peopleQuery.data ?? []).filter((person: ConversationPerson) =>
    `${person.name} ${person.email}`.toLowerCase().includes(normalizedSearch),
  );
  const canManageSelected = Boolean(
    selected?.kind === 'channel' &&
      canManageChannels &&
      user?.id &&
      (channelDetails?.admins?.includes(user.id) ||
        channelDetails?.createdBy === user.id),
  );

  const applyChannel = (updated: ChannelDetails) => {
    setChannelDetails(updated);
    if (selected?.kind === 'channel') {
      setSelected({
        ...selected,
        title: updated.displayName || updated.channelName,
        description: updated.description,
        channel: updated,
      });
    }
    void channelsQuery.refetch();
  };

  const runChannelAction = async (
    action: () => Promise<ChannelDetails>,
    success: string,
  ) => {
    setChannelBusy(true);
    try {
      applyChannel(await action());
      Alert.alert(success);
    } catch (error: any) {
      Alert.alert(
        'Could not update channel',
        error?.response?.data || error?.message || 'Please try again.',
      );
    } finally {
      setChannelBusy(false);
    }
  };

  const confirmLeaveChannel = () => {
    if (selected?.kind !== 'channel') return;
    setChannelMenu(false);
    Alert.alert('Leave channel?', 'You will need an admin to add you again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveChannel(selected.id);
          setSelected(null);
          void channelsQuery.refetch();
        },
      },
    ]);
  };

  const saveChannel = async () => {
    if (selected?.kind !== 'channel') return;
    await runChannelAction(
      () =>
        updateChannel(selected.id, {
          displayName: editName.trim(),
          description: editDescription.trim(),
          isPrivate: editPrivate,
        }),
      'Channel updated',
    );
    setChannelEditor(false);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !selected) return;
    const id = createMessageId();
    setLocalMessages(current => [
      ...current,
      {
        id,
        groupName: selected.id,
        senderEmail: user?.email,
        senderName: user?.name,
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft('');
    if (selected.kind === 'person')
      realtimeChatClient.sendTextToUser({
        targetUserId: selected.id,
        text,
        messageId: id,
      });
    else realtime.sendText(text, id);
  };

  if (!selected) {
    return (
      <Screen safeAreaColor={colors.primary}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 18,
            backgroundColor: colors.primary,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BrandLogo width={36} height={24} />
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: 20,
                fontWeight: '800',
              }}
            >
              noDrafts
            </Text>
          </View>
          <Text
            style={{
              marginTop: 18,
              color: colors.primaryForeground,
              fontSize: 28,
              fontWeight: '800',
            }}
          >
            {t('chat.title')}
          </Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('chat.search')}
            placeholderTextColor="#8b7a8b"
            style={{
              marginTop: 14,
              height: 46,
              borderRadius: 12,
              backgroundColor: colors.card,
              paddingHorizontal: 14,
              color: colors.foreground,
            }}
          />
        </View>
        <FlatList
          data={
            [
              { type: 'heading', id: 'channels' },
              ...(channels.length
                ? channels.map(value => ({
                    type: 'channel',
                    id: value.channelName,
                    value,
                  }))
                : [{ type: 'empty', id: 'channels-empty' }]),
              ...(canUseDirectMessages
                ? [
                    { type: 'heading', id: 'people' },
                    ...(people.length
                      ? people.map(value => ({
                          type: 'person',
                          id: value.userId,
                          value,
                        }))
                      : [{ type: 'empty', id: 'people-empty' }]),
                  ]
                : []),
            ] as any[]
          }
          keyExtractor={item => `${item.type}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => {
            if (item.type === 'heading')
              return (
                <Text
                  style={{
                    marginTop: item.id === 'people' ? 22 : 4,
                    marginBottom: 8,
                    fontSize: 12,
                    fontWeight: '800',
                    color: colors.mutedForeground,
                    textTransform: 'uppercase',
                  }}
                >
                  {t(
                    item.id === 'people'
                      ? 'chat.directMessages'
                      : 'chat.channels',
                  )}
                </Text>
              );
            if (item.type === 'empty') {
              const query =
                item.id === 'people-empty' ? peopleQuery : channelsQuery;
              if (query.isLoading)
                return (
                  <View
                    style={{
                      minHeight: 52,
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator color={colors.primary} />
                  </View>
                );
              if (query.isError)
                return (
                  <View style={{ paddingVertical: 10 }}>
                    <Text style={{ color: colors.destructive, fontSize: 13 }}>
                      {t(
                        item.id === 'people-empty'
                          ? 'chat.peopleLoadFailed'
                          : 'chat.channelsLoadFailed',
                      )}
                    </Text>
                    <TouchableOpacity
                      onPress={() => query.refetch()}
                      style={{
                        alignSelf: 'flex-start',
                        minHeight: 40,
                        marginTop: 8,
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{ color: colors.primary, fontWeight: '800' }}
                      >
                        {t('common.retry')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              return (
                <Text
                  style={{
                    paddingVertical: 12,
                    color: colors.mutedForeground,
                    fontSize: 13,
                  }}
                >
                  {t(
                    item.id === 'people-empty'
                      ? 'chat.noPeople'
                      : 'chat.noChannels',
                  )}
                </Text>
              );
            }
            const title =
              item.type === 'person'
                ? item.value.name
                : item.value.displayName ?? item.value.channelName;
            const description =
              item.type === 'person'
                ? item.value.email
                : item.value.description ?? t('chat.channelDescription');
            return (
              <TouchableOpacity
                onPress={() =>
                  setSelected(
                    item.type === 'channel'
                      ? {
                          kind: 'channel',
                          id: item.id,
                          title,
                          description,
                          channel: item.value,
                        }
                      : { kind: 'person', id: item.id, title, description },
                  )
                }
                style={{
                  minHeight: 66,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.selected,
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>
                    {item.type === 'channel' ? '#' : initials(title)}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: colors.foreground,
                    }}
                  >
                    {title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 3,
                      fontSize: 12,
                      color: colors.mutedForeground,
                    }}
                  >
                    {item.value.isArchived ? 'Archived channel' : description}
                  </Text>
                </View>
                <Text style={{ color: colors.mutedForeground, fontSize: 22 }}>
                  ›
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen safeAreaColor={colors.primary}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
      >
        <View
          style={{
            minHeight: 68,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <TouchableOpacity
            onPress={() => setSelected(null)}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: 30 }}>
              ‹
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.primaryForeground,
                fontSize: 17,
                fontWeight: '800',
              }}
            >
              {selected.kind === 'channel'
                ? `# ${selected.title}`
                : selected.title}
            </Text>
            <Text style={{ marginTop: 2, color: '#e4d8e4', fontSize: 11 }}>
              {realtime.status === 'connected'
                ? t('chat.connected')
                : t('chat.reconnecting')}
            </Text>
          </View>
          {selected.kind === 'channel' && (
            <TouchableOpacity
              onPress={() => setChannelMenu(true)}
              accessibilityLabel="Channel options"
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: 28 }}>
                ⋮
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {messagesLoading ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
        ) : messagesError ? (
          <Text style={{ padding: 20, color: colors.destructive }}>
            {t('chat.loadFailed')}
          </Text>
        ) : (
          <FlatList
            data={combinedMessages}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 18 }}
            ListEmptyComponent={
              <Text
                style={{ textAlign: 'center', color: colors.mutedForeground }}
              >
                {t('chat.noMessages')}
              </Text>
            }
            renderItem={({ item }) => {
              const mine =
                (!!item.senderEmail &&
                  !!user?.email &&
                  item.senderEmail.toLowerCase() ===
                    user.email.toLowerCase()) ||
                item.senderName === user?.id;
              const parsed = parseIncident(item.text);
              return (
                <TouchableOpacity
                  disabled={!parsed}
                  onPress={() => parsed && setIncident(parsed)}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '84%',
                    marginBottom: 12,
                    borderRadius: 16,
                    borderBottomRightRadius: mine ? 5 : 16,
                    borderBottomLeftRadius: mine ? 16 : 5,
                    backgroundColor: mine ? colors.primary : colors.card,
                    borderWidth: mine ? 0 : 1,
                    borderColor: parsed ? colors.warning : colors.border,
                    paddingHorizontal: 13,
                    paddingVertical: 10,
                  }}
                >
                  {!mine && (
                    <Text
                      style={{
                        marginBottom: 4,
                        fontSize: 11,
                        fontWeight: '800',
                        color: colors.primary,
                      }}
                    >
                      {item.senderName ?? item.senderEmail ?? t('chat.unknown')}
                    </Text>
                  )}
                  <Text
                    style={{
                      color: mine
                        ? colors.primaryForeground
                        : colors.foreground,
                      fontSize: 14,
                      lineHeight: 19,
                    }}
                  >
                    {item.text}
                  </Text>
                  {item.createdAt ? (
                    <Text
                      style={{
                        marginTop: 5,
                        alignSelf: 'flex-end',
                        fontSize: 10,
                        color: mine ? '#dfd2df' : colors.mutedForeground,
                      }}
                    >
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        )}
        {!channelDetails?.isArchived && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder={t('chat.typeMessage')}
              placeholderTextColor={colors.mutedForeground}
              style={{
                flex: 1,
                maxHeight: 100,
                minHeight: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 13,
                paddingVertical: 11,
                color: colors.foreground,
              }}
            />
            <TouchableOpacity
              disabled={!draft.trim()}
              onPress={send}
              style={{
                minWidth: 62,
                height: 44,
                marginLeft: 8,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary,
                opacity: draft.trim() ? 1 : 0.45,
              }}
            >
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontSize: 13,
                  fontWeight: '800',
                }}
              >
                {t('chat.send')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
      <Modal
        visible={!!incident}
        transparent
        animationType="fade"
        onRequestClose={() => setIncident(null)}
      >
        <Pressable
          onPress={() => setIncident(null)}
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 24,
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
        >
          {incident ? (
            <View
              onStartShouldSetResponder={() => true}
              style={{
                borderRadius: radii.lg,
                backgroundColor: colors.card,
                padding: 18,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.foreground,
                }}
              >
                {t('chat.incident', { id: incident.incidentId })}
              </Text>
              {(
                [
                  ['room', incident.roomNumber],
                  ['item', incident.item],
                  ['issue', incident.issue],
                  ['category', incident.category],
                  ['severity', incident.severity],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <Text
                    key={label}
                    style={{ marginTop: 8, color: colors.foreground }}
                  >
                    <Text style={{ fontWeight: '800' }}>
                      {t(`chat.${label}`)}:{' '}
                    </Text>
                    {value}
                  </Text>
                ) : null,
              )}
              <Text
                style={{
                  marginTop: 14,
                  color: colors.mutedForeground,
                  fontSize: 12,
                }}
              >
                {t('chat.incidentHelp')}
              </Text>
              <TouchableOpacity
                onPress={() => setIncident(null)}
                style={{
                  marginTop: 18,
                  minHeight: 44,
                  borderRadius: radii.md,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ color: colors.primaryForeground, fontWeight: '800' }}
                >
                  {t('chat.close')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Pressable>
      </Modal>
      <Modal
        visible={channelMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setChannelMenu(false)}
      >
        <Pressable
          onPress={() => setChannelMenu(false)}
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{
              backgroundColor: colors.card,
              padding: 20,
              paddingBottom: 34,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.foreground,
              }}
            >
              {selected.title}
            </Text>
            <MenuAction
              label="Channel members"
              onPress={() => {
                setChannelMenu(false);
                setMemberManager(true);
              }}
            />
            {canManageSelected && (
              <MenuAction
                label="Edit channel"
                onPress={() => {
                  setEditName(
                    channelDetails?.displayName ||
                      channelDetails?.channelName ||
                      '',
                  );
                  setEditDescription(channelDetails?.description || '');
                  setEditPrivate(Boolean(channelDetails?.isPrivate));
                  setChannelMenu(false);
                  setChannelEditor(true);
                }}
              />
            )}
            {canManageSelected && (
              <MenuAction
                label={
                  channelDetails?.isArchived
                    ? 'Restore channel'
                    : 'Archive channel'
                }
                onPress={() => {
                  setChannelMenu(false);
                  void runChannelAction(
                    () =>
                      updateChannel(selected.id, {
                        isArchived: !channelDetails?.isArchived,
                      }),
                    channelDetails?.isArchived
                      ? 'Channel restored'
                      : 'Channel archived',
                  );
                }}
              />
            )}
            {channelDetails?.createdBy !== user?.id && (
              <MenuAction
                label="Leave channel"
                destructive
                onPress={confirmLeaveChannel}
              />
            )}
          </View>
        </Pressable>
      </Modal>
      <Modal
        visible={channelEditor}
        transparent
        animationType="slide"
        onRequestClose={() => setChannelEditor(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 20,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <View
            style={{
              borderRadius: 16,
              backgroundColor: colors.card,
              padding: 18,
            }}
          >
            <Text
              style={{
                fontSize: 19,
                fontWeight: '800',
                color: colors.foreground,
              }}
            >
              Edit channel
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Channel name"
              style={{
                marginTop: 16,
                minHeight: 46,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                color: colors.foreground,
              }}
            />
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              style={{
                marginTop: 12,
                minHeight: 46,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                color: colors.foreground,
              }}
            />
            <View
              style={{
                marginTop: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: colors.foreground }}>Private channel</Text>
              <Switch value={editPrivate} onValueChange={setEditPrivate} />
            </View>
            <View
              style={{
                marginTop: 18,
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setChannelEditor(false)}
                style={{ padding: 12 }}
              >
                <Text
                  style={{ fontWeight: '700', color: colors.mutedForeground }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={channelBusy || !editName.trim()}
                onPress={() => void saveChannel()}
                style={{
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                  padding: 12,
                }}
              >
                <Text
                  style={{ fontWeight: '800', color: colors.primaryForeground }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={memberManager}
        animationType="slide"
        onRequestClose={() => setMemberManager(false)}
      >
        <Screen>
          <View
            style={{
              minHeight: 64,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              backgroundColor: colors.primary,
            }}
          >
            <TouchableOpacity
              onPress={() => setMemberManager(false)}
              style={{ padding: 12 }}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: 28 }}>
                ‹
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: 18,
                fontWeight: '800',
              }}
            >
              Channel members
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {(channelDetails?.members ?? []).map(memberId => {
              const person = peopleQuery.data?.find(
                item => item.userId === memberId,
              );
              const isAdmin = channelDetails?.admins?.includes(memberId);
              const isOwner = channelDetails?.createdBy === memberId;
              return (
                <View
                  key={memberId}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                    {person?.name || memberId}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      color: colors.mutedForeground,
                      fontSize: 12,
                    }}
                  >
                    {isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Member'}
                  </Text>
                  {canManageSelected && memberId !== user?.id && (
                    <View
                      style={{
                        marginTop: 8,
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      {!isAdmin && (
                        <SmallAction
                          label="Make admin"
                          onPress={() =>
                            void runChannelAction(
                              () => promoteChannelAdmin(selected.id, memberId),
                              'Admin added',
                            )
                          }
                        />
                      )}
                      {isAdmin && !isOwner && (
                        <SmallAction
                          label="Remove admin"
                          onPress={() =>
                            void runChannelAction(
                              () => demoteChannelAdmin(selected.id, memberId),
                              'Admin removed',
                            )
                          }
                        />
                      )}
                      {channelDetails?.createdBy === user?.id && (
                        <SmallAction
                          label="Make owner"
                          onPress={() =>
                            void runChannelAction(
                              () => transferChannelOwner(selected.id, memberId),
                              'Ownership transferred',
                            )
                          }
                        />
                      )}
                      <SmallAction
                        label="Remove"
                        destructive
                        onPress={() =>
                          void runChannelAction(
                            () => removeChannelMember(selected.id, memberId),
                            'Member removed',
                          )
                        }
                      />
                    </View>
                  )}
                </View>
              );
            })}
            {canManageSelected && (
              <>
                <Text
                  style={{
                    marginTop: 24,
                    marginBottom: 8,
                    color: colors.foreground,
                    fontSize: 16,
                    fontWeight: '800',
                  }}
                >
                  Add people
                </Text>
                {people
                  .filter(
                    person =>
                      !(channelDetails?.members ?? []).includes(person.userId),
                  )
                  .map(person => (
                    <View
                      key={person.userId}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontWeight: '700',
                          }}
                        >
                          {person.name}
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 12,
                          }}
                        >
                          {person.email}
                        </Text>
                      </View>
                      <SmallAction
                        label="Add"
                        onPress={() =>
                          void runChannelAction(
                            () => addChannelMember(selected.id, person.userId),
                            'Member added',
                          )
                        }
                      />
                    </View>
                  ))}
              </>
            )}
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

function MenuAction({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        minHeight: 50,
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          color: destructive ? colors.destructive : colors.foreground,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SmallAction({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: destructive ? colors.destructive : colors.border,
        paddingHorizontal: 10,
        paddingVertical: 7,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: destructive ? colors.destructive : colors.foreground,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
