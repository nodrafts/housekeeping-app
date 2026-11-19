import { chatApi } from '../../lib/chatApi';

export type ChannelDetails = {
  channelName: string;
  displayName?: string | null;
  description?: string | null;
  hotelCode?: string | null;
  isPrivate?: boolean;
  isArchived?: boolean;
  createdBy?: string | null;
  members?: string[];
  admins?: string[];
};

export async function getChannel(channelName: string) {
  return (
    await chatApi.get<ChannelDetails>(
      `/channels/${encodeURIComponent(channelName)}`,
    )
  ).data;
}

export async function updateChannel(
  channelName: string,
  update: Partial<ChannelDetails>,
) {
  return (
    await chatApi.patch<ChannelDetails>(
      `/channels/${encodeURIComponent(channelName)}`,
      update,
    )
  ).data;
}

export async function addChannelMember(channelName: string, userId: string) {
  return (
    await chatApi.post<ChannelDetails>(
      `/channels/${encodeURIComponent(channelName)}/members`,
      { userId },
    )
  ).data;
}

export async function removeChannelMember(channelName: string, userId: string) {
  return (
    await chatApi.delete<ChannelDetails>(
      `/channels/${encodeURIComponent(
        channelName,
      )}/members/${encodeURIComponent(userId)}`,
    )
  ).data;
}

export async function promoteChannelAdmin(channelName: string, userId: string) {
  return (
    await chatApi.post<ChannelDetails>(
      `/channels/${encodeURIComponent(channelName)}/admins`,
      { userId },
    )
  ).data;
}

export async function demoteChannelAdmin(channelName: string, userId: string) {
  return (
    await chatApi.delete<ChannelDetails>(
      `/channels/${encodeURIComponent(channelName)}/admins/${encodeURIComponent(
        userId,
      )}`,
    )
  ).data;
}

export async function transferChannelOwner(
  channelName: string,
  userId: string,
) {
  return (
    await chatApi.post<ChannelDetails>(
      `/channels/${encodeURIComponent(channelName)}/owner`,
      { userId },
    )
  ).data;
}

export async function leaveChannel(channelName: string) {
  return (
    await chatApi.delete<ChannelDetails>(
      `/channels/${encodeURIComponent(channelName)}/leave`,
    )
  ).data;
}
