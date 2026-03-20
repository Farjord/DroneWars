/**
 * Faction data definitions.
 * Pure data only — no logic (per CODE_STANDARDS).
 */

export const FACTIONS = {
  NEUTRAL_1: { id: 'NEUTRAL_1', name: 'Frontier', type: 'neutral', color: '#808080' },
  MOVEMENT: { id: 'MOVEMENT', name: 'Drift Syndicate', type: 'faction', color: '#3b82f6' },
  MARK: { id: 'MARK', name: 'Targeting Array', type: 'faction', color: '#ef4444' },
};

// Region boundaries — only faction zones are defined.
// Any hex NOT in a defined region defaults to NEUTRAL_1.
export const HANGAR_REGIONS = [
  { faction: 'MOVEMENT', colRange: [2, 9] },
  { faction: 'MARK', colRange: [17, 23] },
];
