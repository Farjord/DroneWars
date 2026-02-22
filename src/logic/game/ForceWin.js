// Force Win — DEV FEATURE
// Routes through ActionProcessor to trigger proper state updates.

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
