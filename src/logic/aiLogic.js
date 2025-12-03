import fullDroneCollection from '../data/droneData.js';
import GameDataService from '../services/GameDataService.js';
import { debugLog } from '../utils/debugLogger.js';

// Import extracted helpers
import {
  hasJammerKeyword,
  hasJammerInLane,
  getJammerDronesInLane,
  countDroneTypeInLane,
  hasDefenderKeyword,
} from './ai/helpers/index.js';

// Import extracted scoring functions
import {
  calculateLaneScore,
  calculateDroneImpact,
  analyzeInterceptionInLane,
  calculateThreatsKeptInCheck,
} from './ai/scoring/index.js';

// Import card evaluators
import { evaluateCardPlay } from './ai/cardEvaluators/index.js';

// Import attack evaluators
import { evaluateDroneAttack, evaluateShipAttack } from './ai/attackEvaluators/index.js';

// Import move evaluator
import { evaluateMove } from './ai/moveEvaluator.js';

// Import adjustment passes
import { applyJammerAdjustments } from './ai/adjustmentPasses/jammerAdjustment.js';
import { applyInterceptionAdjustments } from './ai/adjustmentPasses/interceptionAdjustment.js';
import { applyAntiShipAdjustments } from './ai/adjustmentPasses/antiShipAdjustment.js';

// ========================================
// DEPLOYMENT DECISION
// ========================================

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

        // Log if drone not found - crash is intentional to catch data issues
        if (!baseDrone) {
          console.error(`[AI] FATAL: Drone "${drone.name}" not found in fullDroneCollection. Check aiData.js for typos.`);
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

    // Log the deployment decision
    addLogEntry({
      player: player2.name,
      actionType: 'DEPLOY',
      source: chosenAction.drone.name,
      target: chosenAction.laneId,
      outcome: `Deployed ${chosenAction.drone.name} to ${chosenAction.laneId} (Score: ${chosenAction.score.toFixed(0)})`
    }, 'aiDeployment', possibleDeployments);

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
      } else if (card.effect.type === 'SINGLE_MOVE') {
        // Special handling for SINGLE_MOVE cards - create one entry per valid move
        for (const drone of readyAiDrones) {
          const fromLaneIndex = parseInt(drone.lane.slice(-1));

          // Check adjacent lanes
          [fromLaneIndex - 1, fromLaneIndex + 1].forEach(toLaneIndex => {
            if (toLaneIndex >= 1 && toLaneIndex <= 3) {
              const toLane = `lane${toLaneIndex}`;
              const fromLane = drone.lane;

              // Check maxPerLane restriction
              const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
              if (baseDrone && baseDrone.maxPerLane) {
                const currentCountInTarget = countDroneTypeInLane(player2, drone.name, toLane);
                if (currentCountInTarget >= baseDrone.maxPerLane) {
                  return; // Skip this move - would violate maxPerLane
                }
              }

              // Create possibleActions entry with move metadata
              const uniqueKey = `card-${card.id}-${drone.id}-${fromLane}-${toLane}`;
              if (!uniqueCardPlays.has(uniqueKey)) {
                possibleActions.push({
                  type: 'play_card',
                  card,
                  target: null,
                  moveData: { drone, fromLane, toLane },
                  score: 0
                });
                uniqueCardPlays.add(uniqueKey);
              }
            }
          });
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
      // Skip Jammer drones - they should never attack
      if (hasJammerKeyword(attacker)) {
        continue;
      }

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

    // Create evaluation context for modular evaluators
    const evaluationContext = {
      player1,
      player2,
      gameDataService,
      getLaneOfDrone,
      placedSections,
      opponentPlacedSections,
      allSections,
      getShipStatus,
    };

    possibleActions.forEach(action => {
      action.instigator = action.card?.name || action.attacker?.name;
      action.targetName = action.target?.name || action.target?.id || 'N/A';
      action.logic = [];

      // Customize display for SINGLE_MOVE cards
      if (action.type === 'play_card' && action.card?.effect.type === 'SINGLE_MOVE' && action.moveData) {
        const { drone, fromLane, toLane } = action.moveData;
        action.instigator = `${action.card.name} (${drone.name})`;
        action.targetName = `${fromLane}→${toLane}`;
      }

      let score = 0;
      switch (action.type) {
        case 'play_card': {
          const { card, target } = action;
          // Use modular card evaluator
          const result = evaluateCardPlay(card, target, evaluationContext, action.moveData);
          score = result.score;
          action.logic.push(...result.logic);
          action.score = score;
          break;
        }

        case 'attack': {
          const { attacker, target: attackTarget, targetType } = action;
          // Use modular attack evaluators
          if (targetType === 'drone') {
            const result = evaluateDroneAttack(attacker, attackTarget, evaluationContext);
            score = result.score;
            action.logic.push(...result.logic);
          } else if (targetType === 'section') {
            const result = evaluateShipAttack(attacker, attackTarget, evaluationContext);
            score = result.score;
            action.logic.push(...result.logic);
          }
          action.score = score;
          break;
        }

        case 'move': {
          const { drone, fromLane, toLane } = action;
          action.instigator = drone.name;
          action.targetName = toLane;
          // Use modular move evaluator
          const result = evaluateMove(drone, fromLane, toLane, evaluationContext);
          score = result.score;
          action.logic.push(...result.logic);
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
    applyJammerAdjustments(possibleActions, evaluationContext);

    // ========================================
    // INTERCEPTION ADJUSTMENT PASS
    // ========================================
    // Apply interception-based scoring adjustments after normal scoring
    applyInterceptionAdjustments(possibleActions, evaluationContext);

    // ========================================
    // ANTI-SHIP ADJUSTMENT PASS
    // ========================================
    // Remove anti-ship penalty when no alternatives exist
    applyAntiShipAdjustments(possibleActions, evaluationContext);

    const topScore = possibleActions.length > 0 ? Math.max(...possibleActions.map(a => a.score)) : 0;

    if (topScore <= 0) {
        addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during action phase.` }, 'aiActionPass', possibleActions);
      return { type: 'pass' };
    }

    const actionPool = possibleActions.filter(action => action.score >= topScore - 20);
    const positiveActionPool = actionPool.filter(action => action.score > 0);
    
    const chosenAction = positiveActionPool[Math.floor(Math.random() * positiveActionPool.length)];

    chosenAction.isChosen = true;

    // Log the action decision
    let actionType, source, target, outcome;

    switch (chosenAction.type) {
      case 'play_card':
        actionType = 'PLAY_CARD';
        source = chosenAction.card.name;
        target = chosenAction.target?.name || chosenAction.target?.id || 'N/A';
        outcome = `Played ${source} targeting ${target} (Score: ${chosenAction.score.toFixed(0)})`;
        break;
      case 'attack':
        actionType = 'ATTACK';
        source = chosenAction.attacker.name;
        target = chosenAction.target.name || chosenAction.target.id;
        outcome = `${source} attacked ${target} (Score: ${chosenAction.score.toFixed(0)})`;
        break;
      case 'move':
        actionType = 'MOVE';
        source = chosenAction.drone.name;
        target = `${chosenAction.fromLane} → ${chosenAction.toLane}`;
        outcome = `Moved ${source} from ${chosenAction.fromLane} to ${chosenAction.toLane} (Score: ${chosenAction.score.toFixed(0)})`;
        break;
      default:
        actionType = 'UNKNOWN';
        source = 'N/A';
        target = 'N/A';
        outcome = 'Unknown action type';
    }

    addLogEntry({
      player: player2.name,
      actionType,
      source,
      target,
      outcome
    }, 'aiAction', possibleActions);

    return { type: 'action', payload: chosenAction, logContext: possibleActions };
};

// ========================================
// INTERCEPTION DECISION HELPERS
// ========================================
// Note: hasDefenderKeyword is now imported from ./ai/helpers/keywordHelpers.js

/**
 * Analyze remaining threats in the lane to evaluate opportunity cost
 * Helps AI decide if it should save interceptor for bigger threats
 * @param {Object} attackDetails - Current attack context (attacker, target, targetType, lane)
 * @param {Array} potentialInterceptors - Available interceptors
 * @param {Object} gameDataService - GameDataService instance
 * @param {Object} gameStateManager - GameStateManager for accessing player states
 * @returns {Object} - { remainingThreats: Array, maxBlockableThreat: number, totalRemaining: number }
 */
const analyzeRemainingThreats = (attackDetails, potentialInterceptors, gameDataService, gameStateManager) => {
  const remainingThreats = [];
  const gameState = gameStateManager.getState();
  const player1 = gameState.player1; // Human player (attacker's owner)
  const lane = attackDetails.lane;

  // Get all enemy drones in this lane (excluding current attacker)
  const enemyDronesInLane = player1.dronesOnBoard[lane] || [];
  const readyEnemyDrones = enemyDronesInLane.filter(d =>
    !d.isExhausted && d.id !== attackDetails.attacker.id
  );

  // Calculate threat value for each remaining ready drone
  // Note: We calculate ship threat potential (includes BONUS_DAMAGE_VS_SHIP) because
  // these threats will likely attack the ship, not intercept other drones
  readyEnemyDrones.forEach(drone => {
    const effectiveStats = gameDataService.getEffectiveStats(drone, lane);
    let shipThreatPotential = effectiveStats.attack || 1;

    // Add BONUS_DAMAGE_VS_SHIP - correct for opportunity cost analysis
    // We're evaluating "how dangerous is this threat to our ship if it attacks?"
    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
    const bonusDamageAbility = baseDrone?.abilities?.find(a =>
      a.type === 'PASSIVE' && a.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
    );
    if (bonusDamageAbility) {
      shipThreatPotential += bonusDamageAbility.effect.value;
    }

    // Check if any of our interceptors can block this threat
    const canBeBlocked = potentialInterceptors.some(interceptor => {
      const interceptorStats = gameDataService.getEffectiveStats(interceptor, lane);
      const interceptorSpeed = interceptorStats.speed || 0;
      const droneSpeed = effectiveStats.speed || 0;
      return interceptorSpeed > droneSpeed;
    });

    remainingThreats.push({
      drone,
      threatDamage: shipThreatPotential, // Ship attack potential (includes bonus)
      canBeBlocked,
      speed: effectiveStats.speed || 0
    });
  });

  // Find max blockable threat (ship attack potential)
  const blockableThreats = remainingThreats.filter(t => t.canBeBlocked);
  const maxBlockableThreat = blockableThreats.length > 0
    ? Math.max(...blockableThreats.map(t => t.threatDamage))
    : 0;

  const totalRemaining = remainingThreats.reduce((sum, t) => sum + t.threatDamage, 0);

  debugLog('AI_DECISIONS', `🔍 [OPPORTUNITY COST] Remaining threats in ${lane}:`, {
    totalThreats: remainingThreats.length,
    blockableThreats: blockableThreats.length,
    maxBlockableThreat,
    totalRemaining
  });

  return { remainingThreats, maxBlockableThreat, totalRemaining };
};

/**
 * AI Interception Decision (Enhanced)
 * Decides whether to intercept an incoming attack and which interceptor to use
 *
 * ENHANCEMENTS:
 * 1. Survivability-based decisions (hull + shields vs damage)
 * 2. Opportunity cost analysis (scan for bigger threats)
 * 3. DEFENDER keyword handling (no exhaustion, no opportunity cost)
 *
 * @param {Array} potentialInterceptors - Drones that can intercept (pre-filtered for speed/keywords)
 * @param {Object} target - The attacker drone
 * @param {Object} attackDetails - Full attack context (attacker, target, targetType, lane)
 * @param {Object} gameDataService - GameDataService instance for stat calculations
 * @param {Object} gameStateManager - GameStateManager for accessing game state
 * @returns {Object} - { interceptor: drone | null, decisionContext: Array }
 */
const makeInterceptionDecision = (potentialInterceptors, target, attackDetails, gameDataService, gameStateManager) => {
  // Build decision context for Action Log
  const decisionContext = [];

  if (!potentialInterceptors || potentialInterceptors.length === 0) {
    // No interceptors available
    decisionContext.push({
      instigator: 'N/A',
      targetName: target.name,
      score: -999,
      logic: ['No interceptors available'],
      isChosen: false
    });
    return { interceptor: null, decisionContext };
  }

  // Calculate damage values - CRITICAL: Separate interceptor damage from ship threat
  // baseAttackDamage: What the interceptor actually takes when stepping in (no BONUS_DAMAGE_VS_SHIP)
  // shipThreatDamage: What the ship would take if not intercepted (includes BONUS_DAMAGE_VS_SHIP)
  let baseAttackDamage = 1; // Default - what interceptor takes
  let shipThreatDamage = 1; // Default - what ship would take
  const targetClass = target?.class ?? Infinity;

  if (attackDetails && gameDataService) {
    try {
      const effectiveAttacker = gameDataService.getEffectiveStats(target, attackDetails.lane);
      baseAttackDamage = effectiveAttacker.attack || 1;

      // For ship attacks, calculate prevented damage (includes bonus)
      // For drone attacks, both values are the same (no bonus applies)
      if (attackDetails.targetType === 'section') {
        shipThreatDamage = baseAttackDamage; // Start with base attack

        // Add BONUS_DAMAGE_VS_SHIP to ship threat (what we're preventing)
        const baseDrone = fullDroneCollection.find(d => d.name === target.name);
        const bonusDamageAbility = baseDrone?.abilities.find(a =>
          a.type === 'PASSIVE' && a.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
        );
        if (bonusDamageAbility) {
          shipThreatDamage += bonusDamageAbility.effect.value;
        }

        debugLog('AI_DECISIONS', `🛡️ [INTERCEPTION THREAT] ${target.name} attacking ship: interceptor takes ${baseAttackDamage} dmg, prevents ${shipThreatDamage} dmg to ship (class ${targetClass})`);
      } else {
        // Drone attack - no bonus damage
        shipThreatDamage = baseAttackDamage;
        debugLog('AI_DECISIONS', `🛡️ [INTERCEPTION THREAT] ${target.name} attacking drone: ${baseAttackDamage} dmg (class ${targetClass})`);
      }
    } catch (err) {
      debugLog('AI_DECISIONS', '⚠️ [INTERCEPTION] Failed to calculate threat, using default');
    }
  }

  // Analyze remaining threats for opportunity cost (only if gameStateManager provided)
  let opportunityCostData = null;
  if (gameStateManager) {
    opportunityCostData = analyzeRemainingThreats(attackDetails, potentialInterceptors, gameDataService, gameStateManager);
  }

  // Sort interceptors: DEFENDER first (they don't exhaust), then by least impact
  // This ensures we sacrifice lowest-value drones first
  const sortedInterceptors = [...potentialInterceptors].sort((a, b) => {
    const aHasDefender = hasDefenderKeyword(a);
    const bHasDefender = hasDefenderKeyword(b);

    // DEFENDER drones always come first
    if (aHasDefender && !bHasDefender) return -1;
    if (!aHasDefender && bHasDefender) return 1;

    // Among same DEFENDER status, sort by impact (lowest first)
    // Use calculateDroneImpact to get consistent value measurement
    const impactA = calculateDroneImpact(a, attackDetails.lane, gameDataService);
    const impactB = calculateDroneImpact(b, attackDetails.lane, gameDataService);
    return impactA - impactB; // Ascending - sacrifice least valuable first
  });

  for (const interceptor of sortedInterceptors) {
    const interceptorClass = interceptor.class ?? Infinity;
    const hasDefender = hasDefenderKeyword(interceptor);
    const logic = [];
    let score = 0;
    let shouldIntercept = false;

    // Calculate survivability using BASE attack damage (what interceptor actually takes)
    const durability = (interceptor.hull || 0) + (interceptor.currentShields || 0);
    const survives = durability > baseAttackDamage;
    const damageTaken = Math.min(baseAttackDamage, durability);
    const damageRatio = durability > 0 ? damageTaken / durability : 1;

    // Add basic info to logic
    // For ship attacks, show both values clearly
    if (attackDetails.targetType === 'section') {
      logic.push(`Interceptor takes: ${baseAttackDamage} dmg (base attack)`);
      logic.push(`Prevents ship damage: ${shipThreatDamage} dmg (attack + bonus)`);
      logic.push(`Attacker: ${target.name} (class ${targetClass})`);
    } else {
      logic.push(`Threat: ${baseAttackDamage} dmg (Attacker class ${targetClass})`);
    }
    logic.push(`Interceptor: ${interceptor.name} (class ${interceptorClass})`);
    logic.push(`Durability: ${durability} (${interceptor.hull}H + ${interceptor.currentShields}S)`);
    logic.push(`Survivability: ${survives ? '✅ SURVIVES' : '❌ DIES'} (${damageTaken} dmg, ${(damageRatio * 100).toFixed(0)}%)`);

    if (hasDefender) {
      logic.push(`⭐ DEFENDER: No exhaustion penalty`);
    }

    // === OPPORTUNITY COST CHECK (skip for DEFENDER drones) ===
    if (!hasDefender && opportunityCostData && opportunityCostData.maxBlockableThreat > 0) {
      // Check if there's a bigger threat worth saving interceptor for
      // Compare ship threats (includes bonus damage) for opportunity cost
      if (opportunityCostData.maxBlockableThreat > shipThreatDamage * 1.5) {
        score = -999;
        shouldIntercept = false;
        logic.push(`❌ Opportunity Cost: Save for bigger threat (${opportunityCostData.maxBlockableThreat} dmg > ${(shipThreatDamage * 1.5).toFixed(1)} dmg)`);

        decisionContext.push({
          instigator: interceptor.name,
          targetName: target.name,
          score,
          logic,
          isChosen: false
        });
        continue; // Skip this interceptor
      } else {
        logic.push(`✅ Opportunity Cost: No bigger threats (max ${opportunityCostData.maxBlockableThreat} dmg)`);
      }
    }

    // === IMPACT-BASED DECISIONS ===
    // Calculate impacts for attacker and interceptor to make nuanced trade decisions
    const attackerImpact = calculateDroneImpact(target, attackDetails.lane, gameDataService);
    const interceptorImpact = calculateDroneImpact(interceptor, attackDetails.lane, gameDataService);

    // Calculate what we're protecting
    let protectionValue = 0;

    if (attackDetails.targetType === 'section') {
      // Protecting ship - distinguish HULL vs SHIELD damage
      const gameState = gameStateManager.getState();
      const player2 = gameState.player2; // AI player
      const laneIndex = parseInt(attackDetails.lane.slice(-1)) - 1;
      const opponentPlacedSections = gameState.opponentPlacedSections; // Player2's (AI) sections
      const sectionName = opponentPlacedSections[laneIndex];

      if (sectionName && player2.shipSections[sectionName]) {
        const targetSection = player2.shipSections[sectionName];

        if (targetSection.allocatedShields > 0) {
          // Attacking shields - lower protection value
          protectionValue = shipThreatDamage * 5;
          logic.push(`🛡️ Protecting: Shields (value ${protectionValue.toFixed(0)})`);
        } else {
          // Attacking HULL - HIGH protection value (losing drones is better than hull damage)
          protectionValue = shipThreatDamage * 15;
          logic.push(`🛡️ Protecting: HULL (value ${protectionValue.toFixed(0)})`);
        }
      } else {
        // Fallback if section data not available
        protectionValue = shipThreatDamage * 10;
        logic.push(`🛡️ Protecting: Ship (value ${protectionValue.toFixed(0)})`);
      }
    } else {
      // Protecting another drone - use drone's impact value
      protectionValue = attackerImpact; // The value of the drone being attacked
      logic.push(`🛡️ Protecting: Drone (value ${protectionValue.toFixed(0)})`);
    }

    logic.push(`⚖️ Impact: Attacker ${attackerImpact.toFixed(0)} vs Interceptor ${interceptorImpact.toFixed(0)}`);

    // === DECISION LOGIC BASED ON SURVIVABILITY AND IMPACT ===
    if (survives) {
      // Interceptor survives - evaluate if worth the damage
      const impactRatio = interceptorImpact / attackerImpact;

      if (impactRatio < 0.3) {
        // Low-impact interceptor vs high-impact attacker - GREAT trade
        shouldIntercept = true;
        score = hasDefender ? 110 : 90;
        logic.push(`✅ Excellent: Low impact defender (ratio ${impactRatio.toFixed(2)})`);
      } else if (impactRatio < 0.7) {
        // Reasonable trade - good interception
        shouldIntercept = true;
        score = hasDefender ? 90 : 70;
        logic.push(`✅ Good: Defender impact favorable (ratio ${impactRatio.toFixed(2)})`);
      } else if (protectionValue > interceptorImpact * 1.5) {
        // High impact interceptor, but protecting something valuable
        shouldIntercept = true;
        score = hasDefender ? 70 : 50;
        logic.push(`✅ Protective: Saving ${protectionValue.toFixed(0)} value vs ${interceptorImpact.toFixed(0)} cost`);
      } else {
        // Not worth it - high impact interceptor for low value protection
        shouldIntercept = false;
        score = -999;
        logic.push(`❌ Poor value: Defender ${interceptorImpact.toFixed(0)} vs protection ${protectionValue.toFixed(0)}`);
      }
    } else {
      // Interceptor dies - sacrifice trade analysis
      const sacrificeRatio = protectionValue / interceptorImpact;

      if (sacrificeRatio > 2.0) {
        // Losing low-impact defender to save high-value target - GREAT sacrifice
        shouldIntercept = true;
        score = hasDefender ? 80 : 60; // DEFENDER doesn't actually die
        logic.push(`✅ Excellent sacrifice: Lose ${interceptorImpact.toFixed(0)} to save ${protectionValue.toFixed(0)} (ratio ${sacrificeRatio.toFixed(2)})`);
      } else if (sacrificeRatio > 1.3) {
        // Reasonable sacrifice trade
        shouldIntercept = true;
        score = hasDefender ? 70 : 45;
        logic.push(`✅ Good sacrifice: Lose ${interceptorImpact.toFixed(0)} to save ${protectionValue.toFixed(0)} (ratio ${sacrificeRatio.toFixed(2)})`);
      } else {
        // Bad trade - losing too much impact
        shouldIntercept = false;
        score = -999;
        logic.push(`❌ Poor sacrifice: Lose ${interceptorImpact.toFixed(0)} to save only ${protectionValue.toFixed(0)} (ratio ${sacrificeRatio.toFixed(2)})`);
      }
    }

    // DEFENDER bonus: Add extra score for DEFENDER drones
    if (hasDefender && shouldIntercept) {
      score += 20;
      logic.push(`⭐ DEFENDER bonus: +20`);
    }

    decisionContext.push({
      instigator: interceptor.name,
      targetName: target.name,
      score,
      logic,
      isChosen: false // Will be set later for chosen interceptor
    });

    // Choose first valid interceptor (already sorted by DEFENDER first, then class)
    if (shouldIntercept && !decisionContext.some(d => d.isChosen)) {
      decisionContext[decisionContext.length - 1].isChosen = true;
      debugLog('AI_DECISIONS', `🛡️ [INTERCEPTION] INTERCEPT with ${interceptor.name}${hasDefender ? ' (DEFENDER)' : ''} - Score: ${score}`);
      return { interceptor, decisionContext };
    }
  }

  // No valid interceptor found
  if (attackDetails.targetType === 'section') {
    debugLog('AI_DECISIONS', `🛡️ [INTERCEPTION] DECLINE - No valid interceptor for ${target.name} (ship threat ${shipThreatDamage} dmg, interceptor would take ${baseAttackDamage} dmg)`);
  } else {
    debugLog('AI_DECISIONS', `🛡️ [INTERCEPTION] DECLINE - No valid interceptor for ${target.name} (threat ${baseAttackDamage} dmg)`);
  }
  return { interceptor: null, decisionContext };
};

export const aiBrain = {
  handleOpponentTurn,
  handleOpponentAction,
  makeInterceptionDecision,
};
