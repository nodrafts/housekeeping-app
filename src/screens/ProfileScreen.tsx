import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Screen } from '../components/layout/Screen';
import { useAuth } from '../modules/auth/useAuth';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

export function ProfileScreen({}: Props) {
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

          {user?.hotelId ? (
            <View className="mt-4">
              <Text className="text-sm font-medium text-slate-500">
                Hotel
              </Text>
              <Text className="text-base text-slate-900">
                {user.hotelId}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={logout}
          className="mt-auto h-11 items-center justify-center rounded-full bg-slate-900"
        >
          <Text className="text-sm font-semibold text-white">
            Sign out
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

