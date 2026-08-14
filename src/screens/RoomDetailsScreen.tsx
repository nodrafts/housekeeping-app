import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Screen } from '../components/layout/Screen';
import { Icon } from '../components/ui/Icon';
import { colors, radii } from '../lib/theme';
import { useAssignment, useUpdateChecklist, useUpdateStatus } from '../modules/housekeeping/useAssignment';
import type { ChecklistItem } from '../modules/housekeeping/types';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { useAuth } from '../modules/auth/useAuth';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';

type Props = NativeStackScreenProps<AppStackParamList, 'RoomDetails'>;

function progressFor(checklist: ChecklistItem[]) {
  const total = checklist.length || 1;
  const handled = checklist.filter((item) => item.done).length;
  return Math.round((handled / total) * 100);
}

function setChecklistStatus(checklist: ChecklistItem[], itemId: string, status: ChecklistItem['status']) {
  return checklist.map((item) => (
    item.id === itemId
      ? { ...item, status, done: status === 'COMPLETED' }
      : item
  ));
}

const CHECKLIST_STATUS_OPTIONS: Array<{ value: ChecklistItem['status']; label: string }> = [
  { value: 'WAITING', label: 'Waiting' },
  { value: 'IN_PROGRESS', label: 'Started' },
  { value: 'COMPLETED', label: 'Done' },
];

export function RoomDetailsScreen({ route, navigation }: Props) {
  const { assignmentId } = route.params;
  const { selectedHotel } = useHotelStore();
  const { user } = useAuth();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const { data, isLoading } = useAssignment(assignmentId, hotelCode);
  const updateStatus = useUpdateStatus();
  const updateChecklist = useUpdateChecklist();
  const [helpOpen, setHelpOpen] = useState(false);
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[] | null>(null);

  useEffect(() => {
    if (data?.checklist) {
      setLocalChecklist(data.checklist);
    }
  }, [data?.id, data?.checklist]);

  const checklist = useMemo(
    () => localChecklist ?? data?.checklist ?? [],
    [localChecklist, data?.checklist],
  );
  const progress = useMemo(() => progressFor(checklist), [checklist]);
  const hasWaitingItems = useMemo(
    () => checklist.some((item) => item.status !== 'COMPLETED'),
    [checklist],
  );
  const isReady = data?.status === 'READY';
  const isCleaning = data?.status === 'CLEANING';
  const canEditChecklist = isCleaning && !isReady;

  const updateItem = (item: ChecklistItem, status: ChecklistItem['status']) => {
    if (!data || !canEditChecklist) return;
    const nextChecklist = setChecklistStatus(localChecklist ?? data.checklist, item.id, status);
    setLocalChecklist(nextChecklist);
    updateChecklist.mutate(
      { hotelCode, assignment: data, checklist: nextChecklist },
      {
        onError: () => {
          setLocalChecklist(data.checklist);
        },
      },
    );
  };

  const startCleaning = () => {
    if (!data) return;
    updateStatus.mutate(
      { hotelCode, assignment: data, status: 'CLEANING', checklist },
      { onSuccess: (assignment) => setLocalChecklist(assignment.checklist) },
    );
  };

  const completeRoom = () => {
    if (!data || !isCleaning) return;
    updateStatus.mutate(
      { hotelCode, assignment: data, status: 'READY', checklist },
      { onSuccess: () => navigation.goBack() },
    );
  };

  if (isLoading || !data) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>
          Room {data.roomNumber}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: colors.mutedForeground }}>
          {data.floor ? `Floor ${data.floor}` : 'Floor not set'}
          {data.type ? ` - ${data.type}` : ''}
        </Text>
        <View style={{ marginTop: 12, height: 6, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.border }}>
          <View style={{ width: `${progress}%`, height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary }} />
        </View>
        <Text style={{ marginTop: 4, fontSize: 11, color: colors.mutedForeground }}>{progress}% complete</Text>
        <View
          style={{
            marginTop: 10,
            alignSelf: 'flex-start',
            borderRadius: radii.pill,
            backgroundColor: isCleaning ? '#dbeafe' : isReady ? '#dcfce7' : colors.muted,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: isCleaning ? colors.primary : isReady ? '#166534' : colors.foreground,
            }}
          >
            {isCleaning ? 'Cleaning' : isReady ? 'Ready' : 'Checkout'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={{ marginBottom: 8, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: colors.mutedForeground }}>
          Checklist
        </Text>

        {checklist.map((item, index) => {
          return (
            <View
              key={`${item.id}-${index}`}
              style={{
                marginBottom: 14,
                borderRadius: radii.md,
                borderWidth: 1.5,
                borderColor: colors.border,
                backgroundColor: colors.card,
                padding: 14,
              }}
            >
              <Text
                style={{
                  marginBottom: 12,
                  fontSize: 15,
                  lineHeight: 21,
                  fontWeight: '800',
                  color: colors.foreground,
                }}
              >
                {item.label}
              </Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CHECKLIST_STATUS_OPTIONS.map((option) => {
                  const selected = item.status === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => updateItem(item, option.value)}
                      disabled={updateChecklist.isPending || !canEditChecklist || selected}
                      style={{
                        flex: 1,
                        minHeight: 42,
                        borderRadius: radii.lg,
                        borderWidth: 1.5,
                        borderColor: selected ? colors.primary : colors.input,
                        backgroundColor: selected ? colors.selected : colors.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: updateChecklist.isPending || !canEditChecklist ? 0.65 : 1,
                        paddingHorizontal: 6,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={{ fontSize: 13, fontWeight: '800', color: selected ? colors.primary : colors.foreground }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {!isCleaning && !isReady ? (
          <TouchableOpacity
            onPress={startCleaning}
            disabled={updateStatus.isPending}
            style={{
              marginTop: 8,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              opacity: updateStatus.isPending ? 0.45 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={17} color={colors.primaryForeground} strokeWidth={2.5} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primaryForeground }}>
                {updateStatus.isPending ? 'Saving...' : 'Move to Cleaning'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : isReady ? (
          <View
            style={{
              marginTop: 8,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.pill,
              backgroundColor: '#dcfce7',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>Room is Ready</Text>
          </View>
        ) : !hasWaitingItems ? (
          <TouchableOpacity
            onPress={completeRoom}
            disabled={updateStatus.isPending}
            style={{
              marginTop: 8,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              opacity: updateStatus.isPending ? 0.45 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={17} color={colors.primaryForeground} strokeWidth={2.5} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primaryForeground }}>
                {updateStatus.isPending ? 'Saving...' : 'Mark room Ready'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={() => setHelpOpen(true)}
          style={{
            marginTop: 12,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.pill,
            borderWidth: 1.5,
            borderColor: colors.input,
            backgroundColor: colors.card,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="alert-circle" size={17} color={colors.foreground} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Report an Issue</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <ReportIssueModal
        visible={helpOpen}
        roomNumber={data.roomNumber}
        assignmentId={assignmentId}
        hotelCode={hotelCode}
        unitType={data.type}
        onClose={() => setHelpOpen(false)}
        onSuccess={() => setHelpOpen(false)}
      />
    </Screen>
  );
}
