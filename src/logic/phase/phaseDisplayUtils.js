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

/**
 * Determine contextual text and color for the Tier 2 phase banner.
 * Pure function — all dependencies passed via params object.
 *
 * @param {Object} params
 * @param {Object|null} params.effectChainState
 * @param {boolean} params.interceptionModeActive
 * @param {string} params.turnPhase
 * @param {number|null} params.pendingShieldsRemaining
 * @param {number} params.shieldsToAllocate
 * @param {string|null} params.reallocationPhase
 * @param {number} params.shieldsToRemove
 * @param {number} params.shieldsToAdd
 * @param {Object|null} params.mandatoryAction
 * @param {number} params.excessCards
 * @param {number} params.excessDrones
 * @param {number} params.optionalDiscardCount
 * @param {number} params.discardLimit
 * @param {boolean} params.isMyTurn
 * @param {boolean} params.isMultiplayer
 * @param {number} params.remainingDroneSlots
 * @returns {{ text: string, color: string }}
 */
export const getContextualText = ({
  effectChainState,
  interceptionModeActive,
  turnPhase,
  pendingShieldsRemaining,
  shieldsToAllocate,
  reallocationPhase,
  shieldsToRemove,
  shieldsToAdd,
  mandatoryAction,
  excessCards,
  excessDrones,
  optionalDiscardCount,
  discardLimit,
  isMyTurn,
  isMultiplayer,
  remainingDroneSlots,
}) => {
  // Priority 1-4: Effect chain states
  if (effectChainState && !effectChainState.complete) {
    if (effectChainState.prompt) {
      return { text: effectChainState.prompt, color: 'cyan' };
    }
    if (effectChainState.subPhase === 'multi-target') {
      const count = effectChainState.pendingMultiTargets?.length || 0;
      return { text: `Select Targets (${count} selected)`, color: 'cyan' };
    }
    if (effectChainState.subPhase === 'destination') {
      return { text: 'Select Destination Lane', color: 'cyan' };
    }
    return { text: `Resolve Effect ${effectChainState.currentIndex + 1} of ${effectChainState.effects.length}`, color: 'cyan' };
  }
  // Priority 5: Interception
  if (interceptionModeActive) {
    return { text: 'Select an Interceptor', color: 'cyan' };
  }
  // Priority 6: Shield allocation
  if (turnPhase === 'allocateShields') {
    const count = pendingShieldsRemaining !== null ? pendingShieldsRemaining : shieldsToAllocate;
    return { text: `Assign Shields (${count} Remaining)`, color: 'cyan' };
  }
  // Priority 7-8: Reallocation
  if (reallocationPhase === 'removing') {
    return { text: `Remove Shields (${shieldsToRemove} Remaining)`, color: 'orange' };
  }
  if (reallocationPhase === 'adding') {
    return { text: `Add Shields (${shieldsToAdd} Remaining)`, color: 'green' };
  }
  // Priority 9: Mandatory discard
  if ((turnPhase === 'mandatoryDiscard' || mandatoryAction?.type === 'discard') &&
      (mandatoryAction?.type === 'discard' || excessCards > 0)) {
    const count = mandatoryAction?.count || excessCards;
    return { text: `Discard Cards (${count} Remaining)`, color: 'orange' };
  }
  // Priority 10: Mandatory drone removal
  if (turnPhase === 'mandatoryDroneRemoval' && (mandatoryAction?.type === 'destroy' || excessDrones > 0)) {
    const count = mandatoryAction?.count || excessDrones;
    return { text: `Remove Drones (${count} Remaining)`, color: 'orange' };
  }
  // Priority 11: Optional discard
  if (turnPhase === 'optionalDiscard') {
    const remaining = discardLimit - optionalDiscardCount;
    return { text: `Discard Cards (${remaining} Remaining)`, color: 'yellow' };
  }
  // Priority 12-13: My turn during deployment/action
  if (turnPhase === 'deployment' && isMyTurn) {
    return { text: `Deploy Drones (${remainingDroneSlots} Remaining)`, color: 'cyan' };
  }
  if (turnPhase === 'action' && isMyTurn) {
    return { text: 'Play an Action', color: 'cyan' };
  }
  // Priority 14: Not my turn
  if ((turnPhase === 'deployment' || turnPhase === 'action') && !isMyTurn) {
    return { text: isMultiplayer ? "Opponent's Turn" : 'AI Thinking', color: 'red' };
  }
  // Priority 15: Fallback
  return { text: 'Initialising', color: 'cyan-dimmed' };
};
