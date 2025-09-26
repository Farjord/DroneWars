// ========================================
// DRONE WARS GAME - MAIN APPLICATION
// ========================================
// This is the main React component that manages the UI state and coordinates
// between the game logic engine and the user interface. All actual game rules
// and calculations are handled by gameEngine in gameLogic.js.

// --- IMPORTS AND DEPENDENCIES ---
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { X, Sword, Rocket, Bolt, Loader2, Cpu, ChevronUp, Hand, ShieldCheck, RotateCcw, Settings } from 'lucide-react';
import './App.css';
import DeckBuilder from './DeckBuilder';
import CardViewerModal from './CardViewerModal';
import CardSelectionModal from './CardSelectionModal';
import MultiplayerLobby from './MultiplayerLobby';
import WaitingOverlay from './components/WaitingOverlay';
import { useGameState } from './hooks/useGameState';
import fullDroneCollection from './data/droneData.js';
import fullCardCollection from './data/cardData.js';
import shipSectionData from './data/shipData.js';
import aiPersonalities from './data/aiData.js';
import { aiBrain } from './logic/aiLogic.js';
import { gameEngine, startingDecklist } from './logic/gameLogic.js';
import { getRandomDrones, getElementCenter, getPhaseDisplayName } from './utils/gameUtils.js';
import { initializeDroneSelection, advanceDroneSelectionTrio } from './utils/droneSelectionUtils.js';
import { initializeShipPlacement } from './utils/shipPlacementUtils.js';
import gameFlowManager from './state/GameFlowManager.js';
import simultaneousActionManager from './state/SimultaneousActionManager.js';
import aiPhaseProcessor from './state/AIPhaseProcessor.js';
// ActionProcessor is created internally by GameStateManager
import CardStatHexagon from './components/ui/CardStatHexagon.jsx';
import ActionCard from './components/ui/ActionCard.jsx';
import DroneCard from './components/ui/DroneCard.jsx';
import GamePhaseModal from './components/ui/GamePhaseModal.jsx';
import ShipSection from './components/ui/ShipSection.jsx';
import ShipSectionsDisplay from './components/ui/ShipSectionsDisplay.jsx';
import DroneToken from './components/ui/DroneToken.jsx';
import DroneLanesDisplay from './components/ui/DroneLanesDisplay.jsx';
import AICardPlayReportModal from './components/modals/AICardPlayReportModal.jsx';
import UpgradeSelectionModal from './components/modals/UpgradeSelectionModal.jsx';
import ViewUpgradesModal from './components/modals/ViewUpgradesModal.jsx';
import DestroyUpgradeModal from './components/modals/DestroyUpgradeModal.jsx';

// ========================================
// MAIN APPLICATION COMPONENT
// ========================================
// Manages all UI state, modals, and user interactions.
// Delegates all game logic to gameEngine functions.

const App = () => {
  // --- CENTRALIZED GAME STATE ---
  const {
    gameState,
    p2pStatus,
    isMyTurn,
    getLocalPlayerId,
    getOpponentPlayerId,
    isMultiplayer,
    isLocalPlayer,
    getLocalPlayerState,
    getOpponentPlayerState,
    getLocalPlacedSections,
    getOpponentPlacedSections,
    updateGameState,
    updatePlayers,
    updatePlayerState,
    setPlayerStates,
    setCurrentPlayer,
    setTurnPhase,
    setFirstPlayerOfRound,
    setFirstPasserOfPreviousRound,
    setFirstPlayerOverride,
    setPassInfo,
    updatePassInfo,
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

  // --- DEBUG AND DEVELOPMENT FLAGS ---
  const AI_HAND_DEBUG_MODE = true; // Set to false to disable clicking to see the AI's hand
  const RACE_CONDITION_DEBUG = true; // Set to false to disable race condition monitoring

  // Race condition monitoring
  useEffect(() => {
    if (RACE_CONDITION_DEBUG) {
      const checkForRaceConditions = () => {
        const actionInProgress = isActionInProgress();
        const queueLength = getActionQueueLength();

        if (actionInProgress || queueLength > 0) {
          console.log('[RACE DEBUG] Action processing state:', {
            actionInProgress,
            queueLength,
            currentPlayer: gameState.currentPlayer,
            turnPhase: gameState.turnPhase,
            timestamp: Date.now()
          });
        }
      };

      const interval = setInterval(checkForRaceConditions, 1000);
      return () => clearInterval(interval);
    }
  }, [isActionInProgress, getActionQueueLength, gameState.currentPlayer, gameState.turnPhase]);

  // --- MANAGER INITIALIZATION AND EVENT HANDLING ---
  useEffect(() => {
    // Initialize SimultaneousActionManager with external dependencies
    simultaneousActionManager.initialize(
      gameStateManager,
      aiPhaseProcessor,
      () => gameState.gameMode !== 'local'
    );

    // Initialize GameFlowManager with managers and dependencies
    gameFlowManager.initialize(
      gameStateManager,
      simultaneousActionManager,
      gameStateManager.actionProcessor, // Use ActionProcessor instance from GameStateManager
      () => gameState.gameMode !== 'local'
    );

    // Initialize AIPhaseProcessor with game data
    aiPhaseProcessor.initialize(
      aiPersonalities,
      fullDroneCollection,
      gameState.selectedAIPersonality || aiPersonalities[0]
    );

    console.log('🔧 PhaseManager and AIPhaseProcessor initialized');
  }, []); // Run once on component mount

  // --- MODAL AND UI STATE ---
  // MOVED UP: Must be declared before useEffect that uses setModalContent
  const [showAiHandModal, setShowAiHandModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  // PhaseManager event listeners
  useEffect(() => {
    const handlePhaseEvent = (event) => {
      const { type, phase, playerId, data } = event;

      console.log(`🔔 App.jsx received PhaseManager event: ${type}`, { phase, playerId });

      if (type === 'playerCompleted') {
        // Handle individual player completion
        if (phase === 'droneSelection') {
          console.log(`✅ ${playerId} completed drone selection`);

          const isLocalPlayer = playerId === getLocalPlayerId();

          if (isLocalPlayer) {
            // Track local completion
            setLocalPhaseCompletion(prev => ({
              ...prev,
              droneSelection: true
            }));
          } else {
            // Track opponent completion in multiplayer
            if (isMultiplayer()) {
              setOpponentPhaseCompletion(prev => ({
                ...prev,
                droneSelection: true
              }));
            }
          }
        }
      } else if (type === 'phaseCompleted') {
        // Handle phase completion (both players done)
        if (phase === 'droneSelection') {
          console.log('🎯 Both players completed drone selection, PhaseManager will handle transition');

          // Clear temporary UI state only - PhaseManager handles phase transitions
          setTempSelectedDrones([]);
          setModalContent(null);

          // Reset phase completion tracking
          setLocalPhaseCompletion(prev => ({
            ...prev,
            droneSelection: false
          }));
          setOpponentPhaseCompletion(prev => ({
            ...prev,
            droneSelection: false
          }));

          // PhaseManager should handle the actual phase transition
        }
      } else if (type === 'phaseTransition') {
        // Handle phase transitions from GameFlowManager
        const { newPhase, previousPhase, firstPlayerResult } = event;
        console.log(`🔄 App.jsx handling phase transition: ${previousPhase} → ${newPhase}`);

        // Handle automatic first player determination
        if (newPhase === 'determineFirstPlayer' && firstPlayerResult) {
          console.log('🎯 First player determined, showing modal');
          setShowFirstPlayerModal(true);
        }

        // Safety check: Ensure placement data is initialized when entering placement phase
        if (newPhase === 'placement') {
          console.log('🚢 Ensuring placement data is initialized');

          // Check if unplacedSections exists and has content
          if (!unplacedSections || unplacedSections.length === 0) {
            console.log('⚠️ Missing placement data, initializing...');
            const placementData = initializeShipPlacement();
            updateGameState(placementData);
          }
        }

      }
    };

    // Subscribe to both managers for different types of events
    const unsubscribeGameFlow = gameFlowManager.subscribe(handlePhaseEvent);
    const unsubscribeSimultaneous = simultaneousActionManager.subscribe(handlePhaseEvent);

    return () => {
      unsubscribeGameFlow();
      unsubscribeSimultaneous();
    };
  }, [isMultiplayer, getLocalPlayerId, setTurnPhase, setModalContent]);

  // GameFlowManager now handles phase transitions automatically
  // No manual phase starting needed

  // --- MULTIPLAYER PHASE SYNC STATE ---
  const [opponentPhaseCompletion, setOpponentPhaseCompletion] = useState({
    droneSelection: false,
    deckSelection: false,
    placement: false
  });

  // --- LOCAL PHASE COMPLETION TRACKING ---
  const [localPhaseCompletion, setLocalPhaseCompletion] = useState({
    droneSelection: false,
    deckSelection: false,
    placement: false
  });
  const [deploymentConfirmation, setDeploymentConfirmation] = useState(null);
  const [moveConfirmation, setMoveConfirmation] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [showFirstPlayerModal, setShowFirstPlayerModal] = useState(false);
  const [showActionPhaseStartModal, setShowActionPhaseStartModal] = useState(false);
  const [showRoundEndModal, setShowRoundEndModal] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isViewDeckModalOpen, setIsViewDeckModalOpen] = useState(false);
  const [isViewDiscardModalOpen, setIsViewDiscardModalOpen] = useState(false);
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false);

  // --- EXTRACTED STATE (now from GameStateManager) ---
  // Core game state comes from gameState object:
  // gameState.turnPhase, gameState.turn, gameState.currentPlayer, etc.
  const { turnPhase, turn, currentPlayer, firstPlayerOfRound, firstPasserOfPreviousRound, firstPlayerOverride, passInfo, winner, unplacedSections, shieldsToAllocate, gameLog, placedSections } = gameState;

  // Use perspective-aware state getters for both AI and multiplayer modes
  const localPlayerState = getLocalPlayerState();
  const opponentPlayerState = getOpponentPlayerState();
  const localPlacedSections = getLocalPlacedSections();
  const opponentPlacedSections = getOpponentPlacedSections();


  // --- SHIP SECTION PLACEMENT ---
  const sectionsToPlace = ['bridge', 'powerCell', 'droneControlHub'];
  const [selectedSectionForPlacement, setSelectedSectionForPlacement] = useState(null);

  // --- PLAYER SELECTION AND TARGETING ---
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [tempSelectedDrones, setTempSelectedDrones] = useState([]);
  // droneSelectionPool and droneSelectionTrio now come from gameState
  const { droneSelectionPool, droneSelectionTrio } = gameState;

  // --- COMBAT AND ATTACK STATE ---
  const [pendingAttack, setPendingAttack] = useState(null);
  const [interceptionModal, setInterceptionModal] = useState(null);
  const [playerInterceptionChoice, setPlayerInterceptionChoice] = useState(null);
  const [potentialInterceptors, setPotentialInterceptors] = useState([]);

  // --- AI BEHAVIOR AND REPORTING ---
  const [aiActionReport, setAiActionReport] = useState(null);
  const [aiCardPlayReport, setAiCardPlayReport] = useState(null);
  const [aiActionTrigger, setAiActionTrigger] = useState(0);
  const [aiDecisionLogToShow, setAiDecisionLogToShow] = useState(null);

  // --- UI AND VISUAL EFFECTS ---
  const [footerView, setFooterView] = useState('drones');
  const [isFooterOpen, setIsFooterOpen] = useState(true);
  const [recentlyHitDrones, setRecentlyHitDrones] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [arrowState, setArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [deck, setDeck] = useState({});

  // --- REFS FOR DOM ELEMENTS AND STATE TRACKING ---
  const arrowLineRef = useRef(null);
  const droneRefs = useRef({});
  const gameAreaRef = useRef(null);
  const isResolvingAttackRef = useRef(false);

  // --- REFS FOR ASYNC OPERATIONS (non-game-state) ---
  const passInfoRef = useRef(passInfo);
  const turnPhaseRef = useRef(turnPhase);
  const winnerRef = useRef(winner);

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


  // Helper to update GameStateManager with engine results
  const updateGameStateFromEngineResult = useCallback((engineResult) => {
    gameStateManager.setPlayerStates(engineResult.player1, engineResult.player2);
  }, []);
  useEffect(() => {
    passInfoRef.current = passInfo;
  }, [passInfo]);
  useEffect(() => {
    turnPhaseRef.current = turnPhase;
  }, [turnPhase]);
  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  // --- MULTIPLAYER PHASE SYNC HANDLER ---
  useEffect(() => {
    if (!isMultiplayer()) return;

    // Listen for phase completion messages from opponent
    const handleP2PData = (event) => {
      console.log('🔥 P2P Event received in App:', event);
      if (event.type === 'PHASE_COMPLETED') {
        const { phase } = event.data || event; // Handle both event.data and direct event
        console.log(`🔥 Opponent completed phase: ${phase}`);
        setOpponentPhaseCompletion(prev => {
          const newState = {
            ...prev,
            [phase]: true
          };
          console.log(`🔥 Opponent phase completion updated:`, newState);
          return newState;
        });
      }
    };

    // Subscribe to P2P data events
    const unsubscribe = p2pManager.subscribe(handleP2PData);
    return unsubscribe;
  }, [isMultiplayer, p2pManager]);

  // Handle when both players complete a phase
  useEffect(() => {
    if (!isMultiplayer()) return;

    // Check for phase transitions when opponent completes phases
    // Only progress if BOTH local player has completed AND opponent has completed

    if (opponentPhaseCompletion.droneSelection && turnPhase === 'droneSelection') {
      const localPlayerHasSelectedDrones = localPlayerState.activeDronePool && localPlayerState.activeDronePool.length === 5;
      if (localPlayerHasSelectedDrones) {
        console.log('Both players completed drone selection, progressing to deck selection');
        (async () => {
          await processAction('phaseTransition', {
            newPhase: 'deckSelection',
            trigger: 'multiplayerDroneSelectionComplete'
          });
          setModalContent(null);
        })();
      }
    }

    if (opponentPhaseCompletion.deckSelection && turnPhase === 'deckSelection') {
      const localPlayerHasDeck = localPlayerState.deck && localPlayerState.deck.length > 0;
      if (localPlayerHasDeck) {
        console.log('Both players completed deck selection, progressing to placement');
        // Use ActionProcessor for phase transition and state setup
        processAction('phaseTransition', {
          newPhase: 'placement',
          trigger: 'multiplayerDeckSelectionComplete'
        });
        setSelectedSectionForPlacement(null);
        setModalContent({
          title: 'Phase 3: Place Your Ship Sections',
          text: 'Now, place your ship sections. The middle lane provides a strategic bonus to whichever section is placed there.',
          isBlocking: true,
        });
      } else {
        console.log('Opponent completed deck selection, but local player has not completed yet');
      }
    }

    if (opponentPhaseCompletion.placement && turnPhase === 'placement') {
      // Check if local player has also completed placement (via clicking Confirm Layout)
      if (localPhaseCompletion.placement) {
        // Both players have completed placement, proceed with game start
        console.log('Both players completed placement, transitioning to initialDraw phase');

      // Set phase to initialDraw using ActionProcessor
      processAction('phaseTransition', {
        newPhase: 'initialDraw',
        trigger: 'multiplayerPlacementComplete'
      });

      // Draw hands for both players if not already done
      const localPlayerId = getLocalPlayerId();
      const localPlayer = gameState[localPlayerId];
      const opponentPlayerId = getOpponentPlayerId();
      const opponentPlayer = gameState[opponentPlayerId];

      if (!localPlayer.hand || localPlayer.hand.length === 0) {
        const localPlacedSections = getLocalPlacedSections();
        const handSize = gameEngine.calculateEffectiveShipStats(localPlayer, localPlacedSections).totals.handLimit;
        let newDeck = [...localPlayer.deck];
        let newHand = [];

        for (let i = 0; i < handSize; i++) {
          if (newDeck.length > 0) {
            newHand.push(newDeck.pop());
          } else {
            break;
          }
        }
        updatePlayerState(localPlayerId, { ...localPlayer, deck: newDeck, hand: newHand });
      }

      const proceed = () => {
        setModalContent(null);

        // Use pure function from gameLogic.js
        const firstPlayer = gameEngine.determineFirstPlayer(turn, firstPlayerOverride, firstPasserOfPreviousRound);

        // Clear the override after using it
        if (firstPlayerOverride) {
          setFirstPlayerOverride(null);
        }


        setCurrentPlayer(firstPlayer);
        setFirstPlayerOfRound(firstPlayer);
        setShowFirstPlayerModal(true);
      };

      setModalContent({
        title: 'Start of Turn: Cards Drawn',
        text: 'You have automatically drawn up to your hand limit. The first player will now be determined.',
        onClose: proceed,
        isBlocking: true,
        children: (
          <div className="flex justify-center mt-6">
            <button onClick={proceed} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
              Continue
            </button>
          </div>
        )
      });
      }
    }
  }, [isMultiplayer, opponentPhaseCompletion, localPhaseCompletion, turnPhase, localPlayerState, getLocalPlacedSections, getLocalPlayerId, getOpponentPlayerId, gameState, updatePlayerState, setTurnPhase, setModalContent, setCurrentPlayer, setFirstPlayerOfRound, setShowFirstPlayerModal, firstPlayerOverride, setFirstPlayerOverride, turn, firstPasserOfPreviousRound]);

  // --- UI CALLBACK FUNCTIONS ---

  /**
   * TRIGGER EXPLOSION ANIMATION
   * Creates and displays an explosion effect at the location of a destroyed drone.
   * Automatically removes the explosion after 1 second.
   * @param {string} targetId - The ID of the drone element to explode
   */
  const triggerExplosion = useCallback((targetId) => {
    // Create the explosion effect using the pure function
    const explosionEffect = gameEngine.createExplosionEffect(targetId);

    // Handle UI-specific rendering
    const pos = getElementCenter(droneRefs.current[targetId], gameAreaRef.current);
    if (pos) {
      const explosionId = `${explosionEffect.timestamp}-${Math.random()}`;
      setExplosions(prev => [...prev, { id: explosionId, top: pos.y, left: pos.x }]);
      setTimeout(() => {
        setExplosions(prev => prev.filter(ex => ex.id !== explosionId));
      }, explosionEffect.duration);
    }
  }, []);

  // addLogEntry is now provided by useGameState hook

  // --- ABILITY AND CARD INTERACTION STATE ---
  const [abilityMode, setAbilityMode] = useState(null); // { drone, ability }
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);
  const [shipAbilityMode, setShipAbilityMode] = useState(null); // { sectionName, ability }
  const [shipAbilityConfirmation, setShipAbilityConfirmation] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null); // { card data }
  const [validCardTargets, setValidCardTargets] = useState([]); // [id1, id2, ...]
  const [cardConfirmation, setCardConfirmation] = useState(null); // { card, target }
  const [abilityConfirmation, setAbilityConfirmation] = useState(null);
  const [multiSelectState, setMultiSelectState] = useState(null); // To manage multi-step card effects

  // --- UPGRADE SYSTEM STATE ---
  const [destroyUpgradeModal, setDestroyUpgradeModal] = useState(null); // For targeting specific upgrades to destroy
  const [upgradeSelectionModal, setUpgradeSelectionModal] = useState(null); // For the new upgrade target selection modal
  const [viewUpgradesModal, setViewUpgradesModal] = useState(null); // To view applied upgrades on a drone card

  // --- MANDATORY ACTIONS AND SPECIAL PHASES ---
  const [mandatoryAction, setMandatoryAction] = useState(null); // e.g., { type: 'discard'/'destroy', player: getLocalPlayerId(), count: X }
  const [showMandatoryActionModal, setShowMandatoryActionModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(null); // For confirm/cancel popups
  const [optionalDiscardCount, setOptionalDiscardCount] = useState(0); // For optional discard phase
  const [cardSelectionModal, setCardSelectionModal] = useState(null); // For search and draw card selection

  // --- SHIELD REALLOCATION STATE ---
  const [reallocationPhase, setReallocationPhase] = useState(null); // 'removing' | 'adding' | null
  const [shieldsToRemove, setShieldsToRemove] = useState(0);
  const [shieldsToAdd, setShieldsToAdd] = useState(0);
  const [originalShieldAllocation, setOriginalShieldAllocation] = useState(null);
  const [initialShieldAllocation, setInitialShieldAllocation] = useState(null); // For shield allocation reset
  const [reallocationAbility, setReallocationAbility] = useState(null);

  // --- PERFORMANCE OPTIMIZED COMPUTED VALUES ---
  const localPlayerEffectiveStats = useMemo(() => {
    return localPlayerState ? gameEngine.calculateEffectiveShipStats(localPlayerState, localPlacedSections) : null;
  }, [localPlayerState?.shipSections, localPlacedSections]);

  const opponentPlayerEffectiveStats = useMemo(() => {
    return opponentPlayerState ? gameEngine.calculateEffectiveShipStats(opponentPlayerState, opponentPlacedSections) : null;
  }, [opponentPlayerState?.shipSections, opponentPlacedSections]);

  const totalLocalPlayerDrones = useMemo(() => {
    return localPlayerState ? Object.values(localPlayerState.dronesOnBoard).flat().length : 0;
  }, [localPlayerState?.dronesOnBoard]);

  const totalOpponentPlayerDrones = useMemo(() => {
    return opponentPlayerState ? Object.values(opponentPlayerState.dronesOnBoard).flat().length : 0;
  }, [opponentPlayerState?.dronesOnBoard]);

  // ========================================
  // MULTIPLAYER PHASE SYNCHRONIZATION
  // ========================================

  /**
   * Send phase completion message to opponent
   */
  const sendPhaseCompletion = useCallback((phase) => {
    console.log(`🔥 sendPhaseCompletion called for phase: ${phase}`);

    // Mark local phase as completed
    setLocalPhaseCompletion(prev => {
      const newState = {
        ...prev,
        [phase]: true
      };
      console.log(`🔥 Local phase completion updated:`, newState);
      return newState;
    });

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

  /**
   * Check if both players have completed a phase
   */
  const areBothPlayersReady = useCallback((phase) => {
    const isMP = isMultiplayer();
    const localReady = localPhaseCompletion[phase];
    const opponentReady = opponentPhaseCompletion[phase];
    const bothReady = !isMP ? true : (localReady && opponentReady);

    console.log(`🔥 areBothPlayersReady(${phase}):`, {
      isMultiplayer: isMP,
      localReady,
      opponentReady,
      bothReady,
      localPhaseCompletion,
      opponentPhaseCompletion
    });

    return bothReady;
  }, [isMultiplayer, localPhaseCompletion, opponentPhaseCompletion]);

  // ========================================
  // GAME LOGIC WRAPPER FUNCTIONS
  // ========================================
  // These functions wrap gameEngine calls and handle UI state updates

  // --- PHASE TRANSITION FUNCTIONS ---

  /**
   * END ACTION PHASE
   * Transitions from action phase to round end, showing the round end modal.
   * Called when both players pass during action phase.
   */
  const endActionPhase = useCallback(() => {
    setShowRoundEndModal(true);
  }, []);

  /**
   * END DEPLOYMENT PHASE
   * Transitions from deployment phase to action phase, showing the action start modal.
   * Called when both players pass during deployment phase.
   */
  const endDeploymentPhase = () => {
    setShowActionPhaseStartModal(true);
  };

  // --- TURN MANAGEMENT ---
  const endTurn = useCallback(async (actingPlayer) => {
    // Use the new pure function that returns both transition and UI effects
    const { transition, uiEffects } = gameEngine.createTurnEndEffects(
      actingPlayer,
      passInfoRef.current,
      turnPhaseRef.current,
      winnerRef.current
    );

    // Handle game state transitions through ActionProcessor
    switch (transition.type) {
      case 'END_PHASE':
        if (transition.phase === 'deployment') endDeploymentPhase();
        if (transition.phase === 'action') endActionPhase();
        break;

      case 'CONTINUE_TURN':
        await processAction('turnTransition', {
          newPlayer: transition.nextPlayer,
          reason: 'continueTurn'
        });
        break;

      case 'CHANGE_PLAYER':
        await processAction('turnTransition', {
          newPlayer: transition.nextPlayer,
          reason: 'changePlayer'
        });
        break;
    }

    // Handle UI effects
    uiEffects.forEach(effect => {
      switch (effect.type) {
        case 'CLOSE_MODAL':
          setModalContent(null);
          break;
        case 'SHOW_MODAL':
          setModalContent(effect.modal);
          break;
        case 'TRIGGER_AI':
          setAiActionTrigger(prev => prev + 1);
          break;
      }
    });
  }, [endActionPhase]);
  

  useEffect(() => {
    const { validAbilityTargets, validCardTargets } = gameEngine.calculateAllValidTargets(
      abilityMode,
      shipAbilityMode,
      multiSelectState,
      selectedCard,
      localPlayerState,
      opponentPlayerState,
      fullDroneCollection
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

  // --- COMBAT RESOLUTION ---

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
        const triggerHitAnimation = (targetId) => {
            setRecentlyHitDrones(prev => [...prev, targetId]);
            setTimeout(() => setRecentlyHitDrones(prev => prev.filter(id => id !== targetId)), 500);
        };

        // Process attack through ActionProcessor
        const result = await processAction('attack', {
            attackDetails: attackDetails
        });

        // Handle UI effects (animations, reports)
        if (attackDetails.targetId) {
            triggerHitAnimation(attackDetails.targetId);
        }

        // Handle AI action report
        if (attackDetails.attackingPlayer === getOpponentPlayerId()) {
            setAiActionReport({
                ...result.attackResult,
                isBlocking: true
            });
        }

        // Handle after-attack effects
        if (result.afterAttackEffects) {
            result.afterAttackEffects.forEach(effect => {
                if (effect.type === 'EXPLOSION') triggerExplosion(effect.payload.targetId);
            });
        }

        // Handle turn ending
        if (result.attackResult.shouldEndTurn) {
            endTurn(getLocalPlayerId());
        }

        // Handle non-turn-ending attack cleanup
        setPendingAttack(null);

    } catch (error) {
        console.error('Error in resolveAttack:', error);
        // Emergency cleanup - ensure UI state doesn't get stuck
        setPendingAttack(null);
        setAiActionReport(null);
    } finally {
        // --- GUARANTEED CLEANUP (always runs) ---
        isResolvingAttackRef.current = false;
    }

}, [endTurn, triggerExplosion, processAction, getLocalPlayerId, getOpponentPlayerId]);

  // --- ABILITY RESOLUTION ---

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
      const result = await processAction('ability', {
        droneId: userDrone.id,
        abilityIndex: userDrone.abilities.indexOf(ability),
        targetId: targetDrone?.id || null
      });

      cancelAbilityMode();
      if (result.shouldEndTurn) {
        endTurn(getLocalPlayerId());
      }
    } catch (error) {
      console.error('Error in resolveAbility:', error);
      cancelAbilityMode();
    }
  }, [processAction, endTurn, getLocalPlayerId]);

  // --- SHIP ABILITY RESOLUTION ---

  /**
   * RESOLVE SHIP ABILITY
   * Processes ship section ability activation using gameEngine logic.
   * Handles special UI flows like mandatory actions and shield reallocation.
   * @param {Object} ability - The ship ability being activated
   * @param {string} sectionName - Name of the ship section using the ability
   * @param {Object} target - The target of the ability (if any)
   */
  const resolveShipAbility = useCallback((ability, sectionName, target) => {
    // Use gameEngine for all ship abilities
    const result = gameEngine.resolveShipAbility(
        ability,
        sectionName,
        target,
        getPlayerStatesForEngine(),
        getPlacedSectionsForEngine(),
        (logEntry) => addLogEntry(logEntry, 'resolveShipAbility'),
        resolveAttack // Pass the attack callback for damage effects
    );

    // Update player states
    updateGameStateFromEngineResult(result.newPlayerStates);

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

    if (result.shouldEndTurn) {
        endTurn(getLocalPlayerId());
    }

}, [addLogEntry, endTurn, localPlacedSections, opponentPlacedSections, resolveAttack]);

  // --- CARD RESOLUTION ---

  /**
   * RESOLVE CARD PLAY
   * Processes card activation using gameEngine logic.
   * Handles AI reporting, state updates, and chained effects.
   * @param {Object} card - The card being played
   * @param {Object} target - The target of the card (if any)
   * @param {string} actingPlayerId - getLocalPlayerId() or getOpponentPlayerId()
   * @param {Object} aiContext - AI decision context for logging
   */
  const resolveCardPlay = useCallback((card, target, actingPlayerId, aiContext = null) => {
    // Set up AI card play report if needed (before resolving, since gameEngine doesn't know about UI)
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

    // Debug: Log the target drone's state before game engine call
    if (target && target.id && target.owner) {
        const targetPlayerState = target.owner === getLocalPlayerId() ? getLocalPlayerState() : getOpponentPlayerState();
        let targetDrone = null;
        for (const [lane, drones] of Object.entries(targetPlayerState.dronesOnBoard)) {
            targetDrone = drones.find(drone => drone.id === target.id);
            if (targetDrone) {
                console.log('[CARD PLAY DEBUG] Target drone before gameEngine:', {
                    droneName: targetDrone.name,
                    hull: targetDrone.hull,
                    currentShields: targetDrone.currentShields,
                    cardDamage: card.effect?.value,
                    cardType: card.effect?.type,
                    cardDamageType: card.effect?.damageType
                });
                break;
            }
        }
    }

    // Use the gameEngine version
    const result = gameEngine.resolveCardPlay(
        card,
        target,
        actingPlayerId,
        getPlayerStatesForEngine(),
        getPlacedSectionsForEngine(),
        {
            logCallback: (logEntry) => addLogEntry(logEntry, 'resolveCardPlay', actingPlayerId === getOpponentPlayerId() ? aiContext : null),
            explosionCallback: triggerExplosion,
            hitAnimationCallback: null, // Not needed for cards
            resolveAttackCallback: resolveAttack
        }
    );

    // Update player states first (this includes card costs and discard)
    console.log('[CARD PLAY DEBUG] Updating player states after card resolution:', {
      card: card.name,
      actingPlayer: actingPlayerId,
      oldPlayer1Hull: localPlayerState.dronesOnBoard,
      oldPlayer2Hull: opponentPlayerState.dronesOnBoard,
      newPlayer1Hull: result.newPlayerStates.player1?.dronesOnBoard,
      newPlayer2Hull: result.newPlayerStates.player2?.dronesOnBoard
    });

    // FIXED: Now safe to use resolveCardPlay result since gameEngine properly integrates callback states
    console.log('[CARD PLAY DEBUG] Using gameEngine integrated state (includes callback results)');
    updateGameStateFromEngineResult(result.newPlayerStates);

    // Check if card needs selection (e.g., SEARCH_AND_DRAW)
    if (result.needsCardSelection) {
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

    // Handle additional effects (like non-damage effects)
    // Note: All damage effects are now processed directly in the logic layer
    // using snapshot-based resolution for consistency
    if (result.additionalEffects && result.additionalEffects.length > 0) {
        console.log(`[DEBUG] Processing ${result.additionalEffects.length} additional effects`);
        result.additionalEffects.forEach(effect => {
            // Damage effects should not reach here anymore - they're handled in gameLogic
            if (effect.type === 'ATTACK') {
                console.warn('[WARNING] ATTACK effect in additionalEffects - this should be handled in gameLogic now');
                resolveAttack(effect.attackDetails, true);
            }
            // Other effect types can be processed here if needed in the future
        });
    }

    // Handle UI cleanup for player 1 (only if no card selection needed)
    if (actingPlayerId === getLocalPlayerId()) {
        cancelCardSelection();
        setCardConfirmation(null);
    }

    // Handle turn ending
    if (result.shouldEndTurn) {
        endTurn(actingPlayerId);
    }
}, [localPlayerState, opponentPlayerState, resolveAttack, endTurn, triggerExplosion, addLogEntry, gameEngine, localPlacedSections, opponentPlacedSections]);

  // --- CARD SELECTION HANDLING ---

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

    const completion = gameEngine.finishCardPlay(originalCard, actingPlayerId, currentStates);

    // Apply final state updates
    updateGameStateFromEngineResult(completion.newPlayerStates);

    // Handle UI cleanup
    if (actingPlayerId === getLocalPlayerId()) {
      cancelCardSelection();
      setCardConfirmation(null);
    }

    // End turn if needed
    if (completion.shouldEndTurn) {
      endTurn(actingPlayerId);
    }

  }, [localPlayerState, opponentPlayerState, addLogEntry, endTurn]);

  // --- MOVEMENT RESOLUTION ---

  /**
   * RESOLVE MULTI MOVE
   * Processes multi-drone movement cards using gameEngine logic.
   * Handles movement effects, aura updates, and state transitions.
   * @param {Object} card - The movement card being played
   * @param {Array} dronesToMove - Array of drones to move
   * @param {string} fromLane - Source lane ID
   * @param {string} toLane - Destination lane ID
   */
  const resolveMultiMove = useCallback((card, dronesToMove, fromLane, toLane) => {
    const result = gameEngine.resolveMultiMove(
        card,
        dronesToMove,
        fromLane,
        toLane,
        localPlayerState,
        getOpponentPlayerState(),
        getPlacedSectionsForEngine(),
        {
            logCallback: addLogEntry,
            applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
            updateAurasCallback: gameEngine.updateAuras
        }
    );

    updatePlayerState(getLocalPlayerId(), result.newPlayerState);

    if (result.shouldClearMultiSelectState) {
        setMultiSelectState(null);
    }
    if (result.shouldCancelCardSelection) {
        cancelCardSelection();
    }
    if (result.shouldEndTurn) {
        endTurn(getLocalPlayerId());
    }
}, [localPlayerState, endTurn, addLogEntry, gameEngine, localPlacedSections, opponentPlacedSections]);


  /**
   * RESOLVE SINGLE MOVE
   * Processes single-drone movement cards using gameEngine logic.
   * Handles movement effects and maintains turn continuity (goAgain).
   * @param {Object} card - The movement card being played
   * @param {Object} droneToMove - The drone to move
   * @param {string} fromLane - Source lane ID
   * @param {string} toLane - Destination lane ID
   */
  const resolveSingleMove = useCallback((card, droneToMove, fromLane, toLane) => {
    const result = gameEngine.resolveSingleMove(
        card,
        droneToMove,
        fromLane,
        toLane,
        localPlayerState,
        getOpponentPlayerState(),
        getPlacedSectionsForEngine(),
        {
            logCallback: addLogEntry,
            applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
            updateAurasCallback: gameEngine.updateAuras
        }
    );

    updatePlayerState(getLocalPlayerId(), result.newPlayerState);

    if (result.shouldClearMultiSelectState) {
        setMultiSelectState(null);
    }
    if (result.shouldCancelCardSelection) {
        cancelCardSelection();
    }
    if (result.shouldEndTurn) {
        endTurn(getLocalPlayerId());
    }
    // Note: Single move cards have "goAgain: true", so shouldEndTurn will be false
}, [localPlayerState, addLogEntry, gameEngine, localPlacedSections, opponentPlacedSections]);

  /**
   * START OPTIONAL DISCARD PHASE
   * Initiates the optional discard phase where players can discard excess cards.
   * Uses player's effective discard limit for maximum cards to discard.
   */
  const startOptionalDiscardPhase = async () => {
    const p1Stats = localPlayerEffectiveStats; // Use the memoized stats
    setOptionalDiscardCount(0);

    await processAction('phaseTransition', {
      newPhase: 'optionalDiscard',
      trigger: 'startOptionalDiscardPhase'
    });

    setModalContent({
        title: 'Optional Discard Phase',
        text: `You may discard up to ${p1Stats.totals.discardLimit} cards from your hand. Click a card to discard it, then press "Finish Discarding" when you are done.`,
        isBlocking: true
    });
  };

  /**
   * HANDLE FINISH OPTIONAL DISCARD
   * Completes the optional discard phase and transitions to shield allocation.
   * Triggers hand drawing and proceeds to next game phase.
   */
  const handleFinishOptionalDiscard = () => {
    setModalContent(null);
    drawPlayerHand();
    proceedToShieldAllocation();
  };

  /**
   * HANDLE CONFIRM OPTIONAL DISCARD
   * Processes confirmed discard of a card during optional discard phase.
   * Updates hand, discard pile, and discard count.
   * @param {Object} card - The card being discarded
   */
  const handleConfirmOptionalDiscard = (card) => {
    addLogEntry({
        player: localPlayerState.name,
        actionType: 'DISCARD_OPTIONAL',
        source: card.name,
        target: 'N/A',
        outcome: `Optionally discarded ${card.name}.`
    }, 'handleConfirmOptionalDiscard');

    updatePlayerState(getLocalPlayerId(), {
        ...localPlayerState,
        hand: localPlayerState.hand.filter(c => c.instanceId !== card.instanceId),
        discardPile: [...localPlayerState.discardPile, card]
    });
    setOptionalDiscardCount(prev => prev + 1);
    setConfirmationModal(null);
  };

  /**
   * HANDLE OPTIONAL DISCARD CLICK
   * Handles player clicking a card during optional discard phase.
   * Shows confirmation modal or limit warning.
   * @param {Object} card - The card being clicked for discard
   */
  const handleOptionalDiscardClick = (card) => {
    if (optionalDiscardCount >= localPlayerEffectiveStats.totals.discardLimit) {
        setModalContent({
            title: "Discard Limit Reached",
            text: `You cannot discard any more cards this turn. Your limit is ${localPlayerEffectiveStats.totals.discardLimit}.`,
            isBlocking: true
        });
        return;
    }
    setConfirmationModal({
        type: 'discard',
        target: card,
        onConfirm: () => handleConfirmOptionalDiscard(card),
        onCancel: () => setConfirmationModal(null),
        text: `Are you sure you want to discard ${card.name}?`
    });
  };


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

  // =========================================================================
  // ==                         WIN CONDITION CHECK                         ==
  // ========================================
  // AUTOMATED GAME STATE MONITORING
  // ========================================
  // These useEffect hooks monitor game state and trigger automated responses

  // --- WIN CONDITION MONITORING ---
  useEffect(() => {
    if (winner) return;

    const winnerResult = gameEngine.checkGameStateForWinner(
      getPlayerStatesForEngine(),
      {
        logCallback: addLogEntry,
        setWinnerCallback: setWinner,
        showWinnerModalCallback: setShowWinnerModal
      }
    );
  }, [localPlayerState.shipSections, opponentPlayerState.shipSections, winner, addLogEntry]);




  // --- INTERCEPTION MONITORING ---
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

  // --- UI COMPONENTS ---

  /**
   * TARGETING ARROW COMPONENT
   * Renders a visual arrow from attacking drone to target during combat.
   * Uses SVG with dynamic positioning and dashed line animation.
   * @param {boolean} visible - Whether arrow should be displayed
   * @param {Object} start - Starting position {x, y}
   * @param {Object} end - Ending position {x, y}
   * @param {Object} lineRef - React ref for the SVG line element
   */
  const TargetingArrow = ({ visible, start, end, lineRef }) => {
    if (!visible) return null;
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-40">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
          refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ff0055" />
          </marker>
        </defs>
        <line ref={lineRef} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#ff0055" strokeWidth="4" markerEnd="url(#arrowhead)" strokeDasharray="10, 5" />
      </svg>
    );
  };

  /**
   * EXPLOSION COMPONENT
   * Renders a CSS-animated explosion effect at specified coordinates.
   * Automatically times out after animation duration.
   * @param {number} top - Y position in pixels
   * @param {number} left - X position in pixels
   */
  const Explosion = ({ top, left }) => (
    <div className="explosion" style={{ top: `${top}px`, left: `${left}px` }}></div>
  );



  /**
   * GAME PHASE MODAL COMPONENT
   * Base modal component used for game phase transitions and informational displays.
   * Provides consistent styling and layout for all game modals.
   * @param {string} title - Modal title text
   * @param {string} text - Modal body text
   * @param {Function} onClose - Callback when modal is closed
   * @param {React.ReactNode} children - Additional modal content
   * @param {string} maxWidthClass - Tailwind max-width class for modal sizing
   */
  const GamePhaseModal = ({ title, text, onClose, children, maxWidthClass = 'max-w-lg' }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full ${maxWidthClass} relative`}>
        {onClose && <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>}
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 text-center mb-4">{title}</h2>
        <p className="text-center text-gray-400">{text}</p>
        {children}
      </div>
    </div>
  );

  /**
   * AI ACTION REPORT MODAL COMPONENT
   * Displays detailed information about AI combat actions.
   * Shows attack results, damage dealt, and target status.
   * @param {Object} report - Combat report data with attacker, target, and damage info
   * @param {Function} onClose - Callback when modal is closed
   */
  const AIActionReportModal = ({ report, onClose }) => {
    if (!report) return null;

    const {
        attackerName,
        lane,
        targetName,
        targetType,
       interceptorName,
        shieldDamage,
        hullDamage,
        wasDestroyed,
       remainingShields,
        remainingHull
    } = report;

    const targetDisplayName = targetType === 'section'
    ? targetName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    : targetName;

    return (
     <GamePhaseModal title="AI Action Report" text="" onClose={onClose}>
             <div className="text-left text-gray-300 space-y-3 mt-4 text-center">
                     <p><strong className="text-pink-400">{attackerName}</strong> attacked in <strong>{lane?.replace('lane', 'Lane ') || 'Unknown Lane'}</strong>.</p>
                  {interceptorName ? (
                       <p>Your <strong className="text-yellow-400">{interceptorName}</strong> intercepted the attack, which was targeting your <strong className="text-cyan-400">{targetDisplayName}</strong>!</p>
                    ) : (
                       <p>It targeted your <strong className="text-cyan-400">{targetDisplayName}</strong>.</p>
                    )}
                     <p>The attack dealt <strong className="text-cyan-300">{shieldDamage}</strong> damage to shields and <strong className="text-red-400">{hullDamage}</strong> damage to the hull.</p>
                  {wasDestroyed ? (
                       <p className="font-bold text-red-500 text-lg">The target was destroyed!</p>
                    ) : (
                       <p>The target has <strong className="text-cyan-300">{remainingShields}</strong> shields and <strong className="text-green-400">{remainingHull}</strong> hull remaining.</p>
                    )}
          </div>
             <div className="flex justify-center mt-6">
                 <button onClick={onClose} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
                     Continue
                 </button>
          </div>
     </GamePhaseModal>
    );
  };

  /**
   * AI CARD PLAY REPORT MODAL COMPONENT
   * Displays information about cards played by the AI opponent.
   * Shows the card played and its target for player awareness.
   * @param {Object} report - Card play report with card, target, and lane info
   * @param {Function} onClose - Callback when modal is closed
   */
  const AICardPlayReportModal = ({ report, onClose }) => {
    if (!report) return null;
    const { card, targetName, targetLane } = report;

    return (
      <GamePhaseModal title="AI Action: Card Played" text="" onClose={onClose}>
        <div className="flex flex-col items-center gap-4 mt-4">
            <p className="text-center text-lg text-gray-300">
                The opponent played <strong className="text-purple-400">{card.name}</strong>
                {targetName && (
                    <> on <strong className="text-cyan-400">{targetName}</strong>
                    {targetLane && <> in <strong className="text-yellow-400">{targetLane}</strong></>}
                    </>
                )}!
            </p>
            {/* Display the card that was played */}
            <div className="transform scale-75">
                <ActionCard card={card} isPlayable={false} />
            </div>
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
            Continue
          </button>
        </div>
      </GamePhaseModal>
    );
  };

  /**
   * PLAYER INTERCEPTION MODAL COMPONENT
   * Allows player to choose whether to intercept an incoming attack.
   * Shows attacker, target, and available interceptor drones.
   * @param {Object} choiceData - Contains attack details and available interceptors
   * @param {Function} onIntercept - Callback when player chooses to intercept
   * @param {Function} onDecline - Callback when player declines interception
   */
  const PlayerInterceptionModal = ({ choiceData, onIntercept, onDecline }) => {
    const { attackDetails, interceptors } = choiceData;
    const { attacker, target, targetType, lane } = attackDetails;
  
    return (
     <GamePhaseModal
     title="Interception Opportunity!"
     text={`Combat in ${lane?.replace('lane', 'Lane ') || 'Unknown Lane'}`}
     onClose={onDecline}
     maxWidthClass="max-w-3xl"
      >
        <div className="flex justify-around items-center my-4 p-4 bg-black/20 rounded-lg">
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-pink-400 mb-2">Attacker</h4>
           <DroneToken drone={attacker} isPlayer={false} effectiveStats={gameEngine.calculateEffectiveStats(attacker, lane, opponentPlayerState, localPlayerState, getPlacedSectionsForEngine())} droneRefs={droneRefs} mandatoryAction={mandatoryAction} localPlayerState={localPlayerState}/>
          </div>
          <div className="text-4xl font-bold text-gray-500">VS</div>
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-cyan-400 mb-2">Target</h4>
           {targetType === 'drone' ? (
             <DroneToken drone={target} isPlayer={true} effectiveStats={gameEngine.calculateEffectiveStats(target, lane, localPlayerState, opponentPlayerState, getPlacedSectionsForEngine())} droneRefs={droneRefs} mandatoryAction={mandatoryAction} localPlayerState={localPlayerState} />

           ) : (
             <div className="transform scale-75">
               <ShipSection
                 section={target.name}
                 stats={localPlayerState.shipSections[target.name]}
                 isPlayer={true}
                 isInteractive={false}
                 gameEngine={gameEngine}
                 turnPhase={turnPhase}
                 isMyTurn={isMyTurn}
                 passInfo={passInfo}
                 getLocalPlayerId={getLocalPlayerId}
                 localPlayerState={localPlayerState}
                 shipAbilityMode={shipAbilityMode}
                 />
             </div>
           )}
          </div>
        </div>
  
        <h3 className="text-center text-white text-xl font-semibold mt-6 mb-2">Choose an Interceptor</h3>
        <p className="text-center text-gray-400 mb-4">Drones with higher speed or special abilities can intercept the attack.</p>
        <div className="flex flex-wrap justify-center gap-8 my-4">
         {interceptors.map(drone => (
           <DroneToken
             key={drone.id}
             drone={drone}
             isPlayer={true}
             onClick={() => onIntercept(drone)}
               effectiveStats={gameEngine.calculateEffectiveStats(drone, lane, localPlayerState, opponentPlayerState, getPlacedSectionsForEngine())}
               droneRefs={droneRefs}
               mandatoryAction={mandatoryAction}
               localPlayerState={localPlayerState}
               />
          ))}
        </div>
  
        <div className="flex justify-center mt-6">
          <button
           onClick={onDecline}
           className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors"
          >
            Decline Interception
        </button>
        </div>
     </GamePhaseModal>
    );
  };

  /**
   * DETAILED DRONE MODAL COMPONENT
   * Shows detailed view of a specific drone card.
   * Used for viewing drone stats, abilities, and image.
   * @param {Object} drone - The drone data to display
   * @param {Function} onClose - Callback when modal is closed
   */
  const DetailedDroneModal = ({ drone, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 text-center mb-4">{drone.name}</h2>
        <div className="flex justify-center">
            <DroneCard drone={drone} isSelectable={false} deployedCount={0}/>
        </div>
      </div>
    </div>
  );

  /**
   * SCALING TEXT COMPONENT
   * Automatically adjusts font size to fit text within container bounds.
   * Prevents text overflow in responsive card layouts.
   * @param {string} text - The text content to display
   * @param {string} className - CSS classes to apply to the text element
   */
  const ScalingText = ({ text, className }) => {
    const containerRef = useRef(null);
    const textRef = useRef(null);

    useEffect(() => {
            const container = containerRef.current;
            const textEl = textRef.current;
            if (!container || !textEl || container.clientHeight === 0) return;

            const resizeText = () => {
                let min, max;
               if(className.includes("font-orbitron")){
                    min = 8; max = 16;
                } else {
                    min = 8; max = 12; 
                }
                
                let fontSize = max;
                
               textEl.style.fontSize = `${fontSize}px`;
                
                while ((textEl.scrollHeight > container.clientHeight || textEl.scrollWidth > container.clientWidth) && fontSize > min) {
                    fontSize -= 0.5;
                   textEl.style.fontSize = `${fontSize}px`;
                }
            };
            
            const observer = new ResizeObserver(resizeText);
           observer.observe(container);

           resizeText();

            return () => observer.disconnect();
    }, [text, className]);

    return (
        <div ref={containerRef} className="h-full w-full flex items-center justify-center">
            <span ref={textRef} className={className}>{text}</span>
        </div>
    );
  };



  


  /**
   * AI DECISION LOG MODAL COMPONENT
   * Displays detailed breakdown of AI decision-making process.
   * Shows scores, logic, and chosen actions in tabular format.
   * @param {Array} decisionLog - Array of AI decision entries with scores and logic
   * @param {Function} onClose - Callback when modal is closed
   */
  const AIDecisionLogModal = ({ decisionLog, onClose }) => {
    if (!decisionLog) return null;

    // Helper to format the target display
    const formatTarget = (action) => {
      // Handle new, simpler deployment logs
      if (action.type === 'deploy' || !action.target) {
        return action.targetName;
      }

      // Handle attack display format
      if (action.type === 'attack') {
        const formattedName = action.target.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `${formattedName} (Lane ${action.attacker.lane.slice(-1)})`;
      }
      
      // Handle existing action logs
      const ownerPrefix = action.target.owner === getLocalPlayerId() ? 'Player' : 'AI';
      if (String(action.target.id).startsWith('lane')) {
        return `${ownerPrefix} Lane ${action.target.id.slice(-1)}`;
      }
      return `${ownerPrefix}: ${action.targetName}`;
    };

    return (
      <GamePhaseModal
        title="AI Decision Matrix"
        text="This log shows all actions the AI considered for its turn, the score it assigned, and the logic behind that score."
        onClose={onClose}
        maxWidthClass="max-w-7xl" // Make the modal wider
      >
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="p-2">Type</th>
                <th className="p-2">Instigator</th>
                <th className="p-2">Target</th>
                <th className="p-2 w-1/3">Logic Breakdown</th>
                <th className="p-2">Score</th>
                <th className="p-2">Chosen</th>
              </tr>
            </thead>
            <tbody>
              {decisionLog.sort((a,b) => b.score - a.score).map((action, index) => (
                <tr key={index} className={`border-b border-gray-700/50 ${action.isChosen ? 'bg-purple-900/50' : 'hover:bg-slate-700/50'}`}>
                  <td className="p-2 capitalize">{action.type ? action.type.replace('_', ' ') : 'Deploy'}</td>
                  <td className="p-2 text-purple-300">{action.instigator}</td>
                  <td className="p-2 text-cyan-300">{formatTarget(action)}</td>
                  <td className="p-2 text-gray-400 text-xs">{action.logic.join(' -> ')}</td>
                  <td className="p-2 font-bold text-lg">{action.score}</td>
                  <td className="p-2 text-center">{action.isChosen && <span className="text-yellow-400">✔</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
            Close
          </button>
        </div>
      </GamePhaseModal>
    );
  };
  
  /**
   * BEGIN TURN PROCEDURES
   * Initiates turn start sequence including mandatory discards and hand limit checks.
   * Handles both player and AI hand management.
   */
  const beginTurnProcedures = () => {
    setModalContent(null); // Close the 'Start of Turn' modal

    // Use consolidated hand limit checking
    const playerStates = { player1: gameState.player1, player2: gameState.player2 };
    const effectiveStats = {
      player1: { totals: localPlayerEffectiveStats.totals },
      player2: { totals: opponentPlayerEffectiveStats.totals }
    };

    const violations = gameEngine.checkHandLimitViolations(playerStates, effectiveStats);
    const localPlayerId = getLocalPlayerId();

    if (violations[localPlayerId].needsDiscard) {
      setMandatoryAction({
        type: 'discard',
        player: localPlayerId,
        count: violations[localPlayerId].discardCount
      });
      setShowMandatoryActionModal(true);
    } else {
      // REMOVED: Hand limit enforcement should only happen during dedicated discard phase
      // Hand limits are display-only during normal gameplay
      startOptionalDiscardPhase();
    }
  };

  /**
   * HANDLE START NEW ROUND
   * Processes round transition including state reset and energy regeneration.
   * Updates both players and initiates turn procedures.
   */
  const handleStartNewRound = async () => {
    setShowRoundEndModal(false);
    setSelectedCard(null);
    setSelectedDrone(null);
    setAbilityMode(null);
    setMultiSelectState(null);
    setFirstPasserOfPreviousRound(passInfo.firstPasser);

    // Use processAction for complete round start logic
    await processAction('roundStart', {
      newTurn: turn + 1,
      trigger: 'roundEndModal'
    });

    // --- MODIFIED: Show a modal before starting the discard phases ---
    setModalContent({
        title: 'Start of a New Round',
        text: 'The new round has begun. You will now resolve any mandatory discards, followed by an optional discard phase. Afterwards, you will automatically draw cards to your hand limit.', 
        onClose: beginTurnProcedures,
        isBlocking: true,
        children: (
          <div className="flex justify-center mt-6">
            <button onClick={beginTurnProcedures} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
              Begin
            </button>
          </div>
        )
    });
  };

  /**
   * HANDLE POST DISCARD ACTION
   * Processes actions after mandatory discard phase.
   * Ensures AI hand limit compliance before continuing.
   */
  const handlePostDiscardAction = () => {
    // REMOVED: Hand limit enforcement should only happen during dedicated discard phase
    // Hand limits are display-only during normal gameplay
    startOptionalDiscardPhase();
  };

  /**
   * START DEPLOYMENT COMPLIANCE CHECK
   * Initiates drone limit compliance checking for both players.
   * Handles over-limit drone destruction in first player order.
   */
  const startDeploymentComplianceCheck = () => {
   setShowFirstPlayerModal(false);

    const firstPlayerIsOverLimit = totalLocalPlayerDrones > localPlayerEffectiveStats.totals.cpuLimit;
    const secondPlayerIsOverLimit = totalOpponentPlayerDrones > opponentPlayerEffectiveStats.totals.cpuLimit;
    const checkOrder = firstPlayerOfRound === getLocalPlayerId() ? [getLocalPlayerId(), getOpponentPlayerId()] : [getOpponentPlayerId(), getLocalPlayerId()];
//

    const resolvePlayerCompliance = (player) => {
      if (player === getLocalPlayerId()) {
        if (firstPlayerIsOverLimit) {
         setMandatoryAction({
            type: 'destroy',
            player: getLocalPlayerId(),
            count: totalLocalPlayerDrones - localPlayerEffectiveStats.totals.cpuLimit,
          });
         setShowMandatoryActionModal(true);
          return true;
        }
      } else {
        if (secondPlayerIsOverLimit) {
           // AI over CPU limit - destroy lowest class drones
           let newOpponentPlayer = {...opponentPlayerState};
           let dronesToDestroyCount = Object.values(opponentPlayerState.dronesOnBoard).flat().length - opponentPlayerEffectiveStats.totals.cpuLimit;
           for (let i = 0; i < dronesToDestroyCount; i++) {
               const allDrones = Object.entries(newOpponentPlayer.dronesOnBoard).flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));
               if (allDrones.length === 0) break;

               const lowestClass = Math.min(...allDrones.map(d => d.class));
               const candidates = allDrones.filter(d => d.class === lowestClass);
               const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];

               newOpponentPlayer.dronesOnBoard[droneToDestroy.lane] = newOpponentPlayer.dronesOnBoard[droneToDestroy.lane].filter(d => d.id !== droneToDestroy.id);
               const onDestroyUpdates = gameEngine.onDroneDestroyed(newOpponentPlayer, droneToDestroy);
               Object.assign(newOpponentPlayer, onDestroyUpdates);
           }
           newOpponentPlayer.dronesOnBoard = gameEngine.updateAuras(newOpponentPlayer, getLocalPlayerState(), getPlacedSectionsForEngine());
           updatePlayerState(getOpponentPlayerId(), newOpponentPlayer);
        }
      }
      return false; 
    };
    
    if (!resolvePlayerCompliance(checkOrder[0])) {
      if (!resolvePlayerCompliance(checkOrder[1])) {
       handleStartDeploymentPhase();
      }
    }
  };

  // --- AI TURN EXECUTION ---
  useEffect(() => {
    const isMultiplayerGame = isMultiplayer();
    const opponentId = getOpponentPlayerId();
    const isCurrentPlayerOpponent = currentPlayer === opponentId;
    const hasBlockingConditions = (modalContent && modalContent.isBlocking) || winner || aiActionReport || aiCardPlayReport || pendingAttack || playerInterceptionChoice || mandatoryAction || showFirstPlayerModal || showActionPhaseStartModal || showRoundEndModal;

    const isAiTurn = !isMultiplayerGame && isCurrentPlayerOpponent && !hasBlockingConditions;

    if (!isAiTurn) return;

    let aiTurnTimer;

    const executeAiTurn = async () => {

      // Safety check: reset stuck attack flag before AI action
      if (isResolvingAttackRef.current) {
        console.warn('[AI TURN SAFETY] Detected stuck attack flag, resetting before AI turn');
        isResolvingAttackRef.current = false;
      }

      // Notify gameLogic to handle AI turn
      try {
        await processAction('aiTurn', {
          turnPhase,
          playerId: getOpponentPlayerId()
        });
      } catch (error) {
        console.error('Error processing AI turn:', error);
        // Fallback: use ActionProcessor for turn transition to prevent getting stuck
        try {
          await processAction('turnTransition', {
            newPlayer: getLocalPlayerId(),
            reason: 'aiTurnError'
          });
        } catch (fallbackError) {
          console.error('Error in AI turn fallback:', fallbackError);
        }
      }

    };

    aiTurnTimer = setTimeout(executeAiTurn, 1500);

    return () => {
      clearTimeout(aiTurnTimer);
    };
  }, [currentPlayer, turnPhase, passInfo, winner, aiActionTrigger, aiActionReport, aiCardPlayReport, pendingAttack, playerInterceptionChoice, mandatoryAction, modalContent, showFirstPlayerModal, showActionPhaseStartModal, showRoundEndModal]);

  // --- DEFENSIVE STATE CLEANUP ---
  // Reset attack flag when critical game state changes to prevent infinite loops
  useEffect(() => {
    // Reset attack flag on turn changes or game reset
    if (winner || turnPhase === 'preGame') {
      if (isResolvingAttackRef.current) {
        console.log('[DEFENSIVE CLEANUP] Resetting stuck attack flag due to game state change');
        isResolvingAttackRef.current = false;
      }
    }
  }, [winner, turnPhase, currentPlayer]);

  // --- REACTIVE MODAL UPDATES FOR TURN CHANGES ---
  // Update modals when currentPlayer changes during active phases
  const [lastCurrentPlayer, setLastCurrentPlayer] = useState(currentPlayer);

  useEffect(() => {
    // Only update modals during active gameplay phases
    if (turnPhase !== 'deployment' && turnPhase !== 'action') return;

    // Don't interfere with other modal states
    if (winner || showFirstPlayerModal || showActionPhaseStartModal || showRoundEndModal) return;

    // Don't update if there are active confirmations
    if (deploymentConfirmation || moveConfirmation || cardConfirmation) return;

    // Only update when currentPlayer actually changes (not when modal is closed)
    if (currentPlayer === lastCurrentPlayer) return;

    const myTurn = isMyTurn();
    const isMultiplayerGame = isMultiplayer();

    console.log(`[MODAL UPDATE] Turn change detected:`, {
      currentPlayer,
      lastCurrentPlayer,
      myTurn,
      turnPhase,
      isMultiplayerGame,
      currentModalTitle: modalContent?.title
    });

    // Update the tracked currentPlayer
    setLastCurrentPlayer(currentPlayer);

    if (myTurn) {
      // It's now the local player's turn
      if (turnPhase === 'deployment') {
        const deploymentResource = turn === 1 ? 'Initial Deployment Points' : 'Energy';
        setModalContent({
          title: "Your Turn to Deploy",
          text: `Select a drone and a lane to deploy it. Drones cost ${deploymentResource} this turn. Or, click "Pass" to end your deployment for this phase.`,
          isBlocking: true
        });
      } else if (turnPhase === 'action') {
        setModalContent({
          title: "Action Phase - Your Turn",
          text: "It's your turn to act. Select a drone to move or attack, play a card, or use an ability.",
          isBlocking: true
        });
      }
    } else {
      // It's now the opponent's turn
      if (turnPhase === 'deployment') {
        setModalContent({
          title: isMultiplayerGame ? "Opponent's Turn" : "AI Thinking...",
          text: isMultiplayerGame ?
            "Your opponent is deploying a drone. Wait for their turn to complete." :
            "AI is deciding on drone deployment...",
          isBlocking: false
        });
      } else if (turnPhase === 'action') {
        setModalContent({
          title: isMultiplayerGame ? "Opponent's Turn" : "AI Thinking...",
          text: isMultiplayerGame ?
            "Your opponent is taking their turn." :
            "AI is deciding on its next action...",
          isBlocking: false
        });
      }
    }
  }, [currentPlayer, turnPhase, isMyTurn, isMultiplayer, turn, winner, showFirstPlayerModal, showActionPhaseStartModal, showRoundEndModal, deploymentConfirmation, moveConfirmation, cardConfirmation, lastCurrentPlayer, modalContent?.title]);

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
   setAiActionReport(null);
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
   * HANDLE SELECT OPPONENT
   * Sets up the selected AI opponent and initiates drone selection phase.
   * Configures AI drone pool and places opponent ship sections randomly.
   * @param {Object} selectedAI - The selected AI personality data
   */
  const handleSelectOpponent = (selectedAI) => {
    console.log('🎮 Starting new game against AI:', selectedAI.name);

    // Find the full drone objects from the collection based on the names in the AI's pool
    const aiDrones = fullDroneCollection.filter(d => selectedAI.dronePool.includes(d.name));

    // Initialize the drone counts for the AI's specific pool
    const aiInitialCounts = {};
    aiDrones.forEach(drone => {
      aiInitialCounts[drone.name] = 0;
    });

    // Start the game session with proper player configurations
    gameStateManager.startGame('local',
      { name: 'Player 1' }, // Player 1 config
      {
        name: selectedAI.name,
        decklist: selectedAI.decklist,
        activeDronePool: aiDrones,
        deployedDroneCounts: aiInitialCounts,
        aiPersonality: selectedAI
      }
    );

    // Start game flow after game session is initialized
    gameFlowManager.startGameFlow('droneSelection');

    // TODO: Ship placement should be handled by PhaseManager/AIPhaseProcessor, not App.jsx
    // Removing architecture violation - opponentPlacedSections will be set by proper phase management

    // Set the initial modal message for the player (UI concern)
    setModalContent({
        title: 'Phase 2: Choose Your Drones',
        text: 'Select 5 drones from your full collection to add to your Active Drone Pool. These are the drones you can launch during the game. Once you have made your selection, click "Confirm Selection".',
        isBlocking: true
    });

    // Clear UI state
    setTempSelectedDrones([]);
  };
    
 
  /**
   * HANDLE START ACTION PHASE
   * Transitions from deployment to action phase.
   * Sets first player and displays appropriate turn modal.
   */
  const handleStartActionPhase = async () => {
   setShowActionPhaseStartModal(false);
   setPassInfo({ firstPasser: null, [getLocalPlayerId() + 'Passed']: false, [getOpponentPlayerId() + 'Passed']: false });
   const firstActor = firstPlayerOfRound;

   // Use processAction for phase and player transition
   await processAction('phaseTransition', {
     newPhase: 'action',
     resetPassInfo: false // We already reset it above
   });

   await processAction('turnTransition', {
     newPlayer: firstActor,
     reason: 'startActionPhase'
   });

    // Don't show turn modals if game has ended
    if (winner) return;

    if (firstActor === getLocalPlayerId()) {
     setModalContent({
            title: "Action Phase Begins",
            text: "It's your turn to act. Select a drone to move or attack, play a card, or use an ability.",
            isBlocking: true
        });
} else {
 setModalContent({
        title: "Opponent's Turn",
        text: "Your opponent is taking their turn.",
        isBlocking: false
    });
}
  };
  
  /**
   * DRAW PLAYER HAND
   * Draws cards for player up to their hand limit.
   * Handles deck shuffling from discard pile when needed.
   */
  const drawPlayerHand = () => {
    // Draw cards to hand limit for local player
    const effectiveStats = gameEngine.calculateEffectiveShipStats(localPlayerState, localPlacedSections).totals;
    let newDeck = [...localPlayerState.deck];
    let newHand = [...localPlayerState.hand];
    let newDiscardPile = [...localPlayerState.discardPile];
    const handSize = effectiveStats.handLimit;

    while (newHand.length < handSize) {
      if (newDeck.length === 0) {
        if (newDiscardPile.length > 0) {
          newDeck = [...newDiscardPile].sort(() => 0.5 - Math.random());
          newDiscardPile = [];
        } else {
          break;
        }
      }
      const drawnCard = newDeck.pop();
      newHand.push(drawnCard);
    }
    updatePlayerState(getLocalPlayerId(), { ...localPlayerState, deck: newDeck, hand: newHand, discardPile: newDiscardPile });
  };

  /**
   * PROCEED TO FIRST TURN
   * Determines first player and initiates turn sequence.
   * Uses game logic for first player determination.
   */
  const proceedToFirstTurn = async () => {
    // Use pure function from gameLogic.js
    const firstPlayer = gameEngine.determineFirstPlayer(turn, firstPlayerOverride, firstPasserOfPreviousRound);

    // Clear the override after using it
    if (firstPlayerOverride) {
      setFirstPlayerOverride(null);
    }

    // Use processAction for state updates
    await processAction('turnTransition', {
      newPlayer: firstPlayer,
      reason: 'proceedToFirstTurn'
    });

    setFirstPlayerOfRound(firstPlayer);
    setShowFirstPlayerModal(true);
  };

  /**
   * PROCEED TO SHIELD ALLOCATION
   * Initiates shield restoration phase.
   * Calculates available shields and sets up allocation UI.
   */
  const proceedToShieldAllocation = async () => {
    setSelectedCard(null);
    setSelectedDrone(null);
    setAbilityMode(null);
    const shieldsPerTurn = localPlayerEffectiveStats.totals.shieldsPerTurn;
    setInitialShieldAllocation(JSON.parse(JSON.stringify(localPlayerState.shipSections)));

    await processAction('phaseTransition', {
      newPhase: 'allocateShields',
      trigger: 'proceedToShieldAllocation'
    });

    setModalContent({
        title: 'Phase: Restore Shields',
        text: `You have ${shieldsPerTurn} shields to restore. Click on any of your damaged ship sections to add a shield. When finished, click "End Allocation" to continue.`,
        isBlocking: true
    });
  };
   
  /**
   * HANDLE SELECT SECTION FOR PLACEMENT
   * Manages ship section selection during placement phase.
   * Handles selection toggling and section removal from lanes.
   * Uses direct GameStateManager updates for placement state changes.
   * @param {string} sectionName - Name of the section being selected
   */
  const handleSelectSectionForPlacement = (sectionName) => {
    const { turnPhase } = gameState;

    // Only handle during placement phase
    if (turnPhase !== 'placement') return;

    console.log('🔧 handleSelectSectionForPlacement called with:', sectionName, 'gameMode:', gameState.gameMode);

    // If clicking a section in the top "unplaced" row
    if (unplacedSections.includes(sectionName)) {
        // Toggle selection: if it's already selected, unselect it. Otherwise, select it.
        setSelectedSectionForPlacement(prev => prev === sectionName ? null : sectionName);
    } else {
        // If clicking a section that's already in a lane (a "placed" section)
        const laneIndex = localPlacedSections.indexOf(sectionName);
        const newPlaced = [...localPlacedSections];
        newPlaced[laneIndex] = null; // Remove from lane

        // Update local player's placed sections (always update placedSections for local player)
        updateGameState({
          placedSections: newPlaced,
          unplacedSections: [...unplacedSections, sectionName]
        });

        setSelectedSectionForPlacement(null); // Clear the selection
    }
  };

  /**
   * HANDLE LANE SELECT FOR PLACEMENT
   * Places selected ship section in chosen lane.
   * Handles lane swapping and section management.
   * Uses direct GameStateManager updates for placement state changes.
   * @param {number} laneIndex - Index of the lane (0, 1, 2)
   */
  const handleLaneSelectForPlacement = (laneIndex) => {
    const { turnPhase } = gameState;

    // Only handle during placement phase
    if (turnPhase !== 'placement') return;

    console.log('🔧 handleLaneSelectForPlacement called with lane:', laneIndex, 'gameMode:', gameState.gameMode);

    if (selectedSectionForPlacement) {
      // If the lane is occupied, swap with the selected section
      if (localPlacedSections[laneIndex]) {
        const sectionToSwap = localPlacedSections[laneIndex];
        const newPlaced = [...localPlacedSections];
        newPlaced[laneIndex] = selectedSectionForPlacement;

        // Find where the selected section was and put the swapped one there
        const oldIndexOfSelected = unplacedSections.indexOf(selectedSectionForPlacement);
        const newUnplaced = [...unplacedSections];
        newUnplaced.splice(oldIndexOfSelected, 1, sectionToSwap);

        // Update local player's placement state (always update placedSections for local player)
        updateGameState({
          unplacedSections: newUnplaced,
          placedSections: newPlaced
        });

      } else {
        // If the lane is empty, place the section
        const newPlaced = [...localPlacedSections];
        newPlaced[laneIndex] = selectedSectionForPlacement;

        // Use direct GameStateManager updates for placement phase
        updateGameState({
          placedSections: newPlaced,
          unplacedSections: unplacedSections.filter(s => s !== selectedSectionForPlacement)
        });
      }
      setSelectedSectionForPlacement(null);
    } else if (localPlacedSections[laneIndex]) {
      // If no section is selected, clicking a placed one picks it up
      handleSelectSectionForPlacement(localPlacedSections[laneIndex]);
    }
  };

  /**
   * HANDLE CONFIRM PLACEMENT
   * Finalizes ship section placement using PhaseManager.
   * Validates placement and delegates to PhaseManager for processing.
   */
  const handleConfirmPlacement = async () => {
    const { turnPhase } = gameState;

    // Only handle during placement phase
    if (turnPhase !== 'placement') return;

    console.log(`🔧 handleConfirmPlacement called`);

    // Validate that all sections are placed
    const hasEmptySections = localPlacedSections.some(section => section === null || section === undefined);
    if (hasEmptySections) {
      setModalContent({
        title: 'Incomplete Placement',
        text: 'All ship sections must be placed before confirming placement.',
        onClose: () => setModalContent(null),
        isBlocking: false
      });
      return;
    }

    console.log(`🔧 Submitting placement to PhaseManager:`, localPlacedSections);

    // Submit placement to SimultaneousActionManager
    try {
      const submissionResult = await simultaneousActionManager.submitPlacement(getLocalPlayerId(), localPlacedSections);

      if (!submissionResult.success) {
        console.error('❌ Placement submission failed:', submissionResult.error);
        setModalContent({
          title: 'Placement Error',
          text: submissionResult.error,
          onClose: () => setModalContent(null),
          isBlocking: false
        });
        return;
      }

      console.log('✅ Placement submitted successfully:', submissionResult);

      // In multiplayer mode, show waiting message if opponent hasn't completed
      if (isMultiplayer() && !submissionResult.data.bothComplete) {
        setModalContent({
          title: 'Placement Confirmed',
          text: 'Your ship placement has been confirmed. Waiting for opponent to complete their placement...',
          onClose: () => setModalContent(null),
          isBlocking: false
        });
      }

    } catch (error) {
      console.error('❌ Error submitting placement:', error);
      setModalContent({
        title: 'Placement Error',
        text: 'An error occurred while submitting placement. Please try again.',
        onClose: () => setModalContent(null),
        isBlocking: false
      });
    }
  };

  /**
   * HANDLE ALLOCATE SHIELD
   * Allocates a shield to a specific ship section during shield allocation phase.
   * Validates shield limits and available shield count.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAllocateShield = async (sectionName) => {
    const { turnPhase } = gameState;

    if (turnPhase === 'allocateShields') {
      // Round start shield allocation - use direct GameStateManager updates
      const result = gameEngine.processShieldAllocation({ sectionName }, getLocalPlayerState());
      updatePlayerState(getLocalPlayerId(), result.newPlayerState);
    } else {
      // Action phase shield reallocation - use ActionProcessor
      await processAction('allocateShield', {
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
    const result = await processAction('reallocateShields', {
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
   * Validates section shield limits before allocation.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAddShield = async (sectionName) => {
    if (shieldsToAdd <= 0) return;

    const section = localPlayerState.shipSections[sectionName];
    const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, localPlayerState, localPlacedSections);
    if (section.allocatedShields >= effectiveMaxShields) return;

    // Use ActionProcessor for shield reallocation
    const result = await processAction('reallocateShields', {
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
   */
  const handleContinueToAddPhase = () => {
    setReallocationPhase('adding');
  };

  /**
   * HANDLE RESET REALLOCATION
   * Resets shield reallocation back to starting state.
   * Restores original shield distribution and counters.
   */
  const handleResetReallocation = () => {
    // Restore original shields
    updatePlayerState(getLocalPlayerId(), {
      ...localPlayerState,
      shipSections: originalShieldAllocation
    });

    // Reset counters
    setShieldsToRemove(reallocationAbility.ability.effect.value.maxShields);
    setShieldsToAdd(0);
    setReallocationPhase('removing');
  };

  /**
   * HANDLE CANCEL REALLOCATION
   * Cancels shield reallocation and restores original state.
   * Clears all reallocation UI state.
   */
  const handleCancelReallocation = async () => {
    // Restore original shields using ActionProcessor
    await processAction('reallocateShields', {
      action: 'restore',
      originalShipSections: originalShieldAllocation,
      playerId: getLocalPlayerId()
    });

    // Clear reallocation state
    setReallocationPhase(null);
    setShieldsToRemove(0);
    setShieldsToAdd(0);
    setOriginalShieldAllocation(null);
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
    const { turnPhase } = gameState;

    if (turnPhase === 'allocateShields') {
      // Round start shield allocation reset - use direct GameStateManager updates
      const result = gameEngine.resetShieldAllocation(getLocalPlayerState());
      updatePlayerState(getLocalPlayerId(), result.newPlayerState);
    } else {
      // Action phase shield reallocation reset - use ActionProcessor
      await processAction('resetShieldAllocation', {
        playerId: getLocalPlayerId()
      });
    }
  };

  /**
   * HANDLE END ALLOCATION
   * Completes shield allocation phase and handles AI shield allocation.
   * Determines first player and transitions to deployment phase.
   */
  const handleEndAllocation = async () => {
    const { turnPhase } = gameState;

    if (turnPhase === 'allocateShields') {
      // Round start shield allocation completion - use direct GameStateManager updates
      const result = gameEngine.endShieldAllocation({ trigger: 'manualEndAllocation' }, gameState);

      // Update both players if AI completion occurred
      if (result.newGameState.player1) {
        updatePlayerState('player1', result.newGameState.player1);
      }
      if (result.newGameState.player2) {
        updatePlayerState('player2', result.newGameState.player2);
      }

      // Handle phase transition if needed
      if (result.phaseTransition) {
        setTurnPhase(result.phaseTransition.newPhase);
        if (result.phaseTransition.firstPlayer) {
          setCurrentPlayer(result.phaseTransition.firstPlayer);
        }
      }
    } else {
      // Action phase shield operations - use ActionProcessor
      await processAction('endShieldAllocation', {
        trigger: 'manualEndAllocation'
      });
    }

    setShowFirstPlayerModal(true);
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
      processAction(actionType, payload);
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
    // TODO: Get phase type from GameFlowManager
    const isSequential = ['deployment', 'action'].includes(phase);

    console.log(`[PHASE ROUTING] ${actionType} in ${phase} → ${isSequential ? 'ActionProcessor' : 'Direct Update'}`);

    // Special case for shield actions
    if (actionType.includes('Shield') || actionType.includes('shield')) {
      console.log(`[SHIELD ROUTING] ${actionType} in ${phase} → ${phase === 'allocateShields' ? 'Round Start (Simultaneous)' : 'Action Phase (Sequential)'}`);
    }

    if (isSequential) {
      // Sequential phases: use ActionProcessor for serialized execution
      return await processAction(actionType, payload);
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
        // Shield allocation actions
        case 'allocateShield':
          if (turnPhase === 'allocateShields') {
            const result = gameEngine.processShieldAllocation(payload, getLocalPlayerState());
            updatePlayerState(getLocalPlayerId(), result.newPlayerState);
            return { success: true, result };
          }
          break;

        case 'resetShieldAllocation':
          if (turnPhase === 'allocateShields') {
            const result = gameEngine.resetShieldAllocation(getLocalPlayerState());
            updatePlayerState(getLocalPlayerId(), result.newPlayerState);
            return { success: true, result };
          }
          break;

        case 'endShieldAllocation':
          if (turnPhase === 'allocateShields') {
            const result = gameEngine.endShieldAllocation(payload, gameState);

            // Update both players if AI completion occurred
            if (result.newGameState.player1) {
              updatePlayerState('player1', result.newGameState.player1);
            }
            if (result.newGameState.player2) {
              updatePlayerState('player2', result.newGameState.player2);
            }

            // Handle phase transition if needed
            if (result.phaseTransition) {
              setTurnPhase(result.phaseTransition.newPhase);
              if (result.phaseTransition.firstPlayer) {
                setCurrentPlayer(result.phaseTransition.firstPlayer);
              }
            }

            return { success: true, result };
          }
          break;

        // Hand limit enforcement actions
        case 'discardCard':
          if (turnPhase === 'optionalDiscard') {
            handleRoundStartDiscard(payload.card || payload);
            return { success: true, message: 'Card discarded during round start' };
          }
          break;

        case 'drawToHandLimit':
          if (turnPhase === 'optionalDiscard') {
            handleRoundStartDraw();
            return { success: true, message: 'Drew cards to hand limit' };
          }
          break;

        case 'confirmHandLimit':
          if (turnPhase === 'optionalDiscard') {
            checkBothPlayersHandLimitComplete();
            return { success: true, message: 'Hand limit enforcement completed' };
          }
          break;

        // Setup phase actions
        case 'selectDrone':
        case 'confirmDroneSelection':
          if (turnPhase === 'droneSelection') {
            const result = gameEngine.processDroneSelection(payload, getLocalPlayerState());
            updatePlayerState(getLocalPlayerId(), result.newPlayerState);
            return { success: true, result };
          }
          break;

        case 'selectDeck':
        case 'confirmDeckSelection':
          if (turnPhase === 'deckSelection') {
            const result = gameEngine.processDeckSelection(payload, getLocalPlayerState());
            updatePlayerState(getLocalPlayerId(), result.newPlayerState);
            return { success: true, result };
          }
          break;

        case 'addCardToDeck':
        case 'removeCardFromDeck':
        case 'confirmDeck':
          if (turnPhase === 'deckBuilding') {
            const result = gameEngine.processDeckBuilding(payload, getLocalPlayerState());
            updatePlayerState(getLocalPlayerId(), result.newPlayerState);
            return { success: true, result };
          }
          break;

        // Placement actions
        case 'placePiece':
        case 'confirmPlacement':
          if (turnPhase === 'placement') {
            const result = gameEngine.processPlacement(payload, getLocalPlayerState());
            updatePlayerState(getLocalPlayerId(), result.newPlayerState);
            return { success: true, result };
          }
          break;

        // Initial draw actions
        case 'drawCard':
        case 'confirmInitialHand':
          if (turnPhase === 'initialDraw') {
            const result = gameEngine.processInitialDraw(payload, getLocalPlayerState());
            updatePlayerState(getLocalPlayerId(), result.newPlayerState);
            return { success: true, result };
          }
          break;

        // Phase transition actions (for simultaneous phases)
        case 'phaseTransition':
          if (!['deployment', 'action'].includes(turnPhase)) {
            console.log(`🔄 Simultaneous phase transition: ${turnPhase} -> ${payload.newPhase}`);
            setTurnPhase(payload.newPhase);

            // Handle any additional state updates
            if (payload.firstPlayer) {
              setCurrentPlayer(payload.firstPlayer);
            }

            return { success: true, message: `Transitioned to ${payload.newPhase}` };
          }
          break;

        // Generic state updates
        case 'updateGameState':
          updateGameState(payload);
          return { success: true, message: 'Game state updated directly' };

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
   * HANDLE ROUND START
   * Orchestrates the complete round start sequence with proper phase transitions.
   * Manages both simultaneous and sequential phases with multiplayer synchronization.
   */
  const handleRoundStart = async () => {
    console.log('🔄 Starting new round sequence');

    try {
      // 1. Hand limit enforcement (simultaneous)
      console.log('🔄 Phase 1: Hand limit enforcement (simultaneous)');
      setTurnPhase('optionalDiscard');
      await waitForBothPlayersComplete('optionalDiscard');

      // 2. Shield allocation (simultaneous)
      console.log('🔄 Phase 2: Shield allocation (simultaneous)');
      setTurnPhase('allocateShields');
      await waitForBothPlayersComplete('allocateShields');

      // 3. Start deployment (sequential)
      console.log('🔄 Phase 3: Starting deployment phase (sequential)');
      setTurnPhase('deployment');

      // Determine first player for sequential phase
      const firstPlayer = gameEngine.determineFirstPlayer(
        gameState.turn,
        gameState.firstPlayerOverride,
        gameState.firstPasserOfPreviousRound
      );

      setCurrentPlayer(firstPlayer);
      setFirstPlayerOfRound(firstPlayer);

      // Reset pass info for new round
      setPassInfo({
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      });

      console.log('✅ Round start sequence complete');
    } catch (error) {
      console.error('❌ Error during round start sequence:', error);
    }
  };

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
          // Single player mode - handle AI completion automatically
          console.log(`🤖 Single player mode: handling AI completion for ${phase}`);
          handleAIPhaseCompletion(phase);
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
   * HANDLE AI PHASE COMPLETION
   * Automatically handles AI completion of simultaneous phases.
   * @param {string} phase - The phase to complete for AI
   */
  const handleAIPhaseCompletion = (phase) => {
    console.log(`🤖 Handling AI completion for ${phase} phase`);

    const opponentPlayerId = getOpponentPlayerId();
    const opponentPlayerState = getOpponentPlayerState();

    switch (phase) {
      case 'optionalDiscard':
        // AI hand limit enforcement
        const opponentStats = gameEngine.calculateEffectiveShipStats(
          opponentPlayerState,
          getOpponentPlacedSections()
        ).totals;

        if (opponentPlayerState.hand.length > opponentStats.handLimit) {
          const cardsToDiscard = opponentPlayerState.hand.length - opponentStats.handLimit;
          const cardsToDiscard_actual = opponentPlayerState.hand.slice(0, cardsToDiscard);

          updatePlayerState(opponentPlayerId, {
            hand: opponentPlayerState.hand.slice(cardsToDiscard),
            discardPile: [...opponentPlayerState.discardPile, ...cardsToDiscard_actual]
          });

          addLogEntry({
            player: opponentPlayerState.name,
            actionType: 'DISCARD_OPTIONAL',
            cardsDiscarded: cardsToDiscard,
            timestamp: Date.now()
          });
        }

        // AI draw to hand limit
        handleRoundStartDraw_AI();
        break;

      case 'allocateShields':
        // AI shield allocation - use simple allocation strategy
        const aiShieldResult = aiBrain.makeShieldAllocationDecision(
          opponentPlayerState,
          getOpponentPlacedSections()
        );

        if (aiShieldResult && aiShieldResult.newShipSections) {
          updatePlayerState(opponentPlayerId, {
            shipSections: aiShieldResult.newShipSections
          });

          addLogEntry({
            player: opponentPlayerState.name,
            actionType: 'SHIELD_ALLOCATION',
            timestamp: Date.now()
          });
        }
        break;

      default:
        console.warn(`⚠️ No AI completion handler for phase: ${phase}`);
    }

    console.log(`✅ AI completion for ${phase} phase finished`);
  };

  // ========================================
  // SIMULTANEOUS HAND LIMIT ENFORCEMENT
  // ========================================

  /**
   * HANDLE ROUND START DISCARD
   * Handles simultaneous discard during optionalDiscard phase.
   * Uses direct GameStateManager updates for parallel player actions.
   * @param {Object} card - The card being discarded
   */
  const handleRoundStartDiscard = (card) => {
    const { turnPhase } = gameState;

    if (turnPhase === 'optionalDiscard') {
      // Round start discard - use direct GameStateManager updates
      const currentPlayerState = getLocalPlayerState();
      const newHand = currentPlayerState.hand.filter(c => c.id !== card.id);
      const newDiscardPile = [...currentPlayerState.discardPile, card];

      updatePlayerState(getLocalPlayerId(), {
        hand: newHand,
        discardPile: newDiscardPile
      });

      // Update UI state
      setOptionalDiscardCount(prev => prev + 1);

      // Add log entry
      addLogEntry({
        player: currentPlayerState.name,
        actionType: 'DISCARD_OPTIONAL',
        card: card.name,
        timestamp: Date.now()
      });

      // Check if both players are complete
      checkBothPlayersHandLimitComplete();
    }
  };

  /**
   * HANDLE ROUND START DRAW
   * Handles simultaneous draw during round start.
   * Uses direct GameStateManager updates for parallel player actions.
   */
  const handleRoundStartDraw = () => {
    const { turnPhase } = gameState;

    if (turnPhase === 'optionalDiscard') {
      // Round start draw - use direct GameStateManager updates
      const currentPlayerState = getLocalPlayerState();
      const effectiveStats = gameEngine.calculateEffectiveShipStats(currentPlayerState, getLocalPlacedSections()).totals;

      let newDeck = [...currentPlayerState.deck];
      let newHand = [...currentPlayerState.hand];
      let newDiscardPile = [...currentPlayerState.discardPile];
      const handLimit = effectiveStats.handLimit;

      // Draw cards up to hand limit
      while (newHand.length < handLimit && (newDeck.length > 0 || newDiscardPile.length > 0)) {
        if (newDeck.length === 0) {
          // Shuffle discard pile into deck
          newDeck = [...newDiscardPile].sort(() => 0.5 - Math.random());
          newDiscardPile = [];
        }

        const drawnCard = newDeck.shift();
        if (drawnCard) {
          newHand.push(drawnCard);
        }
      }

      updatePlayerState(getLocalPlayerId(), {
        deck: newDeck,
        hand: newHand,
        discardPile: newDiscardPile
      });

      // Add log entry
      addLogEntry({
        player: currentPlayerState.name,
        actionType: 'DRAW_TO_HAND_LIMIT',
        cardsDrawn: newHand.length - currentPlayerState.hand.length,
        timestamp: Date.now()
      });

      // Check if both players are complete
      checkBothPlayersHandLimitComplete();
    }
  };

  /**
   * CHECK BOTH PLAYERS HAND LIMIT COMPLETE
   * Checks if both players have completed hand limit enforcement.
   * Transitions to shield allocation phase when both are ready.
   */
  const checkBothPlayersHandLimitComplete = () => {
    const { turnPhase } = gameState;

    if (turnPhase !== 'optionalDiscard') return;

    // In local mode, check if local player is done and handle AI
    if (!isMultiplayer()) {
      const localPlayerState = getLocalPlayerState();
      const opponentPlayerState = getOpponentPlayerState();
      const localStats = gameEngine.calculateEffectiveShipStats(localPlayerState, getLocalPlacedSections()).totals;
      const opponentStats = gameEngine.calculateEffectiveShipStats(opponentPlayerState, getOpponentPlacedSections()).totals;

      const localHandLimitMet = localPlayerState.hand.length <= localStats.handLimit;

      if (localHandLimitMet) {
        // Handle AI hand limit enforcement
        if (opponentPlayerState.hand.length > opponentStats.handLimit) {
          const cardsToDiscard = opponentPlayerState.hand.length - opponentStats.handLimit;
          const cardsToDiscard_actual = opponentPlayerState.hand.slice(0, cardsToDiscard);

          updatePlayerState(getOpponentPlayerId(), {
            hand: opponentPlayerState.hand.slice(cardsToDiscard),
            discardPile: [...opponentPlayerState.discardPile, ...cardsToDiscard_actual]
          });
        }

        // Draw AI to hand limit
        handleRoundStartDraw_AI();

        // Transition to shield allocation
        proceedToShieldAllocation();
      }
    } else {
      // In multiplayer mode, wait for both players to complete
      // This would be handled by multiplayer synchronization
      // For now, assume single player completion triggers transition
      const localPlayerState = getLocalPlayerState();
      const localStats = gameEngine.calculateEffectiveShipStats(localPlayerState, getLocalPlacedSections()).totals;
      const localHandLimitMet = localPlayerState.hand.length <= localStats.handLimit;

      if (localHandLimitMet) {
        // Send completion signal to opponent
        if (p2pManager && isMultiplayer()) {
          p2pManager.sendData({
            type: 'PHASE_COMPLETED',
            phase: 'optionalDiscard',
            playerId: getLocalPlayerId(),
            timestamp: Date.now()
          });
        }

        // Check if opponent is also complete (this would be handled by P2P events)
        // For now, proceed to shield allocation
        proceedToShieldAllocation();
      }
    }
  };

  /**
   * HANDLE ROUND START DRAW AI
   * Handles AI drawing to hand limit during round start.
   * Internal helper for AI hand limit enforcement.
   */
  const handleRoundStartDraw_AI = () => {
    const opponentPlayerState = getOpponentPlayerState();
    const opponentStats = gameEngine.calculateEffectiveShipStats(opponentPlayerState, getOpponentPlacedSections()).totals;

    let newDeck = [...opponentPlayerState.deck];
    let newHand = [...opponentPlayerState.hand];
    let newDiscardPile = [...opponentPlayerState.discardPile];
    const handLimit = opponentStats.handLimit;

    // Draw cards up to hand limit for AI
    while (newHand.length < handLimit && (newDeck.length > 0 || newDiscardPile.length > 0)) {
      if (newDeck.length === 0) {
        // Shuffle discard pile into deck
        newDeck = [...newDiscardPile].sort(() => 0.5 - Math.random());
        newDiscardPile = [];
      }

      const drawnCard = newDeck.shift();
      if (drawnCard) {
        newHand.push(drawnCard);
      }
    }

    updatePlayerState(getOpponentPlayerId(), {
      deck: newDeck,
      hand: newHand,
      discardPile: newDiscardPile
    });

    // Add log entry
    addLogEntry({
      player: opponentPlayerState.name,
      actionType: 'DRAW_TO_HAND_LIMIT',
      cardsDrawn: newHand.length - opponentPlayerState.hand.length,
      timestamp: Date.now()
    });
  };

  /**
   * HANDLE START DEPLOYMENT PHASE
   * Initiates deployment phase with appropriate turn modals.
   * Sets first player and displays deployment instructions.
   */
  const handleStartDeploymentPhase = async () => {
   setPassInfo({ firstPasser: null, [getLocalPlayerId() + 'Passed']: false, [getOpponentPlayerId() + 'Passed']: false });

   // Use processAction for phase transition
   await processAction('phaseTransition', {
     newPhase: 'deployment',
     resetPassInfo: false // We already reset it above
   });

    // Don't show turn modals if game has ended
    if (winner) return;

    const deploymentResource = turn === 1 ? 'Initial Deployment Points' : 'Energy';
    if (firstPlayerOfRound === getLocalPlayerId()) {
     setModalContent({
            title: "Your Turn to Deploy",
            text: `Select a drone and a lane to deploy it. Drones cost ${deploymentResource} this turn. Or, click "Pass" to end your deployment for this phase.`,
            isBlocking: true
        });
} else {
 setModalContent({
        title: "Opponent's Turn",
        text: "Your opponent is deploying a drone. Wait for their turn to complete.",
        isBlocking: false
    });
}
  };


  // Legacy startPlacementPhase function removed - now handled by GameFlowManager + utility functions

  /**
   * HANDLE DECK CHOICE
   * Processes player's choice between standard deck or custom deck building.
   * Routes to appropriate phase based on selection.
   * Uses direct GameStateManager updates for deck selection phase.
   * @param {string} choice - 'standard' or 'custom' deck choice
   */
  const handleDeckChoice = (choice) => {
    const { turnPhase } = gameState;

    // Only handle during deck selection phase
    if (turnPhase !== 'deckSelection') return;

    console.log('🔧 handleDeckChoice called with:', choice);

    if (choice === 'standard') {
      // Build the standard deck for the local player
      const localPlayerId = getLocalPlayerId();
      const standardDeck = gameEngine.buildDeckFromList(startingDecklist);

      // REFACTORED: Use SimultaneousActionManager to submit deck selection
      const submissionResult = simultaneousActionManager.submitDeckSelection(localPlayerId, standardDeck);

      if (!submissionResult.success) {
        console.error('❌ Deck selection submission failed:', submissionResult.error);
        return;
      }

      console.log('✅ Standard deck selection submitted to PhaseManager');

      addLogEntry({
        player: 'SYSTEM',
        actionType: 'DECK_SELECTION',
        source: 'Player Setup',
        target: 'N/A',
        outcome: 'Player selected the Standard Deck.'
      }, 'handleDeckChoice');

    } else if (choice === 'custom') {
      console.log('🔧 Transitioning to deck building phase');

      // REFACTORED: Use PhaseManager to handle phase transition
      // For now, still use direct transition - will be refactored when we handle deckBuilding phase
      setTurnPhase('deckBuilding');
    }
  };

  /**
   * HANDLE DECK CHANGE
   * Updates deck composition during deck building.
   * Manages card quantities and removal.
   * @param {string} cardId - ID of the card being changed
   * @param {number} quantity - New quantity for the card
   */
  const handleDeckChange = (cardId, quantity) => {
    setDeck(prevDeck => {
      const newDeck = { ...prevDeck };
      if (quantity === 0) {
        // If the quantity is set to 0, remove the card from the deck object
        delete newDeck[cardId];
      } else {
        newDeck[cardId] = quantity;
      }
      return newDeck;
    });
  };

  /**
   * HANDLE CONFIRM DECK
   * Finalizes custom deck composition and builds shuffled deck.
   * Updates player state and transitions to placement phase.
   * Uses direct GameStateManager updates for deck building phase.
   */
  const handleConfirmDeck = () => {
    const { turnPhase } = gameState;

    // Only handle during deck building phase
    if (turnPhase !== 'deckBuilding') return;

    console.log('🔧 handleConfirmDeck called');

    // Log deck contents for debugging
    const deckContents = Object.entries(deck)
      .map(([cardId, quantity]) => {
          const cardName = fullCardCollection.find(c => c.id === cardId)?.name || cardId;
          return `${cardName} x${quantity}`;
      })
      .join(', ');

    addLogEntry({
        player: 'SYSTEM',
        actionType: 'DECK_SELECTION',
        source: 'Player Setup',
        target: 'N/A',
        outcome: `Custom deck confirmed with cards: ${deckContents}.`
    }, 'handleConfirmDeck');

    // Build the final shuffled deck from the custom composition
    const decklist = Object.entries(deck).map(([id, quantity]) => ({ id, quantity }));
    const newPlayerDeck = gameEngine.buildDeckFromList(decklist);

    // REFACTORED: Use SimultaneousActionManager to submit deck selection
    const localPlayerId = getLocalPlayerId();
    const submissionResult = simultaneousActionManager.submitDeckSelection(localPlayerId, newPlayerDeck);

    if (!submissionResult.success) {
      console.error('❌ Custom deck selection submission failed:', submissionResult.error);
      return;
    }

    console.log('✅ Custom deck selection submitted to PhaseManager');
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
   * HANDLE CHOOSE DRONE FOR SELECTION
   * Processes drone choice during initial drone selection phase.
   * Advances to next trio or completes selection when 5 drones chosen.
   * Uses direct GameStateManager updates for drone selection state.
   * @param {Object} chosenDrone - The drone being selected
   */
  const handleChooseDroneForSelection = (chosenDrone) => {
    const { turnPhase } = gameState;

    // Only handle during drone selection phase
    if (turnPhase !== 'droneSelection') return;

    console.log('🔧 handleChooseDroneForSelection called with:', chosenDrone.name);

    const newSelection = [...tempSelectedDrones, chosenDrone];
    setTempSelectedDrones(newSelection);

    if (newSelection.length < 5) {
      // Continue selection process - advance to next trio
      const nextTrioData = advanceDroneSelectionTrio(droneSelectionPool);

      // REFACTORED: Update drone selection pool directly
      updateGameState(nextTrioData);

      console.log('🔧 Advanced to next trio, selected:', newSelection.length, 'of 5 drones');
    } else {
      console.log('🔧 All 5 drones selected, waiting for Continue button click');
    }
  };

  /**
   * HANDLE CONTINUE DRONE SELECTION
   * Processes the Continue button click after 5 drones are selected.
   * Uses PhaseManager submission pattern for drone selection.
   */
  const handleContinueDroneSelection = () => {
    const { turnPhase } = gameState;

    // Only handle during drone selection phase
    if (turnPhase !== 'droneSelection') return;

    console.log('🔧 handleContinueDroneSelection called with:', tempSelectedDrones.length, 'drones');

    const localPlayerId = getLocalPlayerId();
    const submissionResult = simultaneousActionManager.submitDroneSelection(localPlayerId, tempSelectedDrones);

    if (!submissionResult.success) {
      console.error('❌ Drone selection submission failed:', submissionResult.error);
      return;
    }

    console.log('✅ Drone selection submitted to PhaseManager');

    // Clear temporary selection after successful submission
    setTempSelectedDrones([]);

    // PhaseManager will handle:
    // - GameStateManager updates when both players complete
    // - Event emission for UI state changes
    // - Phase transition logic
    // - AI completion in single-player mode
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
      const result = await processAction('deployment', {
        droneData: selectedDrone,
        laneId: lane,
        playerId: getLocalPlayerId(),
        turn: turn
      });

      if (result.success) {
        setSelectedDrone(null);
        endTurn(getLocalPlayerId());
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
   * HANDLE CONFIRM DEPLOYMENT
   * Confirms deployment after showing cost confirmation.
   * Executes the deployment and clears confirmation state.
   */
  const handleConfirmDeployment = () => {
    if (!deploymentConfirmation) return;
    const { lane, budgetCost, energyCost } = deploymentConfirmation;
   executeDeployment(lane);
   setDeploymentConfirmation(null);
  };

  /**
   * HANDLE PLAYER PASS
   * Processes player passing during deployment or action phase.
   * Manages turn transitions and phase ending logic.
   */
  const handlePlayerPass = async () => {
    if (passInfo[`${getLocalPlayerId()}Passed`]) return;

    await processAction('playerPass', {
      playerId: getLocalPlayerId(),
      playerName: localPlayerState.name,
      turnPhase: turnPhase,
      passInfo: passInfo,
      opponentPlayerId: getOpponentPlayerId()
    });
  };

useEffect(() => {
    if (!pendingAttack || pendingAttack.attackingPlayer !== getOpponentPlayerId()) {
        return;
    }

    const interceptionResult = gameEngine.calculateAiInterception(
        pendingAttack,
        getPlayerStatesForEngine(),
        getPlacedSectionsForEngine()
    );

    if (interceptionResult.hasInterceptors) {
        setPlayerInterceptionChoice({
            attackDetails: interceptionResult.attackDetails,
            interceptors: interceptionResult.interceptors,
        });
    } else {
        resolveAttack(pendingAttack);
    }
}, [pendingAttack, resolveAttack, localPlacedSections, opponentPlacedSections]);
  
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
                  const effectiveStats = gameEngine.calculateEffectiveStats(drone, targetLane, opponentPlayerState, localPlayerState, getPlacedSectionsForEngine());
                  return effectiveStats.keywords.has('GUARDIAN');
              });

              if (hasGuardian) {
                  console.log("FAILURE: Target is protected by a Guardian drone.");
                  setModalContent({ title: "Invalid Target", text: "This lane is protected by a Guardian drone. You must destroy it before targeting other drones.", isBlocking: true });
              } else {
                  console.log("SUCCESS: No Guardian. Checking for interception.");
                  const attackDetails = { attacker: selectedDrone, target: token, targetType: 'drone', lane: attackerLane, attackingPlayer: getLocalPlayerId() };

                  const effectiveAttacker = gameEngine.calculateEffectiveStats(
                      selectedDrone, attackerLane, localPlayerState, opponentPlayerState,
                      getPlacedSectionsForEngine()
                  );

                  const potentialInterceptors = opponentPlayerState.dronesOnBoard[attackerLane]
                      .filter(d => {
                          const effectiveInterceptor = gameEngine.calculateEffectiveStats(
                              d, attackerLane, opponentPlayerState, localPlayerState,
                              getPlacedSectionsForEngine()
                          );
                          return !d.isExhausted &&
                                 (effectiveInterceptor.speed > effectiveAttacker.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS')) &&
                                 (d.id !== token.id);
                      })
                      .sort((a, b) => a.class - b.class);

                  let interceptor = null;
                  if (potentialInterceptors.length > 0) {
                      if (token.class === undefined || potentialInterceptors[0].class < token.class) {
                          interceptor = potentialInterceptors[0];
                      }
                  }

                  if (interceptor) {
                      setInterceptionModal({
                          interceptor,
                          originalTarget: token,
                          onClose: () => {
                              resolveAttack({ ...attackDetails, interceptor });
                              setInterceptionModal(null);
                              setSelectedDrone(null);
                          },
                      });
                  } else {
                      resolveAttack(attackDetails);
                      setSelectedDrone(null);
                  }
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
                  const effectiveStats = gameEngine.calculateEffectiveStats(drone, attackerLane, opponentPlayerState, localPlayerState, getPlacedSectionsForEngine());
                  return effectiveStats.keywords.has('GUARDIAN');
              });

              if (hasGuardian) {
                  console.log("FAILURE: Ship section is protected by a Guardian drone.");
                  setModalContent({ title: "Invalid Target", text: "This lane is protected by a Guardian drone. You must destroy it before targeting the ship section.", isBlocking: true });
              } else {
                  console.log("SUCCESS: No Guardian. Checking for interception.");
                  const attackDetails = { attacker: selectedDrone, target: target, targetType: 'section', lane: attackerLane, attackingPlayer: getLocalPlayerId() };

                  const effectiveAttacker = gameEngine.calculateEffectiveStats(
                      selectedDrone, attackerLane, localPlayerState, opponentPlayerState,
                      getPlacedSectionsForEngine()
                  );

                  const potentialInterceptors = opponentPlayerState.dronesOnBoard[attackerLane]
                      .filter(d => {
                          const effectiveInterceptor = gameEngine.calculateEffectiveStats(
                              d, attackerLane, opponentPlayerState, localPlayerState,
                              getPlacedSectionsForEngine()
                          );
                          return !d.isExhausted &&
                                 (effectiveInterceptor.speed > effectiveAttacker.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS'));
                      })
                      .sort((a, b) => a.class - b.class);

                  let interceptor = null;
                  if (potentialInterceptors.length > 0) {
                      // Ship sections can always be intercepted (no class comparison needed)
                      interceptor = potentialInterceptors[0];
                  }

                  if (interceptor) {
                      setInterceptionModal({
                          interceptor,
                          originalTarget: target,
                          onClose: () => {
                              resolveAttack({ ...attackDetails, interceptor });
                              setInterceptionModal(null);
                              setSelectedDrone(null);
                          },
                      });
                  } else {
                      resolveAttack(attackDetails);
                      setSelectedDrone(null);
                  }
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

    // --- NEW: Handle Ability Targeting ---
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
  const handleCardClick = (card) => {
    if (turnPhase !== 'action' || !isMyTurn() || passInfo[`${getLocalPlayerId()}Passed`]) return;
    if (localPlayerState.energy < card.cost) {
      return;
    }

    if (card.effect.type === 'MULTI_MOVE') {
      if (multiSelectState && multiSelectState.card.instanceId === card.instanceId) {
        cancelCardSelection();
      } else {
        setMultiSelectState({
          card: card,
          phase: 'select_source_lane',
          sourceLane: null,
          selectedDrones: [],
          maxSelection: card.effect.count,
        });
        setSelectedCard(card); 
        setSelectedDrone(null);
        setAbilityMode(null);
      }
      return;
    }

    if (card.effect.type === 'SINGLE_MOVE') {
      if (multiSelectState && multiSelectState.card.instanceId === card.instanceId) {
        cancelCardSelection();
      } else {
        setMultiSelectState({
          card: card,
          phase: 'select_drone',
          selectedDrone: null,
          sourceLane: null,
        });
        setSelectedCard(card);
        setSelectedDrone(null);
        setAbilityMode(null);
      }
      return;
    }
    if (selectedCard?.instanceId === card.instanceId) {
      cancelCardSelection();
    } else if (card.name === 'System Sabotage') {
        const validTargets = gameEngine.getValidTargets(getLocalPlayerId(), null, card, localPlayerState, opponentPlayerState);
        setDestroyUpgradeModal({ card, targets: validTargets, opponentState: opponentPlayerState });
        setSelectedCard(null);
        setAbilityMode(null);
        setSelectedDrone(null);
    } else if (card.type === 'Upgrade') {
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
   * EXECUTE MOVE
   * Executes confirmed drone movement with effects and exhaustion.
   * Applies on-move effects and updates auras after movement.
   */
  const executeMove = () => {
    if (!moveConfirmation) return;
    const { drone, from, to } = moveConfirmation;

    addLogEntry({ player: localPlayerState.name, actionType: 'MOVE', source: drone.name, target: to, outcome: `Moved from ${from} to ${to}.` }, 'playerMove');

    let tempState = JSON.parse(JSON.stringify(localPlayerState));
    tempState.dronesOnBoard[from] = tempState.dronesOnBoard[from].filter(d => d.id !== drone.id);
    const movedDrone = { ...drone, isExhausted: true };
    tempState.dronesOnBoard[to].push(movedDrone);

    const { newState: stateAfterMove } = gameEngine.applyOnMoveEffects(tempState, movedDrone, from, to, addLogEntry);

    stateAfterMove.dronesOnBoard = gameEngine.updateAuras(stateAfterMove, opponentPlayerState, getPlacedSectionsForEngine());

    updatePlayerState(getLocalPlayerId(), stateAfterMove);

    setMoveConfirmation(null);
    setSelectedDrone(null);
    endTurn(getLocalPlayerId());
  };
  
  /**
   * HANDLE CONFIRM MANDATORY DISCARD
   * Processes confirmed mandatory card discard.
   * Manages discard count and phase transitions.
   * @param {Object} card - The card being discarded
   */
  const handleConfirmMandatoryDiscard = (card) => {
    // Capture the current state before any updates
    const currentMandatoryAction = mandatoryAction;

    addLogEntry({
        player: localPlayerState.name,
        actionType: 'DISCARD_MANDATORY',
        source: card.name,
        target: 'N/A',
        outcome: `Discarded ${card.name}.`
    }, 'handleConfirmMandatoryDiscard');

    // Update player state
    updatePlayerState(getLocalPlayerId(), {
        ...localPlayerState,
        hand: localPlayerState.hand.filter(c => c.instanceId !== card.instanceId),
        discardPile: [...localPlayerState.discardPile, card]
    });
    
    // Clear the confirmation modal immediately
    setConfirmationModal(null);

    // Decide the next action based on the state we captured
    const newCount = currentMandatoryAction.count - 1;
    if (newCount <= 0) {
        setMandatoryAction(null);
        if (currentMandatoryAction.fromAbility) {
            endTurn(getLocalPlayerId()); // End the turn if it was from an ability
        } else {
            handlePostDiscardAction(); // Otherwise, proceed to the next game phase
        }
    } else {
        // If more discards are needed, just update the count
        setMandatoryAction(prev => ({ ...prev, count: newCount }));
    }
  };
  
  /**
   * HANDLE CONFIRM MANDATORY DESTROY
   * Processes confirmed mandatory drone destruction.
   * Handles both player and AI compliance checking.
   * @param {Object} drone - The drone being destroyed
   */
  const handleConfirmMandatoryDestroy = (drone) => {
   const lane = gameEngine.getLaneOfDrone(drone.id, localPlayerState);
   if (lane) {
       // Create proper immutable copy of the nested dronesOnBoard object
       let newPlayerState = {
           ...localPlayerState,
           dronesOnBoard: { ...localPlayerState.dronesOnBoard }
       };

       // Remove drone from the specific lane
       newPlayerState.dronesOnBoard[lane] = newPlayerState.dronesOnBoard[lane].filter(d => d.id !== drone.id);

       // Apply destruction updates (like deployedDroneCounts)
       const onDestroyUpdates = gameEngine.onDroneDestroyed(newPlayerState, drone);
       Object.assign(newPlayerState, onDestroyUpdates);

       // Update auras
       newPlayerState.dronesOnBoard = gameEngine.updateAuras(newPlayerState, getOpponentPlayerState(), getPlacedSectionsForEngine());

       updatePlayerState(getLocalPlayerId(), newPlayerState);
   }

   setMandatoryAction(prev => {
        const newCount = prev.count - 1;
        if (newCount <= 0) {
            const p2IsOver = totalOpponentPlayerDrones > opponentPlayerEffectiveStats.totals.cpuLimit;
            if (p2IsOver) {
               let newOpponentPlayer = {...opponentPlayerState};
                    let dronesToDestroyCount = Object.values(opponentPlayerState.dronesOnBoard).flat().length - gameEngine.calculateEffectiveShipStats(opponentPlayerState, opponentPlacedSections).totals.cpuLimit;
                    for (let i = 0; i < dronesToDestroyCount; i++) {
                        const allDrones = Object.entries(newOpponentPlayer.dronesOnBoard).flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));
                        if (allDrones.length === 0) break;

                        const lowestClass = Math.min(...allDrones.map(d => d.class));
                        const candidates = allDrones.filter(d => d.class === lowestClass);
                        const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];

                        newOpponentPlayer.dronesOnBoard[droneToDestroy.lane] = newOpponentPlayer.dronesOnBoard[droneToDestroy.lane].filter(d => d.id !== droneToDestroy.id);
                        const onDestroyUpdates = gameEngine.onDroneDestroyed(newOpponentPlayer, droneToDestroy);
                        Object.assign(newOpponentPlayer, onDestroyUpdates);
                    }
                    newOpponentPlayer.dronesOnBoard = gameEngine.updateAuras(newOpponentPlayer, getLocalPlayerState(), getPlacedSectionsForEngine());
                    updatePlayerState(getOpponentPlayerId(), newOpponentPlayer);
            }
           handleStartDeploymentPhase();
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
    const handleCloseAiReport = useCallback(async () => {
        setAiActionReport(null);
        // Use ActionProcessor for turn transition instead of direct endTurn call
        await processAction('turnTransition', {
            newPlayer: getLocalPlayerId(),
            reason: 'aiReportClosed'
        });
    }, [processAction, getLocalPlayerId]);

    const handleCloseAiCardReport = useCallback(async () => {
        // The turn ends only if the card doesn't grant another action.
        if (aiCardPlayReport && !aiCardPlayReport.card.effect.goAgain) {
            // Use ActionProcessor for turn transition instead of direct endTurn call
            await processAction('turnTransition', {
                newPlayer: getLocalPlayerId(),
                reason: 'aiCardReportClosed'
            });
        } else if (aiCardPlayReport && aiCardPlayReport.card.effect.goAgain && !winner) {
             // If AI can go again and game hasn't ended, the AI's turn continues.
             // Use ActionProcessor for player transition instead of direct setCurrentPlayer call
             await processAction('turnTransition', {
                 newPlayer: getOpponentPlayerId(),
                 reason: 'aiGoAgain'
             });
             setModalContent({ title: "Opponent's Turn", text: "Your opponent takes another action!", isBlocking: false });
        }
        setAiCardPlayReport(null);
    }, [processAction, getLocalPlayerId, getOpponentPlayerId, aiCardPlayReport, winner]);

  const sortedLocalActivePool = useMemo(() => {
    return [...localPlayerState.activeDronePool].sort((a, b) => {
      if (a.class !== b.class) {
        return a.class - b.class;
      }
      return a.name.localeCompare(b.name);
    });
  }, [localPlayerState.activeDronePool]);

  const canAllocateMoreShields = useMemo(() => {
    if (!localPlayerState) return false;
    return Object.keys(localPlayerState.shipSections).some(sectionName =>
        localPlayerState.shipSections[sectionName].allocatedShields < gameEngine.getEffectiveSectionMaxShields(sectionName, localPlayerState, localPlacedSections)
    );
  }, [localPlayerState.shipSections, localPlacedSections]);

  const getFirstPlayerReasonText = () => {
    if (turn === 1) {
      return "The first player is determined randomly for the first round.";
    }
    const passerName = firstPasserOfPreviousRound === getLocalPlayerId() ? localPlayerState.name : opponentPlayerState.name;
    return `${passerName} passed first in the previous round, securing the initiative.`;
  };

 
  return (
    <div className="h-screen bg-gray-950 text-white font-sans overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-indigo-950 to-black relative" ref={gameAreaRef} onClick={() => { cancelAbilityMode(); cancelCardSelection(); }}>
      <style>
        {`
            @import url('https://fonts.googleapis.com/css2?family=Exo:wght@400;700&family=Orbitron:wght@400;700;900&display=swap');
           .font-orbitron { font-family: 'Orbitron', sans-serif; }
            .font-exo { font-family: 'Exo', sans-serif; }
            .hexagon { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
            .hexagon-flat { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
            @keyframes pulse-glow {
                0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 255, 0, 0.7)) drop-shadow(0 0 3px rgba(255, 0, 0, 0.6)); }
                50% { filter: drop-shadow(0 0 4px rgba(255, 255, 0, 1)) drop-shadow(0 0 7px rgba(255, 0, 0, 0.8)); }
            }
            .interceptor-glow { animation: pulse-glow 2s infinite ease-in-out; }
            @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
           .animate-shake { animation: shake 0.5s ease-in-out; }
            .explosion { position: absolute; width: 100px; height: 100px; background-image: radial-gradient(circle, rgba(255,159,64,1) 0%, rgba(255,87,34,0.8) 40%, rgba(255,255,255,0) 70%); border-radius: 50%; transform: translate(-50%, -50%) scale(0); animation: explode 1s ease-out forwards; pointer-events: none; z-index: 50; }
            @keyframes explode { 0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
           .bg-grid-cyan { background-image: linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px); background-size: 20px 20px;             .bg-grid-cyan { background-image: linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px); background-size: 20px 20px; }
            
            /* --- ADD THESE STYLES --- */
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;  /* IE and Edge */
              scrollbar-width: none;  /* Firefox */}
            `}
        </style>
     <TargetingArrow visible={arrowState.visible} start={arrowState.start} end={arrowState.end} lineRef={arrowLineRef} />
     {explosions.map(exp => <Explosion key={exp.id} top={exp.top} left={exp.left} />)}

      {!['preGame', 'placement', 'droneSelection', 'deckSelection', 'deckBuilding'].includes(turnPhase) && (
        <header className="w-full flex justify-between items-center mb-2 flex-shrink-0 px-5 pt-8">
          <div className="flex flex-col items-start gap-2">
            <h2 className="text-lg font-bold text-pink-300 flex items-center">
              Opponent Resources
              {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === getOpponentPlayerId() && <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
              {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo[`${getOpponentPlayerId()}Passed`] && <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
            </h2>
            <div className="flex items-center gap-4">
              <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${opponentPlayerState.energy > opponentPlayerEffectiveStats.totals.maxEnergy ? 'text-red-400' : ''}`}><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{opponentPlayerState.energy} / {opponentPlayerEffectiveStats.totals.maxEnergy}</span></div>
              <div
                onClick={() => AI_HAND_DEBUG_MODE && setTimeout(() => setShowAiHandModal(true), 100)}
                className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${AI_HAND_DEBUG_MODE ? 'cursor-pointer hover:bg-gray-800' : ''} ${opponentPlayerState.hand.length > opponentPlayerEffectiveStats.totals.handLimit ? 'text-red-400' : ''}`}
              >
                <Hand className="text-gray-400 mr-2" />
                <span className="font-bold text-lg">{opponentPlayerState.hand.length} / {opponentPlayerEffectiveStats.totals.handLimit}</span>
                </div>
                {turnPhase === 'deployment' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{turn === 1 ? opponentPlayerState.initialDeploymentBudget : opponentPlayerState.deploymentBudget}</span></div>}
                <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${totalOpponentPlayerDrones > opponentPlayerEffectiveStats.totals.cpuLimit ? 'text-red-400' : ''}`}><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{totalOpponentPlayerDrones} / {opponentPlayerEffectiveStats.totals.cpuLimit}</span></div>
                </div>
          </div>
          <div className="text-center flex flex-col items-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-xl font-orbitron" style={{ textShadow: '0 0 15px rgba(236, 72, 153, 0.5), 0 0 5px rgba(255, 255, 255, 0.5)' }}>Drone Wars</h1>
            <div className="flex items-center gap-4 mt-2">
              {turnPhase !== 'preGame' && <h2 className="text-2xl font-bold text-gray-300 tracking-widest font-exo">{getPhaseDisplayName(turnPhase)}</h2>}
              
              {/* --- NEW BUTTON LOCATION --- */}
              {(turnPhase === 'deployment' || turnPhase === 'action') && isMyTurn() && !mandatoryAction && !multiSelectState && (
                <button
                    onClick={handlePlayerPass}
                    disabled={passInfo[`${getLocalPlayerId()}Passed`]}
                    className={`btn-clipped text-white font-bold py-1 px-6 transition-colors duration-200 ${
                        passInfo[`${getLocalPlayerId()}Passed`] ? 'bg-gray-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
                    }`}
                >
                    Pass
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <h2 className="text-lg font-bold text-cyan-300 flex items-center">
              Your Resources
              {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === getLocalPlayerId() && <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
              {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo[`${getLocalPlayerId()}Passed`] && <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
</h2>
<div className="flex items-center gap-6">
  <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${localPlayerState.energy > localPlayerEffectiveStats.totals.maxEnergy ? 'text-red-400' : ''}`}><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{localPlayerState.energy} / {localPlayerEffectiveStats.totals.maxEnergy}</span></div>
        {turnPhase === 'deployment' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{turn === 1 ? localPlayerState.initialDeploymentBudget : localPlayerState.deploymentBudget}</span></div>}
        <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${totalLocalPlayerDrones > localPlayerEffectiveStats.totals.cpuLimit ? 'text-red-400' : ''}`}><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{totalLocalPlayerDrones} / {localPlayerEffectiveStats.totals.cpuLimit}</span></div>
        {turnPhase === 'allocateShields' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><ShieldCheck className="text-cyan-300 mr-2" /> <span className="font-bold text-lg">{shieldsToAllocate}</span></div>}
        {reallocationPhase === 'removing' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-orange-500/50"><ShieldCheck className="text-orange-300 mr-2" /> <span className="font-bold text-lg">{shieldsToRemove}</span></div>}
        {reallocationPhase === 'adding' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-green-500/50"><ShieldCheck className="text-green-300 mr-2" /> <span className="font-bold text-lg">{shieldsToAdd}</span></div>}
              <button onClick={handleReset} className="bg-pink-700 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-colors duration-200" aria-label="Reset Game"><RotateCcw /></button>
              <button className="bg-slate-700 text-white p-3 rounded-full shadow-lg hover:bg-slate-600 transition-colors duration-200"><Settings /></button>
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-grow min-h-0 w-full flex flex-col items-center overflow-y-auto px-5 pb-4">
        {turnPhase === 'preGame' ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <h1 className="text-4xl font-orbitron font-bold text-white mb-4">Drone Wars</h1>
                      <p className="text-gray-400 mb-8">Choose your game mode</p>

                      {/* Multiplayer Button */}
                      <div className="flex flex-col gap-6 w-full max-w-md">
                        <button
                          onClick={() => setShowMultiplayerLobby(true)}
                          className="w-full bg-purple-600 border-2 border-purple-500 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-purple-400 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
                        >
                          <h2 className="text-2xl font-orbitron font-bold text-purple-200 mb-2">Multiplayer</h2>
                          <p className="font-exo text-gray-300 mb-4">Play against another human player online</p>
                          <span className="text-sm text-purple-300">Create or join a room</span>
                        </button>

                        {/* AI Section */}
                        <div className="text-center">
                          <h3 className="text-lg font-orbitron font-bold text-white mb-4">Or play against AI:</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiPersonalities.map((ai) => (
                              <div
                                key={ai.name}
                                onClick={() => handleSelectOpponent(ai)}
                                className="bg-gray-900 border-2 border-pink-500/50 rounded-lg p-4 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-pink-500 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20"
                              >
                                <h4 className="text-lg font-orbitron font-bold text-pink-400 mb-2">{ai.name}</h4>
                                <p className="font-exo text-gray-300 text-sm flex-grow">{ai.description}</p>
                                <button className="mt-4 bg-pink-600 text-white font-bold px-4 py-2 rounded-full hover:bg-pink-700 transition-colors duration-200 text-sm">
                                  Engage
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Phase rendering now handled by AppRouter - phases should not reach here */}
                      <div className="flex flex-col items-center w-full space-y-2">
                      {(() => {
                        return <ShipSectionsDisplay player={opponentPlayerState} playerEffectiveStats={opponentPlayerEffectiveStats} isPlayer={false} placedSections={opponentPlacedSections} onTargetClick={handleTargetClick} isInteractive={false} selectedCard={selectedCard} validCardTargets={validCardTargets} gameEngine={gameEngine} turnPhase={turnPhase} isMyTurn={isMyTurn} passInfo={passInfo} getLocalPlayerId={getLocalPlayerId} localPlayerState={localPlayerState} shipAbilityMode={shipAbilityMode} hoveredTarget={hoveredTarget} setHoveredTarget={setHoveredTarget} />;
                      })()}
                      <DroneLanesDisplay player={opponentPlayerState} isPlayer={false} onLaneClick={handleLaneClick} getLocalPlayerId={getLocalPlayerId} getOpponentPlayerId={getOpponentPlayerId} abilityMode={abilityMode} validAbilityTargets={validAbilityTargets} selectedCard={selectedCard} validCardTargets={validCardTargets} multiSelectState={multiSelectState} turnPhase={turnPhase} localPlayerState={localPlayerState} opponentPlayerState={opponentPlayerState} localPlacedSections={localPlacedSections} opponentPlacedSections={opponentPlacedSections} gameEngine={gameEngine} getPlacedSectionsForEngine={getPlacedSectionsForEngine} handleTokenClick={handleTokenClick} handleAbilityIconClick={handleAbilityIconClick} selectedDrone={selectedDrone} recentlyHitDrones={recentlyHitDrones} potentialInterceptors={potentialInterceptors} droneRefs={droneRefs} mandatoryAction={mandatoryAction} setHoveredTarget={setHoveredTarget} />
                      <DroneLanesDisplay player={localPlayerState} isPlayer={true} onLaneClick={handleLaneClick} getLocalPlayerId={getLocalPlayerId} getOpponentPlayerId={getOpponentPlayerId} abilityMode={abilityMode} validAbilityTargets={validAbilityTargets} selectedCard={selectedCard} validCardTargets={validCardTargets} multiSelectState={multiSelectState} turnPhase={turnPhase} localPlayerState={localPlayerState} opponentPlayerState={opponentPlayerState} localPlacedSections={localPlacedSections} opponentPlacedSections={opponentPlacedSections} gameEngine={gameEngine} getPlacedSectionsForEngine={getPlacedSectionsForEngine} handleTokenClick={handleTokenClick} handleAbilityIconClick={handleAbilityIconClick} selectedDrone={selectedDrone} recentlyHitDrones={recentlyHitDrones} potentialInterceptors={potentialInterceptors} droneRefs={droneRefs} mandatoryAction={mandatoryAction} setHoveredTarget={setHoveredTarget} />


                      <ShipSectionsDisplay player={localPlayerState} playerEffectiveStats={localPlayerEffectiveStats} isPlayer={true} placedSections={localPlacedSections} onSectionClick={handleShipSectionClick} onAbilityClick={handleShipAbilityClick} onTargetClick={handleTargetClick} isInteractive={turnPhase === 'allocateShields' || reallocationPhase} selectedCard={selectedCard} validCardTargets={validCardTargets} reallocationPhase={reallocationPhase} gameEngine={gameEngine} turnPhase={turnPhase} isMyTurn={isMyTurn} passInfo={passInfo} getLocalPlayerId={getLocalPlayerId} localPlayerState={localPlayerState} shipAbilityMode={shipAbilityMode} hoveredTarget={hoveredTarget} setHoveredTarget={setHoveredTarget} />
              </div>
            )}
        </>
        )}
      </main>

       {turnPhase !== 'preGame' && turnPhase !== 'placement' && turnPhase !== 'droneSelection' && (
        <footer className="w-full flex flex-col items-center flex-shrink-0">
          <div className="flex justify-center">
              <button onClick={() => handleFooterButtonClick('hand')} 
                   className={`px-8 py-2 rounded-t-lg font-bold transition-colors ${ isFooterOpen && footerView === 'hand' ? 'bg-slate-800 text-white' : 'bg-slate-900 hover:bg-slate-800 text-cyan-300'}`}
              >
             <span className="flex items-center gap-2">
                     {isFooterOpen && footerView === 'hand' && <ChevronUp size={20} />}
                     Hand ({localPlayerState.hand.length}/{localPlayerEffectiveStats.totals.handLimit})
                   </span>
              </button> 
             <button onClick={() => handleFooterButtonClick('drones')} 
                  className={`px-8 py-2 rounded-t-lg font-bold transition-colors ${ isFooterOpen && footerView === 'drones' ? 'bg-slate-800 text-white' : 'bg-slate-900 hover:bg-slate-800 text-cyan-300'}`}
             >
                  <span className="flex items-center gap-2">
                    {isFooterOpen && footerView === 'drones' && <ChevronUp size={20} />}
                    Drones
                  </span>
             </button>

             <button onClick={() => handleFooterButtonClick('log')} 
                  className={`px-8 py-2 rounded-t-lg font-bold transition-colors ${ isFooterOpen && footerView === 'log' ? 'bg-slate-800 text-white' : 'bg-slate-900 hover:bg-slate-800 text-cyan-300'}`}
             >
                  <span className="flex items-center gap-2">
                    {isFooterOpen && footerView === 'log' && <ChevronUp size={20} />}
                    Log ({gameLog.length})
                  </span>
             </button> 
             </div> 

          <div className={`relative w-full bg-slate-800/80 backdrop-blur-sm transition-all duration-500 ease-in-out overflow-hidden ${isFooterOpen ? 'max-h-[500px] opacity-100 p-4' : 'max-h-0 opacity-0'}`}>
              {multiSelectState && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-4 bg-slate-900/80 p-2 rounded-lg border border-purple-500/50">
                      <span className="text-white font-semibold text-sm w-48 text-center">
                          {multiSelectState.phase === 'select_source_lane' && 'Reposition: Select a source lane'}
                          {multiSelectState.phase === 'select_drones' && `Select Drones (${multiSelectState.selectedDrones.length} / ${multiSelectState.maxSelection})`}
                          {multiSelectState.phase === 'select_destination_lane' && 'Reposition: Select a destination lane'}
                      </span>

                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              cancelCardSelection();
                          }}
                          className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200"
                      >
                          Cancel
                      </button>

                      {multiSelectState.phase === 'select_drones' && (
                          <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  if (multiSelectState.selectedDrones.length > 0) {
                                      setMultiSelectState(prev => ({...prev, phase: 'select_destination_lane'}));
                                  }
                              }}
                              disabled={multiSelectState.selectedDrones.length === 0}
                              className={`text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 ${
                                  multiSelectState.selectedDrones.length === 0 ? 'bg-gray-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'
                              }`}
                          >
                              Confirm Drones
                          </button>
                      )}
                  </div>
              )}
            {footerView === 'hand' ? (
              (() => {
                // --- NEW DYNAMIC LAYOUT LOGIC ---
                const cardWidthPx = 208;
                const gapPx = 16;
                const maxCardsBeforeFan = 7;
                const applyFanEffect = localPlayerState.hand.length > maxCardsBeforeFan;
               // The target width is the space needed for 7 cards with a standard gap.
                const targetHandWidthPx = (maxCardsBeforeFan * cardWidthPx) + ((maxCardsBeforeFan - 1) * gapPx);
                const numCards = localPlayerState.hand.length;

                let marginLeftPx = 0;
                if (numCards > 1) {
                  // This dynamically calculates the margin (positive or negative) to fit the cards into the target width.
                  const spaceBetweenCards = (targetHandWidthPx - cardWidthPx) / (numCards - 1);
                  marginLeftPx = spaceBetweenCards - cardWidthPx;
                }

                return (
                  <div className="flex flex-row justify-between w-full items-center">
                    <div className="flex flex-col items-center w-32 min-w-32">
                      <div onClick={() => setIsViewDiscardModalOpen(true)} className="w-24 h-32 bg-gray-900/80 rounded-lg border-2 border-gray-700 flex items-center justify-center shadow-md cursor-pointer hover:bg-gray-800/80 transition-colors duration-200"><p className="font-bold text-sm text-gray-400">{localPlayerState.discardPile.length}</p></div>
                      <p className="mt-2 text-xs text-gray-400 font-semibold">Discard Pile</p>
                    </div>

                    <div className="flex flex-col items-center flex-grow min-w-0">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className={`text-lg font-semibold ${localPlayerState.hand.length > localPlayerEffectiveStats.totals.handLimit ? 'text-red-400' : 'text-white'}`}>Your Hand ({localPlayerState.hand.length}/{localPlayerEffectiveStats.totals.handLimit})</h3>
                      </div>
                      {mandatoryAction?.type === 'discard' && mandatoryAction.fromAbility && (
                          <p className="text-yellow-400 font-bold mb-2">You must discard {mandatoryAction.count} card(s).</p>
                      )}
                      <div 
                        className="relative flex justify-center items-center h-[350px]" 
                        style={ applyFanEffect ? { width: `${targetHandWidthPx}px` } : {} }
                      >
                        <div className={`flex justify-center items-center ${!applyFanEffect && 'gap-2'}`}>
                          {localPlayerState.hand.map((card, index) => {
                            const hoveredIndex = hoveredCardId ? localPlayerState.hand.findIndex(c => c.instanceId === hoveredCardId) : -1;
                            let transformClass = '';
                            let style = { zIndex: index };

                            if (applyFanEffect && hoveredIndex !== -1) {
                              if (index < hoveredIndex) {
                                transformClass = 'transform -translate-x-12';
                              } else if (index > hoveredIndex) {
                                transformClass = 'transform translate-x-12';
                              } else {
                                transformClass = 'transform -translate-y-8 scale-105';
                                style.zIndex = 50;
                              }
                            }
                            
                            if (applyFanEffect && index > 0) {
                              style.marginLeft = `${marginLeftPx}px`;
                            }

                            return (
                              <div
                                key={card.instanceId}
                                className={`transition-all duration-300 ease-in-out ${transformClass}`}
                                style={style}
                                onMouseEnter={() => setHoveredCardId(card.instanceId)}
                                onMouseLeave={() => setHoveredCardId(null)}
                              >
                                <ActionCard
                                  card={card}
                                  isPlayable={
                                    (turnPhase === 'action' &&
                                      isMyTurn() &&
                                      !passInfo[`${getLocalPlayerId()}Passed`] &&
                                      localPlayerState.energy >= card.cost &&
                                      (!card.targeting || gameEngine.getValidTargets(getLocalPlayerId(), null, card, localPlayerState, opponentPlayerState).length > 0)) ||
                                    (turnPhase === 'optionalDiscard' && optionalDiscardCount < localPlayerEffectiveStats.totals.discardLimit)
                                  }
                                  isMandatoryTarget={mandatoryAction?.type === 'discard'}
                                  onClick={
                                    mandatoryAction?.type === 'discard'
                                      ? (c) => setConfirmationModal({ type: 'discard', target: c, onConfirm: () => handleConfirmMandatoryDiscard(c), onCancel: () => setConfirmationModal(null), text: `Are you sure you want to discard ${c.name}?` })
                                      : turnPhase === 'optionalDiscard'
                                        ? (c) => setConfirmationModal({ type: 'discard', target: c, onConfirm: () => handleRoundStartDiscard(c), onCancel: () => setConfirmationModal(null), text: `Are you sure you want to discard ${c.name}?` })
                                        : handleCardClick
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center w-32 min-w-32">
                      <div onClick={() => setIsViewDeckModalOpen(true)} className="w-24 h-32 bg-indigo-900/50 rounded-lg border-2 border-purple-500 flex items-center justify-center shadow-md cursor-pointer hover:bg-indigo-800/50 transition-colors duration-200"><p className="font-bold text-sm text-white">{localPlayerState.deck.length}</p></div>
                      <p className="mt-2 text-xs text-gray-400 font-semibold">Deck</p>
                      {turnPhase === 'optionalDiscard' && (
                        <div className="flex flex-col items-center">
                          <p className="text-sm text-gray-400 mb-2">Discarded: {optionalDiscardCount} / {localPlayerEffectiveStats.discardLimit}</p>
                          <button onClick={() => { handleRoundStartDraw(); checkBothPlayersHandLimitComplete(); }} className={`mt-4 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20`}>
                            Finish Discarding
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : footerView === 'drones' ? (
              <div className="flex flex-col items-center mb-4 w-full">
               <div className="flex flex-wrap justify-center gap-4">
                   {sortedLocalActivePool.map((drone, index) => {
                       const totalResource = turn === 1 ? localPlayerState.initialDeploymentBudget + localPlayerState.energy : localPlayerState.energy;
                       const canAfford = totalResource >= drone.class;
                       const isUpgradeTarget = selectedCard?.type === 'Upgrade' && validCardTargets.some(t => t.id === drone.name);
                       
                       return (
                           <DroneCard 
                               key={index} 
                               drone={drone} 
                               onClick={handleToggleDroneSelection} 
                               isSelected={selectedDrone && selectedDrone.name === drone.name} 
                               isSelectable={(turnPhase === 'deployment' && isMyTurn() && !passInfo[`${getLocalPlayerId()}Passed`] && canAfford && !mandatoryAction) || isUpgradeTarget}
                               deployedCount={localPlayerState.deployedDroneCounts[drone.name] || 0}
                               appliedUpgrades={localPlayerState.appliedUpgrades[drone.name] || []}
                               isUpgradeTarget={isUpgradeTarget}
                               onViewUpgrades={(d, upgrades) => setViewUpgradesModal({ droneName: d.name, upgrades })}
                         />
                           
                       );
                     })}
               </div>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full h-full max-h-[350px]">
                <div className="flex justify-between items-center w-full mb-2 px-4">
                  <h3 className="text-lg font-semibold text-white">Game Log</h3>
                  <button 
                    onClick={downloadLogAsCSV} 
                    className="bg-purple-600 text-white font-bold py-2 px-4 rounded-full hover:bg-purple-700 transition-colors"
                  >
                    Download CSV
                  </button>
                </div>
                <div className="w-full flex-grow bg-black/30 rounded-lg p-2 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr>
                        <th className="p-2">Rnd</th>
                        <th className="p-2">Timestamp (UTC)</th>
                        <th className="p-2">Player</th>
                        <th className="p-2">Action</th>
                        <th className="p-2">Source</th>
                        <th className="p-2">Target</th>
                        <th className="p-2">Outcome</th>
                        <th className="p-2 text-xs text-gray-500">Debug Source</th>
                        <th className="p-2"></th> 
                      </tr>
                    </thead>
                    <tbody>
                      {gameLog.map((entry, index) => (
                        <tr key={index} className={`border-b border-gray-700/50 hover:bg-slate-700/50`}>
                          <td className="p-2 font-bold">{entry.round}</td>
                          <td className="p-2 text-gray-500">{new Date(entry.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC' })}</td>
                          <td className="p-2 text-cyan-300">{entry.player}</td>
                          <td className="p-2 text-yellow-300">{entry.actionType}</td>
                          <td className="p-2">{entry.source}</td>
                          <td className="p-2">{entry.target}</td>
                          <td className="p-2 text-gray-400">{entry.outcome}</td>
                          <td className="p-2 text-xs text-gray-500">{entry.debugSource}</td>
                          <td className="p-2 text-center">
                            {entry.aiDecisionContext && (
                              <button 
                                onClick={() => setAiDecisionLogToShow(entry.aiDecisionContext)} 
                                className="text-gray-400 hover:text-white"
                                title="Show AI Decision Logic"
                              >
                                ℹ️
                              </button>
                            )}
                          </td>
                        </tr>
                      )).reverse()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {turnPhase === 'allocateShields' &&
    <div className="flex justify-center items-center gap-4 mt-8">
        <button onClick={handleResetShieldAllocation} className={`text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-500/30`}>Reset Allocation</button>

        <div className="flex items-center gap-3 text-white bg-slate-900/80 border border-cyan-500/50 px-6 py-2 rounded-full shadow-lg">
            <ShieldCheck size={20} className="text-cyan-300" />
            <span className="font-bold text-lg font-orbitron tracking-wider">
                {shieldsToAllocate} / {localPlayerEffectiveStats.totals.shieldsPerTurn}
            </span>
            <span className="text-sm text-gray-400">Shields to Allocate</span>
        </div>

        <button onClick={handleEndAllocation} className="text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30">End Allocation</button>
    </div>
}

            {/* Shield Reallocation UI */}
            {reallocationPhase && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button onClick={handleResetReallocation} className="text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-500/30">
                  Reset Reallocation
                </button>

                {reallocationPhase === 'removing' && (
                  <>
                    <div className="flex items-center gap-3 text-white bg-slate-900/80 border border-orange-500/50 px-6 py-2 rounded-full shadow-lg">
                      <ShieldCheck size={20} className="text-orange-300" />
                      <span className="font-bold text-lg font-orbitron tracking-wider">
                        {shieldsToRemove}
                      </span>
                      <span className="text-sm text-gray-400">Shields to Remove</span>
                    </div>

                    {shieldsToAdd > 0 && (
                      <button onClick={handleContinueToAddPhase} className="text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30">
                        Continue to Add Phase ({shieldsToAdd})
                      </button>
                    )}
                  </>
                )}

                {reallocationPhase === 'adding' && (
                  <>
                    <div className="flex items-center gap-3 text-white bg-slate-900/80 border border-green-500/50 px-6 py-2 rounded-full shadow-lg">
                      <ShieldCheck size={20} className="text-green-300" />
                      <span className="font-bold text-lg font-orbitron tracking-wider">
                        {shieldsToAdd}
                      </span>
                      <span className="text-sm text-gray-400">Shields to Add</span>
                    </div>

                    {shieldsToAdd === 0 && (
                      <button onClick={handleConfirmReallocation} className="text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30">
                        Confirm Reallocation
                      </button>
                    )}
                  </>
                )}

                <button onClick={handleCancelReallocation} className="text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 bg-gray-600 hover:bg-gray-700 shadow-lg shadow-gray-500/30">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* Modals are unaffected and remain at the end */}
      {modalContent && <GamePhaseModal title={modalContent.title} text={modalContent.text} onClose={modalContent.onClose === null ? null : (modalContent.onClose || (() => setModalContent(null)))}>{modalContent.children}</GamePhaseModal>}
     {showFirstPlayerModal && (
       <GamePhaseModal title="First Player Determined" text={`${firstPlayerOfRound === getLocalPlayerId() ? localPlayerState.name : opponentPlayerState.name} will go first this round. ${getFirstPlayerReasonText()}`} onClose={startDeploymentComplianceCheck}>
         <div className="flex justify-center mt-6"><button onClick={startDeploymentComplianceCheck} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">Continue</button></div>
       </GamePhaseModal>
        )}
        {showActionPhaseStartModal && (
            <GamePhaseModal title="Action Phase" text="Deployment has ended. Prepare for action!" onClose={handleStartActionPhase}>
              <div className="flex justify-center mt-6"><button onClick={handleStartActionPhase} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">Continue</button></div>
            </GamePhaseModal>
            )}
                    {showRoundEndModal && (
                    <GamePhaseModal
                        title="Round Over"
                        text="Both players have passed. The action phase has ended."
                        onClose={handleStartNewRound}
                        >
                      <div className="flex justify-center mt-6">
                          <button onClick={handleStartNewRound} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
                              Begin Next Round
                          </button>
                      </div>
                    </GamePhaseModal>
                    )}
                   {deploymentConfirmation && (
                           <GamePhaseModal title="Confirm Deployment" text={`This deployment will use ${deploymentConfirmation.budgetCost} Initial Deployment points and cost ${deploymentConfirmation.energyCost} Energy. Proceed?`} onClose={() => setDeploymentConfirmation(null)}>
                               <div className="flex justify-center gap-4 mt-6">
                                   <button onClick={() => setDeploymentConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
                                   <button onClick={handleConfirmDeployment} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
                               </div>
                           </GamePhaseModal>
                       )}
        {moveConfirmation && (
            <GamePhaseModal title="Confirm Move" text={`Move ${moveConfirmation.drone.name} from ${moveConfirmation.from} to ${moveConfirmation.to}? The drone will be exhausted.`} onClose={() => setMoveConfirmation(null)}>
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={() => setMoveConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
                    <button onClick={executeMove} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
                </div>
            </GamePhaseModal>
           )}
                    {interceptionModal && (
                    <GamePhaseModal 
                    title="Attack Intercepted!" 
                    text={`Your opponent used their ${interceptionModal.interceptor.name} to protect ${interceptionModal.originalTarget.name}!`}
                    onClose={interceptionModal.onClose}
                      >
      <div className="flex justify-center mt-6">
      <button onClick={interceptionModal.onClose} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">Continue</button>
      </div>
                    </GamePhaseModal>
                    )}
                    
 {playerInterceptionChoice && (
  <PlayerInterceptionModal
   choiceData={playerInterceptionChoice}
   onIntercept={(interceptor) => {
      resolveAttack({ ...playerInterceptionChoice.attackDetails, interceptor });
     setPlayerInterceptionChoice(null);
      }}
    onDecline={() => {
       resolveAttack(playerInterceptionChoice.attackDetails);
      setPlayerInterceptionChoice(null);
       }}
    />
 )}
      {detailedDrone && <DetailedDroneModal drone={detailedDrone} onClose={() => setDetailedDrone(null)} />}
      {aiActionReport && <AIActionReportModal report={aiActionReport} onClose={handleCloseAiReport} />}
      {aiCardPlayReport && <AICardPlayReportModal report={aiCardPlayReport} onClose={handleCloseAiCardReport} />}
      {aiDecisionLogToShow && <AIDecisionLogModal decisionLog={aiDecisionLogToShow} onClose={() => setAiDecisionLogToShow(null)} />}

 {winner && showWinnerModal && (
        <GamePhaseModal
            title={winner === getLocalPlayerId() ? "Victory!" : "Defeat!"}
            text={winner === getLocalPlayerId() ? "You have crippled the enemy command ship." : "Your command ship has been crippled."}
            onClose={() => setShowWinnerModal(false)}
            >
      <div className="flex justify-center mt-6">
      <button onClick={() => setShowWinnerModal(false)} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
       View Final Board
      </button>
      </div>
        </GamePhaseModal>
       )}

 {mandatoryAction && showMandatoryActionModal && (
    <GamePhaseModal
       title={mandatoryAction.type === 'discard' ? "Hand Limit Exceeded" : "CPU Limit Exceeded"}
       text={mandatoryAction.type === 'discard' 
          ? `Your hand limit is now ${localPlayerEffectiveStats.handLimit}. Please select ${mandatoryAction.count} card(s) to discard.`
          : `Your drone limit is now ${localPlayerEffectiveStats.cpuLimit}. Please select ${mandatoryAction.count} drone(s) to destroy.`
       }
       onClose={() => setShowMandatoryActionModal(false)}
    />
 )}
 {confirmationModal && (
    <GamePhaseModal
       title={`Confirm ${confirmationModal.type === 'discard' ? 'Discard' : 'Destruction'}`}
       text={confirmationModal.text}
       onClose={confirmationModal.onCancel}
    >
        <div className="flex justify-center gap-4 mt-6">
            <button onClick={confirmationModal.onCancel} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={confirmationModal.onConfirm} className="bg-red-600 text-white font-bold py-2 px-6 rounded-full hover:bg-red-700 transition-colors">Confirm</button>
        </div>
   </GamePhaseModal>
 )}

{viewUpgradesModal && (
    <ViewUpgradesModal 
        modalData={viewUpgradesModal}
        onClose={() => setViewUpgradesModal(null)}
    />
)}


{destroyUpgradeModal && (
    <DestroyUpgradeModal 
        selectionData={destroyUpgradeModal}
        onConfirm={(card, target) => {
            resolveCardPlay(card, target, getLocalPlayerId());
            setDestroyUpgradeModal(null);
        }}
        onCancel={() => {
            setDestroyUpgradeModal(null);
            cancelCardSelection();
        }}
    />
)}

{/* --- NEW --- Card Confirmation Modal */}

{upgradeSelectionModal && (
    <UpgradeSelectionModal 
        selectionData={upgradeSelectionModal}
        onConfirm={(card, target) => {
            resolveCardPlay(card, target, getLocalPlayerId());
            setUpgradeSelectionModal(null);
        }}
        onCancel={() => {
            setUpgradeSelectionModal(null);
            cancelCardSelection();
        }}
    />
)}

  {cardConfirmation && (() => {
    let targetDisplayName = '';
    if (cardConfirmation.target) {
      // Drones have a .name property
      if (cardConfirmation.target.name) {
        targetDisplayName = cardConfirmation.target.name;
      // Lanes have an id like 'lane1', 'lane2', etc.
      } else if (cardConfirmation.target.id.startsWith('lane')) {
        targetDisplayName = `Lane ${cardConfirmation.target.id.slice(-1)}`;
      // Ship sections have an id like 'droneControlHub'
      } else {
        targetDisplayName = cardConfirmation.target.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      }
    }

    return (
      <GamePhaseModal
        title={`Confirm Action: ${cardConfirmation.card.name}`}
        text={`Use ${cardConfirmation.card.name}${targetDisplayName ? ` on ${targetDisplayName}` : ''}? This will cost ${cardConfirmation.card.cost} energy.`}
        onClose={() => setCardConfirmation(null)}
      >
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={() => setCardConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
<button onClick={() => resolveCardPlay(cardConfirmation.card, cardConfirmation.target, getLocalPlayerId())} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
        </div>
      </GamePhaseModal>
    );
  })()}

      {abilityConfirmation && (() => {
          const { ability, drone, target } = abilityConfirmation;
          const targetDisplayName = `Lane ${target.id.slice(-1)}`;

          return (
            <GamePhaseModal
              title={`Confirm Ability: ${ability.name}`}
              text={`Use ${drone.name}'s ability on ${targetDisplayName}? This will cost ${ability.cost.energy || 0} energy and exhaust the drone.`}
              onClose={() => setAbilityConfirmation(null)}
            >
              <div className="flex justify-center gap-4 mt-6">
                <button onClick={() => setAbilityConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
                <button onClick={() => {
                  resolveAbility(ability, drone, target);
                  setAbilityConfirmation(null);
                }} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
              </div>
            </GamePhaseModal>
          );
      })()}



        {showAiHandModal && AI_HAND_DEBUG_MODE && (
          <GamePhaseModal
            title="Opponent's Hand (Debug View)"
            text={`The opponent is holding ${opponentPlayerState.hand.length} card(s). This view is for debug purposes only.`}
            onClose={() => setShowAiHandModal(false)}
            maxWidthClass="max-w-6xl"
          >
            <div className="flex flex-nowrap items-center gap-4 my-4 p-4 overflow-x-auto bg-black/20 rounded">
              {opponentPlayerState.hand.length > 0 ? (
                opponentPlayerState.hand.map(card => (
                  <ActionCard
                    key={card.instanceId}
                    card={card}
                    isPlayable={false}
                  />
                ))
              ) : (
                <p className="text-gray-500 italic">The opponent's hand is empty.</p>
              )}
            </div>
            <div className="flex justify-center mt-6">
              <button onClick={() => setShowAiHandModal(false)} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
                Close
              </button>
            </div>
          </GamePhaseModal>
        )}

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
        {shipAbilityConfirmation && (() => {
          const { ability, sectionName, target } = shipAbilityConfirmation;
          const sectionDisplayName = sectionName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          let targetDisplayName = '';
          if (target) {
              targetDisplayName = target.name;
          }

          return (
            <GamePhaseModal
              title={`Confirm Ability: ${ability.name}`}
              text={`Use ${sectionDisplayName}'s ability${target ? ` on ${targetDisplayName}`: ''}? This will cost ${ability.cost.energy} energy.`}
              onClose={() => setShipAbilityConfirmation(null)}
            >
              <div className="flex justify-center gap-4 mt-6">
                <button onClick={() => setShipAbilityConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
                <button onClick={() => resolveShipAbility(ability, sectionName, target)} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
              </div>
            </GamePhaseModal>
          );
      })()}

      {/* Multiplayer Lobby */}
      {showMultiplayerLobby && (
        <MultiplayerLobby
          onGameStart={() => {
            setShowMultiplayerLobby(false);
            console.log('🎮 Starting multiplayer game');

            // Start multiplayer game session with empty decks and drone pools for customization
            gameStateManager.startGame(
              gameState.gameMode,
              { name: 'Player 1', deck: [], activeDronePool: [] },
              { name: 'Player 2', deck: [], activeDronePool: [] }
            );

            // Start game flow after game session is initialized
            gameFlowManager.startGameFlow('droneSelection');

            setTempSelectedDrones([]);

            // Set the initial modal message for multiplayer
            setModalContent({
              title: 'Phase 1: Choose Your Drones',
              text: 'Select 5 drones from your full collection to add to your Active Drone Pool. These are the drones you can launch during the game. Your opponent is making their selections simultaneously.',
              isBlocking: true
            });
          }}
          onBack={() => setShowMultiplayerLobby(false)}
        />
      )}

      {/* Waiting Overlay for multiplayer */}
      <WaitingOverlay
        isVisible={false} // TODO: Implement proper waiting logic
        currentPlayer={currentPlayer}
        gameMode={gameState.gameMode}
        roomCode={null} // TODO: Connect to actual room code
        lastAction={null} // TODO: Connect to last action
        localPlayerState={localPlayerState}
        opponentPlayerState={opponentPlayerState}
        getLocalPlayerId={getLocalPlayerId}
      />
    </div>
  );
};

export default App;