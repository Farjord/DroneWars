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
import { debugLog } from './debugLogger.js';

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
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {string} actingPlayerId - 'player1' or 'player2'
 * @returns {Array} List of valid target objects
 */
export const calculateMultiSelectTargets = (multiSelectState, player1, player2, actingPlayerId, getEffectiveStatsFn = null) => {
    const { phase, sourceLane, card } = multiSelectState;

    // Determine which player state to target based on card affinity
    const targetAffinity = card.targeting?.affinity || 'FRIENDLY';
    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    let targetPlayerId;
    let targetPlayerState;

    if (targetAffinity === 'ENEMY') {
        targetPlayerId = opponentPlayerId;
        targetPlayerState = opponentPlayerId === 'player1' ? player1 : player2;
    } else {
        // Default to friendly (acting player)
        targetPlayerId = actingPlayerId;
        targetPlayerState = actingPlayerId === 'player1' ? player1 : player2;
    }

    // For phases that need acting player state (non-targeting phases)
    const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;

    let targets = [];

    if (card.effect.type === 'SINGLE_MOVE') {
        if (phase === 'select_drone') {
            // Target drones based on card affinity (ENEMY or FRIENDLY)
            const opponentState = targetPlayerId === 'player1' ? player2 : player1;
            Object.entries(targetPlayerState.dronesOnBoard).forEach(([lane, drones]) => {
                drones.forEach(drone => {
                    if (drone.isExhausted) return;
                    // Filter out INERT drones
                    if (getEffectiveStatsFn) {
                        const stats = getEffectiveStatsFn(drone, lane);
                        if (stats.keywords.has('INERT')) return;
                    }
                    targets.push({ ...drone, lane, owner: targetPlayerId });
                });
            });
        } else if (phase === 'select_destination') {
            // Target adjacent lanes
            const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);

            debugLog('TARGETING_PROCESSING', '🎯 PHASE: select_destination detected', {
                sourceLane,
                sourceLaneIndex,
                willCalculateAdjacent: true
            });

            ['lane1', 'lane2', 'lane3'].forEach(laneId => {
                const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
                const isAdjacent = Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
                if (isAdjacent) {
                    targets.push({ id: laneId, owner: actingPlayerId });

                    debugLog('TARGETING_PROCESSING', `✅ Adding adjacent lane: ${laneId}`, {
                        sourceLaneIndex,
                        targetLaneIndex,
                        distance: Math.abs(sourceLaneIndex - targetLaneIndex)
                    });
                }
            });
        }
    } else if (phase === 'select_source_lane') {
        // Target friendly lanes that have at least one drone
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            if (actingPlayerState.dronesOnBoard[laneId].length > 0) {
                targets.push({ id: laneId, owner: actingPlayerId });
            }
        });
    } else if (phase === 'select_drones') {
        // Target non-exhausted drones within the selected source lane
        actingPlayerState.dronesOnBoard[sourceLane]
            .filter(drone => {
                if (drone.isExhausted) return false;
                // Filter out INERT drones
                if (getEffectiveStatsFn) {
                    const stats = getEffectiveStatsFn(drone, sourceLane);
                    if (stats.keywords.has('INERT')) return false;
                }
                return true;
            })
            .forEach(drone => {
                targets.push({ ...drone, lane: sourceLane, owner: actingPlayerId });
            });
    } else if (phase === 'select_destination_lane') {
        // Target ADJACENT friendly lanes
        const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
            const isAdjacent = Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
            if (isAdjacent) {
                targets.push({ id: laneId, owner: actingPlayerId });
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
 * based on current action mode (ability, ship ability, card play, or multi-select).
 *
 * @param {Object} abilityMode - Drone ability being used (if any)
 * @param {Object} shipAbilityMode - Ship ability being used (if any)
 * @param {Object} multiSelectState - Multi-step selection state (if any)
 * @param {Object} selectedCard - Card being played (if any)
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {string} localPlayerId - 'player1' or 'player2'
 * @param {Object} singleMoveMode - Single-move card mode state (if any)
 * @returns {Object} { validAbilityTargets, validCardTargets }
 */
export const calculateAllValidTargets = (abilityMode, shipAbilityMode, multiSelectState, selectedCard, player1, player2, localPlayerId, singleMoveMode = null, getEffectiveStatsFn = null) => {
    let validAbilityTargets = [];
    let validCardTargets = [];

    // Handle singleMoveMode - highlight adjacent lanes for drone movement
    if (singleMoveMode) {
        const sourceLaneIndex = parseInt(singleMoveMode.sourceLane.replace('lane', ''), 10);
        const adjacentLanes = [];

        // Check all lanes and find adjacent ones (distance = 1)
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
            if (Math.abs(sourceLaneIndex - targetLaneIndex) === 1) {
                adjacentLanes.push({ id: laneId, owner: singleMoveMode.owner, type: 'lane' });
            }
        });

        // CHECKPOINT 4: Target Calculation for Adjacent Lanes
        debugLog('SINGLE_MOVE_FLOW', '🎲 CHECKPOINT 4: Calculated valid target lanes', {
            singleMoveMode: singleMoveMode,
            sourceLane: singleMoveMode.sourceLane,
            adjacentLanes: adjacentLanes,
            droneId: singleMoveMode.droneId,
            owner: singleMoveMode.owner
        });

        return { validAbilityTargets: [], validCardTargets: adjacentLanes };
    }

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
    } else if (multiSelectState) {
        // Determine which player state to use based on who is acting
        const actingPlayerId = multiSelectState.actingPlayerId || localPlayerId;
        validCardTargets = calculateMultiSelectTargets(multiSelectState, player1, player2, actingPlayerId, getEffectiveStatsFn);
    } else if (selectedCard) {
        if (selectedCard.type === 'Upgrade') {
            validCardTargets = calculateUpgradeTargets(selectedCard, player1);
        } else if (selectedCard.effect.type === 'MULTI_MOVE') {
            // MULTI_MOVE cards use multiSelectState for targeting via calculateMultiSelectTargets
            if (multiSelectState) {
                const actingPlayerId = multiSelectState.actingPlayerId || localPlayerId;
                validCardTargets = calculateMultiSelectTargets(multiSelectState, player1, player2, actingPlayerId, getEffectiveStatsFn);
            } else {
                validCardTargets = [];
            }
        } else if (selectedCard.effect.type === 'SINGLE_MOVE') {
            // Prioritize multiSelectState when it exists (for multi-step targeting phases)
            if (multiSelectState) {
                // Use multiSelectState for all SINGLE_MOVE cards when in multi-select flow
                // This handles 'select_destination' phase where we need lane targets, not drone targets
                debugLog('TARGETING_PROCESSING', '✅ Taking multiSelectState branch (SINGLE_MOVE)', {
                    phase: multiSelectState.phase,
                    actingPlayerId: multiSelectState.actingPlayerId,
                    sourceLane: multiSelectState.sourceLane,
                    timestamp: performance.now()
                });

                const actingPlayerId = multiSelectState.actingPlayerId || localPlayerId;
                validCardTargets = calculateMultiSelectTargets(multiSelectState, player1, player2, actingPlayerId, getEffectiveStatsFn);

                debugLog('TARGETING_PROCESSING', '📋 calculateMultiSelectTargets result', {
                    phase: multiSelectState.phase,
                    targetCount: validCardTargets.length,
                    targets: validCardTargets.map(t => ({ id: t.id, owner: t.owner })),
                    timestamp: performance.now()
                });
            } else if (selectedCard.targeting) {
                // Use TargetingRouter for initial targeting (before multiSelectState is set)
                validCardTargets = targetingRouter.routeTargeting({
                    actingPlayerId: localPlayerId,
                    source: null,
                    definition: selectedCard,
                    player1,
                    player2,
                    getEffectiveStats: getEffectiveStatsFn
                });
            } else {
                validCardTargets = [];
            }
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
    // Only process LANE-targeting cards
    if (!card || card.targeting?.type !== 'LANE') {
        return [];
    }

    // Movement effects target lanes as DESTINATIONS - drones in destination are not affected
    // This is a defensive check to future-proof against LANE-targeting movement cards
    const effectType = card.effect?.type;
    if (effectType === 'SINGLE_MOVE' || effectType === 'MULTI_MOVE' || effectType === 'CREATE_TOKENS') {
        return [];
    }

    const affectedIds = [];
    const effect = card.effect;
    const isFiltered = effect?.scope === 'FILTERED' && effect?.filter;
    const isLaneScope = effect?.scope === 'LANE' || !effect?.scope;

    validLaneTargets.forEach(laneTarget => {
        const targetPlayerState = laneTarget.owner === 'player1' ? player1 : player2;
        const opponentState = laneTarget.owner === 'player1' ? player2 : player1;
        const dronesInLane = targetPlayerState.dronesOnBoard[laneTarget.id] || [];

        if (isFiltered) {
            // FILTERED scope: only drones matching the filter
            const { stat, comparison, value } = effect.filter;
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
            if (effect.maxTargets && matchingDrones.length > effect.maxTargets) {
                matchingDrones = matchingDrones.slice(0, effect.maxTargets);
            }

            matchingDrones.forEach(d => affectedIds.push(d.id));

        } else if (isLaneScope) {
            // LANE scope or no scope: all drones in lane
            dronesInLane.forEach(drone => affectedIds.push(drone.id));
        }
    });

    return affectedIds;
};

/**
 * Calculate valid cost targets for additional cost cards
 *
 * This is called at card drag start to determine which targets are valid
 * for the COST selection (before any cost selection has been made).
 * For example: which drones can be exhausted, which cards can be discarded.
 *
 * @param {Object} additionalCost - The additionalCost object from card definition
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {string} actingPlayerId - Player playing the card
 * @param {string} playingCardId - ID of the card being played (to exclude from hand selection)
 * @returns {Array} Valid cost targets
 */
export function calculateCostTargets(additionalCost, player1, player2, actingPlayerId, playingCardId, getEffectiveStatsFn = null) {
  debugLog('ADDITIONAL_COST_TARGETING', '🎯 calculateCostTargets called', {
    costType: additionalCost.type,
    costTargeting: additionalCost.targeting,
    actingPlayerId
  });

  // Special case: CARD_IN_HAND costs (discard card)
  if (additionalCost.targeting?.type === 'CARD_IN_HAND') {
    const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;

    // Return all cards in hand except the one being played
    const validCards = actingPlayerState.hand
      .filter(c => c.id !== playingCardId)
      .map(c => ({
        ...c,
        owner: actingPlayerId,
        type: 'card'
      }));

    debugLog('ADDITIONAL_COST_TARGETING', '✅ CARD_IN_HAND cost targets calculated', {
      handSize: actingPlayerState.hand.length,
      validTargetCount: validCards.length,
      excludedCardId: playingCardId
    });

    return validCards;
  }

  // General case: Use targeting router with cost targeting definition
  // This handles DRONE costs (exhaust drone, move drone, etc.)
  const context = {
    actingPlayerId,
    player1,
    player2,
    definition: {
      targeting: additionalCost.targeting,
      effect: { type: additionalCost.type },
      name: `Additional Cost (${additionalCost.type})`
    },
    isCostTargeting: true,
    playingCardId,
    getEffectiveStats: getEffectiveStatsFn
  };

  debugLog('ADDITIONAL_COST_TARGETING', '📦 Context prepared for cost targeting router', {
    targetingType: additionalCost.targeting?.type,
    targetingAffinity: additionalCost.targeting?.affinity,
    targetingLocation: additionalCost.targeting?.location
  });

  const validTargets = targetingRouter.routeTargeting(context);

  debugLog('ADDITIONAL_COST_TARGETING', '✅ Cost targeting router returned results', {
    costType: additionalCost.type,
    validTargetCount: validTargets.length,
    validTargets: validTargets.map(t => ({
      id: t.id,
      name: t.name,
      owner: t.owner,
      lane: t.lane
    }))
  });

  return validTargets;
}

/**
 * Calculate valid effect targets with cost context
 *
 * This is used for cards with additional costs where the effect targeting
 * depends on the cost selection (e.g., "enemy drone in same lane as cost")
 *
 * @param {Object} card - Card with additionalCost and targeting
 * @param {Object} costSelection - Selected cost target(s)
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @param {string} actingPlayerId - Player playing the card
 * @returns {Array} Valid effect targets
 */
export function calculateEffectTargetsWithCostContext(card, costSelection, player1, player2, actingPlayerId, getEffectiveStatsFn = null) {
  debugLog('ADDITIONAL_COST_TARGETING', '🔧 calculateEffectTargetsWithCostContext called', {
    cardName: card.name,
    cardTargeting: card.targeting,
    costSelection,
    actingPlayerId
  });

  const context = {
    actingPlayerId,
    player1,
    player2,
    definition: card,
    costSelection,  // Pass cost context
    playingCardId: card.id,
    getEffectiveStats: getEffectiveStatsFn
  };

  debugLog('ADDITIONAL_COST_TARGETING', '📦 Context prepared for targeting router', {
    hasPlayer1: !!context.player1,
    hasPlayer2: !!context.player2,
    hasCostSelection: !!context.costSelection,
    costSelectionLane: context.costSelection?.lane,
    costSelectionTarget: context.costSelection?.target?.id,
    targetingType: card.targeting?.type,
    targetingLocation: card.targeting?.location,
    targetingAffinity: card.targeting?.affinity,
    customCriteria: card.targeting?.custom
  });

  const validTargets = targetingRouter.routeTargeting(context);

  debugLog('ADDITIONAL_COST_TARGETING', '✅ Targeting router returned results', {
    cardName: card.name,
    costSelection,
    validTargetCount: validTargets.length,
    validTargets: validTargets.map(t => ({
      id: t.id,
      name: t.name,
      owner: t.owner,
      lane: t.lane
    }))
  });

  return validTargets;
}
