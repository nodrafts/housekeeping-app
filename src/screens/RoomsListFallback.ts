import type { InventoryItem } from '../modules/housekeeping/inventoryTypes';

export const FALLBACK_INVENTORY: InventoryItem[] = [
  { id: 'toilet', name: 'Toilet', tier: 'FIXED', commonIssues: ['Will not flush', 'Leaking', 'Clogged'] },
  { id: 'sink-faucet', name: 'Sink / Faucet', tier: 'FIXED', commonIssues: ['Leaking', 'Low pressure', 'Handle broken'] },
  { id: 'shower-head', name: 'Shower Head', tier: 'FIXED', commonIssues: ['Low pressure', 'Leaking', 'Clogged'] },
  { id: 'tv', name: 'TV', tier: 'FIXED', commonIssues: ['No picture', 'No sound', 'Remote not working'] },
  { id: 'hvac-unit', name: 'HVAC Unit', tier: 'FIXED', commonIssues: ['Not cooling', 'Not heating', 'Noisy'] },
  { id: 'bed-frame', name: 'Bed Frame', tier: 'MOVABLE', commonIssues: ['Broken slat', 'Squeaking', 'Wobbly'] },
  { id: 'mini-fridge', name: 'Mini Fridge', tier: 'MOVABLE', commonIssues: ['Not cooling', 'Leaking', 'Noisy'] },
  { id: 'crib', name: 'Crib', tier: 'MOVABLE', commonIssues: ['Broken slat', 'Wobbly', 'Missing hardware'] },
  { id: 'lamp', name: 'Lamp', tier: 'MOVABLE', commonIssues: ['Not turning on', 'Flickering', 'Cord frayed'] },
  { id: 'curtains-drapes', name: 'Curtains / Drapes', tier: 'FIXED', commonIssues: ['Rod broken', 'Torn', 'Track stuck'] },
  { id: 'coffee-maker', name: 'Coffee Maker', tier: 'MOVABLE', commonIssues: ['Will not brew', 'Leaking', 'Not heating'] },
  { id: 'fire-extinguisher', name: 'Fire Extinguisher', tier: 'FIXED', commonIssues: ['Expired', 'Damaged', 'Missing'] },
];
