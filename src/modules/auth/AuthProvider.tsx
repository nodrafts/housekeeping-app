import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../../lib/api';
import type { User, LoginRequest, UserRole } from './types';
import { setChatToken } from '../../lib/chatApi';
import { queryClient } from '../../lib/queryClient';
import { setActiveOrgId } from '../../lib/propertyConfig';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  requiresOrganizationSelection: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  selectOrganization: (orgId: string) => Promise<void>;
  logout: () => void;
}

type CurrentUserResponse = {
  userId: string;
  email: string;
  name: string;
  platformAdmin: boolean;
  orgPermissions?: string[];
  hotelPermissions?: Record<string, string[]>;
  assignedHotels?: string[];
  orgId?: string | null;
};

type AuthResponse = {
  token: string;
  userId: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  mustChangePassword: boolean;
  orgId?: string | null;
  platformAdmin?: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hasOrgWideAccess(me: CurrentUserResponse | null): boolean {
  if (!me) return false;
  if (me.platformAdmin) return true;
  return (me.orgPermissions ?? []).some((permission) => permission === 'super_user' || permission === 'perm_super_user');
}

function hasAdminPermission(me: CurrentUserResponse | null): boolean {
  if (!me) return false;
  if (hasOrgWideAccess(me)) return true;

  return Object.values(me.hotelPermissions ?? {}).some((permissions) =>
    permissions.some((permission) => permission === 'admin' || permission === 'perm_admin'),
  );
}

function buildRole(me: CurrentUserResponse | null, fallbackRole?: string): UserRole {
  if (hasAdminPermission(me) || fallbackRole === 'ADMIN') {
    return 'ADMIN';
  }
  return 'STAFF';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresOrganizationSelection, setRequiresOrganizationSelection] = useState(false);

  const establishSession = async (data: AuthResponse) => {
    setAuthToken(data.token);
    setChatToken(data.token);
    setActiveOrgId(data.orgId);

    const meResponse = await api.get<{ data: CurrentUserResponse }>('/api/v1/auth/me');
    const currentUser = meResponse.data.data;
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
    const assignedHotels = Array.from(new Set([
      ...(currentUser.assignedHotels ?? []),
      ...Object.keys(currentUser.hotelPermissions ?? {}),
    ]));

    setUser({
      id: data.userId,
      name: currentUser.name || fullName || data.email,
      email: data.email,
      role: buildRole(currentUser),
      hotelCode: assignedHotels[0],
      platformAdmin: currentUser.platformAdmin,
      canAccessAllHotels: hasOrgWideAccess(currentUser),
      assignedHotels,
      orgId: data.orgId ?? currentUser.orgId ?? undefined,
    });
    setAccessToken(data.token);
  };

  const login = async (payload: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<{ data: AuthResponse }>('/api/v1/auth/login', {
        email: payload.email,
        password: payload.password,
      });

      const { data } = response.data;
      if (data.platformAdmin && !data.orgId) {
        setAuthToken(data.token);
        setChatToken(data.token);
        setAccessToken(data.token);
        setRequiresOrganizationSelection(true);
        return;
      }

      await establishSession(data);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = async (orgId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<{ data: AuthResponse }>('/api/v1/auth/select-org', { orgId });
      queryClient.clear();
      await establishSession(response.data.data);
      setRequiresOrganizationSelection(false);
    } catch {
      setError('Could not select organization');
      throw new Error('Could not select organization');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
    setChatToken(null);
    setActiveOrgId(null);
    setRequiresOrganizationSelection(false);
    queryClient.clear();
  };

  // TODO: load persisted user/token here
  useEffect(() => {}, []);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, error, requiresOrganizationSelection, login, selectOrganization, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
