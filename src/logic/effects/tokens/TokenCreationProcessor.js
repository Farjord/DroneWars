// ========================================
// TOKEN CREATION EFFECT PROCESSOR
// ========================================
// Handles CREATE_TOKENS effect type
// Extracts token creation logic from gameLogic.js resolveCreateTokensEffect()
// Creates drone tokens dynamically during gameplay
//
// ANIMATION: TELEPORT_IN for token spawning

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';
import fullDroneCollection from '../../../data/droneData.js';
import { countDroneTypeInLane } from '../../utils/gameEngineUtils.js';

/**
 * Processor for CREATE_TOKENS effect type
 *
 * Creates drone tokens (temporary drones spawned by cards) on the battlefield.
 * Tokens are full drone instances with stats, abilities, and lifecycle.
 *
 * Supports:
 * - Multiple token creation in specified lanes
 * - Deterministic instance ID generation (multiplayer-safe)
 * - Lane capacity validation (maxPerLane restrictions)
 * - Token marking for identification (isToken flag)
 * - Teleport-in animation for token appearance
 *
 * @extends BaseEffectProcessor
 */
class TokenCreationProcessor extends BaseEffectProcessor {
  /**
   * Process CREATE_TOKENS effect
   *
   * @param {Object} effect - Effect definition
   * @param {string} effect.type - Must be 'CREATE_TOKENS'
   * @param {string} effect.tokenName - Name of drone type to create as token
   * @param {Array<string>} effect.locations - Lane IDs where tokens should spawn
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player creating tokens
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.callbacks - Callback functions
   * @param {Object} context.card - Source card (for animation tracking)
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, callbacks, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const animationEvents = [];

    // Determine target player: tokens go on opponent's board if targetOwner is 'OPPONENT'
    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';
    const targetPlayerId = effect.targetOwner === 'OPPONENT' ? opponentPlayerId : actingPlayerId;
    const targetPlayerState = newPlayerStates[targetPlayerId];
    const actingPlayerState = newPlayerStates[actingPlayerId];

    // Look up base drone data
    const baseDrone = fullDroneCollection.find(d => d.name === effect.tokenName);

    if (!baseDrone) {
      debugLog('EFFECT_PROCESSING', `[CREATE_TOKENS] ⚠️ Token drone ${effect.tokenName} not found in drone collection`);
      return {
        newPlayerStates,
        additionalEffects: [],
        animationEvents: []
      };
    }

    // Derive locations from effect.locations or from context.target (lane-targeted cards)
    const locations = effect.locations || (context.target ? [context.target.id] : []);

    debugLog('EFFECT_PROCESSING', `[CREATE_TOKENS] ${actingPlayerId} creating ${effect.tokenName} tokens on ${targetPlayerId}'s board`, {
      tokenName: effect.tokenName,
      locations,
      targetOwner: effect.targetOwner || 'SELF',
      baseDrone: { attack: baseDrone.attack, hull: baseDrone.hull, shields: baseDrone.shields }
    });

    // Create tokens in specified lanes
    locations.forEach(laneId => {
      // Check maxPerLane restriction before creating token (check on the target player's board)
      if (baseDrone.maxPerLane) {
        const currentCountInLane = countDroneTypeInLane(targetPlayerState, baseDrone.name, laneId);

        if (currentCountInLane >= baseDrone.maxPerLane) {
          debugLog('EFFECT_PROCESSING', `[CREATE_TOKENS] ⚠️ Cannot create ${effect.tokenName} in ${laneId} (max per lane: ${baseDrone.maxPerLane})`);

          // Log restriction to user
          if (callbacks?.logCallback) {
            callbacks.logCallback({
              player: actingPlayerState.name,
              actionType: 'TOKEN_BLOCKED',
              outcome: `Could not create ${effect.tokenName} token in ${laneId} (max per lane: ${baseDrone.maxPerLane})`
            });
          }

          return; // Skip to next lane
        }
      }

      // Generate deterministic ID using the target player's deployment counter
      const deploymentNumber = (targetPlayerState.totalDronesDeployed || 0) + 1;
      const tokenId = `${targetPlayerId}_${baseDrone.name}_${deploymentNumber.toString().padStart(4, '0')}`;

      // Create unique token instance with all necessary properties
      const tokenDrone = {
        ...baseDrone,
        id: tokenId,  // Deterministic ID for multiplayer consistency
        name: baseDrone.name,
        attack: baseDrone.attack,
        hull: baseDrone.hull,
        shields: baseDrone.shields,
        speed: baseDrone.speed,
        currentShields: baseDrone.shields,
        currentMaxShields: baseDrone.shields,
        isExhausted: false,
        isToken: true, // Mark as token for identification
        deployedBy: actingPlayerId, // Track who deployed this token for visual ownership
        abilities: baseDrone.abilities ? JSON.parse(JSON.stringify(baseDrone.abilities)) : []
      };

      // Add to the target player's lane (opponent's board for OPPONENT tokens)
      targetPlayerState.dronesOnBoard[laneId].push(tokenDrone);

      // Increment target player's deployment counter for deterministic ID generation
      targetPlayerState.totalDronesDeployed = deploymentNumber;

      debugLog('EFFECT_PROCESSING', `[CREATE_TOKENS] Created ${tokenDrone.name} with ID ${tokenId} in ${laneId} (on ${targetPlayerId}'s board)`);

      // Add teleport-in animation for the token appearing (on the target player's board)
      animationEvents.push({
        type: 'TELEPORT_IN',  // Token spawn animation
        targetId: tokenDrone.id,
        targetPlayer: targetPlayerId,
        targetLane: laneId,
        sourceCardInstanceId: card?.instanceId,
        timestamp: Date.now()
      });

      // Log token creation
      if (callbacks?.logCallback) {
        callbacks.logCallback({
          player: actingPlayerState.name,
          actionType: 'TOKEN_CREATED',
          source: card?.name || 'Unknown',
          outcome: `Created a ${effect.tokenName} token in ${laneId}${effect.targetOwner === 'OPPONENT' ? ' (on opponent\'s board)' : ''}`
        });
      }
    });

    const result = {
      newPlayerStates,
      additionalEffects: [],
      animationEvents
    };

    this.logProcessComplete(effect, result, context);
    return result;
  }
}

export default TokenCreationProcessor;
