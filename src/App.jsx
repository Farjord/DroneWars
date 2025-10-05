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
import GamePhaseModal from './components/ui/GamePhaseModal.jsx';
import GameHeader from './components/ui/GameHeader.jsx';
import GameBattlefield from './components/ui/GameBattlefield.jsx';
import GameFooter from './components/ui/GameFooter.jsx';
import ModalContainer from './components/ui/ModalContainer.jsx';
import TargetingArrow from './components/ui/TargetingArrow.jsx';
import ExplosionEffect from './components/ui/ExplosionEffect.jsx';
import WaitingOverlay from './components/WaitingOverlay';
import InterceptedBadge from './components/ui/InterceptedBadge.jsx';

// --- 1.3 MODAL COMPONENT IMPORTS ---
import CardViewerModal from './CardViewerModal';
import CardSelectionModal from './CardSelectionModal';
import AICardPlayReportModal from './components/modals/AICardPlayReportModal.jsx';
import DetailedDroneModal from './components/modals/debug/DetailedDroneModal.jsx';
import { DeploymentCompleteModal, RoundEndModal } from './components/modals/GamePhaseModals.jsx';
import WaitingForPlayerModal from './components/modals/WaitingForPlayerModal.jsx';
import ConfirmationModal from './components/modals/ConfirmationModal.jsx';
import MandatoryActionModal from './components/modals/MandatoryActionModal.jsx';
import WinnerModal from './components/modals/WinnerModal.jsx';
import AIDecisionLogModal from './components/modals/AIDecisionLogModal.jsx';
import DeploymentConfirmationModal from './components/modals/DeploymentConfirmationModal.jsx';
import MoveConfirmationModal from './components/modals/MoveConfirmationModal.jsx';
import InterceptionOpportunityModal from './components/modals/InterceptionOpportunityModal.jsx';
import AttackInterceptedModal from './components/modals/AttackInterceptedModal.jsx';
import OpponentDecidingInterceptionModal from './components/modals/OpponentDecidingInterceptionModal.jsx';
import CardConfirmationModal from './components/modals/CardConfirmationModal.jsx';
import DroneAbilityConfirmationModal from './components/modals/DroneAbilityConfirmationModal.jsx';
import ShipAbilityConfirmationModal from './components/modals/ShipAbilityConfirmationModal.jsx';
import AIHandDebugModal from './components/modals/AIHandDebugModal.jsx';
import GameDebugModal from './components/modals/GameDebugModal.jsx';

// --- 1.4 HOOK IMPORTS ---
import { useGameState } from './hooks/useGameState';
import { useGameData } from './hooks/useGameData';
import { useExplosions } from './hooks/useExplosions';
import { useAnimationSetup } from './hooks/useAnimationSetup';

// --- 1.5 DATA/LOGIC IMPORTS ---
import fullCardCollection from './data/cardData.js';
import { gameEngine } from './logic/gameLogic.js';

// --- 1.6 MANAGER/STATE IMPORTS ---
import gameFlowManager from './state/GameFlowManager.js';
import aiPhaseProcessor from './state/AIPhaseProcessor.js';
import p2pManager from './network/P2PManager.js';
// ActionProcessor is created internally by GameStateManager

// --- 1.7 UTILITY IMPORTS ---
import { getElementCenter } from './utils/gameUtils.js';

// --- 1.8 ANIMATION IMPORTS ---
import AnimationManager from './state/AnimationManager.js';
import FlyingDrone from './components/animations/FlyingDrone.jsx';
import FlashEffect from './components/animations/FlashEffect.jsx';
import CardVisualEffect from './components/animations/CardVisualEffect.jsx';
import CardRevealOverlay from './components/animations/CardRevealOverlay.jsx';
import PassNotificationOverlay from './components/animations/PassNotificationOverlay.jsx';
import PhaseAnnouncementOverlay from './components/animations/PhaseAnnouncementOverlay.jsx';
import LaserEffect from './components/animations/LaserEffect.jsx';
import TeleportEffect from './components/animations/TeleportEffect.jsx';
// ========================================
// SECTION 2: MAIN COMPONENT DECLARATION
// ========================================

const App = () => {
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
  const AI_HAND_DEBUG_MODE = true; // Set to false to disable clicking to see the AI's hand
  const RACE_CONDITION_DEBUG = true; // Set to false to disable race condition monitoring

  // Modal state
  const [showAiHandModal, setShowAiHandModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [flyingDrones, setFlyingDrones] = useState([]);
  const [flashEffects, setFlashEffects] = useState([]);
  const [cardVisuals, setCardVisuals] = useState([]);
  const [cardReveals, setCardReveals] = useState([]);
  const [phaseAnnouncements, setPhaseAnnouncements] = useState([]);
  const [laserEffects, setLaserEffects] = useState([]);
  const [teleportEffects, setTeleportEffects] = useState([]);
  const [passNotifications, setPassNotifications] = useState([]);
  const [animationBlocking, setAnimationBlocking] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [deploymentConfirmation, setDeploymentConfirmation] = useState(null);
  const [moveConfirmation, setMoveConfirmation] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [showDeploymentCompleteModal, setShowDeploymentCompleteModal] = useState(false);
  const [showRoundEndModal, setShowRoundEndModal] = useState(false);
  const [waitingForPlayerPhase, setWaitingForPlayerPhase] = useState(null); // Track which phase we're waiting for player acknowledgment
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isViewDeckModalOpen, setIsViewDeckModalOpen] = useState(false);
  const [isViewDiscardModalOpen, setIsViewDiscardModalOpen] = useState(false);

  // Player selection and targeting state
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);

  // Combat and attack state
  const [interceptionModal, setInterceptionModal] = useState(null);
  const [playerInterceptionChoice, setPlayerInterceptionChoice] = useState(null);
  const [potentialInterceptors, setPotentialInterceptors] = useState([]);
  const [showOpponentDecidingModal, setShowOpponentDecidingModal] = useState(false); // For attacker waiting on defender
  const [interceptedBadge, setInterceptedBadge] = useState(null); // { droneId, timestamp }

  // AI behavior and reporting state
  const [aiCardPlayReport, setAiCardPlayReport] = useState(null);
  const [aiDecisionLogToShow, setAiDecisionLogToShow] = useState(null);

  // UI and visual effects state
  const [footerView, setFooterView] = useState('drones');
  const [isFooterOpen, setIsFooterOpen] = useState(true);
  const [recentlyHitDrones, setRecentlyHitDrones] = useState([]);
  const [arrowState, setArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [deck, setDeck] = useState({});

  // Ability and card interaction state
  const [abilityMode, setAbilityMode] = useState(null); // { drone, ability }
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);
  const [shipAbilityMode, setShipAbilityMode] = useState(null); // { sectionName, ability }
  const [shipAbilityConfirmation, setShipAbilityConfirmation] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null); // { card data }
  const [validCardTargets, setValidCardTargets] = useState([]); // [id1, id2, ...]
  const [cardConfirmation, setCardConfirmation] = useState(null); // { card, target }
  const [abilityConfirmation, setAbilityConfirmation] = useState(null);
  const [multiSelectState, setMultiSelectState] = useState(null); // To manage multi-step card effects

  // Upgrade system state
  const [destroyUpgradeModal, setDestroyUpgradeModal] = useState(null); // For targeting specific upgrades to destroy
  const [upgradeSelectionModal, setUpgradeSelectionModal] = useState(null); // For the new upgrade target selection modal
  const [viewUpgradesModal, setViewUpgradesModal] = useState(null); // To view applied upgrades on a drone card

  // Mandatory actions and special phases state
  const [mandatoryAction, setMandatoryAction] = useState(null); // e.g., { type: 'discard'/'destroy', player: getLocalPlayerId(), count: X }
  const [showMandatoryActionModal, setShowMandatoryActionModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(null); // For confirm/cancel popups
  const [cardSelectionModal, setCardSelectionModal] = useState(null); // For search and draw card selection

  // Shield reallocation state
  const [reallocationPhase, setReallocationPhase] = useState(null); // 'removing' | 'adding' | null
  const [shieldsToAdd, setShieldsToAdd] = useState(0);
  const [shieldsToRemove, setShieldsToRemove] = useState(0);
  const [originalShieldAllocation, setOriginalShieldAllocation] = useState(null);
  const [postRemovalShieldAllocation, setPostRemovalShieldAllocation] = useState(null); // For 'adding' phase reset
  const [initialShieldAllocation, setInitialShieldAllocation] = useState(null); // For shield allocation reset
  const [reallocationAbility, setReallocationAbility] = useState(null);

  // Phase and turn tracking for modal management
  const [lastTurnPhase, setLastTurnPhase] = useState(null); // Track last phase to detect phase transitions
  const [optionalDiscardCount, setOptionalDiscardCount] = useState(0); // Track number of optional discards during optionalDiscard phase


  // --- 3.3 REFS ---
  // useRef declarations for DOM manipulation and async operations.
  // CRITICAL: These refs are positioned AFTER gameState destructuring
  // to prevent "Cannot access before initialization" errors.
  const arrowLineRef = useRef(null);
  const droneRefs = useRef({});
  const sectionRefs = useRef({});
  const gameAreaRef = useRef(null);
  const isResolvingAttackRef = useRef(false);

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
  setCardVisuals,
  setCardReveals,
  setPhaseAnnouncements,
  setLaserEffects,
  setTeleportEffects,
  setPassNotifications
);
  // Refs for async operations (defined after gameState destructuring)

  // ========================================
  // SECTION 4: MANAGER SUBSCRIPTIONS
  // ========================================
  // Event-driven architecture setup. All managers are initialized and subscribed
  // to provide game flow coordination, AI processing, and state management.
  // This follows the dependency injection pattern for clean architecture.

  // --- 4.1 MANAGER INITIALIZATION ---
  // Initialize all game flow managers with proper dependency injection
  useEffect(() => {
    // Initialize GameFlowManager with managers and dependencies
    gameFlowManager.initialize(
      gameStateManager,
      gameStateManager.actionProcessor, // Use ActionProcessor instance from GameStateManager
      () => gameState.gameMode !== 'local',
      aiPhaseProcessor // Add AIPhaseProcessor for SequentialPhaseManager
    );


    console.log('🔧 GameFlowManager initialized');
  }, []); // Run once on component mount

  // SequentialPhaseManager removed - phase completion now handled by GameFlowManager via state monitoring

  // --- 4.2 EVENT SUBSCRIPTIONS ---

  // PhaseManager event listeners
  useEffect(() => {
    const handlePhaseEvent = (event) => {
      const { type, phase, playerId, data } = event;

      console.log(`🔔 App.jsx received PhaseManager event: ${type}`, { phase, playerId });

      if (type === 'phaseTransition') {
        // Handle phase transitions from GameFlowManager
        const { newPhase, previousPhase, firstPlayerResult } = event;
        console.log(`🔄 App.jsx handling phase transition: ${previousPhase} → ${newPhase}`);

        // Clear waiting modal when transitioning away from the waiting phase
        if (waitingForPlayerPhase === previousPhase) {
          setWaitingForPlayerPhase(null);
        }

        // First player determination is now handled automatically by GameFlowManager

        // Handle deployment complete phase
        if (newPhase === 'deploymentComplete') {
          console.log('🎯 Deployment complete phase started, showing modal');
          setShowDeploymentCompleteModal(true);
        }

      } else if (type === 'phaseComplete') {
        // Handle simultaneous phase completion
        console.log(`🎯 App.jsx handling phase completion: ${phase}`);

        // Clear waiting state when phase completes
        if (waitingForPlayerPhase === phase) {
          setWaitingForPlayerPhase(null);
        }

        // Handle specific phase completions
        if (phase === 'determineFirstPlayer') {
          // Both players have acknowledged first player determination
          console.log('✅ Both players acknowledged first player determination');
        }

        if (phase === 'deploymentComplete') {
          // Both players have acknowledged deployment complete
          console.log('✅ Both players acknowledged deployment complete');
        }

      }
    };

    // Subscribe to game flow manager for phase events
    const unsubscribeGameFlow = gameFlowManager.subscribe(handlePhaseEvent);

    return () => {
      unsubscribeGameFlow();
    };
  }, [isMultiplayer, getLocalPlayerId, setModalContent, waitingForPlayerPhase]);

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
    placedSections
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

  // Defensive check for hot reload scenarios where player states might be null
  if (!localPlayerState || !opponentPlayerState) {
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



  // --- 5.4 MULTIPLAYER PHASE SYNC HANDLER ---
  useEffect(() => {
    if (!isMultiplayer()) return;

    // Listen for phase completion messages from opponent
    const handleP2PData = (event) => {
      console.log('🔥 P2P Event received in App:', event);
      if (event.type === 'PHASE_COMPLETED') {
        const { phase } = event.data || event; // Handle both event.data and direct event
        console.log(`🔥 Opponent completed phase: ${phase}`);
      }
    };

    // Subscribe to P2P data events
    const unsubscribe = p2pManager.subscribe(handleP2PData);
    return unsubscribe;
  }, [isMultiplayer, p2pManager]);


  // addLogEntry is now provided by useGameState hook

  // --- 5.3 PERFORMANCE OPTIMIZED COMPUTED VALUES ---
  // Ship stats now use GameDataService for consistent caching with drone stats
  const localPlayerEffectiveStats = localPlayerState ? getEffectiveShipStats(localPlayerState, localPlacedSections) : null;
  const opponentPlayerEffectiveStats = opponentPlayerState ? getEffectiveShipStats(opponentPlayerState, opponentPlacedSections) : null;

  const totalLocalPlayerDrones = useMemo(() => {
    return localPlayerState ? Object.values(localPlayerState.dronesOnBoard).flat().length : 0;
  }, [localPlayerState?.dronesOnBoard]);

  const totalOpponentPlayerDrones = useMemo(() => {
    return opponentPlayerState ? Object.values(opponentPlayerState.dronesOnBoard).flat().length : 0;
  }, [opponentPlayerState?.dronesOnBoard]);

  // Sorted drone pool for deployment interface
  const sortedLocalActivePool = useMemo(() => {
    return [...localPlayerState.activeDronePool].sort((a, b) => {
      if (a.class !== b.class) {
        return a.class - b.class;
      }
      return a.name.localeCompare(b.name);
    });
  }, [localPlayerState.activeDronePool]);

  // Shield allocation calculations
  const canAllocateMoreShields = useMemo(() => {
    if (!localPlayerState) return false;
    return Object.keys(localPlayerState.shipSections).some(sectionName =>
        localPlayerState.shipSections[sectionName].allocatedShields < gameDataService.getEffectiveSectionMaxShields(sectionName, localPlayerState, localPlacedSections)
    );
  }, [localPlayerState.shipSections, localPlacedSections, gameDataService]);

  // ========================================
  // SECTION 6: EVENT HANDLERS
  // ========================================
  // User interaction handlers grouped by functionality for maintainability.
  // All handlers use useCallback for performance optimization.
  // Event handlers coordinate between UI actions and manager layer.

  // --- 6.0 GUEST ACTION ROUTING ---
  // Wrapper for processAction that routes guest actions to host
  // ========================================

  /**
   * Process action with guest mode routing
   * Guest sends actions to host, host/local process normally
   */
  const processActionWithGuestRouting = useCallback(async (type, payload) => {
    // Guest mode: Process locally for instant feedback AND send to host for authority
    if (gameState.gameMode === 'guest') {
      console.log('[GUEST] Processing action locally (optimistic) and sending to host:', type, payload);

      // Track this optimistic action for animation deduplication
      gameStateManager.trackOptimisticAction(type, payload);

      // Process action locally first for instant visual feedback (client-side prediction)
      const localResult = await processAction(type, payload);

      // Send to host for authoritative processing (parallel, non-blocking)
      // Host will broadcast authoritative state which will reconcile via applyHostState
      p2pManager.sendActionToHost(type, payload);

      // Return local result immediately so UI updates instantly
      return localResult;
    }

    // Host/Local mode: Process action normally
    return await processAction(type, payload);
  }, [gameState.gameMode, processAction, p2pManager, gameStateManager]);

  // --- 6.1 MULTIPLAYER PHASE SYNCHRONIZATION ---
  // Handlers for coordinating game phases in multiplayer mode
  // ========================================

  /**
   * Send phase completion message to opponent
   */
  const sendPhaseCompletion = useCallback((phase) => {
    console.log(`🔥 sendPhaseCompletion called for phase: ${phase}`);


    if (isMultiplayer()) {
      const message = {
        type: 'PHASE_COMPLETED',
        data: { phase }
      };
      console.log(`🔥 Sending phase completion message:`, message);
      p2pManager.sendData(message);
      console.log(`🔥 Sent phase completion: ${phase}`);
    } else {
      console.log(`🔥 Not multiplayer, skipping network send`);
    }
  }, [isMultiplayer, p2pManager]);

  // --- 6.2 UI EVENT HANDLERS ---

  const handleCloseAiCardReport = useCallback(async () => {
      // The turn ends only if the card doesn't grant another action.
      if (aiCardPlayReport && !aiCardPlayReport.card.effect.goAgain) {
          // Use ActionProcessor for turn transition instead of direct endTurn call
          await processActionWithGuestRouting('turnTransition', {
              newPlayer: getLocalPlayerId(),
              reason: 'aiCardReportClosed'
          });
      } else if (aiCardPlayReport && aiCardPlayReport.card.effect.goAgain && !winner) {
           // If AI can go again and game hasn't ended, the AI's turn continues.
           // Use ActionProcessor for player transition instead of direct setCurrentPlayer call
           await processActionWithGuestRouting('turnTransition', {
               newPlayer: getOpponentPlayerId(),
               reason: 'aiGoAgain'
           });
      }
      setAiCardPlayReport(null);
  }, [processAction, getLocalPlayerId, getOpponentPlayerId, aiCardPlayReport, winner]);

  /**
   * Handle reset shields button - removes all allocated shields
   */
  const handleResetShields = useCallback(async () => {
    await processActionWithGuestRouting('resetShields', {
      playerId: getLocalPlayerId()
    });
  }, [processActionWithGuestRouting, getLocalPlayerId]);

  /**
   * Handle confirm shields button - commits allocation
   */
  const handleConfirmShields = useCallback(async () => {
    // Commit allocation via ActionProcessor
    await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'allocateShields',
      actionData: { committed: true }
    });
  }, [processActionWithGuestRouting, getLocalPlayerId]);

  // ========================================
  // SECTION 7: GAME LOGIC FUNCTIONS
  // ========================================
  // Business logic wrappers that coordinate between UI and game engine.
  // These functions handle game rule execution, validation, and state updates.
  // All game logic is delegated to gameEngine for clean separation of concerns.

  // --- 7.1 PHASE TRANSITION FUNCTIONS ---

  // TODO: TECHNICAL DEBT - calculateAllValidTargets needed for multi-select targeting UI - no GameDataService equivalent
  useEffect(() => {
    const { validAbilityTargets, validCardTargets } = gameEngine.calculateAllValidTargets(
      abilityMode,
      shipAbilityMode,
      multiSelectState,
      selectedCard,
      localPlayerState,
      opponentPlayerState
    );

    setValidAbilityTargets(validAbilityTargets);
    setValidCardTargets(validCardTargets);

    // Clear conflicting selections
    if (abilityMode) {
      setSelectedCard(null);
      setShipAbilityMode(null);
    }
  }, [abilityMode, shipAbilityMode, selectedCard, localPlayerState, opponentPlayerState, multiSelectState]);

  /**
   * CANCEL ABILITY MODE
   * Cancels any active ability targeting mode and clears selections.
   * Resets UI state when player cancels an ability activation.
   */
  const cancelAbilityMode = () => {
    if (abilityMode) {
     setAbilityMode(null);
     setSelectedDrone(null);
    }
  };

  /**
   * CANCEL CARD SELECTION
   * Cancels active card selection and multi-select targeting modes.
   * Resets UI state when player cancels card play.
   */
  const cancelCardSelection = () => {
    setSelectedCard(null);
    setMultiSelectState(null);
  };

  // --- 7.2 COMBAT RESOLUTION ---

  /**
   * RESOLVE ATTACK
   * Processes drone-to-drone combat using ActionProcessor.
   * Handles animations, state updates, and turn transitions.
   * @param {Object} attackDetails - Attack configuration with attacker, target, damage

   */
  const resolveAttack = useCallback(async (attackDetails) => {
    // --- Prevent duplicate runs ---
    if (isResolvingAttackRef.current) {
        console.warn("Attack already in progress. Aborting duplicate call.");
        return;
    }
    isResolvingAttackRef.current = true;

    try {
        // Add a brief delay before attack animation starts
        await new Promise(resolve => setTimeout(resolve, 250));

        // Process attack through ActionProcessor (ActionProcessor handles state updates)
        const result = await processActionWithGuestRouting('attack', {
            attackDetails: attackDetails
        });

        // Check if interception decision is needed from human defender
        if (result?.needsInterceptionDecision) {
            console.log('🛡️ [APP] Interception decision needed, showing modal...');
            setPlayerInterceptionChoice(result.interceptionData);
            isResolvingAttackRef.current = false; // Allow interception modal to re-trigger attack
            return; // Stop processing until human makes decision
        }

        // All animations now handled by AnimationManager through ActionProcessor
        // No direct UI effects needed here - the animation pipeline handles everything

    } catch (error) {
        console.error('Error in resolveAttack:', error);
    } finally {
        // --- GUARANTEED CLEANUP (always runs) ---
        isResolvingAttackRef.current = false;
    }

}, [triggerExplosion, processAction, getLocalPlayerId, getOpponentPlayerId]);

  // --- 7.3 ABILITY RESOLUTION ---

  /**
   * RESOLVE ABILITY
   * Processes drone ability activation using ActionProcessor.
   * Updates game state and handles turn transitions.
   * @param {Object} ability - The ability being activated
   * @param {Object} userDrone - The drone using the ability
   * @param {Object} targetDrone - The target of the ability (if any)
   */
  const resolveAbility = useCallback(async (ability, userDrone, targetDrone) => {
    try {
      // Process ability through ActionProcessor
      const result = await processActionWithGuestRouting('ability', {
        droneId: userDrone.id,
        abilityIndex: userDrone.abilities.findIndex(a => a.name === ability.name),
        targetId: targetDrone?.id || null
      });

      cancelAbilityMode();
    } catch (error) {
      console.error('Error in resolveAbility:', error);
      cancelAbilityMode();
    }
  }, [processAction, getLocalPlayerId]);

  // --- 7.4 SHIP ABILITY RESOLUTION ---

  /**
   * RESOLVE SHIP ABILITY
   * Processes ship section ability activation using gameEngine logic.
   * Handles special UI flows like mandatory actions and shield reallocation.
   * @param {Object} ability - The ship ability being activated
   * @param {string} sectionName - Name of the ship section using the ability
   * @param {Object} target - The target of the ability (if any)
   */
  const resolveShipAbility = useCallback(async (ability, sectionName, target) => {
    // Use ActionProcessor instead of direct gameEngine call
    const result = await processActionWithGuestRouting('shipAbility', {
      ability: ability,
      sectionName: sectionName,
      targetId: target?.id || null,
      playerId: getLocalPlayerId()
    });

    // Handle UI state based on result
    if (result.mandatoryAction) {
        setMandatoryAction(result.mandatoryAction);
        setFooterView('hand');
        setIsFooterOpen(true);
        setShipAbilityMode(null);
        setShipAbilityConfirmation(null);
        return; // Exit early to prevent additional state changes
    }

    if (result.requiresShieldReallocation) {
        // Trigger shield reallocation UI (handled by existing reallocation system)
        setShipAbilityMode(null);
        setShipAbilityConfirmation(null);
        return; // Shield reallocation modal will handle the rest
    }

    // Standard cleanup for completed abilities
    setShipAbilityMode(null);
    setShipAbilityConfirmation(null);

    return result;
}, [processAction, getLocalPlayerId]);

  // --- 7.5 CARD RESOLUTION ---

  /**
   * RESOLVE CARD PLAY
   * Processes card activation using gameEngine logic.
   * Handles AI reporting, state updates, and chained effects.
   * @param {Object} card - The card being played
   * @param {Object} target - The target of the card (if any)
   * @param {string} actingPlayerId - getLocalPlayerId() or getOpponentPlayerId()
   * @param {Object} aiContext - AI decision context for logging
   */
  const resolveCardPlay = useCallback(async (card, target, actingPlayerId, aiContext = null) => {
    // Set up AI card play report if needed (before resolving, since ActionProcessor doesn't know about UI)
    if (actingPlayerId === getOpponentPlayerId()) {
        let targetDisplayName = '';
        let targetLane = '';

        if (target) {
            if (target.name) {
                targetDisplayName = target.name;

                // Find the lane for drone targets
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

    // Use ActionProcessor instead of direct gameEngine call
    const result = await processActionWithGuestRouting('cardPlay', {
      card: card,
      targetId: target?.id || null,
      playerId: actingPlayerId
    });

    // Check if card needs selection (e.g., SEARCH_AND_DRAW or MOVEMENT)
    if (result.needsCardSelection) {
        // Handle movement cards differently - use multiSelectState instead of modal
        if (result.needsCardSelection.type === 'single_move' || result.needsCardSelection.type === 'multi_move') {
            setMultiSelectState({
                card: result.needsCardSelection.card,
                phase: result.needsCardSelection.phase,
                selectedDrones: [],
                sourceLane: null
            });
            return; // Don't process other effects yet
        }

        // Handle other card selections (like SEARCH_AND_DRAW) with modal
        setCardSelectionModal({
            ...result.needsCardSelection,
            onConfirm: (selectedCards) => {
                // Handle the card selection, passing the updated player states that include energy costs
                handleCardSelection(selectedCards, result.needsCardSelection, card, target, actingPlayerId, aiContext, result.newPlayerStates);
                setCardSelectionModal(null);
            },
            onCancel: () => {
                // Return cards to deck and cancel
                setCardSelectionModal(null);
                if (actingPlayerId === getLocalPlayerId()) {
                    cancelCardSelection();
                    setCardConfirmation(null);
                }
            }
        });
        return; // Don't process other effects yet
    }

    // Handle UI cleanup for player cards
    if (actingPlayerId === getLocalPlayerId()) {
        cancelCardSelection();
        setCardConfirmation(null);
    }


    return result;
}, [processAction, getLocalPlayerId, localPlayerState, opponentPlayerState]);

  // --- 7.6 CARD SELECTION HANDLING ---

  /**
   * HANDLE CARD SELECTION
   * Processes the result of a card selection modal (e.g., SEARCH_AND_DRAW).
   * Updates deck state and applies the selected cards to the player's hand.
   */
  const handleCardSelection = useCallback((selectedCards, selectionData, originalCard, target, actingPlayerId, aiContext, playerStatesWithEnergyCosts = null) => {
    const { searchedCards, remainingDeck, discardPile, shuffleAfter } = selectionData;
    const unselectedCards = searchedCards.filter(card => {
      const cardIdentifier = card.instanceId || `${card.id}-${card.name}`;
      return !selectedCards.some(selected => {
        const selectedIdentifier = selected.instanceId || `${selected.id}-${selected.name}`;
        return selectedIdentifier === cardIdentifier;
      });
    });

    // Create updated player states
    // Use the player states that include energy costs if provided, otherwise fall back to current React state
    const basePlayerStates = playerStatesWithEnergyCosts || { player1: localPlayerState, player2: opponentPlayerState };
    const currentPlayer = actingPlayerId === getLocalPlayerId() ? basePlayerStates[getLocalPlayerId()] : basePlayerStates[getOpponentPlayerId()];
    const newHand = [...currentPlayer.hand, ...selectedCards];

    // Return unselected cards to top of deck in original order
    let newDeck = [...remainingDeck, ...unselectedCards];

    // Shuffle if required
    if (shuffleAfter) {
      newDeck = newDeck.sort(() => 0.5 - Math.random());
    }

    const updatedPlayer = {
      ...currentPlayer,
      deck: newDeck,
      hand: newHand,
      discardPile: discardPile
    };

    // Log the final selection
    addLogEntry({
      player: currentPlayer.name,
      actionType: 'CARD_SELECTION',
      source: originalCard.name,
      target: `Selected ${selectedCards.length} cards`,
      outcome: `Drew: ${selectedCards.map(c => c.name).join(', ')}`
    }, 'handleCardSelection', actingPlayerId === getOpponentPlayerId() ? aiContext : null);

    // Complete the card play by discarding the card and handling turn ending
    // Merge current player states (which have energy costs applied) with selection updates
    const currentStates = {
      [getLocalPlayerId()]: actingPlayerId === getLocalPlayerId() ? { ...currentPlayer, deck: updatedPlayer.deck, hand: updatedPlayer.hand, discardPile: updatedPlayer.discardPile } : basePlayerStates[getLocalPlayerId()],
      [getOpponentPlayerId()]: actingPlayerId === getOpponentPlayerId() ? { ...currentPlayer, deck: updatedPlayer.deck, hand: updatedPlayer.hand, discardPile: updatedPlayer.discardPile } : basePlayerStates[getOpponentPlayerId()]
    };

    // TODO: TECHNICAL DEBT - finishCardPlay completes card resolution after modal selection - critical game flow function
    const completion = gameEngine.finishCardPlay(originalCard, actingPlayerId, currentStates);

    // Apply final state updates through GameStateManager directly
    gameStateManager.setPlayerStates(completion.newPlayerStates.player1, completion.newPlayerStates.player2);

    // Handle UI cleanup
    if (actingPlayerId === getLocalPlayerId()) {
      cancelCardSelection();
      setCardConfirmation(null);
    }


  }, [localPlayerState, opponentPlayerState, addLogEntry]);

  // --- 7.7 MOVEMENT RESOLUTION ---

  /**
   * RESOLVE MULTI MOVE
   * Processes multi-drone movement cards through ActionProcessor.
   * @param {Object} card - The movement card being played
   * @param {Array} dronesToMove - Array of drones to move
   * @param {string} fromLane - Source lane ID
   * @param {string} toLane - Destination lane ID
   */
  const resolveMultiMove = useCallback(async (card, dronesToMove, fromLane, toLane) => {
    await processActionWithGuestRouting('movementCompletion', {
      card,
      movementType: 'multi_move',
      drones: dronesToMove,
      fromLane,
      toLane,
      playerId: getLocalPlayerId()
    });

    // Clean up UI state
    setMultiSelectState(null);
    cancelCardSelection();
  }, [processAction, getLocalPlayerId]);


  /**
   * RESOLVE SINGLE MOVE
   * Processes single-drone movement cards through ActionProcessor.
   * @param {Object} card - The movement card being played
   * @param {Object} droneToMove - The drone to move
   * @param {string} fromLane - Source lane ID
   * @param {string} toLane - Destination lane ID
   */
  const resolveSingleMove = useCallback(async (card, droneToMove, fromLane, toLane) => {
    await processActionWithGuestRouting('movementCompletion', {
      card,
      movementType: 'single_move',
      drones: [droneToMove],
      fromLane,
      toLane,
      playerId: getLocalPlayerId()
    });

    // Clean up UI state
    setMultiSelectState(null);
    cancelCardSelection();
  }, [processAction, getLocalPlayerId]);



  /**
   * HANDLE FOOTER BUTTON CLICK
   * Toggles footer panel visibility and switches between footer views.
   * Controls hand, drones, and other bottom panel displays.
   * @param {string} view - The footer view to display ('hand', 'drones', etc.)
   */
  const handleFooterButtonClick = (view) => {
    if (!isFooterOpen) {
     setIsFooterOpen(true);
     setFooterView(view);
    } else {
      if (footerView === view) {
       setIsFooterOpen(false);
      } else {
       setFooterView(view);
      }
    }
  };

  // ========================================
  // SECTION 8: EFFECT HOOKS
  // ========================================
  // Side effects and monitoring grouped by purpose for maintainability.
  // These useEffect hooks monitor game state changes and trigger automated responses.
  // Organized into game state monitoring, UI effects, and phase transition effects.

  // --- 8.1 TARGETING CALCULATIONS ---

  // TODO: TECHNICAL DEBT - calculateAllValidTargets needed for multi-select targeting UI - no GameDataService equivalent
  useEffect(() => {
    const { validAbilityTargets, validCardTargets } = gameEngine.calculateAllValidTargets(
      abilityMode,
      shipAbilityMode,
      multiSelectState,
      selectedCard,
      localPlayerState,
      opponentPlayerState
    );

    setValidAbilityTargets(validAbilityTargets);
    setValidCardTargets(validCardTargets);

    // Clear conflicting selections
    if (abilityMode) {
      setSelectedCard(null);
      setShipAbilityMode(null);
    }
  }, [abilityMode, shipAbilityMode, selectedCard, localPlayerState, opponentPlayerState, multiSelectState]);

  // --- 8.2 WIN CONDITION MONITORING ---
  // Win conditions are now checked automatically by ActionProcessor after attacks, abilities, and card plays
  // This effect shows the winner modal when a winner is detected
  useEffect(() => {
    if (winner && !showWinnerModal) {
      setShowWinnerModal(true);
    }
  }, [winner, showWinnerModal]);

  // --- 8.4 INTERCEPTION MONITORING ---
  // TODO: UI MONITORING - Interception monitoring is appropriate UI-only effect - calculates UI hints for user
  useEffect(() => {
    if (turnPhase === 'action') {
        const potential = gameEngine.calculatePotentialInterceptors(
            selectedDrone,
            localPlayerState,
            opponentPlayerState,
            getPlacedSectionsForEngine()
        );
        setPotentialInterceptors(potential);
    } else {
        setPotentialInterceptors([]);
    }
}, [selectedDrone, turnPhase, localPlayerState, opponentPlayerState, gameEngine, localPlacedSections, opponentPlacedSections]);

  // Monitor unified interceptionPending state for both AI and human defenders
  useEffect(() => {
    const localPlayerId = getLocalPlayerId();

    if (gameState.interceptionPending) {
      const { attackingPlayerId, defendingPlayerId, attackDetails, interceptors } = gameState.interceptionPending;

      // Show "opponent deciding" modal to attacker
      if (attackingPlayerId === localPlayerId) {
        setShowOpponentDecidingModal(true);
      }
      // Show interception choice modal to defender (human only, AI auto-decides)
      else if (defendingPlayerId === localPlayerId) {
        setPlayerInterceptionChoice({
          attackDetails,
          interceptors
        });
      }
    } else {
      // Clear both modals when interception complete
      setShowOpponentDecidingModal(false);
      setPlayerInterceptionChoice(null);
    }
  }, [gameState.interceptionPending, getLocalPlayerId]);

  // Monitor gameState.lastInterception for badge display only
  useEffect(() => {
    if (gameState.lastInterception) {
      const { interceptor, timestamp } = gameState.lastInterception;

      // Show intercepted badge on the intercepting drone
      setInterceptedBadge({
        droneId: interceptor.id,
        timestamp: timestamp
      });
    }
  }, [gameState.lastInterception]);


  useEffect(() => {
   setHoveredTarget(null);
  }, [selectedDrone]);

  // This hook now ONLY handles showing/hiding the arrow and setting its start point.
  // It only runs when the selected drone changes, not on every mouse move.
  useEffect(() => {
    if (selectedDrone && !abilityMode && turnPhase === 'action') {
        const startPos = getElementCenter(droneRefs.current[selectedDrone.id], gameAreaRef.current);
        if(startPos) {
            // Set state once to make the arrow visible and position its start point.
            setArrowState({ visible: true, start: startPos, end: { x: startPos.x, y: startPos.y } });
        }
    } else {
        // Set state once to hide the arrow.
        setArrowState(prev => ({ ...prev, visible: false }));
    }
  }, [selectedDrone, turnPhase, abilityMode]);

  // This hook handles updating the arrow's end position on every mouse move.
  // It does NOT set state, so it will not cause re-renders, fixing the animation bug.
  useEffect(() => {
    const handleMouseMove = (e) => {
        if (arrowState.visible && arrowLineRef.current && gameAreaRef.current) {
            const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
            const endX = e.clientX - gameAreaRect.left;
            const endY = e.clientY - gameAreaRect.top;

            // Directly update the line's end point attributes without causing a re-render
            arrowLineRef.current.setAttribute('x2', endX);
            arrowLineRef.current.setAttribute('y2', endY);
        }
    };

    const gameArea = gameAreaRef.current;
    gameArea?.addEventListener('mousemove', handleMouseMove);

    return () => {
        gameArea?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [arrowState.visible]); // This effect only re-runs when the arrow's visibility changes.

   // --- 8.5 DEFENSIVE STATE CLEANUP ---
  // Reset attack flag when critical game state changes to prevent infinite loops
  useEffect(() => {
    // Reset attack flag on turn changes or game reset
    if (winner) {
      if (isResolvingAttackRef.current) {
        console.log('[DEFENSIVE CLEANUP] Resetting stuck attack flag due to game state change');
        isResolvingAttackRef.current = false;
      }
    }
  }, [winner, turnPhase, currentPlayer]);

  // --- 8.6 GUEST RENDER NOTIFICATION ---
  // Notify GuestMessageQueueService when React has finished rendering (guest mode only)
  useEffect(() => {
    if (gameState.gameMode === 'guest') {
      console.log('✅ [GUEST RENDER] Emitting render_complete event');
      gameStateManager.emit('render_complete');
    }
  }, [gameState, gameStateManager]);

  /**
   * HANDLE RESET
   * Resets the entire game state back to initial conditions.
   * Clears all players, modals, selections, and game progress.
   */
  const handleReset = () => {
   // Reset using GameStateManager
   resetGame();
   // Reset attack flag to prevent stuck state
   isResolvingAttackRef.current = false;
   // Reset UI-only state (GameStateManager handles core game state)
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

  /**
   * HANDLE ALLOCATE SHIELD
   * Allocates a shield to a specific ship section.
   * Routes to appropriate manager based on current phase.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAllocateShield = async (sectionName) => {
    const { turnPhase } = gameState;

    if (turnPhase === 'allocateShields') {
      // Round start shield allocation - uses ActionProcessor addShield action
      await processActionWithGuestRouting('addShield', {
        sectionName: sectionName,
        playerId: getLocalPlayerId()
      });
    } else {
      // Action phase shield reallocation - uses ActionProcessor directly
      await processActionWithGuestRouting('reallocateShields', {
        action: 'add',
        sectionName: sectionName,
        playerId: getLocalPlayerId()
      });
    }
  };

  /**
   * HANDLE REMOVE SHIELD
   * Removes a shield from a section during shield reallocation.
   * Transfers removed shields to allocation pool.
   * @param {string} sectionName - Name of the section losing the shield
   */
  const handleRemoveShield = async (sectionName) => {
    if (shieldsToRemove <= 0) return;

    const section = localPlayerState.shipSections[sectionName];
    if (section.allocatedShields <= 0) return;

    // Use ActionProcessor for shield reallocation
    const result = await processActionWithGuestRouting('reallocateShields', {
      action: 'remove',
      sectionName: sectionName,
      playerId: getLocalPlayerId()
    });

    if (result.success) {
      setShieldsToRemove(prev => prev - 1);
      setShieldsToAdd(prev => prev + 1);
    }
  };

  /**
   * HANDLE ADD SHIELD
   * Adds a shield to a section during shield reallocation.
   * Validation is handled by ActionProcessor.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAddShield = async (sectionName) => {
    if (shieldsToAdd <= 0) return;

    // Use ActionProcessor for shield reallocation (validation handled there)
    const result = await processActionWithGuestRouting('reallocateShields', {
      action: 'add',
      sectionName: sectionName,
      playerId: getLocalPlayerId()
    });

    if (result.success) {
      setShieldsToAdd(prev => prev - 1);
    }
  };

  /**
   * HANDLE CONTINUE TO ADD PHASE
   * Transitions from shield removal to shield addition phase during reallocation.
   * Saves current shield state for 'adding' phase reset functionality.
   */
  const handleContinueToAddPhase = () => {
    // Save current shield state as the baseline for 'adding' phase resets
    setPostRemovalShieldAllocation(JSON.parse(JSON.stringify(localPlayerState.shipSections)));
    setReallocationPhase('adding');
  };

  /**
   * HANDLE RESET REALLOCATION
   * Resets shield reallocation to the start of the current phase.
   * - During 'removing': Restores original shields (pre-reallocation)
   * - During 'adding': Restores post-removal state (after removal, before addition)
   */
  const handleResetReallocation = async () => {
    if (reallocationPhase === 'removing') {
      // Reset to original pre-reallocation state
      await processActionWithGuestRouting('reallocateShields', {
        action: 'restore',
        originalShipSections: originalShieldAllocation,
        playerId: getLocalPlayerId()
      });

      // Reset counters to initial values
      setShieldsToRemove(reallocationAbility.ability.effect.value.maxShields);
      setShieldsToAdd(0);
    } else if (reallocationPhase === 'adding') {
      // Reset to post-removal state (before any shields were added)
      await processActionWithGuestRouting('reallocateShields', {
        action: 'restore',
        originalShipSections: postRemovalShieldAllocation,
        playerId: getLocalPlayerId()
      });

      // Reset shields to add counter (restore full amount)
      setShieldsToAdd(shieldsToRemove + shieldsToAdd);
    }
  };

  /**
   * HANDLE CANCEL REALLOCATION
   * Cancels shield reallocation and restores original state.
   * Clears all reallocation UI state.
   */
  const handleCancelReallocation = async () => {
    // Restore original shields using ActionProcessor
    await processActionWithGuestRouting('reallocateShields', {
      action: 'restore',
      originalShipSections: originalShieldAllocation,
      playerId: getLocalPlayerId()
    });

    // Clear reallocation state
    setReallocationPhase(null);
    setShieldsToRemove(0);
    setShieldsToAdd(0);
    setOriginalShieldAllocation(null);
    setPostRemovalShieldAllocation(null);
    setReallocationAbility(null);
  };

  /**
   * HANDLE CONFIRM REALLOCATION
   * Confirms shield reallocation and triggers ability resolution.
   * Shows final confirmation modal with energy deduction.
   */
  const handleConfirmReallocation = () => {
    // Show confirmation modal with energy deduction
    setShipAbilityConfirmation({
      ability: reallocationAbility.ability,
      sectionName: reallocationAbility.sectionName,
      target: null
    });
  };

  /**
   * HANDLE DEPLOYMENT COMPLETE ACKNOWLEDGMENT
   * Acknowledges deployment complete transition for the current player.
   * Triggers waiting state if opponent hasn't acknowledged yet.
   */
  const handleDeploymentCompleteAcknowledgment = async () => {
    console.log('🎯 App.jsx: Acknowledging deployment complete');

    const localPlayerId = getLocalPlayerId();
    const result = await processActionWithGuestRouting('acknowledgeDeploymentComplete', { playerId: localPlayerId });

    if (result.success) {
      setShowDeploymentCompleteModal(false);

      // Check if we need to show waiting state using fresh state from result
      const bothComplete = result.data?.bothPlayersComplete || false;
      if (!bothComplete) {
        // Show waiting state if opponent hasn't acknowledged (works for both single-player AI and multiplayer)
        setWaitingForPlayerPhase('deploymentComplete');
      }
    }
  };

  /**
   * HANDLE SHIP SECTION CLICK
   * Processes clicks on ship sections for shield allocation or reallocation.
   * Routes to appropriate handler based on current phase.
   * @param {string} sectionName - Name of the clicked ship section
   */
  const handleShipSectionClick = (sectionName) => {
    // Handle shield reallocation if active
    if (reallocationPhase) {
      if (reallocationPhase === 'removing') {
        handleRemoveShield(sectionName);
      } else if (reallocationPhase === 'adding') {
        handleAddShield(sectionName);
      }
      return;
    }

    // Handle normal shield allocation during allocateShields phase
    if (turnPhase === 'allocateShields') {
      handleAllocateShield(sectionName);
    }
  };
  
  /**
   * HANDLE RESET SHIELD ALLOCATION
   * Resets shield allocation back to initial state.
   * Restores original shield distribution.
   */
  const handleResetShieldAllocation = async () => {
    // Use ActionProcessor for all shield resets - routes to appropriate manager
    await processActionWithGuestRouting('resetShieldAllocation', {
      playerId: getLocalPlayerId()
    });
  };

  /**
   * HANDLE END ALLOCATION
   * Completes shield allocation phase and handles AI shield allocation.
   * Routes to appropriate manager based on current phase.
   */
  const handleEndAllocation = async () => {
    // Use ActionProcessor for all shield allocation endings - routes to appropriate manager
    await processActionWithGuestRouting('endShieldAllocation', {
      playerId: getLocalPlayerId()
    });
  };

  // ========================================
  // SHIELD ALLOCATION CONTEXT DETECTION
  // ========================================

  /**
   * HANDLE SHIELD ACTION
   * Smart routing for shield actions based on phase context.
   * Routes between round start (simultaneous) and action phase (sequential) handling.
   * @param {string} actionType - The shield action type
   * @param {Object} payload - Action payload data
   */
  const handleShieldAction = (actionType, payload) => {
    const phase = gameState.turnPhase;

    console.log(`🛡️ handleShieldAction: ${actionType} in phase ${phase}`);

    if (phase === 'allocateShields') {
      // Round start shield allocation - simultaneous phase processing
      console.log(`🛡️ Routing to round start shield handling (simultaneous)`);
      handleRoundStartShieldAction(actionType, payload);
    } else if (phase === 'action') {
      // Action phase shield reallocation - sequential phase processing
      console.log(`🛡️ Routing to action phase shield handling (sequential)`);
      processActionWithGuestRouting(actionType, payload);
    } else {
      console.warn(`⚠️ Shield action ${actionType} not valid for phase ${phase}`);
    }
  };

  /**
   * HANDLE ROUND START SHIELD ACTION
   * Processes shield actions during round start allocateShields phase.
   * Uses direct GameStateManager updates for simultaneous processing.
   * @param {string} actionType - The shield action type
   * @param {Object} payload - Action payload data
   */
  const handleRoundStartShieldAction = (actionType, payload) => {
    const { turnPhase } = gameState;

    // Validate we're in the correct phase
    if (turnPhase !== 'allocateShields') {
      console.warn(`⚠️ Round start shield action ${actionType} called during ${turnPhase} phase`);
      return;
    }

    console.log(`🛡️⚡ Processing round start shield action: ${actionType}`);

    try {
      switch (actionType) {
        case 'allocateShield':
          if (payload.sectionName) {
            handleAllocateShield(payload.sectionName);
          } else {
            console.error('allocateShield action missing sectionName in payload');
          }
          break;

        case 'resetShieldAllocation':
          handleResetShieldAllocation();
          break;

        case 'endShieldAllocation':
          handleEndAllocation();
          break;

        default:
          console.warn(`⚠️ Unknown round start shield action: ${actionType}`);
          break;
      }
    } catch (error) {
      console.error(`❌ Error processing round start shield action ${actionType}:`, error);
    }
  };

  // ========================================
  // PHASE-AWARE ACTION ROUTING
  // ========================================

  /**
   * HANDLE GAME ACTION
   * Phase-aware routing function that directs actions to appropriate handlers.
   * Routes based on phase type: sequential phases use ActionProcessor,
   * simultaneous phases use direct GameStateManager updates.
   * @param {string} actionType - The type of action to perform
   * @param {Object} payload - Action-specific data
   * @returns {Promise} Result of the action processing
   */
  const handleGameAction = async (actionType, payload) => {
    const phase = gameState.turnPhase;
    // TODO: FUTURE WORK - Could get phase type from GameFlowManager.getPhaseType() when available
    const isSequential = ['deployment', 'action'].includes(phase);

    console.log(`[PHASE ROUTING] ${actionType} in ${phase} → ${isSequential ? 'ActionProcessor' : 'Direct Update'}`);

    // Special case for shield actions
    if (actionType.includes('Shield') || actionType.includes('shield')) {
      console.log(`[SHIELD ROUTING] ${actionType} in ${phase} → ${phase === 'allocateShields' ? 'Round Start (Simultaneous)' : 'Action Phase (Sequential)'}`);
    }

    if (isSequential) {
      // Sequential phases: use ActionProcessor for serialized execution
      return await processActionWithGuestRouting(actionType, payload);
    } else {
      // Simultaneous phases: use direct updates for parallel execution
      return handleSimultaneousAction(actionType, payload);
    }
  };

  /**
   * HANDLE SIMULTANEOUS ACTION
   * Routes simultaneous phase actions to appropriate direct update functions.
   * Handles parallel player actions during setup and round start phases.
   * @param {string} actionType - The type of action to perform
   * @param {Object} payload - Action-specific data
   * @returns {Object} Result of the action processing
   */
  const handleSimultaneousAction = (actionType, payload) => {
    const { turnPhase } = gameState;

    console.log(`⚡ handleSimultaneousAction: ${actionType} in ${turnPhase} phase`);

    try {
      // Route based on action type and current phase
      switch (actionType) {
        // Shield allocation actions are now handled by ActionProcessor routing



        // Initial draw actions - now handled by GameFlowManager
        case 'drawCard':
        case 'confirmInitialHand':
          // These actions are no longer handled here - managed by phase system
          break;

        // Phase transitions are handled by GameFlowManager automatically
        // updateGameState actions should go through managers, not direct updates

        default:
          console.warn(`⚠️ Unhandled simultaneous action: ${actionType} in phase ${turnPhase}`);
          return {
            success: false,
            error: `No handler for simultaneous action: ${actionType} in phase ${turnPhase}`
          };
      }

      // If we get here, the action was not appropriate for the current phase
      return {
        success: false,
        error: `Action ${actionType} not valid for current phase ${turnPhase}`
      };
    } catch (error) {
      console.error(`❌ Error in handleSimultaneousAction:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // ========================================
  // ROUND START SEQUENCE
  // ========================================


  /**
   * WAIT FOR BOTH PLAYERS COMPLETE
   * Waits for both players to complete a simultaneous phase before proceeding.
   * Handles both local AI and multiplayer scenarios.
   * @param {string} phase - The phase to wait for completion
   * @returns {Promise} Resolves when both players are complete
   */
  const waitForBothPlayersComplete = async (phase) => {
    return new Promise((resolve, reject) => {
      console.log(`⏳ Waiting for both players to complete ${phase} phase`);

      // Set up timeout for safety (30 seconds max wait)
      const timeout = setTimeout(() => {
        console.warn(`⚠️ Timeout waiting for ${phase} completion`);
        resolve(); // Continue anyway to prevent game lockup
      }, 30000);

      const checkCompletion = () => {
        if (!isMultiplayer()) {
          // Single player mode - AI completion handled by SimultaneousActionManager
          console.log(`🤖 Single player mode: AI completion delegated to SimultaneousActionManager for ${phase}`);
          clearTimeout(timeout);
          resolve();
          return;
        }

        // Multiplayer mode - check if both players are ready
        if (areBothPlayersReady(phase)) {
          console.log(`✅ Both players completed ${phase} phase`);
          clearTimeout(timeout);
          resolve();
          return;
        }

        // Not ready yet - continue waiting
        console.log(`⏳ Still waiting for ${phase} completion`);
      };

      // Initial check
      checkCompletion();

      // Set up periodic checking for multiplayer
      if (isMultiplayer()) {
        const checkInterval = setInterval(() => {
          if (areBothPlayersReady(phase)) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            console.log(`✅ Both players completed ${phase} phase`);
            resolve();
          }
        }, 1000); // Check every second

        // Store interval for cleanup on timeout
        timeout._checkInterval = checkInterval;
      }
    });
  };


  /**
   * HANDLE IMPORT DECK
   * Imports deck from deck code string for quick deck building.
   * Validates deck format and card quantities.
   * @param {string} deckCode - Formatted deck code string
   */
  const handleImportDeck = (deckCode) => {
    try {
      const newDeck = {};
      const baseCardCounts = {};
      
      // 1. Parse the deck code string
      const entries = deckCode.split(',').filter(Boolean);
      for (const entry of entries) {
        const [cardId, quantityStr] = entry.split(':');
        const quantity = parseInt(quantityStr, 10);

        // 2. Validate the entry
        const cardTemplate = fullCardCollection.find(c => c.id === cardId);
        if (!cardTemplate || isNaN(quantity) || quantity <= 0 || quantity > cardTemplate.maxInDeck) {
          throw new Error(`Invalid entry for card "${cardId}".`);
        }
        
        // 3. Store the card and quantity
        newDeck[cardId] = quantity;

        // 4. Track counts for variants
        const baseId = cardTemplate.baseCardId;
        baseCardCounts[baseId] = (baseCardCounts[baseId] || 0) + quantity;
      }

      // 5. Final validation for shared limits (e.g., Laser Blast variants)
      for (const baseId in baseCardCounts) {
        const totalQuantity = baseCardCounts[baseId];
        const baseCard = fullCardCollection.find(c => c.baseCardId === baseId);
        if (totalQuantity > baseCard.maxInDeck) {
          throw new Error(`Exceeded max limit for "${baseCard.name}". Total is ${totalQuantity}, max is ${baseCard.maxInDeck}.`);
        }
      }

      // 6. If all checks pass, update the deck state
      setDeck(newDeck);
      return { success: true };

    } catch (error) {
      console.error("Deck import failed:", error);
      return { success: false, message: error.message };
    }
  };


  /**
   * HANDLE TOGGLE DRONE SELECTION
   * Toggles drone selection state during action phase.
   * Clears conflicting UI modes when selecting new drone.
   * @param {Object} drone - The drone being toggled
   */
  const handleToggleDroneSelection = (drone) => {
    if (passInfo[getLocalPlayerId() + 'Passed']) return;
    if (selectedDrone && selectedDrone.name === drone.name) {
     setSelectedDrone(null);
    } else {
     setSelectedDrone(drone);
     setAbilityMode(null);
     cancelCardSelection();
    }
  };

  /**
   * EXECUTE DEPLOYMENT
   * Executes drone deployment using ActionProcessor.
   * Handles deployment through proper action processing pipeline.
   * @param {string} lane - The lane to deploy the drone to
   */
  const executeDeployment = async (lane) => {
    try {
      // Use ActionProcessor for deployment
      const result = await processActionWithGuestRouting('deployment', {
        droneData: selectedDrone,
        laneId: lane,
        playerId: getLocalPlayerId(),
        turn: turn
      });

      if (result.success) {
        setSelectedDrone(null);
      } else {
        setModalContent({ title: result.error, text: result.message, isBlocking: true });
      }
    } catch (error) {
      console.error('Error executing deployment:', error);
      setModalContent({ title: 'Deployment Error', text: 'Failed to execute deployment', isBlocking: true });
    }
  };

  /**
   * HANDLE DEPLOY DRONE
   * Validates and initiates drone deployment to specified lane.
   * Shows confirmation for turn 1 deployments requiring energy.
   * @param {string} lane - The target lane for deployment
   */
  const handleDeployDrone = (lane) => {
    if (!selectedDrone || currentPlayer !== getLocalPlayerId() || passInfo[getLocalPlayerId() + 'Passed']) return;

    // For turn 1, we need cost information for confirmation modal
    if (turn === 1) {
      // TODO: UI VALIDATION - validateDeployment used for UI validation before deployment - appropriate for UI layer
      const validationResult = gameEngine.validateDeployment(localPlayerState, selectedDrone, turn, totalLocalPlayerDrones, localPlayerEffectiveStats);
      if (!validationResult.isValid) {
        setModalContent({ title: validationResult.reason, text: validationResult.message, isBlocking: true });
        return;
      }
      const { budgetCost, energyCost } = validationResult;
      if (energyCost > 0) {
        setDeploymentConfirmation({ lane, budgetCost, energyCost });
        return;
      }
    }

    // Execute deployment (handles its own validation)
    executeDeployment(lane);
  };


  /**
   * HANDLE PLAYER PASS
   * Processes player passing during deployment or action phase.
   * Manages turn transitions and phase ending logic.
   */
  const handlePlayerPass = async () => {
    if (passInfo[`${getLocalPlayerId()}Passed`]) return;

    await processActionWithGuestRouting('playerPass', {
      playerId: getLocalPlayerId(),
      playerName: localPlayerState.name,
      turnPhase: turnPhase,
      passInfo: passInfo,
      opponentPlayerId: getOpponentPlayerId()
    });
  };

  /**
   * HANDLE ABILITY ICON CLICK
   * Processes clicks on drone ability buttons.
   * Validates energy and exhaustion, handles targeting modes, and self-targeting abilities.
   * @param {Event} e - Click event
   * @param {Object} drone - The drone whose ability is being activated
   * @param {Object} ability - The ability being activated
   */
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

    // Check for self-targeting lane abilities ---
    if (ability.targeting?.type === 'LANE' && ability.targeting?.location === 'SAME_LANE') {
        // TODO: TECHNICAL DEBT - getLaneOfDrone gets lane of drone for ability targeting - utility function needed for UI logic
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
       setAbilityMode({ drone, ability });
       setSelectedDrone(drone);
       cancelCardSelection();
    }
  };
  
  /**
   * HANDLE SHIP ABILITY CLICK
   * Processes clicks on ship section ability buttons.
   * Handles targeting, energy validation, and special abilities like shield reallocation.
   * @param {Event} e - Click event
   * @param {Object} section - Ship section data
   * @param {Object} ability - Ship ability data
   */
  const handleShipAbilityClick = (e, section, ability) => {
    e.stopPropagation();
    if (turnPhase !== 'action' || !isMyTurn() || passInfo[`${getLocalPlayerId()}Passed`]) return;

    if (localPlayerState.energy < ability.cost.energy) {
        setModalContent({ title: "Not Enough Energy", text: `This ability costs ${ability.cost.energy} energy, but you only have ${localPlayerState.energy}.`, isBlocking: true });
        return;
    }

    // If the clicked ability is already active, cancel it.
    if (shipAbilityMode?.ability.id === ability.id) {
        setShipAbilityMode(null);
    } else {
        // If the ability has no target, handle it appropriately.
    if (!ability.targeting) {
        // Special handling for shield reallocation
        if (ability.effect.type === 'REALLOCATE_SHIELDS') {
            // Start reallocation mode without energy deduction
            setReallocationPhase('removing');
            setShieldsToRemove(ability.effect.value.maxShields);
            setShieldsToAdd(0);
            setOriginalShieldAllocation(JSON.parse(JSON.stringify(localPlayerState.shipSections)));
            setReallocationAbility({ ability, sectionName: section.name });
        } else {
            // Other non-targeted abilities resolve immediately
            setShipAbilityConfirmation({ ability, sectionName: section.name, target: null });
        }
    } else {
            // Otherwise, enter targeting mode for the new ability.
            setShipAbilityMode({ sectionName: section.name, ability });
            // Clear other selections to avoid conflicts.
            setSelectedDrone(null);
            cancelAbilityMode();
            cancelCardSelection();
        }
    }
};

  /**
   * HANDLE TOKEN CLICK
   * Main handler for drone token interactions including attacks, targeting, and selection.
   * Routes clicks to appropriate handlers based on game state and context.
   * @param {Event} e - Click event
   * @param {Object} token - Drone token data
   * @param {boolean} isPlayer - Whether token belongs to current player
   */
  const handleTokenClick = (e, token, isPlayer) => {
      e.stopPropagation();
      console.log(`--- handleTokenClick triggered for ${token.name} (isPlayer: ${isPlayer}) ---`);

      // NEW: Prioritize multi-move selection
      if (multiSelectState && multiSelectState.phase === 'select_drones' && isPlayer) {
          console.log("Action: Multi-move drone selection.");
          const { selectedDrones, maxSelection } = multiSelectState;
          const isAlreadySelected = selectedDrones.some(d => d.id === token.id);
          if (isAlreadySelected) {
              setMultiSelectState(prev => ({ ...prev, selectedDrones: prev.selectedDrones.filter(d => d.id !== token.id) }));
          } else if (selectedDrones.length < maxSelection) {
              setMultiSelectState(prev => ({ ...prev, selectedDrones: [...prev.selectedDrones, token] }));
          }
          return;
      }

      // 1. Handle targeting for an active card or ability
      if (validAbilityTargets.some(t => t.id === token.id) || validCardTargets.some(t => t.id === token.id)) {
          console.log("Action: Targeting for an active card/ability.");
          handleTargetClick(token, 'drone', isPlayer);
          return;
      }

      // 2. Handle standard attack logic directly
      if (turnPhase === 'action' && isMyTurn() && selectedDrone && !selectedDrone.isExhausted && !isPlayer) {
          console.log("Action: Attempting a standard attack.");
          console.log("Attacker selected:", selectedDrone.name, `(ID: ${selectedDrone.id})`);
          console.log("Target clicked:", token.name, `(ID: ${token.id})`);

          const [attackerLane] = Object.entries(localPlayerState.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];
          const [targetLane] = Object.entries(opponentPlayerState.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === token.id)) || [];
          
          console.log("Calculated Attacker Lane:", attackerLane);
          console.log("Calculated Target Lane:", targetLane);

          if (attackerLane && targetLane && attackerLane === targetLane) {
              console.log("SUCCESS: Lanes match. Checking for Guardian...");
              const opponentDronesInLane = opponentPlayerState.dronesOnBoard[targetLane];
              const hasGuardian = opponentDronesInLane.some(drone => {
                  const effectiveStats = getEffectiveStats(drone, targetLane);
                  return effectiveStats.keywords.has('GUARDIAN');
              });

              if (hasGuardian) {
                  console.log("FAILURE: Target is protected by a Guardian drone.");
                  setModalContent({ title: "Invalid Target", text: "This lane is protected by a Guardian drone. You must destroy it before targeting other drones.", isBlocking: true });
              } else {
                  console.log("SUCCESS: No Guardian. Processing attack...");
                  const attackDetails = { attacker: selectedDrone, target: token, targetType: 'drone', lane: attackerLane, attackingPlayer: getLocalPlayerId() };

                  // ActionProcessor will handle interception check
                  resolveAttack(attackDetails);
                  setSelectedDrone(null);
              }
          } else {
              console.log("FAILURE: Lanes do not match or could not be found.");
              setModalContent({ title: "Invalid Target", text: "You can only attack targets in the same lane.", isBlocking: true });
          }
          return;
      }

      // 3. Handle multi-move drone selection
      if (multiSelectState && multiSelectState.phase === 'select_drones' && isPlayer) {
          console.log("Action: Multi-move drone selection.");
          const { selectedDrones, maxSelection } = multiSelectState;
          const isAlreadySelected = selectedDrones.some(d => d.id === token.id);
          if (isAlreadySelected) {
              setMultiSelectState(prev => ({ ...prev, selectedDrones: prev.selectedDrones.filter(d => d.id !== token.id) }));
          } else if (selectedDrones.length < maxSelection) {
              setMultiSelectState(prev => ({ ...prev, selectedDrones: [...prev.selectedDrones, token] }));
          }
          return;
      }

      // 4. Handle mandatory destruction

      if (mandatoryAction?.type === 'destroy' && isPlayer) {
          console.log("Action: Mandatory destruction.");
          setConfirmationModal({
              type: 'destroy', target: token,
              onConfirm: () => handleConfirmMandatoryDestroy(token), onCancel: () => setConfirmationModal(null),
              text: `Are you sure you want to destroy your ${token.name}?`
          });
          return;
      }

      // 5. Handle selecting/deselecting one of your own drones
      if (isPlayer && turnPhase === 'action' && isMyTurn() && !passInfo[`${getLocalPlayerId()}Passed`]) {
          if (token.isExhausted) {
              console.log("Action prevented: Drone is exhausted.");
              return;
          }
          if (selectedDrone?.id === token.id) {
              console.log("Action: Deselecting drone", token.name);
              setSelectedDrone(null);
          } else {
              console.log("Action: Selecting drone", token.name);
              setSelectedDrone(token);
              cancelAbilityMode();
              cancelCardSelection();
          }
          return;
      }

      // 6. Fallback: show drone details
      console.log("Action: Fallback - showing drone details.");
      setDetailedDrone(token);
  };
  
  /**
   * HANDLE TARGET CLICK
   * Processes targeting for abilities, cards, and ship section attacks.
   * Routes to appropriate resolution based on active targeting mode.
   * @param {Object} target - The target being clicked
   * @param {string} targetType - Type of target ('drone', 'section', 'lane')
   * @param {boolean} isPlayer - Whether target belongs to current player
   */
  const handleTargetClick = (target, targetType, isPlayer) => {
      // This function will now ONLY handle targeting for cards and abilities.
      // Standard attack targeting is moved to handleTokenClick.

      if (shipAbilityMode && validAbilityTargets.some(t => t.id === target.id)) {
          setShipAbilityConfirmation({
              ability: shipAbilityMode.ability,
              sectionName: shipAbilityMode.sectionName,
              target: target
          });
          return;
      }
      if (abilityMode && validAbilityTargets.some(t => t.id === target.id)) {
          resolveAbility(abilityMode.ability, abilityMode.drone, target);
          return;
      }

      if (selectedCard && validCardTargets.some(t => t.id === target.id)) {
        const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
        setCardConfirmation({ card: selectedCard, target: { ...target, owner } });
        return;
      }

      // Handle standard ship section attacks
      if (turnPhase === 'action' && isMyTurn() && selectedDrone && !selectedDrone.isExhausted && !isPlayer && targetType === 'section') {
          console.log("Action: Attempting ship section attack.");
          console.log("Attacker selected:", selectedDrone.name, `(ID: ${selectedDrone.id})`);
          console.log("Target clicked:", target.name, `(Type: ${targetType})`);

          const [attackerLane] = Object.entries(localPlayerState.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];

          console.log("Calculated Attacker Lane:", attackerLane);

          if (attackerLane) {
              console.log("SUCCESS: Found attacker lane. Checking for Guardian...");
              const opponentDronesInLane = opponentPlayerState.dronesOnBoard[attackerLane];
              const hasGuardian = opponentDronesInLane && opponentDronesInLane.some(drone => {
                  const effectiveStats = getEffectiveStats(drone, attackerLane);
                  return effectiveStats.keywords.has('GUARDIAN');
              });

              if (hasGuardian) {
                  console.log("FAILURE: Ship section is protected by a Guardian drone.");
                  setModalContent({ title: "Invalid Target", text: "This lane is protected by a Guardian drone. You must destroy it before targeting the ship section.", isBlocking: true });
              } else {
                  console.log("SUCCESS: No Guardian. Processing attack...");
                  const attackDetails = { attacker: selectedDrone, target: target, targetType: 'section', lane: attackerLane, attackingPlayer: getLocalPlayerId() };

                  // ActionProcessor will handle interception check
                  resolveAttack(attackDetails);
                  setSelectedDrone(null);
              }
          } else {
              console.log("FAILURE: Could not determine attacker lane.");
              setModalContent({ title: "Invalid Attack", text: "Could not determine the attacking drone's lane.", isBlocking: true });
          }
          return;
      }

      // If no ability/card is active, clicking any drone just shows its details.
      if (targetType === 'drone') {
          setDetailedDrone(target);
      }
  };


  /**
   * HANDLE LANE CLICK
   * Processes clicks on battlefield lanes for deployment, movement, and targeting.
   * Routes to different handlers based on game phase and active modes.
   * @param {Event} e - Click event
   * @param {string} lane - Lane identifier (lane1, lane2, lane3)
   * @param {boolean} isPlayer - Whether lane belongs to current player
   */
  const handleLaneClick = (e, lane, isPlayer) => {
    // Stop the click from bubbling up to the main game area div
    e.stopPropagation();

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

    if (multiSelectState && isPlayer && validCardTargets.some(t => t.id === lane)) {
        const { phase, sourceLane, selectedDrones } = multiSelectState;
        
        if (phase === 'select_source_lane') {
            setMultiSelectState(prev => ({ ...prev, phase: 'select_drones', sourceLane: lane }));
            return;
        }

        if (phase === 'select_destination_lane') {
            resolveMultiMove(multiSelectState.card, selectedDrones, sourceLane, lane);
            return;
        }
    }

    if (multiSelectState && multiSelectState.card.effect.type === 'SINGLE_MOVE' && multiSelectState.phase === 'select_destination' && isPlayer) {
        if (validCardTargets.some(t => t.id === lane)) {
            resolveSingleMove(
                multiSelectState.card,
                multiSelectState.selectedDrone,
                multiSelectState.sourceLane,
                lane
            );
        }
        return;
    }

    if (selectedCard && selectedCard.targeting.type === 'LANE') {
        const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
        if (validCardTargets.some(t => t.id === lane && t.owner === owner)) {
            setCardConfirmation({ card: selectedCard, target: { id: lane, owner }});
            return; 
        }
    }

    if (selectedCard) {
      cancelCardSelection();
      return;
    }
    
    if (abilityMode) {
      cancelAbilityMode();
      return;
    }

    if (turnPhase === 'deployment' && isPlayer) {
      handleDeployDrone(lane);
    } else if (turnPhase === 'action' && isPlayer && selectedDrone) {
        const [sourceLaneName] = Object.entries(localPlayerState.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];
        if (!sourceLaneName) return;

        const sourceLaneIndex = parseInt(sourceLaneName.replace('lane', ''), 10);
        const targetLaneIndex = parseInt(lane.replace('lane', ''), 10);

        if (Math.abs(sourceLaneIndex - targetLaneIndex) === 1) {
           setMoveConfirmation({ drone: selectedDrone, from: sourceLaneName, to: lane });
        } else {
           setModalContent({ title: "Invalid Move", text: "Drones can only move to adjacent lanes.", isBlocking: true });
        }
    }
  };

  /**
   * HANDLE CARD CLICK
   * Processes clicks on cards in player's hand.
   * Handles different card types including movement, upgrades, and targeted effects.
   * @param {Object} card - The card being clicked
   */
  const handleCardClick = async (card) => {
    if (turnPhase !== 'action' || !isMyTurn() || passInfo[`${getLocalPlayerId()}Passed`]) return;
    if (localPlayerState.energy < card.cost) {
      return;
    }

    // Movement cards are now handled through resolveCardPlay -> needsCardSelection flow
    if (card.effect.type === 'MULTI_MOVE' || card.effect.type === 'SINGLE_MOVE') {
      if (multiSelectState && multiSelectState.card.instanceId === card.instanceId) {
        cancelCardSelection();
      } else {
        // Immediately process card play (no target needed for movement cards)
        await resolveCardPlay(card, null, getLocalPlayerId());
      }
      return;
    }

    if (selectedCard?.instanceId === card.instanceId) {
      cancelCardSelection();
    } else if (card.name === 'System Sabotage') {
        // TODO: TECHNICAL DEBT - getValidTargets gets valid targets for special cards - required for card targeting UI
        const validTargets = gameEngine.getValidTargets(getLocalPlayerId(), null, card, localPlayerState, opponentPlayerState);
        setDestroyUpgradeModal({ card, targets: validTargets, opponentState: opponentPlayerState });
        setSelectedCard(null);
        setAbilityMode(null);
        setSelectedDrone(null);
    } else if (card.type === 'Upgrade') {
        // TODO: TECHNICAL DEBT - getValidTargets gets valid targets for upgrade cards - required for upgrade targeting UI
        const validTargets = gameEngine.getValidTargets(getLocalPlayerId(), null, card, localPlayerState, opponentPlayerState);
        if (validTargets.length > 0) {
            setUpgradeSelectionModal({ card, targets: validTargets });
            setSelectedCard(null);
            setAbilityMode(null);
            setSelectedDrone(null);
        } else {
            setModalContent({ title: "No Valid Targets", text: `There are no drone types that can accept the '${card.name}' upgrade right now.`, isBlocking: true });
        }
    } else {
        if (!card.targeting) {
            setCardConfirmation({ card, target: null });
            setSelectedCard(null);
            setAbilityMode(null);
            setSelectedDrone(null);
        } else {
            setSelectedCard(card);
            setSelectedDrone(null);
            setAbilityMode(null);
        }
    }
  };

  
  /**
   * HANDLE CONFIRM MANDATORY DISCARD
   * Processes confirmed mandatory card discard.
   * Manages discard count and phase transitions.
   * @param {Object} card - The card being discarded
   */
  const handleConfirmMandatoryDiscard = async (card) => {
    // Capture the current state before any updates
    const currentMandatoryAction = mandatoryAction;

    // Use ActionProcessor for proper state management (ActionProcessor handles logging)
    await processActionWithGuestRouting('optionalDiscard', {
        playerId: getLocalPlayerId(),
        cardsToDiscard: [card],
        isMandatory: true
    });

    // Clear the confirmation modal immediately
    setConfirmationModal(null);

    // Decide the next action based on the state we captured
    const newCount = currentMandatoryAction.count - 1;
    if (newCount <= 0) {
        setMandatoryAction(null);
        if (!currentMandatoryAction.fromAbility) {
            // Mandatory discard completed, let game flow continue naturally
            // The GameFlowManager will handle the transition to the next phase
        }
    } else {
        // If more discards are needed, just update the count
        setMandatoryAction(prev => ({ ...prev, count: newCount }));
    }
  };

  /**
   * HANDLE ROUND START DISCARD
   * Processes optional discard during optionalDiscard phase.
   * Updates local discard count and calls ActionProcessor for state management.
   * @param {Object} card - The card being discarded
   */
  const handleRoundStartDiscard = async (card) => {
    // Use ActionProcessor for proper state management (ActionProcessor handles logging)
    await processActionWithGuestRouting('optionalDiscard', {
      playerId: getLocalPlayerId(),
      cardsToDiscard: [card],
      isMandatory: false
    });

    // Increment optional discard count
    setOptionalDiscardCount(prev => prev + 1);

    // Clear confirmation modal
    setConfirmationModal(null);
  };

  /**
   * HANDLE ROUND START DRAW
   * Completes the optionalDiscard phase by committing and transitioning to draw phase.
   * Resets the optional discard count for the next round.
   */
  const handleRoundStartDraw = async () => {
    console.log('[OPTIONAL DISCARD] Player completing optional discard phase');

    // Reset discard count for next round
    setOptionalDiscardCount(0);

    // Commit completion of optionalDiscard phase
    await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'optionalDiscard',
      actionData: { completed: true }
    });
  };

  /**
   * CHECK BOTH PLAYERS HAND LIMIT COMPLETE
   * Checks if both players have completed the optionalDiscard phase.
   * Used to determine if phase can advance to draw.
   * @returns {boolean} True if both players have committed
   */
  const checkBothPlayersHandLimitComplete = () => {
    const commitmentStatus = gameStateManager.actionProcessor?.getPhaseCommitmentStatus('optionalDiscard');
    console.log('[OPTIONAL DISCARD] Commitment status:', commitmentStatus);
    return commitmentStatus?.bothComplete || false;
  };

  /**
   * HANDLE CONFIRM MANDATORY DESTROY
   * Processes confirmed mandatory drone destruction during mandatoryDroneRemoval phase.
   * Uses ActionProcessor architecture for proper multiplayer synchronization.
   * Handles both player destruction and AI opponent compliance checking.
   * @param {Object} drone - The drone being destroyed
   */
  const handleConfirmMandatoryDestroy = async (drone) => {
    // Use ActionProcessor to handle destruction (supports multiplayer routing)
    const result = await processActionWithGuestRouting('destroyDrone', {
      droneId: drone.id,
      playerId: getLocalPlayerId()
    });

    if (!result.success) {
      console.error('Failed to destroy drone:', result.error);
      return;
    }

    setMandatoryAction(prev => {
      const newCount = prev.count - 1;
      if (newCount <= 0) {
        // Check if opponent (AI in single-player) also needs to destroy drones
        const p2IsOver = totalOpponentPlayerDrones > opponentPlayerEffectiveStats.totals.cpuLimit;
        if (p2IsOver && gameState.gameMode === 'local') {
          // In single-player mode, handle AI opponent destruction
          const dronesToDestroyCount = Object.values(opponentPlayerState.dronesOnBoard).flat().length -
                                       getEffectiveShipStats(opponentPlayerState, opponentPlacedSections).totals.cpuLimit;

          // Destroy AI drones one by one using ActionProcessor
          for (let i = 0; i < dronesToDestroyCount; i++) {
            const allDrones = Object.entries(opponentPlayerState.dronesOnBoard)
              .flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));

            if (allDrones.length === 0) break;

            const lowestClass = Math.min(...allDrones.map(d => d.class));
            const candidates = allDrones.filter(d => d.class === lowestClass);
            const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];

            // Use ActionProcessor for AI drone destruction too
            processActionWithGuestRouting('destroyDrone', {
              droneId: droneToDestroy.id,
              playerId: getOpponentPlayerId()
            });
          }
        }
        // In multiplayer mode, opponent handles their own mandatory destruction
        return null;
      }
      return { ...prev, count: newCount };
    });
    setConfirmationModal(null);
  };


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

  // ========================================
  // SECTION 9: RENDER
  // ========================================
  // Main component render with clean component composition.
  // Uses extracted sub-components for maintainability and separation of concerns.
  // All UI state and event handlers are passed down as props for reactive updates.

  return (
    <div className="h-screen text-white font-sans overflow-hidden flex flex-col relative" ref={gameAreaRef} onClick={() => { cancelAbilityMode(); cancelCardSelection(); }}>
     <SpaceBackground />
     <TargetingArrow visible={arrowState.visible} start={arrowState.start} end={arrowState.end} lineRef={arrowLineRef} />
     {explosions.map(exp => <ExplosionEffect key={exp.id} top={exp.top} left={exp.left} size={exp.size} />)}
     {flyingDrones.map(fd => (

      <FlyingDrone
        key={fd.id}
        droneData={fd.droneData}
        startPos={fd.startPos}
        endPos={fd.endPos}
        config={fd.config}
        onComplete={fd.onComplete}
      />
    ))}
    {flashEffects.map(flash => (
      <FlashEffect
        key={flash.id}
        position={flash.position}
        color={flash.color}
        intensity={flash.intensity}
        onComplete={flash.onComplete}
      />
    ))}
    {cardVisuals.map(visual => (
      <CardVisualEffect
        key={visual.id}
        visualType={visual.visualType}
        startPos={visual.startPos}
        endPos={visual.endPos}
        duration={visual.duration}
        onComplete={visual.onComplete}
      />
    ))}
    {cardReveals.map(reveal => (
      <CardRevealOverlay
        key={reveal.id}
        card={reveal.card}
        label={reveal.label}
        onComplete={reveal.onComplete}
      />
    ))}
    {phaseAnnouncements.map(announcement => (
      <PhaseAnnouncementOverlay
        key={announcement.id}
        phaseText={announcement.phaseText}
        subtitle={announcement.subtitle}
        onComplete={announcement.onComplete}
      />
    ))}
    {passNotifications.map(notification => (
      <PassNotificationOverlay
        key={notification.id}
        label={notification.label}
        onComplete={notification.onComplete}
      />
    ))}
    {laserEffects.map(laser => (
      <LaserEffect
        key={laser.id}
        startPos={laser.startPos}
        endPos={laser.endPos}
        attackValue={laser.attackValue}
        duration={laser.duration}
        onComplete={laser.onComplete}
      />
    ))}
    {teleportEffects.map(teleport => (
      <TeleportEffect
        key={teleport.id}
        top={teleport.top}
        left={teleport.left}
        color={teleport.color}
        duration={teleport.duration}
        onComplete={teleport.onComplete}
      />
    ))}
    {animationBlocking && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          cursor: 'not-allowed',
          pointerEvents: 'all',
          backgroundColor: 'transparent'
        }}
      />
    )}

      <GameHeader
        localPlayerState={localPlayerState}
        opponentPlayerState={opponentPlayerState}
        localPlayerEffectiveStats={localPlayerEffectiveStats}
        opponentPlayerEffectiveStats={opponentPlayerEffectiveStats}
        turnPhase={turnPhase}
        turn={turn}
        passInfo={passInfo}
        firstPlayerOfRound={firstPlayerOfRound}
        shieldsToAllocate={shieldsToAllocate}
        opponentShieldsToAllocate={opponentShieldsToAllocate}
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
        handleReset={handleReset}
        handleResetShields={handleResetShields}
        handleConfirmShields={handleConfirmShields}
        handleCancelReallocation={handleCancelReallocation}
        handleResetReallocation={handleResetReallocation}
        handleContinueToAddPhase={handleContinueToAddPhase}
        handleConfirmReallocation={handleConfirmReallocation}
        mandatoryAction={mandatoryAction}
        multiSelectState={multiSelectState}
        AI_HAND_DEBUG_MODE={AI_HAND_DEBUG_MODE}
        setShowAiHandModal={setShowAiHandModal}
        onShowDebugModal={() => setShowDebugModal(true)}
      />

      {/* Transparent Overlay - Blocks interaction during opponent's turn */}
      {!isMyTurn() && (turnPhase === 'deployment' || turnPhase === 'action') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'transparent',
            zIndex: 40,
            cursor: 'not-allowed'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <GameBattlefield
        localPlayerState={localPlayerState}
        opponentPlayerState={opponentPlayerState}
        localPlacedSections={localPlacedSections}
        opponentPlacedSections={opponentPlacedSections}
        selectedCard={selectedCard}
        validCardTargets={validCardTargets}
        abilityMode={abilityMode}
        validAbilityTargets={validAbilityTargets}
        multiSelectState={multiSelectState}
        turnPhase={turnPhase}
        reallocationPhase={reallocationPhase}
        shipAbilityMode={shipAbilityMode}
        hoveredTarget={hoveredTarget}
        selectedDrone={selectedDrone}
        recentlyHitDrones={recentlyHitDrones}
        potentialInterceptors={potentialInterceptors}
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
        setHoveredTarget={setHoveredTarget}
        interceptedBadge={interceptedBadge}
      />

      <GameFooter
        localPlayerState={localPlayerState}
        localPlayerEffectiveStats={localPlayerEffectiveStats}
        sortedLocalActivePool={sortedLocalActivePool}
        gameLog={gameLog}
        footerView={footerView}
        isFooterOpen={isFooterOpen}
        multiSelectState={multiSelectState}
        selectedCard={selectedCard}
        turnPhase={turnPhase}
        mandatoryAction={mandatoryAction}
        handleFooterButtonClick={handleFooterButtonClick}
        handleCardClick={handleCardClick}
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
        passInfo={passInfo}
        validCardTargets={validCardTargets}
        gameEngine={gameEngine}
        opponentPlayerState={opponentPlayerState}
        setAiDecisionLogToShow={setAiDecisionLogToShow}
        optionalDiscardCount={optionalDiscardCount}
        handleRoundStartDraw={handleRoundStartDraw}
        handleRoundStartDiscard={handleRoundStartDiscard}
        checkBothPlayersHandLimitComplete={checkBothPlayersHandLimitComplete}
      />

      {/* Modals are unaffected and remain at the end */}
      {modalContent && <GamePhaseModal title={modalContent.title} text={modalContent.text} onClose={modalContent.onClose === null ? null : (modalContent.onClose || (() => setModalContent(null)))}>{modalContent.children}</GamePhaseModal>}
      <DeploymentCompleteModal
        show={showDeploymentCompleteModal}
        firstPlayerOfRound={firstPlayerOfRound}
        localPlayerId={getLocalPlayerId()}
        localPlayerName={localPlayerState.name}
        opponentPlayerName={opponentPlayerState.name}
        onContinue={handleDeploymentCompleteAcknowledgment}
      />
      <RoundEndModal
        show={showRoundEndModal}
        onContinue={() => setShowRoundEndModal(false)}
      />
      <WaitingForPlayerModal
        show={!!waitingForPlayerPhase}
        phase={waitingForPlayerPhase}
        opponentName={opponentPlayerState.name}
        roomCode={p2pManager.roomCode}
      />
      <DeploymentConfirmationModal
        deploymentConfirmation={deploymentConfirmation}
        show={!!deploymentConfirmation}
        onCancel={() => setDeploymentConfirmation(null)}
        onConfirm={async () => {
          if (!deploymentConfirmation) return;
          const { lane } = deploymentConfirmation;
          setDeploymentConfirmation(null);
          await executeDeployment(lane);
        }}
      />
      <MoveConfirmationModal
        moveConfirmation={moveConfirmation}
        show={!!moveConfirmation}
        onCancel={() => setMoveConfirmation(null)}
        onConfirm={async () => {
          if (!moveConfirmation) return;
          const { drone, from, to } = moveConfirmation;

          await processActionWithGuestRouting('move', {
            droneId: drone.id,
            fromLane: from,
            toLane: to,
            playerId: getLocalPlayerId()
          });

          setMoveConfirmation(null);
          setSelectedDrone(null);
        }}
      />
      <AttackInterceptedModal
        interceptionModal={interceptionModal}
        show={!!interceptionModal}
        onClose={interceptionModal?.onClose}
      />
                    
      <InterceptionOpportunityModal
        choiceData={playerInterceptionChoice}
        show={!!playerInterceptionChoice}
        onIntercept={async (interceptor) => {
          // Store attack details before closing modal
          const attackDetails = { ...playerInterceptionChoice.attackDetails, interceptor };

          // Close modal UI immediately (ActionProcessor will clear interceptionPending state)
          setPlayerInterceptionChoice(null);

          // Wait for modal to unmount/fade out before resolving attack
          setTimeout(async () => {
            await resolveAttack(attackDetails);
          }, 400); // Delay to allow modal to close
        }}
        onDecline={async () => {
          // Store attack details before closing modal
          const attackDetails = { ...playerInterceptionChoice.attackDetails, interceptor: null };

          // Close modal UI immediately (ActionProcessor will clear interceptionPending state)
          setPlayerInterceptionChoice(null);

          // Wait for modal to unmount/fade out before resolving attack
          setTimeout(async () => {
            await resolveAttack(attackDetails);
          }, 400); // Delay to allow modal to close
        }}
        gameEngine={gameEngine}
        turnPhase={turnPhase}
        isMyTurn={isMyTurn}
        passInfo={passInfo}
        getLocalPlayerId={getLocalPlayerId}
        localPlayerState={localPlayerState}
        shipAbilityMode={shipAbilityMode}
        droneRefs={droneRefs}
        mandatoryAction={mandatoryAction}
      />
      <OpponentDecidingInterceptionModal
        show={showOpponentDecidingModal}
        opponentName={opponentPlayerState?.name || 'Opponent'}
      />
      <DetailedDroneModal isOpen={!!detailedDrone} drone={detailedDrone} onClose={() => setDetailedDrone(null)} />
      {aiCardPlayReport && <AICardPlayReportModal report={aiCardPlayReport} onClose={() => setAiCardPlayReport(null)} />}
      <AIDecisionLogModal
        decisionLog={aiDecisionLogToShow}
        show={!!aiDecisionLogToShow}
        onClose={() => setAiDecisionLogToShow(null)}
        getLocalPlayerId={getLocalPlayerId}
      />

      <WinnerModal
        winner={winner}
        localPlayerId={getLocalPlayerId()}
        show={winner && showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
      />

      <MandatoryActionModal
        mandatoryAction={mandatoryAction}
        effectiveStats={localPlayerEffectiveStats}
        show={mandatoryAction && showMandatoryActionModal}
        onClose={() => setShowMandatoryActionModal(false)}
      />
      <ConfirmationModal
        confirmationModal={confirmationModal}
        show={!!confirmationModal}
      />

      {/* Upgrade-related modals consolidated into ModalContainer */}
      <ModalContainer
        viewUpgradesModal={viewUpgradesModal}
        setViewUpgradesModal={setViewUpgradesModal}
        destroyUpgradeModal={destroyUpgradeModal}
        setDestroyUpgradeModal={setDestroyUpgradeModal}
        upgradeSelectionModal={upgradeSelectionModal}
        setUpgradeSelectionModal={setUpgradeSelectionModal}
        resolveCardPlay={resolveCardPlay}
        getLocalPlayerId={getLocalPlayerId}
        cancelCardSelection={cancelCardSelection}
      />

      <CardConfirmationModal
        cardConfirmation={cardConfirmation}
        show={!!cardConfirmation}
        onCancel={() => setCardConfirmation(null)}
        onConfirm={async () => {
          // Store card details before closing modal
          const card = cardConfirmation.card;
          const target = cardConfirmation.target;

          // Close modal immediately
          setCardConfirmation(null);

          // Wait for modal to unmount/fade out before resolving card play
          setTimeout(async () => {
            await resolveCardPlay(card, target, getLocalPlayerId());
          }, 400); // Delay to allow modal to close
        }}
      />

      <DroneAbilityConfirmationModal
        abilityConfirmation={abilityConfirmation}
        show={!!abilityConfirmation}
        onCancel={() => setAbilityConfirmation(null)}
        onConfirm={() => {
          resolveAbility(abilityConfirmation.ability, abilityConfirmation.drone, abilityConfirmation.target);
          setAbilityConfirmation(null);
        }}
      />



      <AIHandDebugModal
        opponentPlayerState={opponentPlayerState}
        show={showAiHandModal}
        debugMode={AI_HAND_DEBUG_MODE}
        onClose={() => setShowAiHandModal(false)}
      />

      <GameDebugModal
        show={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        gameStateManager={gameStateManager}
        gameDataService={gameDataService}
      />

      {/* Renders the modal for viewing the deck */}
      <CardViewerModal 
        isOpen={isViewDeckModalOpen} 
        onClose={() => setIsViewDeckModalOpen(false)} 
        cards={localPlayerState.deck}
        title="Remaining Cards in Deck"
        shouldSort={true}
      />

      {/* Renders the modal for viewing the discard pile */}
      <CardViewerModal
        isOpen={isViewDiscardModalOpen}
        onClose={() => setIsViewDiscardModalOpen(false)}
        cards={localPlayerState.discardPile}
        title="Discard Pile"
        shouldSort={false}
      />

      {/* Card Selection Modal for SEARCH_AND_DRAW effects */}
      <CardSelectionModal
        isOpen={!!cardSelectionModal}
        onClose={cardSelectionModal?.onCancel || (() => setCardSelectionModal(null))}
        onConfirm={cardSelectionModal?.onConfirm || (() => {})}
        selectionData={cardSelectionModal}
      />
      <ShipAbilityConfirmationModal
        shipAbilityConfirmation={shipAbilityConfirmation}
        show={!!shipAbilityConfirmation}
        onCancel={() => setShipAbilityConfirmation(null)}
        onConfirm={async () => await resolveShipAbility(shipAbilityConfirmation.ability, shipAbilityConfirmation.sectionName, shipAbilityConfirmation.target)}
      />


      {/* Waiting Overlay for multiplayer */}
      <WaitingOverlay
        isVisible={false} // NOTE: Currently disabled - using transparent overlay instead (see lines 2406-2415)
        currentPlayer={currentPlayer}
        gameMode={gameState.gameMode}
        roomCode={p2pManager.roomCode}
        lastAction={null} // NOTE: lastAction not tracked in current implementation
        localPlayerState={localPlayerState}
        opponentPlayerState={opponentPlayerState}
        getLocalPlayerId={getLocalPlayerId}
      />
    </div>
  );

};


export default App;