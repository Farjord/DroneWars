// ========================================
// HIGH ALERT MANAGER
// ========================================
// Manages the "High Alert" state for PoIs after combat victory.
// When a player wins combat during salvage, the PoI enters high alert
// with an increased encounter chance for subsequent salvage attempts.

/**
 * HighAlertManager
 *
 * Tracks PoIs that are in "High Alert" state and manages the
 * encounter chance bonus associated with each.
 */
class HighAlertManager {
  /**
   * Generate a random alert bonus between 5% and 15%
   * @returns {number} Bonus value between 0.05 and 0.15
   */
  generateAlertBonus() {
    // Random bonus between 5% (0.05) and 15% (0.15)
    return 0.05 + (Math.random() * 0.10);
  }

  /**
   * Add a PoI to the high alert list
   * If the PoI is already in high alert, does not add a duplicate.
   *
   * @param {Object} runState - Current run state
   * @param {Object} poi - PoI coordinates { q, r }
   * @returns {Object} Updated run state with new highAlertPOIs
   */
  addHighAlert(runState, poi) {
    const highAlertPOIs = runState.highAlertPOIs || [];

    // Check if already in high alert
    const alreadyInAlert = highAlertPOIs.some(
      p => p.q === poi.q && p.r === poi.r
    );

    if (alreadyInAlert) {
      // Don't add duplicate - return unchanged
      return {
        ...runState,
        highAlertPOIs
      };
    }

    // Add new high alert entry
    const alertBonus = this.generateAlertBonus();
    const newHighAlertPOI = {
      q: poi.q,
      r: poi.r,
      alertBonus
    };

    return {
      ...runState,
      highAlertPOIs: [...highAlertPOIs, newHighAlertPOI]
    };
  }

  /**
   * Get the alert bonus for a specific PoI
   * Returns 0 if the PoI is not in high alert.
   *
   * @param {Object} runState - Current run state
   * @param {Object} poi - PoI coordinates { q, r }
   * @returns {number} Alert bonus (0.05-0.15) or 0 if not in alert
   */
  getAlertBonus(runState, poi) {
    const highAlertPOIs = runState?.highAlertPOIs || [];

    const alertEntry = highAlertPOIs.find(
      p => p.q === poi.q && p.r === poi.r
    );

    return alertEntry?.alertBonus || 0;
  }

  /**
   * Check if a PoI is in high alert
   *
   * @param {Object} runState - Current run state
   * @param {Object} poi - PoI coordinates { q, r }
   * @returns {boolean} True if PoI is in high alert
   */
  isHighAlert(runState, poi) {
    const highAlertPOIs = runState?.highAlertPOIs || [];

    return highAlertPOIs.some(
      p => p.q === poi.q && p.r === poi.r
    );
  }
}

// Export singleton instance
export default new HighAlertManager();
