import React, { useMemo, useState } from 'react';
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
import { useAssignment, useUpdateChecklist, useUpdateStatus } from '../modules/housekeeping/useAssignment';
import type { ChecklistItem } from '../modules/housekeeping/types';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { useAuth } from '../modules/auth/useAuth';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';

type Props = NativeStackScreenProps<AppStackParamList, 'RoomDetails'>;

function progressFor(checklist: ChecklistItem[]) {
  const total = checklist.length || 1;
  const handled = checklist.filter((item) => item.done || item.skipped).length;
  return Math.round((handled / total) * 100);
}

function setChecklistStatus(checklist: ChecklistItem[], itemId: string, status: ChecklistItem['status']) {
  return checklist.map((item) => (
    item.id === itemId
      ? { ...item, status, done: status === 'COMPLETED', skipped: status === 'SKIPPED' }
      : item
  ));
}

export function RoomDetailsScreen({ route, navigation }: Props) {
  const { assignmentId } = route.params;
  const { selectedHotel } = useHotelStore();
  const { user } = useAuth();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const { data, isLoading } = useAssignment(assignmentId, hotelCode);
  const updateChecklist = useUpdateChecklist();
  const updateStatus = useUpdateStatus();
  const [helpOpen, setHelpOpen] = useState(false);

  const progress = useMemo(() => data ? progressFor(data.checklist) : 0, [data]);
  const hasWaitingItems = useMemo(
    () => data ? data.checklist.some((item) => item.status === 'WAITING') : true,
    [data],
  );

  const updateItem = (item: ChecklistItem, status: ChecklistItem['status']) => {
    if (!data) return;
    updateChecklist.mutate({
      assignmentId,
      checklist: setChecklistStatus(data.checklist, item.id, status),
    });
  };

  const completeRoom = () => {
    updateStatus.mutate(
      { assignmentId, status: 'DONE' },
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
          borderBottomColor: '#e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>
          Room {data.roomNumber}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
          {data.floor ? `Floor ${data.floor}` : 'Floor not set'}
          {data.type ? ` - ${data.type}` : ''}
        </Text>
        <View style={{ marginTop: 12, height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
          <View style={{ width: `${progress}%`, height: '100%', borderRadius: 999, backgroundColor: '#2563eb' }} />
        </View>
        <Text style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>{progress}% complete</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={{ marginBottom: 8, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: '#6b7280' }}>
          Checklist
        </Text>

        {data.checklist.map((item) => {
          const done = item.status === 'COMPLETED';
          const skipped = item.status === 'SKIPPED';

          return (
            <View
              key={item.id}
              style={{
                marginBottom: 14,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: done ? '#10b981' : skipped ? '#cbd5e1' : '#e5e7eb',
                backgroundColor: done ? '#f0fdf4' : '#ffffff',
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: skipped ? '#64748b' : '#0f172a',
                  marginBottom: 12,
                }}
              >
                {item.label}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => updateItem(item, done ? 'WAITING' : 'COMPLETED')}
                  disabled={updateChecklist.isPending}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: done ? '#10b981' : '#18b981',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: updateChecklist.isPending ? 0.65 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                    {done ? 'Completed' : 'Complete'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => updateItem(item, skipped ? 'WAITING' : 'SKIPPED')}
                  disabled={updateChecklist.isPending}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: skipped ? '#94a3b8' : '#d1d5db',
                    backgroundColor: skipped ? '#f1f5f9' : '#f9fafb',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: updateChecklist.isPending ? 0.65 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>
                    {skipped ? 'Skipped' : 'Skip'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          onPress={completeRoom}
          disabled={updateStatus.isPending || hasWaitingItems}
          style={{
            marginTop: 8,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            backgroundColor: '#2563eb',
            opacity: updateStatus.isPending || hasWaitingItems ? 0.45 : 1,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
            {updateStatus.isPending ? 'Saving...' : 'Complete cleaning'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setHelpOpen(true)}
          style={{
            marginTop: 12,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: '#d1d5db',
            backgroundColor: '#f9fafb',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>Report an Issue</Text>
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
