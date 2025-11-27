// ========================================
// JAMMER ADJUSTMENT PASS
// ========================================
// Applies Jammer-related score adjustments after initial scoring
// - Marks blocked card plays as invalid
// - Boosts Jammer removal attacks

import { JAMMER, INVALID_SCORE } from '../aiConstants.js';
import { hasJammerKeyword, hasJammerInLane } from '../helpers/jammerHelpers.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * Apply Jammer adjustment pass to scored actions
 * Multi-pass approach:
 * 1. Identify blocked card plays and mark them invalid
 * 2. Calculate blocked value per lane
 * 3. Boost Jammer removal attacks by blocked value
 *
 * @param {Array} possibleActions - Array of scored actions
 * @param {Object} context - Evaluation context
 * @returns {Array} - Modified possibleActions with Jammer adjustments
 */
export const applyJammerAdjustments = (possibleActions, context) => {
  const { player1, player2, getLaneOfDrone, gameDataService } = context;

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
          action.score = INVALID_SCORE;
          action.logic.push('❌ BLOCKED BY JAMMER');
        }
      }
    }
  });

  // Step 1.5: Calculate comprehensive value of ALL affordable cards blocked by Jammers
  const jammerAffordableBlockedValue = {
    lane1: 0,
    lane2: 0,
    lane3: 0
  };

  player2.hand.forEach(card => {
    // Only consider affordable cards
    if (player2.energy >= card.cost && card.targeting) {
      // Check if this card targets enemy drones
      const targetsEnemyDrones =
        card.targeting.type === 'DRONE' &&
        (card.targeting.affinity === 'ENEMY' || card.targeting.affinity === 'ANY');

      if (targetsEnemyDrones) {
        // Check ALL enemy drones to see what would be targetable
        Object.entries(player1.dronesOnBoard).forEach(([laneId, drones]) => {
          if (hasJammerInLane(player1, laneId)) {
            drones.forEach(drone => {
              const isJammer = hasJammerKeyword(drone);

              // Skip Jammers themselves
              if (!isJammer) {
                let cardValue = 0;

                if (card.effect.type === 'DESTROY' && card.effect.scope === 'SINGLE') {
                  const resourceValue = (drone.hull || 0) + (drone.currentShields || 0);
                  cardValue = (resourceValue * 8) - (card.cost * 4);
                } else if (card.effect.type === 'DAMAGE' && card.effect.scope === 'SINGLE') {
                  const damageValue = card.effect.value * 8;
                  const costPenalty = card.cost * 4;
                  cardValue = damageValue - costPenalty;

                  // Add lethal bonus if damage kills target
                  if (card.effect.value >= drone.hull) {
                    cardValue += (drone.class * 15) + 50;
                  }
                } else if (card.effect.type === 'READY_DRONE') {
                  cardValue = drone.class * 12;
                }

                // Only accumulate positive value
                if (cardValue > 0) {
                  jammerAffordableBlockedValue[laneId] += cardValue;
                }
              }
            });
          }
        });
      }
    }
  });

  debugLog('AI_DECISIONS', '[JAMMER BONUS] Comprehensive affordable blocked value:', {
    lane1: jammerAffordableBlockedValue.lane1,
    lane2: jammerAffordableBlockedValue.lane2,
    lane3: jammerAffordableBlockedValue.lane3,
    affordableCards: player2.hand.filter(c => player2.energy >= c.cost).length,
    totalCards: player2.hand.length
  });

  // Step 2: Apply Jammer removal bonuses to attacks
  possibleActions.forEach(action => {
    if (action.type === 'attack' &&
        action.targetType === 'drone' &&
        hasJammerKeyword(action.target)) {

      const targetLane = action.attacker.lane;

      // Use the higher of blocked value or affordable blocked value
      const blockedValue = jammerBlockedValue[targetLane];
      const affordableBlockedValue = jammerAffordableBlockedValue[targetLane];
      const totalBlockedValue = Math.max(blockedValue, affordableBlockedValue);

      if (totalBlockedValue > 0) {
        action.score += totalBlockedValue;

        if (affordableBlockedValue > blockedValue) {
          action.logic.push(`🎯 Jammer Removal: +${totalBlockedValue.toFixed(0)} (unblocks affordable cards)`);
        } else {
          action.logic.push(`🎯 Jammer Removal: +${totalBlockedValue.toFixed(0)} (unblocks current actions)`);
        }
      }

      // Efficiency bonus: prefer low-attack drones for Jammer removal
      const effectiveAttacker = gameDataService.getEffectiveStats(action.attacker, targetLane);
      if (effectiveAttacker.attack <= JAMMER.EFFICIENCY_ATTACK_THRESHOLD && totalBlockedValue > 0) {
        action.score += JAMMER.EFFICIENCY_BONUS;
        action.logic.push(`✅ Efficient Trade: +${JAMMER.EFFICIENCY_BONUS}`);
      }
    }
  });

  return possibleActions;
};
