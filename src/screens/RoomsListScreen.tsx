import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export function RoomsListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const [selectedDate] = useState(dateToInput(new Date()));
  const { data = [], isLoading, refetch, isFetching } = useAssignments(hotelCode);
  const { data: allIncidents = [] } = useAllIncidents(hotelCode);
  const updateStatus = useUpdateStatus();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [filter, setFilter] = useState<'TODO' | 'READY' | 'ALL'>('TODO');

  const filteredData = useMemo(() => data.filter((item) => (
    filter === 'ALL' ? true : filter === 'READY' ? item.status === 'READY' : item.status !== 'READY'
  )), [data, filter]);
  const readyCount = data.filter((item) => item.status === 'READY').length;
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

  return (
    <Screen>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 12,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.accent,
          backgroundColor: colors.primary,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#e9dce9' }}>{selectedHotel?.name ?? hotelCode}</Text>
            <View style={{ marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
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

          <TouchableOpacity
            onPress={() => navigation.navigate('HotelSelect')}
            style={{
              maxWidth: 132,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: '#8a5b8b',
              backgroundColor: colors.accent,
            }}
          >
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', color: colors.primaryForeground }}>
              {hotelCode}
            </Text>
          </TouchableOpacity>
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
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 96 }}
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
