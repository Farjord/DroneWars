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
  setCardConfirmation,
  setShipAbilityConfirmation,

  // --- From useCardSelection ---
  selectedCard,
  setSelectedCard,
  validCardTargets,
  validAbilityTargets,
  cancelCardSelection,
  // --- From useCardSelection — effect chain ---
  effectChainState,
  selectChainTarget,
  selectChainDestination,
  selectChainMultiTarget,

  // --- From useShieldAllocation ---
  shipAbilityMode,
  setShipAbilityMode,
  setReallocationPhase,
  setShieldsToRemove,
  setShieldsToAdd,
  setOriginalShieldAllocation,
  setReallocationAbility,

  // --- App.jsx functions ---
  cancelAllActions,
  cancelAbilityMode,
  isActionInProgress,
  isMyTurn,
  getLocalPlayerId,
  getOpponentPlayerId,
  resolveAbility,
  handleConfirmMandatoryDestroy,

  // --- External services ---
  gameEngine,
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

      // 1.5. Effect chain drone selection — route to chain target/destination/multi-target
      if (effectChainState && !effectChainState.complete) {
          const tokenOwnerChain = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
          // For multi-target, also check already-selected drones (for toggle-off)
          const isValidChainTarget = validCardTargets.some(t => t.id === token.id && t.owner === tokenOwnerChain)
              || (effectChainState.subPhase === 'multi-target' && effectChainState.pendingMultiTargets?.some(d => d.id === token.id));
          if (isValidChainTarget) {
              const droneState = tokenOwnerChain === getLocalPlayerId() ? localPlayerState : opponentPlayerState;
              const droneLane = Object.entries(droneState.dronesOnBoard).find(([_, drones]) =>
                  drones.some(d => d.id === token.id)
              )?.[0];
              debugLog('EFFECT_CHAIN', '🎯 Chain drone click', {
                  tokenId: token.id, droneLane, subPhase: effectChainState.subPhase,
              });
              if (effectChainState.subPhase === 'multi-target') {
                  selectChainMultiTarget(token, droneLane);
              } else {
                  selectChainTarget(token, droneLane);
              }
              return;
          }
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
      turnPhase: turnPhase,
      timestamp: Date.now()
    });

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

    // --- 9.1.2 HANDLE EFFECT CHAIN LANE/DRONE SELECTION ---
    if (effectChainState && !effectChainState.complete) {
      const laneOwner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
      const isValidChainLane = validCardTargets.some(t => t.id === lane && t.owner === laneOwner);
      if (isValidChainLane) {
        debugLog('EFFECT_CHAIN', '📍 Chain lane click', {
          lane, subPhase: effectChainState.subPhase, currentIndex: effectChainState.currentIndex,
        });
        if (effectChainState.subPhase === 'destination') {
          selectChainDestination(lane);
        } else {
          // Lane as target (for LANE-type targeting)
          selectChainTarget({ id: lane, owner: laneOwner, type: 'lane' }, lane);
        }
        return;
      }
    }

    if (selectedCard && selectedCard.effects[0].targeting.type === 'LANE') {
        const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
        if (validCardTargets.some(t => t.id === lane && t.owner === owner)) {
            setCardConfirmation({ card: selectedCard, target: { id: lane, owner }});
            return;
        }
    }

    if (selectedCard) {
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
    });

    if (turnPhase !== 'action') {
      debugLog('CARD_PLAY', `🚫 Card click rejected - wrong phase: ${turnPhase}`, { card: card.name });
      return;
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

    // Deselect if clicking the already-selected card
    if (selectedCard?.instanceId === card.instanceId) {
      debugLog('CARD_PLAY', `✅ Card deselected: ${card.name}`);
      cancelCardSelection('card-click-deselect');
    } else {
        // All other cards: click selects (shows valid targets), DnD plays
        // Covers: DRONE, LANE, SHIP_SECTION, NONE (upgrades, System Sabotage, Purge Protocol), SINGLE_MOVE
        if (!card.effects[0]?.targeting) {
            debugLog('CARD_PLAY', `✅ Non-targeted card - showing confirmation: ${card.name}`);
            cancelAllActions();
            setCardConfirmation({ card, target: null });
        } else {
            debugLog('CARD_PLAY', `✅ Card selected - drag to play: ${card.name}`, { targeting: card.effects[0].targeting });
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
