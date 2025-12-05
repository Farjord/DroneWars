// ========================================
// DECK STATE UTILITIES
// ========================================
// Pure functions for updating deck/drone state objects
// Key behavior: Entries with quantity 0 are removed, not stored

/**
 * Update deck state with a card quantity change
 * Removes the card from state when quantity is 0 (instead of storing 0)
 *
 * @param {Object} prevState - Previous deck state { cardId: quantity }
 * @param {string} cardId - Card ID to update
 * @param {number} quantity - New quantity (0 removes the entry)
 * @returns {Object} New deck state
 */
export const updateDeckState = (prevState, cardId, quantity) => {
  if (quantity === 0) {
    // Remove the card from state entirely
    const { [cardId]: _, ...rest } = prevState;
    return rest;
  }
  // Add or update the card
  return {
    ...prevState,
    [cardId]: quantity
  };
};

/**
 * Update drone state with a drone quantity change
 * Removes the drone from state when quantity is 0 (instead of storing 0)
 *
 * @param {Object} prevState - Previous drone state { droneName: quantity }
 * @param {string} droneName - Drone name to update
 * @param {number} quantity - New quantity (0 removes the entry)
 * @returns {Object} New drone state
 */
export const updateDroneState = (prevState, droneName, quantity) => {
  if (quantity === 0) {
    // Remove the drone from state entirely
    const { [droneName]: _, ...rest } = prevState;
    return rest;
  }
  // Add or update the drone
  return {
    ...prevState,
    [droneName]: quantity
  };
};
