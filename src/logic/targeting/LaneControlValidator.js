// ========================================
// LANE CONTROL VALIDATOR
// ========================================
// Validates whether lane-control cards are playable based on lane control conditions
// Used to determine if cards should be greyed out in hand

import { LaneControlCalculator } from '../combat/LaneControlCalculator.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Check if a lane-control card is playable based on current lane control
 *
 * @param {Object} card - Card to check
 * @param {string} actingPlayerId - Player who would play the card ('player1' or 'player2')
 * @param {Object} playerStates - Current game state
 * @returns {boolean} True if card can be played, false otherwise
 */
export function isLaneControlCardPlayable(card, actingPlayerId, playerStates) {
  // Cards without effect conditions are always playable (by this validator)
  if (!card.effects[0]?.condition) {
    return true;
  }

  // Calculate current lane control
  const laneControl = LaneControlCalculator.calculateLaneControl(
    playerStates.player1,
    playerStates.player2
  );

  const condition = card.effects[0].condition;

  // Check condition based on type
  switch (condition.type) {
    case 'CONTROL_LANES':
      // Check if player controls all/any of the specified lanes
      const controlsRequiredLanes = LaneControlCalculator.checkLaneControl(
        actingPlayerId,
        condition.lanes,
        laneControl,
        condition.operator || 'ALL'
      );

      debugLog('LANE_CONTROL', `[LaneControlValidator] ${card.name} CONTROL_LANES check: ${controlsRequiredLanes}`, {
        requiredLanes: condition.lanes,
        operator: condition.operator || 'ALL',
        laneControl
      });

      return controlsRequiredLanes;

    case 'CONTROL_LANE_EMPTY':
      // Check if ANY lane is controlled by player AND has no enemy drones
      // (For Overrun: player targets a specific lane later, but we check if ANY lane qualifies)
      const hasValidLane = ['lane1', 'lane2', 'lane3'].some(lane =>
        LaneControlCalculator.checkLaneControlEmpty(
          actingPlayerId,
          lane,
          playerStates.player1,
          playerStates.player2,
          laneControl
        )
      );

      debugLog('LANE_CONTROL', `[LaneControlValidator] ${card.name} CONTROL_LANE_EMPTY check: ${hasValidLane}`, {
        laneControl
      });

      return hasValidLane;

    default:
      debugLog('LANE_CONTROL', `[LaneControlValidator] Unknown condition type: ${condition.type}`);
      return false;
  }
}

/**
 * Get playability status for all lane-control cards in a collection
 * Useful for filtering or UI updates
 *
 * @param {Array<Object>} cards - Array of cards to check
 * @param {string} actingPlayerId - Player who would play the cards
 * @param {Object} playerStates - Current game state
 * @returns {Map<string, boolean>} Map of cardId -> isPlayable
 */
export function getLaneControlPlayabilityMap(cards, actingPlayerId, playerStates) {
  const playabilityMap = new Map();

  cards.forEach(card => {
    if (card.effects[0]?.condition) {
      playabilityMap.set(card.id, isLaneControlCardPlayable(card, actingPlayerId, playerStates));
    }
  });

  return playabilityMap;
}

export default { isLaneControlCardPlayable, getLaneControlPlayabilityMap };
