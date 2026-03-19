/**
 * Single Player Deck Utilities
 * Helper functions for calculating card/drone/component availability in Extraction Mode
 */

import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { getAllShips } from '../../data/shipData.js';
import { starterPoolCards, starterPoolDroneNames } from '../../data/saveGameSchema.js';

/**
 * Calculate available cards — shared model (no cross-slot reservation)
 * Starter pool cards are unlimited (99); non-starter cards are capped at min(owned, maxInDeck).
 * Every deck sees the same availability.
 *
 * @param {Object} inventory - Player inventory { cardId: quantity }
 * @returns {Array} Cards with availableQuantity property
 */
export function calculateAvailableCards(inventory) {
  return fullCardCollection.map(card => {
    const isStarterPool = starterPoolCards.includes(card.id);
    const availableQuantity = isStarterPool
      ? 99
      : Math.min(inventory[card.id] || 0, card.maxInDeck);

    return {
      ...card,
      availableQuantity,
      isStarterPool
    };
  }).filter(card => card.availableQuantity > 0);
}

/**
 * Calculate available drones — blueprint model
 * Starter pool drones are always available (99).
 * Non-starter drones are available (99) only if their name appears in unlockedBlueprints.
 *
 * @param {Array<string>} unlockedBlueprints - Names of unlocked drone blueprints
 * @returns {Array} Drones with availableCount property
 */
export function calculateAvailableDrones(unlockedBlueprints) {
  const blueprintSet = new Set(unlockedBlueprints || []);

  return fullDroneCollection
    .filter(drone => drone.selectable !== false)
    .map(drone => {
      const isStarterPool = starterPoolDroneNames.includes(drone.name);
      const isUnlocked = isStarterPool || blueprintSet.has(drone.name);

      return {
        ...drone,
        availableCount: isUnlocked ? 99 : 0,
        isStarterPool,
      };
    }).filter(drone => drone.availableCount > 0);
}

/**
 * Calculate available ship components — blueprint model
 * Starter pool components are always available (99).
 * Non-starter components are available (99) only if their ID appears in unlockedBlueprints.
 *
 * @param {Array<string>} unlockedBlueprints - IDs of unlocked component blueprints
 * @returns {Array} Components with availableCount property
 */
export function calculateAvailableComponents(unlockedBlueprints) {
  const blueprintSet = new Set(unlockedBlueprints || []);

  return shipComponentCollection.map(component => {
    const isStarterPool = starterPoolCards.includes(component.id);
    const isUnlocked = isStarterPool || blueprintSet.has(component.id);

    return {
      ...component,
      availableCount: isUnlocked ? 99 : 0,
      isStarterPool,
    };
  }).filter(comp => comp.availableCount > 0);
}

/**
 * Calculate available ships for deck building — consumable model
 * Ships are consumed on assignment, so inventory count IS the available count.
 * No reservation logic needed.
 *
 * @param {Object} inventory - Player inventory { shipId: quantity }
 * @returns {Array} Ships with availableCount property
 */
export function calculateAvailableShips(inventory) {
  return getAllShips().map(ship => ({
    ...ship,
    availableCount: inventory[ship.id] || 0,
  })).filter(ship => ship.availableCount > 0);
}

/**
 * Validate deck for deployment readiness
 *
 * @param {Object} deck - Card deck { cardId: quantity }
 * @param {Object} drones - Selected drones { droneName: quantity }
 * @param {Object} shipComponents - Ship components { componentId: lane }
 * @param {number} deckLimit - Maximum deck size (default: 40)
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateDeckForDeployment(deck, drones, shipComponents, deckLimit = 40) {
  const errors = [];
  const warnings = [];

  // Check card count
  const cardCount = Object.values(deck || {}).reduce((sum, qty) => sum + qty, 0);
  if (cardCount !== deckLimit) {
    errors.push(`Deck requires exactly ${deckLimit} cards (currently ${cardCount})`);
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
/**
 * Calculate effective maximum copies of a card that can be in the deck
 * Considers: maxInDeck, availableQuantity, base card variant tracking
 *
 * @param {Object} params
 * @param {number} params.maxInDeck - Card's inherent maximum (e.g., 4)
 * @param {number} params.availableQuantity - Copies available to player (99 for starter)
 * @param {number} params.currentCountInDeck - This variant's count in current deck
 * @param {number} params.totalBaseCardCountInDeck - All variants of base card in deck
 * @returns {number} Maximum copies that can be in deck
 */
export function calculateEffectiveMaxForCard({
  maxInDeck,
  availableQuantity,
  currentCountInDeck,
  totalBaseCardCountInDeck
}) {
  // Handle missing availableQuantity (non-extraction mode) - fall back to maxInDeck
  const available = availableQuantity ?? maxInDeck;

  // How many more of this base card can be added (accounting for variants)
  const remainingForBase = maxInDeck - (totalBaseCardCountInDeck - currentCountInDeck);

  // Effective max is the lower of base card limit and availability
  return Math.max(0, Math.min(remainingForBase, available));
}

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
  getDeckStatistics,
  calculateEffectiveMaxForCard
};
