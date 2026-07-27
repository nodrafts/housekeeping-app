import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Icon } from '../components/ui/Icon';
import { colors, radii } from '../lib/theme';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const START_HOUR = 9;
const WORKDAY_HOURS = 8;
const HOUR_HEIGHT = 72;
const TIMELINE_HEIGHT = WORKDAY_HOURS * HOUR_HEIGHT;

const STAFF_BLOCKS = [
  {
    id: 'briefing',
    title: 'Room cleaning 301',
    start: '09:00',
    end: '09:30',
    color: '#dbeafe',
    borderColor: colors.primary,
  },
  {
    id: 'floor-two',
    title: 'Room cleaning 201',
    start: '09:45',
    end: '12:00',
    color: '#f3e8ff',
    borderColor: '#a855f7',
  },
  {
    id: 'linen',
    title: 'Room cleaning 204',
    start: '12:15',
    end: '13:00',
    color: '#fee2e2',
    borderColor: colors.destructive,
  },
  {
    id: 'deep-clean',
    title: 'Room cleaning 305',
    start: '13:15',
    end: '15:15',
    color: '#dcfce7',
    borderColor: '#22c55e',
  },
  {
    id: 'inspection',
    title: 'Room inspection 301',
    start: '15:30',
    end: '17:00',
    color: '#ffedd5',
    borderColor: '#f97316',
  },
];

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

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function formatHour(hour: number) {
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function blockLayout(start: string, end: string) {
  const dayStart = START_HOUR * 60;
  const top = ((minutesFromTime(start) - dayStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(48, ((minutesFromTime(end) - minutesFromTime(start)) / 60) * HOUR_HEIGHT);
  return { top, height };
}

export function ScheduleScreen({ navigation }: any) {
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const [selectedDate, setSelectedDate] = useState(dateToInput(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(inputToDate(selectedDate));

  const cells = useMemo(() => monthCells(visibleMonth), [visibleMonth]);
  const selectedDateObject = inputToDate(selectedDate);
  const weekDay = selectedDateObject.toLocaleDateString(undefined, { weekday: 'long' });

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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 14 : 18,
          paddingBottom: 96,
        }}
      >
        <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <TouchableOpacity onPress={openCalendar} activeOpacity={0.72} style={{ flex: 1 }}>
            <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.foreground }}>
              {selectedDateObject.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase', color: colors.primary }}>
                {weekDay}
              </Text>
              <Icon name="calendar" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('HotelSelect')}
            style={{
              maxWidth: 128,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.input,
              backgroundColor: colors.card,
            }}
            activeOpacity={0.75}
          >
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>
              {selectedHotel?.name ?? hotelCode}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: TIMELINE_HEIGHT }}>
            {Array.from({ length: WORKDAY_HOURS + 1 }).map((_, index) => {
              const hour = START_HOUR + index;
              return (
                <View
                  key={hour}
                  style={{
                    position: 'absolute',
                    top: index * HOUR_HEIGHT,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: index === 0 ? 6 : -18,
                      width: 48,
                      fontSize: 11,
                      color: colors.mutedForeground,
                    }}
                  >
                    {formatHour(hour)}
                  </Text>
                </View>
              );
            })}

            {STAFF_BLOCKS.map((block) => {
              const layout = blockLayout(block.start, block.end);
              return (
                <View
                  key={block.id}
                  style={{
                    position: 'absolute',
                    top: layout.top,
                    left: 72,
                    right: 12,
                    minHeight: 44,
                    height: layout.height,
                    borderLeftWidth: 3,
                    borderLeftColor: block.borderColor,
                    borderRadius: radii.md,
                    backgroundColor: block.color,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }}>
                    {block.start} - {block.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.42)' }}
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
              {DAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.mutedForeground }}>
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
