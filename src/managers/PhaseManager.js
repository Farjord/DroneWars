/**
 * PhaseManager - Single Authoritative Source for Phase Transitions
 *
 * This class is the ONLY entity that can transition phases in the game.
 * It tracks both Host and Guest local states independently and determines
 * when both players are ready to progress.
 *
 * Design Principles:
 * - Single source of truth for phase progression
 * - Host authority, Guest reactivity
 * - Explicit state tracking for both players
 * - Atomic phase transitions
 *
 * @see Design/PHASE_MANAGER_DESIGN_PRINCIPLES.md
 */

import { debugLog } from '../utils/debugLogger.js';
import { SEQUENTIAL_PHASES } from '../logic/phase/phaseDisplayUtils.js';

class PhaseManager {
  // Valid phase names - transitions to invalid phases will be rejected
  static VALID_PHASES = [
    'deckSelection', 'droneSelection', 'placement', 'roundInitialization',
    'mandatoryDiscard', 'optionalDiscard', 'allocateShields',
    'mandatoryDroneRemoval', 'deployment', 'action', 'determineFirstPlayer'
  ];

  // Sequential phases: players take turns passing
  static SEQUENTIAL_PHASES = SEQUENTIAL_PHASES;

  // Simultaneous phases: both players commit at once
  static SIMULTANEOUS_PHASES = [
    'placement', 'mandatoryDiscard', 'optionalDiscard', 'allocateShields',
    'mandatoryDroneRemoval', 'droneSelection', 'deckSelection', 'determineFirstPlayer'
  ];
  constructor(gameStateManager, { isAuthority = true, isMultiplayer = false } = {}) {
    this.gameStateManager = gameStateManager;
    this.isAuthority = isAuthority;
    this.isMultiplayer = isMultiplayer;

    // Host's local state (what Host has done)
    this.hostLocalState = {
      passInfo: {
        passed: false,
        firstPasser: null
      },
      commitments: {} // { [phaseName]: { completed: boolean } }
    };

    // Guest's local state (what Guest has done, as received via network)
    this.guestLocalState = {
      passInfo: {
        passed: false,
        firstPasser: null
      },
      commitments: {} // { [phaseName]: { completed: boolean } }
    };

    // Authoritative phase state (only Phase Manager modifies this)
    this.phaseState = {
      turnPhase: 'deckSelection',
      gameStage: 'preGame',
      roundNumber: 1,
      turn: 1,
      currentPlayer: 'player1',
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null
    };

    // Transition history for debugging
    this.transitionHistory = [];

    // Lock to prevent concurrent transitions
    this.isTransitioning = false;

    debugLog('PHASE_MANAGER', `✅ PhaseManager initialized (authority: ${isAuthority}, multiplayer: ${isMultiplayer})`);
  }

  /**
   * Validate that action type is appropriate for current phase
   * @param {string} actionType - 'pass' or 'commit'
   * @returns {boolean} True if action is valid for current phase
   */
  validateActionForPhase(actionType) {
    const currentPhase = this.phaseState.turnPhase;

    if (actionType === 'pass' && !PhaseManager.SEQUENTIAL_PHASES.includes(currentPhase)) {
      debugLog('PHASE_MANAGER', `🚫 Pass action invalid for simultaneous phase: ${currentPhase}`);
      debugLog('PHASE_MANAGER', `⚠️ PhaseManager: Pass action invalid for phase: ${currentPhase}`);
      return false;
    }
    if (actionType === 'commit' && !PhaseManager.SIMULTANEOUS_PHASES.includes(currentPhase)) {
      debugLog('PHASE_MANAGER', `🚫 Commit action invalid for sequential phase: ${currentPhase}`);
      debugLog('PHASE_MANAGER', `⚠️ PhaseManager: Commit action invalid for phase: ${currentPhase}`);
      return false;
    }
    return true;
  }

  /**
   * Notify Phase Manager that Host performed an action
   * @param {string} actionType - 'pass' or 'commit'
   * @param {object} data - Action data
   * @returns {boolean} True if action was valid and processed
   */
  notifyHostAction(actionType, data) {
    debugLog('PHASE_MANAGER', `📥 Host action: ${actionType}`, data);

    // Validate action type for current phase
    if (!this.validateActionForPhase(actionType)) {
      return false;
    }

    if (actionType === 'pass') {
      this.hostLocalState.passInfo.passed = true;

      // Track first passer
      if (!this.hostLocalState.passInfo.firstPasser && !this.guestLocalState.passInfo.firstPasser) {
        this.hostLocalState.passInfo.firstPasser = 'player1';
        this.guestLocalState.passInfo.firstPasser = 'player1'; // Sync across states
      }

      debugLog('PHASE_MANAGER', `✅ Host passed (player1)`);
    } else if (actionType === 'commit') {
      const { phase } = data;
      if (!this.hostLocalState.commitments[phase]) {
        this.hostLocalState.commitments[phase] = {};
      }
      this.hostLocalState.commitments[phase].completed = true;

      debugLog('PHASE_MANAGER', `✅ Host committed to ${phase}`);
    }

    // Check if ready to transition
    this.checkReadyToTransition();
  }

  /**
   * Notify Phase Manager that Guest performed an action (received via network)
   * @param {string} actionType - 'pass' or 'commit'
   * @param {object} data - Action data
   * @returns {boolean} True if action was valid and processed
   */
  notifyGuestAction(actionType, data) {
    debugLog('PHASE_MANAGER', `📥 Guest action: ${actionType}`, data);

    // Validate action type for current phase
    if (!this.validateActionForPhase(actionType)) {
      return false;
    }

    if (actionType === 'pass') {
      this.guestLocalState.passInfo.passed = true;

      // Track first passer
      if (!this.hostLocalState.passInfo.firstPasser && !this.guestLocalState.passInfo.firstPasser) {
        this.guestLocalState.passInfo.firstPasser = 'player2';
        this.hostLocalState.passInfo.firstPasser = 'player2'; // Sync across states
      }

      debugLog('PHASE_MANAGER', `✅ Guest passed (player2)`);
    } else if (actionType === 'commit') {
      const { phase } = data;
      if (!this.guestLocalState.commitments[phase]) {
        this.guestLocalState.commitments[phase] = {};
      }
      this.guestLocalState.commitments[phase].completed = true;

      debugLog('PHASE_MANAGER', `✅ Guest committed to ${phase}`);
    }

    // Check if ready to transition
    this.checkReadyToTransition();
  }

  /**
   * Check if both players are ready to transition
   * @returns {boolean} True if ready
   */
  checkReadyToTransition() {
    const currentPhase = this.phaseState.turnPhase;

    // Determine phase type
    const isSequential = this.isSequentialPhase(currentPhase);
    const isSimultaneous = this.isSimultaneousPhase(currentPhase);
    const isAutomatic = !isSequential && !isSimultaneous;

    if (isAutomatic) {
      // Automatic phases transition immediately
      return true;
    }

    if (isSequential) {
      // Check if both players passed
      const bothPassed = this.hostLocalState.passInfo.passed &&
                         this.guestLocalState.passInfo.passed;

      if (bothPassed) {
        debugLog('PHASE_MANAGER', `🎯 Both players passed in ${currentPhase} - ready to transition`);
        return true;
      }

      debugLog('PHASE_MANAGER', `⏳ Waiting for passes: Host=${this.hostLocalState.passInfo.passed}, Guest=${this.guestLocalState.passInfo.passed}`);
      return false;
    }

    if (isSimultaneous) {
      // Check if both players committed
      const hostCommitted = this.hostLocalState.commitments[currentPhase]?.completed || false;
      const guestCommitted = this.guestLocalState.commitments[currentPhase]?.completed || false;
      const bothCommitted = hostCommitted && guestCommitted;

      if (bothCommitted) {
        debugLog('PHASE_MANAGER', `🎯 Both players committed to ${currentPhase} - ready to transition`);
        return true;
      }

      debugLog('PHASE_MANAGER', `⏳ Waiting for commitments in ${currentPhase}: Host=${hostCommitted}, Guest=${guestCommitted}`);
      return false;
    }

    return false;
  }

  /**
   * Transition to a new phase (ONLY method that changes turnPhase)
   * Only Host can call this in multiplayer
   * @param {string} newPhase - The phase to transition to
   * @returns {boolean} Success
   */
  transitionToPhase(newPhase) {
    // Guard: Validate phase name
    if (!PhaseManager.VALID_PHASES.includes(newPhase)) {
      debugLog('PHASE_MANAGER', `🚫 Invalid phase name: ${newPhase}`);
      debugLog('PHASE_MANAGER', `❌ PhaseManager: Invalid phase name: ${newPhase}`);
      return false;
    }

    // Guard: Non-authority cannot transition
    if (!this.isAuthority) {
      debugLog('PHASE_MANAGER', `🚫 Non-authority attempted to transition to ${newPhase} - BLOCKED`);
      debugLog('PHASE_MANAGER', '❌ PhaseManager: Non-authority cannot transition phases!');
      return false;
    }

    // Guard: Prevent concurrent transitions
    if (this.isTransitioning) {
      debugLog('PHASE_MANAGER', `🚫 Transition to ${newPhase} blocked - already transitioning`);
      return false;
    }

    this.isTransitioning = true;
    const oldPhase = this.phaseState.turnPhase;

    try {
      debugLog('PHASE_MANAGER', `🔄 TRANSITION: ${oldPhase} → ${newPhase}`);

      // Update phase state
      this.phaseState.turnPhase = newPhase;

      // Reset phase-specific state for the phase we're leaving
      this.resetPhaseState(oldPhase);

      // Record transition history
      this.transitionHistory.push({
        from: oldPhase,
        to: newPhase,
        timestamp: Date.now(),
        hostState: { ...this.hostLocalState },
        guestState: { ...this.guestLocalState }
      });

      // Keep only last 20 transitions
      if (this.transitionHistory.length > 20) {
        this.transitionHistory.shift();
      }

      debugLog('PHASE_MANAGER', `✅ Phase transition complete: ${newPhase}`);

      return true;
    } catch (error) {
      debugLog('PHASE_MANAGER', `❌ Error during transition: ${error.message}`);
      debugLog('PHASE_MANAGER', '❌ PhaseManager transition error:', error);
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Reset phase-specific state after transition
   * @param {string} phaseToReset - The phase we're leaving (to reset its commitments)
   */
  resetPhaseState(phaseToReset) {
    // Clear pass info (preserving firstPasser for turn order determination)
    const preservedFirstPasser = this.hostLocalState.passInfo.firstPasser;

    this.hostLocalState.passInfo = {
      passed: false,
      firstPasser: preservedFirstPasser
    };
    this.guestLocalState.passInfo = {
      passed: false,
      firstPasser: preservedFirstPasser
    };

    // CRITICAL: Reset commitments for the phase we just LEFT, not the phase we entered
    // Without this, checkReadyToTransition() will incorrectly detect
    // old commitments when a simultaneous phase runs again in subsequent rounds
    if (phaseToReset && this.hostLocalState.commitments[phaseToReset]) {
      this.hostLocalState.commitments[phaseToReset] = { completed: false };
    }
    if (phaseToReset && this.guestLocalState.commitments[phaseToReset]) {
      this.guestLocalState.commitments[phaseToReset] = { completed: false };
    }

    debugLog('PHASE_MANAGER', `🧹 Phase state reset (passInfo and commitments cleared for ${phaseToReset || 'no phase'})`);
  }

  /**
   * Get current phase state (read-only)
   */
  getPhaseState() {
    return { ...this.phaseState };
  }

  /**
   * Get host local state (read-only)
   */
  getHostLocalState() {
    return {
      passInfo: { ...this.hostLocalState.passInfo },
      commitments: { ...this.hostLocalState.commitments }
    };
  }

  /**
   * Get guest local state (read-only)
   */
  getGuestLocalState() {
    return {
      passInfo: { ...this.guestLocalState.passInfo },
      commitments: { ...this.guestLocalState.commitments }
    };
  }

  /**
   * Get transition history (for debugging)
   */
  getTransitionHistory() {
    return [...this.transitionHistory];
  }

  /**
   * Update phase state from external source (for round/turn management)
   * @param {object} updates - State updates
   */
  updatePhaseState(updates) {
    if (!this.isAuthority) {
      debugLog('PHASE_MANAGER', `🚫 Non-authority attempted to update phase state - BLOCKED`);
      return;
    }

    debugLog('PHASE_MANAGER', `📝 Updating phase state:`, updates);
    Object.assign(this.phaseState, updates);
  }

  /**
   * Check if phase is sequential (deployment, action)
   */
  isSequentialPhase(phase) {
    return PhaseManager.SEQUENTIAL_PHASES.includes(phase);
  }

  /**
   * Check if phase is simultaneous
   */
  isSimultaneousPhase(phase) {
    return PhaseManager.SIMULTANEOUS_PHASES.includes(phase);
  }

  /**
   * Reset all state to initial values for a new game.
   * Called by GameStateManager.endGame() to prevent state leaks between games.
   */
  reset() {
    // Reset host local state
    this.hostLocalState = {
      passInfo: {
        passed: false,
        firstPasser: null
      },
      commitments: {}
    };

    // Reset guest local state
    this.guestLocalState = {
      passInfo: {
        passed: false,
        firstPasser: null
      },
      commitments: {}
    };

    // Reset authoritative phase state to defaults
    this.phaseState = {
      turnPhase: 'deckSelection',
      gameStage: 'preGame',
      roundNumber: 1,
      turn: 1,
      currentPlayer: 'player1',
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null
    };

    // Clear transition history (prevents unbounded memory growth)
    this.transitionHistory = [];

    // Reset transition lock
    this.isTransitioning = false;

    debugLog('PHASE_MANAGER', '🧹 PhaseManager reset complete');
  }

  /**
   * Apply master phase state (Guest receives Host broadcast)
   * @param {object} masterPhaseState - Authoritative state from Host
   * @returns {boolean} True if applied, false if blocked
   */
  applyMasterState(masterPhaseState) {
    if (this.isAuthority) {
      debugLog('PHASE_MANAGER', `⚠️ Only non-authority should apply master state`);
      return false;
    }

    debugLog('PHASE_MANAGER', `📥 Guest applying master phase state:`, masterPhaseState);

    // Accept Host's phase state as authoritative
    this.phaseState = { ...masterPhaseState };

    // CRITICAL: Sync firstPasser if included in broadcast
    // Guest needs this to determine turn order in next round
    // Guest cannot independently track firstPasser when host passes first
    if (masterPhaseState.passInfo?.firstPasser) {
      this.hostLocalState.passInfo.firstPasser = masterPhaseState.passInfo.firstPasser;
      this.guestLocalState.passInfo.firstPasser = masterPhaseState.passInfo.firstPasser;
      debugLog('PHASE_MANAGER', `✅ Synced firstPasser: ${masterPhaseState.passInfo.firstPasser}`);
    }

    debugLog('PHASE_MANAGER', `✅ Guest phase state updated to: ${this.phaseState.turnPhase}`);
    return true;
  }
}

export default PhaseManager;
