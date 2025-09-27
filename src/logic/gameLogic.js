// ========================================
// DRONE WARS GAME ENGINE
// ========================================
// This module contains all pure game logic functions for Drone Wars.
// Functions here are stateless and server-authoritative ready.
// All game rules, calculations, and state transitions are implemented here.
//
// Key Design Principles:
// - Pure functions with no side effects
// - Callback interfaces for UI interactions (logging, animations, etc.)
// - All state is passed in and returned explicitly
// - Server-ready for multiplayer validation
// - Modular and testable architecture

// --- IMPORTS ---
import fullDroneCollection from '../data/droneData.js';
import fullCardCollection from '../data/cardData.js';
import shipSectionData from '../data/shipData.js';
import { calculateEffectiveStats, calculateEffectiveShipStats } from './statsCalculator.js';

// ========================================
// DECK AND CARD MANAGEMENT
// ========================================

const createCard = (cardTemplate, instanceId) => {
  return { ...cardTemplate, instanceId };
};

export const startingDecklist = [
    // Powerful "Silver Bullet" Cards (Limited Copies)
    { id: 'CARD018', quantity: 4 }, // Desperate Measures
    { id: 'CARD019', quantity: 2 }, // Reposition
    { id: 'CARD009', quantity: 2 }, // Target Lock
    { id: 'CARD007', quantity: 2 }, // Emergency Patch
    { id: 'CARD012', quantity: 2 }, // Armor-Piercing Shot
    
    // Core Tactical & Synergy Cards (Multiple Copies)
    { id: 'CARD005', quantity: 4 }, // Adrenaline Rush
    { id: 'CARD006', quantity: 2 }, // Nanobot Repair
    { id: 'CARD015', quantity: 2 }, // Streamline
    { id: 'CARD008', quantity: 2 }, // Shield Recharge
    { id: 'CARD001', quantity: 2 }, // Laser Blast
    
    // Resource & Consistency (Max Copies)
    { id: 'CARD002', quantity: 4 }, // System Reboot
    { id: 'CARD003', quantity: 4 }, // Out Think
    { id: 'CARD004', quantity: 4 }, // Energy Surge
    { id: 'CARD016', quantity: 4 }, // Static Field
];

const buildDeckFromList = (decklist) => {
  const deck = [];
  let instanceCounter = 0;

  decklist.forEach(item => {
    // Find the full card data using the id from the decklist
    const cardTemplate = fullCardCollection.find(c => c.id === item.id);
    if (cardTemplate) {
      // Add the specified quantity of that card
      for (let i = 0; i < item.quantity; i++) {
        deck.push(createCard(cardTemplate, `card-${Date.now()}-${instanceCounter++}`));
      }
    }
  });

  // Shuffle the final deck so the cards are in a random order
  return deck.sort(() => 0.5 - Math.random());
};

// ========================================
// SHIP SECTION MANAGEMENT
// ========================================

const getEffectiveSectionMaxShields = (sectionName, playerState, placedSections) => {
    const section = playerState.shipSections[sectionName];
    if (!section) return 0;

    let effectiveMax = section.shields;
    const laneIndex = placedSections.indexOf(sectionName);

    // If the section is in the middle lane and has a shield bonus
    if (laneIndex === 1 && section.middleLaneBonus && section.middleLaneBonus['Shields Per Turn']) {
        // Assume the bonus to shields per turn also increases max shields by the same amount.
        effectiveMax += section.middleLaneBonus['Shields Per Turn'];
    }
    return effectiveMax;
}

// ========================================
// PLAYER STATE INITIALIZATION
// ========================================

const initialPlayerState = (name, decklist) => {
    const baseStats = calculateEffectiveShipStats({ shipSections: shipSectionData }, []).totals;

    return {
        name: name,
        shipSections: shipSectionData,
        energy: 0, // Energy will be set correctly during round start with actual placed sections
        initialDeploymentBudget: baseStats.initialDeployment,
        deploymentBudget: 0,
        hand: [],
        deck: buildDeckFromList(decklist),
        discardPile: [],
        activeDronePool: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        deployedDroneCounts: {},
        appliedUpgrades: {},
    };
};


const getShipStatus = (section) => {
    if (section.hull <= section.thresholds.critical) {
      return 'critical';
    }
    if (section.hull <= section.thresholds.damaged) {
      return 'damaged';
    }
    return 'healthy';
};

const onDroneDestroyed = (playerState, destroyedDrone) => {
    if (!playerState.deployedDroneCounts.hasOwnProperty(destroyedDrone.name)) {
        return {};
    }
    const newDeployedCounts = { ...playerState.deployedDroneCounts };
    const droneName = destroyedDrone.name;
    if (newDeployedCounts[droneName] > 0) {
        newDeployedCounts[droneName] -= 1;
    }
    return { deployedDroneCounts: newDeployedCounts };
};

const onDroneRecalled = (playerState, recalledDrone) => {
if (!playerState.deployedDroneCounts.hasOwnProperty(recalledDrone.name)) {
return {};
}
const newDeployedCounts = { ...playerState.deployedDroneCounts };
const droneName = recalledDrone.name;
if (newDeployedCounts[droneName] > 0) {
newDeployedCounts[droneName] -= 1;
}
return { deployedDroneCounts: newDeployedCounts };
};

// Stats calculation functions moved to statsCalculator.js to eliminate circular dependency

// ========================================
// DRONE STATS CALCULATION SYSTEM
// ========================================

// calculateEffectiveStats function moved to statsCalculator.js to eliminate circular dependency


const updateAuras = (playerState, opponentState, sections) => { // <-- FIX: Remove useCallback
    const newDronesOnBoard = JSON.parse(JSON.stringify(playerState.dronesOnBoard));
    
    for(const lane in newDronesOnBoard) {
     newDronesOnBoard[lane].forEach(drone => {
        const oldMaxShields = drone.currentMaxShields;
        const { maxShields: newMaxShields } = calculateEffectiveStats(drone, lane, playerState, opponentState, sections);

        if (newMaxShields > oldMaxShields) {
          drone.currentShields += (newMaxShields - oldMaxShields);
        }
        drone.currentMaxShields = newMaxShields;
        drone.currentShields = Math.min(drone.currentShields, newMaxShields);
      });
    }
    return newDronesOnBoard;
  }; 

const getLaneOfDrone = (droneId, playerState) => {
    for (const [lane, drones] of Object.entries(playerState.dronesOnBoard)) {
        if (drones.some(d => d.id === droneId)) {
            return lane;
        }
    }
    return null;
};

// ========================================
// TARGETING AND VALIDATION SYSTEM
// ========================================

const getValidTargets = (actingPlayerId, source, definition, player1, player2) => {
    const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
    const opponentPlayerState = actingPlayerId === 'player1' ? player2 : player1;
    const targets = [];
    const isCard = typeof definition.cost === 'number';
    const isAbility = !isCard;

    const { type, affinity, location, custom } = definition.targeting;
    
    let userLane = null;
    if (isAbility) {
        // Check if the source is a drone on the board to determine its lane
        const isDroneSource = Object.values(actingPlayerState.dronesOnBoard).flat().some(d => d.id === source.id);
        
        if (isDroneSource) {
            userLane = getLaneOfDrone(source.id, actingPlayerState);
            // If it's a drone ability but we can't find its lane, something is wrong.
            if (!userLane) return [];
        }
        // If it's not a drone source (e.g., a ship ability), userLane remains null, 
        // which is correct for abilities that can target ANY_LANE.
    }
      const processPlayerDrones = (playerState, playerType) => {
      Object.entries(playerState.dronesOnBoard).forEach(([lane, drones]) => {
        let isValidLocation = false;
        if (location === 'ANY_LANE') isValidLocation = true;
        if (isAbility && location === 'SAME_LANE') isValidLocation = lane === userLane;
        
        if (isValidLocation) {
          drones.forEach(targetDrone => {
            let meetsCustomCriteria = true;
            if (custom?.includes('DAMAGED_HULL')) {
              const baseDrone = fullDroneCollection.find(d => d.name === targetDrone.name);
              if (!baseDrone || targetDrone.hull >= baseDrone.hull) {
                meetsCustomCriteria = false;
              }
            }
            if (custom?.includes('EXHAUSTED')) {
                if (!targetDrone.isExhausted) {
                    meetsCustomCriteria = false;
                }
            }

            if (meetsCustomCriteria) {
              targets.push({ ...targetDrone, lane, owner: playerType });
            }
          });
        }
      });
    };
    
    const processPlayerSections = (playerState, playerType) => {
        Object.keys(playerState.shipSections).forEach(sectionName => {
            targets.push({ id: sectionName, owner: playerType, ...playerState.shipSections[sectionName] });
        });
    };

    if (type === 'DRONE') {
      if (affinity === 'FRIENDLY' || affinity === 'ANY') {
        processPlayerDrones(actingPlayerState, actingPlayerId);
      }
      if (affinity === 'ENEMY' || affinity === 'ANY') {
        const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
        processPlayerDrones(opponentPlayerState, opponentId);
      }
    } else if (type === 'SHIP_SECTION') {
      if (affinity === 'FRIENDLY' || affinity === 'ANY') {
        processPlayerSections(actingPlayerState, actingPlayerId);
      }
      if (affinity === 'ENEMY' || affinity === 'ANY') {
        const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
        processPlayerSections(opponentPlayerState, opponentId);
      }
    } else if (type === 'LANE') {
      ['lane1', 'lane2', 'lane3'].forEach(laneId => {
        // Respect affinity for lane targeting
        if (affinity === 'FRIENDLY' || affinity === 'ANY') {
          targets.push({ id: laneId, owner: actingPlayerId });
        }
        if (affinity === 'ENEMY' || affinity === 'ANY') {
          const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
          targets.push({ id: laneId, owner: opponentId });
        }
      });
    } else if (type === 'DRONE_CARD') {
        const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
        actingPlayerState.activeDronePool.forEach(drone => {
            const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
            const applied = actingPlayerState.appliedUpgrades[drone.name] || [];
            const alreadyHasThisUpgrade = applied.filter(upg => upg.id === definition.id).length;
            const maxApps = definition.maxApplications === undefined ? 1 : definition.maxApplications;

            if (baseDrone && applied.length < baseDrone.upgradeSlots && alreadyHasThisUpgrade < maxApps) {
                targets.push({ ...drone, id: drone.name, owner: actingPlayerId });
            }
        });
    } else if (type === 'APPLIED_UPGRADE') {
        const targetPlayerState = affinity === 'ENEMY' ? opponentPlayerState : actingPlayerState;
        const targetPlayerId = affinity === 'ENEMY' ? (actingPlayerId === 'player1' ? 'player2' : 'player1') : actingPlayerId;

        Object.values(targetPlayerState.dronesOnBoard).flat().forEach(droneOnBoard => {
            if ((targetPlayerState.appliedUpgrades[droneOnBoard.name] || []).length > 0) {
                targets.push({ ...droneOnBoard, owner: targetPlayerId });
            }
        });
    }
    return targets;
  };


const applyOnMoveEffects = (playerState, movedDrone, fromLane, toLane, addLogEntryCallback) => {
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

const calculateAfterAttackStateAndEffects = (playerState, attacker) => {
  const baseDrone = fullDroneCollection.find(d => d.name === attacker.name);
  if (!baseDrone?.abilities) {
      return { newState: playerState, effects: [] };
  }

  let newState = JSON.parse(JSON.stringify(playerState));
  const effects = [];
  let stateModified = false;

  const afterAttackAbilities = baseDrone.abilities.filter(ability => ability.effect?.type === 'AFTER_ATTACK');

  afterAttackAbilities.forEach(ability => {
      const { subEffect } = ability.effect;

      if (subEffect.type === 'DESTROY_SELF') {
          for (const lane in newState.dronesOnBoard) {
              const droneIndex = newState.dronesOnBoard[lane].findIndex(d => d.id === attacker.id);
              if (droneIndex !== -1) {
                  stateModified = true;
                  const destroyedDrone = newState.dronesOnBoard[lane][droneIndex];

                  effects.push({ 
                      type: 'LOG', 
                      payload: {
                          player: newState.name, actionType: 'ABILITY', source: attacker.name, target: 'Self',
                          outcome: `Activated '${ability.name}', destroying itself.`
                      }
                  });
                  effects.push({ type: 'EXPLOSION', payload: { targetId: attacker.id } });

                  newState.dronesOnBoard[lane] = newState.dronesOnBoard[lane].filter(d => d.id !== attacker.id);
                  Object.assign(newState, onDroneDestroyed(newState, destroyedDrone));
                  break; 
              }
          }
      } else if (subEffect.type === 'PERMANENT_STAT_MOD') {
           for (const lane in newState.dronesOnBoard) {
              const droneIndex = newState.dronesOnBoard[lane].findIndex(d => d.id === attacker.id);
              if (droneIndex !== -1) {
                  stateModified = true;
                  if (!newState.dronesOnBoard[lane][droneIndex].statMods) {
                     newState.dronesOnBoard[lane][droneIndex].statMods = [];
                  }

                  effects.push({ 
                      type: 'LOG', 
                      payload: {
                         player: newState.name, actionType: 'ABILITY', source: attacker.name, target: 'Self',
                         outcome: `Activated '${ability.name}', gaining a permanent +${subEffect.mod.value} ${subEffect.mod.stat}.`
                      }
                  });

                  newState.dronesOnBoard[lane][droneIndex].statMods.push(subEffect.mod);
                  break;
              }
          }
      }
  });

  return { 
      newState: stateModified ? newState : playerState, 
      effects 
  };
};

const checkWinCondition = (opponentPlayerState) => {
    if (!opponentPlayerState || !opponentPlayerState.shipSections) {
      return false;
    }
    
    const sectionStatuses = Object.values(opponentPlayerState.shipSections).map(
      (section) => getShipStatus(section)
    );

    const criticalCount = sectionStatuses.filter(
      (status) => status === 'critical'
    ).length;
    if (criticalCount >= 2) {
      return true;
    }

    const damagedOrWorseCount = sectionStatuses.filter(
      (status) => status === 'damaged' || status === 'critical'
    ).length;
    if (damagedOrWorseCount >= 3) {
      return true;
    }

    return false;
};

// ========================================
// DEPLOYMENT AND VALIDATION SYSTEM
// ========================================

const validateDeployment = (player, drone, turn, totalPlayerDrones, playerEffectiveStats) => {
    if (totalPlayerDrones >= playerEffectiveStats.totals.cpuLimit) {
      return { isValid: false, reason: "CPU Limit Reached", message: "You cannot deploy more drones than your CPU Control Value." };
    }

    const baseDroneInfo = fullDroneCollection.find(d => d.name === drone.name);
    const upgrades = player.appliedUpgrades[drone.name] || [];
    let effectiveLimit = baseDroneInfo.limit;
    upgrades.forEach(upgrade => {
        if (upgrade.mod.stat === 'limit') {
            effectiveLimit += upgrade.mod.value;
        }
    });

    if ((player.deployedDroneCounts[drone.name] || 0) >= effectiveLimit) {
      return { isValid: false, reason: "Deployment Limit Reached", message: `The deployment limit for ${drone.name} is currently ${effectiveLimit}.` };
    }

    const droneCost = drone.class;
    let energyCost = 0;
    let budgetCost = 0;

    if (turn === 1) {
        budgetCost = Math.min(player.initialDeploymentBudget, droneCost);
        energyCost = droneCost - budgetCost;
    } else {
        budgetCost = Math.min(player.deploymentBudget, droneCost);
        energyCost = droneCost - budgetCost;
    }

    if (player.energy < energyCost) {
      return { isValid: false, reason: "Not Enough Energy", message: `This action requires ${energyCost} energy, but you only have ${player.energy}.` };
    }

    return { isValid: true, budgetCost, energyCost };
};

// Shield reallocation functions for multiplayer compatibility
const validateShieldRemoval = (playerState, sectionName, placedSections) => {
    const section = playerState.shipSections[sectionName];
    if (!section) {
        return { valid: false, error: 'Section not found' };
    }

    if (section.allocatedShields <= 0) {
        return { valid: false, error: 'No shields to remove' };
    }

    return { valid: true };
};

const validateShieldAddition = (playerState, sectionName, placedSections) => {
    const section = playerState.shipSections[sectionName];
    if (!section) {
        return { valid: false, error: 'Section not found', maxAvailable: 0 };
    }

    const effectiveMaxShields = getEffectiveSectionMaxShields(sectionName, playerState, placedSections);
    const availableSlots = effectiveMaxShields - section.allocatedShields;

    if (availableSlots <= 0) {
        return { valid: false, error: 'Section at maximum shields', maxAvailable: 0 };
    }

    return { valid: true, maxAvailable: availableSlots };
};

const executeShieldReallocation = (playerState, reallocationData, placedSections) => {
    const { removals, additions } = reallocationData;

    // Create deep copy of player state
    const newPlayerState = {
        ...playerState,
        shipSections: { ...playerState.shipSections }
    };

    // Apply removals
    removals.forEach(({ section, count }) => {
        newPlayerState.shipSections[section] = {
            ...newPlayerState.shipSections[section],
            allocatedShields: newPlayerState.shipSections[section].allocatedShields - count
        };
    });

    // Apply additions
    additions.forEach(({ section, count }) => {
        newPlayerState.shipSections[section] = {
            ...newPlayerState.shipSections[section],
            allocatedShields: newPlayerState.shipSections[section].allocatedShields + count
        };
    });

    return newPlayerState;
};

const getValidShieldReallocationTargets = (playerState, phase, placedSections) => {
    const targets = [];

    Object.keys(playerState.shipSections).forEach(sectionName => {
        if (phase === 'remove') {
            const validation = validateShieldRemoval(playerState, sectionName, placedSections);
            if (validation.valid) {
                targets.push({
                    id: sectionName,
                    name: sectionName,
                    availableShields: playerState.shipSections[sectionName].allocatedShields
                });
            }
        } else if (phase === 'add') {
            const validation = validateShieldAddition(playerState, sectionName, placedSections);
            if (validation.valid) {
                targets.push({
                    id: sectionName,
                    name: sectionName,
                    maxAvailable: validation.maxAvailable
                });
            }
        }
    });

    return targets;
};

// === SHIELD ALLOCATION SYSTEM ===

/**
 * Process single shield allocation
 * @param {Object} currentState - Current game state
 * @param {string} playerId - Player allocating the shield
 * @param {string} sectionName - Section to allocate shield to
 * @returns {Object} - { success, newPlayerState, newShieldsToAllocate, error }
 */
const processShieldAllocation = (currentState, playerId, sectionName) => {
  const playerState = currentState[playerId];
  const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;

  // Validate shield allocation
  const validation = validateShieldAddition(playerState, sectionName, placedSections);

  if (!validation.valid || currentState.shieldsToAllocate <= 0) {
    return {
      success: false,
      error: validation.error || 'No shields available to allocate',
      newPlayerState: playerState,
      newShieldsToAllocate: currentState.shieldsToAllocate
    };
  }

  // Create updated player state
  const newPlayerState = {
    ...playerState,
    shipSections: {
      ...playerState.shipSections,
      [sectionName]: {
        ...playerState.shipSections[sectionName],
        allocatedShields: playerState.shipSections[sectionName].allocatedShields + 1
      }
    }
  };

  return {
    success: true,
    newPlayerState,
    newShieldsToAllocate: currentState.shieldsToAllocate - 1,
    sectionName,
    playerId
  };
};

/**
 * Process reset shield allocation
 * @param {Object} currentState - Current game state
 * @param {string} playerId - Player resetting allocation
 * @returns {Object} - { success, newPlayerState, newShieldsToAllocate }
 */
const processResetShieldAllocation = (currentState, playerId) => {
  const playerState = currentState[playerId];
  const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;

  // Calculate effective stats to get shields per turn
  const effectiveStats = calculateEffectiveShipStats(playerState, placedSections);
  const totalShieldsPerTurn = effectiveStats.totals.shieldsPerTurn;

  // Reset all sections to their initial state (0 allocated shields)
  const resetShipSections = {};
  Object.keys(playerState.shipSections).forEach(sectionName => {
    resetShipSections[sectionName] = {
      ...playerState.shipSections[sectionName],
      allocatedShields: 0
    };
  });

  const newPlayerState = {
    ...playerState,
    shipSections: resetShipSections
  };

  return {
    success: true,
    newPlayerState,
    newShieldsToAllocate: totalShieldsPerTurn,
    playerId
  };
};

/**
 * Process end shield allocation phase
 * @param {Object} currentState - Current game state
 * @param {string} playerId - Player ending allocation (usually local player)
 * @returns {Object} - { success, player1State, player2State, newPhase, firstPlayer }
 */
const processEndShieldAllocation = (currentState, playerId) => {
  const localPlayerId = playerId;
  const opponentPlayerId = localPlayerId === 'player1' ? 'player2' : 'player1';

  // Get current player states
  const localPlayerState = currentState[localPlayerId];
  const opponentPlayerState = currentState[opponentPlayerId];

  // Process AI shield allocation for opponent
  const opponentPlacedSections = opponentPlayerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;
  const opponentEffectiveStats = calculateEffectiveShipStats(opponentPlayerState, opponentPlacedSections);
  const opponentShieldsToAllocate = opponentEffectiveStats.totals.shieldsPerTurn;

  // AI shield allocation logic (round-robin style)
  const aiNewSections = JSON.parse(JSON.stringify(opponentPlayerState.shipSections));
  const aiSectionNames = Object.keys(aiNewSections);
  let remainingAIShields = opponentShieldsToAllocate;
  let sectionIndex = 0;
  let failsafe = 0;

  while (remainingAIShields > 0 && failsafe < 100) {
    const sectionName = aiSectionNames[sectionIndex % aiSectionNames.length];
    const section = aiNewSections[sectionName];

    // Get effective max shields for this section
    const effectiveMax = getEffectiveSectionMaxShields(sectionName, opponentPlayerState, opponentPlacedSections);

    if (section.allocatedShields < effectiveMax) {
      section.allocatedShields++;
      remainingAIShields--;
    }

    sectionIndex++;
    failsafe++;
  }

  const newOpponentPlayerState = {
    ...opponentPlayerState,
    shipSections: aiNewSections
  };

  // Determine first player using existing game logic
  const firstPlayer = determineFirstPlayer(
    currentState.turn,
    currentState.firstPlayerOverride,
    currentState.firstPasserOfPreviousRound
  );

  // Prepare result based on which player is which
  const result = {
    success: true,
    newPhase: 'deployment',
    firstPlayer: firstPlayer
  };

  // Set the correct player states
  if (localPlayerId === 'player1') {
    result.player1State = localPlayerState;
    result.player2State = newOpponentPlayerState;
  } else {
    result.player1State = newOpponentPlayerState;
    result.player2State = localPlayerState;
  }

  return result;
};

// ========================================
// ABILITY RESOLUTION SYSTEM
// ========================================

const resolveAbility = (ability, userDrone, targetDrone, playerStates, placedSections, logCallback, resolveAttackCallback) => {
    const { effect, cost } = ability;
    const actingPlayerState = playerStates.player1;

    // Generate outcome message
    let targetName = '';
    let outcome = 'Ability effect applied.';

    if (ability.targeting?.type === 'LANE') {
        targetName = `Lane ${targetDrone.id.slice(-1)}`;
    } else if (targetDrone) {
        targetName = targetDrone.name;
    }

    if (effect.type === 'HEAL') {
        outcome = `Healed ${effect.value} hull on targets in ${targetName}.`;
        if (effect.scope !== 'LANE') {
            outcome = `Healed ${effect.value} hull on ${targetName}.`;
        }
    } else if (effect.type === 'DAMAGE') {
        outcome = `Dealt ${effect.value} damage to ${targetName}.`;
    }

    // Log the ability
    if (logCallback) {
        logCallback({
            player: actingPlayerState.name,
            actionType: 'ABILITY',
            source: `${userDrone.name}'s ${ability.name}`,
            target: targetName,
            outcome: outcome
        });
    }

    // Create updated player state
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    // Pay costs
    if (cost.energy) {
        newPlayerStates.player1.energy -= cost.energy;
    }

    if (cost.exhausts) {
        for (const lane in newPlayerStates.player1.dronesOnBoard) {
            const droneIndex = newPlayerStates.player1.dronesOnBoard[lane].findIndex(d => d.id === userDrone.id);
            if (droneIndex !== -1) {
                newPlayerStates.player1.dronesOnBoard[lane][droneIndex].isExhausted = true;
                break;
            }
        }
    }

    // Apply effects using modular handler
    const effectResult = resolveDroneAbilityEffect(effect, userDrone, targetDrone, newPlayerStates, placedSections, { resolveAttackCallback });

    // Update states from effect result
    newPlayerStates.player1 = effectResult.newPlayerStates.player1;
    newPlayerStates.player2 = effectResult.newPlayerStates.player2;

    return {
        newPlayerStates,
        shouldEndTurn: !effect.goAgain
    };
};

const resolveShipAbility = (ability, sectionName, target, playerStates, placedSections, logCallback, resolveAttackCallback) => {
    const { cost, effect } = ability;
    const actingPlayerState = playerStates.player1;

    // Log the ability
    if (logCallback) {
        logCallback({
            player: actingPlayerState.name,
            actionType: 'SHIP_ABILITY',
            source: `${sectionName}'s ${ability.name}`,
            target: target?.name || 'N/A',
            outcome: `Activated ${ability.name}.`
        });
    }

    // Create updated player state
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    // Pay energy cost
    newPlayerStates.player1.energy -= cost.energy;

    // Use modular handler for ship ability effects
    if (effect.type === 'REALLOCATE_SHIELDS') {
        // Shield reallocation will be handled separately
        return {
            newPlayerStates,
            shouldEndTurn: false,
            requiresShieldReallocation: true
        };
    } else {
        // Handle other ship ability effects using modular handler
        const effectResult = resolveShipAbilityEffect(effect, sectionName, target, newPlayerStates, placedSections, { resolveAttackCallback });

        // Update states from effect result
        newPlayerStates.player1 = effectResult.newPlayerStates.player1;
        newPlayerStates.player2 = effectResult.newPlayerStates.player2;

        // Handle special return cases
        if (effectResult.needsDiscardSelection) {
            return {
                newPlayerStates,
                shouldEndTurn: false,
                mandatoryAction: { type: 'discard', player: 'player1', count: effectResult.needsDiscardSelection, fromAbility: true }
            };
        }
    }

    return {
        newPlayerStates,
        shouldEndTurn: true
    };
};

const executeDeployment = (drone, lane, turn, playerState, opponentState, placedSections, logCallback) => {
    const validation = validateDeployment(playerState, drone, turn, Object.values(playerState.dronesOnBoard).flat().length, calculateEffectiveShipStats(playerState, placedSections.player1));

    if (!validation.isValid) {
        return {
            success: false,
            error: validation.reason,
            message: validation.message,
            newPlayerState: playerState
        };
    }

    const { budgetCost, energyCost } = validation;

    // Log the deployment
    if (logCallback) {
        logCallback({
            player: playerState.name,
            actionType: 'DEPLOY',
            source: drone.name,
            target: lane,
            outcome: `Deployed to ${lane}.`
        });
    }

    // Create new player state
    const newPlayerState = JSON.parse(JSON.stringify(playerState));

    // Calculate effective stats for the new drone
    const tempDronesOnBoard = { ...newPlayerState.dronesOnBoard, [lane]: [...newPlayerState.dronesOnBoard[lane], { ...drone, id: 0 }] };
    const tempPlayerState = { ...newPlayerState, dronesOnBoard: tempDronesOnBoard };
    const effectiveStats = calculateEffectiveStats(drone, lane, tempPlayerState, opponentState, placedSections);

    // Create the new drone with proper stats
    const newDrone = {
        ...drone,
        id: Date.now(),
        statMods: [],
        currentShields: effectiveStats.maxShields,
        currentMaxShields: effectiveStats.maxShields,
        hull: drone.hull,
        isExhausted: false,
    };

    // Update the player state
    newPlayerState.dronesOnBoard[lane].push(newDrone);
    newPlayerState.deployedDroneCounts = {
        ...newPlayerState.deployedDroneCounts,
        [drone.name]: (newPlayerState.deployedDroneCounts[drone.name] || 0) + 1
    };

    // Pay costs
    if (turn === 1) {
        newPlayerState.initialDeploymentBudget -= budgetCost;
    } else {
        newPlayerState.deploymentBudget -= budgetCost;
    }
    newPlayerState.energy -= energyCost;

    // Update auras
    newPlayerState.dronesOnBoard = updateAuras(newPlayerState, opponentState, placedSections);

    return {
        success: true,
        newPlayerState,
        deployedDrone: newDrone
    };
};

// === GAME STATE VALIDATION SYSTEM ===

const checkGameStateForWinner = (playerStates, callbacks) => {
    const { logCallback, setWinnerCallback, showWinnerModalCallback } = callbacks;

    // Check if Player 1 has met the win condition against Player 2
    if (checkWinCondition(playerStates.player2)) {
        setWinnerCallback('Player 1');
        showWinnerModalCallback(true);
        logCallback({
            player: 'SYSTEM',
            actionType: 'GAME_END',
            source: 'N/A',
            target: 'N/A',
            outcome: 'Player 1 wins!'
        }, 'winConditionCheck');
        return 'Player 1';
    }

    // Check if Player 2 has met the win condition against Player 1
    if (checkWinCondition(playerStates.player1)) {
        setWinnerCallback('Player 2');
        showWinnerModalCallback(true);
        logCallback({
            player: 'SYSTEM',
            actionType: 'GAME_END',
            source: 'N/A',
            target: 'N/A',
            outcome: `${playerStates.player2.name} wins!`
        }, 'winConditionCheck');
        return 'Player 2';
    }

    return null; // No winner yet
};

const calculatePotentialInterceptors = (selectedDrone, player1, player2, placedSections) => {
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
               (effectiveInterceptor.speed > effectiveAttacker.speed ||
                effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS'));
    }).map(d => d.id);

    return potentialInterceptors;
};

// === AI DEPLOYMENT SYSTEM ===

const executeAiDeployment = (droneToDeploy, targetLane, turn, playerState, opponentState, placedSections, callbacks) => {
    const { addLogEntry } = callbacks;

    // Calculate deployment costs
    const droneCost = droneToDeploy.class;
    let budgetCost = 0;
    if (turn === 1) {
        budgetCost = Math.min(playerState.initialDeploymentBudget, droneCost);
    } else {
        budgetCost = Math.min(playerState.deploymentBudget, droneCost);
    }
    const energyCost = droneCost - budgetCost;

    // Validate deployment
    if (playerState.energy < energyCost) {
        return { success: false, error: 'Insufficient energy for deployment' };
    }

    // Create new drone
    const newDrone = {
        ...droneToDeploy,
        id: Date.now(),
        statMods: [],
        currentShields: droneToDeploy.shields,
        currentMaxShields: droneToDeploy.shields,
        hull: droneToDeploy.hull,
        isExhausted: false,
    };

    // Create updated player state
    let newPlayerState = {
        ...playerState,
        dronesOnBoard: {
            ...playerState.dronesOnBoard,
            [targetLane]: [...playerState.dronesOnBoard[targetLane], newDrone]
        },
        deployedDroneCounts: {
            ...playerState.deployedDroneCounts,
            [droneToDeploy.name]: (playerState.deployedDroneCounts[droneToDeploy.name] || 0) + 1
        },
        initialDeploymentBudget: turn === 1 ? playerState.initialDeploymentBudget - budgetCost : playerState.initialDeploymentBudget,
        deploymentBudget: turn > 1 ? playerState.deploymentBudget - budgetCost : playerState.deploymentBudget,
        energy: playerState.energy - energyCost
    };

    // Update auras
    newPlayerState.dronesOnBoard = updateAuras(newPlayerState, opponentState, placedSections);

    return {
        success: true,
        newPlayerState,
        deployedDrone: newDrone,
        costs: { energy: energyCost, budget: budgetCost }
    };
};

// === AI INTERCEPTION SYSTEM ===

const calculateAiInterception = (pendingAttack, playerStates, placedSections) => {
    const { attacker, target, targetType, lane } = pendingAttack;

    const effectiveAttacker = calculateEffectiveStats(
        attacker, lane, playerStates.player2, playerStates.player1, placedSections
    );

    const potentialInterceptors = playerStates.player1.dronesOnBoard[lane]
        .filter(d => {
            const effectiveInterceptor = calculateEffectiveStats(
                d, lane, playerStates.player1, playerStates.player2, placedSections
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

// === TURN MANAGEMENT SYSTEM ===

const calculateTurnTransition = (actingPlayer, passInfo, turnPhase, winner) => {
    const nextPlayer = actingPlayer === 'player1' ? 'player2' : 'player1';

    // If both players have passed, end the current phase
    if (passInfo.player1Passed && passInfo.player2Passed) {
        return {
            type: 'END_PHASE',
            phase: turnPhase,
            nextPlayer: null
        };
    }

    // If the next player has already passed, current player continues
    const nextPlayerHasPassed = (nextPlayer === 'player1' && passInfo.player1Passed) ||
                                (nextPlayer === 'player2' && passInfo.player2Passed);

    if (nextPlayerHasPassed) {
        return {
            type: 'CONTINUE_TURN',
            nextPlayer: actingPlayer,
            triggerAi: actingPlayer === 'player2'
        };
    }

    // Normal turn transition
    return {
        type: 'CHANGE_PLAYER',
        nextPlayer: nextPlayer,
        showOpponentModal: nextPlayer === 'player2' && !winner
    };
};

const calculatePassTransition = (passingPlayer, passInfo, turnPhase) => {
    const wasFirstToPass = !passInfo.player1Passed && !passInfo.player2Passed;

    const newPassInfo = {
        ...passInfo,
        [`${passingPlayer}Passed`]: true,
        firstPasser: passInfo.firstPasser || (wasFirstToPass ? passingPlayer : null)
    };

    // If both players have now passed, end the phase
    if (newPassInfo.player1Passed && newPassInfo.player2Passed) {
        return {
            type: 'END_PHASE',
            newPassInfo,
            phase: turnPhase
        };
    }

    // Continue with opponent
    const nextPlayer = passingPlayer === 'player1' ? 'player2' : 'player1';
    return {
        type: 'CHANGE_PLAYER',
        newPassInfo,
        nextPlayer
    };
};

// === ENHANCED TURN TRANSITION SYSTEM ===

/**
 * Process turn transition with full state management
 * @param {Object} currentState - Current game state
 * @param {string} actingPlayer - Player who is ending their turn
 * @returns {Object} - { newState, uiEffects, transitionType }
 */
const processTurnTransition = (currentState, actingPlayer) => {
  // Calculate base transition logic
  const transition = calculateTurnTransition(
    actingPlayer,
    currentState.passInfo,
    currentState.turnPhase,
    currentState.winner
  );

  let newState = { ...currentState };
  const uiEffects = [];

  // Apply state changes based on transition type
  switch (transition.type) {
    case 'END_PHASE':
      // Phase is ending - prepare for phase transition
      uiEffects.push({
        type: 'PHASE_END',
        phase: transition.phase,
        trigger: 'both_players_passed'
      });

      // Clear pass info for next phase
      newState.passInfo = {
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      };
      break;

    case 'CHANGE_PLAYER':
      // Normal turn transition
      newState.currentPlayer = transition.nextPlayer;

      if (transition.showOpponentModal) {
        uiEffects.push({
          type: 'SHOW_WAITING_MODAL',
          player: transition.nextPlayer
        });
      }
      break;

    case 'CONTINUE_TURN':
      // Player continues (opponent has passed)
      // No state change needed
      break;
  }

  return {
    newState,
    uiEffects,
    transitionType: transition.type
  };
};

/**
 * Process phase change with state management
 * @param {Object} currentState - Current game state
 * @param {string} newPhase - New phase to transition to
 * @param {string} trigger - What triggered the phase change
 * @returns {Object} - { newState, uiEffects }
 */
const processPhaseChange = (currentState, newPhase, trigger = 'manual') => {
  let newState = {
    ...currentState,
    turnPhase: newPhase
  };

  const uiEffects = [];

  // Handle phase-specific setup
  switch (newPhase) {
    case 'deployment':
      // Starting deployment phase
      newState.passInfo = {
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      };

      // Determine first player for the phase
      const firstPlayer = determineFirstPlayer(
        currentState.turn,
        currentState.firstPlayerOverride,
        currentState.firstPasserOfPreviousRound
      );

      newState.currentPlayer = firstPlayer;
      newState.firstPlayerOfRound = firstPlayer;

      uiEffects.push({
        type: 'PHASE_START',
        phase: 'deployment',
        firstPlayer: firstPlayer
      });
      break;

    case 'action':
      // Starting action phase
      newState.passInfo = {
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      };

      // First player of action phase is determined by deployment pass order
      const actionFirstPlayer = currentState.passInfo.firstPasser || currentState.firstPlayerOfRound;
      newState.currentPlayer = actionFirstPlayer;

      uiEffects.push({
        type: 'PHASE_START',
        phase: 'action',
        firstPlayer: actionFirstPlayer
      });
      break;

    case 'roundEnd':
      // Ending the round
      uiEffects.push({
        type: 'ROUND_END',
        turn: currentState.turn
      });
      break;

    default:
      console.warn(`Unknown phase: ${newPhase}`);
  }

  return {
    newState,
    uiEffects
  };
};

/**
 * Process round start with full state management
 * @param {Object} currentState - Current game state
 * @param {number} turn - New turn number
 * @returns {Object} - { newState, uiEffects }
 */
const processRoundStart = (currentState, turn, player1EffectiveStats, player2EffectiveStats) => {
  // Calculate new player states using computed stats
  const newPlayer1State = calculateNewRoundPlayerState(
    currentState.player1,
    turn,
    player1EffectiveStats, // Pass computed ship stats
    currentState.player2,
    currentState.placedSections
  );

  const newPlayer2State = calculateNewRoundPlayerState(
    currentState.player2,
    turn,
    player2EffectiveStats, // Pass computed ship stats
    currentState.player1,
    currentState.opponentPlacedSections
  );

  // Draw to hand limit using computed stats
  const player1WithCards = drawToHandLimit(
    newPlayer1State,
    player1EffectiveStats.totals.handLimit
  );

  const player2WithCards = drawToHandLimit(
    newPlayer2State,
    player2EffectiveStats.totals.handLimit
  );

  // Determine first player
  const firstPlayer = determineFirstPlayer(
    turn,
    currentState.firstPlayerOverride,
    currentState.firstPasserOfPreviousRound
  );

  const newState = {
    ...currentState,
    turn: turn,
    turnPhase: 'deployment',
    currentPlayer: firstPlayer,
    firstPlayerOfRound: firstPlayer,
    firstPasserOfPreviousRound: currentState.passInfo.firstPasser,
    passInfo: {
      firstPasser: null,
      player1Passed: false,
      player2Passed: false
    },
    player1: player1WithCards,
    player2: player2WithCards
  };

  const uiEffects = [
    {
      type: 'ROUND_START',
      turn: turn,
      firstPlayer: firstPlayer
    },
    {
      type: 'LOG_ENTRY',
      entry: {
        player: 'SYSTEM',
        actionType: 'NEW_ROUND',
        source: `Round ${turn}`,
        target: 'N/A',
        outcome: 'New round begins.'
      }
    },
    {
      type: 'SHOW_ROUND_START_MODAL',
      turn: turn
    }
  ];

  return {
    newState,
    uiEffects
  };
};

// === ROUND MANAGEMENT SYSTEM ===

const readyDronesAndRestoreShields = (playerState, opponentState, placedSections) => {
    const newDronesOnBoard = { ...playerState.dronesOnBoard };

    for (const lane in newDronesOnBoard) {
        newDronesOnBoard[lane] = newDronesOnBoard[lane].map(drone => {
            const effectiveStats = calculateEffectiveStats(
                drone,
                lane,
                playerState,
                opponentState,
                placedSections
            );

            return {
                ...drone,
                // Filter statMods to remove temporary effects
                statMods: drone.statMods ? drone.statMods.filter(mod => mod.type === 'permanent') : [],
                isExhausted: false,
                currentShields: effectiveStats.maxShields,
            };
        });
    }

    return { ...playerState, dronesOnBoard: newDronesOnBoard };
};

const calculateNewRoundPlayerState = (playerState, turn, effectiveShipStats, opponentState, placedSections) => {
    // Ready drones and restore shields
    const readiedState = readyDronesAndRestoreShields(playerState, opponentState, placedSections);

    // Update energy and deployment budget using computed ship stats
    const baseState = {
        ...readiedState,
        energy: effectiveShipStats.totals.energyPerTurn,
        initialDeploymentBudget: 0,
        deploymentBudget: effectiveShipStats.totals.deploymentBudget
    };

    return baseState;
};

const drawToHandLimit = (playerState, handLimit) => {
    let newDeck = [...playerState.deck];
    let newHand = [...playerState.hand];
    let newDiscard = [...playerState.discardPile];

    while (newHand.length < handLimit) {
        if (newDeck.length === 0) {
            if (newDiscard.length > 0) {
                newDeck = [...newDiscard].sort(() => 0.5 - Math.random());
                newDiscard = [];
            } else {
                break;
            }
        }
        newHand.push(newDeck.pop());
    }

    return { ...playerState, deck: newDeck, hand: newHand, discardPile: newDiscard };
};

// === AI TURN EXECUTION SYSTEM ===

const executeAiTurn = (gameState, aiBrain, callbacks) => {
    const { player1, player2, turn, turnPhase, passInfo, placedSections, opponentPlacedSections } = gameState;
    const { addLogEntry, setPlayer2, setPendingAttack, endTurn, endDeploymentPhase, endActionPhase, setPassInfo } = callbacks;

    let result;

    if (turnPhase === 'deployment' && !passInfo.player2Passed) {
        result = aiBrain.handleOpponentTurn({
            player1,
            player2,
            turn,
            opponentPlacedSections,
            placedSections,
            getShipStatus,
            calculateEffectiveShipStats,
            calculateEffectiveStats,
            addLogEntry
        });
    } else if (turnPhase === 'action' && !passInfo.player2Passed) {
        result = aiBrain.handleOpponentAction({
            player1,
            player2,
            placedSections,
            opponentPlacedSections,
            getShipStatus,
            getLaneOfDrone,
            getValidTargets,
            calculateEffectiveStats,
            addLogEntry
        });
    }

    if (!result) return null; // Exit if no action was decided

    return result; // Return the AI decision for the UI to execute
};

const executeAiAction = (result, gameState, callbacks) => {
    const { player1, player2, turn, turnPhase, placedSections, opponentPlacedSections } = gameState;
    const { addLogEntry, setPlayer2, setPendingAttack, endTurn, endDeploymentPhase, endActionPhase, setPassInfo, resolveCardPlay } = callbacks;

    if (result.type === 'pass') {
        const wasFirstToPass = !gameState.passInfo.player1Passed;
        const newPassInfo = {
            ...gameState.passInfo,
            player2Passed: true,
            firstPasser: gameState.passInfo.firstPasser || (wasFirstToPass ? 'player2' : null)
        };

        setPassInfo(newPassInfo);

        if (newPassInfo.player1Passed) {
            if (turnPhase === 'deployment') endDeploymentPhase();
            else if (turnPhase === 'action') endActionPhase();
        } else {
            endTurn('player2');
        }

        return { newPassInfo };

    } else if (result.type === 'deploy') {
        const { droneToDeploy, targetLane, logContext } = result.payload;

        addLogEntry({
            player: player2.name,
            actionType: 'DEPLOY',
            source: droneToDeploy.name,
            target: targetLane,
            outcome: `Deployed to ${targetLane}.`
        }, 'aiDeploymentDeploy', logContext);

        const deployResult = executeDeployment(droneToDeploy, targetLane, player2, player1, turn, { player1: placedSections, player2: opponentPlacedSections });

        if (deployResult.success) {
            setPlayer2(deployResult.newPlayerState);
            endTurn('player2');
        }

        return { deployedDrone: deployResult.deployedDrone };

    } else if (result.type === 'action') {
        const chosenAction = result.payload;
        const { logContext } = result;

        switch (chosenAction.type) {
            case 'play_card':
                resolveCardPlay(chosenAction.card, chosenAction.target, 'player2', logContext);
                break;

            case 'attack':
                setPendingAttack({
                    attacker: chosenAction.attacker,
                    target: chosenAction.target,
                    targetType: chosenAction.targetType,
                    lane: chosenAction.attacker.lane,
                    attackingPlayer: 'player2',
                    aiContext: logContext,
                });
                break;

            case 'move': {
                const { drone, fromLane, toLane } = chosenAction;

                addLogEntry({
                    player: player2.name,
                    actionType: 'MOVE',
                    source: drone.name,
                    target: toLane,
                    outcome: `Moved from ${fromLane} to ${toLane}.`
                }, 'aiActionMove', logContext);

                let tempState = JSON.parse(JSON.stringify(player2));
                tempState.dronesOnBoard[fromLane] = tempState.dronesOnBoard[fromLane].filter(d => d.id !== drone.id);
                const movedDrone = { ...drone, isExhausted: true };
                tempState.dronesOnBoard[toLane].push(movedDrone);

                const { newState: stateAfterMove } = applyOnMoveEffects(tempState, movedDrone, fromLane, toLane, addLogEntry);
                stateAfterMove.dronesOnBoard = updateAuras(stateAfterMove, player1, { player1: placedSections, player2: opponentPlacedSections });

                setPlayer2(stateAfterMove);
                endTurn('player2');
                break;
            }

            default:
                endTurn('player2');
                break;
        }

        return { action: chosenAction };
    }

    return null;
};

// === MOVEMENT SYSTEM ===

const resolveMultiMove = (card, dronesToMove, fromLane, toLane, playerState, opponentState, placedSections, callbacks) => {
    const { cost, effect } = card;
    const { logCallback, applyOnMoveEffectsCallback, updateAurasCallback } = callbacks;

    let tempState = JSON.parse(JSON.stringify(playerState));
    tempState.energy -= cost;
    tempState.hand = tempState.hand.filter(c => c.instanceId !== card.instanceId);
    tempState.discardPile.push(card);

    const dronesBeingMovedIds = new Set(dronesToMove.map(d => d.id));
    tempState.dronesOnBoard[fromLane] = tempState.dronesOnBoard[fromLane].filter(d => !dronesBeingMovedIds.has(d.id));

    const movedDrones = dronesToMove.map(d => ({
        ...d,
        isExhausted: d.isExhausted || !effect.properties?.includes('DO_NOT_EXHAUST')
    }));
    tempState.dronesOnBoard[toLane].push(...movedDrones);

    logCallback({
        player: playerState.name,
        actionType: 'MULTI_MOVE',
        source: card.name,
        target: `${dronesToMove.map(d => d.name).join(', ')}`,
        outcome: `Moved ${dronesToMove.length} drone(s) from ${fromLane} to ${toLane}.`
    }, 'resolveMultiMove');

    let finalPlayerState = tempState;
    movedDrones.forEach(movedDrone => {
        const { newState } = applyOnMoveEffectsCallback(finalPlayerState, movedDrone, fromLane, toLane, logCallback);
        finalPlayerState = newState;
    });

    finalPlayerState.dronesOnBoard = updateAurasCallback(finalPlayerState, opponentState, placedSections);

    return {
        newPlayerState: finalPlayerState,
        shouldEndTurn: true,
        shouldCancelCardSelection: true,
        shouldClearMultiSelectState: true
    };
};

const resolveSingleMove = (card, droneToMove, fromLane, toLane, playerState, opponentState, placedSections, callbacks) => {
    const { cost, effect } = card;
    const { logCallback, applyOnMoveEffectsCallback, updateAurasCallback } = callbacks;

    let tempState = JSON.parse(JSON.stringify(playerState));
    tempState.energy -= cost;
    tempState.hand = tempState.hand.filter(c => c.instanceId !== card.instanceId);
    tempState.discardPile.push(card);

    tempState.dronesOnBoard[fromLane] = tempState.dronesOnBoard[fromLane].filter(d => d.id !== droneToMove.id);

    const movedDrone = {
        ...droneToMove,
        isExhausted: effect.properties?.includes('DO_NOT_EXHAUST') ? droneToMove.isExhausted : true
    };
    tempState.dronesOnBoard[toLane].push(movedDrone);

    logCallback({
        player: playerState.name,
        actionType: 'MOVE',
        source: card.name,
        target: droneToMove.name,
        outcome: `Moved from ${fromLane} to ${toLane}.`
    }, 'resolveSingleMove');

    const { newState } = applyOnMoveEffectsCallback(tempState, movedDrone, fromLane, toLane, logCallback);
    newState.dronesOnBoard = updateAurasCallback(newState, opponentState, placedSections);

    return {
        newPlayerState: newState,
        shouldEndTurn: false, // Single move cards have "goAgain: true"
        shouldCancelCardSelection: true,
        shouldClearMultiSelectState: true
    };
};

// === CARD RESOLUTION SYSTEM ===

const payCardCosts = (card, actingPlayerId, playerStates) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];

    // Pay energy cost
    if (card.cost) {
        actingPlayerState.energy -= card.cost;
    }

    // Note: Card discard is now handled in finishCardPlay() to ensure proper timing
    // with card selection effects

    return newPlayerStates;
};

const calculateRepeatCount = (condition, playerState) => {
    let repeatCount = 1; // Base effect always happens once

    if (condition === 'OWN_DAMAGED_SECTIONS') {
        for (const sectionName in playerState.shipSections) {
            const section = playerState.shipSections[sectionName];
            const status = getShipStatus(section);
            if (status === 'damaged' || status === 'critical') {
                repeatCount++;
            }
        }
    }

    return repeatCount;
};

const resolveCardPlay = (card, target, actingPlayerId, playerStates, placedSections, callbacks) => {
    const { logCallback, explosionCallback, hitAnimationCallback, resolveAttackCallback } = callbacks;

    // Generate outcome message for logging
    const targetName = target ? (target.name || target.id) : 'N/A';
    let outcome = 'Card effect applied.';

    const effect = card.effect;
    if (effect.type === 'DRAW') outcome = `Drew ${effect.value} card(s).`;
    if (effect.type === 'GAIN_ENERGY') outcome = `Gained ${effect.value} energy.`;
    if (effect.type === 'HEAL_HULL') outcome = `Healed ${effect.value} hull on ${targetName}.`;
    if (effect.type === 'HEAL_SHIELDS') outcome = `Healed ${effect.value} shields on ${targetName}.`;
    if (effect.type === 'READY_DRONE') outcome = `Readied ${targetName}.`;
    if (effect.type === 'DAMAGE') {
        if (effect.scope === 'FILTERED') {
            outcome = `Dealt ${effect.value} damage to filtered targets in ${targetName}.`;
        } else {
            outcome = `Dealt ${effect.value} damage to ${targetName}.`;
        }
    }
    if (effect.type === 'MODIFY_STAT') {
        const mod = effect.mod;
        const durationText = mod.type === 'temporary' ? ' until the end of the turn' : ' permanently';
        outcome = `Gave ${targetName} a ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat} bonus${durationText}.`;
    }
    if (effect.type === 'REPEATING_EFFECT') {
        const actingPlayerState = playerStates[actingPlayerId];
        const repeatCount = calculateRepeatCount(effect.condition, actingPlayerState);
        outcome = `Drew ${repeatCount} card(s) and gained ${repeatCount} energy based on damaged sections.`;
    }

    // Log the card play
    if (logCallback) {
        logCallback({
            player: playerStates[actingPlayerId].name,
            actionType: 'PLAY_CARD',
            source: card.name,
            target: targetName,
            outcome: outcome
        });
    }

    // Pay card costs first
    let currentStates = payCardCosts(card, actingPlayerId, playerStates);

    // Resolve the effect(s)
    const result = resolveCardEffect(card.effect, target, actingPlayerId, currentStates, placedSections, callbacks, card);

    // If no card selection is needed, complete the card play immediately
    if (!result.needsCardSelection) {
        const completion = finishCardPlay(card, actingPlayerId, result.newPlayerStates);
        return {
            newPlayerStates: completion.newPlayerStates,
            shouldEndTurn: completion.shouldEndTurn,
            additionalEffects: result.additionalEffects || [],
            needsCardSelection: false
        };
    }

    // If card selection is needed, return current state and defer completion
    return {
        newPlayerStates: currentStates, // Use currentStates (with card costs paid) but card not discarded yet
        shouldEndTurn: false, // Turn ending will be handled in finishCardPlay after selection
        additionalEffects: result.additionalEffects || [],
        needsCardSelection: result.needsCardSelection // Pass through card selection requirements
    };
};

// ========================================
// CARD PLAY COMPLETION SYSTEM
// ========================================

/**
 * Completes the card play process by handling final cleanup.
 * This includes discarding the card, checking for turn ending, and applying any completion effects.
 * Should be called after all immediate effects and card selections are complete.
 *
 * @param {Object} card - The card that was played
 * @param {string} actingPlayerId - 'player1' or 'player2'
 * @param {Object} playerStates - Current player states
 * @returns {Object} - { newPlayerStates, shouldEndTurn }
 */
const finishCardPlay = (card, actingPlayerId, playerStates) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];

    // Remove card from hand and add to discard pile (final cleanup)
    actingPlayerState.hand = actingPlayerState.hand.filter(c => c.instanceId !== card.instanceId);
    actingPlayerState.discardPile.push(card);

    // Determine if turn should end
    const shouldEndTurn = actingPlayerId === 'player1' && !card.effect.goAgain;

    return {
        newPlayerStates,
        shouldEndTurn
    };
};

const resolveCardEffect = (effect, target, actingPlayerId, playerStates, placedSections, callbacks, card = null) => {
    if (effect.effects) {
        // Multi-effect card (like REPEATING_EFFECT)
        return resolveMultiEffect(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card);
    } else {
        // Single effect card
        return resolveSingleEffect(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card);
    }
};

const resolveMultiEffect = (effect, target, actingPlayerId, playerStates, placedSections, callbacks, card = null) => {
    let currentStates = playerStates;
    let allAdditionalEffects = [];

    if (effect.type === 'REPEATING_EFFECT') {
        // Calculate how many times to repeat
        const repeatCount = calculateRepeatCount(effect.condition, currentStates[actingPlayerId]);

        // Execute each sub-effect, repeatCount times
        for (let i = 0; i < repeatCount; i++) {
            for (const subEffect of effect.effects) {
                const result = resolveSingleEffect(subEffect, target, actingPlayerId, currentStates, placedSections, callbacks, card);
                currentStates = result.newPlayerStates;
                if (result.additionalEffects) {
                    allAdditionalEffects.push(...result.additionalEffects);
                }
            }
        }
    }

    return {
        newPlayerStates: currentStates,
        additionalEffects: allAdditionalEffects
    };
};

const resolveSingleEffect = (effect, target, actingPlayerId, playerStates, placedSections, callbacks, card = null) => {
    switch (effect.type) {
        case 'DRAW':
            return resolveUnifiedDrawEffect(effect, null, target, actingPlayerId, playerStates, placedSections, callbacks);
        case 'SEARCH_AND_DRAW':
            return resolveSearchAndDrawEffect(effect, null, target, actingPlayerId, playerStates, placedSections, callbacks);
        case 'GAIN_ENERGY':
            return resolveEnergyEffect(effect, actingPlayerId, playerStates, placedSections, callbacks);
        case 'READY_DRONE':
            return resolveReadyDroneEffect(effect, target, actingPlayerId, playerStates, callbacks);
        case 'HEAL_HULL':
            return resolveUnifiedHealEffect(effect, null, target, actingPlayerId, playerStates, placedSections, callbacks);
        case 'HEAL_SHIELDS':
            return resolveHealShieldsEffect(effect, target, actingPlayerId, playerStates, callbacks);
        case 'DAMAGE':
            return resolveUnifiedDamageEffect(effect, null, target, actingPlayerId, playerStates, placedSections, callbacks, card);
        case 'DESTROY':
            return resolveDestroyEffect(effect, target, actingPlayerId, playerStates, callbacks);
        case 'MODIFY_STAT':
            return resolveModifyStatEffect(effect, target, actingPlayerId, playerStates, callbacks);
        case 'MODIFY_DRONE_BASE':
            return resolveUpgradeEffect(effect, target, actingPlayerId, playerStates, callbacks);
        case 'DESTROY_UPGRADE':
            return resolveDestroyUpgradeEffect(effect, target, actingPlayerId, playerStates, callbacks);
        default:
            console.warn(`Unknown effect type: ${effect.type}`);
            return { newPlayerStates: playerStates, additionalEffects: [] };
    }
};

// === INDIVIDUAL EFFECT HANDLERS ===

const resolveDrawEffect = (effect, actingPlayerId, playerStates, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];
    let newDeck = [...actingPlayerState.deck];
    let newHand = [...actingPlayerState.hand];
    let newDiscard = [...actingPlayerState.discardPile];

    for (let i = 0; i < effect.value; i++) {
        if (newDeck.length === 0) {
            if (newDiscard.length > 0) {
                newDeck = [...newDiscard].sort(() => 0.5 - Math.random());
                newDiscard = [];
            } else {
                break; // No more cards to draw
            }
        }
        const drawn = newDeck.pop();
        newHand.push(drawn);
    }

    actingPlayerState.deck = newDeck;
    actingPlayerState.hand = newHand;
    actingPlayerState.discardPile = newDiscard;

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveEnergyEffect = (effect, actingPlayerId, playerStates, placedSections, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];
    const sections = actingPlayerId === 'player1' ? placedSections.player1 : placedSections.player2;
    const effectiveStats = calculateEffectiveShipStats(actingPlayerState, sections).totals;

    const newEnergy = Math.min(effectiveStats.maxEnergy, actingPlayerState.energy + effect.value);
    actingPlayerState.energy = newEnergy;

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveReadyDroneEffect = (effect, target, actingPlayerId, playerStates, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];

    // Find and ready the target drone
    for (const lane in actingPlayerState.dronesOnBoard) {
        const droneIndex = actingPlayerState.dronesOnBoard[lane].findIndex(d => d.id === target.id);
        if (droneIndex !== -1) {
            actingPlayerState.dronesOnBoard[lane][droneIndex].isExhausted = false;
            break;
        }
    }

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveHealHullEffect = (effect, target, actingPlayerId, playerStates, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const targetPlayerState = newPlayerStates[target.owner || actingPlayerId];

    // Find the target drone and heal it
    for (const lane in targetPlayerState.dronesOnBoard) {
        const droneIndex = targetPlayerState.dronesOnBoard[lane].findIndex(d => d.id === target.id);
        if (droneIndex !== -1) {
            const drone = targetPlayerState.dronesOnBoard[lane][droneIndex];
            const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
            if (baseDrone) {
                drone.hull = Math.min(baseDrone.hull, drone.hull + effect.value);
            }
            break;
        }
    }

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveHealShieldsEffect = (effect, target, actingPlayerId, playerStates, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const targetPlayerState = newPlayerStates[target.owner || actingPlayerId];

    // Find the target drone and heal its shields
    for (const lane in targetPlayerState.dronesOnBoard) {
        const droneIndex = targetPlayerState.dronesOnBoard[lane].findIndex(d => d.id === target.id);
        if (droneIndex !== -1) {
            const drone = targetPlayerState.dronesOnBoard[lane][droneIndex];
            drone.currentShields = Math.min(drone.currentMaxShields || drone.shields, drone.currentShields + effect.value);
            break;
        }
    }

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveDamageEffect = (effect, target, actingPlayerId, playerStates, callbacks, cardTargeting = null) => {
    const { resolveAttackCallback } = callbacks;

    if (effect.scope === 'FILTERED' && target.id.startsWith('lane') && effect.filter) {
        // Filtered damage (affects multiple drones in a lane based on criteria)
        // Use snapshot-based resolution to ensure consistent damage calculations
        const laneId = target.id;
        // Use card targeting affinity if available, otherwise fall back to effect affinity
        const affinity = cardTargeting?.affinity || effect.affinity;
        const targetPlayer = affinity === 'ENEMY'
            ? (actingPlayerId === 'player1' ? 'player2' : 'player1')
            : actingPlayerId;
        const targetPlayerState = playerStates[targetPlayer];
        const dronesInLane = targetPlayerState.dronesOnBoard[laneId] || [];

        console.log(`[DEBUG] Filtered damage - ${actingPlayerId} targeting ${targetPlayer} ${laneId}`);
        console.log(`[DEBUG] Drones in ${targetPlayer} ${laneId}:`, dronesInLane.map(d => `${d.name}(${d.id}) [${d.hull}hp, ${d.speed}spd]`));

        const { stat, comparison, value } = effect.filter;

        // Process all attacks using snapshot state for consistent results
        const newPlayerStates = {
            player1: JSON.parse(JSON.stringify(playerStates.player1)),
            player2: JSON.parse(JSON.stringify(playerStates.player2))
        };

        const updatedTargetPlayerState = newPlayerStates[targetPlayer];
        const updatedDronesInLane = updatedTargetPlayerState.dronesOnBoard[laneId] || [];

        // Apply damage to all valid targets using snapshot stats
        for (let i = updatedDronesInLane.length - 1; i >= 0; i--) {
            const droneInLane = updatedDronesInLane[i];
            let meetsCondition = false;

            if (comparison === 'GTE' && droneInLane[stat] >= value) {
                meetsCondition = true;
            }
            if (comparison === 'LTE' && droneInLane[stat] <= value) {
                meetsCondition = true;
            }

            console.log(`[DEBUG] ${droneInLane.name} ${stat}=${droneInLane[stat]} ${comparison} ${value} = ${meetsCondition}`);

            if (meetsCondition) {
                console.log(`[DEBUG] Applying ${effect.value} damage to ${droneInLane.name}`);

                // Apply damage directly using snapshot stats
                const totalShields = droneInLane.currentShields || 0;
                let remainingDamage = effect.value;

                // Damage shields first
                const shieldDamage = Math.min(remainingDamage, totalShields);
                droneInLane.currentShields = (droneInLane.currentShields || 0) - shieldDamage;
                remainingDamage -= shieldDamage;

                // Apply remaining damage to hull
                if (remainingDamage > 0) {
                    droneInLane.hull -= remainingDamage;
                }

                // Remove destroyed drones
                if (droneInLane.hull <= 0) {
                    console.log(`[DEBUG] ${droneInLane.name} destroyed`);
                    updatedDronesInLane.splice(i, 1);
                }
            }
        }

        return {
            newPlayerStates,
            additionalEffects: []
        };
    } else {
        // Single target damage - use snapshot-based resolution for consistency
        const targetPlayerState = playerStates[target.owner];
        const targetLane = getLaneOfDrone(target.id, targetPlayerState);

        if (targetLane) {
            console.log(`[DEBUG] Single target damage - ${actingPlayerId} targeting ${target.name} with ${effect.value} damage`);

            // Create snapshot state for consistent damage calculation
            const newPlayerStates = {
                player1: JSON.parse(JSON.stringify(playerStates.player1)),
                player2: JSON.parse(JSON.stringify(playerStates.player2))
            };

            const updatedTargetPlayerState = newPlayerStates[target.owner];
            const dronesInLane = updatedTargetPlayerState.dronesOnBoard[targetLane] || [];
            const targetDrone = dronesInLane.find(d => d.id === target.id);

            if (targetDrone) {
                let damage = effect.value;
                let shieldDamage = 0;
                let remainingDamage = damage;

                // Apply damage based on damage type
                if (effect.damageType !== 'PIERCING') {
                    shieldDamage = Math.min(damage, targetDrone.currentShields);
                    remainingDamage -= shieldDamage;
                    targetDrone.currentShields -= shieldDamage;
                }

                // Apply hull damage
                targetDrone.hull -= remainingDamage;
                console.log(`[DEBUG] Applied ${remainingDamage} hull damage to ${targetDrone.name} (${targetDrone.hull} hull remaining)`);

                // Remove destroyed drone
                if (targetDrone.hull <= 0) {
                    console.log(`[DEBUG] ${targetDrone.name} destroyed`);
                    const droneIndex = dronesInLane.findIndex(d => d.id === target.id);
                    if (droneIndex >= 0) {
                        dronesInLane.splice(droneIndex, 1);
                    }
                }
            }

            return {
                newPlayerStates,
                additionalEffects: []
            };
        }
    }

    return {
        newPlayerStates: playerStates,
        additionalEffects: []
    };
};

const resolveDestroyEffect = (effect, target, actingPlayerId, playerStates, callbacks) => {
    const { explosionCallback } = callbacks;
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';
    const targetPlayerState = newPlayerStates[opponentPlayerId];

    if (effect.scope === 'LANE' && target.id) {
        // Destroy all drones in a lane
        const laneId = target.id;
        const destroyed = targetPlayerState.dronesOnBoard[laneId] || [];

        destroyed.forEach(drone => {
            if (explosionCallback) explosionCallback(drone.id);
            const updates = onDroneDestroyed(targetPlayerState, drone);
            targetPlayerState.deployedDroneCounts = {
                ...(targetPlayerState.deployedDroneCounts || {}),
                ...updates.deployedDroneCounts
            };
        });
        targetPlayerState.dronesOnBoard[laneId] = [];
    } else if (effect.scope === 'SINGLE' && target && target.owner !== actingPlayerId) {
        // Destroy single drone
        const laneId = getLaneOfDrone(target.id, targetPlayerState);
        if (laneId) {
            const droneToDestroy = targetPlayerState.dronesOnBoard[laneId].find(d => d.id === target.id);
            if (droneToDestroy) {
                if (explosionCallback) explosionCallback(droneToDestroy.id);
                const updates = onDroneDestroyed(targetPlayerState, droneToDestroy);
                targetPlayerState.deployedDroneCounts = {
                    ...(targetPlayerState.deployedDroneCounts || {}),
                    ...updates.deployedDroneCounts
                };
                targetPlayerState.dronesOnBoard[laneId] = targetPlayerState.dronesOnBoard[laneId].filter(d => d.id !== target.id);
            }
        }
    }

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveModifyStatEffect = (effect, target, actingPlayerId, playerStates, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const targetPlayerState = newPlayerStates[target.owner || actingPlayerId];
    const mod = effect.mod;

    // Check if target is a lane (e.g., 'lane1', 'lane2', 'lane3')
    if (target.id && target.id.startsWith('lane')) {
        // Apply stat modification to all drones in the target lane
        const targetLane = target.id;
        if (targetPlayerState.dronesOnBoard[targetLane]) {
            targetPlayerState.dronesOnBoard[targetLane].forEach(drone => {
                if (!drone.statMods) drone.statMods = [];
                drone.statMods.push({
                    stat: mod.stat,
                    value: mod.value,
                    type: mod.type || 'temporary',
                    source: 'card'
                });
            });
        }
    } else {
        // Single drone targeting (original logic)
        for (const lane in targetPlayerState.dronesOnBoard) {
            const droneIndex = targetPlayerState.dronesOnBoard[lane].findIndex(d => d.id === target.id);
            if (droneIndex !== -1) {
                const drone = targetPlayerState.dronesOnBoard[lane][droneIndex];
                if (!drone.statMods) drone.statMods = [];

                drone.statMods.push({
                    stat: mod.stat,
                    value: mod.value,
                    type: mod.type || 'temporary',
                    source: 'card'
                });
                break;
            }
        }
    }

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveUpgradeEffect = (effect, target, actingPlayerId, playerStates, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];
    const droneName = target.name;
    const existingUpgrades = actingPlayerState.appliedUpgrades[droneName] || [];

    const newUpgrade = {
        instanceId: `upgrade-${Date.now()}-${Math.random()}`,
        mod: effect.mod
    };

    // Handle ability granting upgrades
    if (effect.mod.stat === 'ability' && effect.mod.abilityToAdd) {
        newUpgrade.grantedAbilities = [effect.mod.abilityToAdd];
    }

    actingPlayerState.appliedUpgrades = {
        ...actingPlayerState.appliedUpgrades,
        [droneName]: [...existingUpgrades, newUpgrade]
    };

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveDestroyUpgradeEffect = (effect, target, actingPlayerId, playerStates, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';
    const opponentState = newPlayerStates[opponentPlayerId];

    const { droneName, instanceId } = target;
    if (opponentState.appliedUpgrades[droneName]) {
        const newUpgradesForDrone = opponentState.appliedUpgrades[droneName].filter(upg => upg.instanceId !== instanceId);

        if (newUpgradesForDrone.length > 0) {
            opponentState.appliedUpgrades[droneName] = newUpgradesForDrone;
        } else {
            delete opponentState.appliedUpgrades[droneName];
        }
    }

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

// === UNIFIED EFFECT HANDLERS ===
// These handlers work for cards, drone abilities, and ship abilities

const resolveUnifiedDamageEffect = (effect, source, target, actingPlayerId, playerStates, placedSections, callbacks, card = null) => {
    const { resolveAttackCallback } = callbacks;

    // Handle filtered damage (cards only)
    if (effect.scope === 'FILTERED' && target.id.startsWith('lane') && effect.filter) {
        return resolveDamageEffect(effect, target, actingPlayerId, playerStates, callbacks, card?.targeting);
    }

    // Handle direct damage (all contexts)
    // Determine correct player state based on target owner (fix for cross-player targeting)
    const targetPlayerState = target.owner === 'player1' ? playerStates.player1 : playerStates.player2;
    const targetLane = getLaneOfDrone(target.id, targetPlayerState);
    if (targetLane && resolveAttackCallback) {
        const attackDetails = {
            attacker: source,
            target: target,
            targetType: 'drone',
            attackingPlayer: actingPlayerId || 'player1',
            abilityDamage: effect.value,
            lane: targetLane,
            damageType: effect.damageType
        };

        // Call the attack resolution directly and return the updated states
        const attackResult = resolveAttack(
            attackDetails,
            playerStates,
            placedSections,
            callbacks.logCallback,
            callbacks.explosionCallback,
            callbacks.hitAnimationCallback
        );

        // FIXED: Return the properly updated states from the attack resolution
        return {
            newPlayerStates: attackResult.newPlayerStates,
            additionalEffects: attackResult.afterAttackEffects || []
        };
    }

    return {
        newPlayerStates: playerStates,
        additionalEffects: []
    };
};

const resolveUnifiedHealEffect = (effect, source, target, actingPlayerId, playerStates, placedSections, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const targetPlayerId = actingPlayerId || 'player1';

    if (effect.scope === 'LANE') {
        const targetLaneId = target.id;
        if (newPlayerStates[targetPlayerId].dronesOnBoard[targetLaneId]) {
            newPlayerStates[targetPlayerId].dronesOnBoard[targetLaneId].forEach(droneInLane => {
                const baseDrone = fullDroneCollection.find(d => d.name === droneInLane.name);
                if (baseDrone && droneInLane.hull < baseDrone.hull) {
                    droneInLane.hull = Math.min(baseDrone.hull, droneInLane.hull + effect.value);
                }
            });
        }
    } else {
        const baseTarget = fullDroneCollection.find(d => d.name === target.name);
        const targetLaneId = getLaneOfDrone(target.id, newPlayerStates[targetPlayerId]);
        if (targetLaneId) {
            const droneIndex = newPlayerStates[targetPlayerId].dronesOnBoard[targetLaneId].findIndex(d => d.id === target.id);
            if (droneIndex !== -1) {
                newPlayerStates[targetPlayerId].dronesOnBoard[targetLaneId][droneIndex].hull = Math.min(baseTarget.hull, newPlayerStates[targetPlayerId].dronesOnBoard[targetLaneId][droneIndex].hull + effect.value);
            }
        }
    }

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveUnifiedDrawEffect = (effect, source, target, actingPlayerId, playerStates, placedSections, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const targetPlayerId = actingPlayerId || 'player1';
    const actingPlayerState = newPlayerStates[targetPlayerId];
    let newDeck = [...actingPlayerState.deck];
    let newHand = [...actingPlayerState.hand];
    let newDiscard = [...actingPlayerState.discardPile];

    const drawCount = (effect.value && typeof effect.value === 'object' && effect.value.draw) || effect.value || 1;

    for (let i = 0; i < drawCount; i++) {
        if (newDeck.length === 0) {
            if (newDiscard.length > 0) {
                newDeck = [...newDiscard].sort(() => 0.5 - Math.random());
                newDiscard = [];
            } else {
                break;
            }
        }
        if (newDeck.length > 0) {
            newHand.push(newDeck.pop());
        }
    }

    newPlayerStates[targetPlayerId] = { ...actingPlayerState, deck: newDeck, hand: newHand, discardPile: newDiscard };

    const result = {
        newPlayerStates,
        additionalEffects: []
    };

    // Handle discard requirement for DRAW_THEN_DISCARD
    if (effect.value && effect.value.discard) {
        result.needsDiscardSelection = effect.value.discard;
    }

    return result;
};

const cardMatchesFilter = (card, filter) => {
    // Type filtering (e.g., 'Upgrade', 'Action', 'Drone')
    if (filter.type && card.type !== filter.type) {
        return false;
    }

    // Cost filtering (e.g., maxCost: 3)
    if (filter.maxCost !== undefined && card.cost > filter.maxCost) {
        return false;
    }

    if (filter.minCost !== undefined && card.cost < filter.minCost) {
        return false;
    }

    // Effect type filtering (e.g., 'DAMAGE', 'HEAL')
    if (filter.effectType && card.effect?.type !== filter.effectType) {
        return false;
    }

    // Name filtering (for specific card searches)
    if (filter.name && card.name !== filter.name) {
        return false;
    }

    // More filters can be added here as needed
    return true;
};

const resolveSearchAndDrawEffect = (effect, source, target, actingPlayerId, playerStates, placedSections, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const targetPlayerId = actingPlayerId || 'player1';
    const actingPlayerState = newPlayerStates[targetPlayerId];
    let newDeck = [...actingPlayerState.deck];
    let newDiscard = [...actingPlayerState.discardPile];

    // Handle filtered vs unfiltered searches
    let searchedCards, remainingDeck;

    if (effect.filter) {
        // Filtered search - search entire deck for matching cards
        if (newDeck.length === 0 && newDiscard.length > 0) {
            // Shuffle discard into deck if needed
            newDeck = [...newDiscard.sort(() => 0.5 - Math.random())];
            newDiscard = [];
        }

        // Find all cards matching the filter
        const matchingCards = newDeck.filter(card => cardMatchesFilter(card, effect.filter));

        // Take up to searchCount matching cards
        searchedCards = matchingCards.slice(0, effect.searchCount);

        // Remove found cards from deck
        remainingDeck = newDeck.filter(card => !searchedCards.includes(card));
    } else {
        // Unfiltered search - search top X cards
        const cardsNeeded = effect.searchCount;
        if (newDeck.length < cardsNeeded && newDiscard.length > 0) {
            // Shuffle discard into deck if needed
            newDeck = [...newDeck, ...newDiscard.sort(() => 0.5 - Math.random())];
            newDiscard = [];
        }

        // Get the top cards for searching
        searchedCards = newDeck.slice(-effect.searchCount).reverse(); // Top cards in correct order
        remainingDeck = newDeck.slice(0, -effect.searchCount);
    }

    // For AI players, automatically select the best cards
    if (targetPlayerId === 'player2') {
        const selectedCards = selectBestCardsForAI(searchedCards, effect.drawCount, newPlayerStates, placedSections);
        const unselectedCards = searchedCards.filter(card => !selectedCards.includes(card));

        // Add selected cards to hand
        const newHand = [...actingPlayerState.hand, ...selectedCards];

        // Return unselected cards to top of deck in original order
        let finalDeck = [...remainingDeck, ...unselectedCards];

        // Shuffle if required
        if (effect.shuffleAfter) {
            finalDeck = finalDeck.sort(() => 0.5 - Math.random());
        }

        newPlayerStates[targetPlayerId] = {
            ...actingPlayerState,
            deck: finalDeck,
            hand: newHand,
            discardPile: newDiscard
        };

        return {
            newPlayerStates,
            additionalEffects: []
        };
    } else {
        // For human players, return data for modal selection
        return {
            newPlayerStates: playerStates, // Don't change state yet
            additionalEffects: [],
            needsCardSelection: {
                type: 'search_and_draw',
                searchedCards: searchedCards,
                drawCount: effect.drawCount,
                shuffleAfter: effect.shuffleAfter,
                remainingDeck: remainingDeck,
                discardPile: newDiscard,
                filter: effect.filter
            }
        };
    }
};

const selectBestCardsForAI = (availableCards, drawCount, playerStates, placedSections) => {
    // Simple AI selection logic - can be enhanced later
    const scoredCards = availableCards.map(card => ({
        card,
        score: evaluateCardForAI(card, playerStates.player2, playerStates.player1, placedSections)
    }));

    return scoredCards
        .sort((a, b) => b.score - a.score)
        .slice(0, drawCount)
        .map(item => item.card);
};

const evaluateCardForAI = (card, aiState, humanState, placedSections) => {
    let score = 0;

    // Base affordability check
    if (card.cost > aiState.energy) {
        return -100; // Can't afford it
    }

    // Basic scoring by effect type
    switch (card.effect?.type) {
        case 'DAMAGE':
            score = 15 + (card.effect.value || 0) * 3;
            break;
        case 'DRAW':
            score = 12 + (card.effect.value || 0) * 2;
            break;
        case 'GAIN_ENERGY':
            score = 8 + (card.effect.value || 0) * 2;
            break;
        case 'HEAL_HULL':
            score = 10;
            break;
        case 'DESTROY':
            score = 20;
            break;
        default:
            score = 5; // Base value for unknown cards
    }

    // Prefer lower cost cards for efficiency
    score -= card.cost;

    return score;
};

// Specialized handlers for unique effects

const resolveDroneAbilityEffect = (effect, userDrone, targetDrone, playerStates, placedSections, callbacks) => {
    switch (effect.type) {
        case 'HEAL':
            return resolveUnifiedHealEffect(effect, userDrone, targetDrone, 'player1', playerStates, placedSections, callbacks);
        case 'DAMAGE':
            return resolveUnifiedDamageEffect(effect, userDrone, targetDrone, 'player1', playerStates, placedSections, callbacks);
        default:
            console.warn(`Unknown drone ability effect type: ${effect.type}`);
            return { newPlayerStates: playerStates, additionalEffects: [] };
    }
};

const resolveShipAbilityEffect = (effect, sectionName, target, playerStates, placedSections, callbacks) => {
    const shipSource = { name: sectionName };

    switch (effect.type) {
        case 'DAMAGE':
            return resolveUnifiedDamageEffect(effect, shipSource, target, 'player1', playerStates, placedSections, callbacks);
        case 'RECALL_DRONE':
            return resolveShipRecallEffect(effect, sectionName, target, playerStates, placedSections, callbacks);
        case 'DRAW_THEN_DISCARD':
            return resolveUnifiedDrawEffect(effect, shipSource, target, 'player1', playerStates, placedSections, callbacks);
        default:
            console.warn(`Unknown ship ability effect type: ${effect.type}`);
            return { newPlayerStates: playerStates, additionalEffects: [] };
    }
};

const resolveShipRecallEffect = (effect, sectionName, target, playerStates, placedSections, callbacks) => {
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const lane = getLaneOfDrone(target.id, newPlayerStates.player1);
    if (lane) {
        newPlayerStates.player1.dronesOnBoard[lane] = newPlayerStates.player1.dronesOnBoard[lane].filter(d => d.id !== target.id);
        Object.assign(newPlayerStates.player1, onDroneRecalled(newPlayerStates.player1, target));
        newPlayerStates.player1.dronesOnBoard = updateAuras(newPlayerStates.player1, newPlayerStates.player2, placedSections);
    }

    return {
        newPlayerStates,
        additionalEffects: []
    };
};

const resolveAttack = (attackDetails, playerStates, placedSections, logCallback, explosionCallback, hitAnimationCallback) => {
    const { attacker, target, targetType, interceptor, attackingPlayer, abilityDamage, goAgain, damageType, lane } = attackDetails;
    const isAbilityOrCard = abilityDamage !== undefined;

    const finalTarget = interceptor || target;
    const finalTargetType = interceptor ? 'drone' : targetType;

    const attackingPlayerId = attackingPlayer;
    const defendingPlayerId = finalTarget.owner || (attackingPlayerId === 'player1' ? 'player2' : 'player1');

    const attackerPlayerState = playerStates[attackingPlayerId];
    const defenderPlayerState = playerStates[defendingPlayerId];

    // Calculate attacker stats (skip for card/ability attacks)
    let attackerLane = null;
    let effectiveAttacker = null;

    if (!isAbilityOrCard && attacker && attacker.id) {
        attackerLane = getLaneOfDrone(attacker.id, attackerPlayerState);
        effectiveAttacker = calculateEffectiveStats(
            attacker,
            attackerLane,
            attackerPlayerState,
            defenderPlayerState,
            placedSections
        );
    }

    // Calculate damage
    let damage = abilityDamage ?? (effectiveAttacker ? Math.max(0, effectiveAttacker.attack) : 0);
    let finalDamageType = damageType || (attacker ? attacker.damageType : undefined);
    if (effectiveAttacker && effectiveAttacker.keywords && effectiveAttacker.keywords.has('PIERCING')) {
        finalDamageType = 'PIERCING';
    }

    // Apply ship damage bonus for drones attacking sections
    if (finalTargetType === 'section' && !abilityDamage && attacker && attacker.name) {
        const baseAttacker = fullDroneCollection.find(d => d.name === attacker.name);
        baseAttacker?.abilities?.forEach(ability => {
            if (ability.type === 'PASSIVE' && ability.effect.type === 'BONUS_DAMAGE_VS_SHIP') {
                damage += ability.effect.value;
            }
        });
    }

    // Calculate damage breakdown
    let shieldDamage = 0;
    let hullDamage = 0;
    let wasDestroyed = false;
    let remainingShields = 0;
    let remainingHull = 0;

    if (finalTargetType === 'drone') {
        let targetInState = null;
        for (const laneKey in defenderPlayerState.dronesOnBoard) {
            targetInState = defenderPlayerState.dronesOnBoard[laneKey].find(d => d.id === finalTarget.id);
            if (targetInState) break;
        }
        if (targetInState) {
            let remainingDamage = damage;
            if (finalDamageType !== 'PIERCING') {
                shieldDamage = Math.min(damage, targetInState.currentShields);
                remainingDamage -= shieldDamage;
            }
            hullDamage = Math.min(remainingDamage, targetInState.hull);
            wasDestroyed = (targetInState.hull - hullDamage) <= 0;
            remainingShields = targetInState.currentShields - shieldDamage;
            remainingHull = wasDestroyed ? 0 : targetInState.hull - hullDamage;
        }
    } else {
        const sectionInState = defenderPlayerState.shipSections[finalTarget.name];
        if (sectionInState) {
            let remainingDamage = damage;
            if (finalDamageType !== 'PIERCING') {
                shieldDamage = Math.min(damage, sectionInState.allocatedShields);
                remainingDamage -= shieldDamage;
            }
            hullDamage = Math.min(remainingDamage, sectionInState.hull);
            wasDestroyed = (sectionInState.hull - hullDamage) <= 0;
            remainingShields = sectionInState.allocatedShields - shieldDamage;
            remainingHull = wasDestroyed ? 0 : sectionInState.hull - hullDamage;
        }
    }

    // Create outcome message
    const outcome = `Dealt ${shieldDamage} shield and ${hullDamage} hull damage to ${finalTarget.name}.` +
        (finalTargetType === 'drone' ?
            (wasDestroyed ? ` ${finalTarget.name} Destroyed.` : ` ${finalTarget.name} has ${remainingShields} shields and ${remainingHull} hull left.`)
            : '');

    // Log the attack
    const laneForLog = attackerLane || (lane ? lane.replace('lane', 'Lane ') : null);
    const targetForLog = finalTargetType === 'drone' ? `${finalTarget.name} (${laneForLog})` : finalTarget.name;
    const sourceForLog = attacker && attacker.name ? `${attacker.name} (${laneForLog})` : 'Card Effect';

    if (logCallback) {
        logCallback({
            player: playerStates[attackingPlayerId].name,
            actionType: 'ATTACK',
            source: sourceForLog,
            target: targetForLog,
            outcome: outcome
        });
    }

    // Create updated player states
    const newPlayerStates = {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    // Apply damage to defender
    if (finalTargetType === 'drone') {
        let droneDestroyed = false;
        for (const laneKey in newPlayerStates[defendingPlayerId].dronesOnBoard) {
            const targetIndex = newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey].findIndex(d => d.id === finalTarget.id);
            if (targetIndex !== -1) {
                if ((newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey][targetIndex].hull - hullDamage) <= 0) {
                    droneDestroyed = true;
                    if (explosionCallback) explosionCallback(finalTarget.id);
                    const destroyedDrone = newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey][targetIndex];
                    newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey] =
                        newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey].filter(d => d.id !== finalTarget.id);
                    Object.assign(newPlayerStates[defendingPlayerId], onDroneDestroyed(newPlayerStates[defendingPlayerId], destroyedDrone));
                } else {
                    if (hitAnimationCallback) hitAnimationCallback(finalTarget.id);
                    newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey][targetIndex].hull -= hullDamage;
                    newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey][targetIndex].currentShields -= shieldDamage;
                }
                break;
            }
        }
        if (droneDestroyed) {
            const opponentState = defendingPlayerId === 'player1' ? newPlayerStates.player2 : newPlayerStates.player1;
            newPlayerStates[defendingPlayerId].dronesOnBoard = updateAuras(
                newPlayerStates[defendingPlayerId],
                opponentState,
                placedSections
            );
        }
    } else {
        // Ship section damage
        newPlayerStates[defendingPlayerId].shipSections[finalTarget.name].hull -= hullDamage;
        newPlayerStates[defendingPlayerId].shipSections[finalTarget.name].allocatedShields -= shieldDamage;
        const defenderSections = defendingPlayerId === 'player1' ? placedSections.player1 : placedSections.player2;
        const newEffectiveStats = calculateEffectiveShipStats(newPlayerStates[defendingPlayerId], defenderSections).totals;
        if (newPlayerStates[defendingPlayerId].energy > newEffectiveStats.maxEnergy) {
            newPlayerStates[defendingPlayerId].energy = newEffectiveStats.maxEnergy;
        }
    }

    // Handle attacker exhaustion and after-attack effects
    let afterAttackEffects = [];
    if (!isAbilityOrCard && attacker && attacker.id) {
        let droneWasOnBoard = false;
        for (const laneKey in newPlayerStates[attackingPlayerId].dronesOnBoard) {
            const attackerIndex = newPlayerStates[attackingPlayerId].dronesOnBoard[laneKey].findIndex(d => d.id === attacker.id);
            if (attackerIndex !== -1) {
                newPlayerStates[attackingPlayerId].dronesOnBoard[laneKey][attackerIndex].isExhausted = true;
                droneWasOnBoard = true;
                break;
            }
        }

        if (droneWasOnBoard) {
            const result = calculateAfterAttackStateAndEffects(newPlayerStates[attackingPlayerId], attacker);
            newPlayerStates[attackingPlayerId] = result.newState;
            afterAttackEffects = result.effects;
        }
    }

    // Handle interceptor exhaustion
    if (interceptor) {
        const interceptorPlayerId = attackingPlayerId === 'player1' ? 'player2' : 'player1';
        for (const laneKey in newPlayerStates[interceptorPlayerId].dronesOnBoard) {
            const interceptorIndex = newPlayerStates[interceptorPlayerId].dronesOnBoard[laneKey].findIndex(d => d.id === interceptor.id);
            if (interceptorIndex !== -1) {
                const effectiveStats = calculateEffectiveStats(
                    newPlayerStates[interceptorPlayerId].dronesOnBoard[laneKey][interceptorIndex],
                    laneKey,
                    newPlayerStates[interceptorPlayerId],
                    newPlayerStates[attackingPlayerId],
                    placedSections
                );
                if (!effectiveStats.keywords.has('DEFENDER')) {
                    newPlayerStates[interceptorPlayerId].dronesOnBoard[laneKey][interceptorIndex].isExhausted = true;
                }
                break;
            }
        }
    }

    return {
        newPlayerStates,
        attackResult: {
            attackerName: attacker && attacker.name ? attacker.name : 'Card Effect',
            lane: attackerLane || lane,
            targetName: finalTarget.name,
            targetType: finalTargetType,
            interceptorName: interceptor ? interceptor.name : null,
            shieldDamage,
            hullDamage,
            wasDestroyed,
            remainingShields,
            remainingHull,
            outcome,
            shouldEndTurn: attackingPlayerId === 'player1' && !goAgain
        },
        afterAttackEffects
    };
};

const drawPlayerCards = (playerState, placedSections) => {
    // Draw cards to hand limit, handling deck shuffling
    const effectiveStats = calculateEffectiveShipStats(playerState, placedSections).totals;
    let newDeck = [...playerState.deck];
    let newHand = [...playerState.hand];
    let newDiscardPile = [...playerState.discardPile];
    const handSize = effectiveStats.handLimit;

    while (newHand.length < handSize) {
        if (newDeck.length === 0) {
            if (newDiscardPile.length > 0) {
                newDeck = [...newDiscardPile].sort(() => 0.5 - Math.random());
                newDiscardPile = [];
            } else {
                break;
            }
        }
        const drawnCard = newDeck.pop();
        newHand.push(drawnCard);
    }

    return {
        ...playerState,
        deck: newDeck,
        hand: newHand,
        discardPile: newDiscardPile
    };
};

const determineFirstPlayer = (turn, firstPlayerOverride, firstPasserOfPreviousRound) => {
    // Determine who goes first this round
    if (firstPlayerOverride) {
        return firstPlayerOverride;
    }
    if (turn === 1) {
        return Math.random() < 0.5 ? 'player1' : 'player2';
    }
    return firstPasserOfPreviousRound || 'player1';
};

const enforceHandLimit = (playerState, handLimit) => {
    if (playerState.hand.length <= handLimit) {
        return { ...playerState, discardCount: 0 };
    }

    let newHand = [...playerState.hand];
    const newDiscardPile = [...playerState.discardPile];
    const discardCount = newHand.length - handLimit;

    for (let i = 0; i < discardCount; i++) {
        const cardToDiscard = newHand.splice(Math.floor(Math.random() * newHand.length), 1)[0];
        newDiscardPile.push(cardToDiscard);
    }

    return {
        ...playerState,
        hand: newHand,
        discardPile: newDiscardPile,
        discardCount
    };
};

const checkHandLimitCompliance = (player1State, player2State, player1Stats, player2Stats) => {
    const player1Violations = player1State.hand.length > player1Stats.handLimit;
    const player2Violations = player2State.hand.length > player2Stats.handLimit;

    return {
        player1NeedsDiscard: player1Violations,
        player1DiscardCount: player1Violations ? player1State.hand.length - player1Stats.handLimit : 0,
        player2NeedsDiscard: player2Violations,
        player2DiscardCount: player2Violations ? player2State.hand.length - player2Stats.handLimit : 0
    };
};

// ========================================
// CONSOLIDATED HAND LIMIT FUNCTIONS
// ========================================

/**
 * Check hand limit violations for both players
 * Pure function that determines if either player needs to discard
 * @param {Object} playerStates - { player1: playerState, player2: playerState }
 * @param {Object} effectiveStats - { player1: stats, player2: stats }
 * @returns {Object} Violation information for both players
 */
const checkHandLimitViolations = (playerStates, effectiveStats) => {
    const violations = {};

    for (const playerId of ['player1', 'player2']) {
        const playerState = playerStates[playerId];
        const stats = effectiveStats[playerId];

        const hasViolation = playerState.hand.length > stats.totals.handLimit;
        const discardCount = hasViolation ? playerState.hand.length - stats.totals.handLimit : 0;

        violations[playerId] = {
            needsDiscard: hasViolation,
            discardCount: discardCount,
            currentHandSize: playerState.hand.length,
            handLimit: stats.totals.handLimit
        };
    }

    violations.hasAnyViolations = violations.player1.needsDiscard || violations.player2.needsDiscard;

    return violations;
};

/**
 * Enforce hand limits by automatically discarding excess cards
 * Pure function that returns new player state with hand limit enforced
 * @param {Object} playerState - Current player state
 * @param {number} handLimit - Maximum allowed hand size
 * @returns {Object} New player state with enforced hand limit
 */
const enforceHandLimits = (playerState, handLimit) => {
    if (playerState.hand.length <= handLimit) {
        return {
            ...playerState,
            discardCount: 0
        };
    }

    const newHand = [...playerState.hand];
    const newDiscardPile = [...playerState.discardPile];
    const discardCount = newHand.length - handLimit;

    // Randomly discard excess cards
    for (let i = 0; i < discardCount; i++) {
        if (newHand.length > 0) {
            const randomIndex = Math.floor(Math.random() * newHand.length);
            const cardToDiscard = newHand.splice(randomIndex, 1)[0];
            newDiscardPile.push(cardToDiscard);
        }
    }

    return {
        ...playerState,
        hand: newHand,
        discardPile: newDiscardPile,
        discardCount: discardCount
    };
};

/**
 * Process discard phase for a player
 * Pure function that handles voluntary card discarding
 * @param {Object} playerState - Current player state
 * @param {number} discardCount - Number of cards to discard
 * @param {Array} cardsToDiscard - Optional specific cards to discard
 * @returns {Object} New player state after discarding
 */
const processDiscardPhase = (playerState, discardCount, cardsToDiscard = null) => {
    if (discardCount <= 0) {
        return {
            ...playerState,
            discardCount: 0
        };
    }

    const newHand = [...playerState.hand];
    const newDiscardPile = [...playerState.discardPile];
    let actualDiscardCount = 0;

    if (cardsToDiscard && cardsToDiscard.length > 0) {
        // Discard specific cards
        cardsToDiscard.forEach(card => {
            const cardIndex = newHand.findIndex(handCard =>
                handCard.instanceId === card.instanceId ||
                (handCard.name === card.name && handCard.id === card.id)
            );

            if (cardIndex !== -1 && actualDiscardCount < discardCount) {
                const discardedCard = newHand.splice(cardIndex, 1)[0];
                newDiscardPile.push(discardedCard);
                actualDiscardCount++;
            }
        });
    } else {
        // Random discard if no specific cards provided
        for (let i = 0; i < discardCount && newHand.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * newHand.length);
            const cardToDiscard = newHand.splice(randomIndex, 1)[0];
            newDiscardPile.push(cardToDiscard);
            actualDiscardCount++;
        }
    }

    return {
        ...playerState,
        hand: newHand,
        discardPile: newDiscardPile,
        discardCount: actualDiscardCount
    };
};

// ========================================
// TARGETING LOGIC FUNCTIONS
// ========================================

const calculateMultiSelectTargets = (multiSelectState, playerState) => {
    const { phase, sourceLane, card } = multiSelectState;
    let targets = [];

    if (card.effect.type === 'SINGLE_MOVE') {
        if (phase === 'select_drone') {
            // Target all friendly, non-exhausted drones
            Object.values(playerState.dronesOnBoard).flat().forEach(drone => {
                if (!drone.isExhausted) {
                    targets.push({ ...drone, owner: 'player1' });
                }
            });
        } else if (phase === 'select_destination') {
            // Target adjacent lanes
            const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);
            ['lane1', 'lane2', 'lane3'].forEach(laneId => {
                const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
                const isAdjacent = Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
                if (isAdjacent) {
                    targets.push({ id: laneId, owner: 'player1' });
                }
            });
        }
    } else if (phase === 'select_source_lane') {
        // Target friendly lanes that have at least one drone
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            if (playerState.dronesOnBoard[laneId].length > 0) {
                targets.push({ id: laneId, owner: 'player1' });
            }
        });
    } else if (phase === 'select_drones') {
        // Target non-exhausted drones within the selected source lane
        playerState.dronesOnBoard[sourceLane]
            .filter(drone => !drone.isExhausted)
            .forEach(drone => {
                targets.push({ ...drone, owner: 'player1' });
            });
    } else if (phase === 'select_destination_lane') {
        // Target ADJACENT friendly lanes
        const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
            const isAdjacent = Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
            if (isAdjacent) {
                targets.push({ id: laneId, owner: 'player1' });
            }
        });
    }

    return targets;
};

const calculateUpgradeTargets = (selectedCard, playerState, fullDroneCollection) => {
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

const calculateMultiMoveTargets = (multiSelectState, playerState) => {
    let targets = [];
    const { phase, sourceLane } = multiSelectState || { phase: 'select_source_lane' };

    if (phase === 'select_source_lane') {
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            if (playerState.dronesOnBoard[laneId].length > 0) {
                targets.push({ id: laneId, owner: 'player1' });
            }
        });
    } else if (phase === 'select_drones') {
        playerState.dronesOnBoard[sourceLane]?.forEach(drone => {
            targets.push({ ...drone, owner: 'player1' });
        });
    } else if (phase === 'select_destination_lane') {
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
            if (laneId !== sourceLane) {
                targets.push({ id: laneId, owner: 'player1' });
            }
        });
    }

    return targets;
};

const calculateAllValidTargets = (abilityMode, shipAbilityMode, multiSelectState, selectedCard, player1, player2, fullDroneCollection) => {
    let validAbilityTargets = [];
    let validCardTargets = [];

    if (abilityMode) {
        validAbilityTargets = getValidTargets('player1', abilityMode.drone, abilityMode.ability, player1, player2);
    } else if (shipAbilityMode) {
        validAbilityTargets = getValidTargets('player1', { id: shipAbilityMode.sectionName }, shipAbilityMode.ability, player1, player2);
    } else if (multiSelectState) {
        validCardTargets = calculateMultiSelectTargets(multiSelectState, player1);
    } else if (selectedCard) {
        if (selectedCard.type === 'Upgrade') {
            validCardTargets = calculateUpgradeTargets(selectedCard, player1, fullDroneCollection);
        } else if (selectedCard.effect.type === 'MULTI_MOVE') {
            validCardTargets = calculateMultiMoveTargets(multiSelectState, player1);
        } else {
            validCardTargets = getValidTargets('player1', null, selectedCard, player1, player2);
        }
    }

    return { validAbilityTargets, validCardTargets };
};

// ========================================
// UI EFFECT CREATION FUNCTIONS
// ========================================
// Pure functions that return UI effect descriptions for multiplayer compatibility

const createExplosionEffect = (targetId) => {
    return {
        type: 'EXPLOSION',
        targetId,
        duration: 1000,
        timestamp: Date.now()
    };
};

const createTurnEndEffects = (actingPlayer, passInfo, turnPhase, winner) => {
    const transition = calculateTurnTransition(actingPlayer, passInfo, turnPhase, winner);

    const uiEffects = [];

    switch (transition.type) {
        case 'CHANGE_PLAYER':
            if (transition.nextPlayer === 'player1') {
                uiEffects.push({ type: 'CLOSE_MODAL' });
            } else if (transition.showOpponentModal) {
                uiEffects.push({
                    type: 'SHOW_MODAL',
                    modal: {
                        title: "Opponent's Turn",
                        text: "The AI is taking its turn.",
                        isBlocking: false,
                        onClose: null
                    }
                });
            }
            break;
    }

    if (transition.triggerAi) {
        uiEffects.push({ type: 'TRIGGER_AI' });
    }

    return {
        transition,
        uiEffects
    };
};

// ========================================
// GAME ENGINE EXPORT
// ========================================
// All functions exported for use by App.jsx and multiplayer server

export const gameEngine = {
  // --- Core State Management ---
  initialPlayerState,
  buildDeckFromList,
  getEffectiveSectionMaxShields,
  getShipStatus,
  onDroneDestroyed,
  onDroneRecalled,
  checkWinCondition,

  // --- Stats and Calculations ---
  calculateAfterAttackStateAndEffects,
  applyOnMoveEffects,
  updateAuras,
  getLaneOfDrone,

  // --- Targeting and Validation ---
  getValidTargets,
  calculateAllValidTargets,
  calculateMultiSelectTargets,
  calculateUpgradeTargets,
  calculateMultiMoveTargets,
  validateDeployment,
  validateShieldRemoval,
  validateShieldAddition,
  executeShieldReallocation,
  getValidShieldReallocationTargets,

  // --- Shield Allocation System ---
  processShieldAllocation,
  processResetShieldAllocation,
  processEndShieldAllocation,

  // --- Action Resolution ---
  resolveAttack,
  resolveAbility,
  resolveShipAbility,
  executeDeployment,
  resolveCardPlay,
  finishCardPlay,
  resolveMultiMove,
  resolveSingleMove,

  // --- Game State Monitoring ---
  checkGameStateForWinner,
  calculatePotentialInterceptors,
  calculateAiInterception,

  // --- Turn and Round Management ---
  calculateTurnTransition,
  calculatePassTransition,
  readyDronesAndRestoreShields,
  calculateNewRoundPlayerState,
  drawToHandLimit,
  drawPlayerCards,
  determineFirstPlayer,
  enforceHandLimit,
  checkHandLimitCompliance,
  // --- Consolidated Hand Limit Functions ---
  checkHandLimitViolations,
  enforceHandLimits,
  processDiscardPhase,

  // --- Enhanced Turn Transition System ---
  processTurnTransition,
  processPhaseChange,
  processRoundStart,

  // --- UI Effects (for multiplayer compatibility) ---
  createExplosionEffect,
  createTurnEndEffects,

  // --- Unified Effect Handlers ---
  resolveUnifiedDamageEffect,
  resolveUnifiedHealEffect,
  resolveUnifiedDrawEffect,
  resolveSearchAndDrawEffect,

  // --- Specialized Effect Handlers ---
  resolveDroneAbilityEffect,
  resolveShipAbilityEffect,
  resolveShipRecallEffect,

  // --- AI Systems ---
  executeAiDeployment,
  executeAiTurn,
  executeAiAction
};