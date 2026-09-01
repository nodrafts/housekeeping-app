import React from 'react';
import { Alert, View, Text, TouchableOpacity } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { useAuth } from '../modules/auth/useAuth';
import { useTranslation } from 'react-i18next';

export function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <Screen>
      <View className="flex-1 px-6 py-6">
        <Text className="text-xl font-semibold text-slate-900 mb-4">
          {t('profile.title')}
        </Text>

        <View className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <Text className="text-sm font-medium text-slate-500">
            {t('settings.name')}
          </Text>
          <Text className="text-base text-slate-900">
            {user?.name ?? 'Housekeeper'}
          </Text>

          <View className="mt-4">
            <Text className="text-sm font-medium text-slate-500">
              {t('settings.email')}
            </Text>
            <Text className="text-base text-slate-900">
              {user?.email ?? 'demo@example.com'}
            </Text>
          </View>

          {user?.hotelCode ? (
            <View className="mt-4">
              <Text className="text-sm font-medium text-slate-500">
                {t('settings.hotel')}
              </Text>
              <Text className="text-base text-slate-900">
                {user.hotelCode}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => Alert.alert(t('settings.logoutTitle'), t('settings.logoutConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.logout'), style: 'destructive', onPress: logout },
          ])}
          className="mt-auto h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50"
        >
          <Text className="text-sm font-semibold text-red-700">
            {t('common.logout')}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

