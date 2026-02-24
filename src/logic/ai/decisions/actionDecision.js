// ========================================
// ACTION DECISION
// ========================================
// Handles AI action selection during action phase
// Currently delegates to handleOpponentAction in aiLogic.js
//
// Future integration:
// - Use card evaluators from ./cardEvaluators/
// - Use attack evaluators from ./attackEvaluators/
// - Use move evaluator from ./moveEvaluator.js
// - Use adjustment passes from ./adjustmentPasses/
// - Use constants from ./aiConstants.js

// Re-export from original location for now
export { handleOpponentAction } from '../aiLogic.js';

/**
 * Action decision flow:
 * 1. Generate all possible actions (card plays, attacks, moves)
 * 2. Score each action using appropriate evaluators
 * 3. Apply Jammer adjustment pass
 * 4. Apply Interception adjustment pass
 * 5. Select from top-scoring actions
 *
 * Context needed:
 * - player1: Opponent state
 * - player2: AI state
 * - placedSections: Human's section placement
 * - opponentPlacedSections: AI's section placement
 * - getShipStatus: Function to get section health status
 * - getLaneOfDrone: Function to find drone's lane
 * - gameStateManager: For accessing game state
 * - getValidTargets: Function to get valid targets for cards
 * - addLogEntry: For logging decisions
 *
 * Returns:
 * - { type: 'pass' } if no positive actions
 * - { type: 'action', payload: chosenAction, logContext: possibleActions }
 */
