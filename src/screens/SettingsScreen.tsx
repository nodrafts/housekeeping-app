import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { useRole } from '../modules/auth/useRole';
import { useTranslation } from 'react-i18next';
import { appLanguage, changeAppLanguage, type AppLanguage } from '../i18n';
import { colors, radii } from '../lib/theme';

export function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { selectedHotel } = useHotelStore();
  const { isAdmin } = useRole();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 96 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 20 }}>{t('settings.title')}</Text>

      <View style={{ backgroundColor: colors.card, borderRadius: radii.md, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase' }}>{t('settings.language')}</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: colors.mutedForeground }}>{t('settings.languageDescription')}</Text>
        <View style={{ marginTop: 14, flexDirection: 'row', borderRadius: radii.md, padding: 3, backgroundColor: colors.muted }}>
          {(['en', 'es'] as AppLanguage[]).map((language) => {
            const selected = appLanguage() === language;
            return (
              <TouchableOpacity
                key={language}
                onPress={() => changeAppLanguage(language)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: selected ? colors.card : 'transparent' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? colors.primary : colors.mutedForeground }}>
                  {t(language === 'en' ? 'settings.english' : 'settings.spanish')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: radii.md, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 12, textTransform: 'uppercase' }}>{t('settings.account')}</Text>
        {[
          { label: t('settings.name'), value: user?.name ?? '—' },
          { label: t('settings.email'), value: user?.email ?? '—' },
          { label: t('settings.role'), value: t(isAdmin ? 'settings.admin' : 'settings.staff') },
          { label: t('settings.hotel'), value: selectedHotel?.name ?? user?.hotelName ?? '—' },
        ].map((row) => (
          <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>{row.label}</Text>
            <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '500' }}>{row.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => Alert.alert(t('settings.logoutTitle'), t('settings.logoutConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.logout'), style: 'destructive', onPress: logout },
        ])}
        style={{ backgroundColor: '#fff1f2', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#b91c1c' }}>{t('common.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
