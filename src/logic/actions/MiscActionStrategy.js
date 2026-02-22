// Miscellaneous action strategies: processStatusConsumption, processDebugAddCardsToHand,
// processForceWin
// Extracted from ActionProcessor.js — handles status effects, debug tools, dev actions.

import { debugLog } from '../../utils/debugLogger.js';

/**
 * Process status effect consumption (snared or suppressed)
 * @param {string} statusType - 'snared' or 'suppressed'
 * @param {Object} params - { droneId, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processStatusConsumption(statusType, { droneId, playerId }, ctx) {
  const statusFlag = statusType === 'snared' ? 'isSnared' : 'isSuppressed';
  const actionVerb = statusType === 'snared' ? 'move' : 'attack';
  const statusLabel = statusType === 'snared' ? 'Snare' : 'Suppressed';

  const currentState = ctx.getState();
  const playerState = currentState[playerId];
  const newPlayerState = JSON.parse(JSON.stringify(playerState));

  for (const lane in newPlayerState.dronesOnBoard) {
    const drone = newPlayerState.dronesOnBoard[lane].find(d => d.id === droneId);
    if (drone) {
      drone[statusFlag] = false;
      drone.isExhausted = true;
      ctx.updatePlayerState(playerId, newPlayerState);
      ctx.addLogEntry({
        player: playerState.name,
        actionType: 'STATUS_CONSUMED',
        source: drone.name,
        target: lane.replace('lane', 'Lane '),
        outcome: `${drone.name}'s ${actionVerb} was cancelled — ${statusLabel} effect consumed. Drone is now exhausted.`
      });

      const laneNumber = lane.replace('lane', '');
      const animation = [{
        animationName: 'STATUS_CONSUMPTION',
        timing: 'independent',
        payload: {
          droneName: drone.name,
          laneNumber,
          statusType,
          targetPlayer: playerId,
          timestamp: Date.now()
        }
      }];

      ctx.captureAnimationsForBroadcast(animation);

      const gameMode = currentState.gameMode;
      if (gameMode === 'host' && animation.length > 0) {
        ctx.broadcastStateToGuest(`${statusType}Consumption`);
      }

      const animationManager = ctx.getAnimationManager();
      if (animationManager) {
        const source = gameMode === 'guest' ? 'GUEST_OPTIMISTIC' : gameMode === 'host' ? 'HOST_LOCAL' : 'LOCAL';
        await animationManager.executeAnimations(animation, source);
      }

      return {
        success: true,
        animations: {
          actionAnimations: animation,
          systemAnimations: []
        }
      };
    }
  }

  return { success: false, error: `Drone ${droneId} not found on board` };
}

/**
 * Process adding cards to a player's hand (DEBUG FEATURE)
 * @param {Object} payload - { playerId, cardInstances }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processDebugAddCardsToHand(payload, ctx) {
  const { playerId, cardInstances } = payload;

  debugLog('DEBUG_TOOLS', `🎴 ActionProcessor: Adding ${cardInstances.length} cards to ${playerId}'s hand`);

  const currentState = ctx.getState();
  const playerState = currentState[playerId];

  if (!playerState) {
    return { success: false, error: `Player ${playerId} not found` };
  }

  const updatedHand = [...playerState.hand, ...cardInstances];

  ctx.updatePlayerState(playerId, { hand: updatedHand });

  debugLog('DEBUG_TOOLS', `✅ Cards added successfully. New hand size: ${updatedHand.length}`);

  return {
    success: true,
    message: `Added ${cardInstances.length} cards to hand`,
    newHandSize: updatedHand.length
  };
}

/**
 * Process force win (DEBUG FEATURE)
 * Damages all opponent sections and triggers win condition check
 * @param {Object} _payload - unused
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export function processForceWin(_payload, ctx) {
  const currentState = ctx.getState();

  ctx.addLogEntry({
    player: 'SYSTEM',
    actionType: 'DEV_ACTION',
    source: 'Force Win',
    target: 'Opponent Ship',
    outcome: 'All opponent ship sections destroyed (DEV)'
  }, 'forceWin');

  const damagedSections = {
    bridge: { ...currentState.player2.shipSections.bridge, hull: 0 },
    powerCell: { ...currentState.player2.shipSections.powerCell, hull: 0 },
    droneControlHub: { ...currentState.player2.shipSections.droneControlHub, hull: 0 }
  };

  ctx.updatePlayerState('player2', {
    shipSections: damagedSections
  });

  ctx.checkWinCondition();
}
