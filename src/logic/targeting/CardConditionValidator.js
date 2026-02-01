// ========================================
// CARD CONDITION VALIDATOR
// ========================================
// Generic validator for card play conditions
// Handles conditions that must be met BEFORE a card can be played
// (separate from targeting requirements)

import { LaneControlCalculator } from '../combat/LaneControlCalculator.js';

/**
 * Check if a card's play condition is met
 * @param {Object} card - The card being played
 * @param {string} actingPlayerId - 'player1' or 'player2'
 * @param {Object} playerStates - { player1: state, player2: state }
 * @returns {boolean} True if condition is met (or no condition exists)
 */
export function isCardConditionMet(card, actingPlayerId, playerStates) {
  if (!card.playCondition) return true;

  const condition = card.playCondition;

  if (condition.type === 'LANE_CONTROL_COMPARISON') {
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
    const myLanes = LaneControlCalculator.countLanesControlled(actingPlayerId, playerStates.player1, playerStates.player2);
    const opponentLanes = LaneControlCalculator.countLanesControlled(opponentId, playerStates.player1, playerStates.player2);

    if (condition.comparison === 'FEWER_THAN_OPPONENT') return myLanes < opponentLanes;
    if (condition.comparison === 'MORE_THAN_OPPONENT') return myLanes > opponentLanes;
    if (condition.comparison === 'EQUAL_TO_OPPONENT') return myLanes === opponentLanes;
  }

  return false; // Unknown condition types block play
}
