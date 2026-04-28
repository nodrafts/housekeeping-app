import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Incident {
  id: string;
  assignmentId?: string;
  roomNumber?: string;
  itemName: string;
  issue: string;
  status: IncidentStatus;
  createdAt: string;
  category?: string;
  severity?: string;
}

// In-memory store: roomNumber -> Incident[]
const localIncidentsByRoom = new Map<string, Incident[]>();

export function addLocalIncident(roomNumber: string, incident: Incident) {
  const existing = localIncidentsByRoom.get(roomNumber) ?? [];
  // avoid duplicates
  if (!existing.find((i) => i.id === incident.id)) {
    localIncidentsByRoom.set(roomNumber, [incident, ...existing]);
  }
}

function mapIncident(raw: any): Incident {
  // description is "ItemName: Issue" combined
  const description: string = raw.description ?? '';
  const colonIdx = description.indexOf(':');
  const itemName = colonIdx > -1 ? description.slice(0, colonIdx).trim() : description;
  const issue = colonIdx > -1 ? description.slice(colonIdx + 1).trim() : '';

  return {
    id: raw.incidentId ?? raw.id ?? '',
    assignmentId: raw.assignmentId,
    roomNumber: raw.roomNumber ?? raw.location?.roomNumber ?? raw.room ?? null,
    itemName: raw.itemName || itemName,
    issue: raw.issue || issue,
    status: raw.status ?? 'OPEN',
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    category: raw.category ?? raw.classification?.category,
    severity: raw.priority ?? raw.severity ?? raw.classification?.severity,
  };
}

async function fetchIncidents(hotelCode: string, roomNumber: string): Promise<Incident[]> {
  try {
    const res = await api.get<any>(
      `/api/v1/hotels/${hotelCode}/incidents`,
      { params: { roomNumber } }
    );

    const raw = (res.data as any)?.data ?? res.data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    const mapped = list.map(mapIncident);

    // Filter by roomNumber — backend may not support the query param
    const fromApi = mapped.filter(
      (i) => i.roomNumber === roomNumber,
    );

    // Merge with locally tracked incidents for this room
    const local = localIncidentsByRoom.get(roomNumber) ?? [];
    const apiIds = new Set(fromApi.map((i) => i.id));
    const localOnly = local.filter((i) => !apiIds.has(i.id));

    return [...localOnly, ...fromApi];
  } catch (err) {
    console.warn('Failed to fetch incidents, returning empty array:', err);
    return localIncidentsByRoom.get(roomNumber) ?? [];
  }
}

export function useIncidents(hotelCode: string, roomNumber: string) {
  return useQuery({
    queryKey: ['incidents', hotelCode, roomNumber],
    queryFn: () => fetchIncidents(hotelCode, roomNumber),
    enabled: !!hotelCode && !!roomNumber,
  });
}


// In-memory resolved set — persists for session
const resolvedIncidentIds = new Set<string>();

export function resolveLocalIncident(id: string) {
  resolvedIncidentIds.add(id);
  // Update in localIncidentsByRoom
  for (const [room, list] of localIncidentsByRoom.entries()) {
    localIncidentsByRoom.set(
      room,
      list.map((i) => (i.id === id ? { ...i, status: 'RESOLVED' as const } : i)),
    );
  }
}

export function updateLocalIncident(id: string, patch: Partial<Incident>) {
  for (const [room, list] of localIncidentsByRoom.entries()) {
    localIncidentsByRoom.set(
      room,
      list.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  }
}

export function getLocalOpenIncidentCount(roomNumber: string): number {
  const list = localIncidentsByRoom.get(roomNumber) ?? [];
  return list.filter((i) => i.status !== 'RESOLVED').length;
}

async function fetchAllIncidents(hotelCode: string): Promise<Incident[]> {
  try {
    const res = await api.get<any>(`/api/v1/hotels/${hotelCode}/incidents`);
    const raw = (res.data as any)?.data ?? res.data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map(mapIncident);
  } catch {
    return [];
  }
}

export function useAllIncidents(hotelCode: string) {
  return useQuery({
    queryKey: ['incidents-all', hotelCode],
    queryFn: () => fetchAllIncidents(hotelCode),
    enabled: !!hotelCode,
    staleTime: 30_000,
  });
}

export function getOpenIncidentsForRoom(allIncidents: Incident[], roomNumber: string): Incident[] {
  const fromApi = allIncidents.filter(
    (i) => i.roomNumber === roomNumber && i.status !== 'RESOLVED',
  );
  const local = (localIncidentsByRoom.get(roomNumber) ?? []).filter(
    (i) => i.status !== 'RESOLVED',
  );
  const apiIds = new Set(fromApi.map((i) => i.id));
  const localOnly = local.filter((i) => !apiIds.has(i.id));
  return [...localOnly, ...fromApi];
}
