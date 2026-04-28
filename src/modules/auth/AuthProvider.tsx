import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../../lib/api';
import type { User, LoginRequest, LoginResponse } from './types';
import { setChatToken } from '../../lib/chatApi';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

      const fullName = [data.firstName, data.lastName]
        .filter(Boolean)
        .join(' ');

      // Backend may return role/hotelCode — fall back to STAFF if absent
      const raw = data as any;
      const nextUser: User = {
        id: data.userId,
        name: fullName || data.email,
        email: data.email,
        role: raw.role ?? 'STAFF',
        designation: raw.designation ?? undefined,
        hotelCode: raw.hotelCode ?? undefined,
        hotelName: raw.hotelName ?? undefined,
      };

      setUser(nextUser);
      setAccessToken(data.token);
      setAuthToken(data.token);
      setChatToken(data.token);
    } catch (e) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
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