// ========================================
// LANE CONTROL CALCULATOR
// ========================================
// Calculates which player controls each lane based on drone counts
// Control rule: Player with MORE drones controls the lane (tie = no control)
//
// This is designed to be reusable for:
// - Lane-control cards (conditional effects based on lane control)
// - UI feedback (visual indicators)
// - Future card effects (e.g., "This drone gets +1 attack if you control the lane")

import { debugLog } from '../../utils/debugLogger.js';

/**
 * Lane Control Calculator
 * Static utility class for calculating and checking lane control
 */
export class LaneControlCalculator {
  /**
   * Calculate lane control for all three lanes
   * @param {Object} player1State - Player 1 game state
   * @param {Object} player2State - Player 2 game state
   * @returns {Object} Lane control mapping: { lane1: 'player1'|'player2'|null, lane2: ..., lane3: ... }
   */
  static calculateLaneControl(player1State, player2State) {
    const laneControl = {};

    // Calculate control for each lane independently
    ['lane1', 'lane2', 'lane3'].forEach(lane => {
      // Get drone counts, handling undefined/missing arrays
      const p1Count = (player1State.dronesOnBoard[lane] || []).filter(d => !d.isToken).length;
      const p2Count = (player2State.dronesOnBoard[lane] || []).filter(d => !d.isToken).length;

      // Determine control: more drones = control, tie = null
      if (p1Count > p2Count) {
        laneControl[lane] = 'player1';
      } else if (p2Count > p1Count) {
        laneControl[lane] = 'player2';
      } else {
        laneControl[lane] = null;  // Tie or both empty
      }

      debugLog('LANE_CONTROL', `${lane}: P1=${p1Count} drones, P2=${p2Count} drones, Control=${laneControl[lane]}`);
    });

    return laneControl;
  }

  /**
   * Check if a player controls specific lanes
   * Used by lane-control cards to validate conditions
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Array<string>} requiredLanes - Array of lane IDs (e.g., ['lane1', 'lane3'])
   * @param {Object} laneControl - Lane control state from calculateLaneControl()
   * @param {string} operator - 'ALL' (default) or 'ANY'
   * @returns {boolean} True if condition met
   */
  static checkLaneControl(playerId, requiredLanes, laneControl, operator = 'ALL') {
    if (operator === 'ALL') {
      // ALL lanes must be controlled by this player
      return requiredLanes.every(lane => laneControl[lane] === playerId);
    } else {
      // ANY lane must be controlled by this player
      return requiredLanes.some(lane => laneControl[lane] === playerId);
    }
  }

  /**
   * Count how many lanes a player controls
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} player1State - Player 1 game state
   * @param {Object} player2State - Player 2 game state
   * @returns {number} Number of lanes controlled (0-3)
   */
  static countLanesControlled(playerId, player1State, player2State) {
    const count = this.getLanesControlled(playerId, player1State, player2State).length;
    debugLog('LANE_CONTROL', `${playerId} controls ${count} lanes`);
    return count;
  }

  /**
   * Get array of lane IDs that a player controls
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} player1State - Player 1 game state
   * @param {Object} player2State - Player 2 game state
   * @returns {Array<string>} Array of lane IDs controlled (e.g., ['lane1', 'lane3'])
   */
  static getLanesControlled(playerId, player1State, player2State) {
    const laneControl = this.calculateLaneControl(player1State, player2State);
    const controlled = [];

    for (const lane of ['lane1', 'lane2', 'lane3']) {
      if (laneControl[lane] === playerId) {
        controlled.push(lane);
      }
    }

    debugLog('LANE_CONTROL', `${playerId} controls lanes: [${controlled.join(', ')}]`);
    return controlled;
  }

  /**
   * Check if a lane is controlled by a player AND has no enemy drones
   * Used by the "Overrun" card
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} lane - Lane ID (e.g., 'lane1')
   * @param {Object} player1State - Player 1 game state
   * @param {Object} player2State - Player 2 game state
   * @param {Object} laneControl - Lane control state from calculateLaneControl()
   * @returns {boolean} True if lane is controlled AND no enemy drones present
   */
  static checkLaneControlEmpty(playerId, lane, player1State, player2State, laneControl) {
    // First check: Does this player control the lane?
    const controlsLane = laneControl[lane] === playerId;

    if (!controlsLane) {
      return false;
    }

    // Second check: Are there zero enemy drones in this lane?
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';
    const opponentState = opponentId === 'player1' ? player1State : player2State;
    const enemyDroneCount = (opponentState.dronesOnBoard[lane] || []).filter(d => !d.isToken).length;

    return enemyDroneCount === 0;
  }
}

export default LaneControlCalculator;
