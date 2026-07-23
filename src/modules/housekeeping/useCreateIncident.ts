import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../../lib/api';

export type IncidentCategory =
  | 'SAFETY_MEDICAL'
  | 'SECURITY'
  | 'FACILITIES'
  | 'LOST_AND_FOUND'
  | 'COMPLIANCE_RISK'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CreateIncidentPayload {
  hotelCode: string;
  assignmentId: string;
  roomNumber: string;
  unitType?: string;
  title: string;
  description?: string | null;
  incidentType: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  immediateActions?: string | null;
}

export interface CreateIncidentResult {
  id: string;
  payload?: CreateIncidentPayload;
}

export interface IncidentAttachment {
  uri: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

interface UploadUrlInfo {
  fileName: string;
  uploadUrl: string;
  contentType: string;
  fileSize: number;
}

function buildIncidentRequestBody(payload: CreateIncidentPayload) {
  const room = payload.roomNumber.trim() || 'Unknown';
  return {
    title: payload.title,
    description: payload.description?.trim() || payload.title,
    category: payload.category,
    incidentType: payload.incidentType,
    severity: payload.severity,
    unit: room,
    unitType: payload.unitType ?? 'ROOM',
    locationNotes: `Housekeeping task ${payload.assignmentId}`,
    immediateActions: payload.immediateActions?.trim() || null,
    images: null,
  };
}

async function createIncident(payload: CreateIncidentPayload): Promise<CreateIncidentResult> {
  const body = buildIncidentRequestBody(payload);
  const res = await api.post<any>(
    `/api/v1/hotels/${payload.hotelCode}/incidents`,
    body,
  );

  const resBody = res.data;
  const incidentId =
    resBody?.data?.incidentId ??
    resBody?.incidentId ??
    resBody?.data?.id ??
    resBody?.id;

  return { id: String(incidentId), payload };
}

export async function uploadIncidentImages(
  hotelCode: string,
  incidentId: string,
  attachments: IncidentAttachment[],
) {
  if (attachments.length === 0) return 0;

  const maxSizePerFile = 5 * 1024 * 1024;
  const totalSize = attachments.reduce((sum, image) => sum + image.fileSize, 0);
  const res = await api.post<any>(
    `/api/v1/hotels/${hotelCode}/incidents/${incidentId}/images/upload-url`,
    {
      maxFiles: attachments.length,
      maxSizePerFile,
      maxTotalSize: Math.max(totalSize, maxSizePerFile),
      allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      description: 'Housekeeping incident photos',
      category: 'evidence',
      images: attachments.map((image) => ({
        fileName: image.fileName,
        contentType: image.contentType,
        fileSize: image.fileSize,
        description: 'Housekeeping incident photo',
        category: 'evidence',
      })),
    },
  );

  const uploadUrls: UploadUrlInfo[] =
    res.data?.data?.presignedUrls ??
    res.data?.presignedUrls ??
    [];

  if (uploadUrls.length !== attachments.length) {
    throw new Error('Image upload URL response did not match selected photos.');
  }

  await Promise.all(
    uploadUrls.map(async (info, index) => {
      const image = attachments[index];
      const uploadResponse = await FileSystem.uploadAsync(info.uploadUrl, image.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
        headers: {
          'Content-Type': info.contentType || image.contentType,
        },
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        throw new Error(`Could not upload ${info.fileName || image.fileName}.`);
      }
    }),
  );

  return attachments.length;
}

export function useCreateIncident() {
  return useMutation({
    mutationFn: createIncident,
  });
}
