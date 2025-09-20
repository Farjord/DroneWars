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
};