// ========================================
// UPGRADE CARD EVALUATORS
// ========================================
// Evaluates MODIFY_DRONE_BASE effect type for upgrade cards

import fullDroneCollection from '../../../data/droneData.js';
import { SCORING_WEIGHTS, UPGRADE_EVALUATION, CARD_EVALUATION } from '../aiConstants.js';
import {
  getDeployedDroneCount,
  getReadyDroneCountByType,
  getRemainingDeploymentCapacity,
  getRemainingUpgradeSlots,
  droneHasUpgradedKeyword,
} from '../helpers/upgradeHelpers.js';
import { hasReadyNotFirstActionDrones } from '../helpers/keywordHelpers.js';

/**
 * Evaluate a MODIFY_DRONE_BASE (Upgrade) card
 *
 * Scoring Philosophy:
 * - Upgrades are "highly prized" - base scores are substantial
 * - Value scales with deployed drone count (immediate impact)
 * - Ready drones get extra bonus (can use upgrade this turn)
 * - Higher class drones benefit more from upgrades
 * - Synergistic upgrades get bonuses (attack on fast drones, etc.)
 *
 * @param {Object} card - The upgrade card being played
 * @param {Object} target - The target drone card from activeDronePool
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateModifyDroneBaseCard = (card, target, context) => {
  const { player2 } = context;
  const logic = [];
  let score = 0;

  // Validate target exists
  if (!target || !target.name) {
    return { score: -999, logic: ['No valid target'] };
  }

  const droneName = target.name;
  const baseDrone = fullDroneCollection.find(d => d.name === droneName);

  if (!baseDrone) {
    return { score: -999, logic: [`Invalid drone type: ${droneName}`] };
  }

  const mod = card.effect.mod;
  const droneClass = baseDrone.class || 1;

  // ========================================
  // 1. BASE VALUE BY UPGRADE TYPE
  // ========================================
  let baseValue = 0;
  let upgradeDescription = '';

  if (mod.stat === 'attack') {
    baseValue = UPGRADE_EVALUATION.ATTACK_UPGRADE_BASE * mod.value;
    upgradeDescription = `+${mod.value} Attack`;

    // Synergy: Attack on fast drones
    if (baseDrone.speed >= 4) {
      baseValue += UPGRADE_EVALUATION.ATTACK_ON_HIGH_SPEED;
      logic.push(`Synergy: Fast attacker: +${UPGRADE_EVALUATION.ATTACK_ON_HIGH_SPEED}`);
    }
  } else if (mod.stat === 'speed') {
    baseValue = UPGRADE_EVALUATION.SPEED_UPGRADE_BASE * mod.value;
    upgradeDescription = `+${mod.value} Speed`;

    // Synergy: Speed on high attack drones
    if (baseDrone.attack >= 3) {
      baseValue += UPGRADE_EVALUATION.SPEED_ON_HIGH_ATTACK;
      logic.push(`Synergy: Speedy heavy-hitter: +${UPGRADE_EVALUATION.SPEED_ON_HIGH_ATTACK}`);
    }
  } else if (mod.stat === 'shields') {
    baseValue = UPGRADE_EVALUATION.SHIELDS_UPGRADE_BASE * mod.value;
    upgradeDescription = `+${mod.value} Shields`;
  } else if (mod.stat === 'limit') {
    baseValue = UPGRADE_EVALUATION.LIMIT_UPGRADE_BASE * mod.value;
    upgradeDescription = `+${mod.value} Limit`;
  } else if (mod.stat === 'cost') {
    baseValue = UPGRADE_EVALUATION.COST_REDUCTION_BASE * Math.abs(mod.value);
    upgradeDescription = `${mod.value} Cost`;
  } else if (mod.stat === 'ability' && mod.abilityToAdd) {
    baseValue = UPGRADE_EVALUATION.ABILITY_GRANT_BASE;
    const keyword = mod.abilityToAdd.effect?.keyword || 'ability';
    upgradeDescription = `Grant ${keyword}`;

    // Synergy: Piercing on high attack drones
    if (keyword === 'PIERCING' && baseDrone.attack >= 3) {
      baseValue += UPGRADE_EVALUATION.PIERCING_ON_HIGH_ATTACK;
      logic.push(`Synergy: Piercing on heavy-hitter: +${UPGRADE_EVALUATION.PIERCING_ON_HIGH_ATTACK}`);
    }

    // Check if already has this keyword from upgrades
    if (droneHasUpgradedKeyword(player2, droneName, keyword)) {
      return { score: -999, logic: ['Drone already has this keyword from upgrade'] };
    }
  } else {
    // Unknown stat type - give modest base value
    baseValue = 20;
    upgradeDescription = `Unknown stat: ${mod.stat}`;
  }

  score += baseValue;
  logic.push(`Base (${upgradeDescription}): +${baseValue}`);

  // ========================================
  // 2. DRONE CLASS VALUE
  // ========================================
  const classBonus = droneClass * UPGRADE_EVALUATION.DRONE_CLASS_MULTIPLIER;
  score += classBonus;
  logic.push(`Drone Class (${droneClass}): +${classBonus}`);

  // ========================================
  // 3. DEPLOYED DRONE BONUS
  // ========================================
  const deployedCount = getDeployedDroneCount(player2, droneName);
  const readyCount = getReadyDroneCountByType(player2, droneName);

  if (deployedCount > 0) {
    const deployedBonus = deployedCount * UPGRADE_EVALUATION.DEPLOYED_DRONE_BONUS;
    score += deployedBonus;
    logic.push(`Deployed (${deployedCount}): +${deployedBonus}`);

    // Extra bonus for ready drones (can act with upgrade this turn)
    if (readyCount > 0) {
      const readyBonus = readyCount * UPGRADE_EVALUATION.READY_DRONE_BONUS;
      score += readyBonus;
      logic.push(`Ready (${readyCount}): +${readyBonus}`);
    }
  } else {
    // Penalty if no drones deployed - upgrade has no immediate impact
    score += UPGRADE_EVALUATION.NO_DEPLOYED_PENALTY;
    logic.push(`No deployed drones: ${UPGRADE_EVALUATION.NO_DEPLOYED_PENALTY}`);
  }

  // ========================================
  // 4. FUTURE DEPLOYMENT POTENTIAL
  // ========================================
  const remainingCapacity = getRemainingDeploymentCapacity(player2, droneName);

  if (remainingCapacity > 0) {
    const capacityBonus = remainingCapacity * UPGRADE_EVALUATION.REMAINING_LIMIT_MULTIPLIER;
    score += capacityBonus;
    logic.push(`Future deployments (${remainingCapacity}): +${capacityBonus}`);
  } else if (mod.stat !== 'limit') {
    // Penalty if at deployment cap (unless this is a limit upgrade)
    score += UPGRADE_EVALUATION.LOW_REMAINING_LIMIT_PENALTY;
    logic.push(`At deployment cap: ${UPGRADE_EVALUATION.LOW_REMAINING_LIMIT_PENALTY}`);
  }

  // ========================================
  // 5. UPGRADE SLOT SCARCITY
  // ========================================
  const remainingSlots = getRemainingUpgradeSlots(player2, droneName);

  // Bonus if this fills the last slot (scarcity value)
  if (remainingSlots === 1) {
    score += UPGRADE_EVALUATION.UPGRADE_SLOTS_SCARCITY;
    logic.push(`Last upgrade slot: +${UPGRADE_EVALUATION.UPGRADE_SLOTS_SCARCITY}`);
  }

  // ========================================
  // 6. COST PENALTY
  // ========================================
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`Cost (${card.cost}): -${costPenalty}`);

  // ========================================
  // 7. GO AGAIN BONUS
  // ========================================
  if (card.effect.goAgain) {
    score += CARD_EVALUATION.GO_AGAIN_BONUS;
    logic.push(`Go Again: +${CARD_EVALUATION.GO_AGAIN_BONUS}`);
    // Add bonus if we have ready drones that benefit from multiple actions
    if (hasReadyNotFirstActionDrones(player2)) {
      score += CARD_EVALUATION.NOT_FIRST_ACTION_ENABLER_BONUS;
      logic.push(`NOT_FIRST_ACTION enabler: +${CARD_EVALUATION.NOT_FIRST_ACTION_ENABLER_BONUS}`);
    }
  }

  return { score, logic };
};
