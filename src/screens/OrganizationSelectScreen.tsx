import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { colors, radii } from '../lib/theme';
import { useAuth } from '../modules/auth/useAuth';

type Organization = { id: string; code: string; name: string };

async function fetchOrganizations() {
  const response = await api.get<{ data: Organization[] }>('/api/v1/orgs');
  return response.data.data ?? [];
}

export function OrganizationSelectScreen() {
  const { t } = useTranslation();
  const { selectOrganization, logout, loading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState(false);
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-admin-organizations'],
    queryFn: fetchOrganizations,
  });

  const handleContinue = async () => {
    if (!selectedId) return;
    setSelectionError(false);
    try {
      await selectOrganization(selectedId);
    } catch {
      setSelectionError(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.foreground }}>
          {t('auth.selectOrganization')}
        </Text>
        <Text style={{ marginTop: 8, marginBottom: 22, fontSize: 15, lineHeight: 21, color: colors.mutedForeground }}>
          {t('auth.selectOrganizationSubtitle')}
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
        ) : isError ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.destructive, marginBottom: 14 }}>{t('auth.loadOrganizationsFailed')}</Text>
            <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10 }}
            ListEmptyComponent={<Text style={{ color: colors.mutedForeground }}>{t('auth.noOrganizations')}</Text>}
            renderItem={({ item }) => {
              const selected = selectedId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedId(item.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={{
                    minHeight: 68,
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: radii.md,
                    backgroundColor: colors.card,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{item.name}</Text>
                  <Text style={{ marginTop: 3, fontSize: 13, color: colors.mutedForeground }}>{item.code}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {selectionError ? (
          <Text style={{ marginTop: 12, color: colors.destructive, textAlign: 'center' }}>
            {t('auth.selectOrganizationFailed')}
          </Text>
        ) : null}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedId || loading}
          accessibilityRole="button"
          style={{
            height: 48,
            marginTop: 16,
            borderRadius: radii.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            opacity: selectedId && !loading ? 1 : 0.45,
          }}
        >
          <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '800' }}>
            {loading ? t('auth.selectingOrganization') : t('common.continue')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} accessibilityRole="button" style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>{t('common.signOut')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
