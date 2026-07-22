import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../../lib/api';
import type { User, LoginRequest, UserRole } from './types';
import { setChatToken } from '../../lib/chatApi';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginRequest) => Promise<void>;
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
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hasAdminPermission(me: CurrentUserResponse | null): boolean {
  if (!me) return false;
  if (me.platformAdmin) return true;

  const orgPermissions = me.orgPermissions ?? [];
  if (orgPermissions.some((permission) => permission === 'super_user' || permission === 'perm_super_user')) {
    return true;
  }

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

  const login = async (payload: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<{
        data: {
          token: string;
          userId: string;
          email: string;
          firstName: string;
          middleName: string | null;
          lastName: string | null;
          mustChangePassword: boolean;
        };
      }>('/api/v1/auth/login', {
        email: payload.email,
        password: payload.password,
      });

      const { data } = response.data;
      setAuthToken(data.token);
      setChatToken(data.token);

      let currentUser: CurrentUserResponse | null = null;
      try {
        const meResponse = await api.get<{ data: CurrentUserResponse }>('/api/v1/auth/me');
        currentUser = meResponse.data.data;
      } catch {
        currentUser = null;
      }

      const fullName = [data.firstName, data.lastName]
        .filter(Boolean)
        .join(' ');
      const raw = data as any;
      const assignedHotels = currentUser?.assignedHotels ?? [];
      const firstHotelCode = raw.hotelCode ?? assignedHotels[0];

      const nextUser: User = {
        id: data.userId,
        name: currentUser?.name || fullName || data.email,
        email: data.email,
        role: buildRole(currentUser, raw.role),
        designation: raw.designation ?? undefined,
        hotelCode: firstHotelCode ?? undefined,
        hotelName: raw.hotelName ?? undefined,
        platformAdmin: currentUser?.platformAdmin ?? false,
        assignedHotels,
      };

      setUser(nextUser);
      setAccessToken(data.token);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
    setChatToken(null);
  };

  // TODO: load persisted user/token here
  useEffect(() => {}, []);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, error, login, logout }}
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
