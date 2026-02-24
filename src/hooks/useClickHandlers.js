import { getElementCenter, calculateLaneDestinationPoint, calculateCostReminderArrow } from '../utils/gameUtils.js';
import { calculateEffectTargetsWithCostContext } from '../logic/targeting/uiTargetingHelpers.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * @typedef {Object} AbilityHandlerConfig
 * @property {('reallocation'|'confirmation'|'targeting')} handler - Handler type
 * @property {string} abilityType - Identifier passed to ability mode/confirmation state
 */

/** @type {Record<string, AbilityHandlerConfig>} */
const ABILITY_CONFIG = {
  'Reallocate Shields': { handler: 'reallocation', abilityType: 'reallocateShields' },
  'Recalculate':        { handler: 'confirmation', abilityType: 'recalculate' },
  'Recall':             { handler: 'targeting',     abilityType: 'recall' },
  'Target Lock':        { handler: 'targeting',     abilityType: 'targetLock' },
};

/** Look up the handler config for a given ability */
const getAbilityHandlerConfig = (ability) => ABILITY_CONFIG[ability.name] || null;

/**
 * Consolidates all click-based interaction handlers from App.jsx.
 * These handle drone token clicks, lane clicks, card clicks, ability clicks,
 * and ship ability clicks. All are plain functions (not useCallback) to match
 * the original render-per-cycle behavior and avoid stale closure issues.
 */
export default function useClickHandlers({
  // --- Game state ---
  turnPhase,
  currentPlayer,
  gameState,
  localPlayerState,
  opponentPlayerState,
  passInfo,
  mandatoryAction,
  shouldShowRemovalUI,

  // --- App.jsx state ---
  selectedDrone,
  setSelectedDrone,
  abilityMode,
  setAbilityMode,

  // --- Modal state setters ---
  setModalContent,
  setConfirmationModal,
  setDetailedDroneInfo,
  setAbilityConfirmation,
  setMoveConfirmation,
  setCardConfirmation,
  setAdditionalCostConfirmation,
  setShipAbilityConfirmation,
  setDestroyUpgradeModal,
  setUpgradeSelectionModal,

  // --- From useCardSelection ---
  selectedCard,
  setSelectedCard,
  validCardTargets,
  setValidCardTargets,
  validAbilityTargets,
  multiSelectState,
  setMultiSelectState,
  cancelCardSelection,
  multiSelectFlowInProgress,
  additionalCostState,
  setAdditionalCostState,
  additionalCostFlowInProgress,
  additionalCostSelectionContext,
  singleMoveMode,
  setSingleMoveMode,
  secondaryTargetingState,
  cancelSecondaryTargeting,

  // --- From useShieldAllocation ---
  shipAbilityMode,
  setShipAbilityMode,
  setReallocationPhase,
  setShieldsToRemove,
  setShieldsToAdd,
  setOriginalShieldAllocation,
  setReallocationAbility,

  // --- Hoisted state from App.jsx ---
  setCostReminderArrowState,

  // --- App.jsx functions ---
  cancelAllActions,
  cancelAbilityMode,
  isActionInProgress,
  isMyTurn,
  getLocalPlayerId,
  getOpponentPlayerId,
  resolveAbility,
  resolveSingleMove,
  resolveMultiMove,
  handleConfirmMandatoryDestroy,

  // --- Action dispatching ---
  processActionWithGuestRouting,

  // --- External services ---
  gameEngine,
  gameDataService,

  // --- Refs ---
  droneRefs,
  gameAreaRef,
}) {

  // --- handleToggleDroneSelection ---

  const handleToggleDroneSelection = (drone) => {
    if (passInfo[getLocalPlayerId() + 'Passed']) return;
    if (selectedDrone && selectedDrone.id === drone.id) {
     setSelectedDrone(null);
    } else {
     setSelectedDrone(drone);
     setAbilityMode(null);
     cancelCardSelection();
    }
  };

  // --- handleAbilityIconClick ---

  const handleAbilityIconClick = (e, drone, ability) => {
    e.stopPropagation();
    if (turnPhase !== 'action' || currentPlayer !== getLocalPlayerId() || passInfo[getLocalPlayerId() + 'Passed']) return;

    const cost = ability.cost || {};
    if (drone.isExhausted && cost.exhausts !== false) {
       setModalContent({ title: "Drone Exhausted", text: "This drone cannot perform any more actions this turn.", isBlocking: true});
        return;
    }
    if (cost.energy && localPlayerState.energy < cost.energy) {
       setModalContent({ title: "Not Enough Energy", text: `This ability costs ${cost.energy} energy, but you only have ${localPlayerState.energy}.`, isBlocking: true});
        return;
    }

    // Check activation limit (per-round usage)
    if (ability.activationLimit != null) {
      const abilityIndex = drone.abilities?.findIndex(a => a.name === ability.name) ?? -1;
      const activations = drone.abilityActivations?.[abilityIndex] || 0;
      if (activations >= ability.activationLimit) {
        setModalContent({ title: "Ability Limit Reached", text: `${ability.name} can only be used ${ability.activationLimit} time${ability.activationLimit > 1 ? 's' : ''} per round.`, isBlocking: true });
        return;
      }
    }

    // Check for SELF targeting abilities (e.g., Purge - destroy self)
    if (ability.targeting?.type === 'SELF') {
        setAbilityConfirmation({
            ability: ability,
            drone: drone,
            target: drone  // Target is the drone itself
        });
        return;
    }

    // Check for self-targeting lane abilities
    if (ability.targeting?.type === 'LANE' && ability.targeting?.location === 'SAME_LANE') {
        // See FUTURE_IMPROVEMENTS #38 — getLaneOfDrone utility extraction
        const laneId = gameEngine.getLaneOfDrone(drone.id, localPlayerState);
        if (laneId) {
            // Immediately open the confirmation modal since the target is known
            setAbilityConfirmation({
                ability: ability,
                drone: drone,
                target: { id: laneId, owner: getLocalPlayerId() }
            });
            // Skip the manual target selection phase
            return;
        }
    }

    // This code will now only run for abilities that require manual targeting
    if (abilityMode && abilityMode.drone.id === drone.id) {
       cancelAbilityMode();
    } else {
       cancelAllActions(); // Cancel all other actions before starting ability targeting
       setAbilityMode({ drone, ability });
       setSelectedDrone(drone);
    }
  };

  // --- handleShipAbilityClick ---

  const handleShipAbilityClick = (e, section, ability) => {
    e.stopPropagation();
    if (turnPhase !== 'action' || !isMyTurn() || passInfo[`${getLocalPlayerId()}Passed`]) return;

    if (localPlayerState.energy < ability.cost.energy) {
        setModalContent({ title: "Not Enough Energy", text: `This ability costs ${ability.cost.energy} energy, but you only have ${localPlayerState.energy}.`, isBlocking: true });
        return;
    }

    // Check activation limit (per-round usage)
    if (ability.activationLimit != null) {
      const sectionData = localPlayerState.shipSections?.[section.name];
      const activations = sectionData?.abilityActivationCount || 0;
      if (activations >= ability.activationLimit) {
        setModalContent({ title: "Ability Limit Reached", text: `${ability.name} can only be used ${ability.activationLimit} time${ability.activationLimit > 1 ? 's' : ''} per round.`, isBlocking: true });
        return;
      }
    }

    // If the clicked ability is already active, cancel it.
    if (shipAbilityMode?.ability.id === ability.id) {
        setShipAbilityMode(null);
    } else {
        // Route to specific ability handlers via config lookup
        const abilityHandlerConfig = getAbilityHandlerConfig(ability);

        if (abilityHandlerConfig?.handler === 'reallocation') {
            // Start reallocation mode without energy deduction
            cancelAllActions();
            setReallocationPhase('removing');
            setShieldsToRemove(ability.effect.value.maxShields);
            setShieldsToAdd(0);
            setOriginalShieldAllocation(JSON.parse(JSON.stringify(localPlayerState.shipSections)));
            setReallocationAbility({ ability, sectionName: section.name });
        } else if (abilityHandlerConfig?.handler === 'confirmation') {
            // Non-targeted ability - show confirmation modal
            cancelAllActions();
            setShipAbilityConfirmation({ ability, sectionName: section.name, target: null, abilityType: abilityHandlerConfig.abilityType });
        } else if (abilityHandlerConfig?.handler === 'targeting') {
            // Targeted ability - enter targeting mode
            cancelAllActions();
            setShipAbilityMode({ sectionName: section.name, ability, abilityType: abilityHandlerConfig.abilityType });
        } else {
            // Fallback for any future abilities
            if (!ability.targeting) {
                cancelAllActions();
                setShipAbilityConfirmation({ ability, sectionName: section.name, target: null });
            } else {
                cancelAllActions();
                setShipAbilityMode({ sectionName: section.name, ability });
            }
        }
    }
  };

  // --- handleTargetClick ---

  const handleTargetClick = (target, targetType, isPlayer) => {
      // This function handles targeting for cards and abilities only.

      if (shipAbilityMode && validAbilityTargets.some(t => t.id === target.id)) {
          setShipAbilityConfirmation({
              ability: shipAbilityMode.ability,
              sectionName: shipAbilityMode.sectionName,
              target: target,
              abilityType: shipAbilityMode.abilityType
          });
          return;
      }
      if (abilityMode && validAbilityTargets.some(t => t.id === target.id)) {
          resolveAbility(abilityMode.ability, abilityMode.drone, target);
          return;
      }

      if (selectedCard) {
        const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();

        // Additional cost card handling
        if (additionalCostState) {
          if (additionalCostState.phase === 'select_cost') {
            // Cost selection (e.g., card in hand)
            debugLog('ADDITIONAL_COST_UI', '🎯 Cost selected', { target });

            const costSelection = {
              type: selectedCard.additionalCost.type,
              card: target  // For DISCARD_CARD cost
            };

            // Calculate valid effect targets
            const effectTargets = calculateEffectTargetsWithCostContext(
              selectedCard,
              costSelection,
              gameState.player1,
              gameState.player2,
              getLocalPlayerId(),
              gameDataService.getEffectiveStats.bind(gameDataService)
            );

            setAdditionalCostState({
              ...additionalCostState,
              phase: 'select_effect',
              costSelection
            });
            additionalCostFlowInProgress.current = true;
            setValidCardTargets(effectTargets);
            return;
          }

          if (additionalCostState.phase === 'select_effect') {
            // Effect target selected - show confirmation modal
            debugLog('ADDITIONAL_COST_UI', '✅ Effect target selected, showing confirmation', { target });

            setAdditionalCostConfirmation({
              card: selectedCard,
              costSelection: additionalCostState.costSelection,
              effectTarget: { ...target, owner }
            });
            return;
          }
        }

        // Standard card confirmation
        if (validCardTargets.some(t => t.id === target.id && t.owner === owner)) {
          setCardConfirmation({ card: selectedCard, target: { ...target, owner } });
          return;
        }
      }

      // If no ability/card is active, clicking any drone just shows its details.
      if (targetType === 'drone') {
          setDetailedDroneInfo({ drone: target, isPlayer });
      }
  };

  // --- handleTokenClick ---

  const handleTokenClick = (e, token, isPlayer) => {
      e.stopPropagation();
      debugLog('COMBAT', `--- handleTokenClick triggered for ${token.name} (isPlayer: ${isPlayer}) ---`);

      // Multi-move selection takes priority over other click handlers
      if (multiSelectState && multiSelectState.phase === 'select_drones' && isPlayer) {
          // Validate drone is a valid target (includes exhaustion check + any future filters)
          const tokenOwner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
          if (!validCardTargets.some(t => t.id === token.id && t.owner === tokenOwner)) {
              debugLog('COMBAT', "Action prevented: Drone is not a valid target for movement.");
              return;
          }

          debugLog('COMBAT', "Action: Multi-move drone selection.");
          const { selectedDrones, maxDrones } = multiSelectState;
          const isAlreadySelected = selectedDrones.some(d => d.id === token.id);
          if (isAlreadySelected) {
              setMultiSelectState(prev => ({ ...prev, selectedDrones: prev.selectedDrones.filter(d => d.id !== token.id) }));
          } else if (selectedDrones.length < maxDrones) {
              setMultiSelectState(prev => ({ ...prev, selectedDrones: [...prev.selectedDrones, token] }));
          }
          return;
      }

      // 1. Handle single-move drone selection (SINGLE_MOVE cards like Maneuver)
      // IMPORTANT: This must come BEFORE generic validCardTargets check to prevent interception
      // PHASE 9 FIX: Support both friendly and enemy drone selection
      // Check validCardTargets instead of isPlayer to support enemy drone selection
      if (multiSelectState && multiSelectState.phase === 'select_drone') {
          debugLog('ADDITIONAL_COST_EFFECT_FLOW', '🎯 Drone click during select_drone phase', {
              droneName: token.name,
              droneId: token.id,
              isPlayer,
              multiSelectPhase: multiSelectState.phase,
              multiSelectCard: multiSelectState.card?.name,
              hasAdditionalCostContext: !!additionalCostSelectionContext
          });

          // Check if this drone is a valid target
          const tokenOwner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();

          debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🔍 Checking if drone is valid target', {
              tokenOwner,
              validCardTargetCount: validCardTargets.length,
              validCardTargetIds: validCardTargets.map(t => t.id),
              isValidTarget: validCardTargets.some(t => t.id === token.id && t.owner === tokenOwner)
          });

          if (!validCardTargets.some(t => t.id === token.id && t.owner === tokenOwner)) {
              debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ❌ Drone is not a valid target - ABORTING');
              debugLog('COMBAT', "Action prevented: Drone is not a valid target for movement.");
              return;
          }

          debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ Drone is valid target - proceeding');
          debugLog('COMBAT', "Action: Single-move drone selection.");

          // Find the drone's current lane
          // For enemy drones, search in opponent state; for friendly, search in local state
          const droneOwnerState = tokenOwner === getLocalPlayerId()
              ? localPlayerState
              : opponentPlayerState;

          const droneLane = Object.entries(droneOwnerState.dronesOnBoard).find(([_, drones]) =>
              drones.some(d => d.id === token.id)
          )?.[0];

          debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🔍 Found drone lane', {
              droneLane,
              tokenOwner
          });

          if (droneLane) {
              debugLog('MOVEMENT_LANES', `Drone selected from ${droneLane}, tokenOwner: ${tokenOwner}`);

              // Calculate adjacent lanes
              const currentLaneIndex = parseInt(droneLane.replace('lane', ''));
              const adjacentLanes = [];

              if (currentLaneIndex > 1) {
                  adjacentLanes.push({ id: `lane${currentLaneIndex - 1}`, owner: tokenOwner, type: 'lane' });
              }
              if (currentLaneIndex < 3) {
                  adjacentLanes.push({ id: `lane${currentLaneIndex + 1}`, owner: tokenOwner, type: 'lane' });
              }

              debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ Transitioning to select_destination phase', {
                  selectedDrone: token.name,
                  selectedDroneId: token.id,
                  sourceLane: droneLane,
                  adjacentLanes: adjacentLanes.map(l => l.id),
                  willSetValidCardTargets: true
              });

              debugLog('MOVEMENT_LANES', `Adjacent lanes with owner:`, adjacentLanes);

              // Set valid targets to highlight available lanes
              setValidCardTargets(adjacentLanes);

              // Update multiSelectState with selected drone and transition to destination selection
              setMultiSelectState(prev => ({
                  ...prev,
                  selectedDrone: token,
                  sourceLane: droneLane,
                  phase: 'select_destination'
              }));

              debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ State updated - drone click handler complete');
          } else {
              debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ❌ Could not find drone lane - ABORTING');
          }
          return;
      }

      // 2. Handle targeting for an active card or ability
      const tokenOwner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
      if (validAbilityTargets.some(t => t.id === token.id && t.owner === tokenOwner) ||
          validCardTargets.some(t => t.id === token.id && t.owner === tokenOwner)) {
          debugLog('COMBAT', "Action: Targeting for an active card/ability.");
          handleTargetClick(token, 'drone', isPlayer);
          return;
      }

      // 3. Handle mandatory destruction (phase-based or ability-based)

      if ((shouldShowRemovalUI || mandatoryAction?.type === 'destroy') && isPlayer) {
          debugLog('COMBAT', "Action: Mandatory destruction.");
          setConfirmationModal({
              type: 'destroy', target: token,
              onConfirm: () => handleConfirmMandatoryDestroy(token), onCancel: () => setConfirmationModal(null),
              text: `Are you sure you want to destroy your ${token.name}?`
          });
          return;
      }

      // 5. Fallback: show drone details (click always opens info modal, drag handles attacks)
      debugLog('COMBAT', "Action: Fallback - showing drone details.");
      setDetailedDroneInfo({ drone: token, isPlayer });
  };

  // --- handleLaneClick ---

  const handleLaneClick = (e, lane, isPlayer) => {
    // Stop the click from bubbling up to the main game area div
    e.stopPropagation();

    // Entry logging for diagnostics
    debugLog('LANE_CLICK_ENTRY', '🖱️ handleLaneClick ENTRY', {
      lane: lane,
      isPlayer: isPlayer,
      selectedDrone: selectedDrone,
      additionalCostState: additionalCostState,
      additionalCostPhase: additionalCostState?.phase,
      turnPhase: turnPhase,
      singleMoveMode: singleMoveMode,
      timestamp: Date.now()
    });

    // Debug logging for MULTI_MOVE
    if (multiSelectState) {
      debugLog('CARD_PLAY', '🔵 MULTI_MOVE: handleLaneClick called');
      debugLog('CARD_PLAY', '   Lane:', lane, '| isPlayer:', isPlayer);
      debugLog('CARD_PLAY', '   multiSelectState:', multiSelectState);
      debugLog('CARD_PLAY', '   validCardTargets:', validCardTargets);
    }

    // --- 9.1 HANDLE ABILITY TARGETING ---
    if (abilityMode && abilityMode.ability.targeting.type === 'LANE') {
        const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
        if (validAbilityTargets.some(t => t.id === lane && t.owner === owner)) {
            setAbilityConfirmation({
                ability: abilityMode.ability,
                drone: abilityMode.drone,
                target: { id: lane, owner: owner }
            });
            return;
        }
    }

    // --- 9.1.5 HANDLE ADDITIONAL COST MOVEMENT DESTINATION ---
    if (additionalCostState && additionalCostState.phase === 'select_cost_movement_destination' && isPlayer && validCardTargets.some(t => t.id === lane)) {
      debugLog('ADDITIONAL_COST_UI', '🚚 Cost movement destination selected', {
        toLane: lane,
        additionalCostPhase: additionalCostState.phase,
        selectedDrone: selectedDrone,
        validCardTargets: validCardTargets,
        aboutToTransitionToSelectEffect: true
      });

      // Update cost selection with destination
      const updatedCostSelection = {
        ...additionalCostState.costSelection,
        toLane: lane
      };

      // Calculate valid effect targets (e.g., enemy drones in SOURCE lane)
      const effectTargets = calculateEffectTargetsWithCostContext(
        additionalCostState.card,
        updatedCostSelection,
        gameState.player1,
        gameState.player2,
        getLocalPlayerId(),
        gameDataService.getEffectiveStats.bind(gameDataService)
      );

      // Proceed to effect selection
      setAdditionalCostState({
        phase: 'select_effect',
        card: additionalCostState.card,
        costSelection: updatedCostSelection,
        validTargets: effectTargets
      });
      additionalCostFlowInProgress.current = true;
      setValidCardTargets(effectTargets);

      // Show cost reminder arrow for Forced Repositioning
      const arrowState = calculateCostReminderArrow(additionalCostState, lane, droneRefs.current, gameAreaRef.current);
      if (arrowState) {
        setCostReminderArrowState(arrowState);
        debugLog('ADDITIONAL_COST_UI', '🏹 Cost reminder arrow shown', arrowState);
      }

      return;
    }

    // --- 9.1.7 HANDLE SECONDARY TARGETING LANE SELECTION ---
    if (secondaryTargetingState?.phase === 'secondary' &&
        secondaryTargetingState.card?.secondaryTargeting?.type === 'LANE') {
      const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
      if (validCardTargets.some(t => t.id === lane && t.owner === owner)) {
        debugLog('SECONDARY_TARGETING', '🎯 Secondary lane target selected', {
          lane,
          owner,
          cardName: secondaryTargetingState.card.name,
          primaryTargetId: secondaryTargetingState.primaryTarget?.id
        });

        processActionWithGuestRouting('secondaryTargetingCardPlay', {
          card: secondaryTargetingState.card,
          primaryTarget: secondaryTargetingState.primaryTarget,
          primaryLane: secondaryTargetingState.primaryLane,
          secondaryTarget: { id: lane, owner },
          secondaryLane: lane,
          playerId: getLocalPlayerId()
        });

        cancelSecondaryTargeting();
        return;
      }
    }

    // --- 9.2 HANDLE SINGLE-MOVE MODE LANE CLICKS ---
    if (singleMoveMode && isPlayer && validCardTargets.some(t => t.id === lane)) {
      // CHECKPOINT 5: Lane Clicked/Selected
      debugLog('SINGLE_MOVE_FLOW', '🖱️ CHECKPOINT 5: Lane selected for move', {
        lane: lane,
        currentSingleMoveMode: singleMoveMode,
        droneId: singleMoveMode.droneId,
        owner: singleMoveMode.owner,
        from: singleMoveMode.sourceLane,
        to: lane,
        cardName: singleMoveMode.card.name
      });

      debugLog('SINGLE_MOVE_MODE', '🎯 Lane selected for single-move', {
        cardName: singleMoveMode.card.name,
        droneId: singleMoveMode.droneId,
        from: singleMoveMode.sourceLane,
        to: lane
      });

      // CHECKPOINT 6: Setting moveConfirmation State
      const smClickDrone = Object.values(localPlayerState.dronesOnBoard).flat().find(d => d.id === singleMoveMode.droneId);
      const newMoveConfirmation = {
        droneId: singleMoveMode.droneId,
        owner: singleMoveMode.owner,
        from: singleMoveMode.sourceLane,
        to: lane,
        card: singleMoveMode.card,
        isSnared: smClickDrone?.isSnared || false
      };

      debugLog('SINGLE_MOVE_FLOW', '📝 CHECKPOINT 6: Setting moveConfirmation state', {
        moveConfirmation: newMoveConfirmation,
        droneId: newMoveConfirmation.droneId,
        owner: newMoveConfirmation.owner,
        from: newMoveConfirmation.from,
        to: newMoveConfirmation.to,
        cardName: newMoveConfirmation.card.name,
        hasAllRequiredFields: !!(newMoveConfirmation.droneId && newMoveConfirmation.owner && newMoveConfirmation.from && newMoveConfirmation.to)
      });

      setMoveConfirmation(newMoveConfirmation);

      // Clear single-move mode state
      setSingleMoveMode(null);
      setSelectedDrone(null);

      return;
    }

    if (multiSelectState && isPlayer && validCardTargets.some(t => t.id === lane)) {
        const { phase, sourceLane, selectedDrones } = multiSelectState;

        debugLog('CARD_PLAY', '🔵 MULTI_MOVE: Lane clicked during multiSelectState');
        debugLog('CARD_PLAY', '   Phase:', phase);
        debugLog('CARD_PLAY', '   Lane:', lane);
        debugLog('CARD_PLAY', '   Source lane:', sourceLane);
        debugLog('CARD_PLAY', '   Selected drones:', selectedDrones?.length);

        if (phase === 'select_source_lane') {
            debugLog('CARD_PLAY', '   ✅ Transitioning to select_drones phase with source lane:', lane);
            setMultiSelectState(prev => ({ ...prev, phase: 'select_drones', sourceLane: lane }));
            return;
        }

        if (phase === 'select_destination') {
            debugLog('ADDITIONAL_COST_EFFECT_FLOW', '🎯 Lane click during select_destination phase', {
                lane,
                sourceLane,
                card: multiSelectState.card?.name,
                selectedDrone: multiSelectState.selectedDrone?.name,
                selectedDroneId: multiSelectState.selectedDrone?.id,
                hasAdditionalCostContext: !!additionalCostSelectionContext
            });

            // Handle single-move destination selection (for additional cost effects)
            debugLog('CARD_PLAY', '   ✅ Destination lane selected (single-move), calling resolveSingleMove');
            debugLog('CARD_PLAY', '   Card:', multiSelectState.card?.name);
            debugLog('CARD_PLAY', '   From lane:', sourceLane, '→ To lane:', lane);

            const selectedDrone = multiSelectState.selectedDrone;

            debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🔵 Calling resolveSingleMove', {
                cardId: multiSelectState.card?.id,
                droneId: selectedDrone.id,
                droneOwner: selectedDrone.owner || getLocalPlayerId(),
                fromLane: sourceLane,
                toLane: lane
            });

            resolveSingleMove(
                multiSelectState.card,
                selectedDrone.id,
                selectedDrone.owner || getLocalPlayerId(),
                sourceLane,
                lane
            );

            debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ resolveSingleMove called - lane click handler complete');
            return;
        }

        if (phase === 'select_destination_lane') {
            debugLog('CARD_PLAY', '   ✅ Destination lane selected, calling resolveMultiMove');
            debugLog('CARD_PLAY', '   Card:', multiSelectState.card?.name);
            debugLog('CARD_PLAY', '   From lane:', sourceLane, '→ To lane:', lane);
            resolveMultiMove(multiSelectState.card, selectedDrones, sourceLane, lane);
            return;
        }
    }

    if (selectedCard && selectedCard.targeting.type === 'LANE') {
        const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
        if (validCardTargets.some(t => t.id === lane && t.owner === owner)) {
            setCardConfirmation({ card: selectedCard, target: { id: lane, owner }});
            return;
        }
    }

    debugLog('BUTTON_CLICKS', '🔍 onLaneClick LANE SELECTION CHECK', {
      timestamp: performance.now(),
      location: 'handleLaneClick - checking if should cancel',
      lane: lane,
      isPlayer: isPlayer,
      hasSelectedCard: !!selectedCard,
      refValue: multiSelectFlowInProgress.current,
      willCallCancel: !!selectedCard && !multiSelectFlowInProgress.current
    });

    // Don't cancel if in single-move mode or additional cost flow
    if (selectedCard && !multiSelectFlowInProgress.current && !singleMoveMode && !additionalCostFlowInProgress.current) {
      cancelCardSelection('lane-click-cleanup');
      return;
    }

    if (abilityMode) {
      cancelAbilityMode();
      return;
    }

  };

  // --- handleCardClick ---

  const handleCardClick = async (card) => {
    const localPlayerId = getLocalPlayerId();
    const myTurn = isMyTurn();
    const playerPassed = passInfo[`${localPlayerId}Passed`];

    debugLog('CARD_PLAY', `🎯 handleCardClick called: ${card.name}`, {
      cardId: card.id,
      cardCost: card.cost,
      gameMode: gameState.gameMode,
      localPlayerId,
      turnPhase,
      isMyTurn: myTurn,
      playerPassed,
      playerEnergy: localPlayerState.energy,
      hasEnoughEnergy: localPlayerState.energy >= card.cost,
      additionalCostPhase: additionalCostState?.phase
    });

    if (turnPhase !== 'action') {
      debugLog('CARD_PLAY', `🚫 Card click rejected - wrong phase: ${turnPhase}`, { card: card.name });
      return;
    }

    // Handle cost selection clicks (card-in-hand as cost)
    if (additionalCostState?.phase === 'select_cost') {
      // Verify this card is a valid cost target
      const isValidCostTarget = additionalCostState.validTargets?.some(
        t => t.instanceId === card.instanceId
      );

      if (isValidCostTarget) {
        debugLog('ADDITIONAL_COST', '🎯 Cost card selected from hand', {
          selectedCard: card.name,
          cardInstanceId: card.instanceId,
          costingCard: additionalCostState.card?.name
        });

        const costSelection = {
          type: additionalCostState.card.additionalCost.type,
          card: card  // The card being discarded as cost
        };

        // Calculate valid effect targets
        const effectTargets = calculateEffectTargetsWithCostContext(
          additionalCostState.card,  // The card being played (e.g., Sacrifice for Power)
          costSelection,
          gameState.player1,
          gameState.player2,
          getLocalPlayerId(),
          gameDataService.getEffectiveStats.bind(gameDataService)
        );

        setAdditionalCostState({
          ...additionalCostState,
          phase: 'select_effect',
          costSelection
        });
        additionalCostFlowInProgress.current = true;
        setValidCardTargets(effectTargets);
        return;
      } else {
        debugLog('ADDITIONAL_COST', '🚫 Card is not a valid cost target', {
          card: card.name,
          cardInstanceId: card.instanceId,
          validTargetIds: additionalCostState.validTargets?.map(t => t.instanceId)
        });
        return;
      }
    }

    // Action cards (non-Drone) use drag-only during action phase
    if (card.type !== 'Drone') {
      debugLog('CARD_PLAY', `🚫 Card click rejected - action cards use drag-only`, { card: card.name });
      return;
    }

    if (isActionInProgress()) {
      debugLog('CARD_PLAY', `🚫 Card click rejected - action already in progress`, { card: card.name });
      return;
    }

    if (!myTurn) {
      debugLog('CARD_PLAY', `🚫 Card click rejected - not player's turn`, {
        card: card.name,
        localPlayerId,
        currentPlayer: gameState.currentPlayer
      });
      return;
    }

    if (playerPassed) {
      debugLog('CARD_PLAY', `🚫 Card click rejected - player has passed`, { card: card.name });
      return;
    }

    if (localPlayerState.energy < card.cost) {
      debugLog('CARD_PLAY', `🚫 Card click rejected - not enough energy`, {
        card: card.name,
        cardCost: card.cost,
        playerEnergy: localPlayerState.energy
      });
      return;
    }

    // Check momentum cost for cards that require it (e.g., lane-control cards)
    if (card.momentumCost && (localPlayerState.momentum || 0) < card.momentumCost) {
      debugLog('CARD_PLAY', `🚫 Card click rejected - not enough momentum`, {
        card: card.name,
        momentumCost: card.momentumCost,
        playerMomentum: localPlayerState.momentum || 0
      });
      return;
    }

    // Movement cards - Set up UI state directly (don't call ActionProcessor until selection complete)
    // MULTI_MOVE cards — click-based multi-select setup (3+ step flow stays)
    // SINGLE_MOVE cards now use DnD + secondaryTargeting, so they fall through to generic selection
    if (card.effect.type === 'MULTI_MOVE') {
      debugLog('CARD_PLAY', `✅ MULTI_MOVE card - setting up UI: ${card.name}`);

      if (multiSelectState && multiSelectState.card.instanceId === card.instanceId) {
        debugLog('BUTTON_CLICKS', '🔍 cancelCardSelection called from handleCardClick - Toggle off movement card', {
          timestamp: performance.now(),
          refValue: multiSelectFlowInProgress.current,
          cardName: card.name,
          cardInstanceId: card.instanceId
        });
        cancelCardSelection('card-click-toggle-off');
      } else {
        cancelAllActions();
        setSelectedCard(card);
        setMultiSelectState({
          card: card,
          phase: 'select_source_lane',
          selectedDrones: [],
          sourceLane: null,
          maxDrones: card.effect.count || 3,
          actingPlayerId: getLocalPlayerId()
        });
      }
      return;
    }

    // Deselect if clicking the already-selected card
    if (selectedCard?.instanceId === card.instanceId) {
      debugLog('CARD_PLAY', `✅ Card deselected: ${card.name}`);
      debugLog('BUTTON_CLICKS', '🔍 cancelCardSelection called from handleCardClick - Deselect card', {
        timestamp: performance.now(),
        refValue: multiSelectFlowInProgress.current,
        cardName: card.name,
        cardInstanceId: card.instanceId
      });
      cancelCardSelection('card-click-deselect');
    } else {
        // All other cards: click selects (shows valid targets), DnD plays
        // Covers: DRONE, LANE, SHIP_SECTION, NONE (upgrades, System Sabotage, Purge Protocol), SINGLE_MOVE
        if (!card.targeting) {
            debugLog('CARD_PLAY', `✅ Non-targeted card - showing confirmation: ${card.name}`);
            cancelAllActions();
            setCardConfirmation({ card, target: null });
        } else {
            debugLog('CARD_PLAY', `✅ Card selected - drag to play: ${card.name}`, { targeting: card.targeting });
            cancelAllActions();
            setSelectedCard(card);
        }
    }
  };

  return {
    handleToggleDroneSelection,
    handleAbilityIconClick,
    handleShipAbilityClick,
    handleTargetClick,
    handleTokenClick,
    handleLaneClick,
    handleCardClick,
  };
}
