// ========================================
// GAME UTILITY FUNCTIONS
// ========================================
// Pure utility functions for common game operations
// These functions don't depend on React state or specific component context

/**
 * Get random selection of drones from a collection
 * @param {Array} collection - The collection to select from
 * @param {number} count - Number of items to select
 * @returns {Array} Randomly selected items
 */
export const getRandomDrones = (collection, count) => {
  const shuffled = [...collection].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Get center coordinates of a DOM element relative to a game area
 * @param {HTMLElement} element - The target element
 * @param {HTMLElement} gameAreaElement - The game area reference element
 * @returns {Object|null} Object with x,y coordinates or null if invalid
 */
export const getElementCenter = (element, gameAreaElement) => {
  if (!element || !gameAreaElement) return null;
  const gameAreaRect = gameAreaElement.getBoundingClientRect();
  const elemRect = element.getBoundingClientRect();
  return {
    x: elemRect.left + elemRect.width / 2 - gameAreaRect.left,
    y: elemRect.top + elemRect.height / 2 - gameAreaRect.top,
  };
};

/**
 * Get human-readable display name for game phases
 * @param {string} phase - The phase identifier
 * @returns {string} Human-readable phase name
 */
export const getPhaseDisplayName = (phase) => {
  const names = {
    preGame: "Pre-Game Setup",
    gameInitializing: "Initialising Game",
    deckSelection: "Deck Selection",
    droneSelection: "Drone Selection",
    placement: "Placement Phase",
    determineFirstPlayer: "Determining First Player",
    energyReset: "Energy Reset",
    mandatoryDiscard: "Mandatory Discard",
    optionalDiscard: "Optional Discard",
    initialDraw: "Drawing Cards",
    draw: "Drawing Cards",
    allocateShields: "Shield Allocation",
    mandatoryDroneRemoval: "Mandatory Drone Removal",
    deployment: "Deployment Phase",
    deploymentComplete: "Deployment Complete",
    action: "Action Phase",
    combatPending: "Combat Phase Pending",
    roundEnd: "Round End",
    gameEnd: "Game Over"
  };
  return names[phase] || phase;
};

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
export const shuffleArray = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Clamp a number between min and max values
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Generate a unique ID string
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
export const generateId = (prefix = 'id') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if two arrays have the same elements (order doesn't matter)
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} True if arrays have same elements
 */
export const arraysEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((val, i) => val === sorted2[i]);
};

// ========================================
// GAME PHASE CONSTANTS AND UTILITIES
// ========================================

/**
 * Phases where both players can act simultaneously
 * These phases use direct GameStateManager updates for parallel execution
 */
export const SIMULTANEOUS_PHASES = [
  'preGame', 'droneSelection', 'deckSelection', 'deckBuilding',
  'placement', 'initialDraw', 'allocateShields', 'optionalDiscard'
];

/**
 * Phases where players must act in sequence (turn-based)
 * These phases use ActionProcessor for serialized execution
 */
export const SEQUENTIAL_PHASES = ['deployment', 'action'];

/**
 * Check if a phase allows simultaneous player actions
 * @param {string} phase - The game phase to check
 * @returns {boolean} True if phase is simultaneous
 */
export const isSimultaneousPhase = (phase) => SIMULTANEOUS_PHASES.includes(phase);

/**
 * Check if a phase requires sequential player actions
 * @param {string} phase - The game phase to check
 * @returns {boolean} True if phase is sequential
 */
export const isSequentialPhase = (phase) => SEQUENTIAL_PHASES.includes(phase);