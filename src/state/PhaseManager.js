// ========================================
// PHASE MANAGER
// ========================================
// Central authority on phase types and action routing decisions
// Determines whether actions should go through ActionProcessor or direct updates

// Phase type constants
const SIMULTANEOUS_PHASES = [
  'preGame',
  'droneSelection',
  'deckSelection',
  'deckBuilding',
  'placement',
  'initialDraw',
  'allocateShields',
  'optionalDiscard'
];

const SEQUENTIAL_PHASES = [
  'deployment',
  'action'
];

/**
 * PhaseManager - Singleton for phase type detection and action routing
 */
class PhaseManager {
  constructor() {
    if (PhaseManager.instance) {
      return PhaseManager.instance;
    }
    PhaseManager.instance = this;
  }

  /**
   * Check if a phase allows simultaneous player actions
   * @param {string} phase - The current game phase
   * @returns {boolean} True if phase is simultaneous
   */
  isSimultaneousPhase(phase) {
    return SIMULTANEOUS_PHASES.includes(phase);
  }

  /**
   * Check if a phase requires sequential player actions
   * @param {string} phase - The current game phase
   * @returns {boolean} True if phase is sequential
   */
  isSequentialPhase(phase) {
    return SEQUENTIAL_PHASES.includes(phase);
  }

  /**
   * Determine if an action should go through ActionProcessor
   * @param {string} phase - The current game phase
   * @param {string} actionType - The type of action being performed
   * @returns {boolean} True if should use ActionProcessor
   */
  shouldUseActionProcessor(phase, actionType) {
    // Sequential phases always use ActionProcessor
    if (this.isSequentialPhase(phase)) {
      return true;
    }

    // Special case: Shield reallocation during action phase uses ActionProcessor
    if (phase === 'action' && this.isShieldReallocationAction(actionType)) {
      return true;
    }

    // All simultaneous phases use direct updates
    return false;
  }

  /**
   * Check if action is specifically shield reallocation (action phase ability)
   * @param {string} actionType - The action type to check
   * @returns {boolean} True if shield reallocation action
   */
  isShieldReallocationAction(actionType) {
    const reallocationActions = [
      'reallocateShields',
      'moveShield',
      'redistributeShields'
    ];
    return reallocationActions.some(action =>
      actionType.toLowerCase().includes(action.toLowerCase())
    );
  }

  /**
   * Get the routing strategy for an action
   * @param {string} phase - The current game phase
   * @param {string} actionType - The type of action being performed
   * @returns {string} 'sequential' | 'simultaneous'
   */
  getActionRouting(phase, actionType) {
    return this.shouldUseActionProcessor(phase, actionType) ? 'sequential' : 'simultaneous';
  }

  /**
   * Check if action is a shield-related action
   * @param {string} actionType - The action type to check
   * @returns {boolean} True if shield-related action
   */
  isShieldAction(actionType) {
    const shieldActions = [
      'allocateShield',
      'reallocateShields',
      'shieldAllocation',
      'moveShield',
      'redistributeShields'
    ];
    return shieldActions.some(action =>
      actionType.toLowerCase().includes(action.toLowerCase())
    );
  }

  /**
   * Get debug information about routing decision
   * @param {string} phase - The current game phase
   * @param {string} actionType - The action type
   * @returns {Object} Debug information
   */
  getRoutingDebugInfo(phase, actionType) {
    const isSequential = this.isSequentialPhase(phase);
    const isSimultaneous = this.isSimultaneousPhase(phase);
    const shouldUseProcessor = this.shouldUseActionProcessor(phase, actionType);
    const routing = this.getActionRouting(phase, actionType);

    return {
      phase,
      actionType,
      phaseType: {
        isSequential,
        isSimultaneous,
        category: isSequential ? 'sequential' : 'simultaneous'
      },
      routing: {
        strategy: routing,
        shouldUseActionProcessor: shouldUseProcessor,
        recommendedPath: shouldUseProcessor ? 'processAction()' : 'updateGameState()'
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const phaseManager = new PhaseManager();

export default phaseManager;