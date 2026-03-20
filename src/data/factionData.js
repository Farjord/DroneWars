/**
 * Faction data definitions.
 * Pure data only — no logic (per CODE_STANDARDS).
 */

export const FACTIONS = {
  NEUTRAL_1: { id: 'NEUTRAL_1', name: 'Frontier', type: 'neutral', color: '#808080', logo: '/DroneWars/Factions/Neutral_1.png' },
  MOVEMENT: { id: 'MOVEMENT', name: 'Drift Syndicate', type: 'faction', color: '#f97316', logo: '/DroneWars/Factions/Movement.png' },
  MARK: { id: 'MARK', name: 'Targeting Array', type: 'faction', color: '#ec4899', logo: '/DroneWars/Factions/Marked.png' },
};

// Region boundaries — organic zones defined by center + radius + harmonic distortion.
// distortion entries are [amplitude, frequency, phase] that perturb the circular
// boundary per-angle, creating natural blob shapes.
// Any hex NOT in a defined region defaults to NEUTRAL_1.
export const HANGAR_REGIONS = [
  { faction: 'MOVEMENT', center: [3, 8], radius: 4, distortion: [[1.8, 2, 0.5], [1.2, 3, 2.1], [0.8, 5, 4.0]] },
  { faction: 'MARK', center: [22, 10], radius: 3.5, distortion: [[1.5, 2, 1.8], [1.0, 3, 0.3], [0.9, 4, 3.5]] },
];
