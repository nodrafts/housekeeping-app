export type InventoryTier = 'MOVABLE' | 'FIXED';

export interface InventoryItem {
  id: string;
  name: string;
  tier: InventoryTier;
  commonIssues: string[];
}

