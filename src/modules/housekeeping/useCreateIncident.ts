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
  tier: 'MOVABLE' | 'FIXED';
  itemId: string;
  itemName: string;
  issue: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
}

export interface CreateIncidentResult {
  id: string;
  payload?: CreateIncidentPayload;
}

function newIncidentId(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  // RFC4122 v4 fallback (works when crypto.randomUUID is unavailable)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Backend expects: incidentId, classification, location, narrative
 * (see Property Management incident validation).
 */
function buildIncidentRequestBody(payload: CreateIncidentPayload) {
  const incidentId = newIncidentId();
  const room = payload.roomNumber.trim() || 'Unknown';
  return {
    incidentId,
    classification: {
      category: payload.category,
      incidentType: payload.itemName,
      severity: payload.severity,
    },
    location: {
      roomNumber: room,
      areaName: null,
      floor: null,
      notes: null,
    },
    narrative: {
      summary: `${payload.itemName}: ${payload.issue}`,
      whatHappened: `Issue reported for ${payload.itemName} in ${room}: ${payload.issue}`,
      immediateActionsTaken: null,
    },
    // Keep original fields for APIs that still accept them
    assignmentId: payload.assignmentId,
    roomNumber: payload.roomNumber,
    tier: payload.tier,
    itemId: payload.itemId,
    itemName: payload.itemName,
    issue: payload.issue,
  };
}

async function createIncident(payload: CreateIncidentPayload & { hotelCode: string }) {
  const body = buildIncidentRequestBody(payload);
  const res = await api.post<{ data?: CreateIncidentResult } | CreateIncidentResult>(
    `/api/v1/hotels/${payload.hotelCode}/incidents`,
    body,
  );

  const resBody: any = res.data;
  const incidentId = resBody?.id
    ? String(resBody.id)
    : resBody?.data?.id
      ? String(resBody.data.id)
      : body.incidentId;

  return { id: incidentId, payload };
}

export function useCreateIncident() {
  return useMutation({
    mutationFn: createIncident,
  });
}
