import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/layout/Screen';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { useRole } from '../modules/auth/useRole';
import { colors, radii } from '../lib/theme';

function initials(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ND';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const { isAdmin } = useRole();

  const hotelName = selectedHotel?.name ?? user?.hotelName ?? user?.hotelCode ?? '-';
  const rows = [
    { label: t('settings.name'), value: user?.name ?? '-' },
    { label: t('settings.email'), value: user?.email ?? '-' },
    { label: t('settings.role'), value: t(isAdmin ? 'settings.admin' : 'settings.staff') },
    { label: t('settings.hotel'), value: hotelName },
  ];

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 96 }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 20 }}>
          {t('profile.title')}
        </Text>

        <View style={{ backgroundColor: colors.card, borderRadius: radii.md, padding: 18, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: colors.selected,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '800' }}>
                {initials(user?.name)}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>
                {user?.name ?? t('profile.employee')}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: colors.mutedForeground }} numberOfLines={1}>
                {user?.email ?? '-'}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.mutedForeground, marginBottom: 8, textTransform: 'uppercase' }}>
            {t('settings.account')}
          </Text>

          {rows.map((row, index) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                paddingVertical: 12,
                borderBottomWidth: index === rows.length - 1 ? 0 : 1,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{row.label}</Text>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: 14, color: colors.foreground, fontWeight: '600' }} numberOfLines={2}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
