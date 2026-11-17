import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, radii } from '../../lib/theme';
import {
  addChannelMember,
  archiveChannel,
  createChannel,
  leaveChannel,
  promoteChannelAdmin,
  removeChannelMember,
  useChannelEmployees,
  type ChannelDetails,
} from '../../modules/chat/channelManagement';

type CommonProps = {
  visible: boolean;
  onClose: () => void;
};

function errorMessage(error: unknown, fallback: string) {
  const candidate = error as any;
  return candidate?.response?.data?.message
    ?? (typeof candidate?.response?.data === 'string' ? candidate.response.data : null)
    ?? candidate?.message
    ?? fallback;
}

function ModalShell({ visible, onClose, title, children }: CommonProps & { title: string; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable onPress={() => undefined} style={{ maxHeight: '88%', borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: colors.card }}>
          <View style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: colors.foreground }}>{title}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24, color: colors.mutedForeground }}>×</Text>
            </TouchableOpacity>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionRow({ label, detail, destructive, disabled, onPress }: { label: string; detail?: string; destructive?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={{ minHeight: 62, justifyContent: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: disabled ? 0.45 : 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: destructive ? colors.destructive : colors.foreground }}>{label}</Text>
      {detail ? <Text style={{ marginTop: 3, fontSize: 12, color: colors.mutedForeground }}>{detail}</Text> : null}
    </TouchableOpacity>
  );
}

export function ChannelActionsModal({
  visible,
  channel,
  canManage,
  isCreator,
  onClose,
  onViewMembers,
  onUpdated,
  onLeft,
}: CommonProps & {
  channel: ChannelDetails;
  canManage: boolean;
  isCreator: boolean;
  onViewMembers: () => void;
  onUpdated: (channel: ChannelDetails) => void;
  onLeft: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const confirmArchive = () => Alert.alert(
    'Archive channel?',
    'Members can still read the history, but nobody can send new messages.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            onUpdated(await archiveChannel(channel.channelName));
            onClose();
          } catch (error) {
            Alert.alert('Could not archive channel', errorMessage(error, 'Please try again.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ],
  );

  const confirmLeave = () => Alert.alert(
    'Leave channel?',
    'You will no longer see this channel unless an admin adds you again.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await leaveChannel(channel.channelName);
            onClose();
            onLeft();
          } catch (error) {
            Alert.alert('Could not leave channel', errorMessage(error, 'Please try again.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ],
  );

  return (
    <ModalShell visible={visible} onClose={onClose} title="Channel options">
      <ActionRow label="Members" detail={`${channel.members.length} channel members`} onPress={onViewMembers} />
      {canManage && !channel.isArchived ? <ActionRow label="Archive channel" detail="Make this channel read-only" destructive disabled={busy} onPress={confirmArchive} /> : null}
      {!isCreator ? <ActionRow label="Leave channel" destructive disabled={busy} onPress={confirmLeave} /> : null}
      {busy ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
    </ModalShell>
  );
}

export function ChannelMembersModal({
  visible,
  channel,
  orgId,
  currentUserId,
  canManage,
  onClose,
  onUpdated,
}: CommonProps & {
  channel: ChannelDetails;
  orgId?: string;
  currentUserId?: string;
  canManage: boolean;
  onUpdated: (channel: ChannelDetails) => void;
}) {
  const [search, setSearch] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const employeesQuery = useChannelEmployees(orgId, channel.hotelCode, visible && canManage && !channel.isArchived);
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const byId = useMemo(() => new Map(employees.map((employee) => [employee.userId, employee])), [employees]);
  const memberIds = useMemo(() => new Set(channel.members), [channel.members]);
  const available = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return employees.filter((employee) => !memberIds.has(employee.userId) && (!normalized || `${employee.name} ${employee.email}`.toLowerCase().includes(normalized)));
  }, [employees, memberIds, search]);

  const runMemberAction = async (userId: string, action: () => Promise<ChannelDetails>, failure: string) => {
    setBusyUserId(userId);
    try {
      onUpdated(await action());
    } catch (error) {
      Alert.alert(failure, errorMessage(error, 'Please try again.'));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="Channel members">
      {canManage && !channel.isArchived ? (
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.foreground }}>Add hotel employees</Text>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search employees" placeholderTextColor={colors.mutedForeground} style={{ height: 44, marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12, color: colors.foreground }} />
          {employeesQuery.isLoading ? <ActivityIndicator style={{ padding: 14 }} color={colors.primary} /> : employeesQuery.isError ? <Text style={{ paddingVertical: 12, color: colors.destructive }}>Could not load hotel employees.</Text> : (
            <FlatList
              data={available}
              keyExtractor={(item) => item.userId}
              style={{ maxHeight: 220, marginTop: 8 }}
              ListEmptyComponent={<Text style={{ paddingVertical: 12, color: colors.mutedForeground }}>No employees available to add.</Text>}
              renderItem={({ item }) => (
                <View style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.foreground }}>{item.name}</Text><Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground }}>{item.email}</Text></View>
                  <TouchableOpacity disabled={busyUserId !== null} onPress={() => runMemberAction(item.userId, () => addChannelMember(channel.channelName, item.userId), 'Could not add member')} style={{ minWidth: 54, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                    {busyUserId === item.userId ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: '800' }}>Add</Text>}
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      ) : null}

      <FlatList
        data={channel.members}
        keyExtractor={(item) => item}
        style={{ maxHeight: 350 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item: memberId }) => {
          const employee = byId.get(memberId);
          const isAdmin = channel.admins.includes(memberId);
          const canRemove = canManage && !channel.isArchived && memberId !== currentUserId && memberId !== channel.createdBy;
          return (
            <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.foreground }}>{employee?.name ?? (memberId === currentUserId ? 'You' : memberId)}</Text>{isAdmin ? <Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground }}>Channel admin</Text> : null}</View>
              {canManage && !channel.isArchived && !isAdmin ? <TouchableOpacity disabled={busyUserId !== null} onPress={() => runMemberAction(memberId, () => promoteChannelAdmin(channel.channelName, memberId), 'Could not promote member')} style={{ minHeight: 40, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>Make admin</Text></TouchableOpacity> : null}
              {canRemove ? <TouchableOpacity disabled={busyUserId !== null} onPress={() => runMemberAction(memberId, () => removeChannelMember(channel.channelName, memberId), 'Could not remove member')} style={{ minHeight: 40, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={{ color: colors.destructive, fontSize: 12, fontWeight: '800' }}>Remove</Text></TouchableOpacity> : null}
            </View>
          );
        }}
      />
    </ModalShell>
  );
}

export function CreateChannelModal({ visible, hotelCode, onClose, onCreated }: CommonProps & { hotelCode: string; onCreated: (channel: ChannelDetails) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const channel = await createChannel({ channelName: name.trim(), description: description.trim(), hotelCode, isPrivate });
      await queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
      setName('');
      setDescription('');
      setIsPrivate(true);
      onCreated(channel);
    } catch (error) {
      Alert.alert('Could not create channel', errorMessage(error, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="Create channel">
      <View style={{ padding: 18 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>Channel name</Text>
        <TextInput value={name} onChangeText={setName} autoCapitalize="none" placeholder="housekeeping-team" placeholderTextColor={colors.mutedForeground} style={{ height: 46, marginTop: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12, color: colors.foreground }} />
        <Text style={{ marginTop: 16, fontSize: 13, fontWeight: '700', color: colors.foreground }}>Description</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="What this channel is for" placeholderTextColor={colors.mutedForeground} style={{ minHeight: 72, marginTop: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 12, color: colors.foreground }} multiline />
        <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.foreground }}>Private channel</Text><Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground }}>Only added members can view it.</Text></View><Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: colors.primary }} /></View>
        <TouchableOpacity disabled={busy || !name.trim()} onPress={submit} style={{ height: 46, marginTop: 10, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: busy || !name.trim() ? 0.45 : 1 }}>
          {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: '800' }}>Create channel</Text>}
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
}
