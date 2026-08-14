import React from 'react';
import { Alert, View, Text, TouchableOpacity } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { useAuth } from '../modules/auth/useAuth';
import { TIME_ZONE_OPTIONS, useTimeZone } from '../modules/settings/timeZoneStore';
import { colors, radii } from '../lib/theme';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { timeZone, setTimeZone } = useTimeZone();

  return (
    <Screen>
      <View className="flex-1 px-6 py-6">
        <Text className="text-xl font-semibold text-slate-900 mb-4">
          Profile
        </Text>

        <View className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <Text className="text-sm font-medium text-slate-500">
            Name
          </Text>
          <Text className="text-base text-slate-900">
            {user?.name ?? 'Housekeeper'}
          </Text>

          <View className="mt-4">
            <Text className="text-sm font-medium text-slate-500">
              Email
            </Text>
            <Text className="text-base text-slate-900">
              {user?.email ?? 'demo@example.com'}
            </Text>
          </View>

          {user?.hotelCode ? (
            <View className="mt-4">
              <Text className="text-sm font-medium text-slate-500">
                Hotel
              </Text>
              <Text className="text-base text-slate-900">
                {user.hotelCode}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <Text className="text-base font-semibold text-slate-900">
            Timezone
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Used to load today's housekeeping work.
          </Text>

          <View style={{ marginTop: 12, gap: 8 }}>
            {TIME_ZONE_OPTIONS.map((option) => {
              const selected = option.value === timeZone;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setTimeZone(option.value)}
                  style={{
                    minHeight: 44,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? '#eff6ff' : colors.card,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? colors.primary : colors.foreground }}>
                      {option.label}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground }}>
                      {option.value}
                    </Text>
                  </View>
                  {selected ? (
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
          ])}
          className="mt-auto h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50"
        >
          <Text className="text-sm font-semibold text-red-700">
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

