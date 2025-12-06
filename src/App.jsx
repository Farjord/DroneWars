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
import GamePhaseModal from './components/ui/GamePhaseModal.jsx';
import GameHeader from './components/ui/GameHeader.jsx';
import GameBattlefield from './components/ui/GameBattlefield.jsx';
import GameFooter from './components/ui/GameFooter.jsx';
import HandView from './components/ui/footer/HandView.jsx';
import DronesView from './components/ui/footer/DronesView.jsx';
import FloatingCardControls from './components/ui/FloatingCardControls.jsx';
import LogModal from './components/modals/LogModal.jsx';
import ModalContainer from './components/ui/ModalContainer.jsx';
import TargetingArrow from './components/ui/TargetingArrow.jsx';
import ExplosionEffect from './components/animations/ExplosionEffect.jsx';
import WaitingOverlay from './components/ui/WaitingOverlay';
import InterceptedBadge from './components/ui/InterceptedBadge.jsx';
import FailedRunLoadingScreen from './components/ui/FailedRunLoadingScreen.jsx';

// --- 1.3 MODAL COMPONENT IMPORTS ---
import CardViewerModal from './components/modals/CardViewerModal';
import CardSelectionModal from './components/modals/CardSelectionModal';
import AICardPlayReportModal from './components/modals/AICardPlayReportModal.jsx';
import DetailedDroneModal from './components/modals/debug/DetailedDroneModal.jsx';
import WaitingForPlayerModal from './components/modals/WaitingForPlayerModal.jsx';
import ConfirmationModal from './components/modals/ConfirmationModal.jsx';
import MandatoryActionModal from './components/modals/MandatoryActionModal.jsx';
import WinnerModal from './components/modals/WinnerModal.jsx';
import AIDecisionLogModal from './components/modals/AIDecisionLogModal.jsx';
import ViewShipSectionModal from './components/modals/ViewShipSectionModal.jsx';
import DeploymentConfirmationModal from './components/modals/DeploymentConfirmationModal.jsx';
import MoveConfirmationModal from './components/modals/MoveConfirmationModal.jsx';
import InterceptionOpportunityModal from './components/modals/InterceptionOpportunityModal.jsx';
import OpponentDecidingInterceptionModal from './components/modals/OpponentDecidingInterceptionModal.jsx';
import CardConfirmationModal from './components/modals/CardConfirmationModal.jsx';
import DroneAbilityConfirmationModal from './components/modals/DroneAbilityConfirmationModal.jsx';
import ShipAbilityConfirmationModal from './components/modals/ShipAbilityConfirmationModal.jsx';
import AIHandDebugModal from './components/modals/AIHandDebugModal.jsx';
import GameDebugModal from './components/modals/GameDebugModal.jsx';
import OpponentDronesModal from './components/modals/OpponentDronesModal.jsx';
import GlossaryModal from './components/modals/GlossaryModal.jsx';
import AIStrategyModal from './components/modals/AIStrategyModal.jsx';
import AddCardToHandModal from './components/modals/AddCardToHandModal.jsx';
import CardDetailModal from './components/modals/CardDetailModal.jsx';
import AbandonRunModal from './components/modals/AbandonRunModal.jsx';

// --- 1.4 HOOK IMPORTS ---
import { useGameState } from './hooks/useGameState';
import { useGameData } from './hooks/useGameData';
import { useExplosions } from './hooks/useExplosions';
import { useAnimationSetup } from './hooks/useAnimationSetup';

// --- 1.5 DATA/LOGIC IMPORTS ---
import fullCardCollection from './data/cardData.js';
import { gameEngine } from './logic/gameLogic.js';
import { calculatePotentialInterceptors } from './logic/combat/InterceptionProcessor.js';
import TargetingRouter from './logic/TargetingRouter.js';
import ExtractionController from './logic/singlePlayer/ExtractionController.js';
import { BACKGROUNDS, DEFAULT_BACKGROUND, getBackgroundById } from './config/backgrounds.js';

// --- 1.6 MANAGER/STATE IMPORTS ---
// Note: gameFlowManager is initialized in AppRouter and accessed via gameStateManager
import aiPhaseProcessor from './managers/AIPhaseProcessor.js';
import p2pManager from './network/P2PManager.js';
// ActionProcessor is created internally by GameStateManager

// --- 1.7 UTILITY IMPORTS ---
import { getElementCenter } from './utils/gameUtils.js';
import { debugLog } from './utils/debugLogger.js';
import { calculateAllValidTargets } from './utils/uiTargetingHelpers.js';
import DEV_CONFIG from './config/devConfig.js';
import SeededRandom from './utils/seededRandom.js';

// --- 1.8 ANIMATION IMPORTS ---
import AnimationManager from './managers/AnimationManager.js';
import FlyingDrone from './components/animations/FlyingDrone.jsx';
import FlashEffect from './components/animations/FlashEffect.jsx';
import HealEffect from './components/animations/HealEffect.jsx';
import CardVisualEffect from './components/animations/CardVisualEffect.jsx';
import CardRevealOverlay from './components/animations/CardRevealOverlay.jsx';
import ShipAbilityRevealOverlay from './components/animations/ShipAbilityRevealOverlay.jsx';
import PassNotificationOverlay from './components/animations/PassNotificationOverlay.jsx';
import PhaseAnnouncementOverlay from './components/animations/PhaseAnnouncementOverlay.jsx';
import LaserEffect from './components/animations/LaserEffect.jsx';
import TeleportEffect from './components/animations/TeleportEffect.jsx';
import OverflowProjectile from './components/animations/OverflowProjectile.jsx';
import SplashEffect from './components/animations/SplashEffect.jsx';
import BarrageImpact from './components/animations/BarrageImpact.jsx';
import RailgunTurret from './components/animations/RailgunTurret.jsx';
import RailgunBeam from './components/animations/RailgunBeam.jsx';

// Initialize TargetingRouter for card targeting validation
const targetingRouter = new TargetingRouter();

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
  const AI_HAND_DEBUG_MODE = DEV_CONFIG.features.aiHandDebug; // Controlled by DEV_CONFIG
  const RACE_CONDITION_DEBUG = true; // Set to false to disable race condition monitoring

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
  const [animationBlocking, setAnimationBlocking] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [deploymentConfirmation, setDeploymentConfirmation] = useState(null);
  const [moveConfirmation, setMoveConfirmation] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [cardToView, setCardToView] = useState(null);
  const [waitingForPlayerPhase, setWaitingForPlayerPhase] = useState(null); // Track which phase we're waiting for player acknowledgment
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isViewDeckModalOpen, setIsViewDeckModalOpen] = useState(false);
  const [isViewDiscardModalOpen, setIsViewDiscardModalOpen] = useState(false);
  const [showOpponentDronesModal, setShowOpponentDronesModal] = useState(false);

  // Player selection and targeting state
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);

  // Combat and attack state
  const [playerInterceptionChoice, setPlayerInterceptionChoice] = useState(null);
  const [potentialInterceptors, setPotentialInterceptors] = useState([]);
  const [potentialGuardians, setPotentialGuardians] = useState([]);
  const [showOpponentDecidingModal, setShowOpponentDecidingModal] = useState(false); // For attacker waiting on defender
  const [interceptedBadge, setInterceptedBadge] = useState(null); // { droneId, timestamp }

  // AI behavior and reporting state
  const [aiCardPlayReport, setAiCardPlayReport] = useState(null);
  const [aiDecisionLogToShow, setAiDecisionLogToShow] = useState(null);

  // UI and visual effects state
  const [footerView, setFooterView] = useState('hand');
  const [isFooterOpen, setIsFooterOpen] = useState(true); // For classic footer only
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [recentlyHitDrones, setRecentlyHitDrones] = useState([]);
  const [arrowState, setArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [deck, setDeck] = useState({});

  // Background selection state - persisted to localStorage
  const [selectedBackground, setSelectedBackground] = useState(() => {
    return localStorage.getItem('gameBackground') || DEFAULT_BACKGROUND;
  });

  // Ability and card interaction state
  const [abilityMode, setAbilityMode] = useState(null); // { drone, ability }
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);
  const [shipAbilityMode, setShipAbilityMode] = useState(null); // { sectionName, ability }
  const [shipAbilityConfirmation, setShipAbilityConfirmation] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null); // { card data }
  const [validCardTargets, setValidCardTargets] = useState([]); // [id1, id2, ...]
  const [cardConfirmation, setCardConfirmation] = useState(null); // { card, target }
  const [abilityConfirmation, setAbilityConfirmation] = useState(null);

  // Multi-select state with logged setter for debugging
  const [multiSelectStateRaw, setMultiSelectStateRaw] = useState(null); // To manage multi-step card effects
  const multiSelectState = multiSelectStateRaw;
  const setMultiSelectState = useCallback((value) => {
    const timestamp = performance.now();
    const isFunction = typeof value === 'function';

    debugLog('BUTTON_CLICKS', '🔴 setMultiSelectState CALLED', {
      timestamp,
      valueType: typeof value,
      isUpdaterFunction: isFunction,
      directValue: isFunction ? 'UPDATER_FUNCTION' : value,
      callStack: new Error().stack.split('\n').slice(2, 4).join('\n')
    });

    setMultiSelectStateRaw(value);
  }, []);

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
  const [pendingShieldChanges, setPendingShieldChanges] = useState({}); // Tracks pending shield changes: { sectionName: delta }
  const [postRemovalPendingChanges, setPostRemovalPendingChanges] = useState({}); // Snapshot of pending changes after removal phase

  // Phase and turn tracking for modal management
  const [lastTurnPhase, setLastTurnPhase] = useState(null); // Track last phase to detect phase transitions
  const [optionalDiscardCount, setOptionalDiscardCount] = useState(0); // Track number of optional discards during optionalDiscard phase

  // Pending shield allocation state (privacy: keep allocations local until confirmed)
  const [pendingShieldAllocations, setPendingShieldAllocations] = useState({}); // { sectionName: count }
  const [pendingShieldsRemaining, setPendingShieldsRemaining] = useState(null); // Remaining shields to allocate


  // --- 3.3 REFS ---
  // useRef declarations for DOM manipulation and async operations.
  // CRITICAL: These refs are positioned AFTER gameState destructuring
  // to prevent "Cannot access before initialization" errors.
  const arrowLineRef = useRef(null);
  const droneRefs = useRef({});
  const sectionRefs = useRef({});
  const gameAreaRef = useRef(null);
  const isResolvingAttackRef = useRef(false);
  const previousPhaseRef = useRef(null); // Track previous turnPhase for guest phase detection
  const roundStartCascadeTriggered = useRef(false); // Prevent duplicate round start cascade triggers
  const deploymentToActionTriggered = useRef(false); // Prevent duplicate deployment → action triggers
  // NOTE: enteredMandatoryDiscardWithExcess and enteredMandatoryRemovalWithExcess refs REMOVED
  // Auto-completion for mandatory phases is now handled consistently by GameFlowManager.autoCompleteUnnecessaryCommitments()

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
  setOverflowProjectiles,
  setSplashEffects,
  setBarrageImpacts,
  setRailgunTurrets,
  setRailgunBeams
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

  // PhaseManager event listeners
  useEffect(() => {
    // Only subscribe to GameFlowManager on host/local - guest uses state-watching (Section 8.7)
    if (gameState.gameMode === 'guest') return;

    const handlePhaseEvent = (event) => {
      const { type, phase, playerId, data } = event;

      debugLog('PHASE_TRANSITIONS', `🔔 App.jsx received PhaseManager event: ${type}`, { phase, playerId });

      if (type === 'bothPlayersComplete') {
        // Handle both players completing a simultaneous phase
        const { phase: completedPhase } = event;
        debugLog('PHASE_TRANSITIONS', `🎯 Both players completed phase: ${completedPhase}`);

        // Clear waiting overlay immediately when both players complete
        if (waitingForPlayerPhase === completedPhase) {
          debugLog('PHASE_TRANSITIONS', `✅ Clearing waiting overlay immediately for completed phase: ${completedPhase}`);
          setWaitingForPlayerPhase(null);
        }
      }

      if (type === 'phaseTransition') {
        // Handle phase transitions from GameFlowManager
        const { newPhase, previousPhase, firstPlayerResult } = event;
        debugLog('PHASE_TRANSITIONS', `🔄 App.jsx handling phase transition: ${previousPhase} → ${newPhase}`);

        // Clear waiting modal when transitioning away from the waiting phase
        debugLog('PHASE_TRANSITIONS', `🔍 Waiting overlay check: waitingForPlayerPhase="${waitingForPlayerPhase}", previousPhase="${previousPhase}", match=${waitingForPlayerPhase === previousPhase}`);
        if (waitingForPlayerPhase === previousPhase) {
          debugLog('PHASE_TRANSITIONS', `✅ Clearing waiting overlay for phase: ${previousPhase}`);
          setWaitingForPlayerPhase(null);
        } else if (waitingForPlayerPhase) {
          debugLog('PHASE_TRANSITIONS', `⚠️ Waiting overlay NOT cleared: waiting for "${waitingForPlayerPhase}" but transition is from "${previousPhase}"`);
        }

        // First player determination is now handled automatically by GameFlowManager
      }
    };

    // Subscribe to game flow manager for phase events (host/local only)
    const unsubscribeGameFlow = gameStateManager.gameFlowManager?.subscribe(handlePhaseEvent);

    return () => {
      unsubscribeGameFlow();
    };
  }, [isMultiplayer, getLocalPlayerId, setModalContent, waitingForPlayerPhase, gameState.gameMode]);

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
      debugLog('MULTIPLAYER', '🔥 P2P Event received in App:', event);
      if (event.type === 'PHASE_COMPLETED') {
        const { phase } = event.data || event; // Handle both event.data and direct event
        debugLog('MULTIPLAYER', `🔥 Opponent completed phase: ${phase}`);
      }
      // Host-only: Handle sync requests from guest
      if (event.type === 'sync_requested' && gameStateManager.isHost()) {
        debugLog('MULTIPLAYER', '🔄 Guest requested full state sync - sending response');
        const currentState = gameStateManager.getState();
        p2pManager.sendFullSyncResponse(currentState);
      }
    };

    // Subscribe to P2P data events
    const unsubscribe = p2pManager.subscribe(handleP2PData);
    return unsubscribe;
  }, [isMultiplayer, p2pManager, gameStateManager]);

  // Initialize pending shield allocations when entering allocateShields phase
  useEffect(() => {
    if (turnPhase === 'allocateShields' && shieldsToAllocate > 0) {
      // Initialize pending state from current allocations
      const currentAllocations = {};
      if (localPlayerState?.shipSections) {
        Object.entries(localPlayerState.shipSections).forEach(([sectionName, section]) => {
          if (section.allocatedShields > 0) {
            currentAllocations[sectionName] = section.allocatedShields;
          }
        });
      }
      setPendingShieldAllocations(currentAllocations);
      setPendingShieldsRemaining(shieldsToAllocate);
      debugLog('SHIELD_CLICKS', '🆕 Initialized pending shield allocations', {
        currentAllocations,
        shieldsToAllocate
      });
    }
  }, [turnPhase, shieldsToAllocate, localPlayerState]);

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

  // Opponent's selected drone cards (from drone selection phase)
  const opponentSelectedDrones = useMemo(() => {
    return gameState.commitments?.droneSelection?.[getOpponentPlayerId()]?.drones || [];
  }, [gameState.commitments?.droneSelection, getOpponentPlayerId]);

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

  // DISABLED: Render-based logging causes excessive noise on every App render
  // debugLog('HAND_VIEW', '🔍 mandatoryAction calculation:', {
  //   turnPhase,
  //   isInMandatoryDiscardPhase,
  //   localPlayerId,
  //   commitments: gameState.commitments,
  //   hasCommittedDiscard,
  //   excessCards,
  //   willSetMandatoryAction: isInMandatoryDiscardPhase && !hasCommittedDiscard
  // });

  // UI flags for mandatory actions
  const shouldShowDiscardUI = isInMandatoryDiscardPhase && !hasCommittedDiscard && excessCards > 0;
  const shouldShowRemovalUI = isInMandatoryRemovalPhase && !hasCommittedRemoval && excessDrones > 0;

  // ========================================
  // SECTION 6: EVENT HANDLERS
  // ========================================
  // User interaction handlers grouped by functionality for maintainability.
  // All handlers use useCallback for performance optimization.
  // Event handlers coordinate between UI actions and manager layer.

  // --- 6.0 GUEST ACTION ROUTING ---
  // Wrapper for processAction that routes guest actions to host
  // ========================================

  // ALL ACTIONS NOW OPTIMISTIC - Guest processes locally with animation tracking
  // Host remains authoritative via validation at milestone phases
  const HOST_ONLY_ACTIONS = [];

  /**
   * Process action with guest mode routing
   * Guest sends actions to host, host/local process normally
   */
  const processActionWithGuestRouting = useCallback(async (type, payload) => {
    // Guest mode: Route actions to host
    if (gameState.gameMode === 'guest') {
      const isHostOnly = HOST_ONLY_ACTIONS.includes(type);

      if (isHostOnly) {
        // Host-only actions: ONLY send to host, do NOT process locally
        // These actions require both players' state and have guest guards in ActionProcessor
        debugLog('MULTIPLAYER', '🔒 [GUEST HOST-ONLY] Sending action to host (no local processing):', type);
        p2pManager.sendActionToHost(type, payload);

        // Return success - actual state will arrive via host broadcast
        return { success: true, hostProcessing: true };
      }

      // Optimistic actions: Process locally for instant feedback AND send to host
      debugLog('MULTIPLAYER', '🔮 [GUEST OPTIMISTIC] Processing action locally and sending to host:', type);

      // Send to host IMMEDIATELY for authoritative processing (zero delay)
      // Host receives action while guest processes locally - parallel execution
      debugLog('MULTIPLAYER', '📤 [GUEST OPTIMISTIC] Sending action to host immediately (before local processing):', type);
      p2pManager.sendActionToHost(type, payload);

      // Process action locally for instant visual feedback (client-side prediction)
      debugLog('ANIMATIONS', '🎬 [GUEST OPTIMISTIC] About to process action locally (will generate animations)');
      const localResult = await processAction(type, payload);
      debugLog('ANIMATIONS', '✅ [GUEST OPTIMISTIC] Local processing complete (animations should have played)');

      // Track animations from this optimistic action for fine-grained deduplication
      if (localResult.animations) {
        gameStateManager.trackOptimisticAnimations(localResult.animations);
        const status = gameStateManager.optimisticActionService.getStatus();
        debugLog('OPTIMISTIC', '🔮 [SERVICE] Tracked optimistic animations:', {
          type,
          actionCount: localResult.animations.actionAnimations?.length || 0,
          systemCount: localResult.animations.systemAnimations?.length || 0,
          totalActionTracked: status.actionAnimationsTracked,
          totalSystemTracked: status.systemAnimationsTracked
        });
      }

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
    debugLog('MULTIPLAYER', `🔥 sendPhaseCompletion called for phase: ${phase}`);


    if (isMultiplayer()) {
      const message = {
        type: 'PHASE_COMPLETED',
        data: { phase }
      };
      debugLog('MULTIPLAYER', `🔥 Sending phase completion message:`, message);
      p2pManager.sendData(message);
      debugLog('MULTIPLAYER', `🔥 Sent phase completion: ${phase}`);
    } else {
      debugLog('MULTIPLAYER', `🔥 Not multiplayer, skipping network send`);
    }
  }, [isMultiplayer, p2pManager]);

  // --- 6.2 UI EVENT HANDLERS ---

  const handleBackgroundChange = useCallback((backgroundId) => {
    setSelectedBackground(backgroundId);
    localStorage.setItem('gameBackground', backgroundId);
  }, []);

  const handleViewShipSection = useCallback((sectionData) => {
    setViewShipSectionModal(sectionData);
  }, []);

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
  }, [processActionWithGuestRouting, getLocalPlayerId, getOpponentPlayerId, aiCardPlayReport, winner]);

  /**
   * Handle reset shields button - removes all allocated shields
   */
  const handleResetShields = useCallback(async () => {
    // Reset pending allocations to empty (all shields back to pool)
    setPendingShieldAllocations({});
    setPendingShieldsRemaining(shieldsToAllocate);

    debugLog('SHIELD_CLICKS', '🔄 Reset pending shield allocations', {
      shieldsToAllocate
    });
  }, [shieldsToAllocate]);

  /**
   * Handle showing opponent's selected drones modal
   */
  const handleShowOpponentDrones = useCallback(() => {
    setShowOpponentDronesModal(true);
  }, []);

  /**
   * Handle confirm shields button - commits allocation
   */
  const handleConfirmShields = useCallback(async () => {
    debugLog('COMMITMENTS', '🏁 handleConfirmShields called');
    debugLog('SHIELD_CLICKS', '🔵 Confirm Shields button clicked');

    // Commit allocation via ActionProcessor with all pending allocations
    const result = await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'allocateShields',
      actionData: {
        committed: true,
        shieldAllocations: pendingShieldAllocations  // Send all pending allocations at once
      }
    });

    debugLog('COMMITMENTS', '🏁 Shield allocation commitment result:', {
      hasData: !!result.data,
      bothPlayersComplete: result.data?.bothPlayersComplete,
      shieldAllocations: pendingShieldAllocations,
      fullResult: result
    });
    debugLog('SHIELD_CLICKS', '📥 Commitment result:', result);

    // Unified logic: Check opponent commitment status directly from state
    const commitments = gameState.commitments || {};
    const phaseCommitments = commitments.allocateShields || {};
    const opponentCommitted = phaseCommitments[getOpponentPlayerId()]?.completed;

    debugLog('SHIELD_CLICKS', '🔍 Checking opponent commitment:', {
      hasCommitments: !!commitments,
      hasPhaseCommitments: !!phaseCommitments,
      opponentCommitted
    });

    if (!opponentCommitted) {
      debugLog('COMMITMENTS', '✋ Opponent not committed yet, showing waiting overlay');
      debugLog('SHIELD_CLICKS', '⏳ Setting waiting overlay');
      setWaitingForPlayerPhase('allocateShields');
    } else {
      debugLog('COMMITMENTS', '✅ Both players complete, no waiting overlay');
      debugLog('SHIELD_CLICKS', '✅ Both players committed, proceeding');
    }
  }, [processActionWithGuestRouting, getLocalPlayerId, gameState.commitments, getOpponentPlayerId, pendingShieldAllocations]);

  /**
   * HANDLE CANCEL MULTI MOVE
   * Cancels multi-move card selection and clears state
   */
  const handleCancelMultiMove = useCallback(() => {
    setMultiSelectState(null);
    setValidCardTargets([]);
    setSelectedCard(null);
  }, []);

  /**
   * HANDLE CONFIRM MULTI MOVE DRONES
   * Transitions from drone selection to destination lane selection
   */
  const handleConfirmMultiMoveDrones = useCallback(() => {
    debugLog('CARD_PLAY', '🔵 MULTI_MOVE: handleConfirmMultiMoveDrones called', { timestamp: performance.now() });
    debugLog('CARD_PLAY', '   Current multiSelectState:', multiSelectState);

    if (!multiSelectState) {
      debugLog('CARD_PLAY', '   ❌ Early return: multiSelectState is null/undefined');
      return;
    }

    if (multiSelectState.selectedDrones.length === 0) {
      debugLog('CARD_PLAY', '   ❌ Early return: No drones selected');
      return;
    }

    debugLog('CARD_PLAY', '   ✅ Validation passed. Selected drones:', multiSelectState.selectedDrones.length);

    // Calculate valid destination lanes (all lanes except source)
    const validDestinations = ['lane1', 'lane2', 'lane3']
      .filter(laneId => laneId !== multiSelectState.sourceLane)
      .map(laneId => ({ id: laneId, owner: getLocalPlayerId() }));

    debugLog('CARD_PLAY', '   📍 Calculated validDestinations:', validDestinations);
    debugLog('BUTTON_CLICKS', '   🔄 About to call setValidCardTargets (manual)', { timestamp: performance.now(), validDestinations });
    setValidCardTargets(validDestinations);
    debugLog('BUTTON_CLICKS', '   ✅ setValidCardTargets (manual) returned', { timestamp: performance.now() });

    debugLog('BUTTON_CLICKS', '   🔄 About to call setMultiSelectState', { timestamp: performance.now() });
    setMultiSelectState(prev => {
      const newState = { ...prev, phase: 'select_destination_lane' };
      debugLog('CARD_PLAY', '   ✅ New multiSelectState:', newState);
      return newState;
    });
    debugLog('BUTTON_CLICKS', '   ✅ setMultiSelectState returned', { timestamp: performance.now() });

    debugLog('CARD_PLAY', '   ✅ handleConfirmMultiMoveDrones completed', { timestamp: performance.now() });
  }, [multiSelectState, getLocalPlayerId]);

  // ========================================
  // SECTION 7: GAME LOGIC FUNCTIONS
  // ========================================
  // Business logic wrappers that coordinate between UI and game engine.
  // These functions handle game rule execution, validation, and state updates.
  // All game logic is delegated to gameEngine for clean separation of concerns.

  // --- 7.1 PHASE TRANSITION FUNCTIONS ---

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

  /**
   * CANCEL ALL ACTIONS
   * Master cancellation function that clears ALL active action states.
   * Called when starting a new action to ensure only one action is in progress at a time.
   * Provides consistent UX where initiating any action cancels all other pending actions.
   */
  const cancelAllActions = () => {
    // Cancel attack selection
    if (selectedDrone) setSelectedDrone(null);

    // Cancel ability modes
    if (abilityMode) {
      setAbilityMode(null);
    }
    if (shipAbilityMode) {
      setShipAbilityMode(null);
    }

    // Cancel card selection
    if (selectedCard || multiSelectState) {
      setSelectedCard(null);
      setMultiSelectState(null);
    }

    // Cancel shield reallocation (async but non-blocking)
    if (reallocationPhase) {
      handleCancelReallocation();
    }

    // Cancel confirmation modals
    if (abilityConfirmation) setAbilityConfirmation(null);
    if (shipAbilityConfirmation) setShipAbilityConfirmation(null);
    if (cardConfirmation) setCardConfirmation(null);
    if (deploymentConfirmation) setDeploymentConfirmation(null);
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
            debugLog('COMBAT', '🛡️ [APP] Interception decision needed, checking if local player is defender...');

            // Only show modal if local player is the defender
            const attackingPlayerId = result.interceptionData.attackDetails.attackingPlayer;
            const defendingPlayerId = attackingPlayerId === 'player1' ? 'player2' : 'player1';
            const localPlayerId = getLocalPlayerId();

            if (defendingPlayerId === localPlayerId) {
                debugLog('COMBAT', '🛡️ [APP] Local player is defender, showing interception modal');
                setPlayerInterceptionChoice(result.interceptionData);
                isResolvingAttackRef.current = false; // Allow interception modal to re-trigger attack
                return; // Stop processing until human makes decision
            } else {
                debugLog('COMBAT', '🛡️ [APP] Local player is attacker, not showing interception modal');
                // Attacker will see "opponent deciding" modal via interceptionPending state
            }
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
  }, [processActionWithGuestRouting, getLocalPlayerId]);

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

    // For standard abilities (like Recall), complete the ability to deduct energy and end turn
    await processActionWithGuestRouting('shipAbilityCompletion', {
        ability: ability,
        sectionName: sectionName,
        playerId: getLocalPlayerId()
    });

    // Standard cleanup for completed abilities
    setShipAbilityMode(null);
    setShipAbilityConfirmation(null);

    return result;
}, [processActionWithGuestRouting, getLocalPlayerId]);

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
            // For SINGLE_MOVE, highlight all friendly drones as valid targets
            if (result.needsCardSelection.type === 'single_move') {
                // Determine which player's drones should be selectable based on who is acting
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
            return; // Don't process other effects yet
        }

        // Handle other card selections (like SEARCH_AND_DRAW) with modal
        setCardSelectionModal({
            ...result.needsCardSelection,
            onConfirm: async (selectedCards) => {
                // Handle the card selection - costs will be paid in completion handler
                await handleCardSelection(selectedCards, result.needsCardSelection, card, target, actingPlayerId, aiContext, null);
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
}, [processActionWithGuestRouting, getLocalPlayerId, localPlayerState, opponentPlayerState]);

  // --- 7.6 CARD SELECTION HANDLING ---

  /**
   * HANDLE CARD SELECTION
   * Processes the result of a card selection modal (e.g., SEARCH_AND_DRAW).
   * Delegates to ActionProcessor to maintain proper architecture.
   */
  const handleCardSelection = useCallback(async (selectedCards, selectionData, originalCard, target, actingPlayerId, aiContext, playerStatesWithEnergyCosts = null) => {
    // Delegate to ActionProcessor (proper architecture)
    await processActionWithGuestRouting('searchAndDrawCompletion', {
      card: originalCard,
      selectedCards,
      selectionData,
      playerId: actingPlayerId,
      playerStatesWithEnergyCosts
    });

    // UI cleanup only
    if (actingPlayerId === getLocalPlayerId()) {
      cancelCardSelection();
      setCardConfirmation(null);
    }
  }, [processActionWithGuestRouting, getLocalPlayerId, cancelCardSelection]);

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
  }, [processActionWithGuestRouting, getLocalPlayerId]);


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
  }, [processActionWithGuestRouting, getLocalPlayerId]);



  /**
   * HANDLE FOOTER VIEW TOGGLE
   * Switches between hand and drones views in experimental footer.
   * Footer is always visible, only view changes.
   * @param {string} view - The footer view to display ('hand' or 'drones')
   */
  const handleFooterViewToggle = (view) => {
    setFooterView(view);
  };

  /**
   * HANDLE FOOTER BUTTON CLICK (Classic Footer Only)
   * Toggles footer panel visibility and switches between footer views.
   * Used by the original non-experimental footer.
   * @param {string} view - The footer view to display ('hand', 'drones', 'log')
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
    debugLog('TARGETING_PROCESSING', '🎯 TARGETING USEEFFECT TRIGGERED', {
      selectedCard: selectedCard?.name || null,
      selectedCardId: selectedCard?.id || null,
      abilityMode: abilityMode?.drone?.name || null,
      shipAbilityMode: shipAbilityMode?.sectionName || null,
      multiSelectState: multiSelectState?.phase || null,
      willSkipCalculation: !selectedCard && !abilityMode && !shipAbilityMode && !multiSelectState
    });

    // Early return: Only calculate if actually in a targeting mode
    if (!selectedCard && !abilityMode && !shipAbilityMode && !multiSelectState) {
      // No selection active - clear targeting and skip calculation
      setValidAbilityTargets([]);
      setValidCardTargets([]);
      return;
    }

    // Only calculate when something is actually selected
    const { validAbilityTargets, validCardTargets } = calculateAllValidTargets(
      abilityMode,
      shipAbilityMode,
      multiSelectState,
      selectedCard,
      gameState.player1,
      gameState.player2,
      getLocalPlayerId()
    );

    setValidAbilityTargets(validAbilityTargets);
    setValidCardTargets(validCardTargets);

    // Clear conflicting selections
    if (abilityMode) {
      setSelectedCard(null);
      setShipAbilityMode(null);
    }
  }, [abilityMode, shipAbilityMode, selectedCard, multiSelectState]);

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

  // --- 8.4 INTERCEPTION MONITORING ---
  // TODO: UI MONITORING - Interception monitoring is appropriate UI-only effect - calculates UI hints for user
  useEffect(() => {
    if (turnPhase === 'action') {
        const potential = calculatePotentialInterceptors(
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

  // --- 8.5 GUARDIAN HIGHLIGHTING ---
  // Calculate potential guardian blockers when drone is selected
  // Highlights opponent drones with GUARDIAN keyword in the same lane
  useEffect(() => {
    if (turnPhase === 'action' && selectedDrone && !selectedDrone.isExhausted) {
      // Find which lane the selected drone is in
      const [attackerLane] = Object.entries(localPlayerState.dronesOnBoard)
        .find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];

      if (attackerLane) {
        // Find all opponent drones in that lane with GUARDIAN keyword
        const opponentDronesInLane = opponentPlayerState.dronesOnBoard[attackerLane] || [];
        const guardians = opponentDronesInLane
          .filter(drone => {
            const effectiveStats = getEffectiveStats(drone, attackerLane);
            return effectiveStats.keywords.has('GUARDIAN');
          })
          .map(drone => drone.id);
        setPotentialGuardians(guardians);
      } else {
        setPotentialGuardians([]);
      }
    } else {
      setPotentialGuardians([]);
    }
  }, [selectedDrone, turnPhase, localPlayerState, opponentPlayerState, getEffectiveStats]);

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
        debugLog('COMBAT', '[DEFENSIVE CLEANUP] Resetting stuck attack flag due to game state change');
        isResolvingAttackRef.current = false;
      }
    }
  }, [winner, turnPhase, currentPlayer]);

  // --- 8.6 GUEST RENDER NOTIFICATION ---
  // Note: Guest render notification removed - no longer needed after animation timing fix
  // Animations now play BEFORE state updates (while entities still exist in DOM)
  // See GuestMessageQueueService.js for details

  // --- 8.7 GUEST PHASE TRANSITION DETECTION ---
  // Guest watches turnPhase changes and synthesizes phaseTransition events locally
  // This allows guest to clear waiting modals and show deployment complete modal
  // Works by leveraging existing state sync from ActionProcessor broadcasts
  useEffect(() => {
    // Only run on guest - host gets real events from GameFlowManager
    if (gameState.gameMode !== 'guest') return;

    // Track previous phase to detect actual changes
    const previousPhase = previousPhaseRef.current;

    // On first mount, just record current phase
    if (previousPhase === null) {
      previousPhaseRef.current = turnPhase;
      return;
    }

    // Detect actual phase change
    if (previousPhase !== turnPhase) {
      debugLog('PHASE_TRANSITIONS', `👁️ Guest detected phase change: ${previousPhase} → ${turnPhase}`);

      // NOTE: Guest optimistic processing and checkpoint validation is now handled entirely by:
      // 1. GameFlowManager - for optimistic phase transitions
      // 2. GuestMessageQueueService - for checkpoint validation and phase announcements
      // App.jsx only responds to phase changes for UI updates (passive role)

      // Synthesize phaseTransition event with same structure as GameFlowManager
      const syntheticEvent = {
        type: 'phaseTransition',
        newPhase: turnPhase,
        previousPhase: previousPhase,
        gameStage: gameState.gameStage,
        roundNumber: gameState.roundNumber,
        firstPlayerResult: null
      };

      // Call same handler that host uses for UI updates
      const handlePhaseEvent = (event) => {
        const { type } = event;

        if (type === 'phaseTransition') {
          const { newPhase, previousPhase } = event;
          debugLog('PHASE_TRANSITIONS', `🔄 Guest handling synthetic phase transition: ${previousPhase} → ${newPhase}`);

          // Clear waiting modal when transitioning away from the waiting phase
          if (waitingForPlayerPhase === previousPhase) {
            setWaitingForPlayerPhase(null);
          }
        }
      };

      handlePhaseEvent(syntheticEvent);

      // Update ref for next change
      previousPhaseRef.current = turnPhase;
    }
  }, [turnPhase, gameState.gameStage, gameState.roundNumber, gameState.gameMode, waitingForPlayerPhase, passInfo]);

  // --- 8.8 GUEST RENDER COMPLETION FOR ANIMATIONS ---
  // Signal to GuestMessageQueueService that React has finished rendering
  // This ensures animations (like teleport effects) have valid DOM elements to target
  // Same pattern used in DroneSelectionScreen, DeckSelectionScreen, and ShipPlacementScreen
  useEffect(() => {
    if (gameState.gameMode === 'guest') {
      gameStateManager.emit('render_complete');
    }
  }, [gameState, gameStateManager]);

  // --- 8.9 MANDATORY ACTION INITIALIZATION ---
  // Manage ability-based mandatory action clearing and UI state for mandatory phases
  // Note: Phase-based mandatory actions now derive UI state from turnPhase + commitments (see Section 5.5)
  useEffect(() => {
    const prevPhase = previousPhaseRef.current;
    const enteredMandatoryDiscard = turnPhase === 'mandatoryDiscard' && prevPhase !== 'mandatoryDiscard';
    const enteredMandatoryRemoval = turnPhase === 'mandatoryDroneRemoval' && prevPhase !== 'mandatoryDroneRemoval';

    // Open footer and set view to hand when first entering mandatoryDiscard phase
    if (enteredMandatoryDiscard) {
      setFooterView('hand');
      setIsFooterOpen(true);
    }

    // Open footer and set view to drones when first entering mandatoryDroneRemoval phase
    if (enteredMandatoryRemoval) {
      setFooterView('drones');
      setIsFooterOpen(true);
    }

    // Clear ability-based mandatoryAction when transitioning FROM a mandatory phase TO a non-mandatory phase
    // This only affects ability-triggered mandatory actions (e.g., "discard 2 cards" from ship ability)
    const wasInMandatoryPhase = prevPhase === 'mandatoryDiscard' || prevPhase === 'mandatoryDroneRemoval';
    const isInMandatoryPhase = turnPhase === 'mandatoryDiscard' || turnPhase === 'mandatoryDroneRemoval';

    if (wasInMandatoryPhase && !isInMandatoryPhase && mandatoryAction && mandatoryAction.fromAbility) {
      debugLog('PHASE_TRANSITIONS', `✅ Clearing ability-based mandatoryAction (transitioned from ${prevPhase} to ${turnPhase})`);
      setMandatoryAction(null);
    }

    // Update ref for next comparison
    previousPhaseRef.current = turnPhase;
  }, [turnPhase, mandatoryAction]);

  // --- 8.10 SIMULTANEOUS PHASE WAITING MODAL ---
  // Monitor commitment status for simultaneous phases and show waiting modal when appropriate
  // Coordinates with phase animation queue to prevent race conditions:
  // - If announcements are queued or playing, waits for them to complete before showing modal
  // - If no announcements, shows modal immediately
  // - Prevents UI conflicts where waiting modal overlays phase announcements
  // Applied to: mandatoryDiscard, optionalDiscard, allocateShields, mandatoryDroneRemoval
  useEffect(() => {
    // Only check in multiplayer
    if (!isMultiplayer()) return;

    const localPlayerId = getLocalPlayerId();
    const opponentPlayerId = getOpponentPlayerId();

    // Check mandatoryDiscard phase
    if (turnPhase === 'mandatoryDiscard') {
      const localCommitted = gameState.commitments?.mandatoryDiscard?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.mandatoryDiscard?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', '✋ Local player committed but opponent has not - showing waiting modal for mandatoryDiscard');

        // Wait for phase announcements to complete before showing waiting modal
        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('mandatoryDiscard');
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase('mandatoryDiscard');
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === 'mandatoryDiscard') {
        debugLog('COMMITMENTS', '✅ Both players committed - clearing waiting modal for mandatoryDiscard');
        setWaitingForPlayerPhase(null);
      }
    }

    // Check optionalDiscard phase
    if (turnPhase === 'optionalDiscard') {
      const localCommitted = gameState.commitments?.optionalDiscard?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.optionalDiscard?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', '✋ Local player committed but opponent has not - showing waiting modal for optionalDiscard');

        // Wait for phase announcements to complete before showing waiting modal
        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('optionalDiscard');
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase('optionalDiscard');
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === 'optionalDiscard') {
        debugLog('COMMITMENTS', '✅ Both players committed - clearing waiting modal for optionalDiscard');
        setWaitingForPlayerPhase(null);
      }
    }

    // Check allocateShields phase
    if (turnPhase === 'allocateShields') {
      const localCommitted = gameState.commitments?.allocateShields?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.allocateShields?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', '✋ Local player committed but opponent has not - showing waiting modal for allocateShields');

        // Wait for phase announcements to complete before showing waiting modal
        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('allocateShields');
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase('allocateShields');
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === 'allocateShields') {
        debugLog('COMMITMENTS', '✅ Both players committed - clearing waiting modal for allocateShields');
        setWaitingForPlayerPhase(null);
      }
    }

    // Check mandatoryDroneRemoval phase
    if (turnPhase === 'mandatoryDroneRemoval') {
      const localCommitted = gameState.commitments?.mandatoryDroneRemoval?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.mandatoryDroneRemoval?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', '✋ Local player committed but opponent has not - showing waiting modal for mandatoryDroneRemoval');

        // Wait for phase announcements to complete before showing waiting modal
        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('mandatoryDroneRemoval');
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase('mandatoryDroneRemoval');
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === 'mandatoryDroneRemoval') {
        debugLog('COMMITMENTS', '✅ Both players committed - clearing waiting modal for mandatoryDroneRemoval');
        setWaitingForPlayerPhase(null);
      }
    }
  }, [turnPhase, gameState.commitments, isMultiplayer, getLocalPlayerId, getOpponentPlayerId, waitingForPlayerPhase]);

  // --- 8.11-8.13 REMOVED: AUTO-TRIGGER FOR MANDATORY PHASES ---
  // Previous implementation used client-side useEffects to auto-trigger Continue when player
  // entered mandatoryDiscard or mandatoryDroneRemoval with no excess cards/drones.
  //
  // This has been CONSOLIDATED into GameFlowManager.autoCompleteUnnecessaryCommitments()
  // which now handles ALL mandatory simultaneous phases (allocateShields, mandatoryDiscard,
  // mandatoryDroneRemoval) consistently on the server-side.
  //
  // Benefits:
  // - Single source of truth for auto-completion logic
  // - No race conditions between client-side useEffect dependencies
  // - Consistent handling across all game modes (local, host, guest)
  // - Proper integration with AI auto-commit for single-player mode

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
   * HANDLE EXIT GAME
   * Exits the current game and returns to the menu screen.
   * In Extract mode (single-player run), shows abandon run confirmation first.
   * Properly cleans up all running services, timers, and subscriptions.
   */
  const handleExitGame = () => {
    // Check if in Extract mode (single-player run active)
    const currentRunState = gameStateManager.get('currentRunState');
    if (currentRunState) {
      // In Extract mode - show abandon run confirmation instead of exiting
      setShowAbandonRunModal(true);
      return;
    }

    // Not in Extract mode - exit normally
    // Clean up AI processor (clear timer and unsubscribe)
    if (gameState.gameMode === 'local') {
      aiPhaseProcessor.cleanup();
    }

    // End game and return to menu (also cleans up GameDataService and ActionProcessor)
    endGame();

    // Reset attack flag to prevent stuck state
    isResolvingAttackRef.current = false;

    // Reset UI-only state
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
   * HANDLE CONFIRM ABANDON RUN
   * Called when user confirms abandoning their run in Extract mode.
   * Uses ExtractionController to abandon the run and return to hangar.
   */
  const handleConfirmAbandonRun = () => {
    setShowAbandonRunModal(false);
    ExtractionController.abandonRun(); // Goes to hangar, not main menu
  };

  /**
   * HANDLE OPEN ADD CARD MODAL (DEBUG)
   * Opens the debug modal for adding cards to hands
   */
  const handleOpenAddCardModal = () => {
    setShowAddCardModal(true);
  };

  /**
   * HANDLE ADD CARDS TO HAND (DEBUG)
   * Adds selected cards to a player's hand
   * @param {Object} data - {playerId, selectedCards}
   */
  const handleAddCardsToHand = async ({ playerId, selectedCards }) => {
    debugLog('DEBUG_TOOLS', '🎴 Adding cards to hand', { playerId, selectedCards });

    // Convert selectedCards composition to array of card instances
    const cardInstances = [];
    Object.entries(selectedCards).forEach(([cardId, quantity]) => {
      const cardTemplate = fullCardCollection.find(c => c.id === cardId);
      if (!cardTemplate) {
        console.error(`Card template not found for ID: ${cardId}`);
        return;
      }

      for (let i = 0; i < quantity; i++) {
        // Create unique instance ID
        const instanceId = `${playerId}-${cardId}-${Date.now()}-${Math.random()}`;
        cardInstances.push({ ...cardTemplate, instanceId });
      }
    });

    // Route through ActionProcessor instead of direct state update
    await processActionWithGuestRouting('debugAddCardsToHand', { playerId, cardInstances });

    debugLog('DEBUG_TOOLS', '✅ Cards added through ActionProcessor');
  };

  /**
   * HANDLE ALLOCATE SHIELD
   * Allocates a shield to a specific ship section.
   * Routes to appropriate manager based on current phase.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAllocateShield = async (sectionName) => {
    const { turnPhase } = gameState;

    debugLog('SHIELD_CLICKS', `🟢 handleAllocateShield called`, {
      sectionName,
      turnPhase,
      localPlayerId: getLocalPlayerId(),
      pendingShieldsRemaining,
      currentPhaseMatch: turnPhase === 'allocateShields'
    });

    if (turnPhase === 'allocateShields') {
      // Round start shield allocation - use pending state (privacy: don't send to opponent until confirmed)
      if (pendingShieldsRemaining <= 0) {
        debugLog('SHIELD_CLICKS', '❌ No shields remaining to allocate');
        return;
      }

      // Check if section can accept more shields
      const section = localPlayerState.shipSections[sectionName];
      const maxShields = gameDataService.getEffectiveSectionMaxShields(sectionName, localPlayerState, localPlacedSections);
      const currentPending = pendingShieldAllocations[sectionName] || 0;

      if (currentPending >= maxShields) {
        debugLog('SHIELD_CLICKS', `❌ Section ${sectionName} already at max shields (${maxShields})`);
        return;
      }

      // Update pending state only (no network communication)
      setPendingShieldAllocations(prev => ({
        ...prev,
        [sectionName]: currentPending + 1
      }));
      setPendingShieldsRemaining(prev => prev - 1);

      debugLog('SHIELD_CLICKS', `✅ Added shield to ${sectionName} in pending state`, {
        newPending: currentPending + 1,
        remainingShields: pendingShieldsRemaining - 1
      });
    } else {
      debugLog('SHIELD_CLICKS', `🔄 Using reallocation path instead`);
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
    // Check current allocated shields MINUS any pending removals
    const currentPendingDelta = pendingShieldChanges[sectionName] || 0;
    const effectiveAllocated = section.allocatedShields + currentPendingDelta;
    if (effectiveAllocated <= 0) return;

    // Validate with ActionProcessor (doesn't modify game state)
    const result = await processActionWithGuestRouting('reallocateShieldsAbility', {
      action: 'remove',
      sectionName: sectionName,
      playerId: getLocalPlayerId()
    });

    if (result.success) {
      // Track pending change locally (game state unchanged)
      setPendingShieldChanges(prev => ({
        ...prev,
        [sectionName]: (prev[sectionName] || 0) - 1
      }));
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

    // Validate with ActionProcessor (doesn't modify game state)
    const result = await processActionWithGuestRouting('reallocateShieldsAbility', {
      action: 'add',
      sectionName: sectionName,
      playerId: getLocalPlayerId()
    });

    if (result.success) {
      // Track pending change locally (game state unchanged)
      setPendingShieldChanges(prev => ({
        ...prev,
        [sectionName]: (prev[sectionName] || 0) + 1
      }));
      setShieldsToAdd(prev => prev - 1);
    }
  };

  /**
   * HANDLE CONTINUE TO ADD PHASE
   * Transitions from shield removal to shield addition phase during reallocation.
   * Saves current pending changes for 'adding' phase reset functionality.
   */
  const handleContinueToAddPhase = () => {
    // Save current pending changes as the baseline for 'adding' phase resets
    setPostRemovalPendingChanges({ ...pendingShieldChanges });
    setReallocationPhase('adding');
  };

  /**
   * HANDLE RESET REALLOCATION
   * Resets shield reallocation to the start of the current phase.
   * - During 'removing': Clears all pending changes (game state never modified)
   * - During 'adding': Restores to post-removal pending changes (before any additions)
   */
  const handleResetReallocation = () => {
    if (reallocationPhase === 'removing') {
      // Clear all pending changes (game state was never modified)
      setPendingShieldChanges({});

      // Reset counters to initial values
      setShieldsToRemove(reallocationAbility.ability.effect.value.maxShields);
      setShieldsToAdd(0);
    } else if (reallocationPhase === 'adding') {
      // Restore to post-removal pending changes (remove only addition changes)
      setPendingShieldChanges({ ...postRemovalPendingChanges });

      // Calculate how many shields were removed (sum of negative deltas)
      const removedCount = Object.values(postRemovalPendingChanges)
        .filter(delta => delta < 0)
        .reduce((sum, delta) => sum + Math.abs(delta), 0);

      // Reset shields to add counter (restore full amount)
      setShieldsToAdd(removedCount);
    }
  };

  /**
   * HANDLE CANCEL REALLOCATION
   * Cancels shield reallocation and clears all pending changes.
   * Game state was never modified during editing, so no restore needed.
   */
  const handleCancelReallocation = () => {
    // Clear all pending changes (game state was never modified)
    setPendingShieldChanges({});
    setPostRemovalPendingChanges({});

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
      target: null,
      abilityType: 'reallocateShields'
    });
  };

  /**
   * HANDLE SHIP SECTION CLICK
   * Processes clicks on ship sections for shield allocation or reallocation.
   * Routes to appropriate handler based on current phase.
   * @param {string} sectionName - Name of the clicked ship section
   */
  const handleShipSectionClick = (sectionName) => {
    debugLog('SHIELD_CLICKS', `🔵 handleShipSectionClick called`, {
      sectionName,
      turnPhase,
      reallocationPhase,
      shieldsToAllocate,
      willHandleReallocation: !!reallocationPhase,
      willHandleAllocation: turnPhase === 'allocateShields'
    });

    // Handle shield reallocation if active
    if (reallocationPhase) {
      debugLog('SHIELD_CLICKS', `🔄 Routing to reallocation handler (${reallocationPhase})`);
      if (reallocationPhase === 'removing') {
        handleRemoveShield(sectionName);
      } else if (reallocationPhase === 'adding') {
        handleAddShield(sectionName);
      }
      return;
    }

    // Handle normal shield allocation during allocateShields phase
    if (turnPhase === 'allocateShields') {
      debugLog('SHIELD_CLICKS', `🛡️ Routing to handleAllocateShield`);
      handleAllocateShield(sectionName);
    } else {
      debugLog('SHIELD_CLICKS', `⚠️ Click ignored - not in allocateShields phase or reallocation mode`);
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
    debugLog('COMMITMENTS', '🏁 handleEndAllocation called');

    // Use ActionProcessor for all shield allocation endings - routes to appropriate manager
    const result = await processActionWithGuestRouting('endShieldAllocation', {
      playerId: getLocalPlayerId()
    });

    debugLog('COMMITMENTS', '🏁 endShieldAllocation result:', {
      hasData: !!result.data,
      bothPlayersComplete: result.data?.bothPlayersComplete,
      fullResult: result
    });

    // Show waiting modal if opponent hasn't finished yet
    if (result.data && !result.data.bothPlayersComplete) {
      debugLog('COMMITMENTS', '✋ Setting waiting overlay for allocateShields phase');
      setWaitingForPlayerPhase('allocateShields');
    } else {
      debugLog('COMMITMENTS', '✅ Both players complete or no data, not showing waiting overlay', {
        hasData: !!result.data,
        bothComplete: result.data?.bothPlayersComplete
      });
    }
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

    debugLog('ENERGY', `🛡️ handleShieldAction: ${actionType} in phase ${phase}`);

    if (phase === 'allocateShields') {
      // Round start shield allocation - simultaneous phase processing
      debugLog('ENERGY', `🛡️ Routing to round start shield handling (simultaneous)`);
      handleRoundStartShieldAction(actionType, payload);
    } else if (phase === 'action') {
      // Action phase shield reallocation - sequential phase processing
      debugLog('ENERGY', `🛡️ Routing to action phase shield handling (sequential)`);
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
  const handleRoundStartShieldAction = async (actionType, payload) => {
    const { turnPhase } = gameState;

    // Validate we're in the correct phase
    if (turnPhase !== 'allocateShields') {
      console.warn(`⚠️ Round start shield action ${actionType} called during ${turnPhase} phase`);
      return;
    }

    debugLog('ENERGY', `🛡️⚡ Processing round start shield action: ${actionType}`);

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
          await handleResetShieldAllocation();
          break;

        case 'endShieldAllocation':
          await handleEndAllocation();
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

    debugLog('PHASE_TRANSITIONS', `[PHASE ROUTING] ${actionType} in ${phase} → ${isSequential ? 'ActionProcessor' : 'Direct Update'}`);

    // Special case for shield actions
    if (actionType.includes('Shield') || actionType.includes('shield')) {
      debugLog('ENERGY', `[SHIELD ROUTING] ${actionType} in ${phase} → ${phase === 'allocateShields' ? 'Round Start (Simultaneous)' : 'Action Phase (Sequential)'}`);
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

    debugLog('PHASE_TRANSITIONS', `⚡ handleSimultaneousAction: ${actionType} in ${turnPhase} phase`);

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
      debugLog('PHASE_TRANSITIONS', `⏳ Waiting for both players to complete ${phase} phase`);

      // Set up timeout for safety (30 seconds max wait)
      const timeout = setTimeout(() => {
        console.warn(`⚠️ Timeout waiting for ${phase} completion`);
        resolve(); // Continue anyway to prevent game lockup
      }, 30000);

      const checkCompletion = () => {
        if (!isMultiplayer()) {
          // Single player mode - AI completion handled by SimultaneousActionManager
          debugLog('PHASE_TRANSITIONS', `🤖 Single player mode: AI completion delegated to SimultaneousActionManager for ${phase}`);
          clearTimeout(timeout);
          resolve();
          return;
        }

        // Multiplayer mode - check if both players are ready
        if (areBothPlayersReady(phase)) {
          debugLog('PHASE_TRANSITIONS', `✅ Both players completed ${phase} phase`);
          clearTimeout(timeout);
          resolve();
          return;
        }

        // Not ready yet - continue waiting
        debugLog('PHASE_TRANSITIONS', `⏳ Still waiting for ${phase} completion`);
      };

      // Initial check
      checkCompletion();

      // Set up periodic checking for multiplayer
      if (isMultiplayer()) {
        const checkInterval = setInterval(() => {
          if (areBothPlayersReady(phase)) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            debugLog('PHASE_TRANSITIONS', `✅ Both players completed ${phase} phase`);
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
  const executeDeployment = async (lane, droneToDeployed = selectedDrone) => {
    const drone = droneToDeployed; // Use parameter, fallback to state
    try {
      debugLog('DEPLOYMENT', '🎯 App.jsx: Deploying drone:', {
        droneName: drone?.name,
        droneObject: drone,
        lane,
        playerId: getLocalPlayerId(),
        turn
      });

      // Use ActionProcessor for deployment
      const result = await processActionWithGuestRouting('deployment', {
        droneData: drone,
        laneId: lane,
        playerId: getLocalPlayerId(),
        turn: roundNumber
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

    cancelAllActions(); // Cancel all other actions before deploying drone

    // For round 1, we need cost information for confirmation modal
    if (roundNumber === 1) {
      // TODO: UI VALIDATION - validateDeployment used for UI validation before deployment - appropriate for UI layer
      const validationResult = gameEngine.validateDeployment(localPlayerState, selectedDrone, roundNumber, totalLocalPlayerDrones, localPlayerEffectiveStats);
      if (!validationResult.isValid) {
        setModalContent({ title: validationResult.reason, text: validationResult.message, isBlocking: true });
        return;
      }
      const { budgetCost, energyCost } = validationResult;
      if (energyCost > 0) {
        setDeploymentConfirmation({ lane, budgetCost, energyCost, drone: selectedDrone });
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

    cancelAllActions(); // Cancel all other actions before passing

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
       cancelAllActions(); // Cancel all other actions before starting ability targeting
       setAbilityMode({ drone, ability });
       setSelectedDrone(drone);
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
        // Route to specific ability handlers based on ability name
        if (ability.name === 'Reallocate Shields') {
            // Start reallocation mode without energy deduction
            cancelAllActions();
            setReallocationPhase('removing');
            setShieldsToRemove(ability.effect.value.maxShields);
            setShieldsToAdd(0);
            setOriginalShieldAllocation(JSON.parse(JSON.stringify(localPlayerState.shipSections)));
            setReallocationAbility({ ability, sectionName: section.name });
        } else if (ability.name === 'Recalculate') {
            // Non-targeted ability - show confirmation modal
            cancelAllActions();
            setShipAbilityConfirmation({ ability, sectionName: section.name, target: null, abilityType: 'recalculate' });
        } else if (ability.name === 'Recall') {
            // Targeted ability - enter targeting mode
            cancelAllActions();
            setShipAbilityMode({ sectionName: section.name, ability, abilityType: 'recall' });
        } else if (ability.name === 'Target Lock') {
            // Targeted ability - enter targeting mode
            cancelAllActions();
            setShipAbilityMode({ sectionName: section.name, ability, abilityType: 'targetLock' });
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
      debugLog('COMBAT', `--- handleTokenClick triggered for ${token.name} (isPlayer: ${isPlayer}) ---`);

      // NEW: Prioritize multi-move selection
      if (multiSelectState && multiSelectState.phase === 'select_drones' && isPlayer) {
          // Validate drone is a valid target (includes exhaustion check + any future filters)
          if (!validCardTargets.some(t => t.id === token.id)) {
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
      if (multiSelectState && multiSelectState.phase === 'select_drone' && isPlayer) {
          // Check if this drone is a valid target
          if (!validCardTargets.some(t => t.id === token.id)) {
              debugLog('COMBAT', "Action prevented: Drone is not a valid target for movement.");
              return;
          }

          debugLog('COMBAT', "Action: Single-move drone selection.");

          // Find the drone's current lane - use the acting player's state
          const actingPlayerId = multiSelectState.actingPlayerId || getLocalPlayerId();
          const actingPlayerState = actingPlayerId === getLocalPlayerId()
              ? localPlayerState
              : opponentPlayerState;
          const droneLane = Object.entries(actingPlayerState.dronesOnBoard).find(([_, drones]) =>
              drones.some(d => d.id === token.id)
          )?.[0];

          if (droneLane) {
              debugLog('MOVEMENT_LANES', `Drone selected from ${droneLane}, actingPlayerId: ${actingPlayerId}`);

              // Calculate adjacent lanes
              const currentLaneIndex = parseInt(droneLane.replace('lane', ''));
              const adjacentLanes = [];

              if (currentLaneIndex > 1) {
                  adjacentLanes.push({ id: `lane${currentLaneIndex - 1}`, owner: actingPlayerId, type: 'lane' });
              }
              if (currentLaneIndex < 3) {
                  adjacentLanes.push({ id: `lane${currentLaneIndex + 1}`, owner: actingPlayerId, type: 'lane' });
              }

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
          }
          return;
      }

      // 2. Handle targeting for an active card or ability
      if (validAbilityTargets.some(t => t.id === token.id) || validCardTargets.some(t => t.id === token.id)) {
          debugLog('COMBAT', "Action: Targeting for an active card/ability.");
          handleTargetClick(token, 'drone', isPlayer);
          return;
      }

      // 2. Handle standard attack logic directly
      if (turnPhase === 'action' && isMyTurn() && selectedDrone && !selectedDrone.isExhausted && !isPlayer) {
          debugLog('COMBAT', "Action: Attempting a standard attack.");
          debugLog('COMBAT', "Attacker selected:", selectedDrone.name, `(ID: ${selectedDrone.id})`);
          debugLog('COMBAT', "Target clicked:", token.name, `(ID: ${token.id})`);

          const [attackerLane] = Object.entries(localPlayerState.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];
          const [targetLane] = Object.entries(opponentPlayerState.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === token.id)) || [];
          
          debugLog('COMBAT', "Calculated Attacker Lane:", attackerLane);
          debugLog('COMBAT', "Calculated Target Lane:", targetLane);

          if (attackerLane && targetLane && attackerLane === targetLane) {
              debugLog('COMBAT', "SUCCESS: Lanes match. Processing attack...");
              const attackDetails = { attacker: selectedDrone, target: token, targetType: 'drone', lane: attackerLane, attackingPlayer: getLocalPlayerId() };

              // ActionProcessor will handle interception check
              resolveAttack(attackDetails);
              setSelectedDrone(null);
          } else {
              debugLog('COMBAT', "FAILURE: Lanes do not match or could not be found.");
              setModalContent({ title: "Invalid Target", text: "You can only attack targets in the same lane.", isBlocking: true });
          }
          return;
      }

      // 3. Handle multi-move drone selection
      if (multiSelectState && multiSelectState.phase === 'select_drones' && isPlayer) {
          // Validate drone is a valid target (includes exhaustion check + any future filters)
          if (!validCardTargets.some(t => t.id === token.id)) {
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

      // 4. Handle mandatory destruction (phase-based or ability-based)

      if ((shouldShowRemovalUI || mandatoryAction?.type === 'destroy') && isPlayer) {
          debugLog('COMBAT', "Action: Mandatory destruction.");
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
              debugLog('COMBAT', "Action prevented: Drone is exhausted.");
              return;
          }
          if (selectedDrone?.id === token.id) {
              debugLog('COMBAT', "Action: Deselecting drone", token.name);
              setSelectedDrone(null);
          } else {
              debugLog('COMBAT', "Action: Selecting drone", token.name);
              cancelAllActions(); // Cancel all other actions before selecting drone
              setSelectedDrone(token);
          }
          return;
      }

      // 6. Fallback: show drone details
      debugLog('COMBAT', "Action: Fallback - showing drone details.");
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
          debugLog('COMBAT', "Action: Attempting ship section attack.");
          debugLog('COMBAT', "Attacker selected:", selectedDrone.name, `(ID: ${selectedDrone.id})`);
          debugLog('COMBAT', "Target clicked:", target.name, `(Type: ${targetType})`);

          const [attackerLane] = Object.entries(localPlayerState.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];

          debugLog('COMBAT', "Calculated Attacker Lane:", attackerLane);

          if (attackerLane) {
              // Validate that the target ship section is in the same lane as the attacking drone
              const targetLaneIndex = opponentPlacedSections.indexOf(target.name);
              const targetLane = targetLaneIndex !== -1 ? `lane${targetLaneIndex + 1}` : null;

              debugLog('COMBAT', "Target section lane:", targetLane, "Attacker lane:", attackerLane);

              if (targetLane !== attackerLane) {
                  debugLog('COMBAT', "FAILURE: Drone and ship section are not in the same lane.");
                  setModalContent({
                      title: "Invalid Target",
                      text: `Your drone can only attack the ship section in its lane.`,
                      isBlocking: true
                  });
                  return;
              }

              debugLog('COMBAT', "SUCCESS: Found attacker lane. Checking for Guardian...");
              const opponentDronesInLane = opponentPlayerState.dronesOnBoard[attackerLane];
              const hasGuardian = opponentDronesInLane && opponentDronesInLane.some(drone => {
                  const effectiveStats = getEffectiveStats(drone, attackerLane);
                  return effectiveStats.keywords.has('GUARDIAN') && !drone.isExhausted;
              });

              if (hasGuardian) {
                  debugLog('COMBAT', "FAILURE: Ship section is protected by a Guardian drone.");
                  setModalContent({ title: "Invalid Target", text: "This lane is protected by a Guardian drone. You must destroy it before targeting the ship section.", isBlocking: true });
              } else {
                  debugLog('COMBAT', "SUCCESS: No Guardian. Processing attack...");
                  const attackDetails = { attacker: selectedDrone, target: target, targetType: 'section', lane: attackerLane, attackingPlayer: getLocalPlayerId() };

                  // ActionProcessor will handle interception check
                  resolveAttack(attackDetails);
                  setSelectedDrone(null);
              }
          } else {
              debugLog('COMBAT', "FAILURE: Could not determine attacker lane.");
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

        if (phase === 'select_destination_lane') {
            debugLog('CARD_PLAY', '   ✅ Destination lane selected, calling resolveMultiMove');
            debugLog('CARD_PLAY', '   Card:', multiSelectState.card?.name);
            debugLog('CARD_PLAY', '   From lane:', sourceLane, '→ To lane:', lane);
            resolveMultiMove(multiSelectState.card, selectedDrones, sourceLane, lane);
            return;
        }
    }

    if (multiSelectState && multiSelectState.card.effect.type === 'SINGLE_MOVE' && multiSelectState.phase === 'select_destination' && isPlayer) {
        if (validCardTargets.some(t => t.id === lane)) {
            // Show confirmation modal instead of immediately executing
            setMoveConfirmation({
                drone: multiSelectState.selectedDrone,
                from: multiSelectState.sourceLane,
                to: lane,
                card: multiSelectState.card  // Include card for movement via card
            });
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
      hasEnoughEnergy: localPlayerState.energy >= card.cost
    });

    if (turnPhase !== 'action') {
      debugLog('CARD_PLAY', `🚫 Card click rejected - wrong phase: ${turnPhase}`, { card: card.name });
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

    // Movement cards - Set up UI state directly (don't call ActionProcessor until selection complete)
    if (card.effect.type === 'MULTI_MOVE' || card.effect.type === 'SINGLE_MOVE') {
      debugLog('CARD_PLAY', `✅ Movement card - setting up UI: ${card.name}`, { effectType: card.effect.type });
      if (multiSelectState && multiSelectState.card.instanceId === card.instanceId) {
        cancelCardSelection();
      } else {
        cancelAllActions(); // Cancel all other actions before starting movement card
        setSelectedCard(card); // Keep card selected for greyscale effect on other cards

        // Set up UI state directly (like abilities do) - don't send action until selection complete
        if (card.effect.type === 'SINGLE_MOVE') {
          debugLog('MOVEMENT_LANES', `SINGLE_MOVE card clicked: ${card.name}`);
          debugLog('MOVEMENT_LANES', `gameMode: ${gameState.gameMode}, localPlayerId: ${getLocalPlayerId()}`);

          // For SINGLE_MOVE, highlight all friendly non-exhausted drones as valid targets
          const friendlyDrones = Object.values(localPlayerState.dronesOnBoard)
            .flat()
            .filter(drone => !drone.isExhausted)
            .map(drone => ({ id: drone.id, type: 'drone', owner: getLocalPlayerId() }));

          debugLog('MOVEMENT_LANES', `Valid drone targets:`, friendlyDrones);
          setValidCardTargets(friendlyDrones);

          setMultiSelectState({
            card: card,
            phase: 'select_drone',
            selectedDrones: [],
            sourceLane: null,
            maxDrones: 1,
            actingPlayerId: getLocalPlayerId()
          });
        } else { // MULTI_MOVE
          setMultiSelectState({
            card: card,
            phase: 'select_source_lane',
            selectedDrones: [],
            sourceLane: null,
            maxDrones: card.effect.count || 3,
            actingPlayerId: getLocalPlayerId()
          });
        }

        // Action will be sent when selection is complete (in resolveMultiMove/resolveSingleMove)
      }
      return;
    }

    if (selectedCard?.instanceId === card.instanceId) {
      debugLog('CARD_PLAY', `✅ Card deselected: ${card.name}`);
      cancelCardSelection();
    } else if (card.name === 'System Sabotage') {
        debugLog('CARD_PLAY', `✅ System Sabotage card - getting targets`, { card: card.name });
        // TODO: TECHNICAL DEBT - getValidTargets gets valid targets for special cards - required for card targeting UI
        // Ensure player states are always passed in correct order (player1, player2)
        const localPlayerId = getLocalPlayerId();
        const player1State = localPlayerId === 'player1' ? localPlayerState : opponentPlayerState;
        const player2State = localPlayerId === 'player1' ? opponentPlayerState : localPlayerState;
        const validTargets = targetingRouter.routeTargeting({
          actingPlayerId: localPlayerId,
          source: null,
          definition: card,
          player1: player1State,
          player2: player2State
        });
        debugLog('CARD_PLAY', `✅ System Sabotage targets found: ${validTargets.length}`, { targets: validTargets });
        cancelAllActions(); // Cancel all other actions before starting System Sabotage
        setDestroyUpgradeModal({ card, targets: validTargets, opponentState: opponentPlayerState });
    } else if (card.type === 'Upgrade') {
        debugLog('CARD_PLAY', `✅ Upgrade card - getting targets: ${card.name}`);
        // TODO: TECHNICAL DEBT - getValidTargets gets valid targets for upgrade cards - required for upgrade targeting UI
        // Ensure player states are always passed in correct order (player1, player2)
        const localPlayerId = getLocalPlayerId();
        const player1State = localPlayerId === 'player1' ? localPlayerState : opponentPlayerState;
        const player2State = localPlayerId === 'player1' ? opponentPlayerState : localPlayerState;
        const validTargets = targetingRouter.routeTargeting({
          actingPlayerId: localPlayerId,
          source: null,
          definition: card,
          player1: player1State,
          player2: player2State
        });
        debugLog('CARD_PLAY', `✅ Upgrade targets found: ${validTargets.length}`, { targets: validTargets });
        if (validTargets.length > 0) {
            cancelAllActions(); // Cancel all other actions before starting upgrade selection
            setUpgradeSelectionModal({ card, targets: validTargets });
        } else {
            setModalContent({ title: "No Valid Targets", text: `There are no drone types that can accept the '${card.name}' upgrade right now.`, isBlocking: true });
        }
    } else {
        if (!card.targeting) {
            debugLog('CARD_PLAY', `✅ Non-targeted card - showing confirmation: ${card.name}`);
            cancelAllActions(); // Cancel all other actions before starting card confirmation
            setCardConfirmation({ card, target: null });
        } else {
            debugLog('CARD_PLAY', `✅ Targeted card - waiting for target selection: ${card.name}`, { targeting: card.targeting });
            cancelAllActions(); // Cancel all other actions before starting targeted card
            setSelectedCard(card);
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
    // Determine if this is phase-based or ability-based mandatory discard
    const isAbilityBased = mandatoryAction?.fromAbility;
    const currentCount = isAbilityBased ? mandatoryAction.count : excessCards;

    // For phase-based mandatory discards, check if we've already discarded enough
    if (!isAbilityBased && excessCards <= 0) {
      debugLog('DISCARD', '🚫 Cannot discard more cards - already at hand limit');
      setConfirmationModal(null);
      return;
    }

    // Determine if this is the last discard
    const newCount = currentCount - 1;
    const isLastDiscard = newCount <= 0;

    // Prepare payload for discard action
    const discardPayload = {
        playerId: getLocalPlayerId(),
        cardsToDiscard: [card],
        isMandatory: true
    };

    // If this is the last discard from an ability, include metadata for animation
    if (isLastDiscard && isAbilityBased && mandatoryAction.abilityName) {
        discardPayload.abilityMetadata = {
            abilityName: mandatoryAction.abilityName,
            sectionName: mandatoryAction.sectionName,
            actingPlayerId: mandatoryAction.actingPlayerId
        };
    }

    // Process discard action (ActionProcessor handles logging and animations)
    await processActionWithGuestRouting('optionalDiscard', discardPayload);

    // Clear the confirmation modal immediately
    setConfirmationModal(null);

    // Handle ability-based completion (phase-based is handled by Continue button)
    if (isLastDiscard && isAbilityBased) {
        // Clear ability-based mandatoryAction
        setMandatoryAction(null);

        // Complete the Recalculate ability (ends turn)
        await processActionWithGuestRouting('recalculateComplete', {
            playerId: mandatoryAction.actingPlayerId
        });
    } else if (!isLastDiscard && isAbilityBased) {
        // More discards needed for ability-based
        // Update ability-based mandatoryAction count
        setMandatoryAction(prev => ({ ...prev, count: newCount }));
    }
    // Note: Phase-based mandatory discard completion is handled by Continue button
    // For phase-based, count is derived from excessCards, no need to update anything
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
    debugLog('PHASE_TRANSITIONS', '[OPTIONAL DISCARD] Player completing optional discard phase');

    // Reset discard count for next round
    setOptionalDiscardCount(0);

    // Commit completion of optionalDiscard phase
    const result = await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'optionalDiscard',
      actionData: { completed: true }
    });

    // Unified logic: Check opponent commitment status directly from state
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

  /**
   * HANDLE MANDATORY DISCARD CONTINUE
   * Completes the mandatoryDiscard phase by committing and transitioning to next phase.
   * Called when player has finished all mandatory discards (or had none to begin with).
   */
  const handleMandatoryDiscardContinue = async () => {
    debugLog('PHASE_TRANSITIONS', '[MANDATORY DISCARD] Player completing mandatory discard phase');

    // Commit completion of mandatoryDiscard phase
    const result = await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'mandatoryDiscard',
      actionData: { completed: true }
    });

    // Check opponent commitment status directly from state
    const commitments = gameState.commitments || {};
    const phaseCommitments = commitments.mandatoryDiscard || {};
    const opponentCommitted = phaseCommitments[getOpponentPlayerId()]?.completed;

    if (!opponentCommitted) {
      debugLog('PHASE_TRANSITIONS', '✋ Opponent not committed yet, showing waiting overlay');

      // Wait for phase announcements to finish before showing waiting modal
      // Check if announcements are queued OR currently playing
      if (phaseAnimationQueue) {
        const queueLength = phaseAnimationQueue.getQueueLength();
        const isPlaying = phaseAnimationQueue.isPlaying();

        if (queueLength > 0 || isPlaying) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', { queueLength, isPlaying });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('mandatoryDiscard');
            unsubscribe(); // Clean up listener
            debugLog('PHASE_TRANSITIONS', '✅ Announcement queue complete, showing waiting modal');
          });
        } else {
          // No queued announcements, show immediately
          setWaitingForPlayerPhase('mandatoryDiscard');
        }
      } else {
        // No animation queue available, show immediately
        setWaitingForPlayerPhase('mandatoryDiscard');
      }
    } else {
      debugLog('PHASE_TRANSITIONS', '✅ Both players complete, no waiting overlay');
    }
  };

  /**
   * HANDLE MANDATORY DRONE REMOVAL CONTINUE
   * Completes the mandatoryDroneRemoval phase by committing and transitioning to next phase.
   * Called when player has finished all mandatory drone removals (or had none to begin with).
   */
  const handleMandatoryDroneRemovalContinue = async () => {
    debugLog('PHASE_TRANSITIONS', '[MANDATORY DRONE REMOVAL] Player completing mandatory drone removal phase');

    // Commit completion of mandatoryDroneRemoval phase
    const result = await processActionWithGuestRouting('commitment', {
      playerId: getLocalPlayerId(),
      phase: 'mandatoryDroneRemoval',
      actionData: { completed: true }
    });

    // Check opponent commitment status directly from state
    const commitments = gameState.commitments || {};
    const phaseCommitments = commitments.mandatoryDroneRemoval || {};
    const opponentCommitted = phaseCommitments[getOpponentPlayerId()]?.completed;

    if (!opponentCommitted) {
      debugLog('PHASE_TRANSITIONS', '✋ Opponent not committed yet, showing waiting overlay');

      // Wait for phase announcements to finish before showing waiting modal
      // Check if announcements are queued OR currently playing
      if (phaseAnimationQueue) {
        const queueLength = phaseAnimationQueue.getQueueLength();
        const isPlaying = phaseAnimationQueue.isPlaying();

        if (queueLength > 0 || isPlaying) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', { queueLength, isPlaying });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('mandatoryDroneRemoval');
            unsubscribe(); // Clean up listener
            debugLog('PHASE_TRANSITIONS', '✅ Announcement queue complete, showing waiting modal');
          });
        } else {
          // No queued announcements, show immediately
          setWaitingForPlayerPhase('mandatoryDroneRemoval');
        }
      } else {
        // No animation queue available, show immediately
        setWaitingForPlayerPhase('mandatoryDroneRemoval');
      }
    } else {
      debugLog('PHASE_TRANSITIONS', '✅ Both players complete, no waiting overlay');
    }
  };

  /**
   * CHECK BOTH PLAYERS HAND LIMIT COMPLETE
   * Checks if both players have completed the optionalDiscard phase.
   * Used to determine if phase can advance to draw.
   * @returns {boolean} True if both players have committed
   */
  const checkBothPlayersHandLimitComplete = () => {
    const commitmentStatus = gameStateManager.actionProcessor?.getPhaseCommitmentStatus('optionalDiscard');
    debugLog('PHASE_TRANSITIONS', '[OPTIONAL DISCARD] Commitment status:', commitmentStatus);
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
    // Determine if this is phase-based or ability-based mandatory removal
    const isAbilityBased = mandatoryAction?.fromAbility;
    const currentCount = isAbilityBased ? mandatoryAction.count : excessDrones;

    // Use ActionProcessor to handle destruction (supports multiplayer routing)
    const result = await processActionWithGuestRouting('destroyDrone', {
      droneId: drone.id,
      playerId: getLocalPlayerId()
    });

    if (!result.success) {
      console.error('Failed to destroy drone:', result.error);
      return;
    }

    // Calculate new count
    const newCount = currentCount - 1;

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
          const rng = SeededRandom.fromGameState(gameState);
          const droneToDestroy = rng.select(candidates);

          // Use ActionProcessor for AI drone destruction too
          await processActionWithGuestRouting('destroyDrone', {
            droneId: droneToDestroy.id,
            playerId: getOpponentPlayerId()
          });
        }
      }

      if (isAbilityBased) {
        // Clear ability-based mandatoryAction
        setMandatoryAction(null);
        // For ability-based, might need additional logic here (end turn, etc.)
        // Currently there are no abilities that force drone destruction, so this path is unused
      }
      // Note: Phase-based mandatory drone removal completion is handled by Continue button
    } else {
      // More drones need to be destroyed
      if (isAbilityBased) {
        // Update ability-based mandatoryAction count
        setMandatoryAction(prev => ({ ...prev, count: newCount }));
      }
      // For phase-based, count is derived from excessDrones, no need to update anything
    }

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

  /**
   * Handle card info icon click from game log
   * Looks up the full card data from card name and opens detail modal
   * @param {string} cardName - The name of the card from the log entry
   */
  const handleCardInfoClick = (cardName) => {
    const card = fullCardCollection.find(c => c.name === cardName);
    if (card) {
      setCardToView(card);
    } else {
      console.warn('Card not found in collection:', cardName);
    }
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
    <div className="h-screen text-white font-sans overflow-hidden flex flex-col relative" ref={gameAreaRef} onClick={() => { cancelAbilityMode(); cancelCardSelection(); }}>
     {currentBackground.type === 'animated' ? (
       <SpaceBackground />
     ) : (
       <StaticBackground imagePath={currentBackground.path} />
     )}
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
    {healEffects.map(heal => (
      <HealEffect
        key={heal.id}
        position={heal.position}
        healAmount={heal.healAmount}
        onComplete={heal.onComplete}
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
    {shipAbilityReveals.map(reveal => (
      <ShipAbilityRevealOverlay
        key={reveal.id}
        abilityName={reveal.abilityName}
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
    {overflowProjectiles.map(projectile => (
      <OverflowProjectile
        key={projectile.id}
        startPos={projectile.startPos}
        dronePos={projectile.dronePos}
        shipPos={projectile.shipPos}
        hasOverflow={projectile.hasOverflow}
        isPiercing={projectile.isPiercing}
        duration={projectile.duration}
        onComplete={projectile.onComplete}
      />
    ))}
    {splashEffects.map(splash => (
      <SplashEffect
        key={splash.id}
        centerPos={splash.centerPos}
        duration={splash.duration}
        onComplete={splash.onComplete}
      />
    ))}
    {barrageImpacts.map(impact => (
      <BarrageImpact
        key={impact.id}
        position={impact.position}
        size={impact.size}
        delay={impact.delay}
        onComplete={() => {
          setBarrageImpacts(prev => prev.filter(i => i.id !== impact.id));
        }}
      />
    ))}
    {railgunTurrets.map(turret => (
      <div
        key={turret.id}
        style={{
          position: 'fixed',
          left: turret.position.x,
          top: turret.position.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 9999
        }}
      >
        <RailgunTurret
          rotation={turret.rotation}
          onComplete={turret.onComplete}
        />
      </div>
    ))}
    {railgunBeams.map(beam => (
      <RailgunBeam
        key={beam.id}
        startPos={beam.startPos}
        endPos={beam.endPos}
        attackValue={beam.attackValue}
        duration={beam.duration}
        onComplete={beam.onComplete}
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
          zIndex: 99999,
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
        multiSelectState={multiSelectState}
        AI_HAND_DEBUG_MODE={AI_HAND_DEBUG_MODE}
        setShowAiHandModal={setShowAiHandModal}
        onShowDebugModal={() => setShowDebugModal(true)}
        onShowOpponentDrones={handleShowOpponentDrones}
        onShowGlossary={() => setShowGlossaryModal(true)}
        onShowAIStrategy={() => setShowAIStrategyModal(true)}
        onShowAddCardModal={handleOpenAddCardModal}
        testMode={testMode}
        handleCancelMultiMove={handleCancelMultiMove}
        handleConfirmMultiMoveDrones={handleConfirmMultiMoveDrones}
        selectedBackground={selectedBackground}
        onBackgroundChange={handleBackgroundChange}
      />

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
        pendingShieldAllocations={pendingShieldAllocations}
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
        setHoveredTarget={setHoveredTarget}
        onViewShipSection={handleViewShipSection}
        interceptedBadge={interceptedBadge}
      />

      <GameFooter
        gameMode={gameState.gameMode}
        localPlayerState={localPlayerState}
        localPlayerEffectiveStats={localPlayerEffectiveStats}
        sortedLocalActivePool={sortedLocalActivePool}
        gameLog={gameLog}
        footerView={footerView}
        isFooterOpen={isFooterOpen}
        multiSelectState={multiSelectState}
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
      />

      {/* Modals are unaffected and remain at the end */}
      <LogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        gameLog={gameLog}
        downloadLogAsCSV={downloadLogAsCSV}
        setAiDecisionLogToShow={setAiDecisionLogToShow}
        onCardInfoClick={handleCardInfoClick}
      />
      {modalContent && <GamePhaseModal title={modalContent.title} text={modalContent.text} onClose={modalContent.onClose === null ? null : (modalContent.onClose || (() => setModalContent(null)))}>{modalContent.children}</GamePhaseModal>}
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
          // Store data before closing modal
          const { lane, drone } = deploymentConfirmation;

          // Close modal immediately
          setDeploymentConfirmation(null);

          // Wait for modal to unmount before playing animations
          setTimeout(async () => {
            await executeDeployment(lane, drone);
          }, 400);
        }}
      />
      <MoveConfirmationModal
        moveConfirmation={moveConfirmation}
        show={!!moveConfirmation}
        onCancel={() => setMoveConfirmation(null)}
        onConfirm={async () => {
          if (!moveConfirmation) return;
          // Store data before closing modal
          const { drone, from, to, card } = moveConfirmation;

          // Close modal immediately
          setMoveConfirmation(null);

          // Wait for modal to unmount before playing animations
          setTimeout(async () => {
            if (card) {
              // Card-based movement (Maneuver, etc.)
              await resolveSingleMove(card, drone, from, to);
            } else {
              // Normal drone movement (no card)
              await processActionWithGuestRouting('move', {
                droneId: drone.id,
                fromLane: from,
                toLane: to,
                playerId: getLocalPlayerId()
              });
              setSelectedDrone(null);
            }
          }, 400);
        }}
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
      <CardDetailModal isOpen={!!cardToView} card={cardToView} onClose={() => setCardToView(null)} />
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

      <AbandonRunModal
        show={showAbandonRunModal}
        onCancel={() => setShowAbandonRunModal(false)}
        onConfirm={handleConfirmAbandonRun}
        lootCount={gameState.currentRunState?.runInventory?.length || 0}
        creditsEarned={0}
      />

      <ViewShipSectionModal
        isOpen={!!viewShipSectionModal}
        onClose={() => setViewShipSectionModal(null)}
        data={viewShipSectionModal}
      />

      <MandatoryActionModal
        mandatoryAction={
          mandatoryAction?.fromAbility
            ? mandatoryAction  // Use ability-based mandatoryAction
            : isInMandatoryDiscardPhase && !hasCommittedDiscard
              ? { type: 'discard', count: excessCards }
              : isInMandatoryRemovalPhase && !hasCommittedRemoval
                ? { type: 'destroy', count: excessDrones }
                : null
        }
        effectiveStats={localPlayerEffectiveStats}
        show={(shouldShowDiscardUI || shouldShowRemovalUI || mandatoryAction?.fromAbility) && showMandatoryActionModal}
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
          // Store data before closing modal
          const ability = abilityConfirmation.ability;
          const drone = abilityConfirmation.drone;
          const target = abilityConfirmation.target;

          // Close modal immediately
          setAbilityConfirmation(null);

          // Wait for modal to unmount before playing animations
          setTimeout(() => {
            resolveAbility(ability, drone, target);
          }, 400);
        }}
      />



      <AIHandDebugModal
        opponentPlayerState={opponentPlayerState}
        show={showAiHandModal}
        debugMode={AI_HAND_DEBUG_MODE}
        onClose={() => setShowAiHandModal(false)}
      />

      <OpponentDronesModal
        isOpen={showOpponentDronesModal}
        onClose={() => setShowOpponentDronesModal(false)}
        drones={opponentSelectedDrones}
        appliedUpgrades={opponentPlayerState.appliedUpgrades}
      />

      <GameDebugModal
        show={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        gameStateManager={gameStateManager}
        gameDataService={gameDataService}
      />

      {showGlossaryModal && (
        <GlossaryModal onClose={() => setShowGlossaryModal(false)} />
      )}

      {showAIStrategyModal && (
        <AIStrategyModal onClose={() => setShowAIStrategyModal(false)} />
      )}

      <AddCardToHandModal
        isOpen={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        onConfirm={handleAddCardsToHand}
        gameMode={gameState.gameMode}
      />

      {/* Renders the modal for viewing the deck */}
      <CardViewerModal
        isOpen={isViewDeckModalOpen}
        onClose={() => setIsViewDeckModalOpen(false)}
        cards={localPlayerState.deck}
        allCards={[...localPlayerState.deck, ...localPlayerState.hand, ...localPlayerState.discardPile]}
        title="Remaining Cards in Deck"
        groupByType={true}
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
        mandatory={true}
      />
      <ShipAbilityConfirmationModal
        shipAbilityConfirmation={shipAbilityConfirmation}
        show={!!shipAbilityConfirmation}
        onCancel={() => setShipAbilityConfirmation(null)}
        onConfirm={async () => {
          // Store data before closing modal
          const ability = shipAbilityConfirmation.ability;
          const sectionName = shipAbilityConfirmation.sectionName;
          const target = shipAbilityConfirmation.target;
          const abilityType = shipAbilityConfirmation.abilityType;

          // Close modal immediately
          setShipAbilityConfirmation(null);

          // Wait for modal to unmount before resolving ability
          setTimeout(async () => {
            // Route to specific action type based on ability
            if (abilityType === 'recall' || ability.name === 'Recall') {
              const result = await processActionWithGuestRouting('recallAbility', {
                targetId: target?.id || null,
                sectionName: sectionName,
                playerId: getLocalPlayerId()
              });
              debugLog('SHIP_ABILITY', `Recall ability completed:`, result);
            } else if (abilityType === 'targetLock' || ability.name === 'Target Lock') {
              const result = await processActionWithGuestRouting('targetLockAbility', {
                targetId: target?.id || null,
                sectionName: sectionName,
                playerId: getLocalPlayerId()
              });
              debugLog('SHIP_ABILITY', `Target Lock ability completed:`, result);
            } else if (abilityType === 'recalculate' || ability.name === 'Recalculate') {
              const result = await processActionWithGuestRouting('recalculateAbility', {
                sectionName: sectionName,
                playerId: getLocalPlayerId()
              });

              // Handle mandatoryAction for discard
              if (result.mandatoryAction) {
                setMandatoryAction(result.mandatoryAction);
                setFooterView('hand');
                setIsFooterOpen(true);
              }

              debugLog('SHIP_ABILITY', `Recalculate ability completed:`, result);
            } else if (abilityType === 'reallocateShields' || ability.name === 'Reallocate Shields') {
              // Pass pending changes to complete() - this is where game state is actually modified
              const result = await processActionWithGuestRouting('reallocateShieldsComplete', {
                playerId: getLocalPlayerId(),
                pendingChanges: pendingShieldChanges
              });

              // Clear reallocation UI state including pending changes
              setReallocationPhase(null);
              setShieldsToRemove(0);
              setShieldsToAdd(0);
              setOriginalShieldAllocation(null);
              setPostRemovalShieldAllocation(null);
              setReallocationAbility(null);
              setPendingShieldChanges({});
              setPostRemovalPendingChanges({});

              debugLog('SHIP_ABILITY', `Reallocate Shields ability completed:`, result);
            }

            // Clear reallocation UI state after ability completion
            setReallocationPhase(null);
            setShieldsToRemove(0);
            setShieldsToAdd(0);
            setOriginalShieldAllocation(null);
            setPostRemovalShieldAllocation(null);
            setReallocationAbility(null);
            setPendingShieldChanges({});
            setPostRemovalPendingChanges({});
          }, 400);
        }}
      />


      {/* Failed Run Loading Screen (MIA transition) */}
      {gameState.showFailedRunScreen && (
        <FailedRunLoadingScreen
          failureType={gameState.failedRunType}
          isStarterDeck={gameState.failedRunIsStarterDeck}
          onComplete={() => {
            gameStateManager.setState({
              showFailedRunScreen: false,
              failedRunType: null,
              failedRunIsStarterDeck: false,
              appState: 'hangar'
            });
          }}
        />
      )}

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