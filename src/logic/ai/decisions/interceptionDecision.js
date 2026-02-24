// ========================================
// INTERCEPTION DECISION
// ========================================
// Handles AI interception decisions during combat
// Includes analyzeRemainingThreats helper used exclusively by makeInterceptionDecision

import fullDroneCollection from '../../../data/droneData.js';
import { debugLog } from '../../../utils/debugLogger.js';

import { hasDogfightKeyword } from '../helpers/index.js';

import { INTERCEPTION } from '../aiConstants.js';

import {
  calculateDroneImpact,
} from '../scoring/index.js';

// ========================================
// INTERCEPTION DECISION HELPERS
// ========================================

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
 * NOTE: Interceptors do NOT exhaust when intercepting - they can intercept multiple
 * times per turn. HP/shields naturally limit how many times a drone can intercept.
 *
 * ENHANCEMENTS:
 * 1. Survivability-based decisions (hull + shields vs damage)
 * 2. Opportunity cost analysis (scan for bigger threats)
 *
 * @param {Array} potentialInterceptors - Drones that can intercept (pre-filtered for speed/keywords)
 * @param {Object} target - The attacker drone
 * @param {Object} attackDetails - Full attack context (attacker, target, targetType, lane)
 * @param {Object} gameDataService - GameDataService instance for stat calculations
 * @param {Object} gameStateManager - GameStateManager for accessing game state
 * @returns {Object} - { interceptor: drone | null, decisionContext: Array }
 */
export const makeInterceptionDecision = (potentialInterceptors, target, attackDetails, gameDataService, gameStateManager) => {
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

  // Sort interceptors by least impact first
  // This ensures we use lowest-value drones for interception first
  // Note: All drones can now intercept multiple times (no exhaustion on intercept)
  const sortedInterceptors = [...potentialInterceptors].sort((a, b) => {
    const impactA = calculateDroneImpact(a, attackDetails.lane, gameDataService);
    const impactB = calculateDroneImpact(b, attackDetails.lane, gameDataService);
    return impactA - impactB; // Ascending - use least valuable first
  });

  for (const interceptor of sortedInterceptors) {
    const interceptorClass = interceptor.class ?? Infinity;
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

    // === OPPORTUNITY COST CHECK ===
    // Note: Interceptors don't exhaust, but we still check opportunity cost
    // to avoid intercepting weak attacks when stronger threats are incoming
    if (opportunityCostData && opportunityCostData.maxBlockableThreat > 0) {
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
        score = 90;
        logic.push(`✅ Excellent: Low impact defender (ratio ${impactRatio.toFixed(2)})`);
      } else if (impactRatio < 0.7) {
        // Reasonable trade - good interception
        shouldIntercept = true;
        score = 70;
        logic.push(`✅ Good: Defender impact favorable (ratio ${impactRatio.toFixed(2)})`);
      } else if (protectionValue > interceptorImpact * 1.5) {
        // High impact interceptor, but protecting something valuable
        shouldIntercept = true;
        score = 50;
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
        score = 60;
        logic.push(`✅ Excellent sacrifice: Lose ${interceptorImpact.toFixed(0)} to save ${protectionValue.toFixed(0)} (ratio ${sacrificeRatio.toFixed(2)})`);
      } else if (sacrificeRatio > 1.3) {
        // Reasonable sacrifice trade
        shouldIntercept = true;
        score = 45;
        logic.push(`✅ Good sacrifice: Lose ${interceptorImpact.toFixed(0)} to save ${protectionValue.toFixed(0)} (ratio ${sacrificeRatio.toFixed(2)})`);
      } else {
        // Bad trade - losing too much impact
        shouldIntercept = false;
        score = -999;
        logic.push(`❌ Poor sacrifice: Lose ${interceptorImpact.toFixed(0)} to save only ${protectionValue.toFixed(0)} (ratio ${sacrificeRatio.toFixed(2)})`);
      }
    }

    // DOGFIGHT bonus: Add extra score for DOGFIGHT drones (deal damage to attacker)
    const hasDogfight = hasDogfightKeyword(interceptor);
    if (hasDogfight && shouldIntercept) {
      // Calculate dogfight damage using effective stats
      const interceptorEffective = gameDataService.getEffectiveStats(interceptor, attackDetails.lane);
      const dogfightDamage = interceptorEffective.attack || 0;

      if (dogfightDamage > 0) {
        // Calculate if dogfight would kill the attacker
        const attackerDurability = (target.hull || 0) + (target.currentShields || 0);
        const wouldKillAttacker = dogfightDamage >= attackerDurability;

        if (wouldKillAttacker) {
          score += INTERCEPTION.DOGFIGHT_KILL_BONUS;
          logic.push(`🐕 DOGFIGHT: +${INTERCEPTION.DOGFIGHT_KILL_BONUS} (${dogfightDamage} dmg - KILLS attacker)`);
        } else {
          const dogfightBonus = dogfightDamage * INTERCEPTION.DOGFIGHT_DAMAGE_MULTIPLIER;
          score += dogfightBonus;
          logic.push(`🐕 DOGFIGHT: +${dogfightBonus} (${dogfightDamage} dmg to attacker)`);
        }
      }
    }

    decisionContext.push({
      instigator: interceptor.name,
      targetName: target.name,
      score,
      logic,
      isChosen: false // Will be set later for chosen interceptor
    });

    // Choose first valid interceptor (already sorted by lowest impact first)
    if (shouldIntercept && !decisionContext.some(d => d.isChosen)) {
      decisionContext[decisionContext.length - 1].isChosen = true;
      debugLog('AI_DECISIONS', `🛡️ [INTERCEPTION] INTERCEPT with ${interceptor.name} - Score: ${score}`);
      // Capture decision for CSV export
      const turn = gameStateManager.getState().turn;
      const player1 = gameStateManager.getState().player1;
      const player2 = gameStateManager.getState().player2;
      gameStateManager.addAIDecisionToHistory('interception', turn, decisionContext, { player1, player2 });
      return { interceptor, decisionContext };
    }
  }

  // No valid interceptor found
  if (attackDetails.targetType === 'section') {
    debugLog('AI_DECISIONS', `🛡️ [INTERCEPTION] DECLINE - No valid interceptor for ${target.name} (ship threat ${shipThreatDamage} dmg, interceptor would take ${baseAttackDamage} dmg)`);
  } else {
    debugLog('AI_DECISIONS', `🛡️ [INTERCEPTION] DECLINE - No valid interceptor for ${target.name} (threat ${baseAttackDamage} dmg)`);
  }
  // Capture decision for CSV export
  const turn = gameStateManager.getState().turn;
  const player1 = gameStateManager.getState().player1;
  const player2 = gameStateManager.getState().player2;
  gameStateManager.addAIDecisionToHistory('interception', turn, decisionContext, { player1, player2 });
  return { interceptor: null, decisionContext };
};
