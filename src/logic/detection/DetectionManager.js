// ========================================
// DETECTION MANAGER
// ========================================
// Manages detection state (0-100%) for Exploring the Eremos mode
// Tracks detection increases from movement, combat, looting
// Triggers MIA protocol at 100%

import gameStateManager from '../../managers/GameStateManager.js';
import { getZone } from '../../utils/hexGrid.js';

/**
 * DetectionManager - Singleton manager for detection system
 *
 * Detection is the core tension mechanic for extraction mode:
 * - 0-49%: Low threat (Scouts, Patrols) - Green
 * - 50-79%: Medium threat (Cruisers, Hunters) - Yellow
 * - 80-100%: High threat (Blockades) - Red
 * - 100%: Auto MIA (mission failure)
 *
 * Detection triggers (zone-based for movement):
 * - Movement Core: +2.5% per hex
 * - Movement Mid: +1.5% per hex
 * - Movement Perimeter: +0.5% per hex
 * - Looting PoI: +10%
 * - Combat End: +20%
 */
class DetectionManager {
  constructor() {
    // Singleton instance
    if (DetectionManager.instance) {
      return DetectionManager.instance;
    }
    DetectionManager.instance = this;
  }

  /**
   * Add detection with reason logging
   * @param {number} amount - Amount to add (0-100)
   * @param {string} reason - Reason for increase (for logging)
   */
  addDetection(amount, reason = 'Unknown') {
    const gameState = gameStateManager.getState();
    const currentRunState = gameState.currentRunState;

    if (!currentRunState) {
      console.warn('Cannot add detection: No active run');
      return;
    }

    const current = currentRunState.detection;
    const newValue = Math.min(100, current + amount);

    gameStateManager.setState({
      currentRunState: {
        ...currentRunState,
        detection: newValue
      }
    });

    console.log(`[Detection] ${current.toFixed(1)}% -> ${newValue.toFixed(1)}% (+${amount.toFixed(1)}%) [${reason}]`);

    // Check for MIA trigger
    if (newValue >= 100) {
      this.triggerMIA();
    }
  }

  /**
   * Get current detection level
   * @returns {number} Current detection (0-100)
   */
  getCurrentDetection() {
    const gameState = gameStateManager.getState();
    return gameState.currentRunState?.detection || 0;
  }

  /**
   * Get detection threshold category
   * @returns {'low' | 'medium' | 'high'} Threshold category
   */
  getThreshold() {
    const det = this.getCurrentDetection();
    if (det < 50) return 'low';
    if (det < 80) return 'medium';
    return 'high';
  }

  /**
   * Get threshold color for UI
   * @returns {string} CSS color
   */
  getThresholdColor() {
    const threshold = this.getThreshold();
    switch (threshold) {
      case 'low': return '#10b981'; // Green
      case 'medium': return '#f59e0b'; // Yellow
      case 'high': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  }

  /**
   * Get threshold label for UI
   * @returns {string} Human-readable label
   */
  getThresholdLabel() {
    const threshold = this.getThreshold();
    switch (threshold) {
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium Risk';
      case 'high': return 'CRITICAL';
      default: return 'Unknown';
    }
  }

  /**
   * Trigger MIA protocol (detection reached 100%)
   * Ends run as failure, locks ship slot as MIA
   */
  triggerMIA() {
    console.warn('[Detection] 100% reached - MIA TRIGGERED');

    // Get isStarterDeck BEFORE endRun clears the run state
    const runState = gameStateManager.getState().currentRunState;
    const isStarterDeck = runState?.shipSlotId === 0;

    // End the run as failed
    gameStateManager.endRun(false);

    // Show failed run loading screen (will transition to hangar on complete)
    gameStateManager.setState({
      showFailedRunScreen: true,
      failedRunType: 'detection',
      failedRunIsStarterDeck: isStarterDeck
    });
  }

  /**
   * Calculate detection cost for a single hex based on zone
   * @param {Object} hex - Hex object with q, r coordinates
   * @param {Object} tierConfig - Tier configuration from mapData
   * @param {number} mapRadius - Map radius for zone calculation
   * @returns {number} Detection cost for this hex
   */
  getHexDetectionCost(hex, tierConfig, mapRadius) {
    const zone = hex.zone || getZone(hex.q, hex.r, mapRadius);
    const zoneRates = tierConfig.detectionTriggers.movementByZone;

    // Use zone-specific rate, fallback to flat rate
    if (zoneRates) {
      return zoneRates[zone] || tierConfig.detectionTriggers.movementPerHex;
    }
    return tierConfig.detectionTriggers.movementPerHex;
  }

  /**
   * Calculate total detection cost for a path
   * @param {Array<Object>} path - Array of hex objects in path
   * @param {Object} tierConfig - Tier configuration from mapData
   * @param {number} mapRadius - Map radius for zone calculation
   * @returns {number} Total detection cost for path
   */
  calculatePathDetectionCost(path, tierConfig, mapRadius) {
    if (!path || path.length <= 1) return 0;

    // Sum detection cost for each hex in path (excluding start)
    let totalCost = 0;
    for (let i = 1; i < path.length; i++) {
      totalCost += this.getHexDetectionCost(path[i], tierConfig, mapRadius);
    }
    return totalCost;
  }

  /**
   * Reset detection (for testing/debugging)
   */
  reset() {
    const gameState = gameStateManager.getState();
    const currentRunState = gameState.currentRunState;

    if (!currentRunState) {
      console.warn('Cannot reset detection: No active run');
      return;
    }

    gameStateManager.setState({
      currentRunState: {
        ...currentRunState,
        detection: 0
      }
    });

    console.log('[Detection] Reset to 0%');
  }
}

// Export singleton instance
export default new DetectionManager();
