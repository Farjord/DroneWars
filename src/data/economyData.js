/**
 * economyData.js
 * Centralized economy values for easy balancing
 * All costs, rewards, and economic values in one place
 */

export const ECONOMY = {
  // ========================================
  // REPAIR COSTS
  // ========================================

  // Hull repair cost per HP point
  HULL_REPAIR_COST_PER_HP: 10,

  // Drone repair costs by rarity
  DRONE_REPAIR_COSTS: {
    Common: 50,
    Uncommon: 100,
    Rare: 200,
    Mythic: 500
  },

  // ========================================
  // REPLICATION COSTS
  // ========================================

  // Card replication costs by rarity
  REPLICATION_COSTS: {
    Common: 100,
    Uncommon: 250,
    Rare: 600,
    Mythic: 1500
  },

  // ========================================
  // MIA RECOVERY
  // ========================================

  // Cost to salvage/recover an MIA ship
  MIA_SALVAGE_COST: 500,

  // ========================================
  // STARTING VALUES
  // ========================================

  // Credits player starts with on new game
  STARTING_CREDITS: 0,

  // ========================================
  // FUTURE: Map entry costs, blueprint crafting, etc.
  // ========================================
};

export default ECONOMY;
