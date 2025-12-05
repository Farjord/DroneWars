/**
 * Single Player Deck Utilities
 * Helper functions for calculating card/drone/component availability in Extraction Mode
 */

import fullCardCollection from '../data/cardData.js';
import fullDroneCollection from '../data/droneData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import { getAllShips } from '../data/shipData.js';
import { starterPoolCards, starterPoolDroneNames, starterPoolShipIds } from '../data/saveGameSchema.js';

/**
 * Calculate available cards for a specific ship slot
 * Starter pool cards are unlimited; inventory cards are finite minus usage in other slots
 *
 * @param {number} targetSlotId - The slot being edited
 * @param {Array} shipSlots - All ship slots
 * @param {Object} inventory - Player inventory { cardId: quantity }
 * @returns {Array} Cards with availableQuantity property
 */
export function calculateAvailableCards(targetSlotId, shipSlots, inventory) {
  // Count cards used in OTHER active slots (not target, not slot 0)
  const usedCards = {};
  shipSlots.forEach(slot => {
    if (slot.id !== targetSlotId && slot.id !== 0 && slot.status === 'active') {
      (slot.decklist || []).forEach(card => {
        usedCards[card.id] = (usedCards[card.id] || 0) + card.quantity;
      });
    }
  });

  // Build available collection
  return fullCardCollection.map(card => {
    let availableQuantity;
    const isStarterPool = starterPoolCards.includes(card.id);

    if (isStarterPool) {
      // Starter pool: unlimited availability in ALL slots
      availableQuantity = 99;
    } else {
      // For non-starter cards: check inventory
      const owned = inventory[card.id] || 0;
      const usedElsewhere = usedCards[card.id] || 0;
      availableQuantity = Math.max(0, owned - usedElsewhere);
    }

    return {
      ...card,
      availableQuantity,
      isStarterPool
    };
  }).filter(card => card.availableQuantity > 0);
}

/**
 * Calculate available drones for a specific ship slot
 * Starter pool drones are unlimited; acquired drones are finite minus usage in other slots
 *
 * @param {number} targetSlotId - The slot being edited
 * @param {Array} shipSlots - All ship slots
 * @param {Array} droneInstances - All drone instances (for damage tracking)
 * @returns {Array} Drones with availableCount and damage info
 */
export function calculateAvailableDrones(targetSlotId, shipSlots, droneInstances) {
  // Count drones used in OTHER active slots (not target, not slot 0)
  const usedDrones = {};
  shipSlots.forEach(slot => {
    if (slot.id !== targetSlotId && slot.id !== 0 && slot.status === 'active') {
      (slot.drones || []).forEach(drone => {
        usedDrones[drone.name] = (usedDrones[drone.name] || 0) + 1;
      });
    }
  });

  // Group instances by drone name for damage checking
  const instancesByName = {};
  droneInstances.forEach(inst => {
    if (!instancesByName[inst.droneName]) {
      instancesByName[inst.droneName] = [];
    }
    instancesByName[inst.droneName].push(inst);
  });

  return fullDroneCollection
    .filter(drone => drone.selectable !== false)
    .map(drone => {
      const isStarterPool = starterPoolDroneNames.includes(drone.name);
      let availableCount;

      if (isStarterPool) {
        // Starter pool: unlimited availability in ALL slots
        availableCount = 99;
      } else {
        // For non-starter drones: check instances
        const ownedInstances = instancesByName[drone.name]?.length || 0;
        const usedElsewhere = usedDrones[drone.name] || 0;
        availableCount = Math.max(0, ownedInstances - usedElsewhere);
      }

      // Check for damaged instances (only relevant for non-starter drones)
      const relevantInstances = instancesByName[drone.name] || [];
      const hasDamagedInstance = relevantInstances.some(inst => inst.isDamaged);

      return {
        ...drone,
        availableCount,
        isStarterPool,
        hasDamagedInstance: !isStarterPool && hasDamagedInstance
      };
    }).filter(drone => drone.availableCount > 0);
}

/**
 * Calculate available ship components for a specific ship slot
 * Starter pool components are unlimited; acquired components are finite minus usage in other slots
 *
 * @param {number} targetSlotId - The slot being edited
 * @param {Array} shipSlots - All ship slots
 * @param {Array} componentInstances - All component instances (for hull tracking)
 * @returns {Array} Components with availability and hull info
 */
export function calculateAvailableComponents(targetSlotId, shipSlots, componentInstances) {
  // Count components used in OTHER active slots (not target, not slot 0)
  const usedComponents = {};
  shipSlots.forEach(slot => {
    if (slot.id !== targetSlotId && slot.id !== 0 && slot.status === 'active') {
      Object.keys(slot.shipComponents || {}).forEach(compId => {
        usedComponents[compId] = (usedComponents[compId] || 0) + 1;
      });
    }
  });

  // Group instances by component ID for hull tracking
  const instancesById = {};
  componentInstances.forEach(inst => {
    if (!instancesById[inst.componentId]) {
      instancesById[inst.componentId] = [];
    }
    instancesById[inst.componentId].push(inst);
  });

  return shipComponentCollection.map(component => {
    const isStarterPool = starterPoolCards.includes(component.id);
    let availableCount;

    if (isStarterPool) {
      // Starter pool: unlimited availability in ALL slots
      availableCount = 99;
    } else {
      // For non-starter components: check instances
      const ownedInstances = instancesById[component.id]?.length || 0;
      const usedElsewhere = usedComponents[component.id] || 0;
      availableCount = Math.max(0, ownedInstances - usedElsewhere);
    }

    // Get hull info from instance (only relevant for non-starter components)
    const relevantInstances = instancesById[component.id] || [];
    const hasLowHull = relevantInstances.some(inst =>
      inst.currentHull < inst.maxHull
    );

    return {
      ...component,
      availableCount,
      isStarterPool,
      hasLowHull: !isStarterPool && hasLowHull,
      instances: relevantInstances
    };
  }).filter(comp => comp.availableCount > 0);
}

/**
 * Calculate available ships for deck building
 * Starter pool ships are unlimited; crafted ships are limited by inventory and slot usage
 *
 * @param {number} targetSlotId - The slot being edited
 * @param {Array} shipSlots - All ship slots
 * @param {Object} inventory - Player inventory { shipId: quantity }
 * @returns {Array} Ships with availableCount and isStarterPool flags
 */
export function calculateAvailableShips(targetSlotId, shipSlots, inventory) {
  const allShips = getAllShips();

  // Count ships used in OTHER active slots (not target, not slot 0)
  const usedShips = {};
  shipSlots.forEach(slot => {
    if (slot.id !== targetSlotId && slot.id !== 0 && slot.status === 'active') {
      if (slot.shipId) {
        usedShips[slot.shipId] = (usedShips[slot.shipId] || 0) + 1;
      }
    }
  });

  return allShips.map(ship => {
    const isStarterPool = starterPoolShipIds.includes(ship.id);
    let availableCount;

    if (isStarterPool) {
      // Starter pool: unlimited availability in ALL slots
      availableCount = 99;
    } else {
      // For non-starter ships: check inventory
      const owned = inventory[ship.id] || 0;
      const usedElsewhere = usedShips[ship.id] || 0;
      availableCount = Math.max(0, owned - usedElsewhere);
    }

    return {
      ...ship,
      availableCount,
      isStarterPool
    };
  }).filter(ship => ship.availableCount > 0);
}

/**
 * Validate deck for deployment readiness
 *
 * @param {Object} deck - Card deck { cardId: quantity }
 * @param {Object} drones - Selected drones { droneName: quantity }
 * @param {Object} shipComponents - Ship components { componentId: lane }
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateDeckForDeployment(deck, drones, shipComponents) {
  const errors = [];
  const warnings = [];

  // Check card count
  const cardCount = Object.values(deck || {}).reduce((sum, qty) => sum + qty, 0);
  if (cardCount !== 40) {
    errors.push(`Deck requires exactly 40 cards (currently ${cardCount})`);
  }

  // Check drone count
  const droneCount = Object.values(drones || {}).reduce((sum, qty) => sum + qty, 0);
  if (droneCount !== 5) {
    errors.push(`Need exactly 5 drones (currently ${droneCount})`);
  }

  // Check ship components
  const selectedComponents = Object.keys(shipComponents || {}).filter(k => shipComponents[k]);
  if (selectedComponents.length !== 3) {
    errors.push(`Need exactly 3 ship components (currently ${selectedComponents.length})`);
  }

  // Check unique lanes
  const lanes = Object.values(shipComponents || {}).filter(Boolean);
  const uniqueLanes = new Set(lanes);
  if (lanes.length !== uniqueLanes.size) {
    errors.push('Each ship component must be in a unique lane');
  }

  // Check for required component types
  const componentTypes = selectedComponents.map(id => {
    const comp = shipComponentCollection.find(c => c.id === id);
    return comp?.type;
  });

  if (!componentTypes.includes('Bridge')) {
    errors.push('Deck requires a Bridge component');
  }
  if (!componentTypes.includes('Power Cell')) {
    errors.push('Deck requires a Power Cell component');
  }
  if (!componentTypes.includes('Drone Control Hub')) {
    errors.push('Deck requires a Drone Control Hub component');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get deck statistics for display
 *
 * @param {Object} deck - Card deck { cardId: quantity }
 * @returns {Object} Statistics { cardCount, typeCounts, costDistribution }
 */
export function getDeckStatistics(deck) {
  const typeCounts = {
    Ordnance: 0,
    Tactic: 0,
    Support: 0,
    Upgrade: 0
  };

  const costDistribution = {};
  let totalCards = 0;

  Object.entries(deck || {}).forEach(([cardId, quantity]) => {
    const card = fullCardCollection.find(c => c.id === cardId);
    if (card) {
      totalCards += quantity;

      if (typeCounts.hasOwnProperty(card.type)) {
        typeCounts[card.type] += quantity;
      }

      const cost = card.cost || 0;
      costDistribution[cost] = (costDistribution[cost] || 0) + quantity;
    }
  });

  return {
    cardCount: totalCards,
    typeCounts,
    costDistribution
  };
}

export default {
  calculateAvailableCards,
  calculateAvailableDrones,
  calculateAvailableComponents,
  calculateAvailableShips,
  validateDeckForDeployment,
  getDeckStatistics
};
