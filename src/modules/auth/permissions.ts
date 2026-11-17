import type { User } from './types';

export function hasHotelPermission(user: User | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.platformAdmin || user.canAccessAllHotels) return true;
  return Object.values(user.hotelPermissions ?? {}).some((permissions) =>
    permissions.includes('perm_admin') || permissions.includes(permission),
  );
}

export function hasPermissionAtHotel(
  user: User | null | undefined,
  hotelCode: string | null | undefined,
  permission: string,
): boolean {
  if (!user) return false;
  if (user.platformAdmin || user.canAccessAllHotels) return true;
  if (!hotelCode) return hasHotelPermission(user, permission);

  const permissions = user.hotelPermissions?.[hotelCode] ?? [];
  return permissions.includes('perm_admin') || permissions.includes(permission);
}
