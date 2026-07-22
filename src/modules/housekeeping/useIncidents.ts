import { useQuery } from '@tanstack/react-query';
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

const localIncidentsByRoom = new Map<string, Incident[]>();

export function addLocalIncident(roomNumber: string, incident: Incident) {
  const existing = localIncidentsByRoom.get(roomNumber) ?? [];
  if (!existing.find((i) => i.id === incident.id)) {
    localIncidentsByRoom.set(roomNumber, [incident, ...existing]);
  }
}

function splitTitle(title?: string) {
  const value = title ?? '';
  const colonIdx = value.indexOf(':');
  if (colonIdx === -1) {
    return { itemName: value, issue: '' };
  }
  return {
    itemName: value.slice(0, colonIdx).trim(),
    issue: value.slice(colonIdx + 1).trim(),
  };
}

function normalizeRoomNumber(value: unknown): string | undefined {
  if (value == null) return undefined;
  return String(value);
}

function mapIncident(raw: any): Incident {
  const fromTitle = splitTitle(raw.title ?? raw.description);
  const roomNumber = normalizeRoomNumber(
    raw.unit ?? raw.roomNumber ?? raw.location?.roomNumber ?? raw.room,
  );

  return {
    id: String(raw.incidentId ?? raw.id ?? ''),
    assignmentId: raw.assignmentId,
    roomNumber,
    itemName: raw.incidentType ?? raw.itemName ?? fromTitle.itemName,
    issue: raw.description ?? raw.issue ?? fromTitle.issue,
    status: raw.status ?? 'OPEN',
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    category: raw.category ?? raw.classification?.category,
    severity: raw.severity ?? raw.priority ?? raw.classification?.severity,
  };
}

function unpackIncidentList(payload: any): any[] {
  const raw = payload?.data ?? payload ?? [];
  return Array.isArray(raw) ? raw : [];
}

async function fetchIncidents(hotelCode: string, roomNumber: string): Promise<Incident[]> {
  try {
    const res = await api.get<any>(
      `/api/v1/hotels/${hotelCode}/incidents`,
      { params: { size: 100, search: roomNumber } },
    );

    const mapped = unpackIncidentList(res.data).map(mapIncident);
    const fromApi = mapped.filter((incident) => incident.roomNumber === roomNumber);
    const local = localIncidentsByRoom.get(roomNumber) ?? [];
    const apiIds = new Set(fromApi.map((incident) => incident.id));
    const localOnly = local.filter((incident) => !apiIds.has(incident.id));

    return [...localOnly, ...fromApi];
  } catch (err) {
    console.warn('Failed to fetch incidents, returning local incidents:', err);
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

const resolvedIncidentIds = new Set<string>();

export function resolveLocalIncident(id: string) {
  resolvedIncidentIds.add(id);
  for (const [room, list] of localIncidentsByRoom.entries()) {
    localIncidentsByRoom.set(
      room,
      list.map((incident) => (
        incident.id === id ? { ...incident, status: 'RESOLVED' as const } : incident
      )),
    );
  }
}

export function updateLocalIncident(id: string, patch: Partial<Incident>) {
  for (const [room, list] of localIncidentsByRoom.entries()) {
    localIncidentsByRoom.set(
      room,
      list.map((incident) => (incident.id === id ? { ...incident, ...patch } : incident)),
    );
  }
}

export function getLocalOpenIncidentCount(roomNumber: string): number {
  const list = localIncidentsByRoom.get(roomNumber) ?? [];
  return list.filter((incident) => incident.status !== 'RESOLVED').length;
}

async function fetchAllIncidents(hotelCode: string): Promise<Incident[]> {
  try {
    const res = await api.get<any>(
      `/api/v1/hotels/${hotelCode}/incidents`,
      { params: { size: 100 } },
    );
    return unpackIncidentList(res.data).map(mapIncident);
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
    (incident) => incident.roomNumber === roomNumber && incident.status !== 'RESOLVED',
  );
  const local = (localIncidentsByRoom.get(roomNumber) ?? []).filter(
    (incident) => incident.status !== 'RESOLVED',
  );
  const apiIds = new Set(fromApi.map((incident) => incident.id));
  const localOnly = local.filter((incident) => !apiIds.has(incident.id));
  return [...localOnly, ...fromApi];
}
