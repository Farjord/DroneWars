// --- useResolvers ---
// Manages all action resolution logic (attack, ability, card play, movement)
// and their associated modal confirmation callbacks.
// Extracted from App.jsx Session 6 (Step 2).

import { useState, useEffect, useCallback } from 'react';
import { debugLog } from '../utils/debugLogger.js';


// Delay before resolving move/card action to let UI settle (ms)
const MOVE_RESOLUTION_DELAY = 400;

const useResolvers = ({
  // --- Core action routing ---
  submitAction,
  getLocalPlayerId,
  getOpponentPlayerId,

  // --- Refs ---
  isResolvingAttackRef,

  // --- Circular dep ref (populated after useInterception returns) ---
  interceptionRef,

  // --- Game state ---
  localPlayerState,
  opponentPlayerState,
  winner,
  turnPhase,
  currentPlayer,
  gameStateManager,

  // --- State setters from App.jsx ---
  setSelectedDrone,
  setAbilityMode,
  setValidAbilityTargets,
  setShipAbilityMode,
  setDraggedDrone,
  setCardSelectionModal,
  setShipAbilityConfirmation,
  shipAbilityConfirmation,

  // --- From useCardSelection ---
  cancelCardSelection,
  setSelectedCard,
  setValidCardTargets,
  setCardConfirmation,
  setAffectedDroneIds,
  setAffectedSectionIds,
  cardConfirmation,

  // --- From useShieldAllocation ---
  pendingShieldChanges,
  clearReallocationState,
}) => {
  // --- State (confirmation modals + AI report) ---
  const [moveConfirmation, setMoveConfirmation] = useState(null);
  const [attackConfirmation, setAttackConfirmation] = useState(null);
  const [abilityConfirmation, setAbilityConfirmation] = useState(null);
  const [aiCardPlayReport, setAiCardPlayReport] = useState(null);

  // --- Defensive state cleanup ---
  // Reset attack flag when critical game state changes to prevent infinite loops
  useEffect(() => {
    if (winner) {
      if (isResolvingAttackRef.current) {
        debugLog('COMBAT', '[DEFENSIVE CLEANUP] Resetting stuck attack flag due to game state change');
        isResolvingAttackRef.current = false;
      }
    }
  }, [winner, turnPhase, currentPlayer]);

  // --- Cancel Ability Mode ---
  const cancelAbilityMode = useCallback(() => {
    setAbilityMode(null);
    setSelectedDrone(null);
    setValidAbilityTargets([]);
  }, [setValidAbilityTargets]);

  // --- Resolve Attack ---
  const resolveAttack = useCallback(async (attackDetails) => {
    if (attackDetails.attacker?.isSuppressed) {
      setAttackConfirmation(attackDetails);
      return;
    }

    if (isResolvingAttackRef.current) {
      debugLog('COMBAT', 'Attack already in progress. Aborting duplicate call.');
      return;
    }
    isResolvingAttackRef.current = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 250));

      const result = await submitAction('attack', {
        attackDetails: attackDetails
      });

      if (result?.needsInterceptionDecision) {
        debugLog('COMBAT', '[APP] Interception decision needed, checking if local player is defender...');

        const attackingPlayerId = result.interceptionData.attackDetails.attackingPlayer;
        const defendingPlayerId = attackingPlayerId === 'player1' ? 'player2' : 'player1';
        const localPlayerId = getLocalPlayerId();

        if (defendingPlayerId === localPlayerId) {
          debugLog('COMBAT', '[APP] Local player is defender, showing interception modal');
          interceptionRef.current.setPlayerInterceptionChoice(result.interceptionData);
          isResolvingAttackRef.current = false;
          return;
        } else {
          debugLog('COMBAT', '[APP] Local player is attacker, not showing interception modal');
        }
      }
    } catch (error) {
      debugLog('COMBAT', 'Error in resolveAttack:', error);
    } finally {
      isResolvingAttackRef.current = false;
    }
  }, [submitAction, getLocalPlayerId]);

  // --- Resolve Ability ---
  const resolveAbility = useCallback(async (ability, userDrone, targetDrone) => {
    const abilityIndex = userDrone.abilities.findIndex(a => a.name === ability.name);
    const targetId = targetDrone?.id || null;
    cancelAbilityMode();
    try {
      await submitAction('ability', {
        droneId: userDrone.id,
        abilityIndex,
        targetId
      });
    } catch (error) {
      debugLog('COMBAT', 'Error in resolveAbility:', error);
    }
  }, [submitAction, cancelAbilityMode]);

  // --- Resolve Card Play ---
  const resolveCardPlay = useCallback(async (card, target, actingPlayerId, aiContext = null) => {
    if (actingPlayerId === getOpponentPlayerId()) {
      let targetDisplayName = '';
      let targetLane = '';

      if (target) {
        if (target.name) {
          targetDisplayName = target.name;
          if (target.id && target.owner) {
            const targetPlayerState = target.owner === getLocalPlayerId() ? localPlayerState : opponentPlayerState;
            for (const [lane, drones] of Object.entries(targetPlayerState.dronesOnBoard)) {
              if (drones.some(drone => drone.id === target.id)) {
                targetLane = lane.replace('lane', 'Lane ');
                break;
              }
            }
          }
        } else if (target.id.startsWith('lane')) {
          targetDisplayName = `Lane ${target.id.slice(-1)}`;
          targetLane = `Lane ${target.id.slice(-1)}`;
        } else {
          targetDisplayName = target.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        }
      }
      setAiCardPlayReport({ card, targetName: targetDisplayName, targetLane });
    }

    debugLog('CARD_PLAY_TRACE', '[1] Card play confirmed', { card: card.name, cardId: card.id, targetId: target?.id, isAI: aiContext !== null });
    debugLog('CARD_PLAY_TRACE', '[2] Dispatching cardPlay action', { card: card.name, targetId: target?.id, playerId: actingPlayerId, isAI: aiContext !== null });

    if (actingPlayerId === getLocalPlayerId()) {
      cancelCardSelection();
      setCardConfirmation(null);
    }

    let result;
    try {
      result = await submitAction('cardPlay', {
        card: card,
        targetId: target?.id || null,
        targetOwner: target?.owner || null,
        playerId: actingPlayerId
      });
    } catch (err) {
      debugLog('CARD_PLAY_TRACE', '[3] submitAction ERROR', { card: card.name, error: err.message, stack: err.stack });
      return;
    }

    debugLog('CARD_PLAY_TRACE', '[3] submitAction result', {
      card: card.name,
      success: result?.success !== false,
    });

    return result;
  }, [submitAction, getLocalPlayerId, localPlayerState, opponentPlayerState]);

  // --- Handle Card Selection ---
  const handleCardSelection = useCallback(async (selectedCards, selectionData, originalCard, target, actingPlayerId, aiContext, playerStatesWithEnergyCosts = null) => {
    await submitAction('searchAndDrawCompletion', {
      card: originalCard,
      selectedCards,
      selectionData,
      playerId: actingPlayerId,
      playerStatesWithEnergyCosts
    });

    if (actingPlayerId === getLocalPlayerId()) {
      cancelCardSelection('confirm-card-selection');
      setCardConfirmation(null);
    }

    debugLog('CARD_PLAY_TRACE', '[10] Card play resolved (after selection)', { card: originalCard.name });
  }, [submitAction, getLocalPlayerId, cancelCardSelection]);



  // --- Resolve Single Move ---
  const resolveSingleMove = useCallback(async (card, droneId, droneOwner, fromLane, toLane) => {
    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 10: Inside resolveSingleMove', {
      receivedCard: card?.name, receivedDroneId: droneId, receivedDroneOwner: droneOwner,
      receivedFromLane: fromLane, receivedToLane: toLane,
      allParametersDefined: !!(card && droneId && droneOwner && fromLane && toLane)
    });

    const currentState = gameStateManager.getState();
    const ownerState = currentState?.[droneOwner];

    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 10b: Looking up drone in state', {
      droneOwner, fromLane, ownerStateExists: !!ownerState,
      dronesInLane: ownerState?.dronesOnBoard?.[fromLane]?.map(d => ({ id: d.id, name: d.name })),
      searchingForId: droneId
    });

    const currentDrone = ownerState?.dronesOnBoard?.[fromLane]?.find(d => d.id === droneId);

    if (!currentDrone) {
      debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 10c: Drone NOT FOUND', {
        droneId, fromLane, droneOwner, availableDrones: ownerState?.dronesOnBoard?.[fromLane]
      });
      cancelCardSelection('error-single-move-drone-not-found');
      return;
    }

    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 10d: Drone FOUND, proceeding with move', {
      foundDrone: { id: currentDrone.id, name: currentDrone.name }, fromLane, toLane
    });

    // Normal movement completion
    await submitAction('movementCompletion', {
      card,
      movementType: 'single_move',
      drones: [{ ...currentDrone, owner: droneOwner }],
      fromLane, toLane,
      playerId: getLocalPlayerId()
    });

    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 11: Move completed successfully', {
      drone: currentDrone.name, from: fromLane, to: toLane, card: card.name
    });

    cancelCardSelection('confirm-single-move');

    debugLog('CARD_PLAY_TRACE', '[10] Card play resolved (single-move)', { card: card.name });
  }, [submitAction, getLocalPlayerId]);

  // --- Handle Close AI Card Report ---
  const handleCloseAiCardReport = useCallback(async () => {
    if (aiCardPlayReport && !aiCardPlayReport.card.effects[0]?.goAgain) {
      await submitAction('turnTransition', {
        newPlayer: getLocalPlayerId(),
        reason: 'aiCardReportClosed'
      });
    } else if (aiCardPlayReport && aiCardPlayReport.card.effects[0]?.goAgain && !winner) {
      await submitAction('turnTransition', {
        newPlayer: getOpponentPlayerId(),
        reason: 'aiGoAgain'
      });
    }
    setAiCardPlayReport(null);
  }, [submitAction, getLocalPlayerId, getOpponentPlayerId, aiCardPlayReport, winner]);

  // --- Modal Confirmation Callbacks ---

  const handleConfirmMove = async () => {
    if (!moveConfirmation) return;

    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 8: Modal confirmed, extracting data', {
      moveConfirmation, moveConfirmationKeys: Object.keys(moveConfirmation),
      droneIdPresent: 'droneId' in moveConfirmation,
      ownerPresent: 'owner' in moveConfirmation,
      rawDroneId: moveConfirmation.droneId, rawOwner: moveConfirmation.owner,
      rawFrom: moveConfirmation.from, rawTo: moveConfirmation.to
    });

    const { droneId, owner, from, to, card, isSnared: wasSnared } = moveConfirmation;

    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 8b: Data destructured from moveConfirmation', {
      droneId, owner, from, to,
      hasCard: !!card, cardName: card?.name,
      allDefined: !!(droneId && owner && from && to)
    });

    setMoveConfirmation(null);

    if (wasSnared) {
      debugLog('CONSUMPTION_DEBUG', '[1] Calling processAction snaredConsumption', { droneId, owner });
      setSelectedDrone(null);
      setDraggedDrone(null);
      setValidCardTargets([]);
      await submitAction('snaredConsumption', { droneId, playerId: owner });
      return;
    }

    setTimeout(async () => {
      if (card) {
        debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 9: Calling resolveSingleMove', {
          card: card.name, droneId, owner, fromLane: from, toLane: to
        });
        setSelectedDrone(null);
        setDraggedDrone(null);
        setValidCardTargets([]);
        await resolveSingleMove(card, droneId, owner, from, to);
      } else {
        setSelectedDrone(null);
        await submitAction('move', {
          droneId, fromLane: from, toLane: to, playerId: getLocalPlayerId()
        });
      }
    }, MOVE_RESOLUTION_DELAY);
  };

  const handleConfirmAttack = async () => {
    if (!attackConfirmation) return;
    const { attacker } = attackConfirmation;
    debugLog('CONSUMPTION_DEBUG', '[1] Calling processAction suppressedConsumption', { droneId: attacker.id, owner: attackConfirmation.attackingPlayer });
    setAttackConfirmation(null);
    setSelectedDrone(null);
    await submitAction('suppressedConsumption', {
      droneId: attacker.id,
      playerId: attackConfirmation.attackingPlayer
    });
  };

  const handleCancelAttack = () => {
    setAttackConfirmation(null);
    setSelectedDrone(null);
  };

  const handleConfirmIntercept = async (interceptor) => {
    const { playerInterceptionChoice, setPlayerInterceptionChoice } = interceptionRef.current;
    const attackDetails = { ...playerInterceptionChoice.attackDetails, interceptor };
    setPlayerInterceptionChoice(null);
    setTimeout(async () => {
      await resolveAttack(attackDetails);
    }, 400);
  };

  const handleDeclineIntercept = async () => {
    const { playerInterceptionChoice, setPlayerInterceptionChoice } = interceptionRef.current;
    const attackDetails = { ...playerInterceptionChoice.attackDetails, interceptor: null };
    setPlayerInterceptionChoice(null);
    setTimeout(async () => {
      await resolveAttack(attackDetails);
    }, 400);
  };

  const handleConfirmCardPlay = async () => {
    if (!cardConfirmation) return;
    const { card, target, chainSelections } = cardConfirmation;
    setCardConfirmation(null);
    setAffectedSectionIds([]);
    setTimeout(async () => {
      if (chainSelections) {
        await submitAction('cardPlay', {
          card,
          targetId: target?.id || null,
          targetOwner: target?.owner || null,
          playerId: getLocalPlayerId(),
          chainSelections,
        });
      } else {
        await resolveCardPlay(card, target, getLocalPlayerId());
      }
    }, 400);
  };

  const handleConfirmDroneAbility = () => {
    if (!abilityConfirmation) return;
    const ability = abilityConfirmation.ability;
    const drone = abilityConfirmation.drone;
    const target = abilityConfirmation.target;
    setAbilityConfirmation(null);
    setTimeout(() => {
      resolveAbility(ability, drone, target);
    }, 400);
  };

  const handleConfirmShipAbility = async () => {
    if (!shipAbilityConfirmation) return;
    const ability = shipAbilityConfirmation.ability;
    const sectionName = shipAbilityConfirmation.sectionName;
    const target = shipAbilityConfirmation.target;
    const abilityType = shipAbilityConfirmation.abilityType;
    setShipAbilityConfirmation(null);

    setTimeout(async () => {
      if (abilityType === 'recall' || ability.name === 'Recall') {
        const result = await submitAction('recallAbility', {
          targetId: target?.id || null, sectionName, playerId: getLocalPlayerId()
        });
        debugLog('SHIP_ABILITY', `Recall ability completed:`, result);
      } else if (abilityType === 'targetLock' || ability.name === 'Target Lock') {
        const result = await submitAction('targetLockAbility', {
          targetId: target?.id || null, sectionName, playerId: getLocalPlayerId()
        });
        debugLog('SHIP_ABILITY', `Target Lock ability completed:`, result);
      } else if (abilityType === 'recalculate' || ability.name === 'Recalculate') {
        await submitAction('recalculateAbility', {
          sectionName, playerId: getLocalPlayerId()
        });
        // mandatoryAction delivery: handled by mandatoryActionPending useEffect in App.jsx
      } else if (abilityType === 'reallocateShields' || ability.name === 'Reallocate Shields') {
        const result = await submitAction('reallocateShieldsComplete', {
          playerId: getLocalPlayerId(), pendingChanges: pendingShieldChanges
        });
        clearReallocationState();
        debugLog('SHIP_ABILITY', `Reallocate Shields ability completed:`, result);
      }
      setShipAbilityMode(null);
      clearReallocationState();
    }, 400);
  };

  // Convenience function for cancelAllActions
  const clearConfirmations = () => {
    setAbilityConfirmation(null);
  };

  return {
    // --- Resolve functions ---
    resolveAttack,
    resolveAbility,
    resolveCardPlay,
    handleCardSelection,
    resolveSingleMove,
    cancelAbilityMode,
    handleCloseAiCardReport,

    // --- State ---
    moveConfirmation,
    attackConfirmation,
    abilityConfirmation,
    aiCardPlayReport,

    // --- State setters (needed by other hooks) ---
    setMoveConfirmation,
    setAttackConfirmation,
    setAbilityConfirmation,
    setAiCardPlayReport,

    // --- Modal callbacks ---
    handleConfirmMove,
    handleConfirmAttack,
    handleCancelAttack,
    handleConfirmIntercept,
    handleDeclineIntercept,
    handleConfirmCardPlay,
    handleConfirmDroneAbility,
    handleConfirmShipAbility,

    // --- Convenience ---
    clearConfirmations,
  };
};

export default useResolvers;
