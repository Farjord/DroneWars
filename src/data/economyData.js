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
  HULL_REPAIR_COST_PER_HP: 200,

  // Drone repair costs by rarity (legacy - for reference)
  DRONE_REPAIR_COSTS: {
    Common: 50,
    Uncommon: 100,
    Rare: 200,
    Mythic: 500
  },

  // ========================================
  // SLOT-BASED REPAIR COSTS
  // ========================================

  // Flat cost to repair a damaged drone slot
  DRONE_SLOT_REPAIR_COST: 500,

  // Cost per 1 point of damage to repair a section slot
  SECTION_DAMAGE_REPAIR_COST: 200,

  // ========================================
  // REPLICATION COSTS
  // ========================================

  // Card replication costs by rarity
  REPLICATION_COSTS: {
    Common: 1000,
    Uncommon: 2500,
    Rare: 3000,
    Mythic: 5000
  },

  // ========================================
  // MIA RECOVERY (Scaled by Deck Value)
  // ========================================

  // Recovery cost = max(FLOOR, deckValue * MULTIPLIER)
  // Deck value = sum of replication costs for non-starter cards
  //            + blueprint costs for non-starter ships/drones/components
  MIA_RECOVERY_MULTIPLIER: 0.5,    // 50% of deck's total value
  MIA_RECOVERY_FLOOR: 500,         // Minimum recovery cost

  // DEPRECATED: Flat salvage cost (kept for reference)
  MIA_SALVAGE_COST: 500,

  // ========================================
  // STARTING VALUES
  // ========================================

  // Credits player starts with on new game
  STARTING_CREDITS: 1000,

  // ========================================
  // EXTRACTION LIMITS
  // ========================================

  // Max loot items player can extract with when using Slot 0 (starter deck)
  STARTER_DECK_EXTRACTION_LIMIT: 3,

  // Max loot items player can extract with when using custom decks (Slots 1-5)
  // This limit can be increased by reputation rank bonuses
  CUSTOM_DECK_EXTRACTION_LIMIT: 6,

  // ========================================
  // STARTER ITEM COSTS
  // ========================================

  // Cost to craft starter drones/components from Blueprints
  STARTER_BLUEPRINT_COSTS: {
    Common: 75,
    Uncommon: 175,
    Rare: 450,
    Mythic: 1100
  },

  // Flat fee to copy entire starter deck (all cards, drones, components, ship)
  STARTER_DECK_COPY_COST: 100,

  // ========================================
  // DECK SLOT UNLOCK COSTS
  // ========================================

  // Progressive costs to unlock deck slots 1-5 (Slot 0 is always free)
  // Must unlock slots sequentially (Slot 1 before Slot 2, etc.)
  DECK_SLOT_UNLOCK_COSTS: {
    1: 100,    // Low barrier to entry
    2: 250,    // Moderate increase
    3: 500,    // Significant investment
    4: 1000,   // Premium
    5: 2000,   // Endgame
  },

  // ========================================
  // FUTURE: Map entry costs, etc.
  // ========================================
};

export default ECONOMY;
