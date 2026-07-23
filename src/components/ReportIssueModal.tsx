import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { addLocalIncident } from '../modules/housekeeping/useIncidents';
import { getApiErrorMessage } from '../lib/api';
import {
  uploadIncidentImages,
  useCreateIncident,
  type IncidentAttachment,
  type IncidentSeverity,
} from '../modules/housekeeping/useCreateIncident';
import { colors, radii } from '../lib/theme';

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
const MAX_ATTACHMENTS = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function inferContentType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) {
    return asset.mimeType;
  }
  const fileName = asset.fileName ?? asset.uri;
  if (fileName.toLowerCase().endsWith('.png')) return 'image/png';
  if (fileName.toLowerCase().endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function fileNameFor(asset: ImagePicker.ImagePickerAsset, index: number) {
  const extension = inferContentType(asset).split('/')[1] ?? 'jpg';
  return asset.fileName ?? `incident-photo-${Date.now()}-${index + 1}.${extension}`;
}

async function attachmentFromAsset(asset: ImagePicker.ImagePickerAsset, index: number): Promise<IncidentAttachment> {
  const info = await FileSystem.getInfoAsync(asset.uri);
  const fileSize = info.exists ? info.size : asset.fileSize ?? 0;

  if (fileSize <= 0) {
    throw new Error('Could not read the selected photo size.');
  }
  if (fileSize > MAX_IMAGE_BYTES) {
    throw new Error('Each photo must be 5 MB or smaller.');
  }

  return {
    uri: asset.uri,
    fileName: fileNameFor(asset, index),
    contentType: inferContentType(asset),
    fileSize,
  };
}

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
  const [attachments, setAttachments] = useState<IncidentAttachment[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const isSubmitting = createIncident.isPending || uploadingPhotos;

  const reset = () => {
    setIncidentType(ISSUE_TYPES[0]);
    setDetails('');
    setSeverity('MEDIUM');
    setImmediateActions('');
    setAttachments([]);
    setUploadingPhotos(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const appendAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      Alert.alert('Photo limit reached', `You can add up to ${MAX_ATTACHMENTS} photos.`);
      return;
    }

    try {
      const selectedAssets = assets.slice(0, remainingSlots);
      const nextAttachments = await Promise.all(selectedAssets.map(attachmentFromAsset));
      setAttachments((current) => [...current, ...nextAttachments]);
    } catch (err) {
      Alert.alert('Could not add photo', getApiErrorMessage(err));
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach incident images.');
      return;
    }

    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remainingSlots > 1,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled) {
      await appendAssets(result.assets);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take incident photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      await appendAssets(result.assets);
    }
  };

  const choosePhotoSource = () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert('Photo limit reached', `You can add up to ${MAX_ATTACHMENTS} photos.`);
      return;
    }

    Alert.alert('Add photo', 'Choose how to attach the incident photo.', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeAttachment = (uri: string) => {
    setAttachments((current) => current.filter((image) => image.uri !== uri));
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

      let uploadedCount = 0;
      let uploadWarning: string | null = null;

      if (attachments.length > 0) {
        try {
          setUploadingPhotos(true);
          uploadedCount = (await uploadIncidentImages(hotelCode, result.id, attachments)).length;
        } catch (err) {
          uploadWarning = getApiErrorMessage(err);
        } finally {
          setUploadingPhotos(false);
        }
      }

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

      const message = uploadWarning
        ? `The issue was saved, but the photos did not upload. ${uploadWarning}`
        : uploadedCount > 0
          ? `Maintenance can now pick this up. ${uploadedCount} photo${uploadedCount === 1 ? '' : 's'} attached.`
          : 'Maintenance can now pick this up.';

      Alert.alert('Issue reported', message, [
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
        style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.44)', justifyContent: 'center', padding: 20 }}
        onPress={handleClose}
      >
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: colors.card,
            borderRadius: radii.xl,
            padding: 16,
          }}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>
              Report issue
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: colors.mutedForeground }}>
              Room {roomNumber}
            </Text>

            <Text style={{ marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: '800', color: colors.foreground }}>
              What happened?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ISSUE_TYPES.map((type) => {
                const active = incidentType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setIncidentType(type)}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: radii.pill,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.input,
                      backgroundColor: active ? colors.selected : colors.card,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: active ? '800' : '600', color: active ? colors.primary : colors.foreground }}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: '800', color: colors.foreground }}>
              Severity
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SEVERITIES.map((value) => {
                const active = severity === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setSeverity(value)}
                    activeOpacity={0.75}
                    style={{
                      flex: 1,
                      height: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radii.lg,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.input,
                      backgroundColor: active ? colors.selected : colors.card,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: active ? colors.primary : colors.foreground }}>
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
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              style={{
                marginTop: 16,
                minHeight: 86,
                borderWidth: 1.5,
                borderColor: colors.input,
                borderRadius: radii.lg,
                padding: 12,
                fontSize: 14,
                color: colors.foreground,
                textAlignVertical: 'top',
                backgroundColor: colors.secondary,
              }}
            />

            <TextInput
              value={immediateActions}
              onChangeText={setImmediateActions}
              placeholder="Action taken, optional"
              placeholderTextColor={colors.mutedForeground}
              style={{
                marginTop: 10,
                height: 44,
                borderWidth: 1.5,
                borderColor: colors.input,
                borderRadius: radii.lg,
                paddingHorizontal: 12,
                fontSize: 14,
                color: colors.foreground,
                backgroundColor: colors.secondary,
              }}
            />

            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.foreground }}>
                  Photos
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground }}>
                  {attachments.length}/{MAX_ATTACHMENTS}
                </Text>
              </View>

              {attachments.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
                >
                  {attachments.map((image) => (
                    <View key={image.uri} style={{ width: 72 }}>
                      <Image
                        source={{ uri: image.uri }}
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.muted,
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => removeAttachment(image.uri)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: radii.pill,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(15,23,42,0.78)',
                        }}
                      >
                        <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '800' }}>x</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              <TouchableOpacity
                onPress={choosePhotoSource}
                disabled={attachments.length >= MAX_ATTACHMENTS || isSubmitting}
                activeOpacity={0.75}
                style={{
                  height: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.lg,
                  borderWidth: 1.5,
                  borderColor: colors.input,
                  backgroundColor: colors.card,
                  opacity: attachments.length >= MAX_ATTACHMENTS || isSubmitting ? 0.55 : 1,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.foreground }}>
                  Add photo
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={submit}
            disabled={isSubmitting}
            activeOpacity={0.78}
            style={{
              marginTop: 16,
              height: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primaryForeground }}>
              {uploadingPhotos ? 'Uploading photos...' : createIncident.isPending ? 'Sending...' : 'Send report'}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
