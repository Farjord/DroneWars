import fullDroneCollection from '../data/droneData.js';
import GameDataService from '../services/GameDataService.js';
import { debugLog } from '../utils/debugLogger.js';

// ========================================
// JAMMER DETECTION HELPERS
// ========================================

/**
 * Check if a drone has the Jammer keyword
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has Jammer ability
 */
const hasJammerKeyword = (drone) => {
  return drone.abilities?.some(ability =>
    ability.effect?.type === 'GRANT_KEYWORD' &&
    ability.effect?.keyword === 'JAMMER'
  );
};

/**
 * Check if a lane has any Jammer drones
 * @param {Object} playerState - Player state to check
 * @param {string} lane - Lane ID to check
 * @returns {boolean} True if lane contains at least one Jammer
 */
const hasJammerInLane = (playerState, lane) => {
  return (playerState.dronesOnBoard[lane] || []).some(hasJammerKeyword);
};

/**
 * Get all Jammer drones from a specific lane
 * @param {Object} playerState - Player state to check
 * @param {string} lane - Lane ID to check
 * @returns {Array} Array of Jammer drones in the lane
 */
const getJammerDronesInLane = (playerState, lane) => {
  return (playerState.dronesOnBoard[lane] || []).filter(hasJammerKeyword);
};

/**
 * Count drones of a specific type in a lane
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @param {string} laneId - Lane to check
 * @returns {number} Count of drones with matching name
 */
const countDroneTypeInLane = (playerState, droneName, laneId) => {
  if (!playerState.dronesOnBoard[laneId]) return 0;
  return playerState.dronesOnBoard[laneId].filter(d => d.name === droneName).length;
};

// ========================================
// LANE SCORING
// ========================================

 const calculateLaneScore = (laneId, player2State, player1State, allSections, getShipStatus, gameDataService) => {
 const aiDronesInLane = player2State.dronesOnBoard[laneId] || [];
 const humanDronesInLane = player1State.dronesOnBoard[laneId] || [];
 const laneIndex = parseInt(laneId.slice(-1)) - 1;

 const getPower = (drones, owner, opponent, sections) => drones.reduce((sum, drone) => {
 const stats = gameDataService.getEffectiveStats(drone, laneId);
 const threatValue = (stats.attack || 0) + (stats.potentialShipDamage || 0);
 return sum + threatValue + (drone.hull || 0) + (drone.currentShields || 0);
 }, 0);

  const aiPower = getPower(aiDronesInLane, player2State, player1State, allSections);
  const humanPower = getPower(humanDronesInLane, player1State, player2State, allSections);
  const baseScore = aiPower - humanPower;
  
  const getMaxSpeed = (drones, owner, opponent, sections) => {
    if (drones.length === 0) return 0;
    return Math.max(...drones.map(d => gameDataService.getEffectiveStats(d, laneId).speed));
  };
  
  const aiMaxSpeed = getMaxSpeed(aiDronesInLane, player2State, player1State, allSections);
  const humanMaxSpeed = getMaxSpeed(humanDronesInLane, player1State, player2State, allSections);
  const speedScore = (aiMaxSpeed - humanMaxSpeed) * 5;

  let healthModifier = 0;
  const aiSectionName = allSections.player2[laneIndex];
  if (aiSectionName) {
    const aiSectionStatus = getShipStatus(player2State.shipSections[aiSectionName]);
    if (aiSectionStatus === 'damaged') healthModifier -= 20;
    if (aiSectionStatus === 'critical') healthModifier -= 40;
  }
  const humanSectionName = allSections.player1[laneIndex];
  if (humanSectionName) {
    const humanSectionStatus = getShipStatus(player1State.shipSections[humanSectionName]);
    if (humanSectionStatus === 'damaged') healthModifier += 15;
    if (humanSectionStatus === 'critical') healthModifier += 30;
  }

  return baseScore + speedScore + healthModifier;
};

const handleOpponentTurn = ({ player1, player2, turn, placedSections, opponentPlacedSections, getShipStatus, gameStateManager, addLogEntry }) => {
    // Create GameDataService instance for centralized data computation
    const gameDataService = GameDataService.getInstance(gameStateManager);
    const effectiveStats = gameDataService.getEffectiveShipStats(player2, opponentPlacedSections).totals;
    const totalDrones = Object.values(player2.dronesOnBoard).flat().length;
    const availableResources = turn === 1
      ? (player2.initialDeploymentBudget + player2.energy)
      : (player2.deploymentBudget + player2.energy);

    const sortedHandByCost = [...player2.hand].sort((a, b) => b.cost - a.cost);
    const reservedEnergy = sortedHandByCost[0]?.cost || 0;

    debugLog('AI_DECISIONS', '[AI ENERGY DEBUG] Deployment energy management:', {
      currentEnergy: player2.energy,
      reservedEnergy: reservedEnergy,
      cardsInHand: player2.hand.map(card => ({ name: card.name, cost: card.cost })),
      mostExpensiveCard: sortedHandByCost[0]?.name || 'None',
      turn: turn,
      deploymentBudget: turn === 1 ? player2.initialDeploymentBudget : player2.deploymentBudget
    });

    const allPotentialDrones = player2.activeDronePool;
    const possibleDeployments = [];
    const lanes = ['lane1', 'lane2', 'lane3'];
    const allSections = { player1: placedSections, player2: opponentPlacedSections };

const currentLaneScores = {
  lane1: calculateLaneScore('lane1', player2, player1, allSections, getShipStatus, gameDataService),
  lane2: calculateLaneScore('lane2', player2, player1, allSections, getShipStatus, gameDataService),
  lane3: calculateLaneScore('lane3', player2, player1, allSections, getShipStatus, gameDataService),
};

    for (const drone of allPotentialDrones) {
      const droneCost = drone.class;
      let isAffordable = true;
      let reason = '';

      if (availableResources < droneCost) {
        isAffordable = false;
        reason = 'Insufficient total resources';
      } else if ((player2.deployedDroneCounts[drone.name] || 0) >= drone.limit) {
        isAffordable = false;
        reason = 'Deployment limit reached';
      } else if (totalDrones >= effectiveStats.cpuLimit) {
        isAffordable = false;
        reason = 'CPU limit reached';
      } else {
        const budget = turn === 1 ? player2.initialDeploymentBudget : player2.deploymentBudget;
        const budgetCost = Math.min(budget, droneCost);
        const energyCost = droneCost - budgetCost;
        const energyAfterDeployment = player2.energy - energyCost;

        if (energyAfterDeployment < reservedEnergy) {
          isAffordable = false;
          reason = `Reserves energy for cards (needs ${reservedEnergy})`;
          debugLog('AI_DECISIONS', `[AI ENERGY DEBUG] ${drone.name} rejected: energy after deployment (${energyAfterDeployment}) < reserved (${reservedEnergy})`);
        } else {
          debugLog('AI_DECISIONS', `[AI ENERGY DEBUG] ${drone.name} affordable: energy after deployment (${energyAfterDeployment}) >= reserved (${reservedEnergy})`);
        }
      }

      if (!isAffordable) {
        possibleDeployments.push({
          drone,
          laneId: 'N/A',
          score: -999,
          instigator: drone.name,
          targetName: 'N/A',
          logic: [reason],
        });
        continue;
      }

      for (const laneId of lanes) {
        const baseDrone = fullDroneCollection.find(d => d.name === drone.name);

        // Check maxPerLane restriction
        if (baseDrone.maxPerLane) {
          const currentCount = countDroneTypeInLane(player2, drone.name, laneId);
          if (currentCount >= baseDrone.maxPerLane) {
            // Skip this lane - already at max
            possibleDeployments.push({
              drone,
              laneId,
              score: -999,
              instigator: drone.name,
              targetName: laneId,
              logic: [`Max per lane reached (${currentCount}/${baseDrone.maxPerLane})`]
            });
            continue; // Skip to next lane
          }
        }

        const tempAiState = JSON.parse(JSON.stringify(player2));
        tempAiState.dronesOnBoard[laneId].push({ ...baseDrone, id: 'temp' });

        const projectedScore = calculateLaneScore(laneId, tempAiState, player1, allSections, getShipStatus, gameDataService);
        const impactScore = projectedScore - currentLaneScores[laneId];

        let strategicBonus = 0;
        const currentLaneScore = currentLaneScores[laneId];
        const droneKeywords = new Set(baseDrone.abilities.filter(a => a.effect.keyword).map(a => a.effect.keyword));

        if (currentLaneScore < -15) {
          if (drone.speed >= 4) strategicBonus += 15;
          if (droneKeywords.has('ALWAYS_INTERCEPTS') || droneKeywords.has('GUARDIAN')) strategicBonus += 20;
        } else if (currentLaneScore > 15) {
          if (drone.attack >= 4) strategicBonus += 15;
          if (baseDrone.abilities.some(a => a.effect.type === 'BONUS_DAMAGE_VS_SHIP')) strategicBonus += 20;
        } else {
          if (drone.class <= 1) strategicBonus += 10;
        }

        let stabilizationBonus = 0;
        if (currentLaneScore < 0 && projectedScore >= 0) {
          stabilizationBonus = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
        }

        let dominanceBonus = 0;
        if (projectedScore > 20 && currentLaneScore <= 20) {
          dominanceBonus = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
        }

        const logicArray = [
            `LaneScore: ${currentLaneScore.toFixed(0)}`,
            `Projected: ${projectedScore.toFixed(0)}`,
            `Impact: ${impactScore.toFixed(0)}`,
            `Bonus: ${strategicBonus.toFixed(0)}`,
            `Stabilize: ${stabilizationBonus.toFixed(0)}`,
            `Dominance: ${dominanceBonus.toFixed(0)}`
        ];

        let overkillPenalty = 0;
        const laneIndex = parseInt(laneId.slice(-1)) - 1;
        const humanSectionName = placedSections[laneIndex];
        if (humanSectionName) {
            const humanSectionStatus = getShipStatus(player1.shipSections[humanSectionName]);
            if ((humanSectionStatus === 'damaged' || humanSectionStatus === 'critical') && currentLaneScore > 5) {
                overkillPenalty = -150;
                logicArray.push(`Overkill Penalty: ${overkillPenalty}`);
            }
        }

        const finalScore = impactScore + strategicBonus + stabilizationBonus + dominanceBonus + overkillPenalty;

        possibleDeployments.push({
          drone,
          laneId,
          score: finalScore,
          instigator: drone.name,
          targetName: laneId,
          logic: logicArray,
        });
      }
    }

    const topScore = possibleDeployments.length > 0 ? Math.max(...possibleDeployments.map(a => a.score)) : -1;
    
    if (topScore < 5) {
      addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during deployment phase (no high-impact plays).` }, 'aiDeploymentPass', possibleDeployments);
      return { type: 'pass' };
    }

    const bestActions = possibleDeployments.filter(d => d.score === topScore);
    const chosenAction = bestActions[Math.floor(Math.random() * bestActions.length)];
    chosenAction.isChosen = true;
    
    return {
      type: 'deploy',
      payload: {
        droneToDeploy: chosenAction.drone,
        targetLane: chosenAction.laneId,
        logContext: possibleDeployments
      }
    };
};

const handleOpponentAction = ({ player1, player2, placedSections, opponentPlacedSections, getShipStatus, getLaneOfDrone, gameStateManager, getValidTargets, addLogEntry }) => {
    // Create GameDataService instance for centralized data computation
    const gameDataService = GameDataService.getInstance(gameStateManager);
    const allSections = { player1: placedSections, player2: opponentPlacedSections };
    const possibleActions = [];
    const uniqueCardPlays = new Set();
    const readyAiDrones = Object.entries(player2.dronesOnBoard).flatMap(([lane, drones]) =>
      drones.filter(d => !d.isExhausted).map(d => ({ ...d, lane }))
    );

    const playableCards = player2.hand.filter(card => player2.energy >= card.cost);
    for (const card of playableCards) {
      if (card.targeting) {
        let targets = getValidTargets('player2', null, card, player1, player2);
        
        if (card.effect.type === 'HEAL_SHIELDS') {
            targets = targets.filter(t => t.currentShields < t.currentMaxShields);
        }
        if (card.effect.type === 'HEAL_HULL' && card.targeting.type === 'SHIP_SECTION') {
            targets = targets.filter(t => t.hull < t.maxHull);
        }

        if (card.effect.type === 'DAMAGE' || card.effect.type === 'DESTROY') {
            targets = targets.filter(t => t.owner === 'player1');
        }

        for (const target of targets) {
          const uniqueKey = `card-${card.id}-${target.id}-${target.owner}`;
          if (!uniqueCardPlays.has(uniqueKey)) {
            possibleActions.push({ type: 'play_card', card, target, score: 0 });
            uniqueCardPlays.add(uniqueKey);
          }
        }
      } else {
        const uniqueKey = `card-${card.id}`;
        if (!uniqueCardPlays.has(uniqueKey)) {
            possibleActions.push({ type: 'play_card', card, target: null, score: 0 });
            uniqueCardPlays.add(uniqueKey);
        }
      }
    }

    for (const attacker of readyAiDrones) {
      const playerDronesInLane = player1.dronesOnBoard[attacker.lane];
      for (const target of playerDronesInLane) {
        possibleActions.push({ type: 'attack', attacker, target: { ...target, owner: 'player1' }, targetType: 'drone', score: 0 });
      }
      const sectionIndex = parseInt(attacker.lane.slice(-1)) - 1;
      const sectionName = placedSections[sectionIndex];
      if (sectionName && player1.shipSections[sectionName].hull > 0) {
        const playerDronesInLaneForGuard = player1.dronesOnBoard[attacker.lane];
        const hasGuardian = playerDronesInLaneForGuard.some(drone => {
            const effectiveStats = gameDataService.getEffectiveStats(drone, attacker.lane);
            return effectiveStats.keywords.has('GUARDIAN');
        });

        if (!hasGuardian) {
            const shipTarget = { ...player1.shipSections[sectionName], id: sectionName, name: sectionName, owner: 'player1' };
            possibleActions.push({ type: 'attack', attacker, target: shipTarget, targetType: 'section', score: 0 });
        }
      }
    }

    for (const drone of readyAiDrones) {
      const fromLaneIndex = parseInt(drone.lane.slice(-1));
      [fromLaneIndex - 1, fromLaneIndex + 1].forEach(toLaneIndex => {
        if (toLaneIndex >= 1 && toLaneIndex <= 3) {
          const toLane = `lane${toLaneIndex}`;

          // Check maxPerLane restriction
          const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
          if (baseDrone && baseDrone.maxPerLane) {
            const currentCountInTarget = countDroneTypeInLane(player2, drone.name, toLane);
            if (currentCountInTarget >= baseDrone.maxPerLane) {
              // Skip this move - would violate maxPerLane
              return;
            }
          }

          possibleActions.push({ type: 'move', drone, fromLane: drone.lane, toLane, score: 0 });
        }
      });
    }

    possibleActions.forEach(action => {
      action.instigator = action.card?.name || action.attacker?.name;
      action.targetName = action.target?.name || action.target?.id || 'N/A';
      action.logic = [];
      
      let score = 0;
      switch (action.type) {
        case 'play_card': {
          const { card, target } = action;

          if (card.effect.type === 'DESTROY') {
            if (card.effect.scope === 'SINGLE' && target) {
              const resourceValue = (target.hull || 0) + (target.currentShields || 0);
              score = (resourceValue * 8) - (card.cost * 4);
              action.logic.push(`(Target Value: ${resourceValue} * 8) - (Card Cost: ${card.cost} * 4)`);
            }
            else if (card.effect.scope === 'FILTERED' && target && target.id.startsWith('lane')) {
              const { stat, comparison, value } = card.effect.filter;
              const dronesInLane = player1.dronesOnBoard[target.id] || [];
              let totalResourceValue = 0;
              dronesInLane.forEach(drone => {
                let meetsCondition = false;
                if (comparison === 'GTE' && drone[stat] >= value) meetsCondition = true;
                if (comparison === 'LTE' && drone[stat] <= value) meetsCondition = true;
                if (meetsCondition) {
                  totalResourceValue += (drone.hull || 0) + (drone.currentShields || 0) + (drone.class * 5);
                }
              });
              score = (totalResourceValue * 8) - (card.cost * 4);
              action.logic.push(`(Filtered Value: ${totalResourceValue} * 8) - (Card Cost: ${card.cost} * 4)`);
            }
            else if (card.effect.scope === 'LANE' && target && target.id.startsWith('lane')) {
              const laneId = target.id;
              const enemyDrones = player1.dronesOnBoard[laneId] || [];
              const friendlyDrones = player2.dronesOnBoard[laneId] || [];

              const calculateWeightedValue = (drones) => {
                return drones.reduce((sum, d) => {
                  const baseValue = (d.hull || 0) + (d.currentShields || 0) + (d.class * 5);
                  return sum + (d.isExhausted ? baseValue : baseValue * 1.5);
                }, 0);
              };

              const enemyValue = calculateWeightedValue(enemyDrones);
              const friendlyValue = calculateWeightedValue(friendlyDrones);
              
              const scoreMultiplier = 4;
              const costPenalty = card.cost * 4;
              
              score = ((enemyValue - friendlyValue) * scoreMultiplier) - costPenalty;
              
              action.logic.push(`((Enemy Val: ${enemyValue.toFixed(0)} - Friendly Val: ${friendlyValue.toFixed(0)}) * ${scoreMultiplier}) - Cost: ${costPenalty}`);
            }
          }
          else if (card.effect.type === 'DAMAGE' && target) {
            if (card.effect.scope === 'FILTERED' && target.id.startsWith('lane') && card.effect.filter) {
                const { stat, comparison, value } = card.effect.filter;
                const dronesInLane = player1.dronesOnBoard[target.id] || [];
                let potentialDamage = 0;
                let targetsHit = 0;
                const laneId = target.id;
                dronesInLane.forEach(drone => {
                    const effectiveTarget = gameDataService.getEffectiveStats(drone, laneId);
                    let meetsCondition = false;
                    if (comparison === 'GTE' && effectiveTarget[stat] >= value) meetsCondition = true;
                    if (comparison === 'LTE' && effectiveTarget[stat] <= value) meetsCondition = true;

                    if (meetsCondition) {
                        targetsHit++;
                        potentialDamage += card.effect.value;
                    }
                });
                score = (potentialDamage * 10) + (targetsHit > 1 ? targetsHit * 15 : 0) - (card.cost * 4);
                action.logic.push(`(Filtered Damage: ${potentialDamage} * 10) + (Multi-Hit Bonus: ${targetsHit > 1 ? targetsHit * 15 : 0}) - (Card Cost: ${card.cost} * 4)`);
            } else {
                let potentialDamage = card.effect.value;
                let logic = [];

                if (card.effect.damageType === 'PIERCING') {
                    const shieldBypassValue = (target.currentShields || 0);
                    logic.push(`Piercing bypasses ${shieldBypassValue} shields`);
                }
                
                const damageScore = card.effect.value * 8;
                logic.push(`Base Dmg: ${damageScore}`);
                let finalScore = damageScore;
                
                if (potentialDamage >= target.hull) {
                    const lethalBonus = (target.class * 15) + 50;
                    finalScore += lethalBonus;
                    logic.push(`Lethal Bonus: +${lethalBonus}`);
                }
                
                const costPenalty = card.cost * 4;
                finalScore -= costPenalty;
                logic.push(`Cost: -${costPenalty}`);

                score = finalScore;
                action.logic.push(...logic.map(l => `(${l})`));
            }
          }
          else if (card.effect.type === 'READY_DRONE') {
            score = (target.class * 12);
          } else if (card.effect.type === 'GAIN_ENERGY') {
            const projectedEnergy = player2.energy - card.cost + card.effect.value;
            action.logic.push(`Projected Energy: ${projectedEnergy}`);

            const newlyPlayableCards = player2.hand.filter(otherCard =>
              otherCard.instanceId !== card.instanceId &&
              player2.energy < otherCard.cost &&
              projectedEnergy >= otherCard.cost
            );

            if (newlyPlayableCards.length > 0) {
              const mostExpensiveTarget = newlyPlayableCards.sort((a, b) => b.cost - a.cost)[0];
              score = 60 + (mostExpensiveTarget.cost * 5);
              action.logic.push(`Enables Play of '${mostExpensiveTarget.name}' (Cost ${mostExpensiveTarget.cost}): +${score}`);
            } else {
              score = 1;
              action.logic.push('No new cards enabled. Low priority.');
            }
          } else if (card.effect.type === 'DRAW') {
            const energyAfterPlay = player2.energy - card.cost;
            if (energyAfterPlay > 0) {
              score = 10 + (energyAfterPlay * 2);
              action.logic.push(`(Base: 10) + (Energy Left: ${energyAfterPlay} * 2)`);
            } else {
              score = 1;
              action.logic.push(`Low Priority: 1`);
            }
          } else if (card.effect.type === 'SEARCH_AND_DRAW') {
            const energyAfterPlay = player2.energy - card.cost;
            const drawValue = card.effect.drawCount * 12; // Value per card drawn
            const searchBonus = card.effect.searchCount * 2; // Bonus for selection quality
            if (energyAfterPlay >= 0) {
              score = drawValue + searchBonus + (energyAfterPlay * 2);
              action.logic.push(`(Draw Value: ${drawValue}) + (Search Bonus: ${searchBonus}) + (Energy Left: ${energyAfterPlay} * 2)`);
            } else {
              score = 2;
              action.logic.push(`Low Priority: 2`);
            }
          } else if (card.effect.type === 'HEAL_SHIELDS') {
            const shieldsToHeal = Math.min(card.effect.value, target.currentMaxShields - target.currentShields);
            score = shieldsToHeal * 5;
            action.logic.push(`(Shields Healed: ${shieldsToHeal} * 5)`);
          }
          else if (card.effect.type === 'HEAL_HULL' && card.targeting.type === 'SHIP_SECTION') {
            score = 80;
            action.logic.push(`High Priority Section Heal: 80`);
          }
          else if (card.effect.type === 'REPEATING_EFFECT') {
            let repeatCount = 1;
            if (card.condition === 'OWN_DAMAGED_SECTIONS') {
              for (const sectionName in player2.shipSections) {
                const section = player2.shipSections[sectionName];
                const status = getShipStatus(section);
                if (status === 'damaged' || status === 'critical') {
                  repeatCount++;
                }
              }
            }
              score = (repeatCount * 25) - (card.cost * 4);
              action.logic.push(`(Repeats: ${repeatCount} * 25) - (Card Cost: ${card.cost} * 4)`);
            }
            else if (card.effect.type === 'CREATE_TOKENS') {
              // Deploy Jammers evaluation - scales with both CPU value and available lanes
              const allFriendlyDrones = Object.values(player2.dronesOnBoard).flat();
              const totalCPUValue = allFriendlyDrones.reduce((sum, d) => sum + (d.class || 0), 0);
              const highValueDrones = allFriendlyDrones.filter(d => d.class >= 3).length;

              // Count available lanes (lanes without Jammers)
              const lanes = ['lane1', 'lane2', 'lane3'];
              const availableLanes = lanes.filter(laneId => !hasJammerInLane(player2, laneId)).length;
              const scalingFactor = availableLanes / 3;

              // If no lanes available, card has no value
              if (availableLanes === 0) {
                score = -999;
                action.logic.push('❌ No available lanes (all have Jammers)');
              } else {
                // Base score: always positive (AI never sees this as bad)
                const baseScore = 30;
                const cpuValueBonus = totalCPUValue * 5;
                const highValueBonus = highValueDrones * 15;
                const costPenalty = card.cost * 4;

                const unscaledScore = baseScore + cpuValueBonus + highValueBonus - costPenalty;
                score = unscaledScore * scalingFactor;

                action.logic.push(`Base Value: ${baseScore}`);
                action.logic.push(`CPU Protection: ${cpuValueBonus} (${totalCPUValue} total CPU)`);
                action.logic.push(`High-Value Drones: ${highValueBonus} (${highValueDrones} drones)`);
                action.logic.push(`Cost: -${costPenalty}`);
                action.logic.push(`Available Lanes: ${availableLanes}/3 (${(scalingFactor * 100).toFixed(0)}% value)`);
              }
            }
            else if (card.effect.type === 'MODIFY_STAT') {
              const { mod } = card.effect;
              const { target } = action;

              if (card.targeting?.type === 'LANE') {
                  const laneId = target.id;
                  const dronesInLane = player2.dronesOnBoard[laneId] || [];
                  const activeDronesInLane = dronesInLane.filter(drone => !drone.isExhausted);

                  if (activeDronesInLane.length === 0) {
                      score = 0;
                      action.logic.push('No Active Drones in Lane');
                  } else {
                      const currentLaneScore = calculateLaneScore(laneId, player2, player1, allSections, getShipStatus, gameDataService);

                      const tempAiState = JSON.parse(JSON.stringify(player2));
                      tempAiState.dronesOnBoard[laneId].forEach(drone => {
                          if (!drone.isExhausted) {
                              if (!drone.statMods) drone.statMods = [];
                              drone.statMods.push(mod);
                          }
                      });

                      const projectedLaneScore = calculateLaneScore(laneId, tempAiState, player1, allSections, getShipStatus, gameDataService);
                      const laneImpact = projectedLaneScore - currentLaneScore;

                      score = (laneImpact * 1.5) + (activeDronesInLane.length * 10);
                      action.logic.push(`Lane Impact: ${laneImpact.toFixed(0)}`);
                      action.logic.push(`Multi-Buff Bonus: ${activeDronesInLane.length * 10}`);
                  }
              } else {
                  if (mod.stat === 'attack' && mod.value > 0) {
                      if (target.isExhausted) {
                          score = -1;
                          action.logic.push('Invalid (Exhausted)');
                      } else {
                          score = (target.class * 10) + (mod.value * 8);
                          action.logic.push(`Target Class: ${target.class * 10}`);
                          action.logic.push(`Attack Value: ${mod.value * 8}`);
                      }
                  } else if (mod.stat === 'attack' && mod.value < 0) {
                      if (target.isExhausted) {
                          score = -1;
                          action.logic.push('Invalid Target (Already Exhausted)');
                      } else {
                          const effectiveTarget = gameDataService.getEffectiveStats(target, getLaneOfDrone(target.id, player1));
                          score = (effectiveTarget.attack * 8) - (mod.value * -5);
                          action.logic.push(`Threat Reduction: ${effectiveTarget.attack * 8}`);
                      }
                  } else if (mod.stat === 'speed' && mod.value > 0) {
                      if (target.isExhausted) {
                          score = -1;
                          action.logic.push('Invalid (Exhausted)');
                      } else {
                          const targetLane = getLaneOfDrone(target.id, player2);
                          const opponentsInLane = player1.dronesOnBoard[targetLane] || [];
                          const opponentMaxSpeed = opponentsInLane.length > 0 ? Math.max(...opponentsInLane.map(d => gameDataService.getEffectiveStats(d, targetLane).speed)) : -1;
                          const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);

                          if (effectiveTarget.speed <= opponentMaxSpeed && (effectiveTarget.speed + mod.value) > opponentMaxSpeed) {
                              score = 60;
                              action.logic.push(`Interceptor Overcome Bonus: 60`);
                          } else {
                              score = 20;
                              action.logic.push(`Utility Speed Bonus: 20`);
                          }
                      }
                  } else {
                      // Catch-all for other stat modifications
                      if (target.isExhausted) {
                          score = -1;
                          action.logic.push('Invalid (Exhausted)');
                      } else {
                          score = 10; // minimal value for other stats
                          action.logic.push('Generic stat modification');
                      }
                  }
              }

              if (score > 0) {
                  if (mod.type === 'permanent') {
                      score *= 1.5;
                      action.logic.push(`Permanent Mod x1.5`);
                  }
                  if (card.effect.goAgain) {
                      score += 40;
                      action.logic.push(`Go Again Bonus: +40`);
                  }
                  score -= (card.cost * 4);
                  action.logic.push(`Cost: -${card.cost * 4}`);
              }
            }
            action.score = score;
            break;
          }
  
          case 'attack': {
          const { attacker, target: attackTarget, targetType } = action;
          const effectiveAttacker = gameDataService.getEffectiveStats(attacker, attacker.lane);
          const attackerAttack = Math.max(0, effectiveAttacker.attack);
          
          if (targetType === 'drone') {
            const effectiveTarget = gameDataService.getEffectiveStats(attackTarget, attacker.lane);
            score = (effectiveTarget.class * 10);
            action.logic.push(`(Target Class: ${effectiveTarget.class} * 10)`);
            if (effectiveAttacker.class < effectiveTarget.class) { 
                score += 20; 
                action.logic.push(`Favorable Trade Bonus: 20`);
            }
            if (!attackTarget.isExhausted) { 
                score += 10;
                action.logic.push(`Ready Target Bonus: 10`);
            }
            const baseAttacker = fullDroneCollection.find(d => d.name === attacker.name);
            const isAntiShip = baseAttacker?.abilities.some(ability => 
                ability.type === 'PASSIVE' && ability.effect.type === 'BONUS_DAMAGE_VS_SHIP'
            );

            if (isAntiShip) {
                score -= 40;
                action.logic.push(`Anti-Ship Penalty: -40`);
            }
            if (attacker.damageType === 'PIERCING') {
              const bonus = effectiveTarget.currentShields * 8;
              score += bonus;
              action.logic.push(`Piercing Bonus: ${bonus}`);
            }
          } else if (targetType === 'section') {
            score = (attackerAttack * 8);
            action.logic.push(`(Effective Attack: ${attackerAttack} * 8)`);
            const status = getShipStatus(attackTarget);
            if (status === 'damaged') { score += 15; action.logic.push(`Damaged Section Bonus: 15`); }
            if (status === 'critical') { score += 30; action.logic.push(`Critical Section Bonus: 30`); }
            if (attackTarget.allocatedShields === 0) {
                score += 40;
                action.logic.push(`No Shields Bonus: 40`);
            }
            else if (attackerAttack >= attackTarget.allocatedShields) {
                score += 35;
                action.logic.push(`Shield Break Bonus: 35`);
            }
            if (attackerAttack >= 3) {
                score += 10;
                action.logic.push(`High Attack Bonus: 10`);
            }
            if (attacker.damageType === 'PIERCING') {
              const bonus = attackTarget.allocatedShields * 10;
              score += bonus;
              action.logic.push(`Piercing Bonus: ${bonus}`);
            }
          }
          action.score = score;
          break;
        }

        case 'move': {
          const { drone, fromLane, toLane } = action;
          action.instigator = drone.name;
          action.targetName = toLane;

          const currentFromScore = calculateLaneScore(fromLane, player2, player1, allSections, getShipStatus, gameDataService);
          const currentToScore = calculateLaneScore(toLane, player2, player1, allSections, getShipStatus, gameDataService);
          
          const tempAiState = JSON.parse(JSON.stringify(player2));
          const droneToMove = tempAiState.dronesOnBoard[fromLane].find(d => d.id === drone.id);
          if (droneToMove) {
            tempAiState.dronesOnBoard[fromLane] = tempAiState.dronesOnBoard[fromLane].filter(d => d.id !== drone.id);
            tempAiState.dronesOnBoard[toLane].push(droneToMove);
          }

          const projectedFromScore = calculateLaneScore(fromLane, tempAiState, player1, allSections, getShipStatus, gameDataService);
          const projectedToScore = calculateLaneScore(toLane, tempAiState, player1, allSections, getShipStatus, gameDataService);
          
          const toLaneImpact = projectedToScore - currentToScore;
          const fromLaneImpact = projectedFromScore - currentFromScore;
          
          const moveCost = 10;
          score = (toLaneImpact + fromLaneImpact) - moveCost;
          
          action.logic.push(`ToLane Impact: ${toLaneImpact.toFixed(0)}`);
          action.logic.push(`FromLane Impact: ${fromLaneImpact.toFixed(0)}`);
          action.logic.push(`Move Cost: -${moveCost}`);

          const toLaneIndex = parseInt(toLane.slice(-1)) - 1;
          const sectionToDefend = opponentPlacedSections[toLaneIndex];
          if (sectionToDefend) {
              const sectionStatus = getShipStatus(player2.shipSections[sectionToDefend]);
              if ((sectionStatus === 'damaged' || sectionStatus === 'critical') && currentToScore < 0) {
                  score += 25;
                  action.logic.push(`Defensive Bonus: +25`);
              }
          }
          
          const humanSectionToAttack = placedSections[toLaneIndex];
           if (humanSectionToAttack) {
          const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
          const onMoveAbility = baseDrone?.abilities.find(a => a.type === 'TRIGGERED' && a.trigger === 'ON_MOVE');
          if (onMoveAbility) {
              let abilityBonus = 0;
              onMoveAbility.effects?.forEach(effect => {
                  if (effect.type === 'PERMANENT_STAT_MOD') {
                      if (effect.mod.stat === 'attack') abilityBonus += (effect.mod.value * 15);
                      if (effect.mod.stat === 'speed') abilityBonus += (effect.mod.value * 10);
                  }
              });
              score += abilityBonus;
              action.logic.push(`OnMove Bonus: +${abilityBonus}`);
          }
              const sectionStatus = getShipStatus(player1.shipSections[humanSectionToAttack]);
              if (currentToScore > 0) {
                if (sectionStatus === 'damaged') {
                    score += 20;
                    action.logic.push(`Offensive Bonus (Damaged Section): +20`);
                } 
                else if (sectionStatus === 'critical') {
                    score -= 150;
                    action.logic.push(`Overkill Penalty (Critical Section): -150`);
                }
              }

          }

          action.score = score;
          break;
        }

        default:
          break;
      }
    });

    // ========================================
    // JAMMER ADJUSTMENT PASS
    // ========================================
    // Apply Jammer blocking and removal bonuses after normal scoring
    // Multi-pass approach: identify blocked plays, then boost Jammer removal by blocked value

    // Step 1: Identify lanes with Jammers and calculate blocked card values
    const jammerBlockedValue = {
      lane1: 0,
      lane2: 0,
      lane3: 0
    };

    possibleActions.forEach(action => {
      if (action.type === 'play_card' && action.target?.owner === 'player1') {
        const targetLane = getLaneOfDrone(action.target.id, player1);
        if (targetLane && hasJammerInLane(player1, targetLane)) {
          const isTargetJammer = hasJammerKeyword(action.target);

          if (!isTargetJammer) {
            // This card play is blocked - mark it and accumulate its value
            jammerBlockedValue[targetLane] += action.score > 0 ? action.score : 0;
            action.score = -999;
            action.logic.push('❌ BLOCKED BY JAMMER');
          }
        }
      }
    });

    // Step 2: Apply Jammer removal bonuses to attacks
    possibleActions.forEach(action => {
      if (action.type === 'attack' &&
          action.targetType === 'drone' &&
          hasJammerKeyword(action.target)) {

        const targetLane = action.attacker.lane;
        const blockedValue = jammerBlockedValue[targetLane];

        if (blockedValue > 0) {
          action.score += blockedValue;
          action.logic.push(`Jammer Removal: +${blockedValue.toFixed(0)} (unblocks cards)`);
        }

        // Efficiency bonus: prefer low-attack drones for Jammer removal
        const effectiveAttacker = gameDataService.getEffectiveStats(action.attacker, targetLane);
        if (effectiveAttacker.attack <= 2 && blockedValue > 0) {
          const efficiencyBonus = 30;
          action.score += efficiencyBonus;
          action.logic.push(`Efficient Trade: +${efficiencyBonus}`);
        }
      }
    });

    const topScore = possibleActions.length > 0 ? Math.max(...possibleActions.map(a => a.score)) : 0;

    if (topScore <= 0) {
        addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during action phase.` }, 'aiActionPass', possibleActions);
      return { type: 'pass' };
    }

    const actionPool = possibleActions.filter(action => action.score >= topScore - 20);
    const positiveActionPool = actionPool.filter(action => action.score > 0);
    
    const chosenAction = positiveActionPool[Math.floor(Math.random() * positiveActionPool.length)];

    chosenAction.isChosen = true;
    
    return { type: 'action', payload: chosenAction, logContext: possibleActions };
};

/**
 * AI Interception Decision
 * Decides whether to intercept an incoming attack and which interceptor to use
 * Logic extracted from App.jsx to maintain architecture separation
 *
 * @param {Array} potentialInterceptors - Drones that can intercept (pre-filtered for speed/keywords)
 * @param {Object} target - The drone being attacked
 * @returns {Object} - { interceptor: drone | null }
 */
const makeInterceptionDecision = (potentialInterceptors, target) => {
  if (!potentialInterceptors || potentialInterceptors.length === 0) {
    return { interceptor: null };
  }

  // Sort interceptors by class (lowest first)
  const sortedInterceptors = [...potentialInterceptors].sort((a, b) => {
    const classA = a.class ?? Infinity;
    const classB = b.class ?? Infinity;
    return classA - classB;
  });

  // Choose the lowest-class interceptor if it has a lower class than the target
  const bestInterceptor = sortedInterceptors[0];
  const targetClass = target.class ?? Infinity;
  const interceptorClass = bestInterceptor.class ?? Infinity;

  if (targetClass === undefined || interceptorClass < targetClass) {
    return { interceptor: bestInterceptor };
  }

  return { interceptor: null };
};

export const aiBrain = {
  handleOpponentTurn,
  handleOpponentAction,
  makeInterceptionDecision,
};
