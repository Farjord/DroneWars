// ========================================
// INTERCEPTION PROCESSOR
// ========================================
// Handles interception calculations for combat system
// - calculatePotentialInterceptors: Determines which drones can intercept
// - calculateAiInterception: AI-specific interception decision logic

import { calculateEffectiveStats } from '../statsCalculator.js';
import { getLaneOfDrone } from '../gameLogic.js';

/**
 * Calculate which opponent drones can intercept an attack
 *
 * Interception rules:
 * - Interceptor must be in the same lane as attacker
 * - Interceptor must not be exhausted
 * - Interceptor must have equal or higher speed OR ALWAYS_INTERCEPTS keyword
 *
 * @param {Object} selectedDrone - The attacking drone
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {Object} placedSections - Placed ship sections
 * @returns {Array<string>} Array of interceptor drone IDs
 */
export const calculatePotentialInterceptors = (selectedDrone, player1, player2, placedSections) => {
    if (!selectedDrone || selectedDrone.isExhausted) {
        return [];
    }

    const attackerLane = getLaneOfDrone(selectedDrone.id, player1);
    if (!attackerLane) {
        return [];
    }

    const effectiveAttacker = calculateEffectiveStats(
        selectedDrone,
        attackerLane,
        player1,
        player2,
        placedSections
    );

    const opponentsInLane = player2.dronesOnBoard[attackerLane] || [];

    const potentialInterceptors = opponentsInLane.filter(opponentDrone => {
        const effectiveInterceptor = calculateEffectiveStats(
            opponentDrone,
            attackerLane,
            player2,
            player1,
            placedSections
        );
        return !opponentDrone.isExhausted &&
               !opponentDrone.cannotIntercept &&
               !effectiveInterceptor.keywords.has('PASSIVE') &&  // PASSIVE drones cannot intercept
               (effectiveInterceptor.speed >= effectiveAttacker.speed ||
                effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS'));
    }).map(d => d.id);

    return potentialInterceptors;
};

/**
 * Calculate AI interception for an incoming attack
 *
 * Used by AI to determine if it has valid interceptors for an attack
 * Returns interceptor drones and attack details
 *
 * @param {Object} pendingAttack - The incoming attack details
 * @param {Object} playerStates - Current player states
 * @param {Object} placedSections - Placed ship sections
 * @returns {Object} { hasInterceptors, interceptors, attackDetails }
 */
export const calculateAiInterception = (pendingAttack, playerStates, placedSections) => {
    const { attacker, target, targetType, lane, attackingPlayer } = pendingAttack;

    // Determine defending player (opposite of attacker)
    const defendingPlayerId = attackingPlayer === 'player1' ? 'player2' : 'player1';
    const defendingPlayerState = playerStates[defendingPlayerId];
    const attackingPlayerState = playerStates[attackingPlayer];

    const effectiveAttacker = calculateEffectiveStats(
        attacker, lane, attackingPlayerState, defendingPlayerState, placedSections
    );

    const potentialInterceptors = defendingPlayerState.dronesOnBoard[lane]
        .filter(d => {
            const effectiveInterceptor = calculateEffectiveStats(
                d, lane, defendingPlayerState, attackingPlayerState, placedSections
            );
            return !d.isExhausted &&
                   !d.cannotIntercept &&
                   !effectiveInterceptor.keywords.has('PASSIVE') &&  // PASSIVE drones cannot intercept
                   (effectiveInterceptor.speed >= effectiveAttacker.speed ||
                    effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS')) &&
                   (targetType !== 'drone' || d.id !== target.id);
        });

    return {
        hasInterceptors: potentialInterceptors.length > 0,
        interceptors: potentialInterceptors,
        attackDetails: pendingAttack
    };
};
