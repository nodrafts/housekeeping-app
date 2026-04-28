import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { useRole } from '../modules/auth/useRole';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { selectedHotel } = useHotelStore();
  const { isAdmin } = useRole();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f3f4f6' }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 20 }}>Settings</Text>

      <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase' }}>Account</Text>
        {[
          { label: 'Name', value: user?.name ?? '—' },
          { label: 'Email', value: user?.email ?? '—' },
          { label: 'Role', value: isAdmin ? 'Admin' : 'Staff' },
          { label: 'Hotel', value: selectedHotel?.name ?? user?.hotelName ?? '—' },
        ].map((row) => (
          <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>{row.label}</Text>
            <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '500' }}>{row.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => Alert.alert('Sign out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: logout },
        ])}
        style={{ backgroundColor: '#fff1f2', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#b91c1c' }}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
