import fullDroneCollection from '../data/droneData.js';
import fullCardCollection from '../data/cardData.js';
import shipSectionData from '../data/shipData.js';

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

const initialPlayerState = (name, decklist) => {
    const healthyStats = calculateEffectiveShipStats({ shipSections: shipSectionData }, []).totals;

    return {
        name: name,
        shipSections: shipSectionData,
        energy: healthyStats.energyPerTurn,
        initialDeploymentBudget: healthyStats.initialDeployment,
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

const calculateEffectiveShipStats = (playerState, placedSections = []) => {
    const defaultReturn = {
      totals: { handLimit: 0, discardLimit: 0, energyPerTurn: 0, maxEnergy: 0, shieldsPerTurn: 0, initialDeployment: 0, deploymentBudget: 0, cpuLimit: 0 },
      bySection: {}
    };

    if (!playerState || !playerState.shipSections) {
        return defaultReturn;
    }

    const sectionStats = {};
    for (const sectionName in playerState.shipSections) {
      const section = playerState.shipSections[sectionName];
      // --- FIX 1: Call the function directly ---
      const status = getShipStatus(section);
      const currentStats = { ...section.stats[status] };
      const laneIndex = placedSections.indexOf(sectionName);

      if (laneIndex === 1 && section.middleLaneBonus) {
        for (const statKey in section.middleLaneBonus) {
          if (currentStats.hasOwnProperty(statKey)) {
            currentStats[statKey] += section.middleLaneBonus[statKey];
          }
        }
      }
      sectionStats[sectionName] = currentStats;
    }

    const totals = {
        handLimit: 0, discardLimit: 0, energyPerTurn: 0, maxEnergy: 0, 
        shieldsPerTurn: 0, initialDeployment: 0, deploymentBudget: 0, cpuLimit: 0 
    };
    
    for (const stats of Object.values(sectionStats)) {
        totals.handLimit += stats['Draw'] || 0;
        totals.discardLimit += stats['Discard'] || 0;
        totals.energyPerTurn += stats['Energy Per Turn'] || 0;
        totals.maxEnergy += stats['Max Energy'] || 0;
        totals.shieldsPerTurn += stats['Shields Per Turn'] || 0;
        totals.initialDeployment += stats['Initial Deployment'] || 0;
        totals.deploymentBudget += stats['Deployment Budget'] || 0;
        totals.cpuLimit += stats['CPU Control Value'] || 0;
    }

    return {
      totals: totals,
      bySection: sectionStats
    };
};

// --- FIX 2: Remove the useCallback wrapper ---
const calculateEffectiveStats = (drone, lane, playerState, opponentState, allPlacedSections) => {
    if (!drone || !lane || !playerState || !opponentState || !allPlacedSections) {
        return { attack: 0, speed: 0, hull: 0, maxShields: 0, baseAttack: 0, baseSpeed: 0, keywords: new Set() };
    }
  
    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
    if (!baseDrone) return { ...drone, baseAttack: drone.attack, baseSpeed: drone.speed, maxShields: 0, keywords: new Set() };
  
    const upgrades = playerState.appliedUpgrades[drone.name] || [];
    let baseAttack = baseDrone.attack;
    let baseSpeed = baseDrone.speed;

    upgrades.forEach(upgrade => {
        if (upgrade.mod.stat === 'attack') baseAttack += upgrade.mod.value;
        if (upgrade.mod.stat === 'speed') baseSpeed += upgrade.mod.value;
    });

    let effectiveStats = {
      ...drone,
      attack: baseAttack,
      speed: baseSpeed,
      maxShields: baseDrone.shields,
      baseAttack: baseDrone.attack,
      baseSpeed: baseDrone.speed,
      keywords: new Set()
    };
  
    drone.statMods?.forEach(mod => {
      if (mod.stat === 'attack') effectiveStats.attack += mod.value;
      if (mod.stat === 'speed') effectiveStats.speed += mod.value;
    });
  
    baseDrone.abilities?.forEach(ability => {
      if (ability.type !== 'PASSIVE') return;
  
      if (ability.effect.type === 'GRANT_KEYWORD') {
        effectiveStats.keywords.add(ability.effect.keyword);
      }
       
      if (ability.effect.type === 'CONDITIONAL_MODIFY_STAT') {
        const { condition, mod } = ability.effect;
        let conditionMet = false;

        if (condition.type === 'SHIP_SECTION_HULL_DAMAGED' && condition.location === 'SAME_LANE') {
          const laneIndex = parseInt(lane.slice(-1)) - 1;
          
          // --- ANOTHER FIX: Corrected variable names ---
          const sectionsForPlayer = playerState.name === 'Player 1' ? allPlacedSections.player1 : allPlacedSections.player2;
          const sectionName = sectionsForPlayer[laneIndex];
          
          if (sectionName) {
            const shipSection = playerState.shipSections[sectionName];
            const status = getShipStatus(shipSection); // Call directly
            if (status === 'damaged' || status === 'critical') {
              conditionMet = true;
            }
          }
        }
        
        if (conditionMet) {
          if (mod.stat === 'attack') effectiveStats.attack += mod.value;
        }
      }

      if (ability.effect.type === 'CONDITIONAL_MODIFY_STAT_SCALING') {
        const { condition, mod } = ability.effect;
        let scaleFactor = 0;

        if (condition.type === 'OWN_DAMAGED_SECTIONS') {
          for (const sectionName in playerState.shipSections) {
            const shipSection = playerState.shipSections[sectionName];
            const status = getShipStatus(shipSection); // Call directly
            if (status === 'damaged' || status === 'critical') {
              scaleFactor++;
            }
          }
        }
        
        if (scaleFactor > 0) {
          if (mod.stat === 'attack') effectiveStats.attack += (mod.value * scaleFactor);
          if (mod.stat === 'speed') effectiveStats.speed += (mod.value * scaleFactor);
        }
      }

      if (ability.effect.type === 'BONUS_DAMAGE_VS_SHIP') {
        effectiveStats.potentialShipDamage = (effectiveStats.potentialShipDamage || 0) + ability.effect.value;
      }

      if (ability.effect.type === 'FLANKING_BONUS') {
        if (lane === 'lane1' || lane === 'lane3') {
          ability.effect.mods.forEach(mod => {
            if (mod.stat === 'attack') effectiveStats.attack += mod.value;
            if (mod.stat === 'speed') effectiveStats.speed += mod.value;
          });
        }
      }
    });
  
    playerState.dronesOnBoard[lane]?.forEach(otherDrone => {
      if (otherDrone.id === drone.id) return;
      const otherBaseDrone = fullDroneCollection.find(d => d.name === otherDrone.name);
      otherBaseDrone?.abilities?.forEach(ability => {
        if (ability.type === 'PASSIVE' && ability.scope === 'FRIENDLY_IN_LANE' && ability.effect.type === 'MODIFY_STAT') {
          const { stat, value } = ability.effect;
          if (stat === 'shields') {
            effectiveStats.maxShields += value;
          } else if (stat === 'attack') {
            effectiveStats.attack += value;
          } else if (stat === 'speed') {
            effectiveStats.speed += value;
          }
        }
      });
    });
  
    return effectiveStats;
};


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
        targets.push({ id: laneId, owner: 'player1' });
        targets.push({ id: laneId, owner: 'player2' });
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

    // Apply effects
    if (effect.type === 'HEAL') {
        if (effect.scope === 'LANE') {
            const targetLaneId = targetDrone.id;
            if (newPlayerStates.player1.dronesOnBoard[targetLaneId]) {
                newPlayerStates.player1.dronesOnBoard[targetLaneId].forEach(droneInLane => {
                    const baseDrone = fullDroneCollection.find(d => d.name === droneInLane.name);
                    if (baseDrone && droneInLane.hull < baseDrone.hull) {
                        droneInLane.hull = Math.min(baseDrone.hull, droneInLane.hull + effect.value);
                    }
                });
            }
        } else {
            const baseTarget = fullDroneCollection.find(d => d.name === targetDrone.name);
            const targetLaneId = getLaneOfDrone(targetDrone.id, newPlayerStates.player1);
            if (targetLaneId) {
                const droneIndex = newPlayerStates.player1.dronesOnBoard[targetLaneId].findIndex(d => d.id === targetDrone.id);
                if (droneIndex !== -1) {
                    newPlayerStates.player1.dronesOnBoard[targetLaneId][droneIndex].hull = Math.min(baseTarget.hull, newPlayerStates.player1.dronesOnBoard[targetLaneId][droneIndex].hull + effect.value);
                }
            }
        }
    } else if (effect.type === 'DAMAGE') {
        const targetLane = getLaneOfDrone(targetDrone.id, playerStates.player2);
        if (targetLane && resolveAttackCallback) {
            resolveAttackCallback({
                attacker: userDrone,
                target: targetDrone,
                targetType: 'drone',
                attackingPlayer: 'player1',
                abilityDamage: effect.value,
                lane: targetLane,
                damageType: effect.damageType,
            }, true);
            return { newPlayerStates, shouldEndTurn: !effect.goAgain }; // Return early since attack will be handled separately
        }
    } else if (effect.type === 'GAIN_ENERGY') {
        const effectiveStatsP1 = calculateEffectiveShipStats(newPlayerStates.player1, placedSections.player1).totals;
        if (newPlayerStates.player1.energy < effectiveStatsP1.maxEnergy) {
            newPlayerStates.player1.energy = Math.min(effectiveStatsP1.maxEnergy, newPlayerStates.player1.energy + effect.value);
        }
    }

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

    if (effect.type === 'DAMAGE') {
        if (resolveAttackCallback) {
            resolveAttackCallback({
                attacker: { name: sectionName },
                target: target,
                targetType: 'drone',
                attackingPlayer: 'player1',
                abilityDamage: effect.value,
                lane: getLaneOfDrone(target.id, playerStates.player2),
                damageType: effect.damageType
            }, true);
        }
    } else if (effect.type === 'RECALL_DRONE') {
        const lane = getLaneOfDrone(target.id, newPlayerStates.player1);
        if (lane) {
            newPlayerStates.player1.dronesOnBoard[lane] = newPlayerStates.player1.dronesOnBoard[lane].filter(d => d.id !== target.id);
            Object.assign(newPlayerStates.player1, onDroneRecalled(newPlayerStates.player1, target));
            newPlayerStates.player1.dronesOnBoard = updateAuras(newPlayerStates.player1, newPlayerStates.player2, placedSections);
        }
    } else if (effect.type === 'DRAW_THEN_DISCARD') {
        let newDeck = [...newPlayerStates.player1.deck];
        let newHand = [...newPlayerStates.player1.hand];
        let newDiscard = [...newPlayerStates.player1.discardPile];

        for (let i = 0; i < effect.value.draw; i++) {
            if (newDeck.length === 0 && newDiscard.length > 0) {
                newDeck = [...newDiscard].sort(() => 0.5 - Math.random());
                newDiscard = [];
            }
            if (newDeck.length > 0) {
                newHand.push(newDeck.pop());
            }
        }
        newPlayerStates.player1 = { ...newPlayerStates.player1, deck: newDeck, hand: newHand, discardPile: newDiscard };

        return {
            newPlayerStates,
            shouldEndTurn: false,
            mandatoryAction: { type: 'discard', player: 'player1', count: effect.value.discard, fromAbility: true }
        };
    } else if (effect.type === 'REALLOCATE_SHIELDS') {
        // Shield reallocation will be handled separately
        return {
            newPlayerStates,
            shouldEndTurn: false,
            requiresShieldReallocation: true
        };
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

const resolveAttack = (attackDetails, playerStates, placedSections, logCallback, explosionCallback, hitAnimationCallback) => {
    const { attacker, target, targetType, interceptor, attackingPlayer, abilityDamage, goAgain, damageType, lane } = attackDetails;
    const isAbilityOrCard = abilityDamage !== undefined;

    const finalTarget = interceptor || target;
    const finalTargetType = interceptor ? 'drone' : targetType;

    const attackingPlayerId = attackingPlayer;
    const defendingPlayerId = finalTarget.owner || (attackingPlayerId === 'player1' ? 'player2' : 'player1');

    const attackerPlayerState = playerStates[attackingPlayerId];
    const defenderPlayerState = playerStates[defendingPlayerId];

    // Calculate attacker stats
    const attackerLane = getLaneOfDrone(attacker.id, attackerPlayerState);
    const effectiveAttacker = calculateEffectiveStats(
        attacker,
        attackerLane,
        attackerPlayerState,
        defenderPlayerState,
        placedSections
    );

    // Calculate damage
    let damage = abilityDamage ?? Math.max(0, effectiveAttacker.attack);
    let finalDamageType = damageType || attacker.damageType;
    if (effectiveAttacker.keywords.has('PIERCING')) {
        finalDamageType = 'PIERCING';
    }

    // Apply ship damage bonus for drones attacking sections
    if (finalTargetType === 'section' && !abilityDamage) {
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
    const sourceForLog = `${attacker.name} (${laneForLog})`;

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
    if (!isAbilityOrCard) {
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
            attackerName: attacker.name,
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


export const gameEngine = {
  initialPlayerState,
  buildDeckFromList,
  getEffectiveSectionMaxShields,
  getShipStatus,
  onDroneDestroyed,
  onDroneRecalled,
  checkWinCondition,
  calculateAfterAttackStateAndEffects,
  applyOnMoveEffects,
  calculateEffectiveShipStats,
  calculateEffectiveStats,
  updateAuras,
  getLaneOfDrone,
  getValidTargets,
  validateDeployment,
  validateShieldRemoval,
  validateShieldAddition,
  executeShieldReallocation,
  getValidShieldReallocationTargets,
  resolveAttack,
  resolveAbility,
  resolveShipAbility,
  executeDeployment
};