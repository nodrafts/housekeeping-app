import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Screen } from '../components/layout/Screen';
import { Icon } from '../components/ui/Icon';
import { BrandLogo } from '../components/ui/BrandLogo';
import { useAssignments } from '../modules/housekeeping/useAssignments';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { useAllIncidents, getOpenIncidentsForRoom } from '../modules/housekeeping/useIncidents';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';
import { colors, radii } from '../lib/theme';
import { useTranslation } from 'react-i18next';
import { useUpdateStatus } from '../modules/housekeeping/useAssignment';
import { formatCleaningElapsed } from '../modules/housekeeping/cleaningTimer';
import { useTasks } from '../modules/tasks/taskApi';
import type { Task } from '../modules/tasks/types';

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

const FINISHED_TASK_STATUSES = new Set(['COMPLETED', 'DONE', 'CANCELLED', 'CLOSED']);

function formatTaskDate(value: Task['dueDate'], language: string) {
  if (value == null) return null;
  const normalizedValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(language.startsWith('es') ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' });
}

export function RoomsListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const [selectedDate] = useState(dateToInput(new Date()));
  const { data = [], isLoading, refetch, isFetching } = useAssignments(hotelCode);
  const complianceParams = useMemo(() => ({
    hotelCode,
    taskType: 'COMPLIANCE',
    assigneeId: 'me',
    pageSize: 100,
  }), [hotelCode]);
  const complianceQuery = useTasks(
    complianceParams,
    user?.orgId,
    { enabled: !!user?.orgId && !!hotelCode },
  );
  const { data: allIncidents = [] } = useAllIncidents(hotelCode);
  const updateStatus = useUpdateStatus();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [filter, setFilter] = useState<'TODO' | 'READY' | 'ALL'>('TODO');

  const filteredData = useMemo(() => data.filter((item) => (
    filter === 'ALL' ? true : filter === 'READY' ? item.status === 'READY' : item.status !== 'READY'
  )), [data, filter]);
  const readyCount = data.filter((item) => item.status === 'READY').length;
  const complianceJobs = useMemo(
    () => (complianceQuery.data ?? []).filter((task) => !FINISHED_TASK_STATUSES.has(task.status)),
    [complianceQuery.data],
  );
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? t('profile.employee');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openRoom = (item: (typeof data)[number]) => {
    if (item.status === 'CLEANING' || item.status === 'READY') {
      navigation.navigate('RoomDetails', { assignmentId: item.id, dueDate: item.dueDate ?? selectedDate });
      return;
    }

    setStartingId(item.id);
    updateStatus.mutate(
      { hotelCode, assignment: item, status: 'CLEANING', checklist: item.checklist },
      {
        onSuccess: () => {
          setStartingId(null);
          navigation.navigate('RoomDetails', { assignmentId: item.id, dueDate: item.dueDate ?? selectedDate });
        },
        onError: () => {
          setStartingId(null);
          Alert.alert(t('rooms.couldNotStart'));
        },
      },
    );
  };

  const refreshAll = () => {
    void Promise.all([refetch(), complianceQuery.refetch()]);
  };

  const renderComplianceJobs = () => (
    <View style={{ marginBottom: 18 }}>
      <View style={{ marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Icon name="document" size={18} color={colors.primary} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.foreground }}>
            {t('rooms.complianceJobs')}
          </Text>
        </View>
        {!complianceQuery.isLoading && !complianceQuery.isError ? (
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
            {complianceJobs.length}
          </Text>
        ) : null}
      </View>

      {complianceQuery.isLoading ? (
        <View style={{ minHeight: 64, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : complianceQuery.isError ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.card, padding: 14 }}>
          <Text style={{ fontSize: 13, color: colors.destructive }}>{t('rooms.complianceLoadFailed')}</Text>
          <TouchableOpacity onPress={() => complianceQuery.refetch()} style={{ alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : complianceJobs.length === 0 ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.card, padding: 14 }}>
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{t('rooms.noComplianceJobs')}</Text>
        </View>
      ) : complianceJobs.map((task) => {
        const dueDate = formatTaskDate(task.dueDate, i18n.resolvedLanguage ?? i18n.language);
        const statusKey = task.status === 'IN_PROGRESS' ? 'inProgress' : 'open';
        const normalizedPriority = String(task.priority ?? 'MEDIUM').toUpperCase();
        const priorityKey = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(normalizedPriority)
          ? normalizedPriority.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent'
          : 'medium';
        return (
          <View key={task.id} style={{ marginBottom: 9, borderWidth: 1, borderColor: colors.input, borderRadius: radii.md, backgroundColor: colors.card, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.foreground }}>
                {task.title}
              </Text>
              <View style={{ borderRadius: radii.pill, backgroundColor: task.status === 'IN_PROGRESS' ? '#fef3c7' : colors.selected, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: task.status === 'IN_PROGRESS' ? '#92400e' : colors.primary }}>
                  {t(`taskStatus.${statusKey}`)}
                </Text>
              </View>
            </View>
            {task.description ? (
              <Text numberOfLines={2} style={{ marginTop: 5, fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>
                {task.description}
              </Text>
            ) : null}
            <View style={{ marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {dueDate ? <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground }}>{t('rooms.due', { date: dueDate })}</Text> : null}
              <Text style={{ fontSize: 11, fontWeight: '800', color: normalizedPriority === 'URGENT' || normalizedPriority === 'HIGH' ? colors.destructive : colors.mutedForeground }}>
                {t(`taskPriority.${priorityKey}`)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <Screen safeAreaColor={colors.primary}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.accent,
          backgroundColor: colors.primary,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('HotelSelect')}
          activeOpacity={0.75}
          style={{
            width: '100%',
            minHeight: 44,
            paddingHorizontal: 13,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: '#8a5b8b',
            backgroundColor: colors.accent,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <Icon name="bed" size={18} color={colors.primaryForeground} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.primaryForeground }}
          >
            {selectedHotel?.name ?? user?.hotelName ?? hotelCode}
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <BrandLogo width={34} height={23} color={colors.primaryForeground} />
            <Text style={{ fontSize: 21, fontWeight: '800', color: colors.primaryForeground }}>noDrafts</Text>
          </View>
          <View style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="sparkles" size={15} color={colors.primaryForeground} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryForeground }}>
              {t('rooms.today', { date: selectedDate })}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{t('rooms.greeting', { name: firstName })}</Text>
        <Text style={{ marginTop: 2, fontSize: 28, fontWeight: '800', color: colors.foreground }}>{t('rooms.title')}</Text>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 8 }}>
          {([['TODO', t('rooms.toDoCount', { count: Math.max(0, data.length - readyCount) })], ['READY', t('rooms.readyCount', { count: readyCount })], ['ALL', t('rooms.allCount', { count: data.length })]] as const).map(([value, label]) => (
            <TouchableOpacity key={value} onPress={() => setFilter(value)} style={{ flex: 1, minHeight: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: filter === value ? colors.primary : colors.card, borderWidth: 1, borderColor: filter === value ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: filter === value ? colors.primaryForeground : colors.foreground }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          refreshing={isFetching || complianceQuery.isFetching}
          onRefresh={refreshAll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 96 }}
          ListHeaderComponent={renderComplianceJobs}
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
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{t('rooms.noRooms')}</Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: colors.mutedForeground }}>
                {t('rooms.noRoomsDescription', { hotelCode })}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const progress = progressFor(item.checklist);
            const openIncidents = getOpenIncidentsForRoom(allIncidents, item.roomNumber);
            const done = item.status === 'READY';
            const inProgress = item.status === 'CLEANING';
            const elapsed = inProgress
              ? formatCleaningElapsed(item.cleaningStartTime, now, item.dueDate)
              : null;
            const isStarting = startingId === item.id;

            return (
              <TouchableOpacity
                onPress={() => openRoom(item)}
                disabled={startingId !== null}
                activeOpacity={0.78}
                style={{
                  marginBottom: 12,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: done ? colors.success : colors.input,
                  backgroundColor: colors.card,
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>
                      {t('rooms.room', { number: item.roomNumber })}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 13, color: colors.mutedForeground }}>
                      {item.floor ? t('rooms.floor', { floor: item.floor }) : t('rooms.floorMissing')}
                      {item.type ? ` - ${item.type}` : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        borderRadius: radii.pill,
                        backgroundColor: done ? colors.muted : inProgress ? '#fef3c7' : colors.muted,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: done ? colors.foreground : inProgress ? '#92400e' : colors.foreground }}>
                        {isStarting
                          ? t('rooms.starting')
                          : t(item.status === 'READY' ? 'status.ready' : item.status === 'CLEANING' ? 'status.cleaning' : item.status === 'STAY_OVER' ? 'status.stayOver' : 'status.checkout')}
                      </Text>
                    </View>
                    {elapsed ? (
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400e' }}>{elapsed}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={{ marginTop: 12, height: 7, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.border }}>
                  <View style={{ width: `${progress}%`, height: '100%', borderRadius: radii.pill, backgroundColor: done ? colors.success : colors.primary }} />
                </View>
                <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {t('rooms.completePercent', { percent: progress })}
                  </Text>
                  {openIncidents.length > 0 ? (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#f97316' }}>
                      {t('rooms.issues', { count: openIncidents.length })}
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
