// ========================================
// PHASE VALIDATION UTILITY
// ========================================
// Validates phase and action combinations for debugging and error prevention
// Provides warnings about incorrect routing between simultaneous and sequential phases

import { isSimultaneousPhase, isSequentialPhase } from './gameUtils.js';

/**
 * Validate if an action is appropriate for the current phase
 * @param {string} phase - The current game phase
 * @param {string} actionType - The action being attempted
 * @returns {string|null} 'simultaneous', 'sequential', or null if invalid
 */
export const validatePhaseAction = (phase, actionType) => {
  // Special case: Shield actions have dual context
  if (actionType === 'allocateShield' || actionType === 'resetShieldAllocation' || actionType === 'endShieldAllocation') {
    if (phase === 'allocateShields') {
      console.log(`✅ Shield action ${actionType} correctly routed for round start (simultaneous)`);
      return 'simultaneous';
    }
    if (phase === 'action' && actionType === 'reallocateShields') {
      console.log(`✅ Shield reallocation correctly routed for action phase (sequential)`);
      return 'sequential';
    }
    if (phase === 'action' && actionType !== 'reallocateShields') {
      console.warn(`⚠️ Round start shield action ${actionType} used during action phase - should use reallocateShields`);
      return 'error';
    }
  }

  // Define action categories
  const simultaneousActions = [
    // Setup phase actions
    'confirmPlacement',
    'selectDrone',
    'confirmDroneSelection',
    'selectDeck',
    'confirmDeck',
    'addCardToDeck',
    'removeCardFromDeck',
    'placePiece',
    'drawCard',
    'confirmInitialHand',

    // Round start actions
    'discardCard',
    'drawToHandLimit',
    'confirmHandLimit',
    'allocateShield',
    'resetShieldAllocation',
    'endShieldAllocation',

    // Phase transitions for simultaneous phases
    'phaseTransition'
  ];

  const sequentialActions = [
    // Gameplay actions
    'attack',
    'playCard',
    'deployDrone',
    'ability',
    'pass',
    'reallocateShields',

    // Turn-based actions
    'aiTurn',
    'playerPass',
    'turnTransition'
  ];

  // Check for mismatched actions in simultaneous phases
  if (isSimultaneousPhase(phase) && sequentialActions.includes(actionType)) {
    console.warn(`⚠️ Sequential action ${actionType} attempted in simultaneous phase ${phase}`);
    console.warn(`💡 Recommendation: Use direct GameStateManager updates for simultaneous phases`);
    return 'error';
  }

  // Check for mismatched actions in sequential phases
  if (isSequentialPhase(phase) && simultaneousActions.includes(actionType)) {
    console.warn(`⚠️ Simultaneous action ${actionType} attempted in sequential phase ${phase}`);
    console.warn(`💡 Recommendation: Use ActionProcessor for sequential phases`);
    return 'error';
  }

  // Validate appropriate actions for current phase
  if (isSimultaneousPhase(phase) && simultaneousActions.includes(actionType)) {
    console.debug(`✅ Simultaneous action ${actionType} valid for phase ${phase}`);
    return 'simultaneous';
  }

  if (isSequentialPhase(phase) && sequentialActions.includes(actionType)) {
    console.debug(`✅ Sequential action ${actionType} valid for phase ${phase}`);
    return 'sequential';
  }

  // Unknown action or phase combination
  console.warn(`⚠️ Unknown action ${actionType} for phase ${phase}`);
  return null;
};

/**
 * Get recommended routing for a specific phase and action combination
 * @param {string} phase - The current game phase
 * @param {string} actionType - The action being attempted
 * @returns {Object} Routing recommendation with method and explanation
 */
export const getRoutingRecommendation = (phase, actionType) => {
  const validation = validatePhaseAction(phase, actionType);

  const recommendations = {
    simultaneous: {
      method: 'Direct GameStateManager updates',
      functions: ['updateGameState()', 'updatePlayerState()', 'setTurnPhase()'],
      explanation: 'Use direct updates for parallel player actions',
      example: 'updatePlayerState(playerId, newState);'
    },
    sequential: {
      method: 'ActionProcessor',
      functions: ['processAction()'],
      explanation: 'Use ActionProcessor for turn-based serialized actions',
      example: 'await processAction(actionType, payload);'
    },
    error: {
      method: 'Fix action type or phase',
      functions: [],
      explanation: 'Action and phase combination is incorrect',
      example: 'Check phase type and use appropriate action'
    }
  };

  return {
    validation,
    phase,
    actionType,
    recommendation: recommendations[validation] || {
      method: 'Unknown',
      functions: [],
      explanation: 'No recommendation available',
      example: 'Review action and phase combination'
    }
  };
};

/**
 * Validate shield action routing based on context
 * @param {string} phase - The current game phase
 * @param {string} actionType - The shield action type
 * @returns {Object} Shield-specific routing information
 */
export const validateShieldActionRouting = (phase, actionType) => {
  if (phase === 'allocateShields') {
    // Round start context
    const validRoundStartActions = ['allocateShield', 'resetShieldAllocation', 'endShieldAllocation'];

    if (validRoundStartActions.includes(actionType)) {
      return {
        valid: true,
        context: 'roundStart',
        routing: 'simultaneous',
        method: 'Direct GameStateManager updates',
        explanation: 'Round start shield allocation uses parallel processing'
      };
    } else {
      return {
        valid: false,
        context: 'roundStart',
        routing: 'error',
        method: 'Fix action type',
        explanation: `Action ${actionType} not valid for round start shield allocation`
      };
    }
  } else if (phase === 'action') {
    // Action phase context
    if (actionType === 'reallocateShields') {
      return {
        valid: true,
        context: 'actionPhase',
        routing: 'sequential',
        method: 'ActionProcessor',
        explanation: 'Action phase shield reallocation uses turn-based processing'
      };
    } else if (['allocateShield', 'resetShieldAllocation', 'endShieldAllocation'].includes(actionType)) {
      return {
        valid: false,
        context: 'actionPhase',
        routing: 'error',
        method: 'Use reallocateShields',
        explanation: `Use reallocateShields action for action phase, not ${actionType}`
      };
    } else {
      return {
        valid: false,
        context: 'actionPhase',
        routing: 'error',
        method: 'Fix action type',
        explanation: `Action ${actionType} not a valid shield action for action phase`
      };
    }
  } else {
    return {
      valid: false,
      context: 'invalid',
      routing: 'error',
      method: 'Fix phase',
      explanation: `Shield actions not valid for phase ${phase}`
    };
  }
};

/**
 * Get all valid actions for a specific phase
 * @param {string} phase - The game phase
 * @returns {Array} Array of valid actions for the phase
 */
export const getValidActionsForPhase = (phase) => {
  const phaseActions = {
    // Setup phases (simultaneous)
    preGame: ['selectGameMode', 'configureSettings'],
    droneSelection: ['selectDrone', 'confirmDroneSelection'],
    deckSelection: ['selectDeck', 'confirmDeckSelection'],
    deckBuilding: ['addCardToDeck', 'removeCardFromDeck', 'confirmDeck'],
    placement: ['placePiece', 'confirmPlacement'],
    initialDraw: ['drawCard', 'confirmInitialHand'],

    // Round start phases (simultaneous)
    optionalDiscard: ['discardCard', 'drawToHandLimit', 'confirmHandLimit'],
    allocateShields: ['allocateShield', 'resetShieldAllocation', 'endShieldAllocation'],

    // Gameplay phases (sequential)
    deployment: ['deployDrone', 'pass', 'aiTurn'],
    action: ['attack', 'playCard', 'ability', 'reallocateShields', 'pass', 'aiTurn']
  };

  return phaseActions[phase] || [];
};

/**
 * Log comprehensive phase validation information
 * @param {string} phase - The current game phase
 * @param {string} actionType - The action being attempted
 */
export const logPhaseValidation = (phase, actionType) => {
  const validation = validatePhaseAction(phase, actionType);
  const routing = getRoutingRecommendation(phase, actionType);
  const validActions = getValidActionsForPhase(phase);

  console.group(`🔍 Phase Validation: ${actionType} in ${phase}`);
  console.log('Validation Result:', validation);
  console.log('Phase Type:', isSimultaneousPhase(phase) ? 'Simultaneous' : 'Sequential');
  console.log('Recommended Method:', routing.recommendation.method);
  console.log('Valid Actions for Phase:', validActions);

  if (validation === 'error') {
    console.warn('⚠️ Invalid Action/Phase Combination');
    console.log('Explanation:', routing.recommendation.explanation);
    console.log('Example:', routing.recommendation.example);
  }

  console.groupEnd();
};

/**
 * Quick validation function for development/debugging
 * @param {string} phase - The current game phase
 * @param {string} actionType - The action being attempted
 * @returns {boolean} True if valid, false if invalid
 */
export const isValidPhaseAction = (phase, actionType) => {
  const validation = validatePhaseAction(phase, actionType);
  return validation === 'simultaneous' || validation === 'sequential';
};