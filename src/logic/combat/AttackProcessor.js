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
