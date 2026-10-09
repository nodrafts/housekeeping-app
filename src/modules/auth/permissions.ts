import type { User } from './types';

export function hasHotelPermission(user: User | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.platformAdmin || user.canAccessAllHotels) return true;
  return Object.values(user.hotelPermissions ?? {}).some((permissions) =>
    permissions.includes('perm_admin') || permissions.includes(permission),
  );
}
