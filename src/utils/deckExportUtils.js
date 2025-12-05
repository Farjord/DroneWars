// ========================================
// DECK EXPORT UTILITIES
// ========================================
// Functions for generating and parsing deck export codes
// Key behavior: Entries with quantity 0 are filtered out (defensive)

/**
 * Generate a deck export code string
 * Filters out any entries with quantity 0 as a defensive measure
 *
 * @param {Object} deck - Deck state { cardId: quantity }
 * @param {Object} selectedDrones - Drone state { droneName: quantity }
 * @param {Object} selectedShipComponents - Components { componentId: lane }
 * @returns {string} Export code in format "cards:...|drones:...|ship:..."
 */
export const generateDeckCode = (deck, selectedDrones, selectedShipComponents) => {
  // Filter out any cards with quantity 0 (defensive - should not exist if state is correct)
  const cardsStr = Object.entries(deck || {})
    .filter(([id, q]) => q > 0)
    .map(([id, q]) => `${id}:${q}`)
    .join(',');

  // Filter out any drones with quantity 0
  const dronesStr = Object.entries(selectedDrones || {})
    .filter(([name, q]) => q > 0)
    .map(([name, q]) => `${name}:${q}`)
    .join(',');

  // Filter out components with null/undefined lane (already done, but defensive)
  const shipStr = Object.entries(selectedShipComponents || {})
    .filter(([id, lane]) => lane)
    .map(([id, lane]) => `${id}:${lane}`)
    .join(',');

  return `cards:${cardsStr}|drones:${dronesStr}|ship:${shipStr}`;
};
