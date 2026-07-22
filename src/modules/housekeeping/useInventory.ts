import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { InventoryItem, InventoryTier } from './inventoryTypes';

type InventoryTypeResponse = {
  id?: string;
  inventoryTypeId?: string;
  typeId?: string;
  name?: string;
  displayName?: string;
  tier?: InventoryTier;
  type?: InventoryTier;
  movable?: boolean;
  fixed?: boolean;
  commonIssues?: unknown;
  // Backend may return snake_case or other naming; we don't want TS to block us.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

function extractEnumsOfStrings(raw: unknown): string[] {
  const out = new Set<string>();
  const seen = new Set<any>();

  const visit = (x: any) => {
    if (x == null) return;
    if (typeof x !== 'object') return;
    if (seen.has(x)) return;
    seen.add(x);

    if (Array.isArray(x.enum) && x.enum.every((v: any) => typeof v === 'string')) {
      for (const v of x.enum) {
        const t = v.trim();
        if (t) out.add(t);
      }
    }

    if (Array.isArray(x)) {
      for (const item of x) visit(item);
      return;
    }

    for (const v of Object.values(x)) visit(v);
  };

  visit(raw);
  return Array.from(out);
}

function extractIssueString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'object') return String(value);

  const obj: any = value;

  const direct =
    obj.description ??
    obj.issue ??
    obj.issueDescription ??
    obj.issue_description ??
    obj.commonIssue ??
    obj.common_issue ??
    obj.commonIssueDescription ??
    obj.common_issue_description ??
    obj.text ??
    obj.title ??
    obj.name ??
    obj.value ??
    obj.label ??
    obj.problem ??
    obj.reason ??
    obj.cause ??
    null;
  if (typeof direct === 'string') return direct.trim() || null;

  // Sometimes nested: { issue: { description: ... } }
  const nested =
    obj.issue ??
    obj.issueDescription ??
    obj.issue_description ??
    obj.description ??
    obj.commonIssues ??
    obj.common_issues ??
    null;
  if (nested && typeof nested === 'object') {
    const nestedStr =
      (nested as any).description ??
      (nested as any).issue ??
      (nested as any).text ??
      (nested as any).value ??
      (nested as any).label ??
      null;
    if (typeof nestedStr === 'string') return nestedStr.trim() || null;
  }

  return null;
}

function findFirstStringArray(raw: unknown, depth = 0): string[] | null {
  if (raw == null) return null;
  if (depth > 16) return null;

  if (Array.isArray(raw)) {
    const normalized = raw
      .map((x) => (typeof x === 'string' ? x.trim() : typeof x === 'number' ? String(x).trim() : null))
      .filter((x): x is string => x != null && x.length > 0);

    if (
      normalized.length >= 2 &&
      normalized.some((s) => /[A-Za-z]/.test(s)) &&
      normalized.every((s) => s.length <= 120)
    ) {
      return Array.from(new Set(normalized));
    }

    // Otherwise, keep scanning
    for (const item of raw) {
      const nested = findFirstStringArray(item, depth + 1);
      if (nested && nested.length >= 2) return nested;
    }
    return null;
  }

  if (typeof raw === 'object') {
    const anyRaw: any = raw;
    // JSON schema-ish pattern: { enum: ["a", "b"] }
    if (Array.isArray(anyRaw.enum)) {
      const found = findFirstStringArray(anyRaw.enum, depth + 1);
      if (found && found.length >= 2) return found;
    }
    if (Array.isArray(anyRaw.oneOf)) {
      for (const v of anyRaw.oneOf) {
        const found = findFirstStringArray(v, depth + 1);
        if (found && found.length >= 2) return found;
      }
    }

    for (const v of Object.values(anyRaw)) {
      const found = findFirstStringArray(v, depth + 1);
      if (found && found.length >= 2) return found;
    }
  }

  return null;
}

function normalizeCommonIssues(raw: unknown, depth = 0): string[] {
  if (raw == null) return [];
  if (depth > 12) return [];

  // If backend stores jsonb as stringified JSON
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeCommonIssues(parsed, depth + 1);
    } catch {
      // Sometimes it's a comma-separated string
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  if (Array.isArray(raw)) {
    return raw
      .map((x) => extractIssueString(x))
      .filter((x): x is string => typeof x === 'string' && x.length > 0);
  }

  if (typeof raw === 'object') {
    const anyRaw: any = raw;

    // If backend returned a JSON-schema-like object, `enum` fields usually contain
    // the actual issue strings. Extract them first (ignores depth/shape).
    const enumExtracted = extractEnumsOfStrings(anyRaw);
    if (enumExtracted.length >= 2) return enumExtracted;

    // If backend returns an object like { "0": "Will not start", "1": "Leaking", ... }
    const values = Object.values(anyRaw).filter((v) => v != null);
    if (
      values.length > 0 &&
      values.every((v) => typeof v === 'string' || typeof v === 'number')
    ) {
      return values.map((v) => String(v).trim()).filter((v) => v.length > 0);
    }

    // If backend returns an object of issue objects, extract descriptions.
    if (values.length > 0 && values.every((v) => typeof v === 'object')) {
      const extracted = values
        .map((v) => extractIssueString(v))
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (extracted.length > 0) return extracted;
    }

    // Generic fallback:
    // recursively normalize each value and also try direct extraction from objects.
    const collected: string[] = [];
    for (const v of values) {
      const normalized = normalizeCommonIssues(v, depth + 1);
      if (normalized.length > 0) collected.push(...normalized);
      else {
        const extracted = extractIssueString(v);
        if (extracted) collected.push(extracted);
      }
    }
    const deduped = Array.from(new Set(collected.map((s) => s.trim()).filter(Boolean)));
    if (deduped.length > 0) return deduped;

    // Last-resort: collect all string leaves recursively, then filter.
    const stringLeaves: string[] = [];
    const visited = new Set<any>();
    const collect = (x: any, d: number) => {
      if (x == null) return;
      if (d > 30) return;
      if (typeof x === 'string') {
        const t = x.trim();
        if (t) stringLeaves.push(t);
        return;
      }
      if (typeof x === 'number' || typeof x === 'boolean') {
        stringLeaves.push(String(x).trim());
        return;
      }
      if (typeof x !== 'object') return;
      if (visited.has(x)) return;
      visited.add(x);
      if (Array.isArray(x)) {
        for (const item of x) collect(item, d + 1);
        return;
      }
      for (const v of Object.values(x)) collect(v, d + 1);
    };
    collect(anyRaw, depth + 1);

    const stopWords = new Set([
      'type',
      'properties',
      'items',
      'enum',
      'default',
      'keys',
      'additionalProperties',
      'attributeSchema',
      'createdAt',
      'updatedAt',
      'schema',
      'preview',
      'commonIssues',
      'commonIssuesPreview',
      'common_issues',
      'common_issues_preview',
      'inventoryTypeId',
      'estReplacementCost',
      'estReplacementCostType',
      'room',
      'value',
      'id',
      'tier',
      'name',
      'description',
    ]);

    const filtered = Array.from(
      new Set(
        stringLeaves
          .map((s) => s.trim())
          .filter((s) => {
            if (!s) return false;
            if (s.length < 2 || s.length > 80) return false;
            if (!/[A-Za-z]/.test(s)) return false;
            if (stopWords.has(s)) return false;
            // Exclude UUID-like strings
            if (/^[0-9a-f]{8}-/i.test(s)) return false;
            // Exclude ISO timestamps
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return false;
            // Exclude strings that are clearly schema-ish
            if (s.startsWith('[') || s.startsWith('{')) return false;
            return true;
          }),
      ),
    );
    if (filtered.length > 0) return filtered;

    // If heuristics fail, return the first plausible string array found inside the object.
    const foundArray = findFirstStringArray(anyRaw, depth + 1);
    if (foundArray && foundArray.length > 0) return foundArray;

    // Common backend keys that hold the actual issue list.
    const directCandidates = [
      anyRaw.commonIssues,
      anyRaw.common_issues,
      anyRaw.issues,
      anyRaw.items,
      anyRaw.values,
      anyRaw.descriptions,
      anyRaw.list,
      anyRaw.data,
    ];
    for (const cand of directCandidates) {
      if (Array.isArray(cand) || typeof cand === 'string') {
        const normalized = normalizeCommonIssues(cand, depth + 1);
        if (normalized.length > 0) return normalized;
      }
    }

    // Otherwise, scan object values for an array (or stringified array).
    for (const val of Object.values(anyRaw)) {
      if (Array.isArray(val)) {
        const normalized = normalizeCommonIssues(val, depth + 1);
        if (normalized.length > 0) return normalized;
      }
      if (typeof val === 'string' && val.trim().startsWith('[')) {
        const normalized = normalizeCommonIssues(val, depth + 1);
        if (normalized.length > 0) return normalized;
      }
      if (val && typeof val === 'object') {
        const normalized = normalizeCommonIssues(val, depth + 1);
        if (normalized.length > 0) return normalized;
      }
    }
  }

  return [];
}

function guessCommonIssuesFromRow(row: InventoryTypeResponse): string[] {
  const anyRow: any = row;
  // Scan for the first field that looks like an issue list.
  for (const [_key, val] of Object.entries(anyRow)) {
    if (val == null) continue;

    if (typeof val === 'string') {
      const parsed = (() => {
        try {
          return JSON.parse(val);
        } catch {
          return null;
        }
      })();
      if (parsed) {
        const normalized = normalizeCommonIssues(parsed);
        if (normalized.length > 0) return normalized;
      }
    }

    if (Array.isArray(val)) {
      const normalized = normalizeCommonIssues(val);
      if (normalized.length > 0) return normalized;
    }

    // If backend nests issues under objects, a common pattern is:
    // { commonIssues: { items: [...] } }
    if (typeof val === 'object' && val) {
      const normalized = normalizeCommonIssues(val);
      if (normalized.length > 0) return normalized;
    }
  }
  return [];
}

function normalizeInventoryTypes(rows: InventoryTypeResponse[]): InventoryItem[] {
  return rows
    .map((r) => {
      const id = String(r.id ?? r.inventoryTypeId ?? r.typeId ?? '').trim();
      const name = String(r.displayName ?? r.name ?? '').trim();

      let tier: InventoryTier | null =
        (r.tier as InventoryTier) ?? (r.type as InventoryTier) ?? null;
      if (!tier) {
        if (r.fixed === true) tier = 'FIXED';
        else if (r.movable === true) tier = 'MOVABLE';
      }

      // Try multiple potential backend field names.
      // Some backends return "commonIssues" as a schema-like object, but the actual values live in
      // "commonIssuesPreview". We therefore try candidates in order and take the first non-empty.
      const commonIssueCandidates: unknown[] = [
        r.commonIssues,
        (r as any).common_issues,
        (r as any).common_issue_descriptions,
        (r as any).common_issue,
        (r as any).issues,
        (r as any).issue_descriptions,
        (r as any).commonIssueDescriptions,
        (r as any).commonIssuesPreview,
        (r as any).common_issues_preview,
        (r as any).commonIssuesPreviewValue,
      ];

      let commonIssues: string[] = [];
      let rawCommonIssues: unknown = null;
      for (const candidate of commonIssueCandidates) {
        if (candidate == null) continue;
        rawCommonIssues = candidate;
        const normalized = normalizeCommonIssues(candidate);
        if (normalized.length > 0) {
          commonIssues = normalized;
          break;
        }
      }

      if (commonIssues.length === 0) {
        commonIssues = guessCommonIssuesFromRow(r);
      }

      if (!id || !name || !tier) return null;

      if (__DEV__ && commonIssues.length === 0) {
        // eslint-disable-next-line no-console
        console.log('[useInventory] commonIssues parsed empty', {
          id,
          name,
          tier,
          rawCommonIssues: JSON.stringify(rawCommonIssues),
        });
      }

      return { id, name, tier, commonIssues };
    })
    .filter(Boolean) as InventoryItem[];
}

async function fetchInventoryTypes(hotelCode: string): Promise<InventoryItem[]> {
  // Hotel-scoped inventory types catalog.
  // GET /api/v1/hotels/{hotelCode}/inventory-types (requires X-Org-Id header)
  const res = await api.get<{ data?: InventoryTypeResponse[] } | InventoryTypeResponse[]>(
    `/api/v1/hotels/${hotelCode}/inventory-types`,
  );

  // Support both shapes: { data: [...] } and raw [...]
  const payload: any = res.data;
  const rows: InventoryTypeResponse[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  if (__DEV__) {
    const arr = rows ?? [];
    const sample = arr[0];
    // eslint-disable-next-line no-console
    console.log('[useInventory] inventory-types response keys', sample ? Object.keys(sample) : []);
    // eslint-disable-next-line no-console
    console.log('[useInventory] sample inventory row', JSON.stringify(sample));
  }

  // If org-level isn't configured, you can swap to hotel-scoped:
  // `/api/v1/hotels/${DEFAULT_HOTEL_CODE}/inventory-types` (requires X-Org-Id header)
  return normalizeInventoryTypes(rows);
}

export function useInventory(hotelCode: string) {
  return useQuery({
    queryKey: ['inventory-types', hotelCode],
    queryFn: () => fetchInventoryTypes(hotelCode),
    enabled: !!hotelCode,
  });
}

export function filterInventoryByTier(
  items: InventoryItem[],
  tier: InventoryTier | null,
) {
  if (!tier) return [];
  return items.filter((i) => i.tier === tier);
}

