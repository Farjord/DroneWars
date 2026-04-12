// Commitment strategies: processCommitment, handleAICommitment,
// applyPhaseCommitments, getPhaseCommitmentStatus, clearPhaseCommitments
// Extracted from ActionProcessor.js — handles simultaneous phase commitment system.

import aiPhaseProcessor from '../../managers/AIPhaseProcessor.js';
import { initializeForCombat as initializeDroneAvailability } from '../availability/DroneAvailabilityManager.js';
import { initializeDroneSelection, extractDronesFromDeck } from '../../utils/droneSelectionUtils.js';
import { SeededRandom } from '../../utils/seededRandom.js';
import { debugLog } from '../../utils/debugLogger.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { getShipById, getDefaultShip } from '../../data/shipData.js';
import { calculateSectionBaseStats } from '../statsCalculator.js';

/**
 * Get phase commitment status
 * @param {string} phase - Phase name
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export function getPhaseCommitmentStatus(phase, ctx) {
  const currentState = ctx.getState();

  if (!currentState.commitments[phase]) {
    return {
      phase,
      commitments: { player1: { completed: false }, player2: { completed: false } },
      bothComplete: false
    };
  }

  const commitments = currentState.commitments[phase];
  const bothComplete = commitments.player1.completed && commitments.player2.completed;

  return {
    phase,
    commitments,
    bothComplete
  };
}

/**
 * Clear commitments for a specific phase or all phases
 * @param {string} phase - Optional phase name, if not provided clears all
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export function clearPhaseCommitments(phase = null, ctx) {
  const currentState = ctx.getState();

  let newCommitments;
  if (phase) {
    newCommitments = {
      ...currentState.commitments,
      [phase]: {
        player1: { completed: false },
        player2: { completed: false }
      }
    };
    debugLog('COMMITMENTS', `🔄 Cleared commitments for phase: ${phase}`);
  } else {
    newCommitments = {};
    debugLog('COMMITMENTS', '🔄 Cleared all phase commitments');
  }

  ctx.setState({
    commitments: newCommitments
  });
}

/**
 * Check if all pre-game sub-commitments are complete (both players x 2 sub-phases).
 * Placement is auto-applied during deckSelection and has no separate commitment step.
 * @param {Object} commitments - The commitments object from game state
 * @returns {boolean} True when both players have completed deckSelection and droneSelection
 */
export function isPreGameComplete(commitments) {
  const subPhases = ['deckSelection', 'droneSelection'];
  return subPhases.every(subPhase =>
    commitments[subPhase]?.player1?.completed &&
    commitments[subPhase]?.player2?.completed
  );
}

/**
 * Process commitment action for simultaneous phases
 * @param {Object} payload - { playerId, phase, actionData }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processCommitment(payload, ctx) {
  const { playerId, phase, actionData } = payload;

  debugLog('COMMIT_TRACE', '[1/6] Commitment received', {
    phase, playerId, dataKeys: actionData ? Object.keys(actionData) : [],
  });
  debugLog('COMMITMENTS', `🤝 Processing ${phase} commitment for ${playerId}`);

  const currentState = ctx.getState();

  // preGameSetup: route to sub-phase commitment storage + immediate application
  if (phase === 'preGameSetup') {
    const { subPhase, ...subPhaseData } = actionData;
    debugLog('COMMITMENTS', `🔀 preGameSetup sub-phase: ${subPhase} for ${playerId}`);

    const existingSubPhaseCommitments = currentState.commitments[subPhase] || {
      player1: { completed: false },
      player2: { completed: false }
    };

    const newCommitments = {
      ...currentState.commitments,
      [subPhase]: {
        ...existingSubPhaseCommitments,
        [playerId]: {
          completed: true,
          ...subPhaseData
        }
      }
    };

    ctx.setState({ commitments: newCommitments }, 'COMMITMENT_UPDATE');

    // Apply immediately per-player
    applyPlayerCommitment(subPhase, playerId, subPhaseData, ctx);

    // PhaseManager integration — notify with the top-level phase
    const phaseManager = ctx.getPhaseManager();
    if (phaseManager) {
      phaseManager.notifyPlayerAction(playerId, 'commit', { phase });
      debugLog('COMMIT_TRACE', `[2b/6] PhaseManager notified`, { playerId, phase, subPhase });
    }

    // AI auto-commit for this subPhase
    if (ctx.isPlayerAI('player2') && playerId === 'player1') {
      if (aiPhaseProcessor) {
        try {
          await handleAICommitment(phase, currentState, ctx, subPhase);
        } catch (error) {
          debugLog('COMMITMENTS', '❌ AI commitment error:', error);
          throw error;
        }
      }
    }

    const freshState = ctx.getState();
    const preGameComplete = isPreGameComplete(freshState.commitments);

    return {
      success: true,
      data: {
        playerId,
        phase,
        actionData,
        bothPlayersComplete: preGameComplete
      }
    };
  }

  // Build new commitments immutably (never mutate currentState)
  const existingPhaseCommitments = currentState.commitments[phase] || {
    player1: { completed: false },
    player2: { completed: false }
  };

  const newCommitments = {
    ...currentState.commitments,
    [phase]: {
      ...existingPhaseCommitments,
      [playerId]: {
        completed: true,
        ...actionData
      }
    }
  };

  const stateUpdate = { commitments: newCommitments };

  // Apply shield allocations from commitment data
  if (phase === 'allocateShields' && actionData.shieldAllocations) {
    debugLog('SHIELD_CLICKS', `🛡️ Applying shield allocations for ${playerId}`, {
      shieldAllocations: actionData.shieldAllocations
    });

    const playerState = currentState[playerId];
    const newShipSections = {};

    Object.keys(playerState.shipSections).forEach(sectionName => {
      newShipSections[sectionName] = {
        ...playerState.shipSections[sectionName],
        allocatedShields: 0
      };
    });

    Object.entries(actionData.shieldAllocations).forEach(([sectionName, count]) => {
      if (newShipSections[sectionName]) {
        newShipSections[sectionName] = { ...newShipSections[sectionName], allocatedShields: count };
        debugLog('SHIELD_CLICKS', `✅ Allocated ${count} shields to ${sectionName}`);
      }
    });

    stateUpdate[playerId] = { ...currentState[playerId], shipSections: newShipSections };
    const shieldsKey = playerId === 'player1' ? 'shieldsToAllocate' : 'opponentShieldsToAllocate';
    stateUpdate[shieldsKey] = 0;
  }

  ctx.setState(stateUpdate, 'COMMITMENT_UPDATE');

  let bothComplete = newCommitments[phase].player1.completed &&
                      newCommitments[phase].player2.completed;

  debugLog('COMMIT_TRACE', '[2/6] Commitment stored', {
    phase, p1: newCommitments[phase].player1.completed,
    p2: newCommitments[phase].player2.completed, bothComplete,
  });
  debugLog('COMMITMENTS', `✅ ${playerId} ${phase} committed, both complete: ${bothComplete}`);

  // PhaseManager integration
  const phaseManager = ctx.getPhaseManager();
  if (phaseManager) {
    phaseManager.notifyPlayerAction(playerId, 'commit', { phase });
    debugLog('COMMIT_TRACE', `[2b/6] PhaseManager notified`, { playerId, phase });
  }

  // Auto-complete AI commitment immediately when opponent is AI
  if (!bothComplete && ctx.isPlayerAI('player2') && playerId === 'player1') {
    debugLog('COMMITMENTS', '🤖 Single-player mode: Auto-completing AI commitment');
    if (aiPhaseProcessor) {
      try {
        debugLog('COMMIT_TRACE', '[3/6] AI auto-commit starting', {
          phase, willTriggerPhaseCompletion: true,
        });
        await handleAICommitment(phase, currentState, ctx);

        const freshState = ctx.getState();
        bothComplete = freshState.commitments[phase].player1.completed &&
                      freshState.commitments[phase].player2.completed;
        debugLog('COMMITMENTS', `✅ AI commitment completed, bothComplete: ${bothComplete}`);
      } catch (error) {
        debugLog('COMMITMENTS', '❌ AI commitment error:', error);
        throw error;
      }
    } else {
      debugLog('COMMITMENTS', '⚠️ aiPhaseProcessor not available');
    }
  }

  return {
    success: true,
    data: {
      playerId,
      phase,
      actionData,
      bothPlayersComplete: bothComplete
    }
  };
}

/**
 * Handle AI commitment for simultaneous phases
 * @param {string} phase - Phase name
 * @param {Object} currentState - Current game state
 * @param {Object} ctx - ActionContext from ActionProcessor
 * @param {string} [subPhase] - Sub-phase for preGameSetup
 */
export async function handleAICommitment(phase, currentState, ctx, subPhase) {
  try {
    debugLog('COMMITMENTS', `🤖 Processing AI commitment for phase: ${phase}${subPhase ? ` (subPhase: ${subPhase})` : ''}`);

    let aiResult;
    switch(phase) {
      case 'preGameSetup': {
        // Dispatch to the appropriate sub-phase AI handler
        switch (subPhase) {
          case 'deckSelection':
            aiResult = await aiPhaseProcessor.processDeckSelection();
            await ctx.processCommitment({
              playerId: 'player2',
              phase: 'preGameSetup',
              actionData: {
                subPhase: 'deckSelection',
                deck: aiResult.deck,
                drones: aiResult.drones,
                shipComponents: aiResult.shipComponents
              }
            });
            break;

          case 'droneSelection':
            aiResult = await aiPhaseProcessor.processDroneSelection();
            await ctx.processCommitment({
              playerId: 'player2',
              phase: 'preGameSetup',
              actionData: { subPhase: 'droneSelection', drones: aiResult }
            });
            break;

          default:
            debugLog('COMMITMENTS', `No AI handler for preGameSetup sub-phase: ${subPhase}`);
        }
        break;
      }

      case 'mandatoryDiscard':
        aiResult = await aiPhaseProcessor.executeMandatoryDiscardTurn(currentState);

        if (aiResult.cardsToDiscard.length > 0) {
          const aiState = currentState.player2;
          const newHand = aiState.hand.filter(card =>
            !aiResult.cardsToDiscard.some(discardCard => card.instanceId === discardCard.instanceId)
          );
          const newDiscardPile = [...aiState.discardPile, ...aiResult.cardsToDiscard];

          ctx.updatePlayerState('player2', {
            hand: newHand,
            discardPile: newDiscardPile
          });

          debugLog('COMMITMENTS', `🤖 AI discarded ${aiResult.cardsToDiscard.length} cards for mandatory discard`);
        }

        await ctx.processCommitment({
          playerId: 'player2',
          phase: 'mandatoryDiscard',
          actionData: { discardedCards: aiResult.cardsToDiscard }
        });
        break;

      case 'optionalDiscard':
        aiResult = await aiPhaseProcessor.executeOptionalDiscardTurn(currentState);
        await ctx.processCommitment({
          playerId: 'player2',
          phase: 'optionalDiscard',
          actionData: { discardedCards: aiResult.cardsToDiscard }
        });
        break;

      case 'allocateShields':
        debugLog('SHIELD_CLICKS', '🤖 [HANDLE AI] About to call executeShieldAllocationTurn');
        await aiPhaseProcessor.executeShieldAllocationTurn(currentState);
        debugLog('SHIELD_CLICKS', '🤖 [HANDLE AI] executeShieldAllocationTurn completed, now committing');
        await ctx.processCommitment({
          playerId: 'player2',
          phase: 'allocateShields',
          actionData: { committed: true }
        });
        debugLog('SHIELD_CLICKS', '🤖 [HANDLE AI] AI commitment complete');
        break;

      case 'mandatoryDroneRemoval':
        aiResult = await aiPhaseProcessor.executeMandatoryDroneRemovalTurn(currentState);

        if (aiResult.dronesToRemove.length > 0) {
          for (const droneToRemove of aiResult.dronesToRemove) {
            await ctx.processDestroyDrone({
              droneId: droneToRemove.id,
              playerId: 'player2'
            });
          }
          debugLog('COMMITMENTS', `🤖 AI removed ${aiResult.dronesToRemove.length} drones for mandatory drone removal`);
        }

        await ctx.processCommitment({
          playerId: 'player2',
          phase: 'mandatoryDroneRemoval',
          actionData: { removedDrones: aiResult.dronesToRemove }
        });
        break;

      default:
        debugLog('COMMITMENTS', `No AI handler for phase: ${phase}`);
    }

  } catch (error) {
    debugLog('COMMITMENTS', 'AI commitment error:', error);
    throw error;
  }
}

/**
 * Apply a single player's commitment immediately during preGameSetup.
 * Called per-player as each sub-phase completes, rather than waiting for both.
 *
 * @param {string} subPhase - 'deckSelection' | 'droneSelection' | 'placement'
 * @param {string} playerId - 'player1' | 'player2'
 * @param {Object} commitmentData - The data for this sub-phase
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export function applyPlayerCommitment(subPhase, playerId, commitmentData, ctx) {
  const currentState = ctx.getState();
  const stateUpdates = {};

  switch (subPhase) {
    case 'deckSelection': {
      const playerShipId = currentState[playerId]?.shipId;
      const shipCard = playerShipId ? getShipById(playerShipId) : getDefaultShip();

      // Rebuild shipSections from selected ship components so non-default sections
      // (e.g. BRIDGE_002 → 'tacticalBridge') exist in shipSections before placement.
      let updatedShipSections = currentState[playerId]?.shipSections || {};
      if (commitmentData.shipComponents && Object.keys(commitmentData.shipComponents).length > 0) {
        updatedShipSections = {};
        Object.keys(commitmentData.shipComponents).forEach(componentId => {
          const component = shipComponentCollection.find(c => c.id === componentId);
          if (component?.key) {
            const baseStats = calculateSectionBaseStats(shipCard, component);
            updatedShipSections[component.key] = {
              ...component,
              hull: baseStats.hull,
              maxHull: baseStats.maxHull,
              shields: baseStats.shields,
              allocatedShields: baseStats.allocatedShields,
              thresholds: baseStats.thresholds,
              lane: commitmentData.shipComponents[componentId] || 'l'
            };
          }
        });
      }

      stateUpdates[playerId] = {
        ...currentState[playerId],
        deck: commitmentData.deck,
        deckDronePool: commitmentData.drones || [],
        selectedShipComponents: commitmentData.shipComponents || {},
        shipSections: updatedShipSections,
        discard: []
      };

      // Derive and store placement from lane assignments — no separate placement step needed.
      const laneToIndex = { 'l': 0, 'm': 1, 'r': 2 };
      const placedSections = [null, null, null];
      if (commitmentData.shipComponents) {
        Object.entries(commitmentData.shipComponents).forEach(([componentId, lane]) => {
          const component = shipComponentCollection.find(c => c.id === componentId);
          if (component?.key && lane in laneToIndex) {
            placedSections[laneToIndex[lane]] = component.key;
          }
        });
      }
      if (playerId === 'player1') {
        stateUpdates.placedSections = placedSections;
      } else {
        stateUpdates.opponentPlacedSections = placedSections;
      }

      // Initialize drone selection trio/pool for this player
      if (commitmentData.drones) {
        const drones = extractDronesFromDeck(commitmentData.drones);
        const rng = SeededRandom.forDroneSelection(currentState, playerId);
        const droneData = initializeDroneSelection(drones, 2, rng);
        stateUpdates[`${playerId}DroneSelectionTrio`] = droneData.droneSelectionTrio;
        stateUpdates[`${playerId}DroneSelectionPool`] = droneData.droneSelectionPool;
      }

      debugLog('COMMITMENTS', `✅ Applied deckSelection for ${playerId} (immediate, placement auto-derived)`);
      break;
    }

    case 'droneSelection': {
      const drones = commitmentData.drones;
      const upgrades = currentState[playerId]?.appliedUpgrades || {};
      stateUpdates[playerId] = {
        ...currentState[playerId],
        activeDronePool: drones,
        deployedDroneCounts: drones.reduce((acc, drone) => {
          acc[drone.name] = 0;
          return acc;
        }, {}),
        droneAvailability: initializeDroneAvailability(drones, upgrades)
      };
      debugLog('COMMITMENTS', `✅ Applied droneSelection for ${playerId} (immediate)`);
      break;
    }

    default:
      debugLog('COMMITMENTS', `No per-player apply logic for sub-phase: ${subPhase}`);
  }

  if (Object.keys(stateUpdates).length > 0) {
    ctx.setState(stateUpdates, 'COMMITMENT_APPLICATION');
  }
}

/**
 * Apply phase commitments to permanent game state
 * @param {string} phase - Phase name
 * @param {Object} ctx - ActionContext from ActionProcessor
 * @returns {Object} State updates to apply
 */
export function applyPhaseCommitments(phase, ctx) {
  const currentState = ctx.getState();
  const phaseCommitments = currentState.commitments[phase];

  if (!phaseCommitments) {
    debugLog('COMMITMENTS', `No commitments found for phase: ${phase}`);
    return {};
  }

  debugLog('COMMIT_TRACE', '[4/6] Applying phase commitments', {
    phase, updateKeys: Object.keys(phaseCommitments),
  });
  debugLog('COMMITMENTS', `📋 ActionProcessor: Applying ${phase} commitments to game state`, phaseCommitments);

  const stateUpdates = {};

  switch(phase) {
    case 'mandatoryDiscard':
    case 'optionalDiscard':
      debugLog('COMMITMENTS', '✅ Discard commitments (handled via card actions)');
      break;

    case 'mandatoryDroneRemoval':
      debugLog('COMMITMENTS', '✅ Mandatory drone removal (handled via processDestroyDrone)');
      break;

    case 'allocateShields':
      debugLog('COMMITMENTS', '✅ Shield allocation (handled separately)');
      break;

    default:
      debugLog('COMMITMENTS', `No commitment application logic for phase: ${phase}`);
  }

  return stateUpdates;
}
