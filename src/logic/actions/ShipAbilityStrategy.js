// Ship ability strategies: processShipAbility, processShipAbilityCompletion,
// processRecallAbility, processTargetLockAbility, processRecalculateAbility,
// processRecalculateComplete, processReallocateShieldsAbility,
// processReallocateShieldsComplete, validateShipAbilityActivationLimit
// Extracted from ActionProcessor.js — handles all ship section ability flows.

import AbilityResolver from '../abilities/AbilityResolver.js';
import RecallAbilityProcessor from '../abilities/ship/RecallAbilityProcessor.js';
import TargetLockAbilityProcessor from '../abilities/ship/TargetLockAbilityProcessor.js';
import RecalculateAbilityProcessor from '../abilities/ship/RecalculateAbilityProcessor.js';
import ReallocateShieldsAbilityProcessor from '../abilities/ship/ReallocateShieldsAbilityProcessor.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Validate ship ability activation limit
 * @param {string} sectionName - Ship section name
 * @param {string} playerId - Player ID
 * @param {Object} playerStates - Current player states
 * @returns {Object|null} Error object if limit reached, null if valid
 */
export function validateShipAbilityActivationLimit(sectionName, playerId, playerStates) {
  const sectionDefinition = shipComponentCollection.find(s =>
    s.type.toLowerCase() === sectionName.toLowerCase() || s.name?.toLowerCase() === sectionName.toLowerCase()
  );
  const ability = sectionDefinition?.ability;

  if (ability?.activationLimit != null) {
    const sectionData = playerStates[playerId]?.shipSections?.[sectionName];
    const activations = sectionData?.abilityActivationCount || 0;
    if (activations >= ability.activationLimit) {
      return {
        error: `Ability ${ability.name} has reached its activation limit for this round`,
        shouldEndTurn: false,
        animationEvents: []
      };
    }
  }
  return null;
}

/**
 * Process ship ability action
 * @param {Object} payload - { ability, sectionName, targetId, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processShipAbility(payload, ctx) {
  const { ability, sectionName, targetId, playerId } = payload;

  const currentState = ctx.getState();
  const playerStates = { player1: currentState.player1, player2: currentState.player2 };
  const placedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

  const callbacks = {
    logCallback: (entry) => ctx.addLogEntry(entry),
    resolveAttackCallback: async (attackPayload) => {
      return await ctx.processAttack(attackPayload);
    }
  };

  const result = AbilityResolver.resolveShipAbility(
    ability,
    sectionName,
    targetId,
    playerStates,
    placedSections,
    callbacks,
    playerId
  );

  const animations = ctx.mapAnimationEvents(result.animationEvents);
  ctx.captureAnimationsForBroadcast(animations);
  await ctx.executeAnimationPhase(animations, result.newPlayerStates);

  return {
    ...result,
    animations: {
      actionAnimations: animations,
      systemAnimations: []
    }
  };
}

/**
 * Process ship ability completion (after UI confirmation)
 * Used for abilities that require multi-step UI interactions
 * Deducts energy cost and ends turn without re-executing ability logic
 * @param {Object} payload - { ability, sectionName, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processShipAbilityCompletion(payload, ctx) {
  const { ability, sectionName, playerId } = payload;

  const currentState = ctx.getState();
  const playerState = currentState[playerId];

  const newPlayerState = {
    ...playerState,
    energy: playerState.energy - ability.cost.energy
  };

  ctx.updatePlayerState(playerId, newPlayerState);

  ctx.addLogEntry({
    player: playerState.name,
    actionType: 'SHIP_ABILITY',
    source: `${sectionName}'s ${ability.name}`,
    target: 'N/A',
    outcome: `Completed ${ability.name}.`
  });

  debugLog('ENERGY', `💰 Ship ability completion: ${ability.name} cost ${ability.cost.energy} energy`, {
    playerId,
    previousEnergy: playerState.energy,
    newEnergy: newPlayerState.energy
  });

  return {
    success: true,
    shouldEndTurn: true,
    newPlayerStates: {
      player1: currentState.player1,
      player2: currentState.player2,
      [playerId]: newPlayerState
    }
  };
}

/**
 * Process Recall ship ability
 * Single-action: Recall drone + deduct energy + end turn
 * @param {Object} payload - { sectionName, playerId, ... }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processRecallAbility(payload, ctx) {
  const currentState = ctx.getState();
  const { sectionName, playerId } = payload;

  const limitError = validateShipAbilityActivationLimit(sectionName, playerId, { player1: currentState.player1, player2: currentState.player2 });
  if (limitError) return limitError;

  const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;

  const result = RecallAbilityProcessor.process(
    payload,
    { player1: currentState.player1, player2: currentState.player2 },
    placedSections
  );

  if (result.newPlayerStates) {
    ctx.updatePlayerState('player1', result.newPlayerStates.player1);
    ctx.updatePlayerState('player2', result.newPlayerStates.player2);
  }

  return result;
}

/**
 * Process Target Lock ship ability
 * Single-action: Mark drone + deduct energy + end turn
 * @param {Object} payload - { sectionName, playerId, ... }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processTargetLockAbility(payload, ctx) {
  const currentState = ctx.getState();
  const { sectionName, playerId } = payload;

  const limitError = validateShipAbilityActivationLimit(sectionName, playerId, { player1: currentState.player1, player2: currentState.player2 });
  if (limitError) return limitError;

  const result = TargetLockAbilityProcessor.process(
    payload,
    { player1: currentState.player1, player2: currentState.player2 }
  );

  if (result.newPlayerStates) {
    ctx.updatePlayerState('player1', result.newPlayerStates.player1);
    ctx.updatePlayerState('player2', result.newPlayerStates.player2);
  }

  return result;
}

/**
 * Process Recalculate ship ability
 * Multi-step: Deduct energy + draw card, return mandatoryAction
 * @param {Object} payload - { sectionName, playerId, ... }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processRecalculateAbility(payload, ctx) {
  const currentState = ctx.getState();
  const localPlayerId = ctx.getLocalPlayerId();
  const { sectionName, playerId } = payload;

  const limitError = validateShipAbilityActivationLimit(sectionName, playerId, { player1: currentState.player1, player2: currentState.player2 });
  if (limitError) return limitError;

  const result = RecalculateAbilityProcessor.process(
    payload,
    { player1: currentState.player1, player2: currentState.player2 },
    localPlayerId,
    currentState.gameMode
  );

  if (result.newPlayerStates) {
    ctx.updatePlayerState('player1', result.newPlayerStates.player1);
    ctx.updatePlayerState('player2', result.newPlayerStates.player2);
  }

  return result;
}

/**
 * Complete Recalculate ability after mandatory discard
 * @param {Object} payload - { playerId, ... }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processRecalculateComplete(payload, ctx) {
  const currentState = ctx.getState();

  const result = RecalculateAbilityProcessor.complete(
    payload,
    { player1: currentState.player1, player2: currentState.player2 }
  );

  return result;
}

/**
 * Process Reallocate Shields ship ability actions
 * Handles remove/add/restore actions during UI flow
 * @param {Object} payload - { playerId, ... }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processReallocateShieldsAbility(payload, ctx) {
  const currentState = ctx.getState();

  const result = ReallocateShieldsAbilityProcessor.process(
    payload,
    { player1: currentState.player1, player2: currentState.player2 },
    currentState
  );

  if (result.newPlayerStates) {
    ctx.updatePlayerState('player1', result.newPlayerStates.player1);
    ctx.updatePlayerState('player2', result.newPlayerStates.player2);
  }

  return result;
}

/**
 * Complete Reallocate Shields ability
 * Deduct energy and end turn when confirmed
 * @param {Object} payload - { playerId, ... }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processReallocateShieldsComplete(payload, ctx) {
  const currentState = ctx.getState();

  const result = ReallocateShieldsAbilityProcessor.complete(
    payload,
    { player1: currentState.player1, player2: currentState.player2 }
  );

  if (result.newPlayerStates) {
    ctx.updatePlayerState('player1', result.newPlayerStates.player1);
    ctx.updatePlayerState('player2', result.newPlayerStates.player2);
  }

  return result;
}
