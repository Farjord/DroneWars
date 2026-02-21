// ========================================
// ABILITY HELPERS
// ========================================
// Utility functions for ability triggering and effects
// Extracted from gameLogic.js Phase 7A

import fullDroneCollection from '../../data/droneData.js';
import { debugLog } from '../../utils/debugLogger.js';
import { buildHealAnimation } from '../effects/healing/animations/HealAnimation.js';

/**
 * Apply ON_MOVE triggered abilities to a moved drone
 * Checks for PERMANENT_STAT_MOD and HEAL_HULL effects and applies them
 * @param {Object} playerState - Player state object
 * @param {Object} movedDrone - The drone that was moved
 * @param {string} fromLane - Source lane ID (e.g., 'lane1')
 * @param {string} toLane - Destination lane ID (e.g., 'lane2')
 * @param {Function} addLogEntryCallback - Callback for game log entries
 * @returns {Object} { newState, animationEvents } - Updated player state or original if unchanged, plus animation events
 */
export const applyOnMoveEffects = (playerState, movedDrone, fromLane, toLane, addLogEntryCallback) => {
    const baseDrone = fullDroneCollection.find(d => d.name === movedDrone.name);
    debugLog('ON_MOVE_EFFECTS', `Entry: drone="${movedDrone.name}", baseDrone found=${!!baseDrone}, hasAbilities=${!!baseDrone?.abilities}`, { fromLane, toLane, movedDroneId: movedDrone.id });
    if (!baseDrone?.abilities) {
        debugLog('ON_MOVE_EFFECTS', 'Early exit: no baseDrone or no abilities');
        return { newState: playerState, animationEvents: [] };
    }

    let newState = JSON.parse(JSON.stringify(playerState));
    let stateModified = false;
    const animationEvents = [];

    const onMoveAbilities = baseDrone.abilities.filter(ability =>
        ability.type === 'TRIGGERED' && ability.trigger === 'ON_MOVE'
    );
    debugLog('ON_MOVE_EFFECTS', `ON_MOVE abilities found: ${onMoveAbilities.length}`, onMoveAbilities.map(a => ({ name: a.name, effects: a.effects })));

    if (onMoveAbilities.length > 0) {
        const droneIndex = newState.dronesOnBoard[toLane].findIndex(d => d.id === movedDrone.id);
        debugLog('ON_MOVE_EFFECTS', `droneIndex in ${toLane}: ${droneIndex}`, { droneIds: newState.dronesOnBoard[toLane].map(d => d.id), searchId: movedDrone.id });
        if (droneIndex !== -1) {
            const droneInState = newState.dronesOnBoard[toLane][droneIndex];

            onMoveAbilities.forEach(ability => {
                addLogEntryCallback({
                    player: newState.name,
                    actionType: 'ABILITY',
                    source: movedDrone.name,
                    target: 'Self',
                    outcome: `Activated '${ability.name}' after moving from ${fromLane} to ${toLane}.`
                }, 'applyOnMoveEffects_trigger');

                if (!droneInState.statMods) {
                    droneInState.statMods = [];
                }

                ability.effects?.forEach(effect => {
                    debugLog('ON_MOVE_EFFECTS', `Processing effect: type="${effect.type}", scope="${effect.scope}"`, effect);
                    if (effect.type === 'PERMANENT_STAT_MOD') {
                        stateModified = true;
                        droneInState.statMods.push(effect.mod);
                        addLogEntryCallback({
                            player: newState.name,
                            actionType: 'ABILITY',
                            source: movedDrone.name,
                            target: 'Self',
                            outcome: `Gained a permanent +${effect.mod.value} ${effect.mod.stat}.`
                        }, 'applyOnMoveEffects_mod');
                    } else if (effect.type === 'HEAL_HULL' && effect.scope === 'SELF') {
                        const baseDrone = fullDroneCollection.find(d => d.name === movedDrone.name);
                        debugLog('ON_MOVE_EFFECTS', `HEAL_HULL branch: currentHull=${droneInState.hull}, maxHull=${baseDrone?.hull}, healValue=${effect.value}, needsHeal=${baseDrone && droneInState.hull < baseDrone.hull}`);
                        if (baseDrone && droneInState.hull < baseDrone.hull) {
                            stateModified = true;
                            const oldHull = droneInState.hull;
                            droneInState.hull = Math.min(baseDrone.hull, droneInState.hull + effect.value);
                            debugLog('ON_MOVE_EFFECTS', `HEAL_HULL applied: ${oldHull} → ${droneInState.hull}`);
                            addLogEntryCallback({
                                player: newState.name,
                                actionType: 'ABILITY',
                                source: movedDrone.name,
                                target: 'Self',
                                outcome: `Healed ${droneInState.hull - oldHull} hull (${oldHull} → ${droneInState.hull}).`
                            }, 'applyOnMoveEffects_heal');
                            animationEvents.push(...buildHealAnimation({
                                target: droneInState,
                                healAmount: droneInState.hull - oldHull,
                                targetPlayer: null,  // Caller fills this in
                                targetLane: toLane,
                                targetType: 'drone',
                                card: null
                            }));
                        }
                    }
                });
            });
        }
    }

    return {
        newState: stateModified ? newState : playerState,
        animationEvents
    };
};

/**
 * Apply ON_CARD_DRAWN triggered abilities to all drones when cards are drawn
 * Each drone with this trigger gains +1 attack per card drawn
 * @param {Object} playerState - Player state object
 * @param {number} cardsDrawn - Number of cards drawn
 * @param {Function} addLogEntryCallback - Callback for game log entries
 * @returns {Object} { newState } - Updated player state or original if unchanged
 */
export const applyOnCardDrawnEffects = (playerState, cardsDrawn, addLogEntryCallback) => {
    let newState = JSON.parse(JSON.stringify(playerState));
    let stateModified = false;

    const lanes = ['lane1', 'lane2', 'lane3'];

    lanes.forEach(lane => {
        const drones = newState.dronesOnBoard[lane];
        if (!drones) return;

        drones.forEach((drone, droneIndex) => {
            const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
            if (!baseDrone?.abilities) return;

            const matchingAbilities = baseDrone.abilities.filter(ability =>
                ability.type === 'TRIGGERED' && ability.trigger === 'ON_CARD_DRAWN'
            );

            matchingAbilities.forEach(ability => {
                ability.effects?.forEach(effect => {
                    if (effect.type === 'PERMANENT_STAT_MOD') {
                        if (!drone.statMods) {
                            drone.statMods = [];
                        }

                        for (let i = 0; i < cardsDrawn; i++) {
                            drone.statMods.push({ ...effect.mod });
                        }

                        stateModified = true;

                        if (addLogEntryCallback) {
                            addLogEntryCallback({
                                player: newState.name,
                                actionType: 'ABILITY',
                                source: drone.name,
                                target: 'Self',
                                outcome: `Activated '${ability.name}' — gained +${cardsDrawn} ${effect.mod.stat} from ${cardsDrawn} card(s) drawn.`
                            }, 'applyOnCardDrawnEffects_trigger');
                        }
                    }
                });
            });
        });
    });

    return {
        newState: stateModified ? newState : playerState
    };
};

/**
 * Apply ON_ENERGY_GAINED triggered abilities to all drones when energy is gained
 * Each drone with this trigger gains +1 attack per scalingDivisor energy gained (rounded down)
 * @param {Object} playerState - Player state object
 * @param {number} energyGained - Amount of energy gained
 * @param {Function} addLogEntryCallback - Callback for game log entries
 * @returns {Object} { newState } - Updated player state or original if unchanged
 */
export const applyOnEnergyGainedEffects = (playerState, energyGained, addLogEntryCallback) => {
    let newState = JSON.parse(JSON.stringify(playerState));
    let stateModified = false;

    const lanes = ['lane1', 'lane2', 'lane3'];

    lanes.forEach(lane => {
        const drones = newState.dronesOnBoard[lane];
        if (!drones) return;

        drones.forEach((drone, droneIndex) => {
            const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
            if (!baseDrone?.abilities) return;

            const matchingAbilities = baseDrone.abilities.filter(ability =>
                ability.type === 'TRIGGERED' && ability.trigger === 'ON_ENERGY_GAINED'
            );

            matchingAbilities.forEach(ability => {
                const multiplier = Math.floor(energyGained / (ability.scalingDivisor || 1));
                if (multiplier <= 0) return;

                ability.effects?.forEach(effect => {
                    if (effect.type === 'PERMANENT_STAT_MOD') {
                        if (!drone.statMods) {
                            drone.statMods = [];
                        }

                        for (let i = 0; i < multiplier; i++) {
                            drone.statMods.push({ ...effect.mod });
                        }

                        stateModified = true;

                        if (addLogEntryCallback) {
                            addLogEntryCallback({
                                player: newState.name,
                                actionType: 'ABILITY',
                                source: drone.name,
                                target: 'Self',
                                outcome: `Activated '${ability.name}' — gained +${multiplier} ${effect.mod.stat} from ${energyGained} energy gained.`
                            }, 'applyOnEnergyGainedEffects_trigger');
                        }
                    }
                });
            });
        });
    });

    return {
        newState: stateModified ? newState : playerState
    };
};
