// ========================================
// WIN CONDITION CHECKER
// ========================================
// Handles win condition detection and game state validation
// Uses total damage model: Win by dealing damage >= DAMAGE_PERCENTAGE of total hull

import { WIN_CONDITION } from '../../config/gameConfig.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * WinConditionChecker
 * Manages win condition detection and game-ending logic
 *
 * Key responsibilities:
 * - Check if a player has lost (total damage >= threshold)
 * - Calculate hull integrity values for UI display
 * - Trigger game-ending callbacks and notifications
 *
 * Win Condition (Total Damage Model):
 * A player wins when they deal damage equal to or greater than
 * DAMAGE_PERCENTAGE (default 60%) of the opponent's total max hull.
 *
 * This is a stateless singleton - all methods are pure functions
 * that check state without side effects.
 */
class WinConditionChecker {
  /**
   * Calculate hull integrity values for a player's ship
   * Used for both win condition checking and UI display
   *
   * @param {Object} playerState - The player's state to check
   * @returns {Object} Hull integrity data:
   *   - totalMaxHull: Sum of all sections' maxHull
   *   - totalCurrentHull: Sum of all sections' current hull
   *   - totalDamageDealt: totalMaxHull - totalCurrentHull
   *   - damageThreshold: Amount of damage needed to win (totalMaxHull * DAMAGE_PERCENTAGE)
   *   - remainingToWin: Additional damage needed to win (0 if already met)
   */
  calculateHullIntegrity(playerState) {
    if (!playerState || !playerState.shipSections) {
      return {
        totalMaxHull: 0,
        totalCurrentHull: 0,
        totalDamageDealt: 0,
        damageThreshold: 0,
        remainingToWin: 0
      };
    }

    const sections = Object.values(playerState.shipSections);

    if (sections.length === 0) {
      return {
        totalMaxHull: 0,
        totalCurrentHull: 0,
        totalDamageDealt: 0,
        damageThreshold: 0,
        remainingToWin: 0
      };
    }

    const totalMaxHull = sections.reduce((sum, section) => sum + (section.maxHull || 0), 0);
    const totalCurrentHull = sections.reduce((sum, section) => sum + Math.max(0, section.hull || 0), 0);
    const totalDamageDealt = totalMaxHull - totalCurrentHull;
    const damageThreshold = Math.ceil(totalMaxHull * WIN_CONDITION.DAMAGE_PERCENTAGE);
    const remainingToWin = Math.max(0, damageThreshold - totalDamageDealt);

    return {
      totalMaxHull,
      totalCurrentHull,
      totalDamageDealt,
      damageThreshold,
      remainingToWin
    };
  }

  /**
   * Check if a player has met the losing condition
   * Pure function that examines total hull damage
   *
   * Win condition: Total damage dealt >= DAMAGE_PERCENTAGE of total max hull
   *
   * @param {Object} opponentPlayerState - The opponent's player state to check
   * @returns {boolean} True if opponent has lost (damage threshold met)
   */
  checkWinCondition(opponentPlayerState) {
    if (!opponentPlayerState || !opponentPlayerState.shipSections) {
      return false;
    }

    const sections = Object.values(opponentPlayerState.shipSections);

    if (sections.length === 0) {
      return false;
    }

    const { totalDamageDealt, damageThreshold } = this.calculateHullIntegrity(opponentPlayerState);

    debugLog('WIN_CONDITION', '🎯 Win condition check', {
      totalDamageDealt,
      damageThreshold,
      percentage: WIN_CONDITION.DAMAGE_PERCENTAGE,
      result: totalDamageDealt >= damageThreshold
    });

    return totalDamageDealt >= damageThreshold;
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
   * @returns {string|null} Winner ('player1', 'player2', or null if no winner yet)
   */
  checkGameStateForWinner(playerStates, callbacks) {
    const { logCallback, setWinnerCallback, showWinnerModalCallback } = callbacks;

    // Check if Player 1 has met the win condition against Player 2
    if (this.checkWinCondition(playerStates.player2)) {
      const p2Integrity = this.calculateHullIntegrity(playerStates.player2);

      setWinnerCallback('player1');
      showWinnerModalCallback(true);
      logCallback({
        player: 'SYSTEM',
        actionType: 'GAME_END',
        source: 'N/A',
        target: 'N/A',
        outcome: `Player 1 wins! (${p2Integrity.totalDamageDealt}/${p2Integrity.damageThreshold} damage dealt)`
      }, 'winConditionCheck');
      return 'player1';
    }

    // Check if Player 2 has met the win condition against Player 1
    if (this.checkWinCondition(playerStates.player1)) {
      const p1Integrity = this.calculateHullIntegrity(playerStates.player1);

      setWinnerCallback('player2');
      showWinnerModalCallback(true);
      logCallback({
        player: 'SYSTEM',
        actionType: 'GAME_END',
        source: 'N/A',
        target: 'N/A',
        outcome: `${playerStates.player2.name} wins! (${p1Integrity.totalDamageDealt}/${p1Integrity.damageThreshold} damage dealt)`
      }, 'winConditionCheck');
      return 'player2';
    }

    return null; // No winner yet
  }
}

// Export singleton instance
export default new WinConditionChecker();
