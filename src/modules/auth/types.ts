export type UserRole = 'STAFF' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation?: string;
  hotelCode?: string;   // pre-assigned hotel for STAFF
  hotelName?: string;
}

export interface AuthSession {
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
