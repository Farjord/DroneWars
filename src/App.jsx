// ========================================
// DRONE WARS GAME - MAIN APPLICATION
// ========================================
// This is the main React component that manages the UI state and coordinates
// between the game logic engine and the user interface. All actual game rules
// and calculations are handled by gameEngine in gameLogic.js.

// --- IMPORTS AND DEPENDENCIES ---
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import CardViewerModal from './CardViewerModal';
import CardSelectionModal from './CardSelectionModal';
import WaitingOverlay from './components/WaitingOverlay';
import { useGameState } from './hooks/useGameState';
import { useGameData } from './hooks/useGameData';
import { useExplosions } from './hooks/useExplosions';
import fullDroneCollection from './data/droneData.js';
import fullCardCollection from './data/cardData.js';
import { aiBrain } from './logic/aiLogic.js';
import { gameEngine } from './logic/gameLogic.js';
import { getElementCenter } from './utils/gameUtils.js';
import gameFlowManager from './state/GameFlowManager.js';
import simultaneousActionManager from './state/SimultaneousActionManager.js';
import aiPhaseProcessor from './state/AIPhaseProcessor.js';
import sequentialPhaseManager from './state/SequentialPhaseManager.js';
// ActionProcessor is created internally by GameStateManager
import ActionCard from './components/ui/ActionCard.jsx';
import GamePhaseModal from './components/ui/GamePhaseModal.jsx';
import ShipSection from './components/ui/ShipSection.jsx';
import DroneToken from './components/ui/DroneToken.jsx';
import AICardPlayReportModal from './components/modals/AICardPlayReportModal.jsx';
import UpgradeSelectionModal from './components/modals/UpgradeSelectionModal.jsx';
import ViewUpgradesModal from './components/modals/ViewUpgradesModal.jsx';
import DestroyUpgradeModal from './components/modals/DestroyUpgradeModal.jsx';
import DetailedDroneModal from './components/modals/debug/DetailedDroneModal.jsx';
import { FirstPlayerModal, ActionPhaseStartModal, RoundEndModal } from './components/modals/GamePhaseModals.jsx';
import OpponentTurnModal from './components/modals/OpponentTurnModal.jsx';
import WaitingForPlayerModal from './components/modals/WaitingForPlayerModal.jsx';
import GameHeader from './components/ui/GameHeader.jsx';
import GameBattlefield from './components/ui/GameBattlefield.jsx';
import GameFooter from './components/ui/GameFooter.jsx';
import TargetingArrow from './components/ui/TargetingArrow.jsx';
import ExplosionEffect from './components/ui/ExplosionEffect.jsx';
import AIActionReportModal from './components/modals/AIActionReportModal.jsx';
import ConfirmationModal from './components/modals/ConfirmationModal.jsx';
import MandatoryActionModal from './components/modals/MandatoryActionModal.jsx';
import WinnerModal from './components/modals/WinnerModal.jsx';
import AIDecisionLogModal from './components/modals/AIDecisionLogModal.jsx';
import DeploymentConfirmationModal from './components/modals/DeploymentConfirmationModal.jsx';
import MoveConfirmationModal from './components/modals/MoveConfirmationModal.jsx';
import InterceptionOpportunityModal from './components/modals/InterceptionOpportunityModal.jsx';
import AttackInterceptedModal from './components/modals/AttackInterceptedModal.jsx';
import CardConfirmationModal from './components/modals/CardConfirmationModal.jsx';
import DroneAbilityConfirmationModal from './components/modals/DroneAbilityConfirmationModal.jsx';
import ShipAbilityConfirmationModal from './components/modals/ShipAbilityConfirmationModal.jsx';
import AIHandDebugModal from './components/modals/AIHandDebugModal.jsx';

// ========================================
// MAIN APPLICATION COMPONENT
// ========================================
// Manages all UI state, modals, and user interactions.
// Delegates all game logic to gameEngine functions.

const App = () => {
  // --- CENTRALIZED GAME STATE ---
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

  // --- GAME DATA SERVICE INTEGRATION ---
  const { getEffectiveStats, getEffectiveShipStats } = useGameData();

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
    // Initialize GameFlowManager with managers and dependencies
    gameFlowManager.initialize(
      gameStateManager,
      simultaneousActionManager,
      gameStateManager.actionProcessor, // Use ActionProcessor instance from GameStateManager
      () => gameState.gameMode !== 'local',
      aiPhaseProcessor // Add AIPhaseProcessor for SequentialPhaseManager
    );


    console.log('🔧 GameFlowManager initialized');
  }, []); // Run once on component mount

  // Subscribe to SequentialPhaseManager events
  useEffect(() => {
    const unsubscribe = sequentialPhaseManager.subscribe((event) => {
      console.log('📢 SequentialPhaseManager event:', event);

      // Handle different event types
      switch (event.type) {
        case 'phase_started':
          console.log(`🎯 Sequential phase started: ${event.phase}, first player: ${event.firstPlayer}`);
          break;

        case 'turn_changed':
          console.log(`🔄 Turn changed to ${event.player} in ${event.phase} phase`);
          break;

        case 'player_passed':
          console.log(`🏳️ ${event.player} passed in ${event.phase} phase`);
          break;

        case 'phase_completed':
          console.log(`✅ ${event.phase} phase completed, first passer: ${event.firstPasser}`);
          break;

        default:
          console.log(`📌 Unknown sequential phase event: ${event.type}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // --- MODAL AND UI STATE ---
  // MOVED UP: Must be declared before useEffect that uses setModalContent
  const [showAiHandModal, setShowAiHandModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  // PhaseManager event listeners
  useEffect(() => {
    const handlePhaseEvent = (event) => {
      const { type, phase, playerId, data } = event;

      console.log(`🔔 App.jsx received PhaseManager event: ${type}`, { phase, playerId });

      if (type === 'phaseTransition') {
        // Handle phase transitions from GameFlowManager
        const { newPhase, previousPhase, firstPlayerResult } = event;
        console.log(`🔄 App.jsx handling phase transition: ${previousPhase} → ${newPhase}`);

        // Handle first player determination phase
        if (newPhase === 'determineFirstPlayer') {
          console.log('🎯 First player determination phase started, showing modal');
          setShowFirstPlayerModal(true);
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

      }
    };

    // Subscribe to both managers for different types of events
    const unsubscribeGameFlow = gameFlowManager.subscribe(handlePhaseEvent);
    const unsubscribeSimultaneous = simultaneousActionManager.subscribe(handlePhaseEvent);

    return () => {
      unsubscribeGameFlow();
      unsubscribeSimultaneous();
    };
  }, [isMultiplayer, getLocalPlayerId, setModalContent]);


  // GameFlowManager now handles phase transitions automatically
  // No manual phase starting needed

  const [deploymentConfirmation, setDeploymentConfirmation] = useState(null);
  const [moveConfirmation, setMoveConfirmation] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [showFirstPlayerModal, setShowFirstPlayerModal] = useState(false);
  const [showActionPhaseStartModal, setShowActionPhaseStartModal] = useState(false);
  const [showRoundEndModal, setShowRoundEndModal] = useState(false);
  const [showOpponentTurnModal, setShowOpponentTurnModal] = useState(false);
  const [waitingForPlayerPhase, setWaitingForPlayerPhase] = useState(null); // Track which phase we're waiting for player acknowledgment
  const [opponentTurnData, setOpponentTurnData] = useState({ phase: 'action', actionType: 'action' });
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isViewDeckModalOpen, setIsViewDeckModalOpen] = useState(false);
  const [isViewDiscardModalOpen, setIsViewDiscardModalOpen] = useState(false);

  // --- EXTRACTED STATE (now from GameStateManager) ---
  // Core game state comes from gameState object:
  // gameState.turnPhase, gameState.turn, gameState.currentPlayer, etc.
  const { turnPhase, turn, currentPlayer, firstPlayerOfRound, firstPasserOfPreviousRound, firstPlayerOverride, passInfo, winner, unplacedSections, shieldsToAllocate, gameLog, placedSections } = gameState;

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

  // --- SHIP SECTION PLACEMENT ---
  const sectionsToPlace = ['bridge', 'powerCell', 'droneControlHub'];

  // --- PLAYER SELECTION AND TARGETING ---
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);

  // --- COMBAT AND ATTACK STATE ---
  const [pendingAttack, setPendingAttack] = useState(null);
  const [interceptionModal, setInterceptionModal] = useState(null);
  const [playerInterceptionChoice, setPlayerInterceptionChoice] = useState(null);
  const [potentialInterceptors, setPotentialInterceptors] = useState([]);

  // --- AI BEHAVIOR AND REPORTING ---
  const [aiActionReport, setAiActionReport] = useState(null);
  const [aiCardPlayReport, setAiCardPlayReport] = useState(null);
  const [aiDecisionLogToShow, setAiDecisionLogToShow] = useState(null);

  // --- UI AND VISUAL EFFECTS ---
  const [footerView, setFooterView] = useState('drones');
  const [isFooterOpen, setIsFooterOpen] = useState(true);
  const [recentlyHitDrones, setRecentlyHitDrones] = useState([]);
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

  // Use explosion hook for visual effects
  const { explosions, triggerExplosion } = useExplosions(droneRefs, gameAreaRef);

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
  const [cardSelectionModal, setCardSelectionModal] = useState(null); // For search and draw card selection

  // --- SHIELD REALLOCATION STATE ---
  const [reallocationPhase, setReallocationPhase] = useState(null); // 'removing' | 'adding' | null
  const [shieldsToRemove, setShieldsToRemove] = useState(0);
  const [shieldsToAdd, setShieldsToAdd] = useState(0);
  const [originalShieldAllocation, setOriginalShieldAllocation] = useState(null);
  const [initialShieldAllocation, setInitialShieldAllocation] = useState(null); // For shield allocation reset
  const [reallocationAbility, setReallocationAbility] = useState(null);

  // --- PERFORMANCE OPTIMIZED COMPUTED VALUES ---
  // Ship stats now use GameDataService for consistent caching with drone stats
  const localPlayerEffectiveStats = localPlayerState ? getEffectiveShipStats(localPlayerState, localPlacedSections) : null;
  const opponentPlayerEffectiveStats = opponentPlayerState ? getEffectiveShipStats(opponentPlayerState, opponentPlacedSections) : null;

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


  // ========================================
  // GAME LOGIC WRAPPER FUNCTIONS
  // ========================================
  // These functions wrap gameEngine calls and handle UI state updates

  // --- PHASE TRANSITION FUNCTIONS ---



  

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

}, [triggerExplosion, processAction, getLocalPlayerId, getOpponentPlayerId]);

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
    } catch (error) {
      console.error('Error in resolveAbility:', error);
      cancelAbilityMode();
    }
  }, [processAction, getLocalPlayerId]);

  // --- SHIP ABILITY RESOLUTION ---

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
    const result = await processAction('shipAbility', {
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
    const result = await processAction('cardPlay', {
      card: card,
      targetId: target?.id || null,
      playerId: actingPlayerId
    });

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

    // Handle UI cleanup for player cards
    if (actingPlayerId === getLocalPlayerId()) {
        cancelCardSelection();
        setCardConfirmation(null);
    }


    return result;
}, [processAction, getLocalPlayerId, localPlayerState, opponentPlayerState]);

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

    // Apply final state updates through GameStateManager directly
    gameStateManager.setPlayerStates(completion.newPlayerStates.player1, completion.newPlayerStates.player2);

    // Handle UI cleanup
    if (actingPlayerId === getLocalPlayerId()) {
      cancelCardSelection();
      setCardConfirmation(null);
    }


  }, [localPlayerState, opponentPlayerState, addLogEntry]);

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
}, [localPlayerState, addLogEntry, gameEngine, localPlacedSections, opponentPlacedSections]);


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
    // Note: Single move cards have "goAgain: true", so shouldEndTurn will be false
}, [localPlayerState, addLogEntry, gameEngine, localPlacedSections, opponentPlacedSections]);



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
  }, [localPlayerState?.shipSections, opponentPlayerState?.shipSections, winner, addLogEntry]);




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

   // --- DEFENSIVE STATE CLEANUP ---
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

        // TODO: REMOVE AFTER TESTING - Deployment turn modal disabled
        // setModalContent({
        //   title: "Your Turn to Deploy",
        //   text: `Select a drone and a lane to deploy it. Drones cost ${deploymentResource} this turn. Or, click "Pass" to end your deployment for this phase.`,
        //   isBlocking: true
        // });

        // Clear any existing modal (like "Opponent's Turn") when it becomes player's turn
        setModalContent(null);
        setShowOpponentTurnModal(false);
      } else if (turnPhase === 'action') {
        setModalContent({
          title: "Action Phase - Your Turn",
          text: "It's your turn to act. Select a drone to move or attack, play a card, or use an ability.",
          isBlocking: true
        });
        setShowOpponentTurnModal(false);
      }
    } else {
      // It's now the opponent's turn
      setOpponentTurnData({ phase: turnPhase, actionType: 'action' });
      setShowOpponentTurnModal(true);
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
   * PROCEED TO SHIELD ALLOCATION
   * Initiates shield restoration phase.
   * Calculates available shields and sets up allocation UI.
   */
   

  /**
   * HANDLE ALLOCATE SHIELD
   * Allocates a shield to a specific ship section.
   * Routes to appropriate manager based on current phase.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAllocateShield = async (sectionName) => {
    const { turnPhase } = gameState;

    if (turnPhase === 'allocateShields') {
      // Round start shield allocation - routed to SimultaneousActionManager
      await processAction('allocateShield', {
        sectionName: sectionName,
        playerId: getLocalPlayerId()
      });
    } else {
      // Action phase shield reallocation - uses ActionProcessor directly
      await processAction('reallocateShields', {
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
   * Validation is handled by ActionProcessor.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAddShield = async (sectionName) => {
    if (shieldsToAdd <= 0) return;

    // Use ActionProcessor for shield reallocation (validation handled there)
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
  const handleResetReallocation = async () => {
    // Restore original shields using ActionProcessor
    await processAction('reallocateShields', {
      action: 'restore',
      originalShipSections: originalShieldAllocation,
      playerId: getLocalPlayerId()
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
   * HANDLE FIRST PLAYER ACKNOWLEDGMENT
   * Acknowledges first player determination for the current player.
   * Triggers waiting state if opponent hasn't acknowledged yet.
   */
  const handleFirstPlayerAcknowledgment = () => {
    console.log('🎯 App.jsx: Acknowledging first player determination');

    const localPlayerId = getLocalPlayerId();
    const result = gameStateManager.actionProcessor.acknowledgeFirstPlayer(localPlayerId);

    if (result.success) {
      setShowFirstPlayerModal(false);

      // Check if we need to show waiting state
      const commitmentStatus = gameStateManager.actionProcessor.getPhaseCommitmentStatus('determineFirstPlayer');
      if (!commitmentStatus.allComplete && gameMode !== 'local') {
        // In multiplayer, show waiting state if opponent hasn't acknowledged
        setWaitingForPlayerPhase('determineFirstPlayer');
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
    await processAction('resetShieldAllocation', {
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
    await processAction('endShieldAllocation', {
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
        // Shield allocation actions are now handled by ActionProcessor routing



        // Initial draw actions
        case 'drawCard':
        case 'confirmInitialHand':
          if (turnPhase === 'initialDraw') {
            const result = gameEngine.processInitialDraw(payload, getLocalPlayerState());
            updatePlayerState(getLocalPlayerId(), result.newPlayerState);
            return { success: true, result };
          }
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


  // ========================================
  // SIMULTANEOUS HAND LIMIT ENFORCEMENT
  // ========================================

  /**
   * HANDLE ROUND START DISCARD
   * Handles simultaneous discard during optionalDiscard phase.
   * Uses direct GameStateManager updates for parallel player actions.
   * @param {Object} card - The card being discarded
   */

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
      const effectiveStats = getEffectiveShipStats(currentPlayerState, getLocalPlacedSections()).totals;

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
      const localStats = getEffectiveShipStats(localPlayerState, getLocalPlacedSections()).totals;
      const opponentStats = getEffectiveShipStats(opponentPlayerState, getOpponentPlacedSections()).totals;

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

        // AI draw is now handled by AIPhaseProcessor

        // Phase transitions are now handled by GameFlowManager
      }
    } else {
      // In multiplayer mode, wait for both players to complete
      // This would be handled by multiplayer synchronization
      // For now, assume single player completion triggers transition
      const localPlayerState = getLocalPlayerState();
      const localStats = getEffectiveShipStats(localPlayerState, getLocalPlacedSections()).totals;
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
        // Phase transitions are now handled by GameFlowManager
      }
    }
  };




  // Legacy startPlacementPhase function removed - now handled by GameFlowManager + utility functions


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
      const result = await processAction('deployment', {
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
                  const effectiveStats = getEffectiveStats(drone, targetLane);
                  return effectiveStats.keywords.has('GUARDIAN');
              });

              if (hasGuardian) {
                  console.log("FAILURE: Target is protected by a Guardian drone.");
                  setModalContent({ title: "Invalid Target", text: "This lane is protected by a Guardian drone. You must destroy it before targeting other drones.", isBlocking: true });
              } else {
                  console.log("SUCCESS: No Guardian. Checking for interception.");
                  const attackDetails = { attacker: selectedDrone, target: token, targetType: 'drone', lane: attackerLane, attackingPlayer: getLocalPlayerId() };

                  const effectiveAttacker = getEffectiveStats(selectedDrone, attackerLane);

                  const potentialInterceptors = opponentPlayerState.dronesOnBoard[attackerLane]
                      .filter(d => {
                          const effectiveInterceptor = getEffectiveStats(d, attackerLane);
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
                  const effectiveStats = getEffectiveStats(drone, attackerLane);
                  return effectiveStats.keywords.has('GUARDIAN');
              });

              if (hasGuardian) {
                  console.log("FAILURE: Ship section is protected by a Guardian drone.");
                  setModalContent({ title: "Invalid Target", text: "This lane is protected by a Guardian drone. You must destroy it before targeting the ship section.", isBlocking: true });
              } else {
                  console.log("SUCCESS: No Guardian. Checking for interception.");
                  const attackDetails = { attacker: selectedDrone, target: target, targetType: 'section', lane: attackerLane, attackingPlayer: getLocalPlayerId() };

                  const effectiveAttacker = getEffectiveStats(selectedDrone, attackerLane);

                  const potentialInterceptors = opponentPlayerState.dronesOnBoard[attackerLane]
                      .filter(d => {
                          const effectiveInterceptor = getEffectiveStats(d, attackerLane);
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
                    let dronesToDestroyCount = Object.values(opponentPlayerState.dronesOnBoard).flat().length - getEffectiveShipStats(opponentPlayerState, opponentPlacedSections).totals.cpuLimit;
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
             setOpponentTurnData({ phase: turnPhase, actionType: 'another' });
             setShowOpponentTurnModal(true);
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
     {explosions.map(exp => <ExplosionEffect key={exp.id} top={exp.top} left={exp.left} />)}

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
        shieldsToRemove={shieldsToRemove}
        shieldsToAdd={shieldsToAdd}
        reallocationPhase={reallocationPhase}
        totalLocalPlayerDrones={totalLocalPlayerDrones}
        totalOpponentPlayerDrones={totalOpponentPlayerDrones}
        getLocalPlayerId={getLocalPlayerId}
        getOpponentPlayerId={getOpponentPlayerId}
        isMyTurn={isMyTurn}
        handlePlayerPass={handlePlayerPass}
        handleReset={handleReset}
        mandatoryAction={mandatoryAction}
        multiSelectState={multiSelectState}
        AI_HAND_DEBUG_MODE={AI_HAND_DEBUG_MODE}
        setShowAiHandModal={setShowAiHandModal}
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
        shipAbilityMode={shipAbilityMode}
        hoveredTarget={hoveredTarget}
        selectedDrone={selectedDrone}
        recentlyHitDrones={recentlyHitDrones}
        potentialInterceptors={potentialInterceptors}
        droneRefs={droneRefs}
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
        handleRoundStartDraw={handleRoundStartDraw}
        checkBothPlayersHandLimitComplete={checkBothPlayersHandLimitComplete}
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
      />

      {/* Modals are unaffected and remain at the end */}
      {modalContent && <GamePhaseModal title={modalContent.title} text={modalContent.text} onClose={modalContent.onClose === null ? null : (modalContent.onClose || (() => setModalContent(null)))}>{modalContent.children}</GamePhaseModal>}
      <FirstPlayerModal
        show={showFirstPlayerModal}
        firstPlayerOfRound={firstPlayerOfRound}
        localPlayerId={getLocalPlayerId()}
        localPlayerName={localPlayerState.name}
        opponentPlayerName={opponentPlayerState.name}
        turn={turn}
        firstPasserOfPreviousRound={firstPasserOfPreviousRound}
        onContinue={handleFirstPlayerAcknowledgment}
      />
      <ActionPhaseStartModal
        show={showActionPhaseStartModal}
        onContinue={() => setShowActionPhaseStartModal(false)}
      />
      <RoundEndModal
        show={showRoundEndModal}
        onContinue={() => setShowRoundEndModal(false)}
      />
      <OpponentTurnModal
        show={showOpponentTurnModal}
        isMultiplayer={isMultiplayer()}
        phase={opponentTurnData.phase}
        actionType={opponentTurnData.actionType}
      />
      <WaitingForPlayerModal
        show={!!waitingForPlayerPhase}
        phase={waitingForPlayerPhase}
        opponentName={opponentPlayerState.name}
        roomCode={null} // TODO: Connect to actual room code when multiplayer is implemented
      />
      <DeploymentConfirmationModal
        deploymentConfirmation={deploymentConfirmation}
        show={!!deploymentConfirmation}
        onCancel={() => setDeploymentConfirmation(null)}
        onConfirm={async () => {
          if (!deploymentConfirmation) return;
          const { lane } = deploymentConfirmation;
          await executeDeployment(lane);
          setDeploymentConfirmation(null);
        }}
      />
      <MoveConfirmationModal
        moveConfirmation={moveConfirmation}
        show={!!moveConfirmation}
        onCancel={() => setMoveConfirmation(null)}
        onConfirm={async () => {
          if (!moveConfirmation) return;
          const { drone, from, to } = moveConfirmation;

          await processAction('move', {
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
        onIntercept={(interceptor) => {
          resolveAttack({ ...playerInterceptionChoice.attackDetails, interceptor });
          setPlayerInterceptionChoice(null);
        }}
        onDecline={() => {
          resolveAttack(playerInterceptionChoice.attackDetails);
          setPlayerInterceptionChoice(null);
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
      <DetailedDroneModal isOpen={!!detailedDrone} drone={detailedDrone} onClose={() => setDetailedDrone(null)} />
      <AIActionReportModal
        report={aiActionReport}
        show={!!aiActionReport}
        onClose={() => setAiActionReport(null)}
      />
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

{viewUpgradesModal && (
    <ViewUpgradesModal 
        modalData={viewUpgradesModal}
        onClose={() => setViewUpgradesModal(null)}
    />
)}


{destroyUpgradeModal && (
    <DestroyUpgradeModal 
        selectionData={destroyUpgradeModal}
        onConfirm={async (card, target) => {
            await resolveCardPlay(card, target, getLocalPlayerId());
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
        onConfirm={async (card, target) => {
            await resolveCardPlay(card, target, getLocalPlayerId());
            setUpgradeSelectionModal(null);
        }}
        onCancel={() => {
            setUpgradeSelectionModal(null);
            cancelCardSelection();
        }}
    />
)}

      <CardConfirmationModal
        cardConfirmation={cardConfirmation}
        show={!!cardConfirmation}
        onCancel={() => setCardConfirmation(null)}
        onConfirm={async () => await resolveCardPlay(cardConfirmation.card, cardConfirmation.target, getLocalPlayerId())}
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