// ========================================
// INTERCEPTION PROCESSOR
// ========================================
// Handles interception calculations for combat system
// - calculatePotentialInterceptors: Determines which drones can intercept
// - calculateAiInterception: AI-specific interception decision logic

import { calculateEffectiveStats } from '../statsCalculator.js';
import { getLaneOfDrone } from '../gameLogic.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Calculate which opponent drones can intercept an attack
 *
 * Interception rules:
 * - Interceptor must be in the same lane as attacker
 * - Interceptor must not be exhausted
 * - Interceptor must have higher speed OR ALWAYS_INTERCEPTS keyword
 *
 * @param {Object} selectedDrone - The attacking drone
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {Object} placedSections - Placed ship sections
 * @returns {Array<string>} Array of interceptor drone IDs
 */
export const calculatePotentialInterceptors = (selectedDrone, player1, player2, placedSections) => {
    debugLog('INTERCEPTOR_GLOW', `calculatePotentialInterceptors called`);

    if (!selectedDrone || selectedDrone.isExhausted) {
        debugLog('INTERCEPTOR_GLOW', `Early return: selectedDrone=${selectedDrone?.id || 'null'}, isExhausted=${selectedDrone?.isExhausted}`);
        return [];
    }

    const attackerLane = getLaneOfDrone(selectedDrone.id, player1);
    debugLog('INTERCEPTOR_GLOW', `Attacker lane: ${attackerLane}, player1.name=${player1?.name}`);

    if (!attackerLane) {
        debugLog('INTERCEPTOR_GLOW', `Early return: attackerLane is null/undefined`);
        return [];
    }

    const effectiveAttacker = calculateEffectiveStats(
        selectedDrone,
        attackerLane,
        player1,
        player2,
        placedSections
    );
    debugLog('INTERCEPTOR_GLOW', `Attacker effective speed: ${effectiveAttacker.speed}`);

    const opponentsInLane = player2.dronesOnBoard[attackerLane] || [];
    debugLog('INTERCEPTOR_GLOW', `Opponents in ${attackerLane}: ${opponentsInLane.length}`, opponentsInLane.map(d => ({ id: d.id, name: d.name, isExhausted: d.isExhausted })));

    const potentialInterceptors = opponentsInLane.filter(opponentDrone => {
        const effectiveInterceptor = calculateEffectiveStats(
            opponentDrone,
            attackerLane,
            player2,
            player1,
            placedSections
        );
        const canIntercept = !opponentDrone.isExhausted &&
               (effectiveInterceptor.speed > effectiveAttacker.speed ||
                effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS'));
        debugLog('INTERCEPTOR_GLOW', `  ${opponentDrone.name} (${opponentDrone.id}): speed=${effectiveInterceptor.speed}, exhausted=${opponentDrone.isExhausted}, canIntercept=${canIntercept}`);
        return canIntercept;
    }).map(d => d.id);

    debugLog('INTERCEPTOR_GLOW', `Final interceptors: ${JSON.stringify(potentialInterceptors)}`);
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
                   (effectiveInterceptor.speed > effectiveAttacker.speed ||
                    effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS')) &&
                   (targetType !== 'drone' || d.id !== target.id);
        });

    return {
        hasInterceptors: potentialInterceptors.length > 0,
        interceptors: potentialInterceptors,
        attackDetails: pendingAttack
    };
};
