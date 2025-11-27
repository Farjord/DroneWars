// ========================================
// DEPLOYMENT DECISION
// ========================================
// Handles AI drone deployment during deployment phase
// Currently delegates to handleOpponentTurn in aiLogic.js
//
// Future integration:
// - Use calculateLaneScore from ./scoring/laneScoring.js
// - Use constants from ./aiConstants.js
// - Move logic here from aiLogic.js

// Re-export from original location for now
export { handleOpponentTurn } from '../../aiLogic.js';

/**
 * Deployment decision context needed:
 * - player1: Opponent state
 * - player2: AI state
 * - turn: Current turn number
 * - placedSections: Human's section placement [lane0, lane1, lane2]
 * - opponentPlacedSections: AI's section placement
 * - getShipStatus: Function to get section health status
 * - gameStateManager: For accessing game state
 * - addLogEntry: For logging decisions
 *
 * Returns:
 * - { type: 'pass' } if no good deployments
 * - { type: 'deploy', payload: { droneToDeploy, targetLane, logContext } }
 */
