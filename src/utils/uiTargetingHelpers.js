// ========================================
// UI TARGETING HELPERS
// ========================================
// Multi-step targeting calculations for UI components.
// Pure calculation functions with no state changes - used by App.jsx for highlighting valid targets.
//
// WHAT THIS FILE CONTAINS:
// 1. calculateMultiSelectTargets - Phased selection for SINGLE_MOVE and MULTI_MOVE cards
// 2. calculateUpgradeTargets - Drone upgrade slot validation
// 3. calculateAllValidTargets - Central coordinator routing to appropriate calculation
//
// USAGE:
// - Import from this file in UI components (App.jsx, etc.)
// - For game logic targeting validation, use TargetingRouter directly

import fullDroneCollection from '../data/droneData.js';
import TargetingRouter from '../logic/TargetingRouter.js';

// Initialize TargetingRouter for ability/card targeting
const targetingRouter = new TargetingRouter();

/**
 * Calculate valid targets for multi-select card effects
 *
 * Handles phased selection for SINGLE_MOVE and MULTI_MOVE cards:
 * - SINGLE_MOVE: select_drone → select_destination
 * - MULTI_MOVE: select_source_lane → select_drones → select_destination_lane
 *
 * @param {Object} multiSelectState - Current selection state { phase, sourceLane, card }
 * @param {Object} playerState - Acting player's state
 * @param {string} localPlayerId - 'player1' or 'player2'
 * @returns {Array} List of valid target objects
 */
export const calculateMultiSelectTargets = (multiSelectState, playerState, localPlayerId) => {
    const { phase, sourceLane, card } = multiSelectState;
    let targets = [];

    if (card.effect.type === 'SINGLE_MOVE') {
        if (phase === 'select_drone') {
            // Target all friendly, non-exhausted drones
            Object.values(playerState.dronesOnBoard).flat().forEach(drone => {
                if (!drone.isExhausted) {
                    targets.push({ ...drone, owner: localPlayerId });
                }
            });
        } else if (phase === 'select_destination') {
            // Target adjacent lanes
            const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);
            ['lane1', 'lane2', 'lane3'].forEach(laneId => {
                const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
                const isAdjacent = Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
                if (isAdjacent) {
                    targets.push({ id: laneId, owner: localPlayerId });
                }
            });
        }
    } else if (phase === 'select_source_lane') {
        // Target friendly lanes that have at least one drone
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            if (playerState.dronesOnBoard[laneId].length > 0) {
                targets.push({ id: laneId, owner: localPlayerId });
            }
        });
    } else if (phase === 'select_drones') {
        // Target non-exhausted drones within the selected source lane
        playerState.dronesOnBoard[sourceLane]
            .filter(drone => !drone.isExhausted)
            .forEach(drone => {
                targets.push({ ...drone, owner: localPlayerId });
            });
    } else if (phase === 'select_destination_lane') {
        // Target ADJACENT friendly lanes
        const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
            const isAdjacent = Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
            if (isAdjacent) {
                targets.push({ id: laneId, owner: localPlayerId });
            }
        });
    }

    return targets;
};

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
        const alreadyHasThisUpgrade = applied.filter(upg => upg.id === selectedCard.id).length;
        const maxApps = selectedCard.maxApplications === undefined ? 1 : selectedCard.maxApplications;

        // A drone is a valid target if its slots aren't full AND it hasn't hit the limit for this specific upgrade
        if (baseDrone && applied.length < baseDrone.upgradeSlots && alreadyHasThisUpgrade < maxApps) {
            return { ...drone, id: drone.name }; // Use name as ID for targeting
        }
        return null;
    }).filter(Boolean); // Remove nulls
};

/**
 * Calculate all valid targets for current player action
 *
 * Central UI targeting coordinator that routes to appropriate target calculation
 * based on current action mode (ability, ship ability, card play, or multi-select).
 *
 * @param {Object} abilityMode - Drone ability being used (if any)
 * @param {Object} shipAbilityMode - Ship ability being used (if any)
 * @param {Object} multiSelectState - Multi-step selection state (if any)
 * @param {Object} selectedCard - Card being played (if any)
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {string} localPlayerId - 'player1' or 'player2'
 * @returns {Object} { validAbilityTargets, validCardTargets }
 */
export const calculateAllValidTargets = (abilityMode, shipAbilityMode, multiSelectState, selectedCard, player1, player2, localPlayerId) => {
    let validAbilityTargets = [];
    let validCardTargets = [];

    if (abilityMode) {
        validAbilityTargets = targetingRouter.routeTargeting({
            actingPlayerId: localPlayerId,
            source: abilityMode.drone,
            definition: abilityMode.ability,
            player1,
            player2
        });
    } else if (shipAbilityMode) {
        validAbilityTargets = targetingRouter.routeTargeting({
            actingPlayerId: localPlayerId,
            source: { id: shipAbilityMode.sectionName },
            definition: shipAbilityMode.ability,
            player1,
            player2
        });
    } else if (multiSelectState) {
        // Determine which player state to use based on who is acting
        const actingPlayerId = multiSelectState.actingPlayerId || localPlayerId;
        const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
        validCardTargets = calculateMultiSelectTargets(multiSelectState, actingPlayerState, actingPlayerId);
    } else if (selectedCard) {
        if (selectedCard.type === 'Upgrade') {
            validCardTargets = calculateUpgradeTargets(selectedCard, player1);
        } else if (selectedCard.effect.type === 'MULTI_MOVE') {
            // MULTI_MOVE cards use multiSelectState for targeting via calculateMultiSelectTargets
            if (multiSelectState) {
                const actingPlayerId = multiSelectState.actingPlayerId || localPlayerId;
                const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
                validCardTargets = calculateMultiSelectTargets(multiSelectState, actingPlayerState, actingPlayerId);
            } else {
                validCardTargets = [];
            }
        } else if (selectedCard.effect.type === 'SINGLE_MOVE') {
            // SINGLE_MOVE cards use multiSelectState for targeting
            // If multiSelectState not set yet, return empty (will be set by needsCardSelection flow)
            if (multiSelectState) {
                const actingPlayerId = multiSelectState.actingPlayerId || localPlayerId;
                const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
                validCardTargets = calculateMultiSelectTargets(multiSelectState, actingPlayerState, actingPlayerId);
            } else {
                validCardTargets = [];
            }
        } else {
            validCardTargets = targetingRouter.routeTargeting({
                actingPlayerId: localPlayerId,
                source: null,
                definition: selectedCard,
                player1,
                player2
            });
        }
    }

    return { validAbilityTargets, validCardTargets };
};
