// ========================================
// MOVEMENT EFFECT PROCESSOR
// ========================================
// Handles SINGLE_MOVE card effects
// Extracted from gameLogic.js Phase 7B

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { countDroneTypeInLane, MAX_DRONES_PER_LANE } from '../utils/gameEngineUtils.js';
import { updateAuras } from '../utils/auraManager.js';
import TriggerProcessor from '../triggers/TriggerProcessor.js';
import { TRIGGER_TYPES } from '../triggers/triggerConstants.js';
import { calculateEffectiveStats } from '../statsCalculator.js';
import fullDroneCollection from '../../data/droneData.js';
import { buildDefaultMovementAnimation } from './movement/animations/DefaultMovementAnimation.js';
import { debugLog } from '../../utils/debugLogger.js';
import { insertDroneInLane } from '../utils/laneInsertionUtils.js';
import { hasMovementInhibitorInLane } from '../../utils/gameUtils.js';


/**
 * MovementEffectProcessor
 * Processes SINGLE_MOVE effects for movement cards
 *
 * For human players: Returns needsCardSelection to trigger multi-step UI flow
 * For AI players: Auto-executes optimal movement using lane scoring
 *
 * Key features:
 * - Validates maxPerLane restrictions for limited drones (e.g., Jammer)
 * - Respects DO_NOT_EXHAUST property
 * - Supports goAgain property for extra actions
 * - Triggers ON_MOVE abilities
 * - Updates auras after movement
 * - Handles adjacency validation for SINGLE_MOVE
 */
class MovementEffectProcessor extends BaseEffectProcessor {
  /**
   * Process movement effect - routes to human or AI execution
   *
   * @param {Object} effect - Effect configuration (type: 'SINGLE_MOVE')
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with newPlayerStates or needsCardSelection
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, localPlayerId = 'player1', isPlayerAI, card } = context;

    // Determine if this is an AI player
    const isAI = isPlayerAI?.(actingPlayerId) ?? false;

    if (!isAI) {
      // Return needsCardSelection for human players
      return this.returnNeedsCardSelection(effect, card);
    } else {
      // Auto-execute for AI
      return this.executeAIMovement(effect, context);
    }
  }

  /**
   * Return needsCardSelection for human players
   * Triggers multi-step UI selection flow
   *
   * @param {Object} effect - Effect configuration
   * @param {Object} card - Card being played
   * @returns {Object} Result with needsCardSelection
   */
  returnNeedsCardSelection(effect, card) {
    return {
      newPlayerStates: null, // Signals that state is unchanged until selection complete
      additionalEffects: [],
      animationEvents: [],
      needsCardSelection: {
        type: 'single_move',
        card: card,
        effect: effect,
        maxDrones: 1,
        doNotExhaust: effect.properties?.includes('DO_NOT_EXHAUST') || false,
        // UI will handle multi-step selection (source lane, drones, destination)
        phase: 'select_drone'
      }
    };
  }

  /**
   * Execute AI movement - finds best movement and executes it
   *
   * @param {Object} effect - Effect configuration
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with updated states
   */
  executeAIMovement(effect, context) {
    const { actingPlayerId, playerStates } = context;
    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    const aiState = playerStates[actingPlayerId];
    const opponentState = playerStates[opponentPlayerId];

    // Find best movement opportunity for AI
    let bestMove = null;
    let bestScore = -Infinity;

    // Evaluate all possible movements
    for (const fromLane of ['lane1', 'lane2', 'lane3']) {
      const dronesInLane = aiState.dronesOnBoard[fromLane] || [];
      const availableDrones = dronesInLane.filter(d => !d.isExhausted);

      if (availableDrones.length === 0) continue;

      // Skip snared drones for card-triggered movement (they'd waste the move)
      const nonSnaredDrones = availableDrones.filter(d => !d.isSnared);
      if (nonSnaredDrones.length === 0) continue;

      for (const toLane of ['lane1', 'lane2', 'lane3']) {
        if (fromLane === toLane) continue;

        // Check lane capacity — skip full destination lanes
        const destCount = aiState.dronesOnBoard[toLane]?.length || 0;
        if (destCount >= MAX_DRONES_PER_LANE) continue;

        // For SINGLE_MOVE, check adjacency
        if (effect.type === 'SINGLE_MOVE') {
          const fromIndex = parseInt(fromLane.replace('lane', ''));
          const toIndex = parseInt(toLane.replace('lane', ''));
          if (Math.abs(fromIndex - toIndex) !== 1) continue; // Not adjacent
        }

        // Score this movement
        const opponentDronesInTarget = opponentState.dronesOnBoard[toLane]?.length || 0;
        const myDronesInTarget = aiState.dronesOnBoard[toLane]?.length || 0;

        // Prefer moving to lanes with enemy drones (for attacking) or empty lanes (for positioning)
        const score = opponentDronesInTarget * 10 - myDronesInTarget * 5;

        if (score > bestScore) {
          bestScore = score;
          bestMove = {
            fromLane,
            toLane,
            drones: [nonSnaredDrones[0]]  // Just pick first non-snared drone
          };
        }
      }
    }

    // If no good move found, just pass (state unchanged)
    if (!bestMove) {
      return this.createResult(playerStates, []);
    }

    // Execute the movement
    return this.executeSingleMoveForResult(
      bestMove.drones[0],
      bestMove.fromLane,
      bestMove.toLane,
      context
    );
  }

  /**
   * Execute single drone movement and return result
   * Used by AI auto-execution
   *
   * @param {Object} droneToMove - Drone being moved
   * @param {string} fromLane - Source lane
   * @param {string} toLane - Destination lane
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with updated states
   */
  executeSingleMoveForResult(droneToMove, fromLane, toLane, context) {
    const { actingPlayerId, playerStates, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    const result = this.executeSingleMove(
      card,
      droneToMove,
      fromLane,
      toLane,
      actingPlayerId,
      newPlayerStates,
      opponentPlayerId,
      context
    );

    if (result.error) {
      // Movement failed validation, return unchanged state
      return this.createResult(playerStates, []);
    }

    const baseResult = this.createResult(result.newPlayerStates, []);
    // Propagate goAgain from Rally Beacon for AI card play pipeline
    if (!result.shouldEndTurn) {
      baseResult.goAgain = true;
    }
    return baseResult;
  }

  /**
   * Execute single drone movement
   * Called via gameLogic bindings after UI selection completes
   *
   * @param {Object} card - Card being played
   * @param {Object} droneToMove - Drone being moved
   * @param {string} fromLane - Source lane ID
   * @param {string} toLane - Destination lane ID
   * @param {string} actingPlayerId - Player executing the move
   * @param {Object} newPlayerStates - Cloned player states (already cloned by caller)
   * @param {string} opponentPlayerId - Opponent player ID
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with newPlayerStates or error
   */
  executeSingleMove(card, droneToMove, fromLane, toLane, actingPlayerId, newPlayerStates, opponentPlayerId, context, insertionIndex = null) {
    const effect = card.effects[0];
    const { callbacks, placedSections } = context;

    debugLog('MOVEMENT_EFFECT', 'executeSingleMove - card effect check', {
      cardName: card.name,
      cardId: card.id,
      effectType: effect?.type,
      effectProperties: effect?.properties,
      hasDoNotExhaust: effect?.properties?.includes('DO_NOT_EXHAUST'),
      droneCurrentExhausted: droneToMove.isExhausted
    });
    const { logCallback } = callbacks;

    const actingPlayerState = newPlayerStates[actingPlayerId];
    const opponentPlayerState = newPlayerStates[opponentPlayerId];

    // Determine which player owns the drone being moved
    // For enemy-targeting cards like Tactical Repositioning, the drone belongs to opponent
    const droneOwnerId = droneToMove.owner || this._findDroneOwner(droneToMove.id, newPlayerStates) || actingPlayerId;
    const droneOwnerState = newPlayerStates[droneOwnerId];
    const isMovingEnemyDrone = droneOwnerId !== actingPlayerId;

    debugLog('MOVEMENT_EFFECT', 'executeSingleMove - drone ownership', {
      cardName: card.name,
      droneName: droneToMove.name,
      droneOwnerId,
      actingPlayerId,
      isMovingEnemyDrone
    });

    // Check if drone can move (status effect restriction or INERT keyword)
    const effectiveStats = calculateEffectiveStats(droneToMove, fromLane, droneOwnerState, opponentPlayerState, placedSections);
    if (effectiveStats.keywords.has('INERT') || droneToMove.cannotMove) {
      return {
        newPlayerStates: newPlayerStates,
        error: `${droneToMove.name} cannot move${effectiveStats.keywords.has('INERT') ? ' (Inert)' : ''}.`,
        shouldShowErrorModal: true,
        shouldCancelCardSelection: true,
        shouldClearMultiSelectState: true
      };
    }

    // Check for INHIBIT_MOVEMENT keyword in source lane (prevents moving OUT)
    // Checks the opponent's board for inhibitors targeting this drone owner
    if (hasMovementInhibitorInLane(newPlayerStates, droneOwnerId, fromLane) && !isMovingEnemyDrone) {
      return {
        newPlayerStates: newPlayerStates,
        error: `${droneToMove.name} cannot move out of ${fromLane} - Thruster Inhibitor is active.`,
        shouldShowErrorModal: true,
        shouldCancelCardSelection: true,
        shouldClearMultiSelectState: true
      };
    }

    // Check lane capacity limit before moving
    if ((droneOwnerState.dronesOnBoard[toLane]?.length || 0) >= MAX_DRONES_PER_LANE) {
      logCallback({
        player: actingPlayerState.name,
        actionType: 'MOVE_BLOCKED',
        source: card.name,
        target: droneToMove.name,
        outcome: `${droneToMove.name} could not move to ${toLane} — lane is full.`
      });
      return {
        newPlayerStates: newPlayerStates,
        error: `Cannot move to ${toLane} — lane is full (${MAX_DRONES_PER_LANE}/${MAX_DRONES_PER_LANE} drones).`,
        animationEvents: [{
          type: 'MOVEMENT_BLOCKED',
          droneName: droneToMove.name,
          targetId: droneToMove.id,
          timestamp: Date.now()
        }],
        shouldCancelCardSelection: true,
        shouldClearMultiSelectState: true
      };
    }

    // Check maxPerLane restriction before moving
    const baseDrone = fullDroneCollection.find(d => d.name === droneToMove.name);
    if (baseDrone && baseDrone.maxPerLane) {
      const currentCountInTargetLane = countDroneTypeInLane(droneOwnerState, droneToMove.name, toLane);
      const isSameLane = fromLane === toLane;
      const effectiveCount = isSameLane ? currentCountInTargetLane - 1 : currentCountInTargetLane;

      if (effectiveCount >= baseDrone.maxPerLane) {
        return {
          newPlayerStates: newPlayerStates,
          error: `Only ${baseDrone.maxPerLane} ${droneToMove.name}${baseDrone.maxPerLane > 1 ? 's' : ''} allowed per lane.`,
          shouldCancelCardSelection: true,
          shouldClearMultiSelectState: true
        };
      }
    }

    // Remove drone from source lane (from the drone owner's state)
    droneOwnerState.dronesOnBoard[fromLane] = droneOwnerState.dronesOnBoard[fromLane].filter(
      d => d.id !== droneToMove.id
    );

    // Add drone to destination lane with proper exhaustion state
    const movedDrone = {
      ...droneToMove,
      isExhausted: effect.properties?.includes('DO_NOT_EXHAUST')
        ? droneToMove.isExhausted
        : true
    };
    insertDroneInLane(droneOwnerState.dronesOnBoard[toLane], movedDrone, insertionIndex);

    debugLog('MOVEMENT_EFFECT', 'executeSingleMove - drone exhaustion result', {
      droneName: movedDrone.name,
      isExhausted: movedDrone.isExhausted,
      expectedNonExhausted: effect?.properties?.includes('DO_NOT_EXHAUST')
    });

    // Log the movement
    logCallback({
      player: actingPlayerState.name,
      actionType: 'MOVE',
      source: card.name,
      target: droneToMove.name,
      outcome: `Moved ${isMovingEnemyDrone ? 'enemy ' : ''}${droneToMove.name} from ${fromLane} to ${toLane}.`
    }, 'executeSingleMove');

    // Capture post-movement state before triggers fire
    const postMovementState = JSON.parse(JSON.stringify(newPlayerStates));

    // Build movement animation event (drone slides from old lane to new lane)
    const movementAnimation = buildDefaultMovementAnimation({
      drone: droneToMove,
      fromLane,
      toLane,
      actingPlayerId: droneOwnerId
    });

    // Resolve post-move triggers: ON_MOVE + auras + Rally Beacon + mines
    const postMoveResult = this._resolvePostMoveTriggers({
      movedDrones: [movedDrone],
      fromLane,
      toLane,
      droneOwnerId,
      actingPlayerId,
      newPlayerStates,
      placedSections,
      logCallback,
      cardGoAgain: card.effects[0].goAgain,
      pairSet: context.pairSet,
      chainDepth: context.chainDepth
    });

    return {
      newPlayerStates,
      postMovementState,
      animationEvents: movementAnimation,
      effectResult: {
        movedDrones: [movedDrone],
        fromLane,
        toLane,
        wasSuccessful: true
      },
      shouldEndTurn: !card.effects[0].goAgain && !postMoveResult.goAgain,
      shouldCancelCardSelection: true,
      shouldClearMultiSelectState: true,
      mineAnimationEvents: postMoveResult.mineAnimationEvents,
      triggerAnimationEvents: postMoveResult.triggerAnimationEvents,
    };
  }

  /**
   * Shared post-move trigger resolution.
   * Processes ON_MOVE triggers + aura updates + ON_LANE_MOVEMENT_IN triggers (mines + Rally Beacon).
   * Used by executeSingleMove.
   *
   * ON_MOVE fires for ALL moved drones including force-moved enemy drones (PRD 3.3).
   * ON_LANE_MOVEMENT_IN fires for ALL moves (friendly and enemy force-moved).
   * Trigger matching (LANE_OWNER validation in TriggerProcessor) handles filtering.
   *
   * @param {Object} config
   * @param {Array} config.movedDrones - Drones that were moved
   * @param {string} config.fromLane - Source lane
   * @param {string} config.toLane - Destination lane
   * @param {string} config.droneOwnerId - Player who owns the moved drones
   * @param {string} config.actingPlayerId - Player who played the card
   * @param {Object} config.newPlayerStates - Player states (mutated via replacement)
   * @param {Object} config.placedSections - Placed ship sections
   * @param {Function} config.logCallback - Log callback
   * @param {boolean} config.cardGoAgain - Whether the card grants go-again
   * @returns {Object} { triggerAnimationEvents, mineAnimationEvents, goAgain }
   */
  _resolvePostMoveTriggers({ movedDrones, fromLane, toLane, droneOwnerId, actingPlayerId, newPlayerStates, placedSections, logCallback, cardGoAgain, pairSet, chainDepth = 0 }) {
    const opponentOfDroneOwner = droneOwnerId === 'player1' ? 'player2' : 'player1';
    const isEnemyMove = droneOwnerId !== actingPlayerId;
    const triggerProcessor = new TriggerProcessor();
    const triggerAnimationEvents = [];

    // ON_MOVE triggers fire for ALL moved drones (including force-moved enemy drones per PRD 3.3)
    // Note: ON_MOVE is a self-trigger — the drone IS the actor, so currentTurnPlayerId is not needed.
    // Lane triggers (ON_LANE_MOVEMENT_IN/OUT) below DO pass currentTurnPlayerId for timing validation.
    for (const movedDrone of movedDrones) {
      const moveResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
        lane: toLane,
        triggeringDrone: movedDrone,
        triggeringPlayerId: droneOwnerId,
        actingPlayerId: droneOwnerId,
        playerStates: {
          [droneOwnerId]: newPlayerStates[droneOwnerId],
          [opponentOfDroneOwner]: newPlayerStates[opponentOfDroneOwner]
        },
        placedSections,
        logCallback,
        pairSet: pairSet || new Set(),
        chainDepth: chainDepth || 0
      });

      if (moveResult.triggered) {
        newPlayerStates[droneOwnerId] = moveResult.newPlayerStates[droneOwnerId];
        newPlayerStates[opponentOfDroneOwner] = moveResult.newPlayerStates[opponentOfDroneOwner];
        if (moveResult.animationEvents.length > 0) {
          triggerAnimationEvents.push(...moveResult.animationEvents);
        }
      }
      // DOES_NOT_EXHAUST: If ON_MOVE trigger returned doesNotExhaust, un-exhaust the moved drone
      if (moveResult.doesNotExhaust) {
        const droneInState = newPlayerStates[droneOwnerId].dronesOnBoard[toLane]?.find(d => d.id === movedDrone.id);
        if (droneInState) {
          droneInState.isExhausted = false;
        }
      }
    }

    // ON_LANE_MOVEMENT_OUT fires for friendly drones leaving the source lane
    if (!isEnemyMove) {
      for (const movedDrone of movedDrones) {
        const outResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_OUT, {
          lane: fromLane,
          triggeringDrone: movedDrone,
          triggeringPlayerId: droneOwnerId,
          actingPlayerId: droneOwnerId,
          playerStates: {
            [droneOwnerId]: newPlayerStates[droneOwnerId],
            [opponentOfDroneOwner]: newPlayerStates[opponentOfDroneOwner]
          },
          placedSections,
          logCallback,
          pairSet: pairSet || new Set(),
          chainDepth: chainDepth || 0,
          currentTurnPlayerId: actingPlayerId
        });
        if (outResult.triggered) {
          newPlayerStates[droneOwnerId] = outResult.newPlayerStates[droneOwnerId];
          newPlayerStates[opponentOfDroneOwner] = outResult.newPlayerStates[opponentOfDroneOwner];
          if (outResult.animationEvents.length > 0) {
            triggerAnimationEvents.push(...outResult.animationEvents);
          }
        }
      }
    }

    // Update auras after movement for drone owner
    newPlayerStates[droneOwnerId].dronesOnBoard = updateAuras(
      newPlayerStates[droneOwnerId],
      newPlayerStates[opponentOfDroneOwner],
      placedSections
    );

    // If moving enemy drone, also update auras for acting player
    if (isEnemyMove) {
      const opponentOfActing = actingPlayerId === 'player1' ? 'player2' : 'player1';
      newPlayerStates[actingPlayerId].dronesOnBoard = updateAuras(
        newPlayerStates[actingPlayerId],
        newPlayerStates[opponentOfActing],
        placedSections
      );
    }

    // ON_LANE_MOVEMENT_IN triggers (Rally Beacon go-again + mines) fire for ALL moves.
    // Trigger matching (LANE_OWNER in TriggerProcessor) handles filtering —
    // e.g., Rally Beacon won't fire for enemy drones, but mines will detonate on enemy force-move.
    let goAgain = false;
    const mineAnimationEvents = [];

    for (const movedDrone of movedDrones) {
      const result = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: toLane,
        triggeringDrone: movedDrone,
        triggeringPlayerId: droneOwnerId,
        actingPlayerId: droneOwnerId,
        playerStates: {
          [droneOwnerId]: newPlayerStates[droneOwnerId],
          [opponentOfDroneOwner]: newPlayerStates[opponentOfDroneOwner]
        },
        placedSections,
        logCallback,
        pairSet: pairSet || new Set(),
        chainDepth: chainDepth || 0,
        currentTurnPlayerId: actingPlayerId
      });

      if (result.triggered) {
        newPlayerStates[droneOwnerId] = result.newPlayerStates[droneOwnerId];
        newPlayerStates[opponentOfDroneOwner] = result.newPlayerStates[opponentOfDroneOwner];
        if (result.animationEvents.length > 0) {
          mineAnimationEvents.push(...result.animationEvents);
        }
        if (result.goAgain) {
          goAgain = true;
        }
      }
    }

    return { triggerAnimationEvents, mineAnimationEvents, goAgain };
  }

  _findDroneOwner(droneId, playerStates) {
    for (const playerId of ['player1', 'player2']) {
      for (const lane of ['lane1', 'lane2', 'lane3']) {
        if (playerStates[playerId]?.dronesOnBoard?.[lane]?.some(d => d.id === droneId)) {
          return playerId;
        }
      }
    }
    return null;
  }
}

export default MovementEffectProcessor;
