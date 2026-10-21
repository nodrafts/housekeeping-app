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
  passwordChangeEmail: string | null;
  passwordChanged: boolean;
  requiresOrganizationSelection: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  startPasswordChange: (payload: LoginRequest) => Promise<void>;
  finishPasswordChange: (newPassword: string) => Promise<void>;
  cancelPasswordChange: () => void;
  clearPasswordChanged: () => void;
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

type PasswordChangeSession = {
  email: string;
  temporaryPassword: string;
  token: string;
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
  const [passwordChangeSession, setPasswordChangeSession] = useState<PasswordChangeSession | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);
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
      hotelPermissions: currentUser.hotelPermissions ?? {},
      orgPermissions: currentUser.orgPermissions ?? [],
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
      if (data.mustChangePassword) {
        setPasswordChangeSession({
          email: payload.email.trim(),
          temporaryPassword: payload.password,
          token: data.token,
        });
        return;
      }

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

  const startPasswordChange = async (payload: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      const email = payload.email.trim();
      const response = await api.post<{ data: AuthResponse }>('/api/v1/auth/login', {
        email,
        password: payload.password,
      });
      const data = response.data.data;

      if (!data.mustChangePassword) {
        throw new Error('TEMPORARY_PASSWORD_NOT_REQUIRED');
      }

      setPasswordChangeSession({ email, temporaryPassword: payload.password, token: data.token });
    } catch (caught) {
      setPasswordChangeSession(null);
      if (caught instanceof Error && caught.message === 'TEMPORARY_PASSWORD_NOT_REQUIRED') {
        setError('TEMPORARY_PASSWORD_NOT_REQUIRED');
      } else {
        setError('INVALID_TEMPORARY_CREDENTIALS');
      }
      throw caught;
    } finally {
      setLoading(false);
    }
  };

  const finishPasswordChange = async (newPassword: string) => {
    if (!passwordChangeSession) {
      setError('PASSWORD_CHANGE_SESSION_EXPIRED');
      throw new Error('PASSWORD_CHANGE_SESSION_EXPIRED');
    }

    try {
      setLoading(true);
      setError(null);
      await api.post('/api/v1/auth/change-password', {
        currentPassword: passwordChangeSession.temporaryPassword,
        newPassword,
      }, {
        headers: { Authorization: `Bearer ${passwordChangeSession.token}` },
      });
      setPasswordChangeSession(null);
      setPasswordChanged(true);
      setAuthToken(null);
      setChatToken(null);
    } catch (caught) {
      setError('PASSWORD_CHANGE_FAILED');
      throw caught;
    } finally {
      setLoading(false);
    }
  };

  const cancelPasswordChange = () => {
    setPasswordChangeSession(null);
    setError(null);
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
    setPasswordChangeSession(null);
    queryClient.clear();
  };

  // TODO: load persisted user/token here
  useEffect(() => {}, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        error,
        passwordChangeEmail: passwordChangeSession?.email ?? null,
        passwordChanged,
        requiresOrganizationSelection,
        login,
        startPasswordChange,
        finishPasswordChange,
        cancelPasswordChange,
        clearPasswordChanged: () => setPasswordChanged(false),
        selectOrganization,
        logout,
      }}
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
