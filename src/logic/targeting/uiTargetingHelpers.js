// ========================================
// UI TARGETING HELPERS
// ========================================
// Targeting calculations for UI components.
// Pure calculation functions with no state changes - used by App.jsx for highlighting valid targets.
//
// WHAT THIS FILE CONTAINS:
// 1. calculateUpgradeTargets - Drone upgrade slot validation
// 2. calculateAllValidTargets - Central coordinator routing to appropriate calculation
//
// USAGE:
// - Import from this file in UI components (App.jsx, etc.)
// - For game logic targeting validation, use TargetingRouter directly

import fullDroneCollection from '../../data/droneData.js';
import TargetingRouter from '../TargetingRouter.js';

// Initialize TargetingRouter for ability/card targeting
const targetingRouter = new TargetingRouter();

/**
 * Calculate valid targets for upgrade card application
 *
 * Determines which drones in the active pool can receive a specific upgrade
 * based on upgrade slot availability and per-upgrade application limits.
 *
 * @param {Object} selectedCard - Upgrade card being applied
 * @param {Object} playerState - Player's state containing activeDronePool
 * @returns {Array} List of valid drone targets
 */
export const calculateUpgradeTargets = (selectedCard, playerState) => {
    return playerState.activeDronePool.map(drone => {
        const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
        const applied = playerState.appliedUpgrades[drone.name] || [];

        // Calculate total slots used by summing each upgrade's slot cost
        const usedSlots = applied.reduce((sum, upg) => sum + (upg.slots || 1), 0);

        // Get the slot cost of the upgrade card being played
        const cardSlotCost = selectedCard.slots || 1;

        // Check how many times THIS specific upgrade has been applied
        const alreadyHasThisUpgrade = applied.filter(upg => upg.cardId === selectedCard.id).length;
        const maxApps = selectedCard.maxApplications === undefined ? 1 : selectedCard.maxApplications;

        // A drone is a valid target if:
        // 1. It has enough slots for this card's slot cost
        // 2. This upgrade hasn't hit its per-upgrade limit
        if (baseDrone && usedSlots + cardSlotCost <= baseDrone.upgradeSlots && alreadyHasThisUpgrade < maxApps) {
            return { ...drone, id: drone.name }; // Use name as ID for targeting
        }
        return null;
    }).filter(Boolean); // Remove nulls
};

/**
 * Calculate all valid targets for current player action
 *
 * Central UI targeting coordinator that routes to appropriate target calculation
 * based on current action mode (ability, ship ability, or card play).
 *
 * @param {Object} abilityMode - Drone ability being used (if any)
 * @param {Object} shipAbilityMode - Ship ability being used (if any)
 * @param {Object} selectedCard - Card being played (if any)
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {string} localPlayerId - 'player1' or 'player2'
 * @returns {Object} { validAbilityTargets, validCardTargets }
 */
export const calculateAllValidTargets = (abilityMode, shipAbilityMode, selectedCard, player1, player2, localPlayerId, getEffectiveStatsFn = null) => {
    let validAbilityTargets = [];
    let validCardTargets = [];

    if (abilityMode) {
        validAbilityTargets = targetingRouter.routeTargeting({
            actingPlayerId: localPlayerId,
            source: abilityMode.drone,
            definition: abilityMode.ability,
            player1,
            player2,
            getEffectiveStats: getEffectiveStatsFn
        });
    } else if (shipAbilityMode) {
        validAbilityTargets = targetingRouter.routeTargeting({
            actingPlayerId: localPlayerId,
            source: { id: shipAbilityMode.sectionName },
            definition: shipAbilityMode.ability,
            player1,
            player2,
            getEffectiveStats: getEffectiveStatsFn
        });
    } else if (selectedCard) {
        if (selectedCard.type === 'Upgrade') {
            const localPlayer = localPlayerId === 'player1' ? player1 : player2;
            validCardTargets = calculateUpgradeTargets(selectedCard, localPlayer);
        } else {
            validCardTargets = targetingRouter.routeTargeting({
                actingPlayerId: localPlayerId,
                source: null,
                definition: selectedCard,
                player1,
                player2,
                getEffectiveStats: getEffectiveStatsFn
            });
        }
    }

    return { validAbilityTargets, validCardTargets };
};

/**
 * Calculate drone IDs affected by a LANE-targeting card
 *
 * For LANE-targeting cards, determines which specific drones will be affected:
 * - FILTERED scope: Only drones matching the effect filter (e.g., speed >= 5)
 * - LANE scope (or no scope): All drones in the targeted lane(s)
 *
 * Used for visual feedback - showing which drones will be hit when targeting a lane.
 *
 * @param {Object} card - Card definition with targeting and effect
 * @param {Array} validLaneTargets - Lane targets from routeTargeting
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {string} localPlayerId - Acting player ID
 * @param {Function} getEffectiveStatsFn - Function to calculate effective stats
 * @param {Object} placedSections - Placed sections for both players
 * @returns {Array} Array of drone IDs that will be affected
 */
export const calculateAffectedDroneIds = (
    card,
    validLaneTargets,
    player1,
    player2,
    localPlayerId,
    getEffectiveStatsFn,
    placedSections
) => {
    // NONE-type cards with affectedFilter — global scope (all lanes, filtered by affinity)
    const targeting = card?.effects?.[0]?.targeting;
    if (targeting?.type === 'NONE' && targeting.affectedFilter) {
        const affinity = targeting.affinity;
        const opponentId = localPlayerId === 'player1' ? 'player2' : 'player1';
        const targetPlayerId = affinity === 'ENEMY' ? opponentId : localPlayerId;
        const targetState = targetPlayerId === 'player1' ? player1 : player2;
        const affectedIds = [];

        for (const laneId of ['lane1', 'lane2', 'lane3']) {
            const drones = targetState.dronesOnBoard[laneId] || [];
            for (const drone of drones) {
                const passes = targeting.affectedFilter.every(filter => {
                    if (typeof filter === 'string') {
                        if (filter === 'MARKED') return drone.isMarked === true;
                        if (filter === 'EXHAUSTED') return drone.isExhausted === true;
                        return false;
                    }
                    return false;
                });
                if (passes) affectedIds.push(drone.id);
            }
        }
        return affectedIds;
    }

    // Only process LANE-targeting cards
    if (!card || targeting?.type !== 'LANE') {
        return [];
    }

    // Movement effects target lanes as DESTINATIONS - drones in destination are not affected
    // This is a defensive check to future-proof against LANE-targeting movement cards
    const effectType = card.effects[0]?.type;
    if (effectType === 'SINGLE_MOVE' || effectType === 'MULTI_MOVE' || effectType === 'CREATE_TOKENS') {
        return [];
    }

    const affectedIds = [];
    const affectedFilter = targeting?.affectedFilter;
    const maxTargets = targeting?.maxTargets;

    validLaneTargets.forEach(laneTarget => {
        const targetPlayerState = laneTarget.owner === 'player1' ? player1 : player2;
        const opponentState = laneTarget.owner === 'player1' ? player2 : player1;
        const dronesInLane = targetPlayerState.dronesOnBoard[laneTarget.id] || [];

        if (affectedFilter && affectedFilter.length > 0) {
            // Filtered targeting: only drones matching affectedFilter criteria
            const filter = affectedFilter[0];
            const { stat, comparison, value } = filter;
            let matchingDrones = [];

            dronesInLane.forEach(drone => {
                const effectiveStats = getEffectiveStatsFn(drone, laneTarget.id, {
                    playerState: targetPlayerState,
                    opponentState: opponentState,
                    placedSections
                });

                const effectiveStatValue = effectiveStats[stat] ?? drone[stat];
                let meetsCondition = false;

                switch (comparison) {
                    case 'GTE': meetsCondition = effectiveStatValue >= value; break;
                    case 'LTE': meetsCondition = effectiveStatValue <= value; break;
                    case 'EQ':  meetsCondition = effectiveStatValue === value; break;
                    case 'GT':  meetsCondition = effectiveStatValue > value; break;
                    case 'LT':  meetsCondition = effectiveStatValue < value; break;
                }

                if (meetsCondition) {
                    matchingDrones.push(drone);
                }
            });

            // Apply maxTargets if specified (e.g., Strafe Run)
            if (maxTargets && matchingDrones.length > maxTargets) {
                matchingDrones = matchingDrones.slice(0, maxTargets);
            }

            matchingDrones.forEach(d => affectedIds.push(d.id));

        } else {
            // No filter: all drones in lane are affected
            dronesInLane.forEach(drone => affectedIds.push(drone.id));
        }
    });

    return affectedIds;
};

