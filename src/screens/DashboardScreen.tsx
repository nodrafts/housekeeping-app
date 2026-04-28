import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  Pressable, TextInput, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { useAuth } from '../modules/auth/useAuth';
import { useAssignments } from '../modules/housekeeping/useAssignments';
import { useAllIncidents, getOpenIncidentsForRoom } from '../modules/housekeeping/useIncidents';
import { useMessages } from '../modules/chat/useMessages';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { useRole } from '../modules/auth/useRole';

type Props = NativeStackScreenProps<AppStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { selectedHotel } = useHotelStore();
  const { isAdmin } = useRole();
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? '';
  const { data: assignments = [] } = useAssignments();
  const { data: allIncidents = [] } = useAllIncidents(hotelCode);
  const { data: messages = [] } = useMessages('housekeeping-maintenance', 20);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editMode, setEditMode] = useState(false);

  const initials = (user?.name || user?.email || 'U')
    .split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const totalRooms = assignments.length;
  const doneRooms = assignments.filter((a) => a.status === 'DONE').length;
  const inProgressRooms = assignments.filter((a) => a.status === 'IN_PROGRESS').length;
  const totalChecklist = assignments.reduce((s, a) => s + a.checklist.length, 0);
  const doneChecklist = assignments.reduce((s, a) => s + a.checklist.filter((c) => c.done).length, 0);
  const overallProgress = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

  const allOpenIncidents = assignments.flatMap((a) =>
    getOpenIncidentsForRoom(allIncidents, a.roomNumber),
  );
  const criticalIncidents = allOpenIncidents.filter(
    (i) => i.severity?.toLowerCase() === 'critical' || i.severity?.toLowerCase() === 'high',
  );

  const recentMessages = [...messages].reverse().slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#2563eb', paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#93c5fd', fontSize: 13 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700' }}>Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Profile card */}
        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setEditMode((v) => !v)}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff' }}>{initials}</Text>
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 9 }}>✏️</Text>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {editMode ? (
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#2563eb', paddingBottom: 2 }}
                autoFocus
              />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a' }}>{user?.name ?? 'Housekeeper'}</Text>
            )}
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{user?.email ?? ''}</Text>
            {user?.designation && (
              <Text style={{ fontSize: 12, color: '#2563eb', marginTop: 1, fontWeight: '500' }}>{user.designation}</Text>
            )}
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              🏨 {selectedHotel?.name ?? user?.hotelName ?? '—'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (editMode) {
                Alert.alert('Saved', 'Profile update is local only for now.');
                setEditMode(false);
              } else {
                setEditMode(true);
              }
            }}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
          >
            <Text style={{ fontSize: 12, color: '#374151' }}>{editMode ? 'Save' : '✏️ Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Quick Stats</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Rooms', value: totalRooms, color: '#2563eb', onPress: () => navigation.navigate('RoomsList') },
            { label: 'Done', value: doneRooms, color: '#10b981', onPress: () => navigation.navigate('RoomsList') },
            { label: 'In Progress', value: inProgressRooms, color: '#f59e0b', onPress: () => navigation.navigate('RoomsList') },
            { label: 'Open Issues', value: allOpenIncidents.length, color: '#ef4444', onPress: () => navigation.navigate('RoomsList') },
          ].map((s) => (
            <TouchableOpacity key={s.label} onPress={s.onPress} activeOpacity={0.75} style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 12, alignItems: 'center', borderTopWidth: 3, borderTopColor: s.color }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Priority Alerts */}
        {criticalIncidents.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>🚨 Priority Alerts</Text>
            <View style={{ backgroundColor: '#fff1f2', borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#ef4444' }}>
              {criticalIncidents.slice(0, 3).map((i) => (
                <View key={i.id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#b91c1c' }}>
                    Room {i.roomNumber} — {i.itemName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{i.issue} · {i.severity}</Text>
                </View>
              ))}
              {criticalIncidents.length > 3 && (
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>+{criticalIncidents.length - 3} more</Text>
              )}
            </View>
          </>
        )}

        {/* Overall Progress */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Overall Progress</Text>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#374151' }}>Checklist completion</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb' }}>{overallProgress}%</Text>
          </View>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
            <View style={{ width: `${overallProgress}%`, height: '100%', borderRadius: 999, backgroundColor: '#2563eb' }} />
          </View>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{doneChecklist} of {totalChecklist} tasks done</Text>
        </View>

        {/* Assigned Rooms */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>🧾 Assigned Rooms</Text>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
          {assignments.map((a, idx) => {
            const roomDone = a.checklist.filter((c) => c.done).length;
            const roomTotal = a.checklist.length || 1;
            const pct = Math.round((roomDone / roomTotal) * 100);
            const openCount = getOpenIncidentsForRoom(allIncidents, a.roomNumber).length;
            return (
              <TouchableOpacity
              key={a.id}
              onPress={() => navigation.navigate('RoomDetails', { assignmentId: a.id })}
              activeOpacity={0.75}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: idx < assignments.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6' }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }}>Room {a.roomNumber}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {openCount > 0 && (
                      <View style={{ backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: '#d97706', fontWeight: '600' }}>⚠ {openCount}</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: a.status === 'DONE' ? '#d1fae5' : '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: a.status === 'DONE' ? '#065f46' : '#334155', fontWeight: '500' }}>{a.status}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ marginTop: 6, height: 4, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: '100%', borderRadius: 999, backgroundColor: pct === 100 ? '#10b981' : '#2563eb' }} />
                </View>
                <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Tap to continue →</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Activity */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>💬 Recent Activity</Text>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
          {recentMessages.length === 0 ? (
            <Text style={{ padding: 14, fontSize: 12, color: '#9ca3af' }}>No recent messages.</Text>
          ) : (
            recentMessages.map((m, idx) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => navigation.navigate('Messaging')}
                activeOpacity={0.75}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: idx < recentMessages.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>{m.senderName ?? m.senderEmail ?? 'Unknown'}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }} numberOfLines={2}>{m.text}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={() => { Alert.alert('Sign out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: logout }]); }}
          style={{ alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', marginBottom: 32 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#b91c1c' }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

    </View>
  );
}
