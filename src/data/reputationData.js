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

  // Maximum reputation that can be earned per run, by map tier
  // Prevents grinding easy maps with high-value loadouts
  TIER_CAPS: {
    1: 5000,    // Tier 1 maps cap at 5000 rep
    2: 15000,   // Tier 2 maps cap at 15000 rep
    3: 50000,   // Tier 3 maps cap at 50000 rep (effectively uncapped for most loadouts)
  },

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
