import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Screen } from '../components/layout/Screen';
import { Icon } from '../components/ui/Icon';
import { useAssignments } from '../modules/housekeeping/useAssignments';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { useAllIncidents, getOpenIncidentsForRoom } from '../modules/housekeeping/useIncidents';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';
import { colors, radii } from '../lib/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'RoomsList'> | any;

function dateToInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function progressFor(checklist: { done: boolean }[]) {
  const total = checklist.length || 1;
  const handled = checklist.filter((item) => item.done).length;
  return Math.round((handled / total) * 100);
}

function statusLabel(status: string) {
  if (status === 'READY') return 'Ready';
  if (status === 'CLEANING') return 'Cleaning';
  if (status === 'STAY_OVER') return 'Stay over';
  return 'Checkout';
}

export function RoomsListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const [selectedDate] = useState(dateToInput(new Date()));
  const { data = [], isLoading, refetch, isFetching } = useAssignments(hotelCode);
  const { data: allIncidents = [] } = useAllIncidents(hotelCode);

  return (
    <Screen>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 12,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>Housekeeping</Text>
            <View style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="sparkles" size={15} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                Today {selectedDate}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('HotelSelect')}
            style={{
              maxWidth: 132,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.input,
              backgroundColor: colors.secondary,
            }}
          >
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>
              {selectedHotel?.name ?? hotelCode}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          ListEmptyComponent={
            <View
              style={{
                padding: 20,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>No rooms due</Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: colors.mutedForeground }}>
                Today has no housekeeping tasks assigned for {hotelCode}.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const progress = progressFor(item.checklist);
            const openIncidents = getOpenIncidentsForRoom(allIncidents, item.roomNumber);
            const done = item.status === 'READY';
            const inProgress = item.status === 'CLEANING';

            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('RoomDetails', { assignmentId: item.id })}
                activeOpacity={0.78}
                style={{
                  marginBottom: 12,
                  borderRadius: radii.md,
                  borderWidth: 1.5,
                  borderColor: done ? colors.success : colors.input,
                  backgroundColor: colors.card,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>
                      Room {item.roomNumber}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 13, color: colors.mutedForeground }}>
                      {item.floor ? `Floor ${item.floor}` : 'Floor not set'}
                      {item.type ? ` - ${item.type}` : ''}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: radii.pill,
                      backgroundColor: done ? colors.muted : inProgress ? '#fef3c7' : colors.muted,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: done ? colors.foreground : inProgress ? '#92400e' : colors.foreground }}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, height: 7, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.border }}>
                  <View style={{ width: `${progress}%`, height: '100%', borderRadius: radii.pill, backgroundColor: done ? colors.success : colors.primary }} />
                </View>
                <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{progress}% complete</Text>
                  {openIncidents.length > 0 ? (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#f97316' }}>
                      {openIncidents.length} issue{openIncidents.length === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Screen>
  );
}
