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

export function ReportIssueScreen({ navigation, route }: Props) {
  const { assignmentId } = route.params;
  const inventoryQuery = useInventory('');
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

  const { data: assignment } = useAssignment(assignmentId);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedItem || !selectedIssue || !selectedCategory || !selectedSeverity) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    const roomNumber = assignment?.roomNumber ?? 'Unknown';
    try {
      setSubmitting(true);
      await createIncident.mutateAsync({
        assignmentId,
        roomNumber,
        tier: selectedTier ?? 'MOVABLE',
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        issue: selectedIssue,
        category: selectedCategory,
        severity: selectedSeverity,
      });
      Alert.alert('Issue reported', `${selectedItem.name} - ${selectedIssue}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Could not send incident', getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 }}>
          Report an issue
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Choose the item type, item, and issue for this room.
        </Text>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>Item type</Text>
        <TouchableOpacity onPress={() => setOpenDropdown('type')} style={[DROPDOWN_BOX, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, color: selectedTier ? '#111827' : '#9ca3af' }}>
            {selectedTier === 'MOVABLE' ? 'Movable' : selectedTier === 'FIXED' ? 'Fixed' : 'Select item type'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>Item</Text>
        <TouchableOpacity
          onPress={() => selectedTier && setOpenDropdown('item')}
          style={[DROPDOWN_BOX, { marginBottom: 16, opacity: selectedTier ? 1 : 0.6 }]}
          disabled={!selectedTier}
        >
          <Text style={{ fontSize: 14, color: selectedItem ? '#111827' : '#9ca3af' }}>
            {selectedItem?.name ?? (selectedTier ? 'Select item' : 'Select item type first')}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>Issue</Text>
        <TouchableOpacity
          onPress={() => selectedItem && setOpenDropdown('issue')}
          style={[DROPDOWN_BOX, { marginBottom: 16, opacity: selectedItem ? 1 : 0.6 }]}
          disabled={!selectedItem}
        >
          <Text style={{ fontSize: 14, color: selectedIssue ? '#111827' : '#9ca3af' }}>
            {selectedIssue ?? (selectedItem ? 'Select issue' : 'Select item first')}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>Category</Text>
        <TouchableOpacity onPress={() => setOpenDropdown('category')} style={[DROPDOWN_BOX, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, color: selectedCategory ? '#111827' : '#9ca3af' }}>
            {CATEGORY_OPTIONS.find((o) => o.key === selectedCategory)?.label ?? 'Select category'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 8 }}>Severity</Text>
        <TouchableOpacity onPress={() => setOpenDropdown('severity')} style={[DROPDOWN_BOX, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, color: selectedSeverity ? '#111827' : '#9ca3af' }}>
            {SEVERITY_OPTIONS.find((o) => o.key === selectedSeverity)?.label ?? 'Select severity'}
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
                    <Text style={{ fontSize: 15, color: '#111827' }}>{item.label}</Text>
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
                ? <Text style={{ padding: 16, fontSize: 13, color: '#6b7280' }}>No issues found for this item.</Text>
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
                    <Text style={{ fontSize: 15, color: '#111827' }}>{item.label}</Text>
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
                    <Text style={{ fontSize: 15, color: '#111827' }}>{item.label}</Text>
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
            {submitting ? 'Sending...' : 'Send report'}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

