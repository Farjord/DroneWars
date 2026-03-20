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
  // ENHANCEMENT COSTS
  // ========================================

  // Card enhancement costs by rarity (credits)
  // Also used for Blueprint crafting costs
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
  STARTING_CREDITS: 2000,

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
  // FUTURE: Map entry costs, etc.
  // ========================================
};

export default ECONOMY;
