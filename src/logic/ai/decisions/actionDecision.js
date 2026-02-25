// ========================================
// ACTION DECISION
// ========================================
// Handles AI action selection during action phase
// Also contains active ability helpers used exclusively by handleOpponentAction

import fullDroneCollection from '../../../data/droneData.js';
import GameDataService from '../../../services/GameDataService.js';
import { debugLog } from '../../../utils/debugLogger.js';
import SeededRandom from '../../../utils/seededRandom.js';

import {
  hasJammerKeyword,
  countDroneTypeInLane,
} from '../helpers/index.js';

import { DRONE_PACING, THRUSTER_INHIBITOR } from '../aiConstants.js';

import { evaluateCardPlay } from '../cardEvaluators/index.js';
import { evaluateDroneAttack, evaluateShipAttack } from '../attackEvaluators/index.js';
import { evaluateMove } from '../moveEvaluator.js';

import { applyJammerAdjustments } from '../adjustmentPasses/jammerAdjustment.js';
import { applyInterceptionAdjustments } from '../adjustmentPasses/interceptionAdjustment.js';
import { applyAntiShipAdjustments } from '../adjustmentPasses/antiShipAdjustment.js';
import { applyMovementInhibitorAdjustments } from '../adjustmentPasses/movementInhibitorAdjustment.js';

import { isCardConditionMet } from '../../targeting/CardConditionValidator.js';
import { isLaneControlCardPlayable } from '../../targeting/LaneControlValidator.js';

// ========================================
// ACTIVE ABILITY TARGET HELPER
// ========================================

/**
 * Get valid targets for an active ability
 */
export const getActiveAbilityTargets = (ability, sourceDrone, player1, player2) => {
  const targets = [];
  const { targeting, effect } = ability;

  if (!targeting) return [];

  // Handle SELF targeting - return the source drone itself as the target
  if (targeting.type === 'SELF') {
    return [{
      ...sourceDrone,
      owner: 'player2'  // AI is always player2
    }];
  }

  const owner = targeting.affinity === 'FRIENDLY' ? player2 : player1;
  const lanes = targeting.location === 'SAME_LANE'
    ? [sourceDrone.lane]
    : targeting.location === 'OTHER_LANES'
      ? ['lane1', 'lane2', 'lane3'].filter(l => l !== sourceDrone.lane)
      : ['lane1', 'lane2', 'lane3'];

  for (const lane of lanes) {
    const dronesInLane = owner.dronesOnBoard[lane] || [];

    for (const drone of dronesInLane) {
      // Apply restriction filters
      const restrictions = targeting.restrictions;
      if (restrictions?.includes('DAMAGED_HULL')) {
        if (drone.hull >= drone.maxHull) continue; // Only target damaged drones
      }

      targets.push({
        ...drone,
        lane,
        owner: targeting.affinity === 'FRIENDLY' ? 'player2' : 'player1'
      });
    }
  }

  return targets;
};

/**
 * Evaluate the value of using an active ability
 */
export const evaluateActiveAbility = (ability, target, currentEnergy) => {
  const { effect } = ability;
  let score = 0;

  switch (effect.type) {
    case 'HEAL': {
      // Calculate actual healing (capped by missing hull)
      const missingHull = (target.maxHull || target.hull) - target.hull;
      const actualHeal = Math.min(effect.value, missingHull);

      if (actualHeal <= 0) return -999; // Invalid - no healing needed

      // Base value: 8 per hull healed
      score = actualHeal * 8;

      // Bonus for healing high-value drones
      score += (target.class || 0) * 5;
      break;
    }

    case 'DAMAGE': {
      const damage = effect.value;

      // Base damage value
      score = damage * 8;

      // Check for lethal
      const durability = (target.hull || 0) + (target.currentShields || 0);
      if (damage >= durability) {
        // Lethal bonus
        score += 50 + (target.class || 0) * 15;
      }

      // Bonus for cross-lane targeting (Sniper can hit other lanes)
      if (ability.targeting?.location === 'ANY_LANE' || ability.targeting?.location === 'OTHER_LANES') {
        score += 20;
      }
      break;
    }

    case 'DESTROY_TOKEN_SELF': {
      // Purge ability: self-destruct a Thruster Inhibitor token
      // Value depends on how many friendly drones are locked down in the lane
      const lane = target.lane;
      // Score is calculated in the adjustment pass with full context
      // Provide a base value here
      score = THRUSTER_INHIBITOR.PURGE_BASE_VALUE;
      break;
    }

    default:
      score = 10; // Default small value for unknown abilities
  }

  return score;
};

// ========================================
// ACTION DECISION
// ========================================

/**
 * Action decision flow:
 * 1. Generate all possible actions (card plays, attacks, moves, active abilities)
 * 2. Score each action using appropriate evaluators
 * 3. Apply adjustment passes (Jammer, Interception, Anti-Ship, Movement Inhibitor)
 * 4. Apply drone disadvantage pacing
 * 5. Select from top-scoring actions
 *
 * Returns:
 * - { type: 'pass' } if no positive actions
 * - { type: 'action', payload: chosenAction, logContext: possibleActions }
 */
export const handleOpponentAction = ({ player1, player2, placedSections, opponentPlacedSections, getShipStatus, getLaneOfDrone, gameStateManager, getValidTargets, addLogEntry }) => {
    // Create GameDataService instance for centralized data computation
    const gameDataService = GameDataService.getInstance(gameStateManager);
    const allSections = { player1: placedSections, player2: opponentPlacedSections };
    const possibleActions = [];
    const uniqueCardPlays = new Set();
    const readyAiDrones = Object.entries(player2.dronesOnBoard).flatMap(([lane, drones]) =>
      drones.filter(d => !d.isExhausted).map(d => ({ ...d, lane }))
    );

    const playerStates = { player1, player2 };

    const playableCards = player2.hand.filter(card => {
      // Check energy cost
      if (player2.energy < card.cost) return false;
      // Check momentum cost (if card has one)
      if (card.momentumCost && (player2.momentum || 0) < card.momentumCost) return false;
      // Check generic playCondition (e.g., Out Think's LANE_CONTROL_COMPARISON)
      if (card.playCondition) {
        if (!isCardConditionMet(card, 'player2', playerStates)) return false;
      }
      // Check lane control conditions (ex-Doctrine cards with effect.condition)
      if (card.effect?.condition) {
        if (!isLaneControlCardPlayable(card, 'player2', playerStates)) return false;
      }
      // Skip NONE-type cards that require modal interaction (upgrades, System Sabotage)
      // Purge Protocol (NONE + scope: 'ALL') auto-resolves without a modal, so allow it through.
      if (card.targeting?.type === 'NONE' && card.effect?.scope !== 'ALL') return false;
      return true;
    });
    for (const card of playableCards) {
      // Normal targeted cards (DRONE, LANE, SHIP_SECTION — not SINGLE_MOVE or NONE)
      if (card.targeting && card.effect?.type !== 'SINGLE_MOVE' && card.targeting.type !== 'NONE') {
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
      }
      // SINGLE_MOVE
      else if (card.effect?.type === 'SINGLE_MOVE') {
        for (const drone of readyAiDrones) {
          const fromLaneIndex = parseInt(drone.lane.slice(-1));

          [fromLaneIndex - 1, fromLaneIndex + 1].forEach(toLaneIndex => {
            if (toLaneIndex >= 1 && toLaneIndex <= 3) {
              const toLane = `lane${toLaneIndex}`;
              const fromLane = drone.lane;

              const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
              if (baseDrone && baseDrone.maxPerLane) {
                const currentCountInTarget = countDroneTypeInLane(player2, drone.name, toLane);
                if (currentCountInTarget >= baseDrone.maxPerLane) {
                  return;
                }
              }

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

      // Skip drones with 0 attack - they can't deal damage
      const effectiveAttackerStats = gameDataService.getEffectiveStats(attacker, attacker.lane);
      if (effectiveAttackerStats.attack <= 0) {
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

      // Check for INHIBIT_MOVEMENT keyword preventing moves out of this lane
      const dronesInFromLane = player2.dronesOnBoard[drone.lane] || [];
      const hasMovementInhibitor = dronesInFromLane.some(d =>
        d.abilities?.some(a => a.effect?.keyword === 'INHIBIT_MOVEMENT')
      );
      if (hasMovementInhibitor) continue; // Skip all moves from inhibited lanes

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

    // Generate active ability actions (Repair, Sniper, etc.)
    for (const drone of readyAiDrones) {
      if (drone.isExhausted) continue; // Can't use abilities if exhausted

      const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
      const activeAbilities = baseDrone?.abilities?.filter(a => a.type === 'ACTIVE') || [];

      for (const ability of activeAbilities) {
        // Check energy cost
        if (ability.cost?.energy && player2.energy < ability.cost.energy) continue;

        // Get valid targets based on ability targeting
        const targets = getActiveAbilityTargets(ability, drone, player1, player2);

        for (const target of targets) {
          possibleActions.push({
            type: 'use_ability',
            drone,
            ability,
            target,
            score: 0
          });
        }
      }
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
      getValidTargets,
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

        case 'use_ability': {
          const { drone, ability, target } = action;
          action.instigator = `${drone.name} (${ability.name})`;
          action.targetName = target?.name || 'N/A';

          // Evaluate active ability
          score = evaluateActiveAbility(ability, target, player2.energy);
          action.logic.push(`✅ Active Ability: ${ability.name}`);

          if (score > 0) {
            action.logic.push(`✅ Effect Value: +${score}`);
          }

          // Energy cost penalty
          if (ability.cost?.energy) {
            const costPenalty = ability.cost.energy * 4;
            score -= costPenalty;
            action.logic.push(`⚠️ Energy Cost: -${costPenalty}`);
          }

          action.score = score;
          break;
        }

        default:
          break;
      }

      // Enrich targetName with lane info for targeted actions
      if (action.type === 'attack') {
        const laneNumber = action.attacker.lane.slice(-1);
        action.targetName = `${action.targetName} (Lane ${laneNumber})`;
      } else if ((action.type === 'play_card' || action.type === 'use_ability') && action.target) {
        const playerState = action.target.owner === 'player1' ? player1 : player2;
        const laneId = getLaneOfDrone(action.target.id, playerState);
        if (laneId) {
          action.targetName = `${action.targetName} (Lane ${laneId.slice(-1)})`;
        }
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

    // ========================================
    // MOVEMENT INHIBITOR ADJUSTMENT PASS
    // ========================================
    // Boost attacks against Thruster Inhibitors and Purge ability usage
    applyMovementInhibitorAdjustments(possibleActions, evaluationContext);

    // ========================================
    // DRONE DISADVANTAGE PACING PASS
    // ========================================
    // When AI has fewer ready drones, prefer card plays over drone actions
    const readyPlayerDrones = Object.values(player1.dronesOnBoard).flat().filter(d => !d.isExhausted);
    if (readyAiDrones.length <= readyPlayerDrones.length - DRONE_PACING.READY_DRONE_DEFICIT_THRESHOLD) {
      for (const action of possibleActions) {
        if (action.type === 'play_card' && action.score > 0) {
          action.score += DRONE_PACING.NON_DRONE_ACTION_BONUS;
          action.logic = action.logic || [];
          action.logic.push(`+${DRONE_PACING.NON_DRONE_ACTION_BONUS} Pacing (AI has ${readyAiDrones.length} ready drones vs player's ${readyPlayerDrones.length})`);
        }
      }
    }

    const topScore = possibleActions.length > 0 ? Math.max(...possibleActions.map(a => a.score)) : 0;

    if (topScore <= 0) {
        addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during action phase.` }, 'aiActionPass', possibleActions);
        // Capture decision for CSV export
        const turn = gameStateManager.getState().turn;
        gameStateManager.addAIDecisionToHistory('action', turn, possibleActions, { player1, player2 });
      return { type: 'pass' };
    }

    const actionPool = possibleActions.filter(action => action.score >= topScore - 20);
    const positiveActionPool = actionPool.filter(action => action.score > 0);

    if (positiveActionPool.length === 0) {
      addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: 'Passed (no positive actions in pool).' }, 'aiActionPass', possibleActions);
      return { type: 'pass' };
    }

    const rng = SeededRandom.fromGameState(gameStateManager.getState());
    const chosenAction = positiveActionPool[Math.floor(rng.random() * positiveActionPool.length)];

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

    // Capture decision for CSV export
    const turn = gameStateManager.getState().turn;
    gameStateManager.addAIDecisionToHistory('action', turn, possibleActions, { player1, player2 });

    return { type: 'action', payload: chosenAction, logContext: possibleActions };
};
