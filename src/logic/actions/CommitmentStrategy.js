// Commitment strategies: processCommitment, handleAICommitment,
// applyPhaseCommitments, getPhaseCommitmentStatus, clearPhaseCommitments
// Extracted from ActionProcessor.js — handles simultaneous phase commitment system.

import aiPhaseProcessor from '../../managers/AIPhaseProcessor.js';
import { initializeForCombat as initializeDroneAvailability } from '../availability/DroneAvailabilityManager.js';
import { debugLog } from '../../utils/debugLogger.js';

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

  if (phase) {
    if (currentState.commitments[phase]) {
      currentState.commitments[phase] = {
        player1: { completed: false },
        player2: { completed: false }
      };
    }
    debugLog('COMMITMENTS', `🔄 Cleared commitments for phase: ${phase}`);
  } else {
    currentState.commitments = {};
    debugLog('COMMITMENTS', '🔄 Cleared all phase commitments');
  }

  ctx.setState({
    commitments: currentState.commitments
  });
}

/**
 * Process commitment action for simultaneous phases
 * @param {Object} payload - { playerId, phase, actionData }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processCommitment(payload, ctx) {
  const { playerId, phase, actionData } = payload;

  debugLog('COMMITMENTS', `🤝 ActionProcessor: Processing ${phase} commitment for ${playerId}`);
  debugLog('COMMITMENTS', `📦 Full commitment payload:`, {
    playerId,
    phase,
    actionDataKeys: actionData ? Object.keys(actionData) : [],
    actionDataSummary: actionData ? {
      selectedDrones: actionData.selectedDrones?.length,
      deck: actionData.deck?.length,
      drones: actionData.drones?.length,
      shipComponents: actionData.shipComponents?.length,
      placedSections: actionData.placedSections?.length
    } : null
  });

  const currentState = ctx.getState();
  const gameMode = currentState.gameMode;

  if (!currentState.commitments[phase]) {
    currentState.commitments[phase] = {
      player1: { completed: false },
      player2: { completed: false }
    };
  }

  currentState.commitments[phase][playerId] = {
    completed: true,
    ...actionData
  };

  // Apply shield allocations from commitment data
  if (phase === 'allocateShields' && actionData.shieldAllocations) {
    debugLog('SHIELD_CLICKS', `🛡️ Applying shield allocations for ${playerId}`, {
      shieldAllocations: actionData.shieldAllocations
    });

    const playerState = currentState[playerId];

    Object.keys(playerState.shipSections).forEach(sectionName => {
      playerState.shipSections[sectionName].allocatedShields = 0;
    });

    Object.entries(actionData.shieldAllocations).forEach(([sectionName, count]) => {
      if (playerState.shipSections[sectionName]) {
        playerState.shipSections[sectionName].allocatedShields = count;
        debugLog('SHIELD_CLICKS', `✅ Allocated ${count} shields to ${sectionName}`);
      }
    });

    const shieldsKey = playerId === 'player1' ? 'shieldsToAllocate' : 'opponentShieldsToAllocate';
    currentState[shieldsKey] = 0;
  }

  ctx.setState({
    commitments: currentState.commitments,
    player1: currentState.player1,
    player2: currentState.player2,
    shieldsToAllocate: currentState.shieldsToAllocate,
    opponentShieldsToAllocate: currentState.opponentShieldsToAllocate
  }, 'COMMITMENT_UPDATE');

  // PhaseManager integration
  const phaseManager = ctx.getPhaseManager();
  if (phaseManager) {
    if (gameMode === 'host' && playerId === 'player1') {
      phaseManager.notifyHostAction('commit', { phase });
      debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: Host committed to ${phase}`);
    } else if (gameMode === 'host' && playerId === 'player2') {
      phaseManager.notifyGuestAction('commit', { phase });
      debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: Guest committed to ${phase} (via network)`);
    } else if (gameMode === 'local') {
      if (playerId === 'player1') {
        phaseManager.notifyHostAction('commit', { phase });
      } else {
        phaseManager.notifyGuestAction('commit', { phase });
      }
      debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: ${playerId} committed to ${phase} (local mode)`);
    }
  }

  let bothComplete = currentState.commitments[phase].player1.completed &&
                      currentState.commitments[phase].player2.completed;

  debugLog('COMMITMENTS', `✅ ${playerId} ${phase} committed, both complete: ${bothComplete}`);
  debugLog('COMMITMENTS', `📊 Commitment state after update:`, {
    phase,
    player1Completed: currentState.commitments[phase].player1.completed,
    player2Completed: currentState.commitments[phase].player2.completed,
    bothComplete
  });

  if (gameMode === 'host') {
    debugLog('COMMITMENTS', `📡 Broadcasting commitment state to guest for ${phase}`);
    ctx.broadcastStateToGuest();
    debugLog('COMMITMENTS', `✅ Commitment state broadcast complete`);
  }

  // For single-player mode, auto-complete AI commitment immediately
  if (playerId === 'player1' && currentState.gameMode === 'local' && !bothComplete) {
    debugLog('COMMITMENTS', '🤖 Single-player mode: Auto-completing AI commitment immediately');
    debugLog('SHIELD_CLICKS', '🤖 About to call handleAICommitment for AI auto-commit');
    if (aiPhaseProcessor) {
      try {
        debugLog('SHIELD_CLICKS', '⏳ Calling handleAICommitment...');
        await handleAICommitment(phase, currentState, ctx);
        debugLog('COMMITMENTS', '✅ AI commitment completed successfully');
        debugLog('SHIELD_CLICKS', '✅ handleAICommitment returned successfully');

        const freshState = ctx.getState();
        bothComplete = freshState.commitments[phase].player1.completed &&
                      freshState.commitments[phase].player2.completed;
        debugLog('COMMITMENTS', `🔄 Recalculated bothComplete after AI commit: ${bothComplete}`);
        debugLog('SHIELD_CLICKS', `🔄 Both players complete: ${bothComplete}`);
      } catch (error) {
        debugLog('COMMITMENTS', 'AI commitment error:', error);
        debugLog('SHIELD_CLICKS', '❌ Error during AI commitment:', error);
        throw error;
      }
    } else {
      debugLog('SHIELD_CLICKS', '⚠️ aiPhaseProcessor not available!');
    }
  }

  debugLog('SHIELD_CLICKS', '🏁 processCommitment about to return', { success: true, bothComplete });

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
 */
export async function handleAICommitment(phase, currentState, ctx) {
  try {
    debugLog('COMMITMENTS', `🤖 Processing AI commitment for phase: ${phase}`);

    let aiResult;
    switch(phase) {
      case 'droneSelection':
        aiResult = await aiPhaseProcessor.processDroneSelection();
        await ctx.processCommitment({
          playerId: 'player2',
          phase: 'droneSelection',
          actionData: { drones: aiResult }
        });
        break;

      case 'deckSelection':
        aiResult = await aiPhaseProcessor.processDeckSelection();
        await ctx.processCommitment({
          playerId: 'player2',
          phase: 'deckSelection',
          actionData: {
            deck: aiResult.deck,
            drones: aiResult.drones,
            shipComponents: aiResult.shipComponents
          }
        });
        break;

      case 'placement':
        aiResult = await aiPhaseProcessor.processPlacement();
        await ctx.processCommitment({
          playerId: 'player2',
          phase: 'placement',
          actionData: { placedSections: aiResult }
        });
        break;

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

      case 'determineFirstPlayer':
        await new Promise(resolve => {
          setTimeout(async () => {
            await ctx.processCommitment({
              playerId: 'player2',
              phase: 'determineFirstPlayer',
              actionData: { acknowledged: true }
            });
            resolve();
          }, 1000);
        });
        break;

      default:
        debugLog('COMMITMENTS', `No AI handler for phase: ${phase}`);
    }

  } catch (error) {
    debugLog('COMMITMENTS', 'AI commitment error:', error);
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

  debugLog('COMMITMENTS', `📋 ActionProcessor: Applying ${phase} commitments to game state`, phaseCommitments);

  const stateUpdates = {};

  switch(phase) {
    case 'droneSelection':
      if (phaseCommitments.player1?.drones) {
        const p1Drones = phaseCommitments.player1.drones;
        const p1Upgrades = currentState.player1?.appliedUpgrades || {};
        stateUpdates.player1 = {
          ...currentState.player1,
          activeDronePool: p1Drones,
          deployedDroneCounts: p1Drones.reduce((acc, drone) => {
            acc[drone.name] = 0;
            return acc;
          }, {}),
          droneAvailability: initializeDroneAvailability(p1Drones, p1Upgrades)
        };
      }
      if (phaseCommitments.player2?.drones) {
        const p2Drones = phaseCommitments.player2.drones;
        const p2Upgrades = currentState.player2?.appliedUpgrades || {};
        stateUpdates.player2 = {
          ...currentState.player2,
          activeDronePool: p2Drones,
          deployedDroneCounts: p2Drones.reduce((acc, drone) => {
            acc[drone.name] = 0;
            return acc;
          }, {}),
          droneAvailability: initializeDroneAvailability(p2Drones, p2Upgrades)
        };
      }
      debugLog('COMMITMENTS', '✅ Applied drone selections to player states');
      break;

    case 'deckSelection':
      if (phaseCommitments.player1?.deck) {
        stateUpdates.player1 = {
          ...currentState.player1,
          deck: phaseCommitments.player1.deck,
          deckDronePool: phaseCommitments.player1.drones || [],
          selectedShipComponents: phaseCommitments.player1.shipComponents || {},
          discard: []
        };
      }
      if (phaseCommitments.player2?.deck) {
        stateUpdates.player2 = {
          ...currentState.player2,
          deck: phaseCommitments.player2.deck,
          deckDronePool: phaseCommitments.player2.drones || [],
          selectedShipComponents: phaseCommitments.player2.shipComponents || {},
          discard: []
        };
      }
      debugLog('COMMITMENTS', '✅ Applied deck selections (cards + drones + ship components) to player states');
      break;

    case 'placement':
      if (phaseCommitments.player1?.placedSections) {
        stateUpdates.placedSections = phaseCommitments.player1.placedSections;
      }
      if (phaseCommitments.player2?.placedSections) {
        stateUpdates.opponentPlacedSections = phaseCommitments.player2.placedSections;
      }
      debugLog('COMMITMENTS', '✅ Applied ship placements:', {
        player1: stateUpdates.placedSections,
        player2: stateUpdates.opponentPlacedSections
      });
      break;

    case 'determineFirstPlayer':
      debugLog('COMMITMENTS', '✅ First player determination (handled separately)');
      break;

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
