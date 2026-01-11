// ========================================
// GAME CONFIGURATION
// ========================================
// Central configuration for core game mechanics
// These values can be adjusted for game balancing

/**
 * Win Condition Configuration
 *
 * The game uses a total damage model for determining victory.
 * A player wins when they deal damage equal to a percentage of
 * the opponent's total max hull across all ship sections.
 *
 * Example: With DAMAGE_PERCENTAGE = 0.60 and a ship with 30 total hull,
 * the attacker needs to deal 18 damage (30 * 0.60) to win.
 */
export const WIN_CONDITION = {
  // Percentage of total max hull that must be damaged to win
  // 0.60 = 60% of total hull must be depleted
  // Adjust this value during playtesting (valid range: 0.50 - 0.80)
  DAMAGE_PERCENTAGE: 0.60
};

export default {
  WIN_CONDITION
};
