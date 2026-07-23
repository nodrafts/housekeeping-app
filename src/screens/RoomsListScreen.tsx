import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
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

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateToInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inputToDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addMonths(value: Date, delta: number) {
  return new Date(value.getFullYear(), value.getMonth() + delta, 1);
}

function monthCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < first.getDay(); i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function selectedDateLabel(dateInput: string) {
  const date = inputToDate(dateInput);
  const today = dateToInput(new Date());
  if (dateInput === today) return 'Today';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function progressFor(checklist: { done: boolean; skipped?: boolean }[]) {
  const total = checklist.length || 1;
  const handled = checklist.filter((item) => item.done || item.skipped).length;
  return Math.round((handled / total) * 100);
}

export function RoomsListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const [selectedDate, setSelectedDate] = useState(dateToInput(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(inputToDate(selectedDate));
  const { data = [], isLoading, refetch, isFetching } = useAssignments(hotelCode, selectedDate);
  const { data: allIncidents = [] } = useAllIncidents(hotelCode);

  const cells = useMemo(() => monthCells(visibleMonth), [visibleMonth]);

  const openCalendar = () => {
    setVisibleMonth(inputToDate(selectedDate));
    setCalendarOpen(true);
  };

  const chooseDate = (day: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    setSelectedDate(dateToInput(next));
    setCalendarOpen(false);
  };

  return (
    <Screen>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>Schedule</Text>
            <TouchableOpacity
              onPress={openCalendar}
              style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="calendar" size={15} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                {selectedDateLabel(selectedDate)}  {selectedDate}
              </Text>
            </TouchableOpacity>
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
                {selectedDateLabel(selectedDate)} has no House keeping tasks for {hotelCode}.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const progress = progressFor(item.checklist);
            const openIncidents = getOpenIncidentsForRoom(allIncidents, item.roomNumber);
            const done = item.status === 'DONE';
            const inProgress = item.status === 'IN_PROGRESS';

            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('RoomDetails', { assignmentId: item.id })}
                activeOpacity={0.78}
                style={{
                  marginBottom: 12,
                  borderRadius: radii.md,
                  borderWidth: 1.5,
                  borderColor: done ? colors.success : inProgress ? colors.warning : colors.input,
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
                      {done ? 'DONE' : inProgress ? 'STARTED' : 'OPEN'}
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

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setCalendarOpen(false)}
        >
          <View
            style={{ borderRadius: radii.xl, backgroundColor: colors.card, padding: 16 }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <TouchableOpacity onPress={() => setVisibleMonth((date) => addMonths(date, -1))} style={{ padding: 8 }}>
                <Text style={{ fontSize: 18, color: colors.primary }}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.foreground }}>
                {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => setVisibleMonth((date) => addMonths(date, 1))} style={{ padding: 8 }}>
                <Text style={{ fontSize: 18, color: colors.primary }}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {DAYS.map((day) => (
                <Text key={day} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.mutedForeground }}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((day, index) => {
                const dateInput = day
                  ? dateToInput(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day))
                  : '';
                const active = dateInput === selectedDate;
                return (
                  <TouchableOpacity
                    key={`${index}-${day ?? 'blank'}`}
                    disabled={!day}
                    onPress={() => day && chooseDate(day)}
                    style={{ width: `${100 / 7}%`, padding: 4 }}
                  >
                    <View
                      style={{
                        height: 38,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: radii.pill,
                        backgroundColor: active ? colors.primary : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: active ? '800' : '600', color: active ? colors.primaryForeground : colors.foreground }}>
                        {day ?? ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
