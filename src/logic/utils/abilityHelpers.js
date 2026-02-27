// ========================================
// ABILITY HELPERS
// ========================================
// Utility functions for ability triggering and effects
// Extracted from gameLogic.js Phase 7A
// NOTE: applyOnMoveEffects removed in Phase 3 (migrated to TriggerProcessor)
// Remaining functions will be migrated in Phase 5

import fullDroneCollection from '../../data/droneData.js';

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
