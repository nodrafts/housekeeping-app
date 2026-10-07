import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radii } from '../lib/theme';
import { useAuth } from '../modules/auth/useAuth';
import { useHotels } from '../modules/hotel/useHotels';
import { type Hotel, useHotelStore } from '../modules/hotel/useHotelStore';
import { Icon } from './ui/Icon';

type Props = {
  variant?: 'primary' | 'light';
  onHotelChange?: (hotel: Hotel) => void;
};

export function HotelSelector({ variant = 'light', onHotelChange }: Props) {
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedHotel, setSelectedHotel } = useHotelStore();
  const [open, setOpen] = useState(false);
  const fallbackHotels = useMemo(() => {
    const seen = new Set<string>();
    const hotels: Hotel[] = [];
    const addHotel = (code?: string | null, name?: string | null) => {
      const normalizedCode = code?.trim().toUpperCase();
      if (!normalizedCode || seen.has(normalizedCode)) return;
      seen.add(normalizedCode);
      hotels.push({ hotelCode: normalizedCode, name: name?.trim() || normalizedCode });
    };

    addHotel(user?.hotelCode, user?.hotelName);
    user?.assignedHotels?.forEach((code) => addHotel(code, code));
    return hotels;
  }, [user?.assignedHotels, user?.hotelCode, user?.hotelName]);
  const hotelsQuery = useHotels(user?.assignedHotels, user?.canAccessAllHotels);
  const hotels = hotelsQuery.data && hotelsQuery.data.length > 0 ? hotelsQuery.data : fallbackHotels;
  const selectedCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? hotels[0]?.hotelCode;
  const selectedName = selectedHotel?.name ?? user?.hotelName ?? selectedCode ?? t('auth.selectHotel');
  const primary = variant === 'primary';

  useEffect(() => {
    const matchingHotel = hotels.find((hotel) => hotel.hotelCode === selectedCode);
    if (matchingHotel && selectedHotel?.name !== matchingHotel.name) {
      setSelectedHotel(matchingHotel);
    }
  }, [hotels, selectedCode, selectedHotel?.name, setSelectedHotel]);

  const selectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setOpen(false);
    onHotelChange?.(hotel);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{
          width: '100%',
          minHeight: 44,
          paddingHorizontal: 13,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: primary ? 'rgba(255,255,255,0.32)' : colors.input,
          backgroundColor: primary ? colors.primary : colors.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
        }}
      >
        <Icon name="bed" size={18} color={primary ? colors.primaryForeground : colors.primary} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={{ flex: 1, fontSize: 14, fontWeight: '800', color: primary ? colors.primaryForeground : colors.foreground }}
        >
          {selectedName}
        </Text>
        <Icon name="chevron-down" size={17} color={primary ? colors.primaryForeground : colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 18,
            paddingTop: Math.max(insets.top, 18),
            paddingBottom: Math.max(insets.bottom, 18),
            backgroundColor: 'rgba(0,0,0,0.48)',
          }}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{
              width: '100%',
              maxWidth: 430,
              maxHeight: Math.min(520, screenHeight * 0.68),
              borderRadius: radii.lg,
              overflow: 'hidden',
              backgroundColor: colors.card,
            }}
          >
            <View style={{ minHeight: 60, paddingLeft: 18, paddingRight: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: colors.foreground }}>{t('auth.selectHotel')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} accessibilityRole="button" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {hotelsQuery.isLoading && hotels.length === 0 ? (
              <View style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : hotelsQuery.isError && hotels.length === 0 ? (
              <TouchableOpacity onPress={() => hotelsQuery.refetch()} style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: 18 }}>
                <Text style={{ color: colors.destructive, textAlign: 'center' }}>{t('auth.loadHotelsFailed')}</Text>
                <Text style={{ marginTop: 8, color: colors.primary, fontWeight: '800' }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            ) : hotels.length === 0 ? (
              <View style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: 18 }}>
                <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>{t('auth.noHotels')}</Text>
              </View>
            ) : (
              <FlatList
                data={hotels}
                keyExtractor={(hotel) => hotel.hotelCode}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={hotels.length > 6}
                renderItem={({ item, index }) => {
                  const isSelected = item.hotelCode === selectedCode;
                  return (
                    <TouchableOpacity
                      onPress={() => selectHotel(item)}
                      accessibilityRole="menuitem"
                      style={{
                        minHeight: 62,
                        paddingHorizontal: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: colors.border,
                        backgroundColor: isSelected ? colors.selected : colors.card,
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: isSelected ? '800' : '600', color: isSelected ? colors.primary : colors.foreground }}>{item.name}</Text>
                        {item.name !== item.hotelCode ? <Text style={{ marginTop: 3, fontSize: 12, color: colors.mutedForeground }}>{item.hotelCode}</Text> : null}
                      </View>
                      {isSelected ? <Icon name="check" size={19} color={colors.primary} strokeWidth={2.5} /> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
