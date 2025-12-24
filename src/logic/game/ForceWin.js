// ========================================
// FORCE WIN - DEV FEATURE
// ========================================
// Allows developers to quickly win combat for testing
// extraction mode flows.
//
// REFACTORED: Routes through ActionProcessor to avoid
// architecture violations when called from App.jsx.

import gameStateManager from '../../managers/GameStateManager.js';

/**
 * Force a combat win by routing through ActionProcessor.
 * Triggers proper state updates without architecture violations.
 *
 * All logic (damaging opponent sections, logging, win condition check)
 * is handled by ActionProcessor.processForceWin().
 */
export function forceWinCombat() {
  gameStateManager.actionProcessor.processForceWin();
}
