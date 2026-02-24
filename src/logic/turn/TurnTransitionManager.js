// ========================================
// TURN TRANSITION MANAGER
// ========================================
// Handles turn and phase transition logic
// Extracted from gameLogic.js Phase 9.3

import { debugLog } from '../../utils/debugLogger.js';

/**
 * TurnTransitionManager
 * Manages turn transitions, pass sequences, and phase changes
 *
 * Key responsibilities:
 * - Calculate turn transitions (player switching, pass handling)
 * - Process turn state changes
 * - Handle phase transitions (deployment → action → roundEnd)
 * - Generate UI effects for transitions
 *
 * This is a static utility class - all methods are pure functions
 * that calculate transitions without side effects.
 */
class TurnTransitionManager {
  /**
   * Calculate turn transition logic
   * Determines what happens when a player ends their turn
   *
   * @param {string} actingPlayer - 'player1' or 'player2'
   * @param {Object} passInfo - Pass tracking object
   * @param {string} turnPhase - Current phase ('deployment' or 'action')
   * @param {string|null} winner - Winner if game has ended
   * @returns {Object} Transition object { type, nextPlayer?, showOpponentModal?, triggerAi? }
   */
  static calculateTurnTransition(actingPlayer, passInfo, turnPhase, winner) {
    const nextPlayer = actingPlayer === 'player1' ? 'player2' : 'player1';

    // If both players have passed, end the current phase
    if (passInfo.player1Passed && passInfo.player2Passed) {
      return {
        type: 'END_PHASE',
        phase: turnPhase,
        nextPlayer: null
      };
    }

    // If the next player has already passed, current player continues
    const nextPlayerHasPassed = (nextPlayer === 'player1' && passInfo.player1Passed) ||
                                (nextPlayer === 'player2' && passInfo.player2Passed);

    if (nextPlayerHasPassed) {
      return {
        type: 'CONTINUE_TURN',
        nextPlayer: actingPlayer,
        triggerAi: actingPlayer === 'player2'
      };
    }

    // Normal turn transition
    return {
      type: 'CHANGE_PLAYER',
      nextPlayer: nextPlayer,
      showOpponentModal: nextPlayer === 'player2' && !winner
    };
  }

  /**
   * Calculate pass transition logic
   * Determines what happens when a player passes
   *
   * @param {string} passingPlayer - 'player1' or 'player2'
   * @param {Object} passInfo - Pass tracking object
   * @param {string} turnPhase - Current phase ('deployment' or 'action')
   * @returns {Object} Transition object { type, newPassInfo, nextPlayer?, phase? }
   */
  static calculatePassTransition(passingPlayer, passInfo, turnPhase) {
    const wasFirstToPass = !passInfo.player1Passed && !passInfo.player2Passed;

    const newPassInfo = {
      ...passInfo,
      [`${passingPlayer}Passed`]: true,
      firstPasser: passInfo.firstPasser || (wasFirstToPass ? passingPlayer : null)
    };

    // If both players have now passed, end the phase
    if (newPassInfo.player1Passed && newPassInfo.player2Passed) {
      return {
        type: 'END_PHASE',
        newPassInfo,
        phase: turnPhase
      };
    }

    // Continue with opponent
    const nextPlayer = passingPlayer === 'player1' ? 'player2' : 'player1';
    return {
      type: 'CHANGE_PLAYER',
      newPassInfo,
      nextPlayer
    };
  }

  /**
   * Process turn transition with full state management
   * Applies turn transition logic to game state
   *
   * @param {Object} currentState - Current game state
   * @param {string} actingPlayer - Player who is ending their turn
   * @returns {Object} { newState, uiEffects, transitionType }
   */
  static processTurnTransition(currentState, actingPlayer) {
    // Calculate base transition logic
    const transition = this.calculateTurnTransition(
      actingPlayer,
      currentState.passInfo,
      currentState.turnPhase,
      currentState.winner
    );

    let newState = { ...currentState };
    const uiEffects = [];

    // Apply state changes based on transition type
    switch (transition.type) {
      case 'END_PHASE':
        // Phase is ending - prepare for phase transition
        uiEffects.push({
          type: 'PHASE_END',
          phase: transition.phase,
          trigger: 'both_players_passed'
        });

        // Clear pass info for next phase
        newState.passInfo = {
          firstPasser: null,
          player1Passed: false,
          player2Passed: false
        };
        break;

      case 'CHANGE_PLAYER':
        // Normal turn transition
        newState.currentPlayer = transition.nextPlayer;

        if (transition.showOpponentModal) {
          uiEffects.push({
            type: 'SHOW_WAITING_MODAL',
            player: transition.nextPlayer
          });
        }
        break;

      case 'CONTINUE_TURN':
        // Player continues (opponent has passed)
        // No state change needed
        break;
    }

    return {
      newState,
      uiEffects,
      transitionType: transition.type
    };
  }

  /**
   * Process phase change with state management
   * Handles transitions between deployment, action, and roundEnd phases
   *
   * @param {Object} currentState - Current game state
   * @param {string} newPhase - New phase to transition to
   * @param {Function} determineFirstPlayerFn - Function to determine first player
   * @param {string} trigger - What triggered the phase change (default: 'manual')
   * @returns {Object} { newState, uiEffects }
   */
  static processPhaseChange(currentState, newPhase, determineFirstPlayerFn, trigger = 'manual') {
    let newState = {
      ...currentState,
      turnPhase: newPhase
    };

    const uiEffects = [];

    // Handle phase-specific setup
    switch (newPhase) {
      case 'deployment':
        // Starting deployment phase
        newState.passInfo = {
          firstPasser: null,
          player1Passed: false,
          player2Passed: false
        };

        // Determine first player for the phase
        const firstPlayer = determineFirstPlayerFn(
          currentState.turn,
          currentState.firstPlayerOverride,
          currentState.firstPasserOfPreviousRound
        );

        newState.currentPlayer = firstPlayer;
        newState.firstPlayerOfRound = firstPlayer;

        uiEffects.push({
          type: 'PHASE_START',
          phase: 'deployment',
          firstPlayer: firstPlayer
        });
        break;

      case 'action':
        // Starting action phase
        newState.passInfo = {
          firstPasser: null,
          player1Passed: false,
          player2Passed: false
        };

        // First player of action phase is determined by deployment pass order
        const actionFirstPlayer = currentState.passInfo.firstPasser || currentState.firstPlayerOfRound;
        newState.currentPlayer = actionFirstPlayer;

        uiEffects.push({
          type: 'PHASE_START',
          phase: 'action',
          firstPlayer: actionFirstPlayer
        });
        break;

      case 'roundEnd':
        // Ending the round
        uiEffects.push({
          type: 'ROUND_END',
          turn: currentState.turn
        });
        break;

      default:
        debugLog('PHASE_TRANSITIONS', `Unknown phase: ${newPhase}`);
    }

    return {
      newState,
      uiEffects
    };
  }

  /**
   * Create UI effects for turn end
   * Generates appropriate UI effects based on turn transition
   *
   * @param {string} actingPlayer - Player who is ending their turn
   * @param {Object} passInfo - Pass tracking object
   * @param {string} turnPhase - Current phase
   * @param {string|null} winner - Winner if game has ended
   * @returns {Object} { transition, uiEffects }
   */
  static createTurnEndEffects(actingPlayer, passInfo, turnPhase, winner) {
    const transition = this.calculateTurnTransition(actingPlayer, passInfo, turnPhase, winner);

    const uiEffects = [];

    switch (transition.type) {
      case 'CHANGE_PLAYER':
        if (transition.nextPlayer === 'player1') {
          uiEffects.push({ type: 'CLOSE_MODAL' });
        } else if (transition.showOpponentModal) {
          uiEffects.push({
            type: 'SHOW_MODAL',
            modal: {
              title: "Opponent's Turn",
              text: "The AI is taking its turn.",
              isBlocking: false,
              onClose: null
            }
          });
        }
        break;
    }

    if (transition.triggerAi) {
      uiEffects.push({ type: 'TRIGGER_AI' });
    }

    return {
      transition,
      uiEffects
    };
  }
}

// Export as static class (no instantiation needed)
export default TurnTransitionManager;
