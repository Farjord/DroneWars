// ========================================
// DRONE WARS GAME - MAIN APPLICATION
// ========================================
// This is the main React component that manages the UI state and coordinates
// between the game logic engine and the user interface. All actual game rules
// and calculations are handled by gameEngine in gameLogic.js.

// ========================================
// SECTION 1: IMPORTS
// ========================================
// --- 1.1 REACT CORE IMPORTS ---
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// --- 1.2 UI COMPONENT IMPORTS ---
import SpaceBackground from './components/ui/SpaceBackground.jsx';
import StaticBackground from './components/ui/StaticBackground.jsx';
import GameHeader from './components/ui/GameHeader.jsx';
import GameBattlefield from './components/ui/GameBattlefield.jsx';
import GameFooter from './components/ui/GameFooter.jsx';
import HandView from './components/ui/footer/HandView.jsx';
import DronesView from './components/ui/footer/DronesView.jsx';
import FloatingCardControls from './components/ui/FloatingCardControls.jsx';
import ModalLayer from './components/ui/ModalLayer.jsx';
import InterceptedBadge from './components/ui/InterceptedBadge.jsx';
import FailedRunLoadingScreen from './components/ui/FailedRunLoadingScreen.jsx';

// --- 1.3 HOOK IMPORTS ---
import { useGameState } from './hooks/useGameState';
import { useGameData } from './hooks/useGameData';
import { useExplosions } from './hooks/useExplosions';
import { useAnimationSetup } from './hooks/useAnimationSetup';
import useShieldAllocation from './hooks/useShieldAllocation.js';
import useInterception from './hooks/useInterception.js';
import useMultiplayerSync from './hooks/useMultiplayerSync.js';
import useCardSelection from './hooks/useCardSelection.js';
import useDragMechanics from './hooks/useDragMechanics.js';
import useClickHandlers from './hooks/useClickHandlers.js';
import useGameLifecycle from './hooks/useGameLifecycle.js';
import useResolvers from './hooks/useResolvers.js';
import useActionRouting from './hooks/useActionRouting.js';

// --- 1.5 DATA/LOGIC IMPORTS ---
import { gameEngine } from './logic/gameLogic.js';
import ExtractionController from './logic/singlePlayer/ExtractionController.js';
import WinConditionChecker from './logic/game/WinConditionChecker.js';
import { BACKGROUNDS, DEFAULT_BACKGROUND, getBackgroundById } from './config/backgrounds.js';
import { LaneControlCalculator } from './logic/combat/LaneControlCalculator.js';

// --- 1.6 MANAGER/STATE IMPORTS ---
// Note: gameFlowManager is initialized in AppRouter and accessed via gameStateManager
import p2pManager from './network/P2PManager.js';
// ActionProcessor is created internally by GameStateManager

// --- 1.7 UTILITY IMPORTS ---
import { getElementCenter } from './utils/gameUtils.js';
import { debugLog } from './utils/debugLogger.js';
import { calculateAffectedDroneIds } from './logic/targeting/uiTargetingHelpers.js';
import DEV_CONFIG from './config/devConfig.js';

// --- 1.8 ANIMATION IMPORTS ---
import AnimationManager from './managers/AnimationManager.js';
import tacticalMapStateManager from './managers/TacticalMapStateManager.js';
import AnimationLayer from './components/ui/AnimationLayer.jsx';
import TargetingArrowLayer from './components/ui/TargetingArrowLayer.jsx';


// ========================================
// SECTION 2: MAIN COMPONENT DECLARATION
// ========================================

const App = ({ phaseAnimationQueue }) => {
  // ========================================
  // SECTION 3: HOOKS & STATE
  // ========================================
  // React hooks are grouped here for easy reference and proper ordering.
  // Custom hooks must come first, followed by local state, then refs.
  // This ensures proper dependency chain and prevents initialization errors.

  // --- 3.1 CUSTOM HOOKS ---
  // Game state and data management hooks provide the core interface
  // to the game engine and computed values through the manager layer
  const {
    gameState,
    isMyTurn,
    getLocalPlayerId,
    getOpponentPlayerId,
    isMultiplayer,
    getLocalPlayerState,
    getOpponentPlayerState,
    getLocalPlacedSections,
    getOpponentPlacedSections,
    updatePlayerState,
    setFirstPasserOfPreviousRound,
    addLogEntry,
    resetGame,
    endGame,
    setWinner,

    // Action processing
    processAction,
    isActionInProgress,
    getActionQueueLength,

    // Direct manager access
    gameStateManager,
    p2pManager
  } = useGameState();

  const { getEffectiveStats, getEffectiveShipStats, gameDataService } = useGameData();

  // --- 3.2 LOCAL UI STATE ---
  // All useState declarations consolidated here to eliminate scattered state.
  // Grouped by functionality: modal state, targeting state, game state, UI state.
  // This centralization makes state management more maintainable and predictable.
  // Debug and development flags
  const AI_HAND_DEBUG_MODE = DEV_CONFIG.features.aiHandDebug;

  // Modal state
  const [showAiHandModal, setShowAiHandModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [showAIStrategyModal, setShowAIStrategyModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAbandonRunModal, setShowAbandonRunModal] = useState(false);
  const [viewShipSectionModal, setViewShipSectionModal] = useState(null);
  const [flyingDrones, setFlyingDrones] = useState([]);
  const [flashEffects, setFlashEffects] = useState([]);
  const [healEffects, setHealEffects] = useState([]);
  const [cardVisuals, setCardVisuals] = useState([]);
  const [cardReveals, setCardReveals] = useState([]);
  const [shipAbilityReveals, setShipAbilityReveals] = useState([]);
  const [phaseAnnouncements, setPhaseAnnouncements] = useState([]);
  const [currentPhaseAnimation, setCurrentPhaseAnimation] = useState(null); // Current animation from queue
  const [isPhaseAnimationPlaying, setIsPhaseAnimationPlaying] = useState(false); // UI blocking state
  const [laserEffects, setLaserEffects] = useState([]);
  const [teleportEffects, setTeleportEffects] = useState([]);
  const [overflowProjectiles, setOverflowProjectiles] = useState([]);
  const [splashEffects, setSplashEffects] = useState([]);
  const [barrageImpacts, setBarrageImpacts] = useState([]);
  const [railgunTurrets, setRailgunTurrets] = useState([]);
  const [railgunBeams, setRailgunBeams] = useState([]);
  const [passNotifications, setPassNotifications] = useState([]);
  const [goAgainNotifications, setGoAgainNotifications] = useState([]);
  const [statusConsumptions, setStatusConsumptions] = useState([]);
  const [cardPlayWarning, setCardPlayWarning] = useState(null); // { id, reasons: string[] }
  const [animationBlocking, setAnimationBlocking] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [detailedDroneInfo, setDetailedDroneInfo] = useState(null); // { drone, isPlayer }
  const [cardToView, setCardToView] = useState(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isViewDeckModalOpen, setIsViewDeckModalOpen] = useState(false);
  const [isViewDiscardModalOpen, setIsViewDiscardModalOpen] = useState(false);
  const [showOpponentDronesModal, setShowOpponentDronesModal] = useState(false);

  // Player selection and targeting state
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);

  const [aiDecisionLogToShow, setAiDecisionLogToShow] = useState(null);

  // UI and visual effects state
  const [footerView, setFooterView] = useState('hand');
  const [isFooterOpen, setIsFooterOpen] = useState(true); // For classic footer only
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [recentlyHitDrones, setRecentlyHitDrones] = useState([]);

  const [deck, setDeck] = useState({});

  // Background selection state - persisted to localStorage
  const [selectedBackground, setSelectedBackground] = useState(() => {
    return localStorage.getItem('gameBackground') || DEFAULT_BACKGROUND;
  });

  // Ability state (not part of card selection hook — separate concern)
  const [abilityMode, setAbilityMode] = useState(null); // { drone, ability }
  const [shipAbilityMode, setShipAbilityMode] = useState(null); // { sectionName, ability }
  const [shipAbilityConfirmation, setShipAbilityConfirmation] = useState(null);

  // Mandatory actions and special phases state
  const [mandatoryAction, setMandatoryAction] = useState(null); // e.g., { type: 'discard'/'destroy', player: getLocalPlayerId(), count: X }
  const [showMandatoryActionModal, setShowMandatoryActionModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(null); // For confirm/cancel popups
  const [cardSelectionModal, setCardSelectionModal] = useState(null); // For search and draw card selection

  // Phase and turn tracking for modal management
  const [lastTurnPhase, setLastTurnPhase] = useState(null); // Track last phase to detect phase transitions
  const [optionalDiscardCount, setOptionalDiscardCount] = useState(0); // Track number of optional discards during optionalDiscard phase

  // Lane control state for lane-control cards
  const [laneControl, setLaneControl] = useState({ lane1: null, lane2: null, lane3: null });


  // --- 3.3 REFS ---
  // useRef declarations for DOM manipulation and async operations.
  // CRITICAL: These refs are positioned AFTER gameState destructuring
  // to prevent "Cannot access before initialization" errors.
  const droneRefs = useRef({});
  const sectionRefs = useRef({});
  const gameAreaRef = useRef(null);
  const isResolvingAttackRef = useRef(false);
  const roundStartCascadeTriggered = useRef(false); // Prevent duplicate round start cascade triggers
  const deploymentToActionTriggered = useRef(false); // Prevent duplicate deployment → action triggers

  // --- 3.4 HOOKS DEPENDENT ON REFS ---
  // These hooks require refs as parameters and must be called after ref initialization.
  // This maintains proper dependency ordering while preserving the logical structure.
  const { explosions, triggerExplosion } = useExplosions(droneRefs, gameAreaRef);
  useAnimationSetup(
  gameStateManager,
  droneRefs,
  sectionRefs,
  getLocalPlayerState,  // Pass the getter function, not the value
  getOpponentPlayerState,  // Pass the getter function, not the value
  triggerExplosion,
  getElementCenter,
  gameAreaRef,
  setFlyingDrones,
  setAnimationBlocking,
  setFlashEffects,
  setHealEffects,
  setCardVisuals,
  setCardReveals,
  setShipAbilityReveals,
  setPhaseAnnouncements,
  setLaserEffects,
  setTeleportEffects,
  setPassNotifications,
  setGoAgainNotifications,
  setOverflowProjectiles,
  setSplashEffects,
  setBarrageImpacts,
  setRailgunTurrets,
  setRailgunBeams,
  setStatusConsumptions
);
  // Refs for async operations (defined after gameState destructuring)

  // ========================================
  // SECTION 4: MANAGER SUBSCRIPTIONS
  // ========================================
  // Event-driven architecture setup. All managers are initialized and subscribed
  // to provide game flow coordination, AI processing, and state management.
  // This follows the dependency injection pattern for clean architecture.

  // --- 4.1 MANAGER INITIALIZATION ---
  // Note: GameFlowManager is initialized in AppRouter.jsx with PhaseAnimationQueue
  // No initialization needed here - managers are already set up

  // --- 4.2 EVENT SUBSCRIPTIONS ---

  // --- 4.3 PAGE UNLOAD WARNING ---
  // Warn user before closing/refreshing if game is in progress
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Check if there's an active game or run that would be lost
      if (gameState.gameActive || tacticalMapStateManager.isRunActive()) {
        e.preventDefault();
        e.returnValue = 'You have an active game. Progress may be lost.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState.gameActive]);

  // ========================================
  // SECTION 5: COMPUTED VALUES & MEMOIZATION
  // ========================================
  // Performance-critical computed values using useMemo for optimization.
  // All game state destructuring and derived calculations happen here.
  // This section prevents unnecessary recalculations during re-renders.

  // --- 5.1 PLAYER STATE CALCULATIONS ---
  // Extract core game state and derive player-specific perspectives

  // --- EXTRACTED STATE (now from GameStateManager) ---
  // Core game state comes from gameState object:
  // gameState.turnPhase, gameState.turn, gameState.currentPlayer, etc.
  const {
    turnPhase,
    turn,
    roundNumber,
    currentPlayer,
    firstPlayerOfRound,
    firstPasserOfPreviousRound,
    firstPlayerOverride,
    passInfo,
    winner,
    unplacedSections,
    shieldsToAllocate,
    opponentShieldsToAllocate,
    gameLog,
    placedSections,
    testMode
  } = gameState;

  // --- 3.5 STATE AND REFS DEPENDENT ON GAMESTATE ---
  // State and refs that require gameState values for initialization.
  // Positioned after gameState destructuring to ensure proper initialization order.
  const [lastCurrentPlayer, setLastCurrentPlayer] = useState(currentPlayer);

  // Refs for async operations that need gameState values
  const passInfoRef = useRef(passInfo);
  const turnPhaseRef = useRef(turnPhase);
  const winnerRef = useRef(winner);

  // --- 5.2 REF SYNCHRONIZATION ---
  // Keep refs synchronized with state values for async operations
  useEffect(() => {
    passInfoRef.current = passInfo;
  }, [passInfo]);
  useEffect(() => {
    turnPhaseRef.current = turnPhase;
  }, [turnPhase]);
  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  // Use perspective-aware state getters for both AI and multiplayer modes
  const localPlayerState = getLocalPlayerState();
  const opponentPlayerState = getOpponentPlayerState();
  const localPlacedSections = getLocalPlacedSections();
  const opponentPlacedSections = getOpponentPlacedSections();

  // Ship section placement data
  const sectionsToPlace = ['bridge', 'powerCell', 'droneControlHub'];

  // Helper functions to get game engine format from GameStateManager
  const getPlayerStatesForEngine = useCallback(() => {
    return { player1: gameState.player1, player2: gameState.player2 };
  }, [gameState.player1, gameState.player2]);

  const getPlacedSectionsForEngine = useCallback(() => {
    return {
      player1: gameState.placedSections,
      player2: gameState.opponentPlacedSections
    };
  }, [gameState.placedSections, gameState.opponentPlacedSections]);


  // Calculate lane control whenever drones on board change (for lane-control cards)
  useEffect(() => {
    if (gameState.player1 && gameState.player2) {
      const newControl = LaneControlCalculator.calculateLaneControl(
        gameState.player1,
        gameState.player2
      );
      setLaneControl(newControl);
      debugLog('LANE_CONTROL', '🎯 Lane control updated', {
        lane1: newControl.lane1,
        lane2: newControl.lane2,
        lane3: newControl.lane3,
        player1Drones: {
          lane1: (gameState.player1.dronesOnBoard?.lane1 || []).length,
          lane2: (gameState.player1.dronesOnBoard?.lane2 || []).length,
          lane3: (gameState.player1.dronesOnBoard?.lane3 || []).length
        },
        player2Drones: {
          lane1: (gameState.player2.dronesOnBoard?.lane1 || []).length,
          lane2: (gameState.player2.dronesOnBoard?.lane2 || []).length,
          lane3: (gameState.player2.dronesOnBoard?.lane3 || []).length
        }
      });
    }
  }, [gameState.player1?.dronesOnBoard, gameState.player2?.dronesOnBoard]);

  // --- 5.3 PERFORMANCE OPTIMIZED COMPUTED VALUES ---
  // Ship stats now use GameDataService for consistent caching with drone stats
  const localPlayerEffectiveStats = localPlayerState ? getEffectiveShipStats(localPlayerState, localPlacedSections) : null;
  const opponentPlayerEffectiveStats = opponentPlayerState ? getEffectiveShipStats(opponentPlayerState, opponentPlacedSections) : null;

  const totalLocalPlayerDrones = useMemo(() => {
    return localPlayerState
      ? Object.values(localPlayerState.dronesOnBoard).flat().filter(d => !d.isToken).length
      : 0;
  }, [localPlayerState?.dronesOnBoard]);

  const totalOpponentPlayerDrones = useMemo(() => {
    return opponentPlayerState
      ? Object.values(opponentPlayerState.dronesOnBoard).flat().filter(d => !d.isToken).length
      : 0;
  }, [opponentPlayerState?.dronesOnBoard]);

  // Hull integrity calculations for win condition display
  const localPlayerHullIntegrity = useMemo(() => {
    return localPlayerState ? WinConditionChecker.calculateHullIntegrity(localPlayerState) : null;
  }, [localPlayerState?.shipSections]);

  const opponentHullIntegrity = useMemo(() => {
    return opponentPlayerState ? WinConditionChecker.calculateHullIntegrity(opponentPlayerState) : null;
  }, [opponentPlayerState?.shipSections]);

  // Opponent's selected drone cards (from drone selection phase)
  const opponentSelectedDrones = useMemo(() => {
    return gameState.commitments?.droneSelection?.[getOpponentPlayerId()]?.drones || [];
  }, [gameState.commitments?.droneSelection, getOpponentPlayerId]);

  // Sorted drone pool for deployment interface
  const sortedLocalActivePool = useMemo(() => {
    if (!localPlayerState?.activeDronePool) return [];
    return [...localPlayerState.activeDronePool].sort((a, b) => {
      if (a.class !== b.class) {
        return a.class - b.class;
      }
      return a.name.localeCompare(b.name);
    });
  }, [localPlayerState?.activeDronePool]);

  // --- 5.5 PHASE-BASED MANDATORY ACTION DERIVED STATE ---
  // Derive UI state for mandatory discard/removal phases directly from phase + commitments
  // This eliminates timing issues with mandatoryAction state for phase-based actions
  // Note: mandatoryAction state is still used for ability-based mandatory actions

  const isInMandatoryDiscardPhase = turnPhase === 'mandatoryDiscard';
  const isInMandatoryRemovalPhase = turnPhase === 'mandatoryDroneRemoval';

  // Only call getLocalPlayerId() when in mandatory phases to avoid early initialization issues
  // This prevents calling it during gameInitializing phase when App.jsx mounts early
  const localPlayerId = (isInMandatoryDiscardPhase || isInMandatoryRemovalPhase)
    ? getLocalPlayerId()
    : null;

  const hasCommittedDiscard = localPlayerId && gameState.commitments?.mandatoryDiscard?.[localPlayerId]?.completed;
  const hasCommittedRemoval = localPlayerId && gameState.commitments?.mandatoryDroneRemoval?.[localPlayerId]?.completed;

  // Calculate excess on-the-fly
  const excessCards = localPlayerState && localPlayerEffectiveStats
    ? localPlayerState.hand.length - localPlayerEffectiveStats.totals.handLimit
    : 0;
  const excessDrones = localPlayerState && localPlayerEffectiveStats
    ? totalLocalPlayerDrones - localPlayerEffectiveStats.totals.cpuLimit
    : 0;

  // UI flags for mandatory actions
  const shouldShowDiscardUI = isInMandatoryDiscardPhase && !hasCommittedDiscard && excessCards > 0;
  const shouldShowRemovalUI = isInMandatoryRemovalPhase && !hasCommittedRemoval && excessDrones > 0;

  // ========================================
  // SECTION 6: EVENT HANDLERS
  // ========================================
  // User interaction handlers grouped by functionality for maintainability.
  // All handlers use useCallback for performance optimization.
  // Event handlers coordinate between UI actions and manager layer.

  // --- 6.0 ACTION ROUTING HOOK ---
  const {
    processActionWithGuestRouting,
    executeDeployment,
  } = useActionRouting({
    gameState, processAction, p2pManager, gameStateManager,
    getLocalPlayerId, selectedDrone, roundNumber, turn,
    setSelectedDrone, setModalContent,
  });

  // --- Hoisted drag state (shared between useDragMechanics, useCardSelection, useInterception) ---
  const [draggedDrone, setDraggedDrone] = useState(null);
  const [costReminderArrowState, setCostReminderArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });

  // --- MULTIPLAYER SYNC HOOK ---
  const {
    waitingForPlayerPhase,
    setWaitingForPlayerPhase,
  } = useMultiplayerSync({
    gameState,
    turnPhase,
    isMultiplayer,
    getLocalPlayerId,
    getOpponentPlayerId,
    p2pManager,
    gameStateManager,
    phaseAnimationQueue,
    passInfo,
  });

  // --- SHIELD ALLOCATION HOOK ---
  const {
    reallocationPhase,
    shieldsToAdd,
    shieldsToRemove,
    pendingShieldAllocations,
    pendingShieldsRemaining,
    pendingShieldChanges,
    setReallocationPhase,
    setShieldsToRemove,
    setShieldsToAdd,
    setOriginalShieldAllocation,
    setReallocationAbility,
    handleResetShields,
    handleConfirmShields,
    handleCancelReallocation,
    handleContinueToAddPhase,
    handleResetReallocation,
    handleConfirmReallocation,
    handleShipSectionClick,
    clearReallocationState,
  } = useShieldAllocation({
    gameState,
    localPlayerState,
    localPlacedSections,
    gameDataService,
    getLocalPlayerId,
    getOpponentPlayerId,
    processActionWithGuestRouting,
    setWaitingForPlayerPhase,
    setShipAbilityConfirmation,
  });

  // --- CARD SELECTION HOOK ---
  const {
    selectedCard, validCardTargets, validAbilityTargets, affectedDroneIds,
    hoveredLane, cardConfirmation,
    destroyUpgradeModal, upgradeSelectionModal, viewUpgradesModal,
    setSelectedCard, setValidCardTargets, setValidAbilityTargets, setAffectedDroneIds,
    setHoveredLane, setCardConfirmation,
    setDestroyUpgradeModal, setUpgradeSelectionModal, setViewUpgradesModal,
    cancelCardSelection,
    cancelCardState,
    // Effect chain (unified sequential effect selection)
    effectChainState, startEffectChain, selectChainTarget, selectChainDestination,
    selectChainMultiTarget, confirmChainMultiSelect, cancelEffectChain,
  } = useCardSelection({
    processActionWithGuestRouting,
    getLocalPlayerId,
    gameState,
    gameDataService,
    abilityMode,
    setAbilityMode,
    shipAbilityMode,
    setShipAbilityMode,
    setSelectedDrone,
  });

  // --- 6.2 UI EVENT HANDLERS ---

  const showCardPlayWarning = useCallback((reasons) => {
    setCardPlayWarning({ id: Date.now(), reasons });
  }, []);

  const clearCardPlayWarning = useCallback(() => setCardPlayWarning(null), []);

  // ========================================
  // SECTION 7: RESOLVERS HOOK + CANCEL ALL ACTIONS
  // ========================================

  // Ref for circular dependency: useResolvers needs setPlayerInterceptionChoice
  // from useInterception, but useInterception needs resolveAttack from useResolvers.
  // The ref is populated after useInterception returns (see wiring below).
  const interceptionRef = useRef({});

  const {
    resolveAttack, resolveAbility, resolveShipAbility, resolveCardPlay,
    handleCardSelection, resolveMultiMove, resolveSingleMove,
    cancelAbilityMode, handleCloseAiCardReport,
    moveConfirmation, attackConfirmation, abilityConfirmation, aiCardPlayReport,
    setMoveConfirmation, setAttackConfirmation, setAbilityConfirmation, setAiCardPlayReport,
    handleConfirmMove, handleConfirmAttack, handleCancelAttack,
    handleConfirmIntercept, handleDeclineIntercept,
    handleConfirmCardPlay,
    handleConfirmDroneAbility, handleConfirmShipAbility,
    clearConfirmations,
  } = useResolvers({
    processActionWithGuestRouting, getLocalPlayerId, getOpponentPlayerId,
    isResolvingAttackRef,
    interceptionRef,
    localPlayerState, opponentPlayerState, winner, turnPhase, currentPlayer,
    gameStateManager,
    setSelectedDrone, setAbilityMode, setValidAbilityTargets, setMandatoryAction,
    setFooterView, setIsFooterOpen, setShipAbilityMode, setDraggedDrone,
    setCardSelectionModal, setShipAbilityConfirmation,
    cancelCardSelection, setSelectedCard, setValidCardTargets,
    setCostReminderArrowState, setCardConfirmation,
    setAffectedDroneIds,
    cardConfirmation,
    pendingShieldChanges, clearReallocationState,
  });

  const cancelAllActions = () => {
    if (selectedDrone) setSelectedDrone(null);
    if (abilityMode) setAbilityMode(null);
    if (shipAbilityMode) setShipAbilityMode(null);

    cancelCardState();
    cancelEffectChain();

    if (reallocationPhase) handleCancelReallocation();

    // Clear confirmation modals from useResolvers + App.jsx state
    clearConfirmations();
    if (shipAbilityConfirmation) setShipAbilityConfirmation(null);
    if (cardConfirmation) setCardConfirmation(null);
    if (deploymentConfirmation) setDeploymentConfirmation(null);
  };

  // --- INTERCEPTION HOOK ---
  const {
    playerInterceptionChoice,
    potentialInterceptors,
    potentialGuardians,
    showOpponentDecidingModal,
    interceptedBadge,
    interceptionModeActive,
    selectedInterceptor,
    setSelectedInterceptor,
    setInterceptionModeActive,
    setPlayerInterceptionChoice,
    setShowOpponentDecidingModal,
    handleViewBattlefield,
    handleShowInterceptionDialog,
    handleResetInterception,
    handleDeclineInterceptionFromHeader,
    handleConfirmInterception,
  } = useInterception({
    gameState,
    localPlayerState,
    opponentPlayerState,
    selectedDrone,
    draggedDrone,
    abilityMode,
    getLocalPlayerId,
    getPlacedSectionsForEngine,
    resolveAttack,
    getEffectiveStats,
  });

  // Wire up circular dependency ref — useResolvers needs these from useInterception
  interceptionRef.current = { setPlayerInterceptionChoice, playerInterceptionChoice };

  // --- DRAG MECHANICS HOOK ---
  // Positioned after useCardSelection + useInterception to receive their values.
  // draggedDrone + costReminderArrowState hoisted to App.jsx to break circular deps.
  const {
    hoveredTarget, arrowState, cardDragArrowState, draggedCard,
    droneDragArrowState, draggedActionCard, actionCardDragArrowState,
    deploymentConfirmation,
    setHoveredTarget, setArrowState, setCardDragArrowState, setDraggedCard,
    setDroneDragArrowState, setDraggedActionCard, setActionCardDragArrowState,
    setDeploymentConfirmation,
    arrowLineRef, cardDragArrowRef, droneDragArrowRef, actionCardDragArrowRef,
    costReminderArrowRef,
    handleSetHoveredTarget, handleCardDragStart, handleCardDragEnd,
    handleActionCardDragStart, handleActionCardDragEnd,
    handleDroneDragStart, handleDroneDragEnd,
  } = useDragMechanics({
    gameAreaRef, turnPhase, currentPlayer, getLocalPlayerId, passInfo,
    roundNumber, totalLocalPlayerDrones, localPlayerState, localPlayerEffectiveStats,
    gameEngine, setSelectedDrone, setModalContent, executeDeployment,
    // From useCardSelection
    setAffectedDroneIds, setHoveredLane, setSelectedCard,
    cancelCardSelection, setCardConfirmation,
    setUpgradeSelectionModal, setDestroyUpgradeModal,
    setValidCardTargets, validCardTargets,
    selectedCard,
    // From useCardSelection — effect chain
    startEffectChain,
    effectChainState,
    selectChainDestination,
    // From useInterception
    interceptionModeActive, playerInterceptionChoice, setSelectedInterceptor,
    // Hoisted state
    draggedDrone, setDraggedDrone,
    costReminderArrowState, setCostReminderArrowState,
    // From App.jsx scope
    cancelAllActions, opponentPlayerState, gameState, gameDataService,
    getPlacedSectionsForEngine,
    droneRefs, setMoveConfirmation, resolveAttack, getEffectiveStats, selectedDrone,
    abilityMode,
  });

  // Positioned after useDragMechanics — depends on draggedActionCard (useDragMechanics)
  // and setHoveredLane/setAffectedDroneIds (useCardSelection)
  const handleLaneHover = useCallback((laneData) => {
    if (laneData && draggedActionCard?.card?.targeting?.type === 'LANE') {
      const affected = calculateAffectedDroneIds(
        draggedActionCard.card,
        [laneData],
        gameState.player1,
        gameState.player2,
        getLocalPlayerId(),
        gameDataService.getEffectiveStats.bind(gameDataService),
        getPlacedSectionsForEngine()
      );
      debugLog('LANE_TARGETING', '🎯 Hover-based affected drone calc (sync)', {
        hoveredLane: laneData,
        affectedDroneIds: affected,
        cardName: draggedActionCard.card.name
      });
      setHoveredLane(laneData);
      setAffectedDroneIds(affected);
    } else {
      setHoveredLane(null);
      setAffectedDroneIds([]);
    }
  }, [draggedActionCard, gameState.player1, gameState.player2, getLocalPlayerId, gameDataService, getPlacedSectionsForEngine]);



  // ========================================
  // SECTION 8: EFFECT HOOKS
  // ========================================
  // Side effects and monitoring grouped by purpose for maintainability.
  // These useEffect hooks monitor game state changes and trigger automated responses.
  // Organized into game state monitoring, UI effects, and phase transition effects.

  // --- 8.2 PHASE ANIMATION QUEUE SUBSCRIPTION ---

  // Subscribe to phase animation queue events for UI blocking and animation display
  useEffect(() => {
    if (!phaseAnimationQueue) return;

    const handleAnimationStarted = (animation) => {
      setCurrentPhaseAnimation(animation);
      setPhaseAnnouncements([{
        id: animation.id,
        phaseText: animation.phaseText,
        subtitle: animation.subtitle,
        onComplete: () => {
          // Animation completes after 1.8 seconds (1.5s display + 0.3s fade)
        }
      }]);
    };

    const handleAnimationEnded = (animation) => {
      setPhaseAnnouncements([]);
      setCurrentPhaseAnimation(null);
    };

    const handlePlaybackStateChanged = (isPlaying) => {
      setIsPhaseAnimationPlaying(isPlaying);
    };

    const unsubAnimationStarted = phaseAnimationQueue.on('animationStarted', handleAnimationStarted);
    const unsubAnimationEnded = phaseAnimationQueue.on('animationEnded', handleAnimationEnded);
    const unsubPlaybackState = phaseAnimationQueue.on('playbackStateChanged', handlePlaybackStateChanged);

    return () => {
      unsubAnimationStarted();
      unsubAnimationEnded();
      unsubPlaybackState();
    };
  }, [phaseAnimationQueue]);

  // --- 8.3 WIN CONDITION MONITORING ---
  // Win conditions are now checked automatically by ActionProcessor after attacks, abilities, and card plays
  // This effect shows the winner modal when a winner is detected
  useEffect(() => {
    if (winner && !showWinnerModal) {
      setShowWinnerModal(true);
    }
  }, [winner, showWinnerModal]);

  // ========================================
  // SECTION 9: EARLY RETURN FOR NULL PLAYER STATE
  // ========================================
  // This defensive check must come AFTER all hooks are declared.
  // Handles scenarios where player states might be null:
  // - Hot reload during development
  // - Abandon run flow (resetGameState sets player1/player2 to null)
  // - Combat defeat flow (processDefeat calls resetGameState)
  // - Transitional states during game initialization
  //
  // IMPORTANT: Moving this earlier in the component would cause
  // "Rendered fewer hooks than expected" errors because React
  // requires the same number of hooks to be called on every render.
  if (!localPlayerState || !opponentPlayerState) {
    // If failed run screen should be shown, render it instead of placeholder
    // This handles the defeat/abandon flows where player states are null
    // but we need to show the FailedRunLoadingScreen transition
    if (gameState.showFailedRunScreen) {
      return (
        <FailedRunLoadingScreen
          failureType={gameState.failedRunType}
          isStarterDeck={gameState.failedRunIsStarterDeck}
          onComplete={() => ExtractionController.completeFailedRunTransition()}
        />
      );
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div>Initializing game board...</div>
      </div>
    );
  }




  // --- GAME LIFECYCLE HOOK ---
  // Positioned after resolve* functions (used as deps by lifecycle handlers).
  const {
    handleReset, handleExitGame, handleConfirmAbandonRun,
    handleOpenAddCardModal, handleForceWin, handleAddCardsToHand,
    handleImportDeck, handlePlayerPass,
    handleConfirmMandatoryDiscard, handleRoundStartDiscard, handleRoundStartDraw,
    handleMandatoryDiscardContinue, handleMandatoryDroneRemovalContinue,
    checkBothPlayersHandLimitComplete, handleConfirmMandatoryDestroy,
    downloadLogAsCSV, handleCardInfoClick,
    handleFooterViewToggle, handleFooterButtonClick,
    handleBackgroundChange, handleViewShipSection, handleShowOpponentDrones,
  } = useGameLifecycle({
    // Game state
    gameState, localPlayerState, opponentPlayerState, turnPhase, passInfo,
    mandatoryAction, excessCards, excessDrones,
    // Computed values
    totalOpponentPlayerDrones, opponentPlayerEffectiveStats,
    opponentPlacedSections, getEffectiveShipStats,
    // State setters
    setSelectedDrone, setModalContent, setAbilityMode, setValidAbilityTargets,
    setMandatoryAction, setShowMandatoryActionModal, setConfirmationModal,
    setSelectedCard, setValidCardTargets, setCardConfirmation,
    setShowWinnerModal, setShowAbandonRunModal, setShowAddCardModal,
    setOptionalDiscardCount, setWaitingForPlayerPhase, setDeck, setCardToView,
    // Functions
    processActionWithGuestRouting, getLocalPlayerId, getOpponentPlayerId,
    cancelAllActions, resetGame, endGame,
    // Refs
    isResolvingAttackRef,
    // Footer state
    footerView, isFooterOpen, setFooterView, setIsFooterOpen,
    // UI modal state
    setSelectedBackground, setViewShipSectionModal, setShowOpponentDronesModal,
    // External
    gameStateManager, phaseAnimationQueue, gameLog,
  });

  // --- CLICK HANDLERS HOOK ---
  // Positioned after useGameLifecycle (provides handleConfirmMandatoryDestroy).
  const {
    handleToggleDroneSelection,
    handleAbilityIconClick,
    handleShipAbilityClick,
    handleTargetClick,
    handleTokenClick,
    handleLaneClick,
  } = useClickHandlers({
    // Game state
    turnPhase, currentPlayer, gameState, localPlayerState, opponentPlayerState,
    passInfo, mandatoryAction, shouldShowRemovalUI,
    // App.jsx state
    selectedDrone, setSelectedDrone, abilityMode, setAbilityMode,
    // Modal state setters
    setModalContent, setConfirmationModal, setDetailedDroneInfo,
    setAbilityConfirmation, setMoveConfirmation, setCardConfirmation,
    setShipAbilityConfirmation,
    setDestroyUpgradeModal, setUpgradeSelectionModal,
    // From useCardSelection
    selectedCard, setSelectedCard, validCardTargets, setValidCardTargets,
    validAbilityTargets,
    cancelCardSelection,
    // From useCardSelection — effect chain
    effectChainState, selectChainTarget, selectChainDestination,
    selectChainMultiTarget,
    // From useShieldAllocation
    shipAbilityMode, setShipAbilityMode,
    setReallocationPhase, setShieldsToRemove, setShieldsToAdd,
    setOriginalShieldAllocation, setReallocationAbility,
    // App.jsx functions
    cancelAllActions, cancelAbilityMode, isActionInProgress, isMyTurn,
    getLocalPlayerId, getOpponentPlayerId,
    resolveAbility, resolveSingleMove, resolveMultiMove,
    handleConfirmMandatoryDestroy,
    // Action dispatching
    processActionWithGuestRouting,
    // External services
    gameEngine, gameDataService,
    // Refs
    droneRefs, gameAreaRef,
  });


  // --- Modal confirmation callbacks ---
  // Most callbacks extracted to useResolvers. handleConfirmDeployment stays here
  // because it depends on useDragMechanics state (deploymentConfirmation).

  const handleConfirmDeployment = async () => {
    if (!deploymentConfirmation) return;
    const { lane, drone } = deploymentConfirmation;
    setDeploymentConfirmation(null);
    setTimeout(async () => {
      await executeDeployment(lane, drone);
    }, 400);
  };

  // ========================================
  // SECTION 9: RENDER
  // ========================================
  // Main component render with clean component composition.
  // Uses extracted sub-components for maintainability and separation of concerns.
  // All UI state and event handlers are passed down as props for reactive updates.

  // Get current background configuration
  const currentBackground = getBackgroundById(selectedBackground);

  return (
    <div className="h-screen text-white font-sans overflow-hidden flex flex-col relative select-none" ref={gameAreaRef} onClick={() => {
      cancelAbilityMode();
      cancelCardSelection('game-area-click');
    }}>
     {currentBackground.type === 'animated' ? (
       <SpaceBackground />
     ) : (
       <StaticBackground imagePath={currentBackground.path} />
     )}
     <TargetingArrowLayer
       arrowState={arrowState}
       cardDragArrowState={cardDragArrowState}
       droneDragArrowState={droneDragArrowState}
       actionCardDragArrowState={actionCardDragArrowState}
       costReminderArrowState={costReminderArrowState}
       arrowLineRef={arrowLineRef}
       cardDragArrowRef={cardDragArrowRef}
       droneDragArrowRef={droneDragArrowRef}
       actionCardDragArrowRef={actionCardDragArrowRef}
       costReminderArrowRef={costReminderArrowRef}
       playerInterceptionChoice={playerInterceptionChoice}
       interceptionModeActive={interceptionModeActive}
       selectedInterceptor={selectedInterceptor}
       droneRefs={droneRefs}
       sectionRefs={sectionRefs}
       gameAreaRef={gameAreaRef}
     />
     <AnimationLayer
       explosions={explosions}
       flyingDrones={flyingDrones}
       flashEffects={flashEffects}
       healEffects={healEffects}
       cardVisuals={cardVisuals}
       cardReveals={cardReveals}
       statusConsumptions={statusConsumptions}
       shipAbilityReveals={shipAbilityReveals}
       phaseAnnouncements={phaseAnnouncements}
       passNotifications={passNotifications}
       goAgainNotifications={goAgainNotifications}
       cardPlayWarning={cardPlayWarning}
       laserEffects={laserEffects}
       teleportEffects={teleportEffects}
       overflowProjectiles={overflowProjectiles}
       splashEffects={splashEffects}
       barrageImpacts={barrageImpacts}
       railgunTurrets={railgunTurrets}
       railgunBeams={railgunBeams}
       animationBlocking={animationBlocking}
       setBarrageImpacts={setBarrageImpacts}
     />

      <GameHeader
        localPlayerState={localPlayerState}
        opponentPlayerState={opponentPlayerState}
        localPlayerEffectiveStats={localPlayerEffectiveStats}
        opponentPlayerEffectiveStats={opponentPlayerEffectiveStats}
        turnPhase={turnPhase}
        turn={turn}
        roundNumber={roundNumber}
        passInfo={passInfo}
        firstPlayerOfRound={firstPlayerOfRound}
        shieldsToAllocate={shieldsToAllocate}
        opponentShieldsToAllocate={opponentShieldsToAllocate}
        pendingShieldAllocations={pendingShieldAllocations}
        pendingShieldsRemaining={pendingShieldsRemaining}
        shieldsToRemove={shieldsToRemove}
        shieldsToAdd={shieldsToAdd}
        reallocationPhase={reallocationPhase}
        totalLocalPlayerDrones={totalLocalPlayerDrones}
        totalOpponentPlayerDrones={totalOpponentPlayerDrones}
        getLocalPlayerId={getLocalPlayerId}
        getOpponentPlayerId={getOpponentPlayerId}
        isMyTurn={isMyTurn}
        currentPlayer={currentPlayer}
        isMultiplayer={isMultiplayer}
        handlePlayerPass={handlePlayerPass}
        handleExitGame={handleExitGame}
        handleResetShields={handleResetShields}
        handleConfirmShields={handleConfirmShields}
        handleCancelReallocation={handleCancelReallocation}
        handleResetReallocation={handleResetReallocation}
        handleContinueToAddPhase={handleContinueToAddPhase}
        handleConfirmReallocation={handleConfirmReallocation}
        handleRoundStartDraw={handleRoundStartDraw}
        handleMandatoryDiscardContinue={handleMandatoryDiscardContinue}
        handleMandatoryDroneRemovalContinue={handleMandatoryDroneRemovalContinue}
        optionalDiscardCount={optionalDiscardCount}
        mandatoryAction={mandatoryAction}
        excessCards={excessCards}
        excessDrones={excessDrones}
        AI_HAND_DEBUG_MODE={AI_HAND_DEBUG_MODE}
        setShowAiHandModal={setShowAiHandModal}
        onShowDebugModal={() => setShowDebugModal(true)}
        onShowOpponentDrones={handleShowOpponentDrones}
        onShowGlossary={() => setShowGlossaryModal(true)}
        onShowAIStrategy={() => setShowAIStrategyModal(true)}
        onShowAddCardModal={handleOpenAddCardModal}
        onForceWin={handleForceWin}
        testMode={testMode}
        selectedBackground={selectedBackground}
        onBackgroundChange={handleBackgroundChange}
        interceptionModeActive={interceptionModeActive}
        selectedInterceptor={selectedInterceptor}
        handleShowInterceptionDialog={handleShowInterceptionDialog}
        handleResetInterception={handleResetInterception}
        handleConfirmInterception={handleConfirmInterception}
        // Effect chain props
        effectChainState={effectChainState}
        handleConfirmChainMultiSelect={confirmChainMultiSelect}
        handleCancelEffectChain={cancelEffectChain}
        // Extraction mode props
        currentRunState={tacticalMapStateManager.getState()}
        isExtractionMode={tacticalMapStateManager.isRunActive()}
        // Hull integrity props for win condition display
        localPlayerHullIntegrity={localPlayerHullIntegrity}
        opponentHullIntegrity={opponentHullIntegrity}
      />

      <GameBattlefield
        localPlayerState={localPlayerState}
        opponentPlayerState={opponentPlayerState}
        localPlacedSections={localPlacedSections}
        opponentPlacedSections={opponentPlacedSections}
        selectedCard={selectedCard}
        validCardTargets={validCardTargets}
        affectedDroneIds={affectedDroneIds}
        abilityMode={abilityMode}
        validAbilityTargets={validAbilityTargets}
        effectChainState={effectChainState}
        turnPhase={turnPhase}
        reallocationPhase={reallocationPhase}
        pendingShieldAllocations={pendingShieldAllocations}
        pendingShieldChanges={pendingShieldChanges}
        shipAbilityMode={shipAbilityMode}
        hoveredTarget={hoveredTarget}
        selectedDrone={selectedDrone}
        recentlyHitDrones={recentlyHitDrones}
        potentialInterceptors={potentialInterceptors}
        potentialGuardians={potentialGuardians}
        droneRefs={droneRefs}
        sectionRefs={sectionRefs}
        mandatoryAction={mandatoryAction}
        gameEngine={gameEngine}
        getLocalPlayerId={getLocalPlayerId}
        getOpponentPlayerId={getOpponentPlayerId}
        isMyTurn={isMyTurn}
        getPlacedSectionsForEngine={getPlacedSectionsForEngine}
        passInfo={passInfo}
        handleTargetClick={handleTargetClick}
        handleLaneClick={handleLaneClick}
        handleShipSectionClick={handleShipSectionClick}
        handleShipAbilityClick={handleShipAbilityClick}
        handleTokenClick={handleTokenClick}
        handleAbilityIconClick={handleAbilityIconClick}
        setHoveredTarget={handleSetHoveredTarget}
        onViewShipSection={handleViewShipSection}
        interceptedBadge={interceptedBadge}
        draggedCard={draggedCard}
        handleCardDragEnd={handleCardDragEnd}
        draggedDrone={draggedDrone}
        handleDroneDragStart={handleDroneDragStart}
        handleDroneDragEnd={handleDroneDragEnd}
        interceptionModeActive={interceptionModeActive}
        playerInterceptionChoice={playerInterceptionChoice}
        draggedActionCard={draggedActionCard}
        handleActionCardDragEnd={handleActionCardDragEnd}
        hoveredLane={hoveredLane}
        setHoveredLane={handleLaneHover}
        laneControl={laneControl}
      />

      <GameFooter
        gameMode={gameState.gameMode}
        localPlayerState={localPlayerState}
        localPlayerEffectiveStats={localPlayerEffectiveStats}
        sortedLocalActivePool={sortedLocalActivePool}
        gameLog={gameLog}
        footerView={footerView}
        isFooterOpen={isFooterOpen}
        selectedCard={selectedCard}
        turnPhase={turnPhase}
        mandatoryAction={
          mandatoryAction?.fromAbility
            ? mandatoryAction
            : isInMandatoryDiscardPhase && !hasCommittedDiscard
              ? { type: 'discard', count: excessCards }
              : isInMandatoryRemovalPhase && !hasCommittedRemoval
                ? { type: 'destroy', count: excessDrones }
                : null
        }
        excessCards={excessCards}
        handleFooterButtonClick={handleFooterButtonClick}

        cancelCardSelection={cancelCardSelection}
        downloadLogAsCSV={downloadLogAsCSV}
        getLocalPlayerId={getLocalPlayerId}
        isMyTurn={isMyTurn}
        hoveredCardId={hoveredCardId}
        setHoveredCardId={setHoveredCardId}
        setIsViewDiscardModalOpen={setIsViewDiscardModalOpen}
        setIsViewDeckModalOpen={setIsViewDeckModalOpen}
        handleToggleDroneSelection={handleToggleDroneSelection}
        selectedDrone={selectedDrone}
        setViewUpgradesModal={setViewUpgradesModal}
        handleConfirmMandatoryDiscard={handleConfirmMandatoryDiscard}
        setConfirmationModal={setConfirmationModal}
        turn={turn}
        roundNumber={roundNumber}
        passInfo={passInfo}
        validCardTargets={validCardTargets}
        gameEngine={gameEngine}
        opponentPlayerState={opponentPlayerState}
        setAiDecisionLogToShow={setAiDecisionLogToShow}
        onCardInfoClick={handleCardInfoClick}
        optionalDiscardCount={optionalDiscardCount}
        handleRoundStartDraw={handleRoundStartDraw}
        handleRoundStartDiscard={handleRoundStartDiscard}
        checkBothPlayersHandLimitComplete={checkBothPlayersHandLimitComplete}
        handleCardDragStart={handleCardDragStart}
        draggedCard={draggedCard}
        handleActionCardDragStart={handleActionCardDragStart}
        draggedActionCard={draggedActionCard}
        actionsTakenThisTurn={gameState.actionsTakenThisTurn || 0}
        onCardPlayWarning={showCardPlayWarning}
        onCardPlayWarningClear={clearCardPlayWarning}
      />

      <ModalLayer
        // Modal state
        isLogModalOpen={isLogModalOpen}
        modalContent={modalContent}
        waitingForPlayerPhase={waitingForPlayerPhase}
        deploymentConfirmation={deploymentConfirmation}
        moveConfirmation={moveConfirmation}
        attackConfirmation={attackConfirmation}
        playerInterceptionChoice={playerInterceptionChoice}
        interceptionModeActive={interceptionModeActive}
        showOpponentDecidingModal={showOpponentDecidingModal}
        detailedDroneInfo={detailedDroneInfo}
        cardToView={cardToView}
        aiCardPlayReport={aiCardPlayReport}
        aiDecisionLogToShow={aiDecisionLogToShow}
        winner={winner}
        showWinnerModal={showWinnerModal}
        showAbandonRunModal={showAbandonRunModal}
        viewShipSectionModal={viewShipSectionModal}
        mandatoryAction={mandatoryAction}
        localPlayerEffectiveStats={localPlayerEffectiveStats}
        showMandatoryActionModal={showMandatoryActionModal}
        shouldShowDiscardUI={shouldShowDiscardUI}
        shouldShowRemovalUI={shouldShowRemovalUI}
        isInMandatoryDiscardPhase={isInMandatoryDiscardPhase}
        hasCommittedDiscard={hasCommittedDiscard}
        excessCards={excessCards}
        isInMandatoryRemovalPhase={isInMandatoryRemovalPhase}
        hasCommittedRemoval={hasCommittedRemoval}
        excessDrones={excessDrones}
        confirmationModal={confirmationModal}
        viewUpgradesModal={viewUpgradesModal}
        destroyUpgradeModal={destroyUpgradeModal}
        upgradeSelectionModal={upgradeSelectionModal}
        cardConfirmation={cardConfirmation}
        abilityConfirmation={abilityConfirmation}
        showAiHandModal={showAiHandModal}
        AI_HAND_DEBUG_MODE={AI_HAND_DEBUG_MODE}
        opponentPlayerState={opponentPlayerState}
        showOpponentDronesModal={showOpponentDronesModal}
        opponentSelectedDrones={opponentSelectedDrones}
        showDebugModal={showDebugModal}
        showGlossaryModal={showGlossaryModal}
        showAIStrategyModal={showAIStrategyModal}
        showAddCardModal={showAddCardModal}
        isViewDeckModalOpen={isViewDeckModalOpen}
        isViewDiscardModalOpen={isViewDiscardModalOpen}
        localPlayerState={localPlayerState}
        cardSelectionModal={cardSelectionModal}
        shipAbilityConfirmation={shipAbilityConfirmation}
        gameState={gameState}
        // Callbacks
        onCloseLogModal={() => setIsLogModalOpen(false)}
        onCloseGamePhaseModal={() => setModalContent(null)}
        onCancelDeployment={() => setDeploymentConfirmation(null)}
        onConfirmDeployment={handleConfirmDeployment}
        onCancelMove={() => setMoveConfirmation(null)}
        onConfirmMove={handleConfirmMove}
        onCancelAttack={handleCancelAttack}
        onConfirmAttack={handleConfirmAttack}
        onViewBattlefield={handleViewBattlefield}
        onConfirmIntercept={handleConfirmIntercept}
        onDeclineIntercept={handleDeclineIntercept}
        onCloseDetailedDrone={() => setDetailedDroneInfo(null)}
        onCloseCardDetail={() => setCardToView(null)}
        onCloseAiCardPlayReport={() => setAiCardPlayReport(null)}
        onCloseAiDecisionLog={() => setAiDecisionLogToShow(null)}
        onCloseWinnerModal={() => setShowWinnerModal(false)}
        onCancelAbandonRun={() => setShowAbandonRunModal(false)}
        onConfirmAbandonRun={handleConfirmAbandonRun}
        onCloseViewShipSection={() => setViewShipSectionModal(null)}
        onCloseMandatoryActionModal={() => setShowMandatoryActionModal(false)}
        onCancelCardConfirmation={() => setCardConfirmation(null)}
        onConfirmCardPlay={handleConfirmCardPlay}
        onCancelDroneAbility={() => setAbilityConfirmation(null)}
        onConfirmDroneAbility={handleConfirmDroneAbility}
        onCloseAiHandModal={() => setShowAiHandModal(false)}
        onCloseOpponentDronesModal={() => setShowOpponentDronesModal(false)}
        onCloseDebugModal={() => setShowDebugModal(false)}
        onCloseGlossaryModal={() => setShowGlossaryModal(false)}
        onCloseAIStrategyModal={() => setShowAIStrategyModal(false)}
        onCloseAddCardModal={() => setShowAddCardModal(false)}
        onConfirmAddCards={handleAddCardsToHand}
        onCloseViewDeckModal={() => setIsViewDeckModalOpen(false)}
        onCloseViewDiscardModal={() => setIsViewDiscardModalOpen(false)}
        onCloseCardSelectionModal={() => setCardSelectionModal(null)}
        onConfirmCardSelection={() => {}}
        onCancelShipAbility={() => setShipAbilityConfirmation(null)}
        onConfirmShipAbility={handleConfirmShipAbility}
        handleCardInfoClick={handleCardInfoClick}
        downloadLogAsCSV={downloadLogAsCSV}
        setAiDecisionLogToShow={setAiDecisionLogToShow}
        // Game data
        gameLog={gameLog}
        gameEngine={gameEngine}
        turnPhase={turnPhase}
        isMyTurn={isMyTurn}
        passInfo={passInfo}
        getLocalPlayerId={getLocalPlayerId}
        shipAbilityMode={shipAbilityMode}
        droneRefs={droneRefs}
        p2pRoomCode={p2pManager.roomCode}
        lootCount={tacticalMapStateManager.getState()?.collectedLoot?.length || 0}
        creditsEarned={0}
        gameStateManager={gameStateManager}
        gameDataService={gameDataService}
        gameMode={gameState.gameMode}
        deckCards={localPlayerState.deck}
        allDeckCards={[...localPlayerState.deck, ...localPlayerState.hand, ...localPlayerState.discardPile]}
        discardPileCards={localPlayerState.discardPile}
        // Upgrade modal setters
        setViewUpgradesModal={setViewUpgradesModal}
        setDestroyUpgradeModal={setDestroyUpgradeModal}
        setUpgradeSelectionModal={setUpgradeSelectionModal}
        resolveCardPlay={resolveCardPlay}
        cancelCardSelection={cancelCardSelection}
        setCardSelectionModal={setCardSelectionModal}
      />

      {/* Failed Run Loading Screen (MIA transition) */}
      {gameState.showFailedRunScreen && (
        <FailedRunLoadingScreen
          failureType={gameState.failedRunType}
          isStarterDeck={gameState.failedRunIsStarterDeck}
          onComplete={() => ExtractionController.completeFailedRunTransition()}
        />
      )}

    </div>
  );

};


export default App;