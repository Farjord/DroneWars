/**
 * QuickDeployValidator
 * Validates quick deployment templates against deck configurations
 */

import fullDroneCollection from '../../data/droneData.js';
import { calculateEffectiveShipStats } from '../statsCalculator.js';

/**
 * Get drone data by name
 * @param {string} droneName - Name of the drone
 * @returns {Object|null} Drone data or null if not found
 */
export const getDroneByName = (droneName) => {
  return fullDroneCollection.find(d => d.name === droneName) || null;
};

/**
 * Calculate total deployment cost for a set of placements
 * @param {Array} placements - Array of { droneName, lane }
 * @returns {number} Total deployment cost
 */
export const calculateTotalCost = (placements) => {
  return placements.reduce((sum, placement) => {
    const drone = getDroneByName(placement.droneName);
    return sum + (drone?.class || 0);
  }, 0);
};

/**
 * Check if two arrays have the same elements (order independent)
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} True if arrays have same elements
 */
const arraysHaveSameElements = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((val, idx) => val === sorted2[idx]);
};

/**
 * Validate a quick deployment against a specific deck
 * @param {Object} quickDeploy - Quick deployment template
 * @param {Object} deck - Ship slot/deck object with drones array
 * @param {Object} playerState - Player state with shipSections
 * @param {Array} placedSections - Array of placed section names
 * @returns {Object} Validation result { valid, reasons }
 */
export const validateAgainstDeck = (quickDeploy, deck, playerState, placedSections) => {
  const reasons = [];

  // 1. Roster Match - Check if deck has exactly the same 5 drones
  const deckDrones = deck.drones.map(d => d.name);
  const qDrones = quickDeploy.droneRoster;

  if (!arraysHaveSameElements(deckDrones, qDrones)) {
    const missing = qDrones.filter(d => !deckDrones.includes(d));
    const extra = deckDrones.filter(d => !qDrones.includes(d));
    reasons.push({
      type: 'roster_mismatch',
      message: missing.length > 0
        ? `Missing: ${missing.join(', ')}`
        : `Different drones in deck`,
      details: { missing, extra, deckDrones, quickDeployDrones: qDrones }
    });
  }

  // 2. Budget Check - Total cost must not exceed available resources
  const totalCost = calculateTotalCost(quickDeploy.placements);
  const stats = calculateEffectiveShipStats(playerState, placedSections);
  const availableBudget = stats.totals.initialDeployment + stats.totals.energyPerTurn;

  if (totalCost > availableBudget) {
    reasons.push({
      type: 'budget_exceeded',
      message: `Cost (${totalCost}) exceeds budget (${availableBudget})`,
      details: {
        totalCost,
        availableBudget,
        initialDeployment: stats.totals.initialDeployment,
        energyPerTurn: stats.totals.energyPerTurn
      }
    });
  }

  // 3. CPU Limit - Number of placements must not exceed CPU control value
  if (quickDeploy.placements.length > stats.totals.cpuLimit) {
    reasons.push({
      type: 'cpu_exceeded',
      message: `Drones (${quickDeploy.placements.length}) exceed CPU limit (${stats.totals.cpuLimit})`,
      details: {
        placed: quickDeploy.placements.length,
        limit: stats.totals.cpuLimit
      }
    });
  }

  // 4. Per-Drone Limits - Check maxPerLane restrictions
  const laneGroups = { 0: [], 1: [], 2: [] };
  for (const placement of quickDeploy.placements) {
    laneGroups[placement.lane].push(placement.droneName);
  }

  for (const [laneIndex, drones] of Object.entries(laneGroups)) {
    for (const droneName of drones) {
      const droneData = getDroneByName(droneName);
      if (droneData?.maxPerLane) {
        const countInLane = drones.filter(d => d === droneName).length;
        if (countInLane > droneData.maxPerLane) {
          reasons.push({
            type: 'limit_exceeded',
            message: `${droneName} exceeds maxPerLane (${droneData.maxPerLane}) in lane ${laneIndex}`,
            details: {
              drone: droneName,
              lane: parseInt(laneIndex),
              count: countInLane,
              maxPerLane: droneData.maxPerLane
            }
          });
        }
      }
    }
  }

  // 5. Check for duplicate drone placements (each drone type can only be placed once)
  const placedDroneNames = quickDeploy.placements.map(p => p.droneName);
  const uniquePlaced = new Set(placedDroneNames);
  if (placedDroneNames.length !== uniquePlaced.size) {
    const duplicates = placedDroneNames.filter((d, i) => placedDroneNames.indexOf(d) !== i);
    reasons.push({
      type: 'duplicate_placement',
      message: `Drone placed multiple times: ${[...new Set(duplicates)].join(', ')}`,
      details: { duplicates: [...new Set(duplicates)] }
    });
  }

  return {
    valid: reasons.length === 0,
    reasons
  };
};

/**
 * Get all valid quick deployments for a deck
 * @param {Array} allDeployments - All saved quick deployments
 * @param {Object} deck - Ship slot/deck object
 * @param {Object} playerState - Player state with shipSections
 * @param {Array} placedSections - Array of placed section names
 * @returns {Array} Valid quick deployments with validation results
 */
export const getValidDeploymentsForDeck = (allDeployments, deck, playerState, placedSections) => {
  if (!allDeployments || !Array.isArray(allDeployments)) {
    return [];
  }

  return allDeployments
    .map(qd => ({
      ...qd,
      validation: validateAgainstDeck(qd, deck, playerState, placedSections)
    }))
    .filter(qd => qd.validation.valid);
};

/**
 * Get all quick deployments with validation status for a deck
 * (Returns both valid and invalid with reasons)
 * @param {Array} allDeployments - All saved quick deployments
 * @param {Object} deck - Ship slot/deck object
 * @param {Object} playerState - Player state with shipSections
 * @param {Array} placedSections - Array of placed section names
 * @returns {Array} All quick deployments with validation results
 */
export const getAllDeploymentsWithValidation = (allDeployments, deck, playerState, placedSections) => {
  if (!allDeployments || !Array.isArray(allDeployments)) {
    return [];
  }

  return allDeployments.map(qd => ({
    ...qd,
    validation: validateAgainstDeck(qd, deck, playerState, placedSections)
  }));
};

export default {
  getDroneByName,
  calculateTotalCost,
  validateAgainstDeck,
  getValidDeploymentsForDeck,
  getAllDeploymentsWithValidation
};
