import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Screen } from '../components/layout/Screen';
import { useAssignments } from '../modules/housekeeping/useAssignments';
import { useUpdateStatus } from '../modules/housekeeping/useAssignment';
import type { RoomAssignment } from '../modules/housekeeping/types';
import { useAuth } from '../modules/auth/useAuth';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { useAllIncidents, getOpenIncidentsForRoom } from '../modules/housekeeping/useIncidents';
import type { Incident } from '../modules/housekeeping/useIncidents';
import { useRole } from '../modules/auth/useRole';
import { ReportIssueModal } from '../components/ReportIssueModal';

type Props = NativeStackScreenProps<AppStackParamList, 'RoomsList'> | any;

function statusLabel(status: RoomAssignment['status']) {
  switch (status) {
    case 'IN_PROGRESS': return 'In Progress';
    case 'DONE': return 'Done';
    case 'OUT_OF_ORDER': return 'Out of order';
    default: return 'Start cleaning';
  }
}

function statusColors(status: RoomAssignment['status']): { bg: string; text: string } {
  switch (status) {
    case 'IN_PROGRESS': return { bg: '#f59e0b', text: '#ffffff' };
    case 'DONE': return { bg: '#10b981', text: '#ffffff' };
    case 'OUT_OF_ORDER': return { bg: '#ef4444', text: '#ffffff' };
    default: return { bg: '#2563eb', text: '#ffffff' };
  }
}

function nextStatus(status: RoomAssignment['status']): RoomAssignment['status'] | null {
  if (status === 'TO_CLEAN') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS') return 'DONE';
  return null; // DONE has no next
}

function formatElapsed(startedAt?: string): string {
  if (!startedAt) return '';
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
export function RoomsListScreen({ navigation }: Props) {
  const { data, isLoading } = useAssignments();
  const { user, logout } = useAuth();
  const { selectedHotel } = useHotelStore();
  const hotelCode = selectedHotel?.hotelCode ?? '';
  const { data: allIncidents = [], refetch: refetchIncidents } = useAllIncidents(hotelCode);
  const updateStatus = useUpdateStatus();
  const { isAdmin } = useRole();

  const [incidentRoom, setIncidentRoom] = useState<{ roomNumber: string; assignmentId: string; incidents: Incident[] } | null>(null);
  const [helpRoom, setHelpRoom] = useState<{ roomNumber: string; assignmentId: string } | null>(null);

  const initials = (user?.name || user?.email || 'User')
    .split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Screen>
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            isAdmin ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('HotelSelect')}
                style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 16, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}
              >
                <Text style={{ fontSize: 12, color: '#6b7280', marginRight: 4 }}>🏨</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', maxWidth: 220 }} numberOfLines={1}>
                  {selectedHotel?.name ?? 'Select property'}
                </Text>
                <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>▾</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>Rooms to clean</Text>
                {selectedHotel?.name ? (
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>🏨 {selectedHotel.name}</Text>
                ) : null}
              </View>
            )
          }
          renderItem={({ item }) => {
            const total = item.checklist.length || 1;
            const done = item.checklist.filter((c) => c.done).length;
            const progress = Math.round((done / total) * 100);
            const openIncidents = getOpenIncidentsForRoom(allIncidents, item.roomNumber);
            const hasIncidents = openIncidents.length > 0;
            const cardBorderColor = hasIncidents ? '#f97316' : item.status === 'DONE' ? '#10b981' : item.status === 'IN_PROGRESS' ? '#f59e0b' : '#d1d5db';
            const cardBg = hasIncidents ? '#fff7ed' : item.status === 'DONE' ? '#f0fdf4' : '#ffffff';
            const elapsed = item.status === 'IN_PROGRESS' ? formatElapsed(item.startedAt) : '';
            const { bg: statusBg, text: statusText } = statusColors(item.status);

            return (
              <View
                style={{
                  marginBottom: 16,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: cardBorderColor,
                  backgroundColor: cardBg,
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              >
                {/* Tapping the room info area navigates inside */}
                <TouchableOpacity onPress={() => navigation.navigate('RoomDetails', { assignmentId: item.id })} activeOpacity={0.75}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a' }}>
                      Room {item.roomNumber}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      Floor {item.floor}{item.type ? ` • ${item.type}` : ''}
                    </Text>
                    {elapsed ? (
                      <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: '600', marginTop: 4 }}>
                        ⏱ {elapsed} elapsed
                      </Text>
                    ) : null}
                    {item.status === 'DONE' && item.completedAt ? (
                      <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '500', marginTop: 4 }}>
                        ✓ Done at {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    ) : null}
                  </View>

                  {/* Incidents button top-right */}
                  <TouchableOpacity
                    onPress={() => { refetchIncidents(); setIncidentRoom({ roomNumber: item.roomNumber, assignmentId: item.id, incidents: openIncidents }); }}
                    style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: hasIncidents ? '#f97316' : '#e5e7eb' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: hasIncidents ? '#ffffff' : '#6b7280' }}>
                      {hasIncidents ? `⚠ ${openIncidents.length}` : '✓ 0'} Incidents
                    </Text>
                  </TouchableOpacity>
                </View>
                </TouchableOpacity>

                {/* Progress bar */}
                <View style={{ height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: '#e5e7eb', marginBottom: 6 }}>
                  <View style={{ width: `${progress}%`, height: '100%', borderRadius: 999, backgroundColor: progress === 100 ? '#10b981' : '#2563eb' }} />
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                  {done} of {total} checklist items complete
                </Text>

                {/* Action buttons row */}
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {item.status === 'TO_CLEAN' && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('RoomDetails', { assignmentId: item.id })}
                      style={{ flex: 1, minWidth: 120, height: 44, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>▶ Start cleaning</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'IN_PROGRESS' && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('RoomDetails', { assignmentId: item.id })}
                      style={{ flex: 1, minWidth: 120, height: 44, borderRadius: 12, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>↩ Continue</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setHelpRoom({ roomNumber: item.roomNumber, assignmentId: item.id })}
                    style={{ flex: item.status === 'DONE' ? 1 : 0, height: 44, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Report an Issue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Incidents modal for a room */}
      <Modal
        visible={incidentRoom != null}
        transparent
        animationType="fade"
        onRequestClose={() => setIncidentRoom(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setIncidentRoom(null)}
        >
          <View
            style={{ backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, maxHeight: 400 }}
            onStartShouldSetResponder={() => true}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 }}>
              Incidents — Room {incidentRoom?.roomNumber}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Open incidents for this room.
            </Text>
            {(incidentRoom?.incidents.length ?? 0) === 0 ? (
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>No open incidents.</Text>
            ) : (
              <ScrollView>
                {incidentRoom?.incidents.map((incident) => {
                  return (
                    <View
                      key={incident.id}
                      style={{
                        marginBottom: 8, padding: 10, borderRadius: 10,
                        borderWidth: 2, borderColor: '#f97316',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{incident.itemName}</Text>
                      <Text style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>{incident.issue}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setIncidentRoom(null)}
              style={{ alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#2563eb' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#ffffff' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      {helpRoom && (
        <ReportIssueModal
          visible={helpRoom != null}
          roomNumber={helpRoom.roomNumber}
          assignmentId={helpRoom.assignmentId}
          hotelCode={hotelCode}
          onClose={() => setHelpRoom(null)}
          onSuccess={() => { refetchIncidents(); setHelpRoom(null); }}
        />
      )}
    </Screen>
  );
}

