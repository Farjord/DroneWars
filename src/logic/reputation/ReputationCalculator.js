/**
 * Reputation Calculator
 *
 * Calculates loadout value and reputation gain for the reputation system.
 * Loadout value is the sum of blueprint costs for all components:
 * - Cards (by rarity and quantity)
 * - Ship (by rarity)
 * - Drones (by rarity)
 * - Ship Sections (by rarity)
 */

import { REPUTATION } from '../../data/reputationData.js';
import { getLevelData, getNewlyUnlockedLevels } from '../../data/reputationRewardsData.js';
import fullCardCollection from '../../data/cardData.js';
import { shipCollection, getShipById } from '../../data/shipData.js';
import fullDroneCollection from '../../data/droneData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { starterPoolCards, starterPoolDroneNames, starterPoolShipIds } from '../../data/saveGameSchema.js';
import aiPersonalities from '../../data/aiData.js';
import { mapTiers } from '../../data/mapData.js';

/**
 * Get blueprint cost for a given rarity
 * @param {string} rarity - Rarity level (Common, Uncommon, Rare, Mythic)
 * @returns {number} Blueprint cost
 */
export function getBlueprintCost(rarity) {
  return REPUTATION.BLUEPRINT_COSTS[rarity] || 0;
}

/**
 * Calculate the value of cards in a decklist
 * @param {Array} decklist - Array of { id, quantity } objects
 * @returns {number} Total card value
 */
export function calculateCardValue(decklist) {
  if (!decklist || !Array.isArray(decklist)) return 0;

  let totalValue = 0;

  for (const entry of decklist) {
    // Skip starter pool cards - they don't contribute to loadout value
    if (starterPoolCards.includes(entry.id)) continue;

    const card = fullCardCollection.find(c => c.id === entry.id);
    if (card) {
      const cost = getBlueprintCost(card.rarity);
      totalValue += cost * (entry.quantity || 1);
    }
  }

  return totalValue;
}

/**
 * Calculate the value of a ship
 * @param {string} shipId - Ship ID
 * @returns {number} Ship value
 */
export function calculateShipValue(shipId) {
  if (!shipId) return 0;

  // Starter pool ships don't contribute to loadout value
  if (starterPoolShipIds.includes(shipId)) return 0;

  const ship = getShipById(shipId);
  if (!ship) return 0;

  return getBlueprintCost(ship.rarity);
}

/**
 * Calculate the value of drones in a loadout
 * @param {Array} drones - Array of drone objects with 'name' property
 * @returns {number} Total drone value
 */
export function calculateDroneValue(drones) {
  if (!drones || !Array.isArray(drones)) return 0;

  let totalValue = 0;

  for (const drone of drones) {
    // Skip starter pool drones - they don't contribute to loadout value
    if (starterPoolDroneNames.includes(drone.name)) continue;

    const droneData = fullDroneCollection.find(d => d.name === drone.name);
    if (droneData) {
      totalValue += getBlueprintCost(droneData.rarity);
    }
  }

  return totalValue;
}

/**
 * Calculate the value of ship components/sections
 * @param {Object} shipComponents - Object mapping component IDs to lanes
 * @returns {number} Total component value
 */
export function calculateComponentValue(shipComponents) {
  if (!shipComponents || typeof shipComponents !== 'object') return 0;

  let totalValue = 0;

  for (const componentId of Object.keys(shipComponents)) {
    // Skip starter pool components - they don't contribute to loadout value
    if (starterPoolCards.includes(componentId)) continue;

    const component = shipComponentCollection.find(c => c.id === componentId);
    if (component) {
      totalValue += getBlueprintCost(component.rarity);
    }
  }

  return totalValue;
}

/**
 * Calculate the total loadout value for a ship slot
 * @param {Object} shipSlot - Ship slot object containing decklist, shipId, drones, shipComponents
 * @returns {Object} Breakdown of loadout value
 */
export function calculateLoadoutValue(shipSlot) {
  // Slot 0 (Starter Deck) always returns 0 - no risk, no reward
  if (!shipSlot || shipSlot.id === 0 || shipSlot.isImmutable) {
    return {
      cardValue: 0,
      shipValue: 0,
      droneValue: 0,
      componentValue: 0,
      totalValue: 0,
      isStarterDeck: true,
    };
  }

  const cardValue = calculateCardValue(shipSlot.decklist);
  const shipValue = calculateShipValue(shipSlot.shipId);
  const droneValue = calculateDroneValue(shipSlot.drones);
  const componentValue = calculateComponentValue(shipSlot.shipComponents);

  return {
    cardValue,
    shipValue,
    droneValue,
    componentValue,
    totalValue: cardValue + shipValue + droneValue + componentValue,
    isStarterDeck: false,
  };
}

/**
 * Calculate reputation gain for a run
 * @param {number} loadoutValue - Total loadout value
 * @param {number} tier - Map tier (1, 2, or 3)
 * @param {boolean} success - Whether the run was successful (extraction vs MIA)
 * @returns {Object} Reputation gain details
 */
export function calculateRepGain(loadoutValue, tier, success) {
  // Get tier cap from map data instead of removed TIER_CAPS
  const mapConfig = mapTiers.find(t => t.tier === tier);
  const tierCap = mapConfig?.maxReputationPerCombat || 5000; // Default to T1 cap

  // Apply tier cap
  const cappedValue = Math.min(loadoutValue, tierCap);
  const wasCapped = loadoutValue > tierCap;

  // Apply success/failure multiplier
  const multiplier = success ? 1.0 : REPUTATION.MIA_MULTIPLIER;
  const finalRep = Math.floor(cappedValue * multiplier);

  return {
    loadoutValue,
    tier,
    tierCap,
    wasCapped,
    success,
    multiplier,
    repGained: finalRep,
  };
}

/**
 * Calculate full reputation result including level changes
 * @param {Object} shipSlot - Ship slot used for the run
 * @param {number} tier - Map tier
 * @param {boolean} success - Whether extraction was successful
 * @param {number} currentRep - Current reputation before this run
 * @returns {Object} Full reputation calculation result
 */
export function calculateReputationResult(shipSlot, tier, success, currentRep) {
  // Calculate loadout value
  const loadoutBreakdown = calculateLoadoutValue(shipSlot);

  // Calculate rep gain
  const repGain = calculateRepGain(loadoutBreakdown.totalValue, tier, success);

  // Calculate new total
  const newRep = currentRep + repGain.repGained;

  // Get level data before and after
  const levelBefore = getLevelData(currentRep);
  const levelAfter = getLevelData(newRep);

  // Get newly unlocked levels (for rewards)
  const unlockedLevels = getNewlyUnlockedLevels(currentRep, newRep);

  return {
    // Loadout breakdown
    loadout: loadoutBreakdown,

    // Rep calculation
    repGained: repGain.repGained,
    tierCap: repGain.tierCap,
    wasCapped: repGain.wasCapped,
    multiplier: repGain.multiplier,

    // Level info
    previousRep: currentRep,
    newRep,
    previousLevel: levelBefore.level,
    newLevel: levelAfter.level,
    leveledUp: levelAfter.level > levelBefore.level,
    levelsGained: levelAfter.level - levelBefore.level,

    // Progress to next level
    progress: levelAfter.progress,
    currentInLevel: levelAfter.currentInLevel,
    requiredForNext: levelAfter.requiredForNext,
    nextLevelThreshold: levelAfter.nextLevelThreshold,

    // Rewards to claim
    unlockedLevels,
    newRewards: unlockedLevels.filter(l => l.reward !== null).map(l => ({
      level: l.level,
      reward: l.reward,
    })),
  };
}

/**
 * Calculate combat reputation gain
 * Formula: min(deckValue, mapTierCap) × aiMultiplier = repEarned
 *
 * @param {number} deckValue - Player's deck value (from calculateLoadoutValue)
 * @param {string} aiId - AI name/ID
 * @param {number} mapTierCap - Map's maxReputationPerCombat
 * @returns {Object} { deckValue, aiMultiplier, aiDifficulty, tierCap, cappedValue, wasCapped, repEarned }
 */
export function calculateCombatReputation(deckValue, aiId, mapTierCap) {
  // Get AI data to find reputationMultiplier
  const ai = aiPersonalities.find(a => a.name === aiId);

  // Default to 1.0 if AI not found or no multiplier defined
  const aiMultiplier = ai?.reputationMultiplier ?? 1.0;

  // Apply tier cap to deck value FIRST
  const cappedValue = Math.min(deckValue, mapTierCap);
  const wasCapped = deckValue > mapTierCap;

  // Then multiply by AI difficulty
  const repEarned = Math.floor(cappedValue * aiMultiplier);

  return {
    deckValue,
    aiMultiplier,
    aiDifficulty: ai?.difficulty || 'Unknown',
    tierCap: mapTierCap,
    cappedValue,
    wasCapped,
    repEarned
  };
}

export default {
  getBlueprintCost,
  calculateCardValue,
  calculateShipValue,
  calculateDroneValue,
  calculateComponentValue,
  calculateLoadoutValue,
  calculateRepGain,
  calculateReputationResult,
  calculateCombatReputation,
};
