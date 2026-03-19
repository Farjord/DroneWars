// ========================================
// TECH CREATION EFFECT PROCESSOR
// ========================================
// Handles CREATE_TECH effect type
// Creates tech (mines, beacons, jammers) in player.techSlots
// Tech are non-combat enchantment-like entities with their own lane sublayer.
//
// ANIMATION: TECH_DEPLOY for tech spawning

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';
import fullTechCollection from '../../data/techData.js';
import { countDroneTypeInLane, MAX_TECH_PER_LANE } from '../utils/gameEngineUtils.js';
import { TECH_DEPLOY } from '../../config/animationTypes.js';

/**
 * Processor for CREATE_TECH effect type
 *
 * Creates Techs in player.techSlots (not dronesOnBoard).
 * Modeled after TokenCreationProcessor but routes to techSlots.
 *
 * @extends BaseEffectProcessor
 */
class TechCreationProcessor extends BaseEffectProcessor {
  /**
   * Process CREATE_TECH effect
   *
   * @param {Object} effect - Effect definition
   * @param {string} effect.tokenName - Name of Tech to create
   * @param {Array<string>} [effect.locations] - Lane IDs where Tech should spawn
   * @param {Object} context - Effect context
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, callbacks, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const animationEvents = [];

    // All tech deploys to acting player's own board
    const targetPlayerId = actingPlayerId;
    const targetPlayerState = newPlayerStates[targetPlayerId];
    const actingPlayerState = newPlayerStates[actingPlayerId];

    // Ensure techSlots exists
    if (!targetPlayerState.techSlots) {
      targetPlayerState.techSlots = { lane1: [], lane2: [], lane3: [] };
    }

    // Look up base Tech data
    const baseTech = fullTechCollection.find(d => d.name === effect.tokenName);

    if (!baseTech) {
      debugLog('EFFECT_PROCESSING', `[CREATE_TECH] Tech ${effect.tokenName} not found in tech collection`);
      return { newPlayerStates, additionalEffects: [], animationEvents: [] };
    }

    // Derive locations from effect.locations or from context.target (lane-targeted cards)
    const locations = effect.locations || (context.target ? [context.target.id] : []);

    debugLog('EFFECT_PROCESSING', `[CREATE_TECH] ${actingPlayerId} creating ${effect.tokenName} in techSlots`, {
      tokenName: effect.tokenName,
      locations,
      targetPlayerId
    });

    locations.forEach(laneId => {
      // Check tech slot capacity
      if ((targetPlayerState.techSlots[laneId]?.length || 0) >= MAX_TECH_PER_LANE) {
        debugLog('EFFECT_PROCESSING', `[CREATE_TECH] Cannot create ${effect.tokenName} in ${laneId} (tech slots full: ${MAX_TECH_PER_LANE}/${MAX_TECH_PER_LANE})`);

        if (callbacks?.logCallback) {
          callbacks.logCallback({
            player: actingPlayerState.name,
            actionType: 'TECH_BLOCKED',
            outcome: `Could not create ${effect.tokenName} in ${laneId} (tech slots full: ${MAX_TECH_PER_LANE}/${MAX_TECH_PER_LANE})`
          });
        }
        return;
      }

      // Check maxPerLane restriction (searches both dronesOnBoard and techSlots via countDroneTypeInLane)
      if (baseTech.maxPerLane) {
        const currentCount = countDroneTypeInLane(targetPlayerState, baseTech.name, laneId);

        if (currentCount >= baseTech.maxPerLane) {
          debugLog('EFFECT_PROCESSING', `[CREATE_TECH] Cannot create ${effect.tokenName} in ${laneId} (max per lane: ${baseTech.maxPerLane})`);

          if (callbacks?.logCallback) {
            callbacks.logCallback({
              player: actingPlayerState.name,
              actionType: 'TECH_BLOCKED',
              outcome: `Could not create ${effect.tokenName} in ${laneId} (max per lane: ${baseTech.maxPerLane})`
            });
          }
          return;
        }
      }

      // Generate deterministic ID using target player's deployment counter
      const deploymentNumber = (targetPlayerState.totalDronesDeployed || 0) + 1;
      const techId = `${targetPlayerId}_${baseTech.name}_${deploymentNumber.toString().padStart(4, '0')}`;

      const techDrone = {
        ...baseTech,
        id: techId,
        name: baseTech.name,
        hull: baseTech.hull,
        isExhausted: false,
        isToken: true,
        isTech: true,
        deployedBy: actingPlayerId,
        abilities: baseTech.abilities ? JSON.parse(JSON.stringify(baseTech.abilities)) : []
      };

      // Add to techSlots (not dronesOnBoard)
      targetPlayerState.techSlots[laneId].push(techDrone);

      // Increment deployment counter for deterministic ID generation
      targetPlayerState.totalDronesDeployed = deploymentNumber;

      debugLog('EFFECT_PROCESSING', `[CREATE_TECH] Created ${techDrone.name} with ID ${techId} in techSlots.${laneId} (on ${targetPlayerId}'s board)`);

      // Tech deploy animation
      animationEvents.push({
        type: TECH_DEPLOY,
        targetId: techDrone.id,
        targetPlayer: targetPlayerId,
        targetLane: laneId,
        sourceCardInstanceId: card?.instanceId,
        timestamp: Date.now()
      });

      if (callbacks?.logCallback) {
        callbacks.logCallback({
          player: actingPlayerState.name,
          actionType: 'TECH_CREATED',
          source: card?.name || 'Unknown',
          outcome: `Created a ${effect.tokenName} in ${laneId}`
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

export default TechCreationProcessor;
