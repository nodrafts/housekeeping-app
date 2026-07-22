import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addLocalIncident } from '../modules/housekeeping/useIncidents';
import { getApiErrorMessage } from '../lib/api';
import { useCreateIncident, type IncidentSeverity } from '../modules/housekeeping/useCreateIncident';

export interface ReportIssueModalProps {
  visible: boolean;
  roomNumber: string;
  assignmentId: string;
  hotelCode: string;
  unitType?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const ISSUE_TYPES = ['Broken item', 'Missing item', 'Needs repair', 'Safety concern', 'Other'];
const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];

export function ReportIssueModal({
  visible,
  roomNumber,
  assignmentId,
  hotelCode,
  unitType,
  onClose,
  onSuccess,
}: ReportIssueModalProps) {
  const createIncident = useCreateIncident();
  const [incidentType, setIncidentType] = useState(ISSUE_TYPES[0]);
  const [details, setDetails] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [immediateActions, setImmediateActions] = useState('');

  const reset = () => {
    setIncidentType(ISSUE_TYPES[0]);
    setDetails('');
    setSeverity('MEDIUM');
    setImmediateActions('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    const trimmedDetails = details.trim();
    const title = `${incidentType} in room ${roomNumber}`;

    try {
      const result = await createIncident.mutateAsync({
        hotelCode,
        assignmentId,
        roomNumber,
        unitType,
        title,
        description: trimmedDetails || title,
        category: 'FACILITIES',
        incidentType,
        severity,
        immediateActions,
      });

      addLocalIncident(roomNumber, {
        id: result.id,
        assignmentId,
        roomNumber,
        itemName: incidentType,
        issue: trimmedDetails || title,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        category: 'FACILITIES',
        severity,
      });

      Alert.alert('Issue reported', 'Maintenance can now pick this up.', [
        {
          text: 'OK',
          onPress: () => {
            reset();
            onSuccess?.();
            onClose();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Could not report issue', getApiErrorMessage(err));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}
        onPress={handleClose}
      >
        <View
          style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16 }}
          onStartShouldSetResponder={() => true}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
            Report issue
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
            Room {roomNumber}
          </Text>

          <Text style={{ marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: '700', color: '#111827' }}>
            What happened?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ISSUE_TYPES.map((type) => {
              const active = incidentType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setIncidentType(type)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: active ? '#2563eb' : '#d1d5db',
                    backgroundColor: active ? '#eff6ff' : '#ffffff',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? '#2563eb' : '#374151' }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: '700', color: '#111827' }}>
            Severity
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SEVERITIES.map((value) => {
              const active = severity === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setSeverity(value)}
                  style={{
                    flex: 1,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: active ? '#2563eb' : '#d1d5db',
                    backgroundColor: active ? '#eff6ff' : '#ffffff',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#2563eb' : '#374151' }}>
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Details, optional"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            style={{
              marginTop: 16,
              minHeight: 86,
              borderWidth: 1.5,
              borderColor: '#d1d5db',
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              color: '#0f172a',
              textAlignVertical: 'top',
              backgroundColor: '#f9fafb',
            }}
          />

          <TextInput
            value={immediateActions}
            onChangeText={setImmediateActions}
            placeholder="Action taken, optional"
            placeholderTextColor="#9ca3af"
            style={{
              marginTop: 10,
              height: 44,
              borderWidth: 1.5,
              borderColor: '#d1d5db',
              borderRadius: 10,
              paddingHorizontal: 12,
              fontSize: 14,
              color: '#0f172a',
              backgroundColor: '#f9fafb',
            }}
          />

          <TouchableOpacity
            onPress={submit}
            disabled={createIncident.isPending}
            style={{
              marginTop: 16,
              height: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: '#2563eb',
              opacity: createIncident.isPending ? 0.7 : 1,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
              {createIncident.isPending ? 'Sending...' : 'Send report'}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
