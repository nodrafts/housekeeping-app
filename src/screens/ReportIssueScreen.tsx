import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Screen } from '../components/layout/Screen';
import { useAssignment } from '../modules/housekeeping/useAssignment';
import { useInventory, filterInventoryByTier } from '../modules/housekeeping/useInventory';
import type { InventoryItem } from '../modules/housekeeping/inventoryTypes';
import { useCreateIncident } from '../modules/housekeeping/useCreateIncident';
import type { IncidentCategory, IncidentSeverity } from '../modules/housekeeping/useCreateIncident';
import { getApiErrorMessage } from '../lib/api';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<AppStackParamList, 'ReportIssue'>;

const FALLBACK_INVENTORY: InventoryItem[] = [
  { id: 'chair', name: 'Desk chair', tier: 'MOVABLE', commonIssues: ['Broken leg', 'Wobbly', 'Stained upholstery'] },
  { id: 'microwave', name: 'Microwave', tier: 'MOVABLE', commonIssues: ['Not heating', "Door won't close", 'Display not working'] },
  { id: 'iron-board', name: 'Iron / ironing board', tier: 'MOVABLE', commonIssues: ['Board cover damaged', 'Iron leaking', 'Cord frayed'] },
  { id: 'toilet', name: 'Toilet', tier: 'FIXED', commonIssues: ['Clogged', 'Leaking', 'Running', 'Seat loose'] },
  { id: 'sink', name: 'Sink / Faucet', tier: 'FIXED', commonIssues: ['Leaking', 'Low pressure', 'Drain slow', 'Faucet loose'] },
];

const DROPDOWN_BOX = {
  paddingHorizontal: 12,
  paddingVertical: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#d1d5db',
  backgroundColor: '#ffffff',
  minHeight: 44,
  justifyContent: 'center' as const,
};

const CATEGORY_OPTIONS: { key: IncidentCategory; label: string }[] = [
  { key: 'SAFETY_MEDICAL', label: 'Safety / Medical' },
  { key: 'SECURITY', label: 'Security' },
  { key: 'FACILITIES', label: 'Facilities' },
  { key: 'LOST_AND_FOUND', label: 'Lost & Found' },
  { key: 'COMPLIANCE_RISK', label: 'Compliance / Risk' },
  { key: 'OTHER', label: 'Other' },
];

const SEVERITY_OPTIONS: { key: IncidentSeverity; label: string }[] = [
  { key: 'LOW', label: 'Low' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HIGH', label: 'High' },
  { key: 'CRITICAL', label: 'Critical' },
];

const CATEGORY_TRANSLATION_KEYS: Record<IncidentCategory, string> = {
  SAFETY_MEDICAL: 'issue.safetyMedical',
  SECURITY: 'issue.security',
  FACILITIES: 'issue.facilities',
  LOST_AND_FOUND: 'issue.lostFound',
  COMPLIANCE_RISK: 'issue.complianceRisk',
  OTHER: 'issue.other',
};

export function ReportIssueScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { assignmentId } = route.params;
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const inventoryQuery = useInventory(hotelCode);
  const createIncident = useCreateIncident();

  const [selectedTier, setSelectedTier] = useState<'MOVABLE' | 'FIXED' | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<IncidentSeverity | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'type' | 'item' | 'issue' | 'category' | 'severity' | null>(null);

  const items = useMemo(() => {
    const source = inventoryQuery.data && inventoryQuery.data.length > 0 ? inventoryQuery.data : FALLBACK_INVENTORY;
    return filterInventoryByTier(source, selectedTier);
  }, [inventoryQuery.data, selectedTier]);

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;
  const tierForFallback = selectedTier ?? selectedItem?.tier ?? null;
  const fallbackItemsForTier = tierForFallback != null ? filterInventoryByTier(FALLBACK_INVENTORY, tierForFallback) : FALLBACK_INVENTORY;

  const normalizeForMatch = (s: string) =>
    s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

  const fallbackSelectedItem = selectedItem != null
    ? fallbackItemsForTier.find(
        (i) =>
          i.id === selectedItem.id ||
          normalizeForMatch(i.name) === normalizeForMatch(selectedItem.name) ||
          normalizeForMatch(selectedItem.name).includes(normalizeForMatch(i.name)) ||
          normalizeForMatch(i.name).includes(normalizeForMatch(selectedItem.name)),
      ) ?? null
    : null;

  const issues =
    selectedItem?.commonIssues && selectedItem.commonIssues.length > 0
      ? selectedItem.commonIssues
      : fallbackSelectedItem?.commonIssues?.length
          ? fallbackSelectedItem.commonIssues
          : Array.from(new Set(fallbackItemsForTier.flatMap((i) => i.commonIssues ?? []).filter(Boolean)));

  const { data: assignment } = useAssignment(assignmentId, hotelCode);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedItem || !selectedIssue || !selectedCategory || !selectedSeverity) {
      Alert.alert(t('issue.missingInfo'), t('issue.fillAll'));
      return;
    }
    const roomNumber = assignment?.roomNumber ?? 'Unknown';
    try {
      setSubmitting(true);
      await createIncident.mutateAsync({
        hotelCode,
        assignmentId,
        roomNumber,
        unitType: assignment?.type,
        title: `${selectedItem.name}: ${selectedIssue}`,
        description: selectedIssue,
        incidentType: selectedItem.name,
        category: selectedCategory,
        severity: selectedSeverity,
      });
      Alert.alert(t('issue.reported'), `${selectedItem.name} - ${selectedIssue}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(t('issue.couldNotSend'), getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 }}>
          {t('issue.report')}
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          {t('issue.instructions')}
        </Text>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>{t('issue.itemType')}</Text>
        <TouchableOpacity onPress={() => setOpenDropdown('type')} style={[DROPDOWN_BOX, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, color: selectedTier ? '#111827' : '#9ca3af' }}>
            {selectedTier === 'MOVABLE' ? t('issue.movable') : selectedTier === 'FIXED' ? t('issue.fixed') : t('issue.selectItemType')}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>{t('issue.item')}</Text>
        <TouchableOpacity
          onPress={() => selectedTier && setOpenDropdown('item')}
          style={[DROPDOWN_BOX, { marginBottom: 16, opacity: selectedTier ? 1 : 0.6 }]}
          disabled={!selectedTier}
        >
          <Text style={{ fontSize: 14, color: selectedItem ? '#111827' : '#9ca3af' }}>
            {selectedItem?.name ?? (selectedTier ? t('issue.selectItem') : t('issue.selectItemTypeFirst'))}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>{t('issue.issue')}</Text>
        <TouchableOpacity
          onPress={() => selectedItem && setOpenDropdown('issue')}
          style={[DROPDOWN_BOX, { marginBottom: 16, opacity: selectedItem ? 1 : 0.6 }]}
          disabled={!selectedItem}
        >
          <Text style={{ fontSize: 14, color: selectedIssue ? '#111827' : '#9ca3af' }}>
            {selectedIssue ?? (selectedItem ? t('issue.selectIssue') : t('issue.selectItemFirst'))}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>{t('issue.category')}</Text>
        <TouchableOpacity onPress={() => setOpenDropdown('category')} style={[DROPDOWN_BOX, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, color: selectedCategory ? '#111827' : '#9ca3af' }}>
            {selectedCategory ? t(CATEGORY_TRANSLATION_KEYS[selectedCategory]) : t('issue.selectCategory')}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>{t('issue.severity')}</Text>
        <TouchableOpacity onPress={() => setOpenDropdown('severity')} style={[DROPDOWN_BOX, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, color: selectedSeverity ? '#111827' : '#9ca3af' }}>
            {selectedSeverity ? t(`issue.${selectedSeverity.toLowerCase()}`) : t('issue.selectSeverity')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={openDropdown !== null} transparent animationType="fade" onRequestClose={() => setOpenDropdown(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setOpenDropdown(null)}
        >
          <View style={{ backgroundColor: '#ffffff', borderRadius: 12, maxHeight: 320 }} onStartShouldSetResponder={() => true}>
            {openDropdown === 'type' && (
              <FlatList
                data={[{ key: 'MOVABLE', label: 'Movable' }, { key: 'FIXED', label: 'Fixed' }]}
                keyExtractor={(o) => o.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { setSelectedTier(item.key as 'MOVABLE' | 'FIXED'); setSelectedItemId(null); setSelectedIssue(null); setOpenDropdown(null); }}
                    style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                  >
                    <Text style={{ fontSize: 15, color: '#111827' }}>{t(item.key === 'MOVABLE' ? 'issue.movable' : 'issue.fixed')}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            {openDropdown === 'item' && (
              <FlatList
                data={items}
                keyExtractor={(o) => o.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { setSelectedItemId(item.id); setSelectedIssue(null); setOpenDropdown(null); }}
                    style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                  >
                    <Text style={{ fontSize: 15, color: '#111827' }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            {openDropdown === 'issue' && (
              issues.length === 0
                ? <Text style={{ padding: 16, fontSize: 13, color: '#6b7280' }}>{t('issue.noIssues')}</Text>
                : <FlatList
                    data={issues}
                    keyExtractor={(o) => o}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => { setSelectedIssue(item); setOpenDropdown(null); }}
                        style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                      >
                        <Text style={{ fontSize: 15, color: '#111827' }}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
            )}
            {openDropdown === 'category' && (
              <FlatList
                data={CATEGORY_OPTIONS}
                keyExtractor={(o) => o.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { setSelectedCategory(item.key); setOpenDropdown(null); }}
                    style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                  >
                    <Text style={{ fontSize: 15, color: '#111827' }}>{t(CATEGORY_TRANSLATION_KEYS[item.key])}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            {openDropdown === 'severity' && (
              <FlatList
                data={SEVERITY_OPTIONS}
                keyExtractor={(o) => o.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { setSelectedSeverity(item.key); setOpenDropdown(null); }}
                    style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                  >
                    <Text style={{ fontSize: 15, color: '#111827' }}>{t(`issue.${item.key.toLowerCase()}`)}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>

      <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: '#2563eb', opacity: submitting ? 0.7 : 1 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>
            {submitting ? t('issue.sending') : t('issue.sendReport')}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

