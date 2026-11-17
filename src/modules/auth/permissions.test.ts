import { hasPermissionAtHotel } from './permissions';
import type { User } from './types';

const user: User = {
  id: 'employee-1',
  name: 'Hotel Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  hotelPermissions: {
    COTBA: ['perm_chat_access', 'perm_chat_channel_manage'],
    PGTX: ['perm_chat_access'],
  },
};

describe('hasPermissionAtHotel', () => {
  it('limits a property permission to the matching hotel', () => {
    expect(hasPermissionAtHotel(user, 'COTBA', 'perm_chat_channel_manage')).toBe(true);
    expect(hasPermissionAtHotel(user, 'PGTX', 'perm_chat_channel_manage')).toBe(false);
  });

  it('allows platform-wide administrators', () => {
    expect(hasPermissionAtHotel({ ...user, platformAdmin: true }, 'PGTX', 'perm_chat_channel_manage')).toBe(true);
  });
});
