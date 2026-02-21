// --- AI Simultaneous Phase Strategy ---
// Handles AI decisions for simultaneous phases: deck selection, drone selection, placement

import { shipComponentsToPlacement } from '../../utils/deckExportUtils.js';
import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';

/**
 * Process AI deck selection for deckSelection phase.
 * Returns deck (40 cards), drones (5-10 names), and shipComponents.
 *
 * @param {Object} gameStateManager - GameStateManager instance
 * @param {Object} currentAIPersonality - AI personality with decklist, dronePool, shipComponents
 * @returns {Promise<{deck: Array, drones: Array, shipComponents: Object}>}
 */
export async function processDeckSelection(gameStateManager, currentAIPersonality) {
  const personality = currentAIPersonality;
  debugLog('AI_DECISIONS', '🤖 processDeckSelection starting (selecting 40 cards + drones)...');

  const { gameEngine, startingDecklist, startingDroneList } = await import('../gameLogic.js');
  const gameState = gameStateManager.getState();

  let selectedDeck = [];
  if (personality && personality.decklist && personality.decklist.length > 0) {
    debugLog('AI_DECISIONS', `🎯 Using ${personality.name} personality decklist`);
    selectedDeck = gameEngine.buildDeckFromList(personality.decklist, 'player2', gameState.gameSeed);
  } else {
    debugLog('AI_DECISIONS', `🎯 Using standard deck as fallback`);
    selectedDeck = gameEngine.buildDeckFromList(startingDecklist, 'player2', gameState.gameSeed);
  }

  let selectedDrones = [];
  if (personality && personality.dronePool && Array.isArray(personality.dronePool)) {
    selectedDrones = [...personality.dronePool];
    debugLog('AI_DECISIONS', `🎯 Using ${personality.name} personality dronePool: ${selectedDrones.length} drones`);

    if (selectedDrones.length < 5) {
      throw new Error(`AI personality '${personality.name}' has only ${selectedDrones.length} drones in dronePool. Minimum 5 required.`);
    }
    if (selectedDrones.length > 10) {
      throw new Error(`AI personality '${personality.name}' has ${selectedDrones.length} drones in dronePool. Maximum 10 allowed.`);
    }
  } else {
    debugLog('AI_DECISIONS', `⚠️ Personality missing dronePool, using standard drone list as fallback`);
    selectedDrones = [...startingDroneList];
  }

  debugLog('AI_DECISIONS', `✅ AI selected deck: ${selectedDeck.length} cards + ${selectedDrones.length} drones`);

  const shipComponents = personality?.shipComponents || {
    'BRIDGE_001': 'l',
    'POWERCELL_001': 'm',
    'DRONECONTROL_001': 'r'
  };

  return { deck: selectedDeck, drones: selectedDrones, shipComponents };
}

/**
 * Process AI drone selection for droneSelection phase.
 * Selects 5 drones from AI's committed deck of 10.
 *
 * @param {Object} gameStateManager - GameStateManager instance
 * @param {Array} dronePool - Full drone pool (objects with name, stats)
 * @returns {Promise<Array>} Array of 5 selected drone objects
 */
export async function processDroneSelection(gameStateManager, dronePool) {
  debugLog('AI_DECISIONS', '🤖 processDroneSelection starting (selecting 5 from deck)...');

  const gameState = gameStateManager.getState();
  const deckCommitments = gameState.commitments?.deckSelection;

  if (!deckCommitments || !deckCommitments.player2) {
    throw new Error('AI deck commitment not found - deckSelection phase must complete first');
  }

  const deckDroneNames = deckCommitments.player2.drones || [];
  debugLog('AI_DECISIONS', `🎲 AI deck contains ${deckDroneNames.length} drones:`, deckDroneNames.join(', '));

  if (deckDroneNames.length < 5 || deckDroneNames.length > 10) {
    throw new Error(`AI deck must have 5-10 drones, found ${deckDroneNames.length}`);
  }

  const availableDrones = extractDronesFromDeck(deckDroneNames, dronePool);

  if (availableDrones.length < 5) {
    debugLog('AI_DECISIONS', '❌ Failed to extract minimum required drones from deck');
    throw new Error(`Only extracted ${availableDrones.length} drones from AI deck (minimum 5 required)`);
  }

  const selectedDrones = randomlySelectDrones(availableDrones, 5, gameStateManager);

  debugLog('AI_DECISIONS', `🤖 AI randomly selected 5 drones from ${availableDrones.length} available: ${selectedDrones.map(d => d.name).join(', ')}`);

  return selectedDrones;
}

/**
 * Process AI ship placement for placement phase.
 * Converts personality shipComponents to placement array.
 *
 * @param {Object} currentAIPersonality - AI personality with shipComponents
 * @returns {Promise<string[]>} Array of placed section keys
 */
export async function processPlacement(currentAIPersonality) {
  const personality = currentAIPersonality;
  debugLog('AI_DECISIONS', '🤖 processPlacement starting...');

  let placedSections;
  if (personality?.shipComponents) {
    placedSections = shipComponentsToPlacement(personality.shipComponents);
    debugLog('AI_DECISIONS', `🎯 Using ${personality.name} placement: ${placedSections.join(', ')}`);
  } else {
    placedSections = ['bridge', 'powerCell', 'droneControlHub'];
    debugLog('AI_DECISIONS', `⚠️ No shipComponents in personality, using default: ${placedSections.join(', ')}`);
  }

  return placedSections;
}

/**
 * Extract drone objects from drone names array.
 *
 * @param {string[]} droneNames - Array of drone names
 * @param {Array} dronePool - Full drone pool to search
 * @returns {Array} Array of matched drone objects
 */
export function extractDronesFromDeck(droneNames, dronePool) {
  return droneNames.map(name => {
    const drone = dronePool?.find(d => d.name === name);
    if (!drone) {
      debugLog('AI_DECISIONS', `⚠️ Drone "${name}" not found in drone collection`);
    }
    return drone;
  }).filter(Boolean);
}

/**
 * Randomly select N drones from available pool using seeded RNG.
 *
 * @param {Array} availableDrones - Pool of drones to select from
 * @param {number} count - Number of drones to select
 * @param {Object} gameStateManager - GameStateManager for RNG seed
 * @returns {Array} Array of randomly selected drones
 */
export function randomlySelectDrones(availableDrones, count, gameStateManager) {
  const gameState = gameStateManager?.getState();
  const rng = SeededRandom.fromGameState(gameState || {});
  const shuffled = rng.shuffle(availableDrones);
  return shuffled.slice(0, count);
}
