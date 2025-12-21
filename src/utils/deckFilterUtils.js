/**
 * deckFilterUtils.js
 * Utility functions for deck builder filtering
 *
 * Provides filter logic for cards and drones with:
 * - OR logic for mutually exclusive properties (rarity, type, target, damage type)
 * - AND logic for abilities
 * - Support for Starter rarity in extraction mode
 */

// ========================================
// CONSTANTS
// ========================================

export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Mythic'];
export const RARITY_ORDER_EXTRACTION = ['Starter', 'Common', 'Uncommon', 'Rare', 'Mythic'];

// ========================================
// CARD FILTERING
// ========================================

/**
 * Filter cards based on filter criteria
 *
 * @param {Array} cards - Array of card objects to filter
 * @param {Object} filters - Filter criteria object
 * @returns {Array} Filtered cards
 */
export function filterCards(cards, filters) {
  return cards.filter(card => {
    // AI Only filter (hide by default)
    if (!filters.includeAIOnly && card.aiOnly) {
      return false;
    }

    // Hide Enhanced filter
    if (filters.hideEnhanced && card.id.endsWith('_ENHANCED')) {
      return false;
    }

    // Cost range filter
    if (card.cost < filters.cost.min || card.cost > filters.cost.max) {
      return false;
    }

    // Text search filter (name or description, case-insensitive)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const nameMatch = card.name?.toLowerCase().includes(searchLower);
      const descMatch = card.description?.toLowerCase().includes(searchLower);
      if (!nameMatch && !descMatch) {
        return false;
      }
    }

    // Rarity filter (OR logic) - supports Starter via isStarterPool
    if (filters.rarity.length > 0) {
      const matchesRarity = filters.rarity.some(r => {
        if (r === 'Starter') {
          return card.isStarterPool === true;
        }
        return card.rarity === r && !card.isStarterPool;
      });
      if (!matchesRarity) {
        return false;
      }
    }

    // Type filter (OR logic)
    if (filters.type.length > 0) {
      if (!filters.type.includes(card.type)) {
        return false;
      }
    }

    // Target filter (OR logic)
    if (filters.target.length > 0) {
      if (!filters.target.includes(card.targetingText)) {
        return false;
      }
    }

    // Damage type filter (OR logic)
    if (filters.damageType.length > 0) {
      // Cards without damage type should pass if no damage type filter selected
      if (card.damageType && !filters.damageType.includes(card.damageType)) {
        return false;
      }
    }

    // Abilities filter (AND logic - must have ALL selected abilities)
    if (filters.abilities.length > 0) {
      const hasAllAbilities = filters.abilities.every(ability =>
        card.keywords?.includes(ability)
      );
      if (!hasAllAbilities) {
        return false;
      }
    }

    return true;
  });
}

// ========================================
// DRONE FILTERING
// ========================================

/**
 * Filter drones based on filter criteria
 *
 * @param {Array} drones - Array of drone objects to filter
 * @param {Object} filters - Filter criteria object
 * @returns {Array} Filtered drones
 */
export function filterDrones(drones, filters) {
  return drones.filter(drone => {
    // AI Only filter (hide by default)
    if (!filters.includeAIOnly && drone.aiOnly) {
      return false;
    }

    // Text search filter (name or description, case-insensitive)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const nameMatch = drone.name?.toLowerCase().includes(searchLower);
      const descMatch = drone.description?.toLowerCase().includes(searchLower);
      if (!nameMatch && !descMatch) {
        return false;
      }
    }

    // Rarity filter (OR logic) - supports Starter via isStarterPool
    if (filters.rarity.length > 0) {
      const matchesRarity = filters.rarity.some(r => {
        if (r === 'Starter') {
          return drone.isStarterPool === true;
        }
        return drone.rarity === r && !drone.isStarterPool;
      });
      if (!matchesRarity) {
        return false;
      }
    }

    // Class filter (OR logic)
    if (filters.class.length > 0) {
      if (!filters.class.includes(drone.class)) {
        return false;
      }
    }

    // Damage type filter (OR logic)
    if (filters.damageType.length > 0) {
      if (drone.damageType && !filters.damageType.includes(drone.damageType)) {
        return false;
      }
    }

    // Abilities filter (AND logic - must have ALL selected abilities)
    if (filters.abilities.length > 0) {
      const hasAllAbilities = filters.abilities.every(ability =>
        drone.keywords?.includes(ability)
      );
      if (!hasAllAbilities) {
        return false;
      }
    }

    return true;
  });
}

// ========================================
// RARITY SORTING
// ========================================

/**
 * Sort items by rarity
 *
 * @param {Array} items - Array of items with rarity property
 * @param {boolean} extractionMode - If true, Starter items sort first
 * @returns {Array} Sorted items
 */
export function sortByRarity(items, extractionMode = false) {
  const order = extractionMode ? RARITY_ORDER_EXTRACTION : RARITY_ORDER;

  return [...items].sort((a, b) => {
    // In extraction mode, Starter items (isStarterPool) come first
    if (extractionMode) {
      const aIsStarter = a.isStarterPool === true;
      const bIsStarter = b.isStarterPool === true;

      if (aIsStarter && !bIsStarter) return -1;
      if (!aIsStarter && bIsStarter) return 1;
    }

    // Sort by rarity order
    const aIndex = order.indexOf(a.rarity);
    const bIndex = order.indexOf(b.rarity);

    return aIndex - bIndex;
  });
}

// ========================================
// ACTIVE FILTER COUNTING
// ========================================

/**
 * Count the number of active filters
 *
 * @param {Object} filters - Filter criteria object
 * @param {Object} filterOptions - Available filter options (for determining defaults)
 * @returns {number} Number of active filters
 */
export function countActiveFilters(filters, filterOptions) {
  let count = 0;

  // Search text
  if (filters.searchText) {
    count += 1;
  }

  // Cost range (count as 1 if different from default)
  if (
    filters.cost.min > filterOptions.minCost ||
    filters.cost.max < filterOptions.maxCost
  ) {
    count += 1;
  }

  // Array filters - count each selection
  count += filters.rarity?.length || 0;
  count += filters.type?.length || 0;
  count += filters.target?.length || 0;
  count += filters.damageType?.length || 0;
  count += filters.abilities?.length || 0;

  // Boolean filters
  if (filters.hideEnhanced) {
    count += 1;
  }
  if (filters.includeAIOnly) {
    count += 1;
  }

  return count;
}

// ========================================
// FILTER CHIP GENERATION
// ========================================

/**
 * Generate filter chip data from current card filters
 *
 * @param {Object} filters - Current filter state
 * @param {Object} filterOptions - Available filter options
 * @returns {Array} Array of chip objects { label, filterType, filterValue }
 */
export function generateFilterChips(filters, filterOptions) {
  const chips = [];

  // Search text chip
  if (filters.searchText) {
    chips.push({
      label: `"${filters.searchText}"`,
      filterType: 'searchText',
      filterValue: null,
    });
  }

  // Cost range chip
  if (
    filters.cost.min > filterOptions.minCost ||
    filters.cost.max < filterOptions.maxCost
  ) {
    chips.push({
      label: `Cost: ${filters.cost.min}-${filters.cost.max}`,
      filterType: 'cost',
      filterValue: null,
    });
  }

  // Rarity chips
  filters.rarity?.forEach(rarity => {
    chips.push({
      label: rarity,
      filterType: 'rarity',
      filterValue: rarity,
    });
  });

  // Type chips
  filters.type?.forEach(type => {
    chips.push({
      label: `Type: ${type}`,
      filterType: 'type',
      filterValue: type,
    });
  });

  // Target chips
  filters.target?.forEach(target => {
    chips.push({
      label: `Target: ${target}`,
      filterType: 'target',
      filterValue: target,
    });
  });

  // Damage type chips
  filters.damageType?.forEach(damageType => {
    chips.push({
      label: `Damage: ${damageType}`,
      filterType: 'damageType',
      filterValue: damageType,
    });
  });

  // Ability chips
  filters.abilities?.forEach(ability => {
    chips.push({
      label: ability,
      filterType: 'abilities',
      filterValue: ability,
    });
  });

  // Hide Enhanced chip
  if (filters.hideEnhanced) {
    chips.push({
      label: 'No Enhanced',
      filterType: 'hideEnhanced',
      filterValue: null,
    });
  }

  // Include AI Only chip
  if (filters.includeAIOnly) {
    chips.push({
      label: '+AI Cards',
      filterType: 'includeAIOnly',
      filterValue: null,
    });
  }

  return chips;
}

/**
 * Generate filter chip data from current drone filters
 *
 * @param {Object} filters - Current drone filter state
 * @returns {Array} Array of chip objects { label, filterType, filterValue }
 */
export function generateDroneFilterChips(filters) {
  const chips = [];

  // Search text chip
  if (filters.searchText) {
    chips.push({
      label: `"${filters.searchText}"`,
      filterType: 'searchText',
      filterValue: null,
    });
  }

  // Rarity chips
  filters.rarity?.forEach(rarity => {
    chips.push({
      label: rarity,
      filterType: 'rarity',
      filterValue: rarity,
    });
  });

  // Class chips
  filters.class?.forEach(classNum => {
    chips.push({
      label: `Class ${classNum}`,
      filterType: 'class',
      filterValue: classNum,
    });
  });

  // Damage type chips
  filters.damageType?.forEach(damageType => {
    chips.push({
      label: `Damage: ${damageType}`,
      filterType: 'damageType',
      filterValue: damageType,
    });
  });

  // Ability chips
  filters.abilities?.forEach(ability => {
    chips.push({
      label: ability,
      filterType: 'abilities',
      filterValue: ability,
    });
  });

  // Include AI Only chip
  if (filters.includeAIOnly) {
    chips.push({
      label: '+AI Drones',
      filterType: 'includeAIOnly',
      filterValue: null,
    });
  }

  return chips;
}

/**
 * Count the number of active drone filters
 *
 * @param {Object} filters - Drone filter criteria object
 * @returns {number} Number of active filters
 */
export function countActiveDroneFilters(filters) {
  let count = 0;

  // Search text
  if (filters.searchText) {
    count += 1;
  }

  // Array filters - count each selection
  count += filters.rarity?.length || 0;
  count += filters.class?.length || 0;
  count += filters.damageType?.length || 0;
  count += filters.abilities?.length || 0;

  // Boolean filters
  if (filters.includeAIOnly) {
    count += 1;
  }

  return count;
}

// ========================================
// DEFAULT FILTER STATE CREATORS
// ========================================

/**
 * Create default card filter state
 *
 * @param {Object} filterOptions - Available filter options
 * @returns {Object} Default card filters
 */
export function createDefaultCardFilters(filterOptions) {
  return {
    searchText: '',
    cost: {
      min: filterOptions?.minCost || 0,
      max: filterOptions?.maxCost || 99,
    },
    rarity: [],
    type: [],
    target: [],
    damageType: [],
    abilities: [],
    hideEnhanced: false,
    includeAIOnly: false,
  };
}

/**
 * Create default drone filter state
 *
 * @returns {Object} Default drone filters
 */
export function createDefaultDroneFilters() {
  return {
    searchText: '',
    rarity: [],
    class: [],
    abilities: [],
    damageType: [],
    includeAIOnly: false,
  };
}
