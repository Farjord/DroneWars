// ========================================
// ATTACK PROCESSOR
// ========================================
// Handles all combat attack resolution
// - resolveAttack: Main attack resolution with damage calculation
// - calculateAfterAttackStateAndEffects: After-attack abilities (DESTROY_SELF, PERMANENT_STAT_MOD)

import { calculateEffectiveStats, calculateEffectiveShipStats } from '../statsCalculator.js';
import { onDroneDestroyed } from '../utils/droneStateUtils.js';
import { updateAuras } from '../utils/auraManager.js';
import { getLaneOfDrone } from '../utils/gameEngineUtils.js';
import fullDroneCollection from '../../data/droneData.js';
import { debugLog } from '../../utils/debugLogger.js';
import { createDroneAttackAnimation } from './animations/DroneAttackAnimation.js';
import { createShieldDamageAnimation } from './animations/ShieldDamageAnimation.js';
import { createDestructionAnimation } from './animations/DroneDestroyedAnimation.js';
import { createHullDamageAnimation } from './animations/HullDamageAnimation.js';
import { createSectionDamagedAnimation } from './animations/SectionDamagedAnimation.js';
import { createDroneReturnAnimation } from './animations/DroneReturnAnimation.js';
import { createDogfightDamageAnimation } from './animations/DogfightDamageAnimation.js';
import { createRetaliationDamageAnimation } from './animations/RetaliationDamageAnimation.js';

/**
 * Calculate damage distribution based on damage type
 * @param {number} damageValue - Total damage to apply
 * @param {number} shields - Target's current shields
 * @param {number} hull - Target's current hull
 * @param {string} damageType - NORMAL|PIERCING|SHIELD_BREAKER|ION|KINETIC
 * @returns {Object} { shieldDamage, hullDamage }
 */
const calculateDamageByType = (damageValue, shields, hull, damageType) => {
  switch (damageType) {
    case 'PIERCING':
      // Bypass shields entirely
      return { shieldDamage: 0, hullDamage: Math.min(damageValue, hull) };

    case 'SHIELD_BREAKER': {
      // Each point of damage removes 2 shield points
      // Remaining damage after shields are gone hits hull at 1:1
      const effectiveShieldDmg = Math.min(damageValue * 2, shields);
      const dmgUsedOnShields = Math.ceil(effectiveShieldDmg / 2);
      const remainingDmg = damageValue - dmgUsedOnShields;
      return {
        shieldDamage: effectiveShieldDmg,
        hullDamage: Math.min(Math.floor(remainingDmg), hull)
      };
    }

    case 'ION':
      // Only damages shields, excess is wasted
      return { shieldDamage: Math.min(damageValue, shields), hullDamage: 0 };

    case 'KINETIC':
      // Only damages hull, but completely blocked by any shields
      if (shields > 0) {
        return { shieldDamage: 0, hullDamage: 0 };
      }
      return { shieldDamage: 0, hullDamage: Math.min(damageValue, hull) };

    default: {
      // NORMAL: Damage shields first, then hull
      const shieldDmg = Math.min(damageValue, shields);
      const remainingDamage = damageValue - shieldDmg;
      return {
        shieldDamage: shieldDmg,
        hullDamage: Math.min(remainingDamage, hull)
      };
    }
  }
};

/**
 * Calculate after-attack state changes and effects
 *
 * Handles drone abilities that trigger AFTER an attack completes:
 * - DESTROY_SELF: Drone destroys itself after attacking (e.g., Ordnance drones)
 * - PERMANENT_STAT_MOD: Drone gains permanent stat boost after attacking
 *
 * @param {Object} playerState - Attacking player's state
 * @param {Object} attacker - Attacking drone
 * @param {string} attackingPlayerId - Player ID ('player1' or 'player2')
 * @returns {Object} { newState, effects, animationEvents }
 */
const calculateAfterAttackStateAndEffects = (playerState, attacker, attackingPlayerId) => {
  const baseDrone = fullDroneCollection.find(d => d.name === attacker.name);
  if (!baseDrone?.abilities) {
      return { newState: playerState, effects: [], animationEvents: [] };
  }

  let newState = JSON.parse(JSON.stringify(playerState));
  const effects = [];
  const animationEvents = [];
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
                  // Add proper animation event for attacker self-destruction
                  animationEvents.push({
                      type: 'DRONE_DESTROYED',
                      targetId: attacker.id,
                      targetPlayer: attackingPlayerId,
                      targetLane: lane,
                      targetType: 'drone',
                      timestamp: Date.now()
                  });

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
      effects,
      animationEvents
  };
};

/**
 * Apply counter damage (dogfight or retaliate) from one drone to another
 *
 * @param {Object} source - The drone dealing the counter damage
 * @param {Object} sourceEffectiveStats - The effective stats of the source drone
 * @param {string} sourcePlayerId - The player who owns the source drone
 * @param {string} sourceLane - The lane the source drone is in
 * @param {Object} target - The drone receiving the counter damage
 * @param {string} targetPlayerId - The player who owns the target drone
 * @param {Object} playerStates - Current player states (will be modified)
 * @param {Object} placedSections - Placed ship sections
 * @param {string} damageType - 'DOGFIGHT' or 'RETALIATE'
 * @returns {Object} { animationEvents, attackerDestroyed }
 */
const applyCounterDamage = (
  source,
  sourceEffectiveStats,
  sourcePlayerId,
  sourceLane,
  target,
  targetPlayerId,
  playerStates,
  placedSections,
  damageType
) => {
  const animationEvents = [];
  let attackerDestroyed = false;

  const damage = sourceEffectiveStats.attack || 0;
  if (damage <= 0) {
    return { animationEvents, attackerDestroyed };
  }

  const isPiercing = sourceEffectiveStats.keywords && sourceEffectiveStats.keywords.has('PIERCING');

  // Find the target drone in state
  for (const laneKey in playerStates[targetPlayerId].dronesOnBoard) {
    const targetIndex = playerStates[targetPlayerId].dronesOnBoard[laneKey].findIndex(d => d.id === target.id);
    if (targetIndex !== -1) {
      const targetDrone = playerStates[targetPlayerId].dronesOnBoard[laneKey][targetIndex];

      // Calculate damage distribution
      let shieldDamage = 0;
      let hullDamage = 0;
      let remainingDamage = damage;

      if (!isPiercing) {
        shieldDamage = Math.min(remainingDamage, targetDrone.currentShields || 0);
        remainingDamage -= shieldDamage;
      }
      hullDamage = Math.min(remainingDamage, targetDrone.hull);

      const wasDestroyed = (targetDrone.hull - hullDamage) <= 0;

      // Generate appropriate animation event
      if (damageType === 'DOGFIGHT') {
        animationEvents.push(createDogfightDamageAnimation(
          source,
          sourcePlayerId,
          sourceLane,
          target,
          targetPlayerId,
          laneKey,
          damage,
          shieldDamage,
          hullDamage
        ));
      } else {
        animationEvents.push(createRetaliationDamageAnimation(
          source,
          sourcePlayerId,
          sourceLane,
          target,
          targetPlayerId,
          laneKey,
          damage,
          shieldDamage,
          hullDamage
        ));
      }

      if (wasDestroyed) {
        // Remove destroyed drone
        attackerDestroyed = true;
        animationEvents.push(createDestructionAnimation(target, targetPlayerId, laneKey, 'drone'));
        const destroyedDrone = playerStates[targetPlayerId].dronesOnBoard[laneKey][targetIndex];
        playerStates[targetPlayerId].dronesOnBoard[laneKey] =
          playerStates[targetPlayerId].dronesOnBoard[laneKey].filter(d => d.id !== target.id);
        Object.assign(playerStates[targetPlayerId], onDroneDestroyed(playerStates[targetPlayerId], destroyedDrone));

        // Update auras after drone destruction
        const opponentPlayerId = targetPlayerId === 'player1' ? 'player2' : 'player1';
        playerStates[targetPlayerId].dronesOnBoard = updateAuras(
          playerStates[targetPlayerId],
          playerStates[opponentPlayerId],
          placedSections
        );
      } else {
        // Apply damage
        playerStates[targetPlayerId].dronesOnBoard[laneKey][targetIndex].hull -= hullDamage;
        playerStates[targetPlayerId].dronesOnBoard[laneKey][targetIndex].currentShields -= shieldDamage;
      }
      break;
    }
  }

  return { animationEvents, attackerDestroyed };
};

/**
 * Resolve a combat attack
 *
 * Main attack resolution function that handles:
 * - Damage calculation (with piercing, bonuses, etc.)
 * - Shield and hull damage distribution
 * - Animation event creation (7 event types)
 * - State updates (destruction, exhaustion, auras)
 * - After-attack abilities (DESTROY_SELF, PERMANENT_STAT_MOD)
 *
 * @param {Object} attackDetails - Attack configuration
 * @param {Object} playerStates - Current player states
 * @param {Object} placedSections - Placed ship sections
 * @param {Function} logCallback - Logging callback function
 * @returns {Object} { newPlayerStates, shouldEndTurn, attackResult, animationEvents }
 */
export const resolveAttack = (attackDetails, playerStates, placedSections, logCallback) => {
    const { attacker, target, targetType, interceptor, attackingPlayer, abilityDamage, goAgain, damageType, lane, aiContext, sourceCardInstanceId } = attackDetails;
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

    // Pre-calculate interceptor stats for DOGFIGHT ability (before it's potentially destroyed)
    let interceptorLane = null;
    let effectiveInterceptor = null;

    if (interceptor) {
        interceptorLane = getLaneOfDrone(interceptor.id, defenderPlayerState);
        effectiveInterceptor = calculateEffectiveStats(
            interceptor,
            interceptorLane,
            defenderPlayerState,
            attackerPlayerState,
            placedSections
        );
    }

    // Calculate damage
    let damage = abilityDamage ?? (effectiveAttacker ? Math.max(0, effectiveAttacker.attack) : 0);
    let finalDamageType = damageType || (attacker ? attacker.damageType : undefined);
    if (effectiveAttacker && effectiveAttacker.keywords && effectiveAttacker.keywords.has('PIERCING')) {
        finalDamageType = 'PIERCING';
    }

    // Check for conditional piercing (e.g., Hunter drone vs marked targets)
    if (attacker && attacker.abilities && finalTargetType === 'drone') {
        const conditionalPiercingAbility = attacker.abilities.find(
            ability => ability.type === 'PASSIVE' &&
                      ability.effect?.type === 'CONDITIONAL_KEYWORD' &&
                      ability.effect?.keyword === 'PIERCING' &&
                      ability.effect?.condition?.type === 'TARGET_IS_MARKED'
        );

        if (conditionalPiercingAbility && finalTarget.isMarked) {
            finalDamageType = 'PIERCING';
        }
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
            // Use damage type helper for all damage calculations
            const damageResult = calculateDamageByType(
                damage,
                targetInState.currentShields,
                targetInState.hull,
                finalDamageType
            );
            shieldDamage = damageResult.shieldDamage;
            hullDamage = damageResult.hullDamage;
            wasDestroyed = (targetInState.hull - hullDamage) <= 0;
            remainingShields = targetInState.currentShields - shieldDamage;
            remainingHull = wasDestroyed ? 0 : targetInState.hull - hullDamage;
        }
    } else {
        const sectionInState = defenderPlayerState.shipSections[finalTarget.name];
        if (sectionInState) {
            // Use damage type helper for ship section damage
            const damageResult = calculateDamageByType(
                damage,
                sectionInState.allocatedShields,
                sectionInState.hull,
                finalDamageType
            );
            shieldDamage = damageResult.shieldDamage;
            hullDamage = damageResult.hullDamage;
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

    // Create animation events array
    const animationEvents = [];

    // Always start with attack animation if there's an attacker
    if (attacker && attacker.id && !isAbilityOrCard) {
      const targetLane = finalTargetType === 'drone' ? getLaneOfDrone(finalTarget.id, defenderPlayerState) : null;
      const attackValue = effectiveAttacker ? effectiveAttacker.attack : 1;
      animationEvents.push(createDroneAttackAnimation(
        attacker,
        attackingPlayerId,
        attackerLane,
        finalTarget,
        defendingPlayerId,
        targetLane,
        finalTargetType,
        attackValue,
        sourceCardInstanceId
      ));
    }

    // Add shield damage event if shields absorbed damage
    if (shieldDamage > 0) {
      const targetLane = finalTargetType === 'drone' ? getLaneOfDrone(finalTarget.id, defenderPlayerState) : null;
      animationEvents.push(createShieldDamageAnimation(
        finalTarget,
        defendingPlayerId,
        targetLane,
        finalTargetType,
        shieldDamage,
        sourceCardInstanceId
      ));
    }

    // Handle destruction vs survival
    if (wasDestroyed) {
      // Target was destroyed
      const targetLane = finalTargetType === 'drone' ? getLaneOfDrone(finalTarget.id, defenderPlayerState) : null;
      animationEvents.push(createDestructionAnimation(
        finalTarget,
        defendingPlayerId,
        targetLane,
        finalTargetType,
        sourceCardInstanceId
      ));
    } else {
      // Target survived - add hull damage event if hull was hit
      if (hullDamage > 0) {
        const targetLane = finalTargetType === 'drone' ? getLaneOfDrone(finalTarget.id, defenderPlayerState) : null;
        animationEvents.push(createHullDamageAnimation(
          finalTarget,
          defendingPlayerId,
          targetLane,
          finalTargetType,
          hullDamage,
          sourceCardInstanceId
        ));
      }

      // Add section shake for any ship section damage
      if (finalTargetType === 'section' && (shieldDamage > 0 || hullDamage > 0)) {
        animationEvents.push(createSectionDamagedAnimation(
          finalTarget,
          defendingPlayerId,
          sourceCardInstanceId
        ));
      }

      // Attacker returns if target survived
      if (attacker && attacker.id && !isAbilityOrCard) {
        animationEvents.push(createDroneReturnAnimation(
          attacker,
          attackingPlayerId,
          attackerLane,
          sourceCardInstanceId
        ));
      }
    }

    debugLog('COMBAT', '[ANIMATION EVENTS] resolveAttack emitted:', animationEvents);

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
        }, 'resolveAttack', aiContext);
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
                    // Explosion animation already handled by DRONE_DESTROYED event in animationEvents array
                    const destroyedDrone = newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey][targetIndex];
                    newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey] =
                        newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey].filter(d => d.id !== finalTarget.id);
                    Object.assign(newPlayerStates[defendingPlayerId], onDroneDestroyed(newPlayerStates[defendingPlayerId], destroyedDrone));
                } else {
                    // Hit animation already handled by HULL_DAMAGE event in animationEvents array
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

    // Handle attacker exhaustion and after-attack abilities (like DESTROY_SELF)
    if (!isAbilityOrCard && attacker && attacker.id) {
        let droneWasOnBoard = false;
        for (const laneKey in newPlayerStates[attackingPlayerId].dronesOnBoard) {
            const attackerIndex = newPlayerStates[attackingPlayerId].dronesOnBoard[laneKey].findIndex(d => d.id === attacker.id);
            if (attackerIndex !== -1) {
                const attackerDrone = newPlayerStates[attackingPlayerId].dronesOnBoard[laneKey][attackerIndex];

                // Check if drone has ASSAULT keyword (first attack doesn't exhaust)
                const baseDrone = fullDroneCollection.find(d => d.name === attackerDrone.name);
                const hasAssault = baseDrone?.abilities?.some(
                    a => a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'ASSAULT'
                );
                const canUseAssault = hasAssault && !attackerDrone.assaultUsed;

                // ASSAULT allows first attack without exhaustion
                newPlayerStates[attackingPlayerId].dronesOnBoard[laneKey][attackerIndex].isExhausted = !canUseAssault;
                newPlayerStates[attackingPlayerId].dronesOnBoard[laneKey][attackerIndex].assaultUsed =
                    canUseAssault ? true : attackerDrone.assaultUsed;

                droneWasOnBoard = true;
                break;
            }
        }

        if (droneWasOnBoard) {
            const result = calculateAfterAttackStateAndEffects(newPlayerStates[attackingPlayerId], attacker, attackingPlayerId);
            newPlayerStates[attackingPlayerId] = result.newState;
            // Merge after-attack ability animation events
            if (result.animationEvents && result.animationEvents.length > 0) {
                animationEvents.push(...result.animationEvents);
            }
            // Handle LOG effects
            result.effects.forEach(effect => {
                if (effect.type === 'LOG' && logCallback) {
                    logCallback(effect.payload, 'afterAttack');
                }
            });
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

    // Track if attacker was destroyed by counter abilities
    let attackerDestroyedByCounter = false;

    // DOGFIGHT: If interceptor has DOGFIGHT keyword, deal damage back to attacker
    // Uses pre-calculated effectiveInterceptor stats (before interceptor was potentially destroyed)
    if (interceptor && effectiveInterceptor && attacker && attacker.id && !isAbilityOrCard) {
        if (effectiveInterceptor.keywords && effectiveInterceptor.keywords.has('DOGFIGHT')) {
            const dogfightResult = applyCounterDamage(
                interceptor,
                effectiveInterceptor,
                defendingPlayerId,
                interceptorLane,
                attacker,
                attackingPlayerId,
                newPlayerStates,
                placedSections,
                'DOGFIGHT'
            );
            animationEvents.push(...dogfightResult.animationEvents);
            if (dogfightResult.attackerDestroyed) {
                attackerDestroyedByCounter = true;
            }
        }
    }

    // RETALIATE: If target has RETALIATE keyword, survives, and was attacked by a drone (not intercepted)
    // Only triggers if the target was the ACTUAL target (not an interceptor)
    if (finalTargetType === 'drone' && !wasDestroyed && !interceptor && attacker && attacker.id && !isAbilityOrCard && !attackerDestroyedByCounter) {
        // Get the target's effective stats from updated state
        const targetLane = getLaneOfDrone(finalTarget.id, newPlayerStates[defendingPlayerId]);
        if (targetLane) {
            const updatedTarget = newPlayerStates[defendingPlayerId].dronesOnBoard[targetLane].find(d => d.id === finalTarget.id);
            if (updatedTarget) {
                const targetEffectiveStats = calculateEffectiveStats(
                    updatedTarget,
                    targetLane,
                    newPlayerStates[defendingPlayerId],
                    newPlayerStates[attackingPlayerId],
                    placedSections
                );
                if (targetEffectiveStats.keywords && targetEffectiveStats.keywords.has('RETALIATE')) {
                    const retaliateResult = applyCounterDamage(
                        updatedTarget,
                        targetEffectiveStats,
                        defendingPlayerId,
                        targetLane,
                        attacker,
                        attackingPlayerId,
                        newPlayerStates,
                        placedSections,
                        'RETALIATE'
                    );
                    animationEvents.push(...retaliateResult.animationEvents);
                }
            }
        }
    }

    // RETALIATE for interceptor: ONLY triggers if interceptor has BOTH DOGFIGHT and RETALIATE
    // An interceptor is not the "target" of an attack - it chose to intercept.
    // However, if it has both abilities and survives, both should trigger.
    if (interceptor && !wasDestroyed && effectiveInterceptor && attacker && attacker.id && !isAbilityOrCard && !attackerDestroyedByCounter) {
        const hasDogfight = effectiveInterceptor.keywords && effectiveInterceptor.keywords.has('DOGFIGHT');
        const hasRetaliate = effectiveInterceptor.keywords && effectiveInterceptor.keywords.has('RETALIATE');

        // Only trigger RETALIATE if the interceptor also has DOGFIGHT
        if (hasDogfight && hasRetaliate) {
            // Check if interceptor still exists (might have been destroyed by the attack)
            const interceptorPlayerId = defendingPlayerId;
            const interceptorInState = newPlayerStates[interceptorPlayerId].dronesOnBoard[interceptorLane]?.find(d => d.id === interceptor.id);
            if (interceptorInState) {
                // Get updated effective stats
                const updatedInterceptorStats = calculateEffectiveStats(
                    interceptorInState,
                    interceptorLane,
                    newPlayerStates[interceptorPlayerId],
                    newPlayerStates[attackingPlayerId],
                    placedSections
                );
                const retaliateResult = applyCounterDamage(
                    interceptorInState,
                    updatedInterceptorStats,
                    interceptorPlayerId,
                    interceptorLane,
                    attacker,
                    attackingPlayerId,
                    newPlayerStates,
                    placedSections,
                    'RETALIATE'
                );
                animationEvents.push(...retaliateResult.animationEvents);
            }
        }
    }

    return {
        newPlayerStates,
        shouldEndTurn: !goAgain,
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
            outcome
        },
        animationEvents
    };
};
