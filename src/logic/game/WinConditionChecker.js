// ========================================
// WIN CONDITION CHECKER
// ========================================
// Handles win condition detection and game state validation
// Extracted from gameLogic.js Phase 9.7

import { getShipStatus } from '../statsCalculator.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * WinConditionChecker
 * Manages win condition detection and game-ending logic
 *
 * Key responsibilities:
 * - Check if a player has lost (3+ ship sections damaged/critical)
 * - Validate game state for winner determination
 * - Trigger game-ending callbacks and notifications
 *
 * This is a stateless singleton - all methods are pure functions
 * that check state without side effects.
 */
class WinConditionChecker {
  /**
   * Check if a player has met the losing condition
   * Pure function that examines ship section status
   *
   * Win condition: Opponent has 3+ sections damaged or critical
   *
   * @param {Object} opponentPlayerState - The opponent's player state to check
   * @returns {boolean} True if opponent has lost (3+ sections damaged/critical)
   */
  checkWinCondition(opponentPlayerState) {
    if (!opponentPlayerState || !opponentPlayerState.shipSections) {
      return false;
    }

    const sectionStatuses = Object.values(opponentPlayerState.shipSections).map(
      (section) => getShipStatus(section)
    );

    const damagedOrWorseCount = sectionStatuses.filter(
      (status) => status === 'damaged' || status === 'critical'
    ).length;

    if (damagedOrWorseCount >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Check game state for winner and trigger callbacks
   * Checks both players and executes appropriate callbacks when a winner is found
   *
   * This function has side effects (triggers callbacks) but the win condition
   * logic itself is pure.
   *
   * @param {Object} playerStates - { player1: playerState, player2: playerState }
   * @param {Object} callbacks - Callback functions { logCallback, setWinnerCallback, showWinnerModalCallback }
   * @returns {string|null} Winner ('Player 1', 'Player 2', or null if no winner yet)
   */
  checkGameStateForWinner(playerStates, callbacks) {
    const { logCallback, setWinnerCallback, showWinnerModalCallback } = callbacks;

    // Check if Player 1 has met the win condition against Player 2
    if (this.checkWinCondition(playerStates.player2)) {
      setWinnerCallback('Player 1');
      showWinnerModalCallback(true);
      logCallback({
        player: 'SYSTEM',
        actionType: 'GAME_END',
        source: 'N/A',
        target: 'N/A',
        outcome: 'Player 1 wins!'
      }, 'winConditionCheck');
      return 'Player 1';
    }

    // Check if Player 2 has met the win condition against Player 1
    if (this.checkWinCondition(playerStates.player1)) {
      setWinnerCallback('Player 2');
      showWinnerModalCallback(true);
      logCallback({
        player: 'SYSTEM',
        actionType: 'GAME_END',
        source: 'N/A',
        target: 'N/A',
        outcome: `${playerStates.player2.name} wins!`
      }, 'winConditionCheck');
      return 'Player 2';
    }

    return null; // No winner yet
  }
}

// Export singleton instance
export default new WinConditionChecker();
