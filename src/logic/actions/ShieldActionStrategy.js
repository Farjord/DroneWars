// Shield action strategies: processAddShield, processResetShields, processReallocateShields
// Extracted from ActionProcessor.js — handles shield allocation actions.

import { gameEngine } from '../gameLogic.js';
import ShieldManager from '../shields/ShieldManager.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Process adding a shield during allocation phase
 * @param {Object} payload - { sectionName, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processAddShield(payload, ctx) {
  const { sectionName, playerId } = payload;

  debugLog('ENERGY', `🛡️ ActionProcessor: Processing shield addition for ${playerId}, section ${sectionName}`);

  const currentState = ctx.getState();

  // Determine which shieldsToAllocate to use
  const shieldsToAllocateKey = playerId === 'player1' ? 'shieldsToAllocate' : 'opponentShieldsToAllocate';

  const result = ShieldManager.processShieldAllocation(
    { ...currentState, shieldsToAllocate: currentState[shieldsToAllocateKey] },
    playerId,
    sectionName
  );

  if (!result.success) {
    debugLog('ENERGY', `Shield allocation failed: ${result.error}`);
    return result;
  }

  ctx.updatePlayerState(playerId, result.newPlayerState);

  ctx.setState({
    [shieldsToAllocateKey]: result.newShieldsToAllocate
  });

  debugLog('ENERGY', `✅ Shield added to ${sectionName}, ${result.newShieldsToAllocate} shields remaining`);

  return {
    success: true,
    message: `Shield added to ${sectionName}`,
    sectionName,
    shieldsRemaining: result.newShieldsToAllocate
  };
}

/**
 * Process shield allocation reset
 * @param {Object} payload - { playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processResetShields(payload, ctx) {
  const { playerId } = payload;

  debugLog('ENERGY', `🔄 ActionProcessor: Processing shield allocation reset for ${playerId}`);

  const currentState = ctx.getState();

  const result = ShieldManager.processResetShieldAllocation(currentState, playerId);

  if (!result.success) {
    debugLog('ENERGY', `Shield reset failed: ${result.error}`);
    return result;
  }

  ctx.updatePlayerState(playerId, result.newPlayerState);

  const shieldsToAllocateKey = playerId === 'player1' ? 'shieldsToAllocate' : 'opponentShieldsToAllocate';
  ctx.setState({
    [shieldsToAllocateKey]: result.newShieldsToAllocate
  });

  debugLog('ENERGY', `✅ Shield allocation reset, ${result.newShieldsToAllocate} shields available`);

  return {
    success: true,
    message: 'Shield allocation reset',
    shieldsToAllocate: result.newShieldsToAllocate
  };
}

/**
 * Process action-phase shield reallocation (remove/add/restore)
 * @param {Object} payload - { action, sectionName, originalShipSections, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processReallocateShields(payload, ctx) {
  const {
    action,
    sectionName,
    originalShipSections,
    playerId = ctx.getLocalPlayerId()
  } = payload;

  const currentState = ctx.getState();

  if (currentState.turnPhase !== 'action') {
    throw new Error(`Shield reallocation through ActionProcessor is only valid during action phase, not ${currentState.turnPhase}`);
  }

  debugLog('ENERGY', `[SHIELD REALLOCATION DEBUG] Processing action phase shield reallocation:`, { action, sectionName, playerId });

  const playerState = currentState[playerId];

  if (action === 'remove') {
    const section = playerState.shipSections[sectionName];
    if (!section || section.allocatedShields <= 0) {
      return {
        success: false,
        error: 'Cannot remove shield from this section'
      };
    }

    const newShipSections = {
      ...playerState.shipSections,
      [sectionName]: {
        ...playerState.shipSections[sectionName],
        allocatedShields: playerState.shipSections[sectionName].allocatedShields - 1
      }
    };

    const newPlayerState = {
      ...playerState,
      shipSections: newShipSections
    };

    ctx.updatePlayerState(playerId, newPlayerState);

    debugLog('ENERGY', `[SHIELD REALLOCATION DEBUG] Shield removed from ${sectionName}`);
    return {
      success: true,
      action: 'remove',
      sectionName,
      newPlayerState
    };

  } else if (action === 'add') {
    const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;
    const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, playerState, placedSections);
    const section = playerState.shipSections[sectionName];

    if (!section || section.allocatedShields >= effectiveMaxShields) {
      return {
        success: false,
        error: 'Cannot add shield to this section'
      };
    }

    const newShipSections = {
      ...playerState.shipSections,
      [sectionName]: {
        ...playerState.shipSections[sectionName],
        allocatedShields: playerState.shipSections[sectionName].allocatedShields + 1
      }
    };

    const newPlayerState = {
      ...playerState,
      shipSections: newShipSections
    };

    ctx.updatePlayerState(playerId, newPlayerState);

    debugLog('ENERGY', `[SHIELD REALLOCATION DEBUG] Shield added to ${sectionName}`);
    return {
      success: true,
      action: 'add',
      sectionName,
      newPlayerState
    };

  } else if (action === 'restore') {
    if (!originalShipSections) {
      return {
        success: false,
        error: 'No original ship sections provided for restore'
      };
    }

    const newPlayerState = {
      ...playerState,
      shipSections: originalShipSections
    };

    ctx.updatePlayerState(playerId, newPlayerState);

    debugLog('ENERGY', `[SHIELD REALLOCATION DEBUG] Shield allocation restored to original state`);
    return {
      success: true,
      action: 'restore',
      newPlayerState
    };
  }

  return {
    success: false,
    error: `Unknown reallocation action: ${action}`
  };
}
