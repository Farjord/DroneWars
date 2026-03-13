// Ship ability strategies: processRecallAbility, processTargetLockAbility,
// processRecalculateAbility, processRecalculateComplete,
// processReallocateShieldsAbility, processReallocateShieldsComplete,
// validateShipAbilityActivationLimit
// Extracted from ActionProcessor.js — handles all ship section ability flows.

import RecallAbilityProcessor from '../abilities/ship/RecallAbilityProcessor.js';
import TargetLockAbilityProcessor from '../abilities/ship/TargetLockAbilityProcessor.js';
import RecalculateAbilityProcessor from '../abilities/ship/RecalculateAbilityProcessor.js';
import ReallocateShieldsAbilityProcessor from '../abilities/ship/ReallocateShieldsAbilityProcessor.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';

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

  const placedSections = ctx.getPlacedSections()[playerId];

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
    { isPlayerAI: ctx.isPlayerAI }
  );

  if (result.newPlayerStates) {
    ctx.updatePlayerState('player1', result.newPlayerStates.player1);
    ctx.updatePlayerState('player2', result.newPlayerStates.player2);
  }

  // State-based delivery: broadcast mandatoryAction via game state so guests receive it
  if (result.mandatoryAction) {
    ctx.setState({ mandatoryActionPending: result.mandatoryAction });
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

  ctx.setState({ mandatoryActionPending: null });

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
