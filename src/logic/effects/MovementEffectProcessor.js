// ========================================
// MOVEMENT EFFECT PROCESSOR
// ========================================
// Handles SINGLE_MOVE and MULTI_MOVE card effects
// Extracted from gameLogic.js Phase 7B

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { countDroneTypeInLane } from '../utils/gameEngineUtils.js';
import { updateAuras } from '../utils/auraManager.js';
import TriggerProcessor from '../triggers/TriggerProcessor.js';
import { TRIGGER_TYPES } from '../triggers/triggerConstants.js';
import { calculateEffectiveStats } from '../statsCalculator.js';
import fullDroneCollection from '../../data/droneData.js';
import { buildDefaultMovementAnimation } from './movement/animations/DefaultMovementAnimation.js';
import { debugLog } from '../../utils/debugLogger.js';
import { LaneControlCalculator } from '../combat/LaneControlCalculator.js';


/**
 * MovementEffectProcessor
 * Processes SINGLE_MOVE and MULTI_MOVE effects for movement cards
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
   * @param {Object} effect - Effect configuration (type: 'SINGLE_MOVE' | 'MULTI_MOVE')
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with newPlayerStates or needsCardSelection
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, localPlayerId = 'player1', gameMode = 'local', card } = context;

    // Determine if this is an AI player
    // In single-player (gameMode === 'local'), only player2 is AI
    // In multiplayer, both players are human and need card selection UI
    const isAI = gameMode === 'local' && actingPlayerId === 'player2';

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
        type: effect.type === 'SINGLE_MOVE' ? 'single_move' : 'multi_move',
        card: card,
        effect: effect,
        maxDrones: effect.type === 'MULTI_MOVE' ? (effect.count || 3) : 1,
        doNotExhaust: effect.properties?.includes('DO_NOT_EXHAUST') || false,
        // UI will handle multi-step selection (source lane, drones, destination)
        phase: effect.type === 'SINGLE_MOVE' ? 'select_drone' : 'select_source_lane'
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
            drones: effect.type === 'SINGLE_MOVE'
              ? [nonSnaredDrones[0]]  // Just pick first non-snared drone
              : nonSnaredDrones.slice(0, Math.min(effect.count || 3, nonSnaredDrones.length))
          };
        }
      }
    }

    // If no good move found, just pass (state unchanged)
    if (!bestMove) {
      return this.createResult(playerStates, []);
    }

    // Execute the movement
    if (effect.type === 'SINGLE_MOVE') {
      return this.executeSingleMoveForResult(
        bestMove.drones[0],
        bestMove.fromLane,
        bestMove.toLane,
        context
      );
    } else {
      return this.executeMultiMoveForResult(
        bestMove.drones,
        bestMove.fromLane,
        bestMove.toLane,
        context
      );
    }
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
   * Execute multiple drones movement and return result
   * Used by AI auto-execution
   *
   * @param {Array} dronesToMove - Array of drones being moved
   * @param {string} fromLane - Source lane
   * @param {string} toLane - Destination lane
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with updated states
   */
  executeMultiMoveForResult(dronesToMove, fromLane, toLane, context) {
    const { actingPlayerId, playerStates, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    const result = this.executeMultiMove(
      card,
      dronesToMove,
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
  executeSingleMove(card, droneToMove, fromLane, toLane, actingPlayerId, newPlayerStates, opponentPlayerId, context) {
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
    const droneOwnerId = droneToMove.owner || actingPlayerId;
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
    // The inhibiting drone lives on the same player's board as the drones it locks down
    const dronesInFromLane = droneOwnerState.dronesOnBoard[fromLane] || [];
    const hasMovementInhibitor = dronesInFromLane.some(d =>
      d.abilities?.some(a => a.effect?.keyword === 'INHIBIT_MOVEMENT')
    );
    if (hasMovementInhibitor && !isMovingEnemyDrone) {
      return {
        newPlayerStates: newPlayerStates,
        error: `${droneToMove.name} cannot move out of ${fromLane} - Thruster Inhibitor is active.`,
        shouldShowErrorModal: true,
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

    // Check INFILTRATE keyword before setting exhaustion
    const hasInfiltrate = baseDrone?.abilities?.some(
      a => a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'INFILTRATE'
    );
    let infiltrateActive = false;
    if (hasInfiltrate) {
      // Check lane control BEFORE movement - does not exhaust if destination is NOT controlled
      const laneControl = LaneControlCalculator.calculateLaneControl(
        newPlayerStates.player1, newPlayerStates.player2
      );
      infiltrateActive = laneControl[toLane] !== droneOwnerId;
    }

    // Add drone to destination lane with proper exhaustion state
    // All drones respect the DO_NOT_EXHAUST property or INFILTRATE keyword regardless of ownership
    const movedDrone = {
      ...droneToMove,
      isExhausted: (effect.properties?.includes('DO_NOT_EXHAUST') || infiltrateActive)
        ? droneToMove.isExhausted
        : true
    };
    droneOwnerState.dronesOnBoard[toLane].push(movedDrone);

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
      cardGoAgain: card.effects[0].goAgain
    });

    return {
      newPlayerStates,
      preMineTriggerStates: postMoveResult.preMineTriggerStates,
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
      triggerAnimationEvents: postMoveResult.triggerAnimationEvents
    };
  }

  /**
   * Execute multiple drones movement
   * Called via gameLogic bindings after UI selection completes
   *
   * @param {Object} card - Card being played
   * @param {Array} dronesToMove - Array of drones being moved
   * @param {string} fromLane - Source lane ID
   * @param {string} toLane - Destination lane ID
   * @param {string} actingPlayerId - Player executing the move
   * @param {Object} newPlayerStates - Cloned player states (already cloned by caller)
   * @param {string} opponentPlayerId - Opponent player ID
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with newPlayerStates or error
   */
  executeMultiMove(card, dronesToMove, fromLane, toLane, actingPlayerId, newPlayerStates, opponentPlayerId, context) {
    const effect = card.effects[0];
    const { callbacks, placedSections } = context;
    const { logCallback } = callbacks;

    const actingPlayerState = newPlayerStates[actingPlayerId];
    const opponentPlayerState = newPlayerStates[opponentPlayerId];

    // Check if any drone has cannotMove restriction or INERT keyword
    for (const drone of dronesToMove) {
      const effectiveStats = calculateEffectiveStats(drone, fromLane, actingPlayerState, opponentPlayerState, placedSections);
      if (effectiveStats.keywords.has('INERT') || drone.cannotMove) {
        return {
          newPlayerStates: newPlayerStates,
          error: `${drone.name} cannot move${effectiveStats.keywords.has('INERT') ? ' (Inert)' : ''}.`,
          shouldShowErrorModal: true,
          shouldCancelCardSelection: true,
          shouldClearMultiSelectState: true
        };
      }
    }

    // Check for INHIBIT_MOVEMENT keyword in source lane (prevents moving OUT)
    const dronesInFromLane = actingPlayerState.dronesOnBoard[fromLane] || [];
    const hasMovementInhibitor = dronesInFromLane.some(d =>
      d.abilities?.some(a => a.effect?.keyword === 'INHIBIT_MOVEMENT')
    );
    if (hasMovementInhibitor) {
      return {
        newPlayerStates: newPlayerStates,
        error: `Drones cannot move out of ${fromLane} - Thruster Inhibitor is active.`,
        shouldShowErrorModal: true,
        shouldCancelCardSelection: true,
        shouldClearMultiSelectState: true
      };
    }

    // Check maxPerLane restriction for each drone type being moved
    const droneTypeCount = {};
    dronesToMove.forEach(drone => {
      droneTypeCount[drone.name] = (droneTypeCount[drone.name] || 0) + 1;
    });

    for (const [droneName, movingCount] of Object.entries(droneTypeCount)) {
      const baseDrone = fullDroneCollection.find(d => d.name === droneName);
      if (baseDrone && baseDrone.maxPerLane) {
        const currentCountInTargetLane = countDroneTypeInLane(actingPlayerState, droneName, toLane);
        const isSameLane = fromLane === toLane;
        const futureCount = isSameLane
          ? currentCountInTargetLane  // Moving within same lane doesn't change count
          : currentCountInTargetLane + movingCount;

        if (futureCount > baseDrone.maxPerLane) {
          return {
            newPlayerStates: newPlayerStates,
            error: `Only ${baseDrone.maxPerLane} ${droneName}${baseDrone.maxPerLane > 1 ? 's' : ''} allowed per lane. Cannot move ${movingCount} to ${toLane}.`,
            shouldCancelCardSelection: true,
            shouldClearMultiSelectState: true
          };
        }
      }
    }

    // Remove drones from source lane
    const dronesBeingMovedIds = new Set(dronesToMove.map(d => d.id));
    actingPlayerState.dronesOnBoard[fromLane] = actingPlayerState.dronesOnBoard[fromLane].filter(
      d => !dronesBeingMovedIds.has(d.id)
    );

    // Calculate lane control for INFILTRATE check (before movement)
    const laneControl = LaneControlCalculator.calculateLaneControl(
      newPlayerStates.player1, newPlayerStates.player2
    );
    const isDestinationNotControlled = laneControl[toLane] !== actingPlayerId;

    // Add drones to destination lane with proper exhaustion state
    // Check INFILTRATE keyword for each drone individually
    const movedDrones = dronesToMove.map(d => {
      const dBaseDrone = fullDroneCollection.find(bd => bd.name === d.name);
      const hasInfiltrate = dBaseDrone?.abilities?.some(
        a => a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'INFILTRATE'
      );
      const infiltrateActive = hasInfiltrate && isDestinationNotControlled;

      return {
        ...d,
        isExhausted: (effect.properties?.includes('DO_NOT_EXHAUST') || infiltrateActive)
          ? d.isExhausted
          : true
      };
    });
    actingPlayerState.dronesOnBoard[toLane].push(...movedDrones);

    // Log the movement
    logCallback({
      player: actingPlayerState.name,
      actionType: 'MULTI_MOVE',
      source: card.name,
      target: `${dronesToMove.map(d => d.name).join(', ')}`,
      outcome: `Moved ${dronesToMove.length} drone(s) from ${fromLane} to ${toLane}.`
    }, 'executeMultiMove');

    // Resolve post-move triggers: ON_MOVE + auras + Rally Beacon + mines
    const postMoveResult = this._resolvePostMoveTriggers({
      movedDrones,
      fromLane,
      toLane,
      droneOwnerId: actingPlayerId,
      actingPlayerId,
      newPlayerStates,
      placedSections,
      logCallback,
      cardGoAgain: card.effects[0]?.goAgain || false
    });

    return {
      newPlayerStates,
      preMineTriggerStates: postMoveResult.preMineTriggerStates,
      effectResult: {
        movedDrones,
        fromLane,
        toLane,
        wasSuccessful: true
      },
      shouldEndTurn: !(card.effects[0]?.goAgain || postMoveResult.goAgain),
      shouldCancelCardSelection: true,
      shouldClearMultiSelectState: true,
      mineAnimationEvents: postMoveResult.mineAnimationEvents,
      triggerAnimationEvents: postMoveResult.triggerAnimationEvents
    };
  }

  /**
   * Shared post-move trigger resolution.
   * Processes ON_MOVE triggers + aura updates + ON_LANE_MOVEMENT_IN triggers (mines + Rally Beacon).
   * Used by both executeSingleMove and executeMultiMove.
   *
   * ON_MOVE fires for ALL moved drones including force-moved enemy drones (PRD 3.3).
   * ON_LANE_MOVEMENT_IN (mines, Rally Beacon) only fires for friendly drone moves.
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
   * @returns {Object} { triggerAnimationEvents, mineAnimationEvents, preMineTriggerStates, goAgain }
   */
  _resolvePostMoveTriggers({ movedDrones, fromLane, toLane, droneOwnerId, actingPlayerId, newPlayerStates, placedSections, logCallback, cardGoAgain }) {
    const opponentOfDroneOwner = droneOwnerId === 'player1' ? 'player2' : 'player1';
    const isEnemyMove = droneOwnerId !== actingPlayerId;
    const triggerProcessor = new TriggerProcessor();
    const triggerAnimationEvents = [];

    // ON_MOVE triggers fire for ALL moved drones (including force-moved enemy drones per PRD 3.3)
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
        logCallback
      });

      if (moveResult.triggered) {
        newPlayerStates[droneOwnerId] = moveResult.newPlayerStates[droneOwnerId];
        newPlayerStates[opponentOfDroneOwner] = moveResult.newPlayerStates[opponentOfDroneOwner];
        if (moveResult.animationEvents.length > 0) {
          triggerAnimationEvents.push(...moveResult.animationEvents);
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
          logCallback
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

    // ON_LANE_MOVEMENT_IN triggers (Rally Beacon go-again + mines) only fire for friendly moves
    let goAgain = false;
    const mineAnimationEvents = [];

    // Snapshot state before mine trigger
    const preMineTriggerStates = JSON.parse(JSON.stringify(newPlayerStates));

    if (!isEnemyMove) {
      // Process ON_LANE_MOVEMENT_IN triggers (Rally Beacon + mines in single pass)
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
          logCallback
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
    }

    return { triggerAnimationEvents, mineAnimationEvents, preMineTriggerStates, goAgain };
  }
}

export default MovementEffectProcessor;
