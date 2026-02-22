// Shield action strategies: processAddShield, processResetShields
// Extracted from ActionProcessor.js — handles shield allocation actions.

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
