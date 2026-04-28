import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { useHotels } from '../modules/hotel/useHotels';
import { useHotelStore } from '../modules/hotel/useHotelStore';

type Props = NativeStackScreenProps<AppStackParamList, 'HotelSelect'>;

export function HotelSelectScreen({ navigation }: Props) {
  const { data: hotels = [], isLoading, isError, refetch } = useHotels();
  const { selectedHotel, setSelectedHotel } = useHotelStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pending, setPending] = useState(selectedHotel);

  const handleConfirm = () => {
    if (!pending) return;
    setSelectedHotel(pending);
    navigation.reset({
      index: 1,
      routes: [{ name: 'HotelSelect' }, { name: 'RoomsList' }],
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ width: '100%', backgroundColor: '#ffffff', borderRadius: 16, padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 }}>
          Select your property
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
          Choose the hotel you are working at today.
        </Text>

        {isLoading ? (
          <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 16 }} />
        ) : isError ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: '#dc2626', marginBottom: 8 }}>Could not load properties.</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={{ fontSize: 13, color: '#2563eb' }}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Dropdown trigger */}
            <TouchableOpacity
              onPress={() => setDropdownOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#d1d5db',
                backgroundColor: '#f9fafb',
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 14, color: pending ? '#111827' : '#9ca3af', flex: 1, paddingRight: 8 }} numberOfLines={1}>
                {pending?.name ?? 'Select a property'}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>▾</Text>
            </TouchableOpacity>

            {/* Dropdown modal */}
            <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
              <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
                onPress={() => setDropdownOpen(false)}
              >
                <View style={{ backgroundColor: '#ffffff', borderRadius: 12, maxHeight: 360 }} onStartShouldSetResponder={() => true}>
                  <FlatList
                    data={hotels}
                    keyExtractor={(h) => h.hotelCode}
                    renderItem={({ item }) => {
                      const isSelected = pending?.hotelCode === item.hotelCode;
                      return (
                        <TouchableOpacity
                          onPress={() => { setPending(item); setDropdownOpen(false); }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            borderBottomWidth: 1,
                            borderBottomColor: '#f3f4f6',
                            backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          }}
                        >
                          <Text style={{ fontSize: 14, color: isSelected ? '#1d4ed8' : '#111827', flex: 1, paddingRight: 8 }} numberOfLines={2}>
                            {item.name}
                          </Text>
                          {isSelected && <Text style={{ fontSize: 14, color: '#2563eb' }}>✓</Text>}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </Pressable>
            </Modal>
          </>
        )}

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!pending}
          style={{
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            backgroundColor: '#2563eb',
            opacity: pending ? 1 : 0.4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
