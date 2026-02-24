// ========================================
// PHASE DISPLAY UTILITIES
// ========================================
// Game phase constants and display name mapping
// Canonical location for phase domain knowledge

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
