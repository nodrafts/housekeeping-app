// Central place for Property Management scoping.
// Your backend routes are hotel/org scoped:
// - /api/v1/hotels/{hotelCode}/...
// - /api/v1/orgs/{orgId}/...
//
// For now we default these. You can replace with real values or env-based config later.
export const DEFAULT_ORG_ID = 'e3ca60db-1094-442d-af38-c2c3ce8f239b';
export const DEFAULT_HOTEL_CODE = 'default';

