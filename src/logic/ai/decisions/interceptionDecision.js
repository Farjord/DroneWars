// ========================================
// INTERCEPTION DECISION
// ========================================
// Handles AI interception decisions during combat
// Currently delegates to makeInterceptionDecision in aiLogic.js
//
// Future integration:
// - Use calculateDroneImpact from ./scoring/droneImpact.js
// - Use hasDefenderKeyword from ./helpers/keywordHelpers.js
// - Use constants from ./aiConstants.js

// Re-export from original location for now
export { makeInterceptionDecision } from '../../aiLogic.js';

/**
 * Interception decision factors:
 * 1. Survivability - Does interceptor survive the attack?
 * 2. Impact trade - Compare attacker vs interceptor value
 * 3. Protection value - What's being protected (ship hull/shields/drone)?
 * 4. Opportunity cost - Are there bigger threats to save for?
 * 5. DEFENDER keyword - No exhaustion penalty, prioritized
 *
 * Context needed:
 * - attackDetails: { attacker, target, targetType, lane }
 * - potentialInterceptors: Array of drones that can intercept
 * - gameDataService: For effective stat calculations
 * - gameStateManager: For accessing player states
 *
 * Returns:
 * - { shouldIntercept: true, interceptor: drone, score: number }
 * - { shouldIntercept: false }
 */
