/**
 * PhaseManager - Single Authoritative Source for Phase Transitions
 *
 * This class is the ONLY entity that can transition phases in the game.
 * It tracks both players' local states independently and determines
 * when both are ready to progress.
 *
 * Design Principles:
 * - Single source of truth for phase progression
 * - Authority/non-authority model
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
    'preGameSetup', 'roundInitialization',
    'mandatoryDiscard', 'optionalDiscard', 'allocateShields',
    'mandatoryDroneRemoval', 'deployment', 'action'
  ];

  // Sequential phases: players take turns passing
  static SEQUENTIAL_PHASES = SEQUENTIAL_PHASES;

  // Simultaneous phases: both players commit at once
  static SIMULTANEOUS_PHASES = [
    'preGameSetup', 'mandatoryDiscard', 'optionalDiscard', 'allocateShields',
    'mandatoryDroneRemoval'
  ];
  constructor(gameStateManager, { isAuthority = true } = {}) {
    this.gameStateManager = gameStateManager;
    this.isAuthority = isAuthority;

    // Initialize all mutable state via reset() — single source of truth for defaults
    this.reset();

    debugLog('PHASE_MANAGER', `✅ PhaseManager initialized (authority: ${isAuthority})`);
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
      return false;
    }
    if (actionType === 'commit' && !PhaseManager.SIMULTANEOUS_PHASES.includes(currentPhase)) {
      debugLog('PHASE_MANAGER', `🚫 Commit action invalid for sequential phase: ${currentPhase}`);
      return false;
    }
    return true;
  }

  /**
   * Notify Phase Manager that a player performed an action
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} actionType - 'pass' or 'commit'
   * @param {object} data - Action data
   * @returns {boolean} True if action was valid and processed
   */
  notifyPlayerAction(playerId, actionType, data) {
    debugLog('PHASE_MANAGER', `📥 ${playerId} action: ${actionType}`, data);

    const playerState = playerId === 'player1' ? this.player1State : this.player2State;
    const otherState = playerId === 'player1' ? this.player2State : this.player1State;

    // Validate action type for current phase
    if (!this.validateActionForPhase(actionType)) {
      return false;
    }

    if (actionType === 'pass') {
      playerState.passInfo.passed = true;

      // Track first passer
      if (!this.player1State.passInfo.firstPasser && !this.player2State.passInfo.firstPasser) {
        playerState.passInfo.firstPasser = playerId;
        otherState.passInfo.firstPasser = playerId; // Sync across states
      }

      debugLog('PHASE_MANAGER', `✅ ${playerId} passed`);
    } else if (actionType === 'commit') {
      const { phase } = data;
      if (!playerState.commitments[phase]) {
        playerState.commitments[phase] = {};
      }
      playerState.commitments[phase].completed = true;

      debugLog('PHASE_MANAGER', `✅ ${playerId} committed to ${phase}`);
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
      const bothPassed = this.player1State.passInfo.passed &&
                         this.player2State.passInfo.passed;

      if (bothPassed) {
        debugLog('PHASE_MANAGER', `🎯 Both players passed in ${currentPhase} - ready to transition`);
        return true;
      }

      debugLog('PHASE_MANAGER', `⏳ Waiting for passes: player1=${this.player1State.passInfo.passed}, player2=${this.player2State.passInfo.passed}`);
      return false;
    }

    if (isSimultaneous) {
      // Check if both players committed
      const p1Committed = this.player1State.commitments[currentPhase]?.completed || false;
      const p2Committed = this.player2State.commitments[currentPhase]?.completed || false;
      const bothCommitted = p1Committed && p2Committed;

      if (bothCommitted) {
        debugLog('PHASE_MANAGER', `🎯 Both players committed to ${currentPhase} - ready to transition`);
        return true;
      }

      debugLog('PHASE_MANAGER', `⏳ Waiting for commitments in ${currentPhase}: player1=${p1Committed}, player2=${p2Committed}`);
      return false;
    }

    return false;
  }

  /**
   * Transition to a new phase (ONLY method that changes turnPhase)
   * Only authority can call this in multiplayer
   * @param {string} newPhase - The phase to transition to
   * @returns {boolean} Success
   */
  transitionToPhase(newPhase) {
    // Guard: Validate phase name
    if (!PhaseManager.VALID_PHASES.includes(newPhase)) {
      debugLog('PHASE_MANAGER', `🚫 Invalid phase name: ${newPhase}`);
      return false;
    }

    // Guard: Non-authority cannot transition
    if (!this.isAuthority) {
      debugLog('PHASE_MANAGER', `🚫 Non-authority attempted to transition to ${newPhase} - BLOCKED`);
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
        player1State: { ...this.player1State },
        player2State: { ...this.player2State }
      });

      // Keep only last 20 transitions
      if (this.transitionHistory.length > 20) {
        this.transitionHistory.shift();
      }

      debugLog('PHASE_MANAGER', `✅ Phase transition complete: ${newPhase}`);

      return true;
    } catch (error) {
      debugLog('PHASE_MANAGER', `❌ Error during transition: ${error.message}`, error);
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
    const preservedFirstPasser = this.player1State.passInfo.firstPasser;

    this.player1State.passInfo = {
      passed: false,
      firstPasser: preservedFirstPasser
    };
    this.player2State.passInfo = {
      passed: false,
      firstPasser: preservedFirstPasser
    };

    // CRITICAL: Reset commitments for the phase we just LEFT, not the phase we entered
    // Without this, checkReadyToTransition() will incorrectly detect
    // old commitments when a simultaneous phase runs again in subsequent rounds
    if (phaseToReset && this.player1State.commitments[phaseToReset]) {
      this.player1State.commitments[phaseToReset] = { completed: false };
    }
    if (phaseToReset && this.player2State.commitments[phaseToReset]) {
      this.player2State.commitments[phaseToReset] = { completed: false };
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
   * Get player 1 state (read-only)
   */
  getPlayer1State() {
    return {
      passInfo: { ...this.player1State.passInfo },
      commitments: { ...this.player1State.commitments }
    };
  }

  /**
   * Get player 2 state (read-only)
   */
  getPlayer2State() {
    return {
      passInfo: { ...this.player2State.passInfo },
      commitments: { ...this.player2State.commitments }
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
    // Reset player 1 state
    this.player1State = {
      passInfo: {
        passed: false,
        firstPasser: null
      },
      commitments: {}
    };

    // Reset player 2 state
    this.player2State = {
      passInfo: {
        passed: false,
        firstPasser: null
      },
      commitments: {}
    };

    // Reset authoritative phase state to defaults
    this.phaseState = {
      turnPhase: 'preGameSetup',
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
   * Apply master phase state (non-authority receives authority broadcast)
   * @param {object} masterPhaseState - Authoritative state from authority
   * @returns {boolean} True if applied, false if blocked
   */
  applyMasterState(masterPhaseState) {
    if (this.isAuthority) {
      debugLog('PHASE_MANAGER', `⚠️ Only non-authority should apply master state`);
      return false;
    }

    debugLog('PHASE_MANAGER', `📥 Applying master phase state:`, masterPhaseState);

    // Accept authority's phase state
    this.phaseState = { ...masterPhaseState };

    // CRITICAL: Sync firstPasser if included in broadcast
    // Non-authority needs this to determine turn order in next round
    // Non-authority cannot independently track firstPasser when authority passes first
    if (masterPhaseState.passInfo?.firstPasser) {
      this.player1State.passInfo.firstPasser = masterPhaseState.passInfo.firstPasser;
      this.player2State.passInfo.firstPasser = masterPhaseState.passInfo.firstPasser;
      debugLog('PHASE_MANAGER', `✅ Synced firstPasser: ${masterPhaseState.passInfo.firstPasser}`);
    }

    debugLog('PHASE_MANAGER', `✅ Phase state updated to: ${this.phaseState.turnPhase}`);
    return true;
  }
}

export default PhaseManager;
