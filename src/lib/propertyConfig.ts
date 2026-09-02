// Central place for Property Management scoping.
// Your backend routes are hotel/org scoped:
// - /api/v1/hotels/{hotelCode}/...
// - /api/v1/orgs/{orgId}/...
//
// For now we default these. You can replace with real values or env-based config later.
const FALLBACK_ORG_ID = 'e3ca60db-1094-442d-af38-c2c3ce8f239b';

export let DEFAULT_ORG_ID = FALLBACK_ORG_ID;

export function setActiveOrgId(orgId?: string | null) {
  DEFAULT_ORG_ID = orgId?.trim() || FALLBACK_ORG_ID;
}
export const DEFAULT_HOTEL_CODE = 'COTBA';

