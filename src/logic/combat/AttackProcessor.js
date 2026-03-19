// ========================================
// ATTACK PROCESSOR
// ========================================
// Handles all combat attack resolution
// - resolveAttack: Main attack resolution with damage calculation
// - After-attack abilities (ON_ATTACK) delegated to TriggerProcessor

import { calculateEffectiveStats } from '../statsCalculator.js';
import { onDroneDestroyed } from '../utils/droneStateUtils.js';
import { updateAuras } from '../utils/auraManager.js';
import { getLaneOfDrone } from '../utils/gameEngineUtils.js';
import { calculateDamageByType } from '../utils/damageCalculation.js';
import fullDroneCollection from '../../data/droneData.js';
import { debugLog } from '../../utils/debugLogger.js';
import { createDroneAttackAnimation } from './animations/DroneAttackAnimation.js';
import { createShieldDamageAnimation } from './animations/ShieldDamageAnimation.js';
import { createDestructionAnimation } from './animations/DroneDestroyedAnimation.js';
import { createHullDamageAnimation } from './animations/HullDamageAnimation.js';
import { createSectionDamagedAnimation } from './animations/SectionDamagedAnimation.js';
import { createDroneReturnAnimation } from './animations/DroneReturnAnimation.js';
import TriggerProcessor from '../triggers/TriggerProcessor.js';
import { TRIGGER_TYPES } from '../triggers/triggerConstants.js';
import { buildAnimationSequence } from '../animations/AnimationSequenceBuilder.js';

/**
 * Resolve a combat attack
 *
 * Main attack resolution function that handles:
 * - Damage calculation (with piercing, bonuses, etc.)
 * - Shield and hull damage distribution
 * - Animation event creation (7 event types)
 * - State updates (destruction, exhaustion, auras)
 * - After-attack abilities (DESTROY_SELF, MODIFY_STAT)
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

    let attackerPlayerState = playerStates[attackingPlayerId];
    let defenderPlayerState = playerStates[defendingPlayerId];

    // Check if attacker can attack (status effect restriction or PASSIVE keyword)
    // Skip this check for card/ability attacks (no attacker drone)
    if (!isAbilityOrCard && attacker && attacker.id) {
        const attackerLaneForCheck = getLaneOfDrone(attacker.id, attackerPlayerState);
        const effectiveAttackerCheck = calculateEffectiveStats(
            attacker,
            attackerLaneForCheck,
            attackerPlayerState,
            defenderPlayerState,
            placedSections
        );

        if (effectiveAttackerCheck.keywords.has('PASSIVE') || attacker.cannotAttack) {
            return {
                newPlayerStates: playerStates,
                error: `${attacker.name} cannot attack${effectiveAttackerCheck.keywords.has('PASSIVE') ? ' (Passive)' : ''}.`,
                shouldShowErrorModal: true
            };
        }

        // Check if attacker is Suppressed (one-shot attack cancellation for AI path)
        if (attacker.isSuppressed) {
            const newPlayerStates = JSON.parse(JSON.stringify(playerStates));
            const atkState = newPlayerStates[attackingPlayerId];
            const atkDrone = atkState.dronesOnBoard[attackerLaneForCheck]?.find(d => d.id === attacker.id);
            if (atkDrone) {
                atkDrone.isSuppressed = false;
                atkDrone.isExhausted = true;
            }
            return {
                newPlayerStates,
                suppressedConsumed: true,
                shouldEndTurn: true,
                logEntry: `${attacker.name}'s attack was cancelled (Suppressed)`
            };
        }
    }

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

    // Process ON_LANE_ATTACK mine triggers (before damage calculation)
    // Only triggers for drone attacks, not card/ability attacks
    const mineAnimationEvents = [];
    if (!isAbilityOrCard && attacker && attacker.id && attackerLane) {
        const minePlayerStates = {
            [attackingPlayerId]: JSON.parse(JSON.stringify(attackerPlayerState)),
            [defendingPlayerId]: JSON.parse(JSON.stringify(defenderPlayerState))
        };
        const mineTriggerProcessor = new TriggerProcessor();
        const mineResult = mineTriggerProcessor.fireTrigger(TRIGGER_TYPES.ON_LANE_ATTACK, {
            lane: attackerLane,
            triggeringDrone: attacker,
            triggeringPlayerId: attackingPlayerId,
            actingPlayerId: attackingPlayerId,
            playerStates: minePlayerStates,
            placedSections,
            logCallback,
            currentTurnPlayerId: attackingPlayerId
        });

        if (mineResult.triggered) {
            // Apply mine state changes via reassignment (avoid mutating caller's input)
            attackerPlayerState = { ...mineResult.newPlayerStates[attackingPlayerId] };
            defenderPlayerState = { ...mineResult.newPlayerStates[defendingPlayerId] };
            playerStates[attackingPlayerId] = attackerPlayerState;
            playerStates[defendingPlayerId] = defenderPlayerState;

            mineAnimationEvents.push(...mineResult.animationEvents);

            // Re-calculate effective attacker stats if a stat mod was applied (e.g., Jitter Mine -4 attack)
            if (mineResult.statModsApplied) {
                // Re-find the attacker in updated state (it may have been modified)
                const updatedAttacker = attackerPlayerState.dronesOnBoard[attackerLane]?.find(d => d.id === attacker.id);
                if (updatedAttacker) {
                    effectiveAttacker = calculateEffectiveStats(
                        updatedAttacker,
                        attackerLane,
                        attackerPlayerState,
                        defenderPlayerState,
                        placedSections
                    );
                }
            }
        }
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

    // Check for conditional attack bonus (e.g., Shark vs marked targets)
    if (attacker && attacker.abilities && finalTargetType === 'drone') {
        const conditionalBonusAbility = attacker.abilities.find(
            ability => ability.type === 'PASSIVE' &&
                      ability.effect?.type === 'CONDITIONAL_ATTACK_BONUS' &&
                      ability.effect?.condition?.type === 'TARGET_IS_MARKED'
        );

        if (conditionalBonusAbility && finalTarget.isMarked) {
            damage += conditionalBonusAbility.effect.value;
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

    // Cache the target lane lookup (used by multiple animation events below)
    const finalTargetLane = finalTargetType === 'drone' ? getLaneOfDrone(finalTarget.id, defenderPlayerState) : null;

    // Always start with attack animation if there's an attacker
    if (attacker && attacker.id && !isAbilityOrCard) {
      const attackValue = effectiveAttacker ? effectiveAttacker.attack : 1;
      animationEvents.push(createDroneAttackAnimation(
        attacker,
        attackingPlayerId,
        attackerLane,
        finalTarget,
        defendingPlayerId,
        finalTargetLane,
        finalTargetType,
        attackValue,
        sourceCardInstanceId
      ));
    }

    // Add shield damage event if shields absorbed damage
    if (shieldDamage > 0) {
      animationEvents.push(createShieldDamageAnimation(
        finalTarget,
        defendingPlayerId,
        finalTargetLane,
        finalTargetType,
        shieldDamage,
        sourceCardInstanceId
      ));
    }

    // Handle destruction vs survival
    if (wasDestroyed) {
      // Target was destroyed
      animationEvents.push(createDestructionAnimation(
        finalTarget,
        defendingPlayerId,
        finalTargetLane,
        finalTargetType,
        sourceCardInstanceId
      ));
    } else {
      // Target survived - add hull damage event if hull was hit
      if (hullDamage > 0) {
        animationEvents.push(createHullDamageAnimation(
          finalTarget,
          defendingPlayerId,
          finalTargetLane,
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
        let foundTarget = false;

        // Search dronesOnBoard first
        for (const laneKey in newPlayerStates[defendingPlayerId].dronesOnBoard) {
            const targetIndex = newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey].findIndex(d => d.id === finalTarget.id);
            if (targetIndex !== -1) {
                foundTarget = true;
                if ((newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey][targetIndex].hull - hullDamage) <= 0) {
                    droneDestroyed = true;
                    const destroyedDrone = newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey][targetIndex];
                    newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey] =
                        newPlayerStates[defendingPlayerId].dronesOnBoard[laneKey].filter(d => d.id !== finalTarget.id);
                    Object.assign(newPlayerStates[defendingPlayerId], onDroneDestroyed(newPlayerStates[defendingPlayerId], destroyedDrone));
                } else {
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
    }

    // Shared trigger processor for all post-attack triggers (ON_ATTACK, ON_INTERCEPT, ON_ATTACKED)
    const triggerProcessor = new TriggerProcessor();
    const triggerEvents = [];

    // Handle attacker exhaustion and after-attack abilities (like DESTROY_SELF)
    if (!isAbilityOrCard && attacker && attacker.id) {
        let droneWasOnBoard = false;
        for (const laneKey in newPlayerStates[attackingPlayerId].dronesOnBoard) {
            const attackerIndex = newPlayerStates[attackingPlayerId].dronesOnBoard[laneKey].findIndex(d => d.id === attacker.id);
            if (attackerIndex !== -1) {
                // Exhaust attacker by default — trigger system may un-exhaust via DOES_NOT_EXHAUST
                newPlayerStates[attackingPlayerId].dronesOnBoard[laneKey][attackerIndex].isExhausted = true;

                droneWasOnBoard = true;
                break;
            }
        }

        if (droneWasOnBoard) {
            const afterAttackResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_ATTACK, {
                lane: attackerLane,
                triggeringDrone: attacker,
                triggeringPlayerId: attackingPlayerId,
                actingPlayerId: attackingPlayerId,
                playerStates: newPlayerStates,
                placedSections,
                logCallback
            });
            if (afterAttackResult.triggered) {
                newPlayerStates[attackingPlayerId] = afterAttackResult.newPlayerStates[attackingPlayerId];
                newPlayerStates[defendingPlayerId] = afterAttackResult.newPlayerStates[defendingPlayerId];
                if (afterAttackResult.animationEvents?.length > 0) {
                    triggerEvents.push(...afterAttackResult.animationEvents);
                }
            }

        }
    }

    // Note: Interceptors do NOT exhaust when intercepting - they can intercept multiple times per turn.
    // HP/shields naturally limit how many times a drone can intercept before being destroyed.

    // Track if attacker was destroyed by counter abilities
    let attackerDestroyedByCounter = false;

    // ON_INTERCEPT: Fire trigger on interceptor (handles Dogfight counter-damage via trigger system)
    // Uses pre-calculated effectiveInterceptor stats (before interceptor was potentially destroyed)
    // Must fire even if interceptor was destroyed — pass preSnapshotStats and skipLivenessCheck
    if (interceptor && effectiveInterceptor && attacker && attacker.id && !isAbilityOrCard) {
        const interceptResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_INTERCEPT, {
            lane: interceptorLane,
            triggeringDrone: interceptor,
            triggeringPlayerId: defendingPlayerId,
            actingPlayerId: attackingPlayerId,
            playerStates: newPlayerStates,
            placedSections,
            logCallback,
            preSnapshotStats: effectiveInterceptor,
            skipLivenessCheck: true,
            counterTargetDrone: attacker,
            counterTargetPlayerId: attackingPlayerId
        });
        if (interceptResult.triggered) {
            newPlayerStates[attackingPlayerId] = interceptResult.newPlayerStates[attackingPlayerId];
            newPlayerStates[defendingPlayerId] = interceptResult.newPlayerStates[defendingPlayerId];
            if (interceptResult.animationEvents?.length > 0) {
                triggerEvents.push(...interceptResult.animationEvents);
            }
        }
        if (interceptResult.attackerDestroyedByCounter) {
            attackerDestroyedByCounter = true;
        }
    }

    // ON_ATTACKED: Fire trigger on surviving targets (handles Retaliate counter-damage via trigger system)
    // Only fires from drone attacks (not cards), and only if the target survived
    // Does not fire if attacker was already destroyed by counter damage
    if (!isAbilityOrCard && attacker && attacker.id && !attackerDestroyedByCounter) {
        // Target retaliation (non-intercepted attacks)
        if (finalTargetType === 'drone' && !wasDestroyed && !interceptor) {
            const targetLane = getLaneOfDrone(finalTarget.id, newPlayerStates[defendingPlayerId]);
            if (targetLane) {
                const updatedTarget = newPlayerStates[defendingPlayerId].dronesOnBoard[targetLane]?.find(d => d.id === finalTarget.id);
                if (updatedTarget) {
                    const targetResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_ATTACKED, {
                        lane: targetLane,
                        triggeringDrone: updatedTarget,
                        triggeringPlayerId: defendingPlayerId,
                        actingPlayerId: attackingPlayerId,
                        playerStates: newPlayerStates,
                        placedSections,
                        logCallback,
                        counterTargetDrone: attacker,
                        counterTargetPlayerId: attackingPlayerId
                    });
                    if (targetResult.triggered) {
                        newPlayerStates[attackingPlayerId] = targetResult.newPlayerStates[attackingPlayerId];
                        newPlayerStates[defendingPlayerId] = targetResult.newPlayerStates[defendingPlayerId];
                        if (targetResult.animationEvents?.length > 0) {
                            triggerEvents.push(...targetResult.animationEvents);
                        }
                    }
                    if (targetResult.attackerDestroyedByCounter) {
                        attackerDestroyedByCounter = true;
                    }
                }
            }
        }

        // Interceptor retaliation — if interceptor survived, fire ON_ATTACKED on it
        // (Scorpion has both ON_INTERCEPT and ON_ATTACKED — the trigger system handles them independently)
        if (interceptor && !attackerDestroyedByCounter) {
            const interceptorInState = newPlayerStates[defendingPlayerId].dronesOnBoard[interceptorLane]?.find(d => d.id === interceptor.id);
            if (interceptorInState) {
                const interceptorAttackedResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_ATTACKED, {
                    lane: interceptorLane,
                    triggeringDrone: interceptorInState,
                    triggeringPlayerId: defendingPlayerId,
                    actingPlayerId: attackingPlayerId,
                    playerStates: newPlayerStates,
                    placedSections,
                    logCallback,
                    counterTargetDrone: attacker,
                    counterTargetPlayerId: attackingPlayerId
                });
                if (interceptorAttackedResult.triggered) {
                    newPlayerStates[attackingPlayerId] = interceptorAttackedResult.newPlayerStates[attackingPlayerId];
                    newPlayerStates[defendingPlayerId] = interceptorAttackedResult.newPlayerStates[defendingPlayerId];
                    if (interceptorAttackedResult.animationEvents?.length > 0) {
                        triggerEvents.push(...interceptorAttackedResult.animationEvents);
                    }
                }
            }
        }
    }

    // Capture intermediate state for STATE_SNAPSHOT (after damage, before trigger animations)
    const intermediateState = triggerEvents.length > 0
        ? JSON.parse(JSON.stringify(newPlayerStates))
        : null;

    // Build ordered sequence: mine anims + action anims → STATE_SNAPSHOT → triggers
    const allAnimationEvents = buildAnimationSequence([{
        actionEvents: [...mineAnimationEvents, ...animationEvents],
        triggerEvents,
        intermediateState,
    }]);

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
        animationEvents: allAnimationEvents,
        mineAnimationEventCount: mineAnimationEvents.length
    };
};
