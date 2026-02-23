import fullCardCollection from '../data/cardData.js';
import ExtractionController from '../logic/singlePlayer/ExtractionController.js';
import { forceWinCombat } from '../logic/game/ForceWin.js';
import tacticalMapStateManager from '../managers/TacticalMapStateManager.js';
import aiPhaseProcessor from '../managers/AIPhaseProcessor.js';
import SeededRandom from '../utils/seededRandom.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * Consolidates game lifecycle handlers (reset, exit, pass, mandatory actions,
 * discard/removal phases, debug utilities) from App.jsx.
 * All functions are plain (not useCallback) — matches original render-per-cycle behavior.
 */
export default function useGameLifecycle({
  // --- Game state ---
  gameState,
  localPlayerState,
  opponentPlayerState,
  turnPhase,
  passInfo,
  mandatoryAction,
  excessCards,
  excessDrones,

  // --- Computed values ---
  totalOpponentPlayerDrones,
  opponentPlayerEffectiveStats,
  opponentPlacedSections,
  getEffectiveShipStats,

  // --- State setters ---
  setSelectedDrone,
  setModalContent,
  setAbilityMode,
  setValidAbilityTargets,
  setMandatoryAction,
  setShowMandatoryActionModal,
  setConfirmationModal,
  setSelectedCard,
  setValidCardTargets,
  setCardConfirmation,
  setShowWinnerModal,
  setShowAbandonRunModal,
  setShowAddCardModal,
  setOptionalDiscardCount,
  setWaitingForPlayerPhase,
  setDeck,
  setCardToView,

  // --- Functions ---
  processActionWithGuestRouting,
  getLocalPlayerId,
  getOpponentPlayerId,
  cancelAllActions,
  resetGame,
  endGame,

  // --- Refs ---
  isResolvingAttackRef,

  // --- External ---
  gameStateManager,
  phaseAnimationQueue,
  gameLog,
  appState,
}) {

  // --- handleReset ---

  const handleReset = () => {
    resetGame();
    isResolvingAttackRef.current = false;
    setSelectedDrone(null);
    setModalContent(null);
    setAbilityMode(null);
    setValidAbilityTargets([]);
    setMandatoryAction(null);
    setShowMandatoryActionModal(false);
    setConfirmationModal(null);
    setSelectedCard(null);
    setValidCardTargets([]);
    setCardConfirmation(null);
    setShowWinnerModal(false);
  };

  // --- handleExitGame ---

  const handleExitGame = () => {
    // Check if in Extract mode (single-player run active)
    if (tacticalMapStateManager.isRunActive()) {
      setShowAbandonRunModal(true);
      return;
    }

    // Not in Extract mode - exit normally
    if (gameState.gameMode === 'local') {
      aiPhaseProcessor.cleanup();
    }

    endGame();
    isResolvingAttackRef.current = false;
    setSelectedDrone(null);
    setModalContent(null);
    setAbilityMode(null);
    setValidAbilityTargets([]);
    setMandatoryAction(null);
    setShowMandatoryActionModal(false);
    setConfirmationModal(null);
    setSelectedCard(null);
    setValidCardTargets([]);
    setCardConfirmation(null);
    setShowWinnerModal(false);
  };

  // --- handleConfirmAbandonRun ---

  const handleConfirmAbandonRun = () => {
    debugLog('MODE_TRANSITION', '=== MODE: current -> failedRunScreen (abandon via modal) ===', {
      trigger: 'user_action',
      source: 'App.handleConfirmAbandonRun',
      detail: 'User confirmed abandon in global abandon modal',
      currentAppState: appState
    });
    setShowAbandonRunModal(false);
    ExtractionController.abandonRun();
  };

  // --- handleOpenAddCardModal ---

  const handleOpenAddCardModal = () => {
    setShowAddCardModal(true);
  };

  // --- handleForceWin ---

  const handleForceWin = () => {
    forceWinCombat();
  };

  // --- handleAddCardsToHand ---

  const handleAddCardsToHand = async ({ playerId, selectedCards }) => {
    debugLog('DEBUG_TOOLS', '🎴 Adding cards to hand', { playerId, selectedCards });

    const cardInstances = [];
    Object.entries(selectedCards).forEach(([cardId, quantity]) => {
      const cardTemplate = fullCardCollection.find(c => c.id === cardId);
      if (!cardTemplate) {
        debugLog('DEBUG_TOOLS', 'Card template not found for ID:', cardId);
        return;
      }

      for (let i = 0; i < quantity; i++) {
        const instanceId = `${playerId}-${cardId}-${Date.now()}-${Math.random()}`;
        cardInstances.push({ ...cardTemplate, instanceId });
      }
    });

    await processActionWithGuestRouting('debugAddCardsToHand', { playerId, cardInstances });
    debugLog('DEBUG_TOOLS', '✅ Cards added through ActionProcessor');
  };

  // --- handleImportDeck ---

  const handleImportDeck = (deckCode) => {
    try {
      const newDeck = {};
      const baseCardCounts = {};

      const entries = deckCode.split(',').filter(Boolean);
      for (const entry of entries) {
        const [cardId, quantityStr] = entry.split(':');
        const quantity = parseInt(quantityStr, 10);

        const cardTemplate = fullCardCollection.find(c => c.id === cardId);
        if (!cardTemplate || isNaN(quantity) || quantity <= 0 || quantity > cardTemplate.maxInDeck) {
          throw new Error(`Invalid entry for card "${cardId}".`);
        }

        newDeck[cardId] = quantity;

        const baseId = cardTemplate.baseCardId;
        baseCardCounts[baseId] = (baseCardCounts[baseId] || 0) + quantity;
      }

      for (const baseId in baseCardCounts) {
        const totalQuantity = baseCardCounts[baseId];
        const baseCard = fullCardCollection.find(c => c.baseCardId === baseId);
        if (totalQuantity > baseCard.maxInDeck) {
          throw new Error(`Exceeded max limit for "${baseCard.name}". Total is ${totalQuantity}, max is ${baseCard.maxInDeck}.`);
        }
      }

      setDeck(newDeck);
      return { success: true };

    } catch (error) {
      debugLog('DEBUG_TOOLS', '❌ Deck import failed:', error);
      return { success: false, message: error.message };
    }
  };

  // --- handlePlayerPass ---

  const handlePlayerPass = async () => {
    if (passInfo[`${getLocalPlayerId()}Passed`]) return;

    cancelAllActions();

    await processActionWithGuestRouting('playerPass', {
      playerId: getLocalPlayerId(),
      playerName: localPlayerState.name,
      turnPhase: turnPhase,
      passInfo: passInfo,
      opponentPlayerId: getOpponentPlayerId()
    });
  };

  // --- handleConfirmMandatoryDiscard ---

  const handleConfirmMandatoryDiscard = async (card) => {
    const isAbilityBased = mandatoryAction?.fromAbility;
    const currentCount = isAbilityBased ? mandatoryAction.count : excessCards;

    if (!isAbilityBased && excessCards <= 0) {
      debugLog('DISCARD', '🚫 Cannot discard more cards - already at hand limit');
      setConfirmationModal(null);
      return;
    }

    const newCount = currentCount - 1;
    const isLastDiscard = newCount <= 0;

    const discardPayload = {
        playerId: getLocalPlayerId(),
        cardsToDiscard: [card],
        isMandatory: true
    };

    if (isLastDiscard && isAbilityBased && mandatoryAction.abilityName) {
        discardPayload.abilityMetadata = {
            abilityName: mandatoryAction.abilityName,
            sectionName: mandatoryAction.sectionName,
            actingPlayerId: mandatoryAction.actingPlayerId
        };
    }

    await processActionWithGuestRouting('optionalDiscard', discardPayload);
    setConfirmationModal(null);

    if (isLastDiscard && isAbilityBased) {
        setMandatoryAction(null);
        await processActionWithGuestRouting('recalculateComplete', {
            playerId: mandatoryAction.actingPlayerId
        });
    } else if (!isLastDiscard && isAbilityBased) {
        setMandatoryAction(prev => ({ ...prev, count: newCount }));
    }
  };

  // --- handleRoundStartDiscard ---

  const handleRoundStartDiscard = async (card) => {
    await processActionWithGuestRouting('optionalDiscard', {
      playerId: getLocalPlayerId(),
      cardsToDiscard: [card],
      isMandatory: false
    });
    setOptionalDiscardCount(prev => prev + 1);
    setConfirmationModal(null);
  };

  // --- handleRoundStartDraw ---

  const handleRoundStartDraw = async () => {
    debugLog('PHASE_TRANSITIONS', '[OPTIONAL DISCARD] Player completing optional discard phase');
    setOptionalDiscardCount(0);

    const result = await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'optionalDiscard',
      actionData: { completed: true }
    });

    const commitments = gameState.commitments || {};
    const phaseCommitments = commitments.optionalDiscard || {};
    const opponentCommitted = phaseCommitments[getOpponentPlayerId()]?.completed;

    if (!opponentCommitted) {
      debugLog('PHASE_TRANSITIONS', '✋ Opponent not committed yet, showing waiting overlay');
      setWaitingForPlayerPhase('optionalDiscard');
    } else {
      debugLog('PHASE_TRANSITIONS', '✅ Both players complete, no waiting overlay');
    }
  };

  // --- handleMandatoryDiscardContinue ---

  const handleMandatoryDiscardContinue = async () => {
    debugLog('PHASE_TRANSITIONS', '[MANDATORY DISCARD] Player completing mandatory discard phase');

    const result = await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'mandatoryDiscard',
      actionData: { completed: true }
    });

    const commitments = gameState.commitments || {};
    const phaseCommitments = commitments.mandatoryDiscard || {};
    const opponentCommitted = phaseCommitments[getOpponentPlayerId()]?.completed;

    if (!opponentCommitted) {
      debugLog('PHASE_TRANSITIONS', '✋ Opponent not committed yet, showing waiting overlay');

      if (phaseAnimationQueue) {
        const queueLength = phaseAnimationQueue.getQueueLength();
        const isPlaying = phaseAnimationQueue.isPlaying();

        if (queueLength > 0 || isPlaying) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', { queueLength, isPlaying });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('mandatoryDiscard');
            unsubscribe();
            debugLog('PHASE_TRANSITIONS', '✅ Announcement queue complete, showing waiting modal');
          });
        } else {
          setWaitingForPlayerPhase('mandatoryDiscard');
        }
      } else {
        setWaitingForPlayerPhase('mandatoryDiscard');
      }
    } else {
      debugLog('PHASE_TRANSITIONS', '✅ Both players complete, no waiting overlay');
    }
  };

  // --- handleMandatoryDroneRemovalContinue ---

  const handleMandatoryDroneRemovalContinue = async () => {
    debugLog('PHASE_TRANSITIONS', '[MANDATORY DRONE REMOVAL] Player completing mandatory drone removal phase');

    const result = await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'mandatoryDroneRemoval',
      actionData: { completed: true }
    });

    const commitments = gameState.commitments || {};
    const phaseCommitments = commitments.mandatoryDroneRemoval || {};
    const opponentCommitted = phaseCommitments[getOpponentPlayerId()]?.completed;

    if (!opponentCommitted) {
      debugLog('PHASE_TRANSITIONS', '✋ Opponent not committed yet, showing waiting overlay');

      if (phaseAnimationQueue) {
        const queueLength = phaseAnimationQueue.getQueueLength();
        const isPlaying = phaseAnimationQueue.isPlaying();

        if (queueLength > 0 || isPlaying) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', { queueLength, isPlaying });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('mandatoryDroneRemoval');
            unsubscribe();
            debugLog('PHASE_TRANSITIONS', '✅ Announcement queue complete, showing waiting modal');
          });
        } else {
          setWaitingForPlayerPhase('mandatoryDroneRemoval');
        }
      } else {
        setWaitingForPlayerPhase('mandatoryDroneRemoval');
      }
    } else {
      debugLog('PHASE_TRANSITIONS', '✅ Both players complete, no waiting overlay');
    }
  };

  // --- checkBothPlayersHandLimitComplete ---

  const checkBothPlayersHandLimitComplete = () => {
    const commitmentStatus = gameStateManager.actionProcessor?.getPhaseCommitmentStatus('optionalDiscard');
    debugLog('PHASE_TRANSITIONS', '[OPTIONAL DISCARD] Commitment status:', commitmentStatus);
    return commitmentStatus?.bothComplete || false;
  };

  // --- handleConfirmMandatoryDestroy ---

  const handleConfirmMandatoryDestroy = async (drone) => {
    const isAbilityBased = mandatoryAction?.fromAbility;
    const currentCount = isAbilityBased ? mandatoryAction.count : excessDrones;

    const result = await processActionWithGuestRouting('destroyDrone', {
      droneId: drone.id,
      playerId: getLocalPlayerId()
    });

    if (!result.success) {
      debugLog('COMBAT', '❌ Failed to destroy drone:', result.error);
      return;
    }

    const newCount = currentCount - 1;

    if (newCount <= 0) {
      const p2IsOver = totalOpponentPlayerDrones > opponentPlayerEffectiveStats.totals.cpuLimit;
      if (p2IsOver && gameState.gameMode === 'local') {
        const dronesToDestroyCount = Object.values(opponentPlayerState.dronesOnBoard).flat().filter(d => !d.isToken).length -
                                     getEffectiveShipStats(opponentPlayerState, opponentPlacedSections).totals.cpuLimit;

        for (let i = 0; i < dronesToDestroyCount; i++) {
          const allDrones = Object.entries(opponentPlayerState.dronesOnBoard)
            .flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));

          if (allDrones.length === 0) break;

          const lowestClass = Math.min(...allDrones.map(d => d.class));
          const candidates = allDrones.filter(d => d.class === lowestClass);
          const rng = SeededRandom.fromGameState(gameState);
          const droneToDestroy = rng.select(candidates);

          await processActionWithGuestRouting('destroyDrone', {
            droneId: droneToDestroy.id,
            playerId: getOpponentPlayerId()
          });
        }
      }

      if (isAbilityBased) {
        setMandatoryAction(null);
      }
    } else {
      if (isAbilityBased) {
        setMandatoryAction(prev => ({ ...prev, count: newCount }));
      }
    }

    setConfirmationModal(null);
  };

  // --- downloadLogAsCSV ---

  const downloadLogAsCSV = () => {
    if (gameLog.length === 0) {
      alert("The game log is empty.");
      return;
    }

    const headers = ['Round', 'TimestampUTC', 'Player', 'Action', 'Source', 'Target', 'Outcome', 'DebugSource'];

    const csvRows = gameLog.map(log => {
      const row = [
        log.round,
        log.player,
        log.actionType,
        log.source,
        log.target,
        log.outcome,
        log.debugSource || 'N/A'
      ];
      return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `drone-wars-log-${new Date().toISOString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- handleCardInfoClick ---

  const handleCardInfoClick = (cardName) => {
    const card = fullCardCollection.find(c => c.name === cardName);
    if (card) {
      setCardToView(card);
    } else {
      debugLog('DEBUG_TOOLS', '⚠️ Card not found in collection:', cardName);
    }
  };

  return {
    handleReset,
    handleExitGame,
    handleConfirmAbandonRun,
    handleOpenAddCardModal,
    handleForceWin,
    handleAddCardsToHand,
    handleImportDeck,
    handlePlayerPass,
    handleConfirmMandatoryDiscard,
    handleRoundStartDiscard,
    handleRoundStartDraw,
    handleMandatoryDiscardContinue,
    handleMandatoryDroneRemovalContinue,
    checkBothPlayersHandLimitComplete,
    handleConfirmMandatoryDestroy,
    downloadLogAsCSV,
    handleCardInfoClick,
  };
}
