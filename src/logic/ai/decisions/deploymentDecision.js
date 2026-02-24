// ========================================
// DEPLOYMENT DECISION
// ========================================
// Handles AI drone deployment during deployment phase

import fullDroneCollection from '../../../data/droneData.js';
import GameDataService from '../../../services/GameDataService.js';
import { debugLog } from '../../../utils/debugLogger.js';
import SeededRandom from '../../../utils/seededRandom.js';

import {
  hasThreatOnRoundStart,
  countDroneTypeInLane,
} from '../helpers/index.js';

import { THREAT_DRONES } from '../aiConstants.js';

import { calculateLaneScore } from '../scoring/index.js';

/**
 * Deployment decision context needed:
 * - player1: Opponent state
 * - player2: AI state
 * - turn: Current turn number
 * - placedSections: Human's section placement [lane0, lane1, lane2]
 * - opponentPlacedSections: AI's section placement
 * - getShipStatus: Function to get section health status
 * - gameStateManager: For accessing game state
 * - addLogEntry: For logging decisions
 *
 * Returns:
 * - { type: 'pass' } if no good deployments
 * - { type: 'deploy', payload: { droneToDeploy, targetLane, logContext } }
 */
export const handleOpponentTurn = ({ player1, player2, turn, placedSections, opponentPlacedSections, getShipStatus, gameStateManager, addLogEntry }) => {
    // Create GameDataService instance for centralized data computation
    const gameDataService = GameDataService.getInstance(gameStateManager);
    const rng = SeededRandom.fromGameState(gameStateManager.getState());
    const effectiveStats = gameDataService.getEffectiveShipStats(player2, opponentPlacedSections).totals;
    const totalDrones = Object.values(player2.dronesOnBoard)
  .flat()
  .filter(d => {
    const baseDrone = fullDroneCollection.find(bd => bd.name === d.name);
    return !baseDrone?.isToken;
  })
  .length;
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
      } else if (player2.droneAvailability?.[drone.name]?.readyCount <= 0) {
        // New availability system: check if any copies are ready
        isAffordable = false;
        const rebuildingCount = player2.droneAvailability[drone.name]?.rebuildingCount || 0;
        reason = rebuildingCount > 0 ? `No copies available (${rebuildingCount} rebuilding)` : 'No copies available';
      } else if ((player2.deployedDroneCounts[drone.name] || 0) >= drone.limit) {
        // Legacy fallback: check deployment limit (when droneAvailability not present)
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

        // Log if drone not found - crash is intentional to catch data issues
        if (!baseDrone) {
          debugLog('AI_DECISIONS', `[AI] FATAL: Drone "${drone.name}" not found in fullDroneCollection. Check aiData.js for typos.`);
        }

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

        // Prevent inefficient Ion drone stacking
        if (baseDrone.damageType === 'ION') {
          const aiDronesInLane = player2.dronesOnBoard[laneId];
          const existingIonCount = aiDronesInLane
            .filter(d => fullDroneCollection.find(bd => bd.name === d.name)?.damageType === 'ION').length;

          if (existingIonCount >= 1) {
            // Count individual enemy targets with meaningful shields (>= 2)
            const enemyDrones = player1.dronesOnBoard[laneId] || [];
            const worthwhileDroneTargets = enemyDrones.filter(d => (d.currentShields || 0) >= 2).length;
            const laneIdx = parseInt(laneId.slice(-1)) - 1;
            const sectionName = placedSections[laneIdx];
            const worthwhileSectionTarget = sectionName
              && (player1.shipSections[sectionName]?.allocatedShields || 0) >= 2 ? 1 : 0;
            const worthwhileTargets = worthwhileDroneTargets + worthwhileSectionTarget;

            // Check if any non-ION drones can deal hull damage after shields are stripped
            const hasHullDamageDealer = aiDronesInLane.some(d => {
              const bd = fullDroneCollection.find(base => base.name === d.name);
              return bd && bd.damageType !== 'ION' && (d.attack || 0) > 0;
            });

            if (worthwhileTargets <= existingIonCount || !hasHullDamageDealer) {
              const reason = !hasHullDamageDealer
                ? `Ion without follow-up: no hull damage dealers in lane`
                : `Ion stacking: ${existingIonCount} Ion drone(s) for only ${worthwhileTargets} target(s) with 2+ shields`;
              possibleDeployments.push({
                drone,
                laneId,
                score: -999,
                instigator: drone.name,
                targetName: laneId,
                logic: [reason]
              });
              continue;
            }
          }
        }

        const tempAiState = JSON.parse(JSON.stringify(player2));
        const tempDrone = { ...baseDrone, id: 'temp' };
        tempAiState.dronesOnBoard[laneId].push(tempDrone);

        const projectedScore = calculateLaneScore(laneId, tempAiState, player1, allSections, getShipStatus, gameDataService);
        const impactScore = projectedScore - currentLaneScores[laneId];

        let strategicBonus = 0;
        const currentLaneScore = currentLaneScores[laneId];
        const droneKeywords = new Set(baseDrone.abilities.filter(a => a.effect?.keyword).map(a => a.effect.keyword));

        // Calculate effective stats with temp state to include conditional bonuses
        // (e.g., Avenger's +3 attack when ship section in same lane is damaged)
        const effectiveDroneStats = gameDataService.getEffectiveStats(tempDrone, laneId, {
          playerState: tempAiState,
          opponentState: player1,
          placedSections: allSections
        });

        if (currentLaneScore < -15) {
          if (effectiveDroneStats.speed >= 4) strategicBonus += 15;
          if (droneKeywords.has('ALWAYS_INTERCEPTS') || droneKeywords.has('GUARDIAN')) strategicBonus += 20;
        } else if (currentLaneScore > 15) {
          if (effectiveDroneStats.attack >= 4) strategicBonus += 15;
          if (baseDrone.abilities.some(a => a.effect?.type === 'BONUS_DAMAGE_VS_SHIP')) strategicBonus += 20;
        } else {
          if (drone.class <= 1) strategicBonus += 10;
        }

        let stabilizationBonus = 0;
        if (currentLaneScore < 0 && projectedScore >= 0) {
          stabilizationBonus = rng.randomIntInclusive(10, 30);
        }

        let dominanceBonus = 0;
        if (projectedScore > 20 && currentLaneScore <= 20) {
          dominanceBonus = rng.randomIntInclusive(10, 30);
        }

        // ON_DEPLOY ability bonuses (Scanner marking)
        let onDeployBonus = 0;
        const onDeployAbilities = baseDrone.abilities?.filter(a =>
          a.type === 'TRIGGERED' && a.trigger === 'ON_DEPLOY'
        ) || [];

        for (const ability of onDeployAbilities) {
          if (ability.effect?.type === 'MARK_RANDOM_ENEMY') {
            const enemiesInLane = player1.dronesOnBoard[laneId] || [];
            const unmarkedEnemies = enemiesInLane.filter(d => !d.isMarked);
            if (unmarkedEnemies.length > 0) {
              onDeployBonus += 15; // DEPLOYMENT_BONUSES.MARK_ENEMY_VALUE
            }
          }
        }

        // Threat drone deployment bonus - threat-per-round drones generate value over time
        let threatDroneBonus = 0;
        if (hasThreatOnRoundStart(baseDrone)) {
          threatDroneBonus = THREAT_DRONES.ROUND_START_DEPLOY_BONUS;
        }

        const logicArray = [
            `LaneScore: ${currentLaneScore.toFixed(0)}`,
            `Projected: ${projectedScore.toFixed(0)}`,
            `Impact: ${impactScore.toFixed(0)}`,
            `Bonus: ${strategicBonus.toFixed(0)}`,
            `Stabilize: ${stabilizationBonus.toFixed(0)}`,
            `Dominance: ${dominanceBonus.toFixed(0)}`,
            ...(onDeployBonus > 0 ? [`OnDeploy: +${onDeployBonus}`] : []),
            ...(threatDroneBonus > 0 ? [`ThreatDrone: +${threatDroneBonus}`] : [])
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

        const finalScore = impactScore + strategicBonus + stabilizationBonus + dominanceBonus + onDeployBonus + threatDroneBonus + overkillPenalty;

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

    // AI_DEPLOYMENT logging for bug investigation
    debugLog('AI_DEPLOYMENT', `🧠 AI evaluated options`, {
      possibleDeploymentCount: possibleDeployments.length,
      topScore,
      passThreshold: 5,
      willDeploy: topScore >= 5,
      topOptions: possibleDeployments
        .filter(d => d.score === topScore)
        .slice(0, 3)
        .map(d => ({ drone: d.drone?.name, lane: d.laneId, score: d.score }))
    });

    if (topScore < 5) {
      debugLog('AI_DEPLOYMENT', `🤖 AI decides to PASS`, {
        reason: 'No high-impact plays (topScore < 5)',
        topScore,
        evaluatedCount: possibleDeployments.length
      });
      addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during deployment phase (no high-impact plays).` }, 'aiDeploymentPass', possibleDeployments);
      // Capture decision for CSV export
      gameStateManager.addAIDecisionToHistory('deployment', turn, possibleDeployments, { player1, player2 });
      return { type: 'pass' };
    }

    const bestActions = possibleDeployments.filter(d => d.score === topScore);
    const chosenAction = bestActions[Math.floor(rng.random() * bestActions.length)];
    chosenAction.isChosen = true;

    debugLog('AI_DEPLOYMENT', `🤖 AI decides to DEPLOY`, {
      droneName: chosenAction.drone?.name,
      droneClass: chosenAction.drone?.class,
      targetLane: chosenAction.laneId,
      score: chosenAction.score,
      tiedOptions: bestActions.length
    });

    // Log the deployment decision
    addLogEntry({
      player: player2.name,
      actionType: 'DEPLOY',
      source: chosenAction.drone.name,
      target: chosenAction.laneId,
      outcome: `Deployed ${chosenAction.drone.name} to ${chosenAction.laneId} (Score: ${chosenAction.score.toFixed(0)})`
    }, 'aiDeployment', possibleDeployments);

    // Capture decision for CSV export
    gameStateManager.addAIDecisionToHistory('deployment', turn, possibleDeployments, { player1, player2 });

    return {
      type: 'deploy',
      payload: {
        droneToDeploy: chosenAction.drone,
        targetLane: chosenAction.laneId,
        logContext: possibleDeployments
      }
    };
};
