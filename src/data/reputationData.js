/**
 * Reputation System Configuration
 *
 * Controls how reputation is awarded based on in-game actions.
 * Event-driven: players earn rep by winning combats, looting PoIs, and extracting.
 * All values are tunable starting points.
 */

export const REPUTATION_EVENTS = {
  COMBAT_WIN: {
    Easy: 150,
    Normal: 300,
    Medium: 300,
    Hard: 500,
  },
  BOSS_KILL: {
    Easy: 300,
    Normal: 600,
    Medium: 600,
    Hard: 1000,
  },
  POI_LOOT: {
    perimeter: 100,
    mid: 200,
    core: 400,
  },
  EXTRACTION_BONUS: {
    1: 200,   // Tier 1
    2: 400,   // Tier 2
    3: 700,   // Tier 3
  },
};

export const REPUTATION = {
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
