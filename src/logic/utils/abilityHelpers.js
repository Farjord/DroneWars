// ========================================
// ABILITY HELPERS
// ========================================
// Utility functions for ability triggering and effects
// Extracted from gameLogic.js Phase 7A

import fullDroneCollection from '../../data/droneData.js';

/**
 * Apply ON_MOVE triggered abilities to a moved drone
 * Checks for PERMANENT_STAT_MOD effects and applies them
 * @param {Object} playerState - Player state object
 * @param {Object} movedDrone - The drone that was moved
 * @param {string} fromLane - Source lane ID (e.g., 'lane1')
 * @param {string} toLane - Destination lane ID (e.g., 'lane2')
 * @param {Function} addLogEntryCallback - Callback for game log entries
 * @returns {Object} { newState } - Updated player state or original if unchanged
 */
export const applyOnMoveEffects = (playerState, movedDrone, fromLane, toLane, addLogEntryCallback) => {
    const baseDrone = fullDroneCollection.find(d => d.name === movedDrone.name);
    if (!baseDrone?.abilities) {
        return { newState: playerState };
    }

    let newState = JSON.parse(JSON.stringify(playerState));
    let stateModified = false;

    const onMoveAbilities = baseDrone.abilities.filter(ability =>
        ability.type === 'TRIGGERED' && ability.trigger === 'ON_MOVE'
    );

    if (onMoveAbilities.length > 0) {
        const droneIndex = newState.dronesOnBoard[toLane].findIndex(d => d.id === movedDrone.id);
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
                    }
                });
            });
        }
    }

    return {
        newState: stateModified ? newState : playerState
    };
};
