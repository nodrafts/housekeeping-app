import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Icon } from '../components/ui/Icon';
import { getApiErrorMessage } from '../lib/api';
import { colors, radii } from '../lib/theme';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import {
  useAvailableSwapEmployees,
  useCreateScheduleSwap,
  useStaffSchedules,
  type StaffSchedule,
} from '../modules/schedule/useStaffSchedules';

type ScheduleViewMode = 'day' | 'week' | 'month';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FALLBACK_START_HOUR = 9;
const DEFAULT_VISIBLE_HOURS = 8;
const HOUR_HEIGHT = 72;
const WEEK_TIME_GUTTER = 44;
const WEEK_VISIBLE_DAYS = 6;

const VIEW_LABELS: Record<ScheduleViewMode, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

function dateToInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inputToDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value: Date, delta: number) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + delta);
}

function addMonths(value: Date, delta: number) {
  return new Date(value.getFullYear(), value.getMonth() + delta, 1);
}

function startOfWeek(value: Date) {
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(value, mondayOffset);
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function dateRange(start: Date, days: number) {
  return Array.from({ length: days }, (_, index) => addDays(start, index));
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

function minutesOfDay(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

function scheduleMinutes(schedule: StaffSchedule) {
  const start = minutesOfDay(schedule.plannedStartTime);
  let end = minutesOfDay(schedule.plannedEndTime);
  if (end <= start) {
    end += 24 * 60;
  }
  return { start, end };
}

function formatHour(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return '12 AM';
  if (normalized === 12) return '12 PM';
  if (normalized > 12) return `${normalized - 12} PM`;
  return `${normalized} AM`;
}

function formatClock(value: Date) {
  return value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function compactClock(value: Date) {
  return value.toLocaleTimeString(undefined, { hour: 'numeric' }).replace(' ', '');
}

function formatApiTime(value: Date) {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDayTitle(value: Date) {
  return value.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatWeekTitle(start: Date) {
  const end = addDays(start, WEEK_VISIBLE_DAYS - 1);
  const startMonth = start.toLocaleDateString(undefined, { month: 'short' });
  const endMonth = end.toLocaleDateString(undefined, { month: 'short' });
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function timelineBounds(schedules: StaffSchedule[]) {
  if (schedules.length === 0) {
    return {
      startHour: FALLBACK_START_HOUR,
      endHour: FALLBACK_START_HOUR + DEFAULT_VISIBLE_HOURS,
    };
  }

  const ranges = schedules.map(scheduleMinutes);
  let startHour = Math.floor(Math.min(...ranges.map((range) => range.start)) / 60);
  let endHour = Math.ceil(Math.max(...ranges.map((range) => range.end)) / 60);

  if (endHour - startHour < DEFAULT_VISIBLE_HOURS) {
    endHour = startHour + DEFAULT_VISIBLE_HOURS;
  }

  return { startHour, endHour };
}

function isVisibleSchedule(schedule: StaffSchedule) {
  return schedule.status !== 'Draft';
}

function shiftCardColors(accepted: boolean, pendingSwap: boolean) {
  if (pendingSwap) {
    return { backgroundColor: '#fff7ed', borderColor: '#f59e0b' };
  }
  if (accepted) {
    return { backgroundColor: '#ecfdf5', borderColor: '#16a34a' };
  }
  return { backgroundColor: '#eff6ff', borderColor: colors.primary };
}

function actualOverlay(schedule: StaffSchedule) {
  if (!schedule.actualStartTime) {
    return null;
  }

  const plannedStart = schedule.plannedStartTime.getTime();
  const plannedEnd = schedule.plannedEndTime.getTime();
  const plannedLength = Math.max(1, plannedEnd - plannedStart);
  const actualEnd = schedule.actualEndTime?.getTime() ?? Date.now();
  const left = clamp(((schedule.actualStartTime.getTime() - plannedStart) / plannedLength) * 100, 0, 100);
  const right = clamp(((actualEnd - plannedStart) / plannedLength) * 100, 0, 100);
  const width = Math.max(2, right - left);

  return { left, width };
}

function groupByDate(schedules: StaffSchedule[]) {
  return schedules.reduce<Record<string, StaffSchedule[]>>((acc, schedule) => {
    if (!acc[schedule.scheduleDate]) acc[schedule.scheduleDate] = [];
    acc[schedule.scheduleDate].push(schedule);
    return acc;
  }, {});
}

export function ScheduleScreen({ navigation }: any) {
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(dateToInput(startOfWeek(new Date())));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapScheduleId, setSwapScheduleId] = useState<number | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(inputToDate(selectedDate));
  const [pendingSwapScheduleIds, setPendingSwapScheduleIds] = useState<Set<number>>(new Set());
  const [targetEmployeeId, setTargetEmployeeId] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  const selectedDateObject = inputToDate(selectedDate);
  const weekStart = selectedDateObject;
  const weekDays = useMemo(() => dateRange(weekStart, WEEK_VISIBLE_DAYS), [weekStart]);
  const monthDate = startOfMonth(selectedDateObject);

  const scheduleQuery = useStaffSchedules({
    employeeId: user?.id,
    scheduleDate: viewMode === 'day' ? selectedDate : undefined,
    dateFrom: viewMode === 'week' ? dateToInput(weekStart) : viewMode === 'month' ? dateToInput(monthDate) : undefined,
    dateTo: viewMode === 'week' ? dateToInput(addDays(weekStart, WEEK_VISIBLE_DAYS - 1)) : viewMode === 'month' ? dateToInput(endOfMonth(monthDate)) : undefined,
    enabled: !!user?.id,
  });

  const createSwap = useCreateScheduleSwap();

  const schedules = useMemo(
    () => (scheduleQuery.data ?? []).filter(isVisibleSchedule),
    [scheduleQuery.data],
  );
  const schedulesByDate = useMemo(() => groupByDate(schedules), [schedules]);
  const daySchedules = useMemo(
    () => schedules.filter((schedule) => schedule.scheduleDate === selectedDate),
    [schedules, selectedDate],
  );
  const dayBounds = useMemo(() => timelineBounds(daySchedules), [daySchedules]);
  const weekBounds = useMemo(() => timelineBounds(schedules), [schedules]);
  const errorMessage = scheduleQuery.error ? getApiErrorMessage(scheduleQuery.error) : null;
  const weekDay = selectedDateObject.toLocaleDateString(undefined, { weekday: 'long' });
  const monthCellsForView = useMemo(() => monthCells(monthDate), [monthDate]);
  const currentSchedule = daySchedules[0];
  const activeSwapSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === swapScheduleId) ?? currentSchedule,
    [currentSchedule, schedules, swapScheduleId],
  );
  const scheduleContentWidth = Math.max(300, screenWidth - 32);
  const weekDayWidth = Math.max(44, (scheduleContentWidth - WEEK_TIME_GUTTER) / WEEK_VISIBLE_DAYS);

  const availableEmployeesQuery = useAvailableSwapEmployees({
    date: activeSwapSchedule?.scheduleDate ?? selectedDate,
    startTime: activeSwapSchedule ? formatApiTime(activeSwapSchedule.plannedStartTime) : undefined,
    endTime: activeSwapSchedule ? formatApiTime(activeSwapSchedule.plannedEndTime) : undefined,
    enabled: swapOpen && !!activeSwapSchedule,
  });

  const canSwap = viewMode === 'day' && !!currentSchedule && currentSchedule.status === 'Published';

  const openCalendar = () => {
    setVisibleMonth(inputToDate(selectedDate));
    setCalendarOpen(true);
  };

  const chooseDate = (day: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    setSelectedDate(dateToInput(next));
    setCalendarOpen(false);
  };

  const chooseMonth = (delta: number) => {
    setVisibleMonth((date) => addMonths(date, delta));
  };

  const changeWeek = (delta: number) => {
    setSelectedDate(dateToInput(addDays(weekStart, delta * WEEK_VISIBLE_DAYS)));
  };

  const openDayFromWeek = (dateInput: string) => {
    setSelectedDate(dateInput);
    setViewMode('day');
  };

  const openSwap = (schedule?: StaffSchedule) => {
    const shift = schedule ?? currentSchedule;
    setSwapScheduleId(shift?.id ?? null);
    if (shift) {
      setSelectedDate(shift.scheduleDate);
    }
    setTargetEmployeeId(null);
    setSwapError(null);
    setSwapOpen(true);
  };

  const submitSwap = async () => {
    if (!activeSwapSchedule || targetEmployeeId == null) {
      setSwapError('Select a person to request the swap with.');
      return;
    }

    try {
      setSwapError(null);
      const swap = await createSwap.mutateAsync({
        requestScheduleId: activeSwapSchedule.id,
        targetEmployeeId,
        requestedBy: user?.id,
        status: 'Requested',
      });
      if (swap.status === 'Requested') {
        setPendingSwapScheduleIds((current) => new Set(current).add(activeSwapSchedule.id));
      }
      setSwapOpen(false);
      setSwapScheduleId(null);
    } catch (error) {
      setSwapError(getApiErrorMessage(error));
    }
  };

  const renderShiftBlock = (
    schedule: StaffSchedule,
    top: number,
    height: number,
    left: number,
    right?: number,
    width?: number,
    compact = false,
    onPress?: () => void,
    onSwapPress?: () => void,
  ) => {
    const accepted = schedule.status === 'Accepted';
    const pendingSwap = pendingSwapScheduleIds.has(schedule.id);
    const card = shiftCardColors(accepted, pendingSwap);
    const overlay = actualOverlay(schedule);
    const compactStart = compactClock(schedule.plannedStartTime);
    const compactEnd = compactClock(schedule.plannedEndTime);
    const blockStyle = {
      position: 'absolute' as const,
      top,
      left,
      right,
      width,
      minHeight: compact ? 42 : 64,
      height,
      borderLeftWidth: 3,
      borderLeftColor: card.borderColor,
      borderRadius: radii.md,
      backgroundColor: card.backgroundColor,
      overflow: 'hidden' as const,
    };
    const content = (
      <>
        {overlay ? (
          <View
            style={{
              position: 'absolute',
              left: `${overlay.left}%`,
              top: 0,
              bottom: 0,
              width: `${overlay.width}%`,
              backgroundColor: 'rgba(37, 99, 235, 0.22)',
            }}
          />
        ) : null}

        <View style={{ flex: 1, paddingHorizontal: compact ? 3 : 10, paddingVertical: 8, justifyContent: 'center' }}>
          {compact ? (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, lineHeight: 12, fontWeight: '800', color: colors.foreground }} numberOfLines={1}>
                {compactStart}
              </Text>
              <Text style={{ fontSize: 9, lineHeight: 11, fontWeight: '800', color: colors.mutedForeground }}>
                to
              </Text>
              <Text style={{ fontSize: 10, lineHeight: 12, fontWeight: '800', color: colors.foreground }} numberOfLines={1}>
                {compactEnd}
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'flex-start', justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.foreground }} numberOfLines={1}>
                {formatClock(schedule.plannedStartTime)} - {formatClock(schedule.plannedEndTime)}
              </Text>
            </View>
          )}

          {compact && onSwapPress ? (
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation?.();
                onSwapPress();
              }}
              style={{
                alignSelf: 'center',
                marginTop: 7,
                minWidth: 34,
                minHeight: 22,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: colors.card,
                paddingHorizontal: 5,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 9, lineHeight: 11, fontWeight: '800', color: colors.primary, textAlign: 'center' }} numberOfLines={1}>
                Swap
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </>
    );

    if (onPress) {
      return (
        <TouchableOpacity key={schedule.id} onPress={onPress} activeOpacity={0.82} style={blockStyle}>
          {content}
        </TouchableOpacity>
      );
    }

    return (
      <View key={schedule.id} style={blockStyle}>
        {content}
      </View>
    );
  };

  const renderDayBody = () => {
    if (scheduleQuery.isLoading) {
      return (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Loading shifts...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground }}>Unable to load shifts</Text>
          <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: colors.mutedForeground }}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            onPress={() => scheduleQuery.refetch()}
            style={{
              marginTop: 16,
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              paddingHorizontal: 18,
              paddingVertical: 10,
            }}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryForeground }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (daySchedules.length === 0) {
      return (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.selected,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Icon name="calendar" size={20} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground }}>No shift</Text>
        </View>
      );
    }

    const timelineHeight = (dayBounds.endHour - dayBounds.startHour) * HOUR_HEIGHT;
    const timelineStartMinute = dayBounds.startHour * 60;

    return (
      <View style={{ height: timelineHeight }}>
        {Array.from({ length: dayBounds.endHour - dayBounds.startHour + 1 }).map((_, index) => {
          const hour = dayBounds.startHour + index;
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

        {daySchedules.map((schedule) => {
          const range = scheduleMinutes(schedule);
          const top = ((range.start - timelineStartMinute) / 60) * HOUR_HEIGHT;
          const height = Math.max(72, ((range.end - range.start) / 60) * HOUR_HEIGHT);
          return renderShiftBlock(schedule, top, height, 72, 12);
        })}
      </View>
    );
  };

  const renderWeekBody = () => {
    if (scheduleQuery.isLoading) {
      return (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    const timelineHeight = (weekBounds.endHour - weekBounds.startHour) * HOUR_HEIGHT;
    const timelineStartMinute = weekBounds.startHour * 60;
    const gridWidth = WEEK_TIME_GUTTER + weekDayWidth * WEEK_VISIBLE_DAYS;

    return (
      <View style={{ width: gridWidth }}>
          <View style={{ height: 58, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ width: WEEK_TIME_GUTTER }} />
            {weekDays.map((day) => {
              const input = dateToInput(day);
              const active = input === selectedDate;
              const hasShift = (schedulesByDate[input] ?? []).length > 0;
              return (
                <TouchableOpacity
                  key={input}
                  onPress={() => openDayFromWeek(input)}
                  style={{
                    width: weekDayWidth,
                    paddingTop: 8,
                    paddingHorizontal: 3,
                    backgroundColor: active ? colors.selected : colors.card,
                    borderLeftWidth: 1,
                    borderLeftColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '800', color: active ? colors.primary : colors.foreground }}>
                    {day.getDate()}
                  </Text>
                  <Text style={{ marginTop: 1, fontSize: 10, fontWeight: '700', color: colors.mutedForeground }}>
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </Text>
                  {hasShift ? (
                    <View style={{ marginTop: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: timelineHeight }}>
            {Array.from({ length: weekBounds.endHour - weekBounds.startHour + 1 }).map((_, index) => {
              const hour = weekBounds.startHour + index;
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
                  <Text style={{ position: 'absolute', top: index === 0 ? 6 : -18, left: 8, fontSize: 10, color: colors.mutedForeground }}>
                    {formatHour(hour)}
                  </Text>
                </View>
              );
            })}

            {weekDays.map((day, dayIndex) => (
              <View
                key={`line-${dateToInput(day)}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: WEEK_TIME_GUTTER + dayIndex * weekDayWidth,
                  width: 1,
                  backgroundColor: colors.border,
                }}
              />
            ))}

            {schedules.map((schedule) => {
              const dayIndex = weekDays.findIndex((day) => dateToInput(day) === schedule.scheduleDate);
              if (dayIndex < 0) return null;
              const range = scheduleMinutes(schedule);
              const top = ((range.start - timelineStartMinute) / 60) * HOUR_HEIGHT;
              const height = Math.max(42, ((range.end - range.start) / 60) * HOUR_HEIGHT);
              return renderShiftBlock(
                schedule,
                top,
                height,
                WEEK_TIME_GUTTER + dayIndex * weekDayWidth + 3,
                undefined,
                weekDayWidth - 6,
                true,
                () => openDayFromWeek(schedule.scheduleDate),
                schedule.status === 'Published' ? () => openSwap(schedule) : undefined,
              );
            })}
          </View>
        </View>
    );
  };

  const renderMonthBody = () => {
    if (scheduleQuery.isLoading) {
      return (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {DAYS.map((day, index) => (
            <Text key={`${day}-${index}`} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.mutedForeground }}>
              {day}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {monthCellsForView.map((day, index) => {
            const dateInput = day ? dateToInput(new Date(monthDate.getFullYear(), monthDate.getMonth(), day)) : '';
            const active = dateInput === selectedDate;
            const hasShift = !!dateInput && (schedulesByDate[dateInput] ?? []).length > 0;
            return (
              <TouchableOpacity
                key={`${index}-${day ?? 'blank'}`}
                disabled={!day}
                onPress={() => {
                  if (day) setSelectedDate(dateInput);
                }}
                style={{ width: `${100 / 7}%`, padding: 4 }}
              >
                <View
                  style={{
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radii.md,
                    backgroundColor: hasShift ? (active ? colors.primary : colors.selected) : 'transparent',
                    borderWidth: active && !hasShift ? 1 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: hasShift || active ? '800' : '600', color: hasShift && active ? colors.primaryForeground : colors.foreground }}>
                    {day ?? ''}
                  </Text>
                  {hasShift && !active ? (
                    <View style={{ marginTop: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary }} />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
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
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <TouchableOpacity onPress={openCalendar} activeOpacity={0.72} style={{ flex: 1 }}>
              <Text style={{ fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.foreground }}>
                {viewMode === 'week'
                  ? formatWeekTitle(weekStart)
                  : viewMode === 'month'
                    ? selectedDateObject.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                    : formatDayTitle(selectedDateObject)}
              </Text>
              <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase', color: colors.primary }}>
                  {viewMode === 'day' ? weekDay : VIEW_LABELS[viewMode]}
                </Text>
                <Icon name="calendar" size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => setModeOpen(true)}
                style={{
                  height: 34,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.input,
                  paddingHorizontal: 12,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }}>{VIEW_LABELS[viewMode]}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('HotelSelect')}
                style={{
                  maxWidth: 92,
                  paddingHorizontal: 12,
                  height: 34,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.input,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.75}
              >
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>
                  {selectedHotel?.name ?? hotelCode}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {canSwap ? (
            <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity
                onPress={() => openSwap()}
                style={{
                  height: 34,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  paddingHorizontal: 18,
                  backgroundColor: colors.selected,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>Swap</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {viewMode === 'week' ? (
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => changeWeek(-1)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.input,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{'<'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openCalendar}
                style={{
                  flex: 1,
                  minHeight: 38,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.input,
                  backgroundColor: colors.card,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }} numberOfLines={1}>
                  {dateToInput(weekStart)} to {dateToInput(addDays(weekStart, WEEK_VISIBLE_DAYS - 1))}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => changeWeek(1)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.input,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

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
          {viewMode === 'day' ? renderDayBody() : viewMode === 'week' ? renderWeekBody() : renderMonthBody()}
        </View>
      </ScrollView>

      <Modal visible={modeOpen} transparent animationType="fade" onRequestClose={() => setModeOpen(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 18, backgroundColor: 'rgba(15,23,42,0.18)' }}
          onPress={() => setModeOpen(false)}
        >
          <View style={{ width: 184, borderRadius: radii.xl, backgroundColor: colors.card, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }}>
            {(['day', 'week', 'month'] as ScheduleViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  if (mode === 'week' && viewMode !== 'week') {
                    setSelectedDate(dateToInput(startOfWeek(selectedDateObject)));
                  }
                  setViewMode(mode);
                  setModeOpen(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 }}
              >
                <Icon name={mode === 'day' ? 'calendar' : mode === 'week' ? 'check' : 'calendar'} size={16} color={viewMode === mode ? colors.primary : colors.mutedForeground} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: viewMode === mode ? '800' : '600', color: colors.foreground }}>
                  {VIEW_LABELS[mode]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

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
              <TouchableOpacity onPress={() => chooseMonth(-1)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 18, color: colors.primary }}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.foreground }}>
                {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => chooseMonth(1)} style={{ padding: 8 }}>
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
              {monthCells(visibleMonth).map((day, index) => {
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

      <Modal visible={swapOpen} transparent animationType="slide" onRequestClose={() => setSwapOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.42)' }}>
          <View style={{ maxHeight: '86%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.card, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>Swap shift</Text>
              <TouchableOpacity
                onPress={() => {
                  setSwapOpen(false);
                  setSwapScheduleId(null);
                }}
                style={{ padding: 8 }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.mutedForeground }}>X</Text>
              </TouchableOpacity>
            </View>

            {activeSwapSchedule ? (
              <View style={{ borderRadius: radii.lg, backgroundColor: colors.selected, padding: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>Your shift</Text>
                <Text style={{ marginTop: 6, fontSize: 15, fontWeight: '800', color: colors.foreground }}>
                  {formatClock(activeSwapSchedule.plannedStartTime)} - {formatClock(activeSwapSchedule.plannedEndTime)}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground }}>
                  {formatDayTitle(inputToDate(activeSwapSchedule.scheduleDate))}
                </Text>
              </View>
            ) : null}

            <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: '800', color: colors.foreground }}>Target date</Text>
            <View style={{ borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.foreground }}>
                {formatDayTitle(inputToDate(selectedDate))}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground }}>
                Available staff for this shift time
              </Text>
            </View>

            <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: '800', color: colors.foreground }}>Swap with</Text>
            {availableEmployeesQuery.isLoading ? (
              <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (availableEmployeesQuery.data ?? []).length === 0 ? (
              <View style={{ minHeight: 96, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.muted }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.mutedForeground }}>No available staff found</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 220 }}>
                {(availableEmployeesQuery.data ?? []).map((employee) => {
                  const active = employee.employeeId === targetEmployeeId;
                  return (
                    <TouchableOpacity
                      key={employee.employeeId}
                      onPress={() => setTargetEmployeeId(employee.employeeId)}
                      style={{
                        marginBottom: 8,
                        borderRadius: radii.lg,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.selected : colors.card,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.foreground }} numberOfLines={1}>
                        {employee.name}
                      </Text>
                      {employee.titleName ? (
                        <Text style={{ marginTop: 4, fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>
                          {employee.titleName}
                        </Text>
                      ) : null}
                      {employee.email ? (
                        <Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>
                          {employee.email}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {swapError ? (
              <Text style={{ marginTop: 10, fontSize: 12, color: colors.destructive }}>{swapError}</Text>
            ) : null}

            <TouchableOpacity
              onPress={submitSwap}
              disabled={!activeSwapSchedule || targetEmployeeId == null || createSwap.isPending}
              style={{
                marginTop: 14,
                height: 48,
                borderRadius: radii.pill,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !activeSwapSchedule || targetEmployeeId == null || createSwap.isPending ? 0.48 : 1,
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primaryForeground }}>
                {createSwap.isPending ? 'Submitting...' : 'Request swap'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
