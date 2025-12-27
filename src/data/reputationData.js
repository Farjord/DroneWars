/**
 * Reputation System Configuration
 *
 * Controls how reputation is calculated and awarded based on loadout value.
 * All values are tunable starting points.
 */

export const REPUTATION = {
  // Multiplier applied when player goes MIA (fails to extract)
  // 0.25 = 25% of calculated rep on failure
  MIA_MULTIPLIER: 0.25,

  // NOTE: Reputation caps moved to mapData.js (maxReputationPerCombat property)
  // Each map tier defines its own per-combat reputation cap

  // Blueprint costs by rarity (used for loadout value calculation)
  // These match the existing REPLICATION_COSTS in economyData.js
  BLUEPRINT_COSTS: {
    Common: 100,
    Uncommon: 250,
    Rare: 600,
    Mythic: 1500,
  },

  // UI Colors
  COLORS: {
    primary: '#a855f7',      // Purple - matches progression theme
    secondary: '#7c3aed',    // Darker purple for gradients
    background: '#1f1f1f',   // Track background
    text: '#e5e7eb',         // Light text
    notification: '#ef4444', // Red notification badge
  },
};

export default REPUTATION;
