// --- useShieldAllocation Hook ---
// Manages all shield allocation and reallocation state and handlers.
// Covers both round-start simultaneous allocation (allocateShields phase)
// and action-phase sequential reallocation (ship ability).

import { useState, useEffect, useMemo, useCallback } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import { calculateRoundStartReset } from '../logic/shields/ShieldResetUtils.js';
import SoundManager from '../managers/SoundManager.js';

/**
 * @param {Object} deps - External dependencies from App.jsx
 * @param {Object} deps.gameState - Current game state
 * @param {Object} deps.localPlayerState - Local player's state
 * @param {Object} deps.localPlacedSections - Local player's placed ship sections
 * @param {Object} deps.gameDataService - Game data service instance
 * @param {Function} deps.getLocalPlayerId - Returns local player ID
 * @param {Function} deps.submitAction - Action routing function
 * @param {Function} deps.setShipAbilityConfirmation - Shows ship ability confirmation modal
 */
const useShieldAllocation = ({
  gameState,
  localPlayerState,
  localPlacedSections,
  gameDataService,
  getLocalPlayerId,
  submitAction,
  setShipAbilityConfirmation,
}) => {
  const { turnPhase, shieldsToAllocate } = gameState;

  // --- Shield reallocation state ---
  const [reallocationPhase, setReallocationPhase] = useState(null); // 'removing' | 'adding' | null
  const [shieldsToAdd, setShieldsToAdd] = useState(0);
  const [shieldsToRemove, setShieldsToRemove] = useState(0);
  const [originalShieldAllocation, setOriginalShieldAllocation] = useState(null);
  const [initialShieldAllocation, setInitialShieldAllocation] = useState(null);
  const [reallocationAbility, setReallocationAbility] = useState(null);
  const [pendingShieldChanges, setPendingShieldChanges] = useState({});
  const [postRemovalPendingChanges, setPostRemovalPendingChanges] = useState({});

  // --- Pending shield allocation state (privacy: keep allocations local until confirmed) ---
  const [pendingShieldAllocations, setPendingShieldAllocations] = useState({});
  const [pendingShieldsRemaining, setPendingShieldsRemaining] = useState(null);

  // --- Effects ---

  // Initialize pending shield allocations when entering allocateShields phase
  useEffect(() => {
    if (turnPhase === 'allocateShields' && shieldsToAllocate > 0) {
      const currentAllocations = {};
      if (localPlayerState?.shipSections) {
        Object.entries(localPlayerState.shipSections).forEach(([sectionName, section]) => {
          if (section.allocatedShields > 0) {
            currentAllocations[sectionName] = section.allocatedShields;
          }
        });
      }
      setPendingShieldAllocations(currentAllocations);
      setInitialShieldAllocation(currentAllocations);
      setPendingShieldsRemaining(shieldsToAllocate);
      debugLog('SHIELD_CLICKS', '🆕 Initialized pending shield allocations', {
        currentAllocations,
        shieldsToAllocate
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- localPlayerState excluded:
    // effect should only fire on phase entry, not on every state update
  }, [turnPhase, shieldsToAllocate]);

  // --- Derived state ---

  const canAllocateMoreShields = useMemo(() => {
    if (!localPlayerState?.shipSections) return false;
    return Object.keys(localPlayerState.shipSections).some(sectionName =>
      localPlayerState.shipSections[sectionName].allocatedShields < gameDataService.getEffectiveSectionMaxShields(sectionName, localPlayerState, localPlacedSections)
    );
  }, [localPlayerState?.shipSections, localPlacedSections, gameDataService]);

  // --- Handlers ---

  const handleResetShields = useCallback(async () => {
    const snapshot = initialShieldAllocation || {};
    const { newPending, newRemaining } = calculateRoundStartReset(snapshot, shieldsToAllocate);

    setPendingShieldAllocations(newPending);
    setPendingShieldsRemaining(newRemaining);

    debugLog('SHIELD_CLICKS', '🔄 Reset pending shield allocations to initial snapshot', {
      initialSnapshot: snapshot,
      newPending,
      newRemaining
    });
  }, [shieldsToAllocate, initialShieldAllocation]);

  const handleConfirmShields = useCallback(async () => {
    debugLog('COMMITMENTS', '🏁 handleConfirmShields called');
    debugLog('SHIELD_CLICKS', '🔵 Confirm Shields button clicked');

    const result = await submitAction('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'allocateShields',
      actionData: {
        committed: true,
        shieldAllocations: pendingShieldAllocations
      }
    });

    debugLog('COMMITMENTS', '🏁 Shield allocation commitment result:', {
      hasData: !!result.data,
      bothPlayersComplete: result.data?.bothPlayersComplete,
      shieldAllocations: pendingShieldAllocations,
      fullResult: result
    });
    debugLog('SHIELD_CLICKS', '📥 Commitment result:', result);
  }, [submitAction, getLocalPlayerId, pendingShieldAllocations]);

  const handleAllocateShield = async (sectionName) => {
    debugLog('SHIELD_CLICKS', `🟢 handleAllocateShield called`, {
      sectionName,
      turnPhase,
      localPlayerId: getLocalPlayerId(),
      pendingShieldsRemaining,
      currentPhaseMatch: turnPhase === 'allocateShields'
    });

    if (turnPhase === 'allocateShields') {
      if (pendingShieldsRemaining <= 0) {
        debugLog('SHIELD_CLICKS', '❌ No shields remaining to allocate');
        return;
      }

      const maxShields = gameDataService.getEffectiveSectionMaxShields(sectionName, localPlayerState, localPlacedSections);
      const currentPending = pendingShieldAllocations[sectionName] || 0;

      if (currentPending >= maxShields) {
        debugLog('SHIELD_CLICKS', `❌ Section ${sectionName} already at max shields (${maxShields})`);
        return;
      }

      setPendingShieldAllocations(prev => ({
        ...prev,
        [sectionName]: currentPending + 1
      }));
      setPendingShieldsRemaining(prev => prev - 1);
      SoundManager.getInstance().play('shield_allocate');

      debugLog('SHIELD_CLICKS', `✅ Added shield to ${sectionName} in pending state`, {
        newPending: currentPending + 1,
        remainingShields: pendingShieldsRemaining - 1
      });
    } else {
      debugLog('SHIELD_CLICKS', `🔄 Using reallocation path instead`);
      await submitAction('reallocateShields', {
        action: 'add',
        sectionName: sectionName,
        playerId: getLocalPlayerId()
      });
    }
  };

  const handleRemoveShield = async (sectionName) => {
    if (shieldsToRemove <= 0) return;

    const section = localPlayerState.shipSections[sectionName];
    const currentPendingDelta = pendingShieldChanges[sectionName] || 0;
    const effectiveAllocated = section.allocatedShields + currentPendingDelta;
    if (effectiveAllocated <= 0) return;

    const result = await submitAction('reallocateShieldsAbility', {
      action: 'remove',
      sectionName: sectionName,
      playerId: getLocalPlayerId()
    });

    if (result.success) {
      SoundManager.getInstance().play('shield_allocate');
      setPendingShieldChanges(prev => ({
        ...prev,
        [sectionName]: (prev[sectionName] || 0) - 1
      }));
      setShieldsToRemove(prev => prev - 1);
      setShieldsToAdd(prev => prev + 1);
    }
  };

  const handleAddShield = async (sectionName) => {
    if (shieldsToAdd <= 0) return;

    const result = await submitAction('reallocateShieldsAbility', {
      action: 'add',
      sectionName: sectionName,
      playerId: getLocalPlayerId()
    });

    if (result.success) {
      SoundManager.getInstance().play('shield_allocate');
      setPendingShieldChanges(prev => ({
        ...prev,
        [sectionName]: (prev[sectionName] || 0) + 1
      }));
      setShieldsToAdd(prev => prev - 1);
    }
  };

  const handleContinueToAddPhase = () => {
    setPostRemovalPendingChanges({ ...pendingShieldChanges });
    setReallocationPhase('adding');
  };

  const handleResetReallocation = () => {
    if (reallocationPhase === 'removing') {
      setPendingShieldChanges({});
      setShieldsToRemove(reallocationAbility.ability.effect.value.maxShields);
      setShieldsToAdd(0);
    } else if (reallocationPhase === 'adding') {
      setPendingShieldChanges({ ...postRemovalPendingChanges });
      const removedCount = Object.values(postRemovalPendingChanges)
        .filter(delta => delta < 0)
        .reduce((sum, delta) => sum + Math.abs(delta), 0);
      setShieldsToAdd(removedCount);
    }
  };

  const handleCancelReallocation = () => {
    clearReallocationState();
  };

  const handleConfirmReallocation = () => {
    setShipAbilityConfirmation({
      ability: reallocationAbility.ability,
      sectionName: reallocationAbility.sectionName,
      target: null,
      abilityType: 'reallocateShields'
    });
  };

  const handleShipSectionClick = (sectionName) => {
    debugLog('SHIELD_CLICKS', `🔵 handleShipSectionClick called`, {
      sectionName,
      turnPhase,
      reallocationPhase,
      shieldsToAllocate,
      willHandleReallocation: !!reallocationPhase,
      willHandleAllocation: turnPhase === 'allocateShields'
    });

    if (reallocationPhase) {
      debugLog('SHIELD_CLICKS', `🔄 Routing to reallocation handler (${reallocationPhase})`);
      if (reallocationPhase === 'removing') {
        handleRemoveShield(sectionName);
      } else if (reallocationPhase === 'adding') {
        handleAddShield(sectionName);
      }
      return;
    }

    if (turnPhase === 'allocateShields') {
      debugLog('SHIELD_CLICKS', `🛡️ Routing to handleAllocateShield`);
      handleAllocateShield(sectionName);
    } else {
      debugLog('SHIELD_CLICKS', `⚠️ Click ignored - not in allocateShields phase or reallocation mode`);
    }
  };

  const handleResetShieldAllocation = async () => {
    await submitAction('resetShieldAllocation', {
      playerId: getLocalPlayerId()
    });
  };

  const handleEndAllocation = async () => {
    debugLog('COMMITMENTS', '🏁 handleEndAllocation called');

    const result = await submitAction('endShieldAllocation', {
      playerId: getLocalPlayerId()
    });

    debugLog('COMMITMENTS', '🏁 endShieldAllocation result:', {
      hasData: !!result.data,
      bothPlayersComplete: result.data?.bothPlayersComplete,
      fullResult: result
    });

    debugLog('COMMITMENTS', result.data?.bothPlayersComplete
      ? '✅ Both players complete'
      : '⏳ Waiting for opponent — useWaitingForOpponent will handle overlay');

  };

  const handleShieldAction = (actionType, payload) => {
    const phase = gameState.turnPhase;

    debugLog('ENERGY', `🛡️ handleShieldAction: ${actionType} in phase ${phase}`);

    if (phase === 'allocateShields') {
      debugLog('ENERGY', `🛡️ Routing to round start shield handling (simultaneous)`);
      handleRoundStartShieldAction(actionType, payload);
    } else if (phase === 'action') {
      debugLog('ENERGY', `🛡️ Routing to action phase shield handling (sequential)`);
      submitAction(actionType, payload);
    } else {
      debugLog('ENERGY', '⚠️ Shield action not valid:', { actionType, phase });
    }
  };

  const handleRoundStartShieldAction = async (actionType, payload) => {
    const { turnPhase } = gameState;

    if (turnPhase !== 'allocateShields') {
      debugLog('ENERGY', '⚠️ Round start shield action called during wrong phase:', { actionType, turnPhase });
      return;
    }

    debugLog('ENERGY', `🛡️⚡ Processing round start shield action: ${actionType}`);

    try {
      switch (actionType) {
        case 'allocateShield':
          if (payload.sectionName) {
            handleAllocateShield(payload.sectionName);
          } else {
            debugLog('ENERGY', '❌ allocateShield action missing sectionName in payload');
          }
          break;

        case 'resetShieldAllocation':
          await handleResetShieldAllocation();
          break;

        case 'endShieldAllocation':
          await handleEndAllocation();
          break;

        default:
          debugLog('ENERGY', '⚠️ Unknown round start shield action:', actionType);
          break;
      }
    } catch (error) {
      debugLog('ENERGY', '❌ Error processing round start shield action:', { actionType, error });
    }
  };

  // --- Expose state setters needed by App.jsx for modal onConfirm callbacks ---
  // These will be consumed by the reallocateShields completion flow (Step 13.5)
  const clearReallocationState = () => {
    setReallocationPhase(null);
    setShieldsToRemove(0);
    setShieldsToAdd(0);
    setOriginalShieldAllocation(null);
    setReallocationAbility(null);
    setPendingShieldChanges({});
    setPostRemovalPendingChanges({});
  };

  return {
    // State (read by App.jsx for prop passing and modal callbacks)
    reallocationPhase,
    shieldsToAdd,
    shieldsToRemove,
    pendingShieldAllocations,
    pendingShieldsRemaining,
    pendingShieldChanges,
    canAllocateMoreShields,

    // State setters needed by App.jsx for reallocation initiation
    setReallocationPhase,
    setShieldsToRemove,
    setShieldsToAdd,
    setOriginalShieldAllocation,
    setReallocationAbility,

    // Handlers (passed as props to child components)
    handleResetShields,
    handleConfirmShields,
    handleAllocateShield,
    handleRemoveShield,
    handleAddShield,
    handleContinueToAddPhase,
    handleResetReallocation,
    handleCancelReallocation,
    handleConfirmReallocation,
    handleShipSectionClick,
    handleResetShieldAllocation,
    handleEndAllocation,
    handleShieldAction,
    handleRoundStartShieldAction,

    // Cleanup function for modal onConfirm flow
    clearReallocationState,
  };
};

export default useShieldAllocation;
