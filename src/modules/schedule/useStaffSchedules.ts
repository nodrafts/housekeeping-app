import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DEFAULT_ORG_ID } from '../../lib/propertyConfig';

type ApiScheduleValue =
  | string
  | number
  | null
  | undefined
  | number[]
  | {
      epochSecond?: number;
      nano?: number;
      seconds?: number;
      nanos?: number;
    };

export type StaffSchedule = {
  id: number;
  employeeId: string;
  employeeName?: string | null;
  scheduleDate: string;
  plannedStartTime: Date;
  plannedEndTime: Date;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  status?: string | null;
};

export type ScheduleEmployee = {
  id: string;
  name: string;
};

export type AvailableSwapEmployee = {
  employeeId: string;
  name: string;
  email?: string | null;
  titleName?: string | null;
};

export type ScheduleSwapStatus = 'Requested' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export type ScheduleSwap = {
  id: number;
  requestScheduleId: number;
  targetScheduleId?: number | null;
  targetEmployeeId?: string | null;
  requestEmployeeName?: string | null;
  targetEmployeeName?: string | null;
  requestEmployeeTitleName?: string | null;
  targetEmployeeTitleName?: string | null;
  requestedBy?: string | null;
  status: ScheduleSwapStatus;
  approvedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

type RawScheduleSwap = {
  id?: number | string;
  fromScheduleId?: number | string;
  from_schedule_id?: number | string;
  requestScheduleId?: number | string;
  request_schedule_id?: number | string;
  toScheduleId?: number | string;
  to_schedule_id?: number | string;
  targetScheduleId?: number | string;
  target_schedule_id?: number | string;
  targetEmployeeId?: string | null;
  target_employee_id?: string | null;
  requestEmployeeName?: string | null;
  request_employee_name?: string | null;
  targetEmployeeName?: string | null;
  target_employee_name?: string | null;
  requestEmployeeTitleName?: string | null;
  request_employee_title_name?: string | null;
  targetEmployeeTitleName?: string | null;
  target_employee_title_name?: string | null;
  requestedBy?: string | null;
  requested_by?: string | null;
  status?: ScheduleSwapStatus | string | null;
  approval?: ScheduleSwapStatus | string | null;
  approvedBy?: string | null;
  approved_by?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  createdBy?: string | null;
  created_by?: string | null;
  updatedBy?: string | null;
  updated_by?: string | null;
};

type RawStaffSchedule = {
  id: number | string;
  orgId?: string;
  org_id?: string;
  hotelCode?: string;
  hotel_code?: string;
  employeeId?: string;
  employee_id?: string;
  userId?: string;
  user_id?: string;
  employeeName?: string | null;
  employee_name?: string | null;
  date?: string | number[] | null;
  scheduleDate?: string | number[] | null;
  schedule_date?: string | number[] | null;
  startTime?: ApiScheduleValue;
  start_time?: ApiScheduleValue;
  endTime?: ApiScheduleValue;
  end_time?: ApiScheduleValue;
  plannedStartTime?: ApiScheduleValue;
  planned_start_time?: ApiScheduleValue;
  plannedEndTime?: ApiScheduleValue;
  planned_end_time?: ApiScheduleValue;
  actualStartTime?: ApiScheduleValue;
  actual_start_time?: ApiScheduleValue;
  actualEndTime?: ApiScheduleValue;
  actual_end_time?: ApiScheduleValue;
  status?: string | null;
};

type StaffScheduleListParams = {
  orgId?: string;
  employeeId?: string;
  scheduleDate?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  enabled?: boolean;
};

type RawEmployee = {
  id?: string;
  name?: string;
  email?: string;
};

type CreateScheduleSwapPayload = {
  requestScheduleId: number;
  targetEmployeeId?: string;
  targetScheduleId?: number;
  requestedBy?: string;
  status?: ScheduleSwapStatus;
  approvedBy?: string;
};

type AvailableSwapEmployeeParams = {
  orgId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  enabled?: boolean;
};

type UpdateStaffSchedulePayload = {
  scheduleId: number;
  status: string;
};

function parseDateOnly(value: string | number[] | null | undefined): string {
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10);
  }
  return '';
}

function combineDateAndTime(dateInput: string, value: ApiScheduleValue): Date | null {
  if (!dateInput || value == null) return null;

  const [year, month, day] = dateInput.split('-').map(Number);
  if (!year || !month || !day) return null;

  if (Array.isArray(value)) {
    if (value.length >= 5) {
      const [dateYear, dateMonth, dateDay, hour, minute, second = 0] = value;
      return new Date(dateYear, dateMonth - 1, dateDay, hour, minute, second);
    }
    if (value.length >= 2) {
      const [hour, minute, second = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second);
    }
    return null;
  }

  if (typeof value === 'number') {
    return new Date(year, month - 1, day, Math.floor(value / 3600), Math.floor((value % 3600) / 60), value % 60);
  }

  if (typeof value === 'string') {
    if (value.includes('T')) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const [hour = 0, minute = 0, second = 0] = value.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) return null;
    return new Date(year, month - 1, day, hour, minute, second);
  }

  return parseInstant(value);
}

function parseInstant(value: ApiScheduleValue): Date | null {
  if (value == null) return null;

  if (Array.isArray(value)) {
    if (value.length >= 5) {
      const [year, month, day, hour, minute, second = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second);
    }
    return null;
  }

  if (typeof value === 'number') {
    return new Date(value > 1_000_000_000_000 ? value : value * 1000);
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const seconds = value.epochSecond ?? value.seconds;
  if (typeof seconds === 'number') {
    const nanos = value.nano ?? value.nanos ?? 0;
    return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
  }

  return null;
}

function normalizeSchedule(raw: RawStaffSchedule): StaffSchedule | null {
  const scheduleDate = parseDateOnly(raw.date ?? raw.scheduleDate ?? raw.schedule_date);
  const plannedStartTime =
    combineDateAndTime(scheduleDate, raw.startTime ?? raw.start_time) ??
    parseInstant(raw.plannedStartTime ?? raw.planned_start_time);
  const plannedEndTime =
    combineDateAndTime(scheduleDate, raw.endTime ?? raw.end_time) ??
    parseInstant(raw.plannedEndTime ?? raw.planned_end_time);

  if (!plannedStartTime || !plannedEndTime) {
    return null;
  }

  return {
    id: Number(raw.id),
    employeeId: raw.employeeId ?? raw.employee_id ?? raw.userId ?? raw.user_id ?? '',
    employeeName: raw.employeeName ?? raw.employee_name ?? null,
    scheduleDate,
    plannedStartTime,
    plannedEndTime,
    actualStartTime: parseInstant(raw.actualStartTime ?? raw.actual_start_time),
    actualEndTime: parseInstant(raw.actualEndTime ?? raw.actual_end_time),
    status: raw.status ?? null,
  };
}

function unpackSchedules(payload: any): RawStaffSchedule[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.schedules)) return data.schedules;
  if (Array.isArray(data?.data?.schedules)) return data.data.schedules;
  return [];
}

export async function listStaffSchedules(params: StaffScheduleListParams): Promise<StaffSchedule[]> {
  const requestParams = {
    employeeId: params.employeeId,
    date: params.scheduleDate,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    status: params.status,
    page: 1,
    pageSize: 100,
  };
  let response;
  try {
    response = await api.get(`/api/v1/orgs/${params.orgId ?? DEFAULT_ORG_ID}/schedules`, {
      params: requestParams,
    });
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status !== 404 && status !== 405) {
      throw error;
    }
    response = await api.get('/api/schedules', {
      params: requestParams,
    });
  }

  return unpackSchedules(response.data)
    .map(normalizeSchedule)
    .filter((schedule): schedule is StaffSchedule => schedule != null)
    .sort((a, b) => a.plannedStartTime.getTime() - b.plannedStartTime.getTime());
}

export function useStaffSchedules(params: StaffScheduleListParams) {
  return useQuery({
    queryKey: [
      'staff-schedules',
      params.orgId ?? DEFAULT_ORG_ID,
      params.employeeId,
      params.scheduleDate,
      params.dateFrom,
      params.dateTo,
      params.status,
    ],
    queryFn: () => listStaffSchedules(params),
    enabled: params.enabled ?? (!!params.employeeId && (!!params.scheduleDate || !!params.dateFrom || !!params.dateTo)),
  });
}

function unpackSchedule(payload: any): RawStaffSchedule {
  return payload?.data?.data ?? payload?.data ?? payload;
}

export async function updateStaffSchedule(
  payload: UpdateStaffSchedulePayload,
  orgId = DEFAULT_ORG_ID,
): Promise<StaffSchedule> {
  let response;
  try {
    response = await api.put(`/api/v1/orgs/${orgId}/schedule/${payload.scheduleId}`, {
      status: payload.status,
    });
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status !== 404 && status !== 405) {
      throw error;
    }
    response = await api.put(`/api/schedules/${payload.scheduleId}`, {
      status: payload.status,
    });
  }
  const schedule = normalizeSchedule(unpackSchedule(response.data));
  if (!schedule) {
    throw new Error('Schedule update returned an invalid response');
  }
  return schedule;
}

export function useAcceptStaffSchedule(orgId = DEFAULT_ORG_ID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: number) =>
      updateStaffSchedule({ scheduleId, status: 'Accepted' }, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules', orgId] });
    },
  });
}

function unpackEmployees(payload: any): RawEmployee[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.data?.employees)) return data.data.employees;
  return [];
}

export async function listScheduleEmployees(orgId = DEFAULT_ORG_ID): Promise<ScheduleEmployee[]> {
  const response = await api.get(`/api/v1/orgs/${orgId}/employees`, {
    params: { view: 'flat' },
  });

  return unpackEmployees(response.data)
    .filter((employee) => employee.id)
    .map((employee) => ({
      id: employee.id as string,
      name: employee.name || employee.email || employee.id || 'Employee',
    }));
}

export function useScheduleEmployees(orgId = DEFAULT_ORG_ID, enabled = true) {
  return useQuery({
    queryKey: ['schedule-employees', orgId],
    queryFn: () => listScheduleEmployees(orgId),
    enabled,
    retry: false,
  });
}

function unpackAvailableEmployees(payload: any): AvailableSwapEmployee[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.employees)) return data.data.employees;
  return [];
}

export async function listAvailableSwapEmployees(params: AvailableSwapEmployeeParams): Promise<AvailableSwapEmployee[]> {
  if (!params.date || !params.startTime || !params.endTime) {
    return [];
  }

  const response = await api.get(`/api/v1/orgs/${params.orgId ?? DEFAULT_ORG_ID}/schedule/swaps/available/employees`, {
    params: {
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
    },
  });

  return unpackAvailableEmployees(response.data)
    .filter((employee) => employee.employeeId)
    .map((employee) => ({
      employeeId: employee.employeeId,
      name: employee.name || employee.email || employee.employeeId,
      email: employee.email ?? null,
      titleName: employee.titleName ?? null,
    }));
}

export function useAvailableSwapEmployees(params: AvailableSwapEmployeeParams) {
  return useQuery({
    queryKey: ['available-swap-employees', params.orgId ?? DEFAULT_ORG_ID, params.date, params.startTime, params.endTime],
    queryFn: () => listAvailableSwapEmployees(params),
    enabled: params.enabled ?? (!!params.date && !!params.startTime && !!params.endTime),
    retry: false,
  });
}

function unpackSwap(payload: any): RawScheduleSwap {
  return payload?.data ?? payload;
}

function normalizeSwap(raw: RawScheduleSwap): ScheduleSwap {
  const requestScheduleId = raw.requestScheduleId ?? raw.request_schedule_id ?? raw.fromScheduleId ?? raw.from_schedule_id;
  const targetScheduleId = raw.targetScheduleId ?? raw.target_schedule_id ?? raw.toScheduleId ?? raw.to_schedule_id;
  const rawStatus = raw.status ?? raw.approval ?? 'Requested';
  const status = rawStatus === 'Pending' ? 'Requested' : rawStatus;

  return {
    id: Number(raw.id),
    requestScheduleId: Number(requestScheduleId),
    targetScheduleId: targetScheduleId == null ? null : Number(targetScheduleId),
    targetEmployeeId: raw.targetEmployeeId ?? raw.target_employee_id ?? null,
    requestEmployeeName: raw.requestEmployeeName ?? raw.request_employee_name ?? null,
    targetEmployeeName: raw.targetEmployeeName ?? raw.target_employee_name ?? null,
    requestEmployeeTitleName: raw.requestEmployeeTitleName ?? raw.request_employee_title_name ?? null,
    targetEmployeeTitleName: raw.targetEmployeeTitleName ?? raw.target_employee_title_name ?? null,
    requestedBy: raw.requestedBy ?? raw.requested_by ?? null,
    status: status as ScheduleSwapStatus,
    approvedBy: raw.approvedBy ?? raw.approved_by ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    createdBy: raw.createdBy ?? raw.created_by ?? null,
    updatedBy: raw.updatedBy ?? raw.updated_by ?? null,
  };
}

export async function createScheduleSwap(payload: CreateScheduleSwapPayload, orgId = DEFAULT_ORG_ID): Promise<ScheduleSwap> {
  let response;
  try {
    response = await api.post(`/api/v1/orgs/${orgId}/schedule/swap`, {
      requestScheduleId: payload.requestScheduleId,
      targetEmployeeId: payload.targetEmployeeId,
      targetScheduleId: payload.targetScheduleId,
      requestedBy: payload.requestedBy,
      status: payload.status ?? 'Requested',
      approvedBy: payload.approvedBy,
    });
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status !== 404 && status !== 405) {
      throw error;
    }
    response = await api.post('/api/schedule/swaps', {
      fromScheduleId: payload.requestScheduleId,
      toScheduleId: payload.targetScheduleId,
    });
  }
  return normalizeSwap(unpackSwap(response.data));
}

export function useCreateScheduleSwap(orgId = DEFAULT_ORG_ID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateScheduleSwapPayload) =>
      createScheduleSwap(payload, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules', orgId] });
    },
  });
}
