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

  // Cost per 1 point of damage to repair a section slot
  SECTION_DAMAGE_REPAIR_COST: 200,

  // ========================================
  // REPLICATION / ENHANCEMENT COSTS
  // ========================================

  // Card replication costs by rarity (legacy key — used by BlueprintsModal crafting)
  REPLICATION_COSTS: {
    Common: 1000,
    Uncommon: 2500,
    Rare: 3000,
    Mythic: 5000
  },

  // Card enhancement costs by rarity (credits)
  ENHANCEMENT_COSTS: {
    Common: 1000,
    Uncommon: 2500,
    Rare: 3000,
    Mythic: 5000
  },

  // Number of base card copies consumed per enhancement
  ENHANCEMENT_COPIES_REQUIRED: {
    Common: 3,
    Uncommon: 3,
    Rare: 3,
    Mythic: 3
  },

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
  // Set to 0 for free deck creation
  STARTER_DECK_COPY_COST: 0,

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
