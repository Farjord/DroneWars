/**
 * CreditManager.js
 * Centralized credit management service
 * Handles all credit transactions with logging
 */

import gameStateManager from '../../managers/GameStateManager.js';
import { debugLog } from '../../utils/debugLogger.js';

class CreditManager {
  /**
   * Check if player can afford a cost
   * @param {number} amount - The amount to check
   * @returns {boolean} True if player has enough credits
   */
  canAfford(amount) {
    const profile = gameStateManager.getState().singlePlayerProfile;
    if (!profile) {
      debugLog('ECONOMY', 'Cannot check affordability - no profile found');
      return false;
    }
    return profile.credits >= amount;
  }

  /**
   * Get current credit balance
   * @returns {number} Current credits
   */
  getBalance() {
    const profile = gameStateManager.getState().singlePlayerProfile;
    return profile ? profile.credits : 0;
  }

  /**
   * Deduct credits from player
   * @param {number} amount - The amount to deduct
   * @param {string} reason - Reason for deduction (for logging)
   * @returns {{ success: boolean, error?: string, newBalance?: number }}
   */
  deduct(amount, reason = 'Unknown') {
    const state = gameStateManager.getState();
    const profile = state.singlePlayerProfile;

    if (!profile) {
      debugLog('ECONOMY', `Deduct failed: No profile found (reason: ${reason})`);
      return { success: false, error: 'No player profile found' };
    }

    if (amount <= 0) {
      debugLog('ECONOMY', `Deduct failed: Invalid amount ${amount} (reason: ${reason})`);
      return { success: false, error: 'Invalid amount' };
    }

    if (profile.credits < amount) {
      debugLog('ECONOMY', `Deduct failed: Insufficient credits. Need ${amount}, have ${profile.credits} (reason: ${reason})`);
      return { success: false, error: `Insufficient credits. Need ${amount}, have ${profile.credits}` };
    }

    const previousBalance = profile.credits;
    profile.credits -= amount;

    // Update state
    gameStateManager.setState({
      singlePlayerProfile: { ...profile }
    });

    debugLog('ECONOMY', `Deducted ${amount} credits for: ${reason}. Balance: ${previousBalance} → ${profile.credits}`);

    return { success: true, newBalance: profile.credits };
  }

  /**
   * Add credits to player
   * @param {number} amount - The amount to add
   * @param {string} reason - Reason for addition (for logging)
   * @returns {{ success: boolean, error?: string, newBalance?: number }}
   */
  add(amount, reason = 'Unknown') {
    const state = gameStateManager.getState();
    const profile = state.singlePlayerProfile;

    if (!profile) {
      debugLog('ECONOMY', `Add failed: No profile found (reason: ${reason})`);
      return { success: false, error: 'No player profile found' };
    }

    if (amount <= 0) {
      debugLog('ECONOMY', `Add failed: Invalid amount ${amount} (reason: ${reason})`);
      return { success: false, error: 'Invalid amount' };
    }

    const previousBalance = profile.credits;
    profile.credits += amount;

    // Update state
    gameStateManager.setState({
      singlePlayerProfile: { ...profile }
    });

    debugLog('ECONOMY', `Added ${amount} credits for: ${reason}. Balance: ${previousBalance} → ${profile.credits}`);

    return { success: true, newBalance: profile.credits };
  }
}

export default new CreditManager();
