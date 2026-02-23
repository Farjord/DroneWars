// --- useResolvers ---
// Manages all action resolution logic (attack, ability, card play, movement)
// and their associated modal confirmation callbacks.
// Extracted from App.jsx Session 6 (Step 2).

import { useState, useEffect, useCallback } from 'react';
import { debugLog } from '../utils/debugLogger.js';

const useResolvers = ({
  // --- Core action routing ---
  processActionWithGuestRouting,
  getLocalPlayerId,
  getOpponentPlayerId,

  // --- Refs ---
  isResolvingAttackRef,
  multiSelectFlowInProgress,
  additionalCostFlowInProgress,

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
  setMandatoryAction,
  setFooterView,
  setIsFooterOpen,
  setShipAbilityMode,
  setDraggedDrone,
  setCardSelectionModal,
  setShipAbilityConfirmation,

  // --- From useCardSelection ---
  cancelCardSelection,
  setSingleMoveMode,
  setSelectedCard,
  setValidCardTargets,
  setMultiSelectState,
  setAdditionalCostState,
  setAdditionalCostConfirmation,
  setAdditionalCostSelectionContext,
  setCostReminderArrowState,
  setCardConfirmation,
  setAffectedDroneIds,
  confirmAdditionalCostCard,
  singleMoveMode,
  additionalCostSelectionContext,
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

      const result = await processActionWithGuestRouting('attack', {
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
  }, [processActionWithGuestRouting, getLocalPlayerId, getOpponentPlayerId]);

  // --- Resolve Ability ---
  const resolveAbility = useCallback(async (ability, userDrone, targetDrone) => {
    try {
      await processActionWithGuestRouting('ability', {
        droneId: userDrone.id,
        abilityIndex: userDrone.abilities.findIndex(a => a.name === ability.name),
        targetId: targetDrone?.id || null
      });
      cancelAbilityMode();
    } catch (error) {
      debugLog('COMBAT', 'Error in resolveAbility:', error);
      cancelAbilityMode();
    }
  }, [processActionWithGuestRouting, cancelAbilityMode]);

  // --- Resolve Ship Ability ---
  const resolveShipAbility = useCallback(async (ability, sectionName, target) => {
    const result = await processActionWithGuestRouting('shipAbility', {
      ability: ability,
      sectionName: sectionName,
      targetId: target?.id || null,
      playerId: getLocalPlayerId()
    });

    if (result.mandatoryAction) {
      setMandatoryAction(result.mandatoryAction);
      setFooterView('hand');
      setIsFooterOpen(true);
      setShipAbilityMode(null);
      setShipAbilityConfirmation(null);
      return;
    }

    if (result.requiresShieldReallocation) {
      setShipAbilityMode(null);
      setShipAbilityConfirmation(null);
      return;
    }

    await processActionWithGuestRouting('shipAbilityCompletion', {
      ability: ability,
      sectionName: sectionName,
      playerId: getLocalPlayerId()
    });

    setShipAbilityMode(null);
    setShipAbilityConfirmation(null);

    return result;
  }, [processActionWithGuestRouting, getLocalPlayerId]);

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

    const result = await processActionWithGuestRouting('cardPlay', {
      card: card,
      targetId: target?.id || null,
      playerId: actingPlayerId
    });

    if (result.needsCardSelection) {
      if (result.needsCardSelection.type === 'single_move' || result.needsCardSelection.type === 'multi_move') {
        if (result.needsCardSelection.type === 'single_move') {
          const actingPlayerState = actingPlayerId === getLocalPlayerId()
            ? localPlayerState
            : opponentPlayerState;
          const friendlyDrones = Object.values(actingPlayerState.dronesOnBoard)
            .flat()
            .map(drone => ({ id: drone.id, type: 'drone', owner: actingPlayerId }));
          setValidCardTargets(friendlyDrones);
        }

        setMultiSelectState({
          card: result.needsCardSelection.card,
          phase: result.needsCardSelection.phase,
          selectedDrones: [],
          sourceLane: null,
          maxDrones: result.needsCardSelection.maxDrones,
          actingPlayerId: actingPlayerId
        });
        return;
      }

      setCardSelectionModal({
        ...result.needsCardSelection,
        onConfirm: async (selectedCards) => {
          await handleCardSelection(selectedCards, result.needsCardSelection, card, target, actingPlayerId, aiContext, null);
          setCardSelectionModal(null);
        },
        onCancel: () => {
          setCardSelectionModal(null);
          if (actingPlayerId === getLocalPlayerId()) {
            cancelCardSelection('user-cancel-card-selection-modal');
            setCardConfirmation(null);
          }
        }
      });
      return;
    }

    if (actingPlayerId === getLocalPlayerId()) {
      cancelCardSelection();
      setCardConfirmation(null);
    }

    return result;
  }, [processActionWithGuestRouting, getLocalPlayerId, localPlayerState, opponentPlayerState]);

  // --- Handle Card Selection ---
  const handleCardSelection = useCallback(async (selectedCards, selectionData, originalCard, target, actingPlayerId, aiContext, playerStatesWithEnergyCosts = null) => {
    await processActionWithGuestRouting('searchAndDrawCompletion', {
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
  }, [processActionWithGuestRouting, getLocalPlayerId, cancelCardSelection]);

  // --- Resolve Multi Move ---
  const resolveMultiMove = useCallback(async (card, dronesToMove, fromLane, toLane) => {
    await processActionWithGuestRouting('movementCompletion', {
      card,
      movementType: 'multi_move',
      drones: dronesToMove,
      fromLane,
      toLane,
      playerId: getLocalPlayerId()
    });

    setMultiSelectState(null);
    cancelCardSelection('confirm-multi-move');
  }, [processActionWithGuestRouting, getLocalPlayerId]);

  // --- Resolve Single Move ---
  const resolveSingleMove = useCallback(async (card, droneId, droneOwner, fromLane, toLane) => {
    debugLog('ADDITIONAL_COST_EFFECT_FLOW', 'resolveSingleMove ENTRY', {
      cardName: card.name, cardId: card.id, droneId, droneOwner, fromLane, toLane,
      hasAdditionalCostContext: !!additionalCostSelectionContext,
      contextCardId: additionalCostSelectionContext?.card?.id
    });

    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 10: Inside resolveSingleMove', {
      receivedCard: card?.name, receivedDroneId: droneId, receivedDroneOwner: droneOwner,
      receivedFromLane: fromLane, receivedToLane: toLane,
      allParametersDefined: !!(card && droneId && droneOwner && fromLane && toLane),
      hasAdditionalCostContext: !!additionalCostSelectionContext
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
      setMultiSelectState(null);
      cancelCardSelection('error-single-move-drone-not-found');
      return;
    }

    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 10d: Drone FOUND, proceeding with move', {
      foundDrone: { id: currentDrone.id, name: currentDrone.name }, fromLane, toLane
    });

    // Additional cost effect selection path
    if (additionalCostSelectionContext && additionalCostSelectionContext.card.id === card.id) {
      debugLog('ADDITIONAL_COST_EFFECT_FLOW', 'Additional cost effect selection detected', {
        cardName: card.name, contextCard: additionalCostSelectionContext.card.name
      });

      const result = await processActionWithGuestRouting('additionalCostEffectSelectionComplete', {
        selectionContext: additionalCostSelectionContext,
        effectSelection: {
          type: 'single_move',
          drone: { ...currentDrone, owner: droneOwner },
          fromLane, toLane,
          playerId: getLocalPlayerId()
        },
        playerId: getLocalPlayerId()
      });

      debugLog('ADDITIONAL_COST_EFFECT_FLOW', 'Action dispatched, clearing state', {
        resultSuccess: result?.success
      });

      setAdditionalCostSelectionContext(null);
      setMultiSelectState(null);
      setAdditionalCostState(null);
      setCostReminderArrowState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
      setSelectedCard(null);
      setValidCardTargets([]);
      setAffectedDroneIds([]);
      additionalCostFlowInProgress.current = false;
      return;
    }

    // Normal movement completion
    await processActionWithGuestRouting('movementCompletion', {
      card,
      movementType: 'single_move',
      drones: [{ ...currentDrone, owner: droneOwner }],
      fromLane, toLane,
      playerId: getLocalPlayerId()
    });

    debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 11: Move completed successfully', {
      drone: currentDrone.name, from: fromLane, to: toLane, card: card.name
    });

    setMultiSelectState(null);
    cancelCardSelection('confirm-single-move');
  }, [processActionWithGuestRouting, getLocalPlayerId, additionalCostSelectionContext]);

  // --- Handle Close AI Card Report ---
  const handleCloseAiCardReport = useCallback(async () => {
    if (aiCardPlayReport && !aiCardPlayReport.card.effect.goAgain) {
      await processActionWithGuestRouting('turnTransition', {
        newPlayer: getLocalPlayerId(),
        reason: 'aiCardReportClosed'
      });
    } else if (aiCardPlayReport && aiCardPlayReport.card.effect.goAgain && !winner) {
      await processActionWithGuestRouting('turnTransition', {
        newPlayer: getOpponentPlayerId(),
        reason: 'aiGoAgain'
      });
    }
    setAiCardPlayReport(null);
  }, [processActionWithGuestRouting, getLocalPlayerId, getOpponentPlayerId, aiCardPlayReport, winner]);

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

    if (singleMoveMode) {
      setSingleMoveMode(null);
      setSelectedCard(null);
    }

    if (wasSnared) {
      debugLog('CONSUMPTION_DEBUG', '[1] Calling processAction snaredConsumption', { droneId, owner });
      await processActionWithGuestRouting('snaredConsumption', { droneId, playerId: owner });
      setSelectedDrone(null);
      setDraggedDrone(null);
      setValidCardTargets([]);
      return;
    }

    setTimeout(async () => {
      if (card) {
        debugLog('SINGLE_MOVE_FLOW', 'CHECKPOINT 9: Calling resolveSingleMove', {
          card: card.name, droneId, owner, fromLane: from, toLane: to
        });
        await resolveSingleMove(card, droneId, owner, from, to);
        setSelectedDrone(null);
        setDraggedDrone(null);
        setValidCardTargets([]);
      } else {
        await processActionWithGuestRouting('move', {
          droneId, fromLane: from, toLane: to, playerId: getLocalPlayerId()
        });
        setSelectedDrone(null);
      }
    }, 400);
  };

  const handleConfirmAttack = async () => {
    if (!attackConfirmation) return;
    const { attacker } = attackConfirmation;
    debugLog('CONSUMPTION_DEBUG', '[1] Calling processAction suppressedConsumption', { droneId: attacker.id, owner: attackConfirmation.attackingPlayer });
    setAttackConfirmation(null);
    setSelectedDrone(null);
    await processActionWithGuestRouting('suppressedConsumption', {
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
    const card = cardConfirmation.card;
    const target = cardConfirmation.target;
    setCardConfirmation(null);
    setTimeout(async () => {
      await resolveCardPlay(card, target, getLocalPlayerId());
    }, 400);
  };

  const handleConfirmAdditionalCost = async () => {
    const card = additionalCostConfirmation.card;
    const costSelection = additionalCostConfirmation.costSelection;
    const effectTarget = additionalCostConfirmation.effectTarget;
    setAdditionalCostConfirmation(null);
    setTimeout(async () => {
      await confirmAdditionalCostCard(card, costSelection, effectTarget);
    }, 400);
  };

  const handleCancelAdditionalCost = () => {
    setAdditionalCostConfirmation(null);
  };

  const handleConfirmDroneAbility = () => {
    const ability = abilityConfirmation.ability;
    const drone = abilityConfirmation.drone;
    const target = abilityConfirmation.target;
    setAbilityConfirmation(null);
    setTimeout(() => {
      resolveAbility(ability, drone, target);
    }, 400);
  };

  const handleConfirmShipAbility = async () => {
    const ability = shipAbilityConfirmation.ability;
    const sectionName = shipAbilityConfirmation.sectionName;
    const target = shipAbilityConfirmation.target;
    const abilityType = shipAbilityConfirmation.abilityType;
    setShipAbilityConfirmation(null);

    setTimeout(async () => {
      if (abilityType === 'recall' || ability.name === 'Recall') {
        const result = await processActionWithGuestRouting('recallAbility', {
          targetId: target?.id || null, sectionName, playerId: getLocalPlayerId()
        });
        debugLog('SHIP_ABILITY', `Recall ability completed:`, result);
      } else if (abilityType === 'targetLock' || ability.name === 'Target Lock') {
        const result = await processActionWithGuestRouting('targetLockAbility', {
          targetId: target?.id || null, sectionName, playerId: getLocalPlayerId()
        });
        debugLog('SHIP_ABILITY', `Target Lock ability completed:`, result);
      } else if (abilityType === 'recalculate' || ability.name === 'Recalculate') {
        const result = await processActionWithGuestRouting('recalculateAbility', {
          sectionName, playerId: getLocalPlayerId()
        });
        if (result.mandatoryAction) {
          setMandatoryAction(result.mandatoryAction);
          setFooterView('hand');
          setIsFooterOpen(true);
        }
        debugLog('SHIP_ABILITY', `Recalculate ability completed:`, result);
      } else if (abilityType === 'reallocateShields' || ability.name === 'Reallocate Shields') {
        const result = await processActionWithGuestRouting('reallocateShieldsComplete', {
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
    resolveShipAbility,
    resolveCardPlay,
    handleCardSelection,
    resolveMultiMove,
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
    handleConfirmAdditionalCost,
    handleCancelAdditionalCost,
    handleConfirmDroneAbility,
    handleConfirmShipAbility,

    // --- Convenience ---
    clearConfirmations,
  };
};

export default useResolvers;
