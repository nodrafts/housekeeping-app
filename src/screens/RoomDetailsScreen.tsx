import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  FlatList,
  Image,
  TextInput,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Screen } from '../components/layout/Screen';
import { useAssignment, useUpdateChecklist, useUpdateStatus } from '../modules/housekeeping/useAssignment';
import { useIncidents, addLocalIncident, resolveLocalIncident, updateLocalIncident } from '../modules/housekeeping/useIncidents';
import type { Incident } from '../modules/housekeeping/useIncidents';
import type { ChecklistItem } from '../modules/housekeeping/types';
import { useInventory, filterInventoryByTier } from '../modules/housekeeping/useInventory';
import type { InventoryTier, InventoryItem } from '../modules/housekeeping/inventoryTypes';
import { useCreateIncident } from '../modules/housekeeping/useCreateIncident';
import { getApiErrorMessage } from '../lib/api';
import { realtimeChatClient } from '../modules/chat/realtimeClient';
import { createMessageId } from '../modules/chat/avro';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { ReportIssueModal } from '../components/ReportIssueModal';
type Props = NativeStackScreenProps<AppStackParamList, 'RoomDetails'>;
// Fallback inventory for when backend API isn't ready yet.
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

const GENERIC_MOVABLE_ISSUES = ['Damaged', 'Not working', 'Missing', 'Needs replacement', 'Other'];
const GENERIC_FIXED_ISSUES = ['Not working', 'Leaking', 'Damaged', 'Needs repair', 'Other'];

export function RoomDetailsScreen({ route, navigation }: Props) {
  const { assignmentId } = route.params;
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? 'default';
  const { data, isLoading } = useAssignment(assignmentId);
  const updateChecklist = useUpdateChecklist();
  const updateStatus = useUpdateStatus();
  const roomNumber = data?.roomNumber ?? '';
  const { data: incidents = [], refetch: refetchIncidents } = useIncidents(hotelCode, roomNumber);
  const [incidentsOpen, setIncidentsOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const inventoryQuery = useInventory(hotelCode);
  const createIncident = useCreateIncident();

  // Mark room as IN_PROGRESS as soon as we enter (if it was TO_CLEAN)
  useEffect(() => {
    if (data?.status === 'TO_CLEAN') {
      updateStatus.mutate({ assignmentId, status: 'IN_PROGRESS' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<Record<string, string[]>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<'item' | null>(null);
  const [submittingHelp, setSubmittingHelp] = useState(false);
  const [skipComments, setSkipComments] = useState<Record<string, string>>({});
  const [skipPending, setSkipPending] = useState<Record<string, boolean>>({});  const openEditIncident = (incident: Incident) => {
    const allItems = inventoryQuery.data && inventoryQuery.data.length > 0 ? inventoryQuery.data : FALLBACK_INVENTORY;
    const matchedItem = allItems.find(
      (i) => i.name.toLowerCase() === incident.itemName.toLowerCase(),
    ) ?? FALLBACK_INVENTORY.find(
      (i) => i.name.toLowerCase() === incident.itemName.toLowerCase(),
    );
    const itemId = matchedItem?.id ?? 'others-item';
    setSelectedItemIds([itemId]);
    setSelectedIssues({ [itemId]: incident.issue ? [incident.issue] : [] });
    setOtherTexts({});
    setEditingIncident(incident);
    setIncidentsOpen(false);
    setHelpOpen(true);
  };
  const handlePhotoUpload = (item: ChecklistItem) => {
    const doLaunch = (type: 'camera' | 'gallery') => {
      if (type === 'camera') {
        launchCamera(
          { mediaType: 'photo', quality: 0.7, saveToPhotos: false, includeBase64: false },
          (res) => {
            if (res.didCancel || res.errorCode) {
              if (res.errorCode) Alert.alert('Camera error', res.errorMessage ?? res.errorCode);
              return;
            }
            const uri = res.assets?.[0]?.uri;
            if (!uri || !data) return;
            const next = data.checklist.map((c) =>
              c.id === item.id ? { ...c, done: true, photoUri: uri } : c,
            );
            updateChecklist.mutate({ assignmentId, checklist: next });
          },
        );
      } else {
        launchImageLibrary(
          { mediaType: 'photo', quality: 0.7, includeBase64: false },
          (res) => {
            if (res.didCancel || res.errorCode) return;
            const uri = res.assets?.[0]?.uri;
            if (!uri || !data) return;
            const next = data.checklist.map((c) =>
              c.id === item.id ? { ...c, done: true, photoUri: uri } : c,
            );
            updateChecklist.mutate({ assignmentId, checklist: next });
          },
        );
      }
    };

    Alert.alert('Upload proof', 'Choose source', [
      { text: 'Camera', onPress: () => doLaunch('camera') },
      { text: 'Gallery', onPress: () => doLaunch('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const progress = useMemo(() => {
    if (!data) return 0;
    const total = data.checklist.length || 1;
    const done = data.checklist.filter((c) => c.done).length;
    return Math.round((done / total) * 100);
  }, [data]);

  const toggleItem = (item: ChecklistItem) => {
    if (!data) return;
    const nextChecklist = data.checklist.map((entry) =>
      entry.id === item.id ? { ...entry, done: !entry.done } : entry,
    );
    updateChecklist.mutate({ assignmentId, checklist: nextChecklist });
  };

  const completeRoom = () => {
    updateStatus.mutate(
      { assignmentId, status: 'DONE' },
      { onSuccess: () => navigation.goBack() },
    );
  };

  if (isLoading || !data) {
    return (
      <Screen>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, color: '#6b7280' }}>
            Loading room…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexShrink: 1, paddingRight: 8 }}>
            <Text
              style={{ fontSize: 20, fontWeight: '600', color: '#0f172a' }}
            >
              Room {data.roomNumber}
            </Text>
            <Text
              style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}
            >
              Floor {data.floor}
              {data.type ? ` • ${data.type}` : ''}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 12,
            height: 6,
            borderRadius: 999,
            overflow: 'hidden',
            backgroundColor: '#e5e7eb',
          }}
        >
          <View
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 999,
              backgroundColor: '#2563eb',
            }}
          />
        </View>
        <Text
          style={{
            marginTop: 4,
            fontSize: 11,
            color: '#6b7280',
          }}
        >
          {progress}% complete
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text
          style={{
            marginBottom: 8,
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase',
            color: '#6b7280',
          }}
        >
          Checklist
        </Text>

        {data.checklist.map((item) => (
          <View
            key={item.id}
            style={{
              marginBottom: 14,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: item.done ? '#10b981' : item.skipped ? '#9ca3af' : '#e5e7eb',
              backgroundColor: item.done ? '#f0fdf4' : item.skipped ? '#f9fafb' : '#ffffff',
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: item.done ? '#065f46' : item.skipped ? '#9ca3af' : '#0f172a',
                textDecorationLine: item.skipped ? 'line-through' : 'none',
                marginBottom: 12,
              }}
            >
              {item.label}
            </Text>
            {item.notes ? (
              <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>{item.notes}</Text>
            ) : null}
            {item.done ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#10b981', fontWeight: '600' }}>✓ Completed</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!data) return;
                    const next = data.checklist.map((c) =>
                      c.id === item.id ? { ...c, done: false, skipped: false } : c,
                    );
                    updateChecklist.mutate({ assignmentId, checklist: next });
                  }}
                  style={{ marginLeft: 12 }}
                >
                  <Text style={{ fontSize: 12, color: '#6b7280', textDecorationLine: 'underline' }}>Undo</Text>
                </TouchableOpacity>
              </View>
            ) : item.skipped ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#9ca3af', fontWeight: '600' }}>— Skipped</Text>
                {item.notes ? <Text style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{item.notes}</Text> : null}
                <TouchableOpacity
                  onPress={() => {
                    if (!data) return;
                    const next = data.checklist.map((c) =>
                      c.id === item.id ? { ...c, done: false, skipped: false, notes: undefined } : c,
                    );
                    updateChecklist.mutate({ assignmentId, checklist: next });
                  }}
                  style={{ marginLeft: 12 }}
                >
                  <Text style={{ fontSize: 12, color: '#6b7280', textDecorationLine: 'underline' }}>Undo</Text>
                </TouchableOpacity>
              </View>
            ) : skipPending[item.id] ? (
              <View>
                <TextInput
                  value={skipComments[item.id] ?? ''}
                  onChangeText={(t) => setSkipComments((prev) => ({ ...prev, [item.id]: t }))}
                  placeholder="Add a comment (optional)…"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={2}
                  style={{ borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 13, color: '#0f172a', backgroundColor: '#f9fafb', minHeight: 60, textAlignVertical: 'top', marginBottom: 10 }}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (!data) return;
                      const comment = skipComments[item.id]?.trim() ?? '';
                      const next = data.checklist.map((c) =>
                        c.id === item.id ? { ...c, done: false, skipped: true, notes: comment || c.notes } : c,
                      );
                      updateChecklist.mutate({ assignmentId, checklist: next });
                      setSkipPending((prev) => ({ ...prev, [item.id]: false }));
                      setSkipComments((prev) => ({ ...prev, [item.id]: '' }));
                    }}
                    style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280' }}>Confirm Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSkipPending((prev) => ({ ...prev, [item.id]: false }))}
                    style={{ height: 40, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 13, color: '#9ca3af' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => toggleItem(item)}
                  style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>✓ Completed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSkipPending((prev) => ({ ...prev, [item.id]: true }))}
                  style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280' }}>Skip</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Complete cleaning button inline below checklist */}
        <TouchableOpacity
          onPress={completeRoom}
          disabled={updateStatus.isPending}
          style={{
            marginTop: 8,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            backgroundColor: '#2563eb',
            opacity: updateStatus.isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>
            {updateStatus.isPending ? 'Saving…' : 'Complete cleaning'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setHelpOpen(true)}
          style={{
            marginTop: 12,
            marginBottom: 100,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: '#d1d5db',
            backgroundColor: '#f9fafb',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Report an Issue</Text>
        </TouchableOpacity>
      </ScrollView>

      <ReportIssueModal
        visible={helpOpen}
        roomNumber={data.roomNumber}
        assignmentId={assignmentId}
        hotelCode={hotelCode}
        onClose={() => setHelpOpen(false)}
        onSuccess={() => refetchIncidents()}
      />

      {/* Incidents modal */}
      <Modal
        visible={incidentsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIncidentsOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: 24,
          }}
          onPress={() => setIncidentsOpen(false)}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              maxHeight: 360,
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: 4,
              }}
            >
              Incidents for room {data.roomNumber}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: '#6b7280',
                marginBottom: 12,
              }}
            >
              Recent issues reported for this room.
            </Text>

            {incidents.length === 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                }}
              >
                No incidents reported for this room yet.
              </Text>
            ) : (
              <ScrollView>
                {incidents.map((incident) => {
                  return (
                    <TouchableOpacity
                      key={incident.id}
                      activeOpacity={0.75}
                      onPress={() => setSelectedIncident(incident)}
                      style={{
                        marginBottom: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: incident.status === 'RESOLVED' ? '#d1d5db' : '#f97316',
                        backgroundColor: incident.status === 'RESOLVED' ? '#f9fafb' : '#ffffff',
                      }}
                    >
                      {/* Header row: title + Edit button */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: incident.status === 'RESOLVED' ? '#9ca3af' : '#111827',
                            flex: 1,
                          }}
                        >
                          {incident.itemName}
                        </Text>
                        {incident.status !== 'RESOLVED' && (
                          <TouchableOpacity
                            onPress={() => openEditIncident(incident)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#d1d5db',
                              backgroundColor: '#f9fafb',
                              marginLeft: 8,
                            }}
                          >
                            <Text style={{ fontSize: 11, marginRight: 3 }}>✏️</Text>
                            <Text style={{ fontSize: 11, color: '#374151', fontWeight: '500' }}>Edit</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>
                        {incident.issue}
                      </Text>
                      {incident.status === 'RESOLVED' && (
                        <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '600', marginTop: 2 }}>✓ Resolved</Text>
                      )}
                      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        ID: {incident.id}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Incident detail modal */}
      <Modal
        visible={selectedIncident != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIncident(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setSelectedIncident(null)}
        >
          {selectedIncident && (
              <View
                style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderTopWidth: 4, borderTopColor: '#2563eb' }}
                onStartShouldSetResponder={() => true}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 }}>
                  Incident Details
                </Text>
                {[
                  { label: 'ID', value: selectedIncident.id },
                  { label: 'Item', value: selectedIncident.itemName },
                  { label: 'Issue', value: selectedIncident.issue },
                  { label: 'Room', value: selectedIncident.roomNumber },
                  { label: 'Category', value: selectedIncident.category },
                  { label: 'Status', value: selectedIncident.status },
                  { label: 'Reported', value: selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString() : undefined },
                ].filter(r => r.value).map(row => (
                  <View key={row.label} style={{ flexDirection: 'row', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', width: 80 }}>{row.label}</Text>
                    <Text style={{ fontSize: 12, color: '#111827', flex: 1 }}>{row.value}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => setSelectedIncident(null)}
                  style={{ alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#2563eb' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#ffffff' }}>Close</Text>
                </TouchableOpacity>
              </View>
          )}
        </Pressable>
      </Modal>

    </Screen>
  );
}

