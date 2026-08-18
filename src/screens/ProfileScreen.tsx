import React from 'react';
import { Alert, View, Text, TouchableOpacity } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { useAuth } from '../modules/auth/useAuth';

export function ProfileScreen() {
  const { user, logout } = useAuth();

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

