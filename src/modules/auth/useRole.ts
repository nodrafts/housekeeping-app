import { useAuth } from './useAuth';

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? 'STAFF';
  return {
    role,
    isAdmin: role === 'ADMIN',
    isStaff: role === 'STAFF',
  };
}
