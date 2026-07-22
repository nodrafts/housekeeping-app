import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://nodrafts-property-management-dev.fly.dev',
});

/** Human-readable message from failed API calls (for Alert / debugging). */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as unknown;
    if (data == null) {
      return err.message || (status ? `Request failed (HTTP ${status})` : 'Network error');
    }
    if (typeof data === 'string') return data.length > 500 ? `${data.slice(0, 500)}…` : data;
    if (typeof data === 'object' && data !== null) {
      const o = data as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
      if (typeof o.error === 'string') return o.error;
      if (typeof o.detail === 'string') return o.detail;
      if (o.data && typeof o.data === 'object') {
        const d = o.data as Record<string, unknown>;
        if (typeof d.message === 'string') return d.message;
      }
      try {
        const s = JSON.stringify(data);
        return s.length > 500 ? `${s.slice(0, 500)}…` : s;
      } catch {
        return status ? `HTTP ${status}` : 'Request failed';
      }
    }
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

// Default org scoping header used by Property Management controllers.
// Backend expects: X-Org-Id
api.defaults.headers.common['X-Org-Id'] = 'e3ca60db-1094-442d-af38-c2c3ce8f239b';

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
