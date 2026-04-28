import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, Pressable, ScrollView,
  TouchableOpacity, FlatList, TextInput, Alert,
} from 'react-native';
import type { InventoryItem, InventoryTier } from '../modules/housekeeping/inventoryTypes';
import { useInventory } from '../modules/housekeeping/useInventory';
import { useCreateIncident } from '../modules/housekeeping/useCreateIncident';
import { addLocalIncident } from '../modules/housekeeping/useIncidents';
import { realtimeChatClient } from '../modules/chat/realtimeClient';
import { createMessageId } from '../modules/chat/avro';
import { getApiErrorMessage } from '../lib/api';

// ─── Fallback inventory (full list) ──────────────────────────────────────────
const FALLBACK_INVENTORY: InventoryItem[] = [
  { id: 'desk-chair', name: 'Desk Chair', tier: 'MOVABLE', commonIssues: ['Broken leg', 'Wheels stuck', 'Armrest loose', 'Stained'] },
  { id: 'microwave', name: 'Microwave', tier: 'MOVABLE', commonIssues: ['Does not turn on', 'Not heating', 'Door will not close', 'Display not working'] },
  { id: 'generator', name: 'Generator', tier: 'FIXED', commonIssues: ['Will not start', 'No output', 'Leaking fuel', 'Strange noise'] },
  { id: 'dryer', name: 'Dryer', tier: 'MOVABLE', commonIssues: ['Will not start', 'Not heating', 'Takes too long to dry', 'Loud noise'] },
  { id: 'mattress', name: 'Mattress', tier: 'MOVABLE', commonIssues: ['Stained', 'Sagging', 'Springs poking', 'Torn cover'] },
  { id: 'safe', name: 'Safe', tier: 'MOVABLE', commonIssues: ['Will not open', 'Lock jammed', 'Keypad not working'] },
  { id: 'boiler', name: 'Boiler', tier: 'FIXED', commonIssues: ['No heating', 'Leaking', 'Low pressure', 'Error code on panel'] },
  { id: 'smoke-detector', name: 'Smoke Detector', tier: 'FIXED', commonIssues: ['Beeping', 'Not working', 'Needs battery'] },
  { id: 'washer', name: 'Washer', tier: 'MOVABLE', commonIssues: ['Will not start', 'Not draining', 'Leaking', 'Shaking / moving'] },
  { id: 'fire-extinguisher', name: 'Fire Extinguisher', tier: 'FIXED', commonIssues: ['Expired', 'Damaged', 'Pressure low', 'Missing'] },
  { id: 'ptac-unit', name: 'PTAC Unit', tier: 'MOVABLE', commonIssues: ['Not cooling', 'Strange smell', 'Noisy', 'Controls not responding'] },
  { id: 'iron-board', name: 'Iron / Ironing Board', tier: 'MOVABLE', commonIssues: ['Board cover damaged', 'Iron leaking', 'Cord damaged', 'Does not heat'] },
  { id: 'rollaway-bed', name: 'Rollaway Bed', tier: 'MOVABLE', commonIssues: ['Mattress damaged', 'Wheels broken', 'Frame bent'] },
  { id: 'luggage-rack', name: 'Luggage Rack', tier: 'MOVABLE', commonIssues: ['Straps missing', 'Wobbly', 'Frame bent'] },
  { id: 'toilet', name: 'Toilet', tier: 'FIXED', commonIssues: ['Will not flush', 'Leaking', 'Running constantly', 'Clogged'] },
  { id: 'sink-faucet', name: 'Sink / Faucet', tier: 'FIXED', commonIssues: ['Leaking', 'Low pressure', 'Handle broken', 'Drain slow / clogged'] },
  { id: 'coffee-maker', name: 'Coffee Maker', tier: 'MOVABLE', commonIssues: ['Will not brew', 'Leaking', 'Not heating', 'Broken carafe'] },
  { id: 'bed-frame', name: 'Bed Frame', tier: 'MOVABLE', commonIssues: ['Broken slat', 'Squeaking', 'Frame cracked', 'Wobbly'] },
  { id: 'crib', name: 'Crib', tier: 'MOVABLE', commonIssues: ['Broken slat', 'Wobbly', 'Missing hardware', 'Damaged mattress'] },
  { id: 'tv', name: 'TV', tier: 'FIXED', commonIssues: ['No picture', 'No sound', 'Remote not working', 'Screen cracked'] },
  { id: 'mini-fridge', name: 'Mini Fridge', tier: 'MOVABLE', commonIssues: ['Not cooling', 'Leaking', 'Noisy', 'Door seal broken'] },
  { id: 'nightstand', name: 'Nightstand', tier: 'MOVABLE', commonIssues: ['Drawer stuck', 'Wobbly', 'Damaged surface'] },
  { id: 'lamp', name: 'Lamp', tier: 'MOVABLE', commonIssues: ['Not turning on', 'Flickering', 'Shade damaged', 'Cord frayed'] },
  { id: 'shower-head', name: 'Shower Head', tier: 'FIXED', commonIssues: ['Low pressure', 'Leaking', 'Clogged', 'Broken mount'] },
  { id: 'pool-equipment', name: 'Pool Equipment', tier: 'FIXED', commonIssues: ['Not working', 'Leaking', 'Damaged', 'Needs service'] },
  { id: 'elevator', name: 'Elevator', tier: 'FIXED', commonIssues: ['Not working', 'Door not closing', 'Strange noise', 'Stuck'] },
  { id: 'hvac-unit', name: 'HVAC Unit', tier: 'FIXED', commonIssues: ['Not cooling', 'Not heating', 'Strange smell', 'Noisy'] },
  { id: 'hair-dryer', name: 'Hair Dryer', tier: 'MOVABLE', commonIssues: ['Not turning on', 'Overheating', 'Cord damaged'] },
  { id: 'curtains-drapes', name: 'Curtains / Drapes', tier: 'FIXED', commonIssues: ['Rod broken', 'Torn', 'Track stuck', 'Missing hooks'] },
];

const GENERIC_MOVABLE = ['Damaged', 'Not working', 'Missing', 'Needs replacement'];
const GENERIC_FIXED = ['Not working', 'Leaking', 'Damaged', 'Needs repair'];

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getIssuesForItem(item: InventoryItem): string[] {
  if (item.commonIssues && item.commonIssues.length > 0) return item.commonIssues;
  const fb = FALLBACK_INVENTORY.find(
    (f) => f.id === item.id || normalize(f.name) === normalize(item.name),
  );
  if (fb?.commonIssues?.length) return fb.commonIssues;
  return item.tier === 'FIXED' ? GENERIC_FIXED : GENERIC_MOVABLE;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ReportIssueModalProps {
  visible: boolean;
  roomNumber: string;
  assignmentId: string;
  hotelCode: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ReportIssueModal({
  visible, roomNumber, assignmentId, hotelCode, onClose, onSuccess,
}: ReportIssueModalProps) {
  const inventoryQuery = useInventory(hotelCode);
  const createIncident = useCreateIncident();

  const allInventory = useMemo<InventoryItem[]>(() => {
    const src = inventoryQuery.data && inventoryQuery.data.length > 0
      ? inventoryQuery.data : FALLBACK_INVENTORY;
    return src;
  }, [inventoryQuery.data]);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<Record<string, string[]>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSelectedItemIds([]);
    setSelectedIssues({});
    setOtherTexts({});
    setPickerOpen(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(itemId)) {
        setSelectedIssues((s) => { const n = { ...s }; delete n[itemId]; return n; });
        setOtherTexts((s) => { const n = { ...s }; delete n[itemId]; return n; });
        return prev.filter((id) => id !== itemId);
      }
      return [...prev, itemId];
    });
  };

  const toggleIssue = (itemId: string, issue: string) => {
    setSelectedIssues((prev) => {
      const cur = prev[itemId] ?? [];
      return { ...prev, [itemId]: cur.includes(issue) ? cur.filter((i) => i !== issue) : [...cur, issue] };
    });
  };

  const submit = async () => {
    if (selectedItemIds.length === 0) {
      Alert.alert('Missing info', 'Please select at least one item.'); return;
    }

    // Build pairs and validate
    const pairs: { item: InventoryItem; issue: string }[] = [];
    for (const itemId of selectedItemIds) {
      const item = allInventory.find((i) => i.id === itemId);
      if (!item) continue;
      const chosen = selectedIssues[itemId] ?? [];
      const resolved = chosen.map((iss) => iss === 'Others' ? (otherTexts[itemId]?.trim() ?? '') : iss).filter(Boolean);
      if (resolved.length === 0) {
        Alert.alert('Missing info', `Select at least one issue for ${item.name}.`); return;
      }
      for (const issue of resolved) pairs.push({ item, issue });
    }

    try {
      setSubmitting(true);
      for (const { item, issue } of pairs) {
        const result = await createIncident.mutateAsync({
          assignmentId,
          roomNumber,
          tier: (item.tier as InventoryTier) ?? 'MOVABLE',
          itemId: item.id,
          itemName: item.name,
          issue,
          category: 'FACILITIES',
          severity: 'MEDIUM',
          hotelCode,
        }).catch(() => null);

        const incidentId = result?.id ?? `local-${Date.now()}-${item.id}`;

        addLocalIncident(roomNumber, {
          id: incidentId,
          roomNumber,
          itemName: item.name,
          issue,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          category: 'FACILITIES',
          severity: 'MEDIUM',
        });

        realtimeChatClient.sendTextToChannel({
          channelName: 'housekeeping-maintenance',
          text: `[INCIDENT:${incidentId}] Room ${roomNumber} | ${item.name}: ${issue}`,
          messageId: createMessageId(),
        });
      }

      const summary = pairs.map((p) => `${p.item.name}: ${p.issue}`).join('\n');
      Alert.alert('Issues reported', summary, [
        { text: 'OK', onPress: () => { handleClose(); onSuccess?.(); } },
      ]);
    } catch (err) {
      Alert.alert('Could not send report', getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Main report modal */}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={handleClose}
        >
          <View
            style={{ backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, maxHeight: 620 }}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 }}>
                Report an issue — Room {roomNumber}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
                Select one or more items and their issues.
              </Text>

              {/* Item picker trigger */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Items</Text>
              <TouchableOpacity
                onPress={() => setPickerOpen(true)}
                style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: selectedItemIds.length > 0 ? '#2563eb' : '#d1d5db', backgroundColor: '#f9fafb', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: selectedItemIds.length > 0 ? '#0f172a' : '#9ca3af' }}>
                  {selectedItemIds.length > 0 ? `${selectedItemIds.length} item${selectedItemIds.length > 1 ? 's' : ''} selected` : 'Select items…'}
                </Text>
                <Text style={{ color: '#9ca3af' }}>▾</Text>
              </TouchableOpacity>

              {/* Selected item chips */}
              {selectedItemIds.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {selectedItemIds.map((itemId) => {
                    const item = allInventory.find((i) => i.id === itemId);
                    if (!item) return null;
                    return (
                      <View key={itemId} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#2563eb' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563eb', marginRight: 6 }}>✓ {item.name}</Text>
                        <TouchableOpacity onPress={() => toggleItem(itemId)}>
                          <Text style={{ fontSize: 13, color: '#2563eb' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Per-item issue chips */}
              {selectedItemIds.map((itemId) => {
                const item = allInventory.find((i) => i.id === itemId);
                if (!item) return null;
                const itemIssues = getIssuesForItem(item);
                const chosen = selectedIssues[itemId] ?? [];
                return (
                  <View key={itemId} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                      Issues — {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      {[...itemIssues, 'Others'].map((issue) => {
                        const active = chosen.includes(issue);
                        return (
                          <TouchableOpacity
                            key={issue}
                            onPress={() => toggleIssue(itemId, issue)}
                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: active ? '#2563eb' : '#d1d5db', backgroundColor: active ? '#eff6ff' : '#ffffff' }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: active ? '700' : '400', color: active ? '#2563eb' : '#374151' }}>
                              {active ? `✓ ${issue}` : issue}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {chosen.includes('Others') && (
                      <TextInput
                        value={otherTexts[itemId] ?? ''}
                        onChangeText={(t) => setOtherTexts((prev) => ({ ...prev, [itemId]: t }))}
                        placeholder="Describe the issue…"
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={3}
                        style={{ borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#f9fafb', minHeight: 80, textAlignVertical: 'top' }}
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={submit}
              disabled={submitting}
              style={{ marginTop: 8, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: '#2563eb', opacity: submitting ? 0.7 : 1 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>
                {submitting ? 'Sending…' : 'Send report'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Item picker modal — multi-select */}
      <Modal visible={visible && pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} onPress={() => setPickerOpen(false)}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 12, maxHeight: 440 }} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#0f172a' }}>Select items</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#2563eb' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#ffffff' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={allInventory}
              keyExtractor={(o) => o.id}
              renderItem={({ item: o }) => {
                const selected = selectedItemIds.includes(o.id);
                return (
                  <TouchableOpacity
                    onPress={() => toggleItem(o.id)}
                    style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: selected ? '#eff6ff' : '#ffffff' }}
                  >
                    <Text style={{ fontSize: 15, color: selected ? '#2563eb' : '#111827', fontWeight: selected ? '600' : '400' }}>{o.name}</Text>
                    {selected && <Text style={{ color: '#2563eb', fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
