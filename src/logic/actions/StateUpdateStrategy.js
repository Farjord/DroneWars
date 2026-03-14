// State update strategies: processDraw, processEnergyReset, processRoundEndTriggers,
// processRebuildProgress, processMomentumAward
// Extracted from ActionProcessor.js — handles round-level state updates.

import { debugLog } from '../../utils/debugLogger.js';

/**
 * Process automatic draw action
 * @param {Object} payload - { player1, player2 } with draw results
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processDraw(payload, ctx) {
  const { player1, player2 } = payload;

  debugLog('CARDS', '🃏 ActionProcessor: Processing automatic draw');

  ctx.setState({ player1, player2 });

  return {
    success: true,
    message: 'Draw completed',
    player1,
    player2
  };
}

/**
 * Process energy reset action
 * @param {Object} payload - { player1, player2, shieldsToAllocate, opponentShieldsToAllocate, roundNumber }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processEnergyReset(payload, ctx) {
  const { player1, player2, shieldsToAllocate, opponentShieldsToAllocate, roundNumber } = payload;

  debugLog('RESOURCE_RESET', `⚡ Processing energy reset (round ${roundNumber})`);

  // Update player states AND roundNumber atomically to prevent race condition
  ctx.setState({
    player1,
    player2,
    ...(roundNumber !== undefined && { roundNumber })
  }, 'PLAYER_STATES_SET');

  // Update shields to allocate if provided (round 2+ only)
  if (shieldsToAllocate !== undefined) {
    ctx.setState({ shieldsToAllocate });
  }
  if (opponentShieldsToAllocate !== undefined) {
    ctx.setState({ opponentShieldsToAllocate });
  }

  debugLog('ENERGY', `✅ Energy reset complete - Shields to allocate: ${shieldsToAllocate || 0}, ${opponentShieldsToAllocate || 0}`);

  return {
    success: true,
    message: 'Energy reset completed',
    player1,
    player2,
    shieldsToAllocate,
    opponentShieldsToAllocate
  };
}

/**
 * Process ON_ROUND_END triggered abilities
 * @param {Object} payload - { player1, player2 } with updated states
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processRoundEndTriggers(payload, ctx) {
  const { player1, player2, animationEvents } = payload;

  debugLog('PHASE_TRANSITIONS', '🎯 ActionProcessor: Processing round end triggers');

  if (animationEvents?.length > 0) {
    const animations = ctx.mapAnimationEvents(animationEvents);
    ctx.captureAnimations(animations);
  }

  ctx.setState({
    player1,
    player2
  }, 'ROUND_END_TRIGGERS');

  debugLog('PHASE_TRANSITIONS', '✅ Round end triggers complete');

  return {
    success: true,
    message: 'Round end triggers processed',
    player1,
    player2
  };
}

/**
 * Process drone rebuild progress
 * @param {Object} payload - { player1?, player2? } with updated droneAvailability
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processRebuildProgress(payload, ctx) {
  const { player1, player2 } = payload;

  debugLog('PHASE_MANAGER', '🔧 ActionProcessor: Processing drone rebuild progress');

  const stateUpdate = {};
  if (player1) stateUpdate.player1 = player1;
  if (player2) stateUpdate.player2 = player2;

  ctx.setState(stateUpdate, 'REBUILD_PROGRESS');

  debugLog('PHASE_MANAGER', '✅ Drone rebuild progress complete');

  return {
    success: true,
    message: 'Drone rebuild progress processed',
    player1,
    player2
  };
}

/**
 * Process momentum award
 * @param {Object} payload - { player1?, player2? }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processMomentumAward(payload, ctx) {
  const { player1, player2 } = payload;

  debugLog('PHASE_MANAGER', '🚀 ActionProcessor: Processing momentum award');

  const stateUpdate = {};
  if (player1) stateUpdate.player1 = player1;
  if (player2) stateUpdate.player2 = player2;

  ctx.setState(stateUpdate, 'MOMENTUM_AWARD');

  const awardedTo = player1 ? 'Player 1' : player2 ? 'Player 2' : 'None';
  debugLog('PHASE_MANAGER', `✅ Momentum award complete - Awarded to: ${awardedTo}`);

  return {
    success: true,
    message: 'Momentum award processed',
    player1,
    player2
  };
}
