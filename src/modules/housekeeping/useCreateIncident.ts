import { useMutation } from '@tanstack/react-query';
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

export function useCreateIncident() {
  return useMutation({
    mutationFn: createIncident,
  });
}
