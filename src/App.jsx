// ========================================
// DRONE WARS GAME - MAIN APPLICATION
// ========================================
// This is the main React component that manages the UI state and coordinates
// between the game logic engine and the user interface. All actual game rules
// and calculations are handled by gameEngine in gameLogic.js.

// --- IMPORTS AND DEPENDENCIES ---
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Shield, Bolt, Wrench, Sprout, Hand, ShipWheel, Settings, X, ChevronRight, ChevronLeft, Plus, RotateCcw, ShieldCheck, Sword, Search, Gavel, Bomb, Rocket, Skull, Bug, Cpu, Target, View, Zap, Heart, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
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

// --- THEME & STYLING CONFIGURATION ---
const theme = {
  colors: {
    background: 'bg-slate-950',
    primary: 'blue',
    accent: 'cyan',
    hull: {
      healthy: 'bg-green-400',
      damaged: 'bg-red-500',
    },
    shields: 'text-cyan-300',
    energy: 'text-yellow-300',
    deployment: 'text-purple-400',
  },
  font: {
    heading: 'font-orbitron',
    body: 'font-exo',
  }
};

// --- ICON MAPPING FOR UI COMPONENTS ---
const iconMap = {
  Shield, Bolt, Wrench, Sprout, Hand, ShipWheel, Settings, X, ChevronRight, ChevronLeft, Plus, RotateCcw, ShieldCheck, Sword, Search, Gavel, Bomb, Rocket, Skull, Bug, Cpu, Target, View, Zap, Heart, ChevronUp, ChevronDown
};

// --- UTILITY HELPER FUNCTIONS ---
const getRandomDrones = (collection, count) => {
  const shuffled = [...collection].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

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

    // Direct manager access
    gameStateManager,
    p2pManager
  } = useGameState();

  // --- DEBUG AND DEVELOPMENT FLAGS ---
  const AI_HAND_DEBUG_MODE = true; // Set to false to disable clicking to see the AI's hand

  // --- MODAL AND UI STATE ---
  const [showAiHandModal, setShowAiHandModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  // --- MULTIPLAYER PHASE SYNC STATE ---
  const [opponentPhaseCompletion, setOpponentPhaseCompletion] = useState({
    droneSelection: false,
    deckSelection: false,
    placement: false
  });
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
        setTurnPhase('deckSelection');
        setModalContent(null);
      }
    }

    if (opponentPhaseCompletion.deckSelection && turnPhase === 'deckSelection') {
      const localPlayerHasDeck = localPlayerState.deck && localPlayerState.deck.length > 0;
      if (localPlayerHasDeck) {
        console.log('Both players completed deck selection, progressing to placement');
        // Call the placement phase setup directly instead of using the function
        updateGameState({ unplacedSections: ['bridge', 'powerCell', 'droneControlHub'] });
        setSelectedSectionForPlacement(null);
        updateGameState({ placedSections: Array(3).fill(null), opponentPlacedSections: Array(3).fill(null) });
        setTurnPhase('placement');
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

      // Set phase to initialDraw
      setTurnPhase('initialDraw');

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

        // Inline proceedToFirstTurn logic
        const determineFirstPlayer = () => {
          if (firstPlayerOverride) {
            setFirstPlayerOverride(null);
            return firstPlayerOverride;
          }
          if (turn === 1) {
            return Math.random() < 0.5 ? getLocalPlayerId() : getOpponentPlayerId();
          }
          return firstPasserOfPreviousRound || getLocalPlayerId();
        };

        const firstPlayer = determineFirstPlayer();


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
    const pos = getElementCenter(droneRefs.current[targetId]);
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
  const localPlayerEffectiveStats = useMemo(() => gameEngine.calculateEffectiveShipStats(localPlayerState, localPlacedSections), [localPlayerState.shipSections, localPlacedSections]);
  const opponentPlayerEffectiveStats = useMemo(() => gameEngine.calculateEffectiveShipStats(opponentPlayerState, opponentPlacedSections), [opponentPlayerState.shipSections, opponentPlacedSections]);
  const totalLocalPlayerDrones = useMemo(() => Object.values(localPlayerState.dronesOnBoard).flat().length, [localPlayerState.dronesOnBoard]);
  const totalOpponentPlayerDrones = useMemo(() => Object.values(opponentPlayerState.dronesOnBoard).flat().length, [opponentPlayerState.dronesOnBoard]);

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
  const endTurn = useCallback((actingPlayer) => {
    // Use the new pure function that returns both transition and UI effects
    const { transition, uiEffects } = gameEngine.createTurnEndEffects(
      actingPlayer,
      passInfoRef.current,
      turnPhaseRef.current,
      winnerRef.current
    );

    // Handle game state transitions
    switch (transition.type) {
      case 'END_PHASE':
        if (transition.phase === 'deployment') endDeploymentPhase();
        if (transition.phase === 'action') endActionPhase();
        break;

      case 'CONTINUE_TURN':
        setCurrentPlayer(transition.nextPlayer);
        break;

      case 'CHANGE_PLAYER':
        setCurrentPlayer(transition.nextPlayer);
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
   * Processes drone-to-drone combat using gameEngine logic.
   * Handles animations, state updates, and turn transitions.
   * @param {Object} attackDetails - Attack configuration with attacker, target, damage
   */
  const resolveAttack = useCallback((attackDetails) => {
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


        // Use the gameEngine version
        const result = gameEngine.resolveAttack(
            attackDetails,
            getPlayerStatesForEngine(),
            getPlacedSectionsForEngine(),
            (logEntry) => addLogEntry(logEntry, 'resolveAttack', attackDetails.attackingPlayer === getOpponentPlayerId() ? attackDetails.aiContext : null),
            triggerExplosion,
            triggerHitAnimation
        );

        // Update player states
        updateGameStateFromEngineResult(result.newPlayerStates);

        // Handle AI action report
        if (attackDetails.attackingPlayer === getOpponentPlayerId()) {
            setAiActionReport({
                ...result.attackResult,
                isBlocking: true
            });
        }

        // Handle after-attack effects
        result.afterAttackEffects.forEach(effect => {
            if (effect.type === 'LOG') addLogEntry(effect.payload, 'resolveAfterAttackEffects');
            else if (effect.type === 'EXPLOSION') triggerExplosion(effect.payload.targetId);
        });

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

}, [endTurn, triggerExplosion, addLogEntry, localPlacedSections, opponentPlacedSections]);

  // --- ABILITY RESOLUTION ---

  /**
   * RESOLVE ABILITY
   * Processes drone ability activation using gameEngine logic.
   * Updates game state and handles turn transitions.
   * @param {Object} ability - The ability being activated
   * @param {Object} userDrone - The drone using the ability
   * @param {Object} targetDrone - The target of the ability (if any)
   */
  const resolveAbility = useCallback((ability, userDrone, targetDrone) => {
    // Create a specialized attack callback that synchronously updates GameStateManager
    const synchronousAttackCallback = (attackDetails) => {
      // Get current state from GameStateManager (this will be up-to-date)
      const currentGameState = gameStateManager.getState();
      const currentPlayerStates = { player1: currentGameState.player1, player2: currentGameState.player2 };

      // Call gameEngine.resolveAttack directly instead of the UI wrapper
      const attackResult = gameEngine.resolveAttack(
        attackDetails,
        currentPlayerStates,
        getPlacedSectionsForEngine(),
        (logEntry) => addLogEntry(logEntry, 'resolveAttack-internal'),
        triggerExplosion,
        triggerHitAnimation
      );

      // Synchronously update GameStateManager with attack results
      gameStateManager.setPlayerStates(attackResult.newPlayerStates.player1, attackResult.newPlayerStates.player2);

      return attackResult;
    };

    const result = gameEngine.resolveAbility(
        ability,
        userDrone,
        targetDrone,
        getPlayerStatesForEngine(),
        getPlacedSectionsForEngine(),
        (logEntry) => addLogEntry(logEntry, 'resolveAbility'),
        synchronousAttackCallback // Use the synchronous callback
    );

    // Update player states with final ability result
    updateGameStateFromEngineResult(result.newPlayerStates);

    cancelAbilityMode();
    if (result.shouldEndTurn) {
        endTurn(getLocalPlayerId());
    }
}, [addLogEntry, endTurn, localPlacedSections, opponentPlacedSections, triggerExplosion, triggerHitAnimation]);

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
        const targetPlayerState = target.owner === getLocalPlayerId() ? gameState.player1 : gameState.player2;
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
        gameState.player2,
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
        gameState.player2,
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


//--- END ABILITY/CARD LOGIC ---

  /**
   * START OPTIONAL DISCARD PHASE
   * Initiates the optional discard phase where players can discard excess cards.
   * Uses player's effective discard limit for maximum cards to discard.
   */
  const startOptionalDiscardPhase = () => {
    const p1Stats = localPlayerEffectiveStats; // Use the memoized stats
    setOptionalDiscardCount(0);
    setTurnPhase('optionalDiscard');
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



  /**
   * GET ELEMENT CENTER
   * Calculates the center position of a DOM element relative to the game area.
   * Used for positioning animations and targeting arrows.
   * @param {HTMLElement} element - The DOM element to find center of
   * @returns {Object|null} Object with x,y coordinates or null if invalid
   */
  const getElementCenter = (element) => {
    if (!element || !gameAreaRef.current) return null;
    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();
    return {
      x: elemRect.left + elemRect.width / 2 - gameAreaRect.left,
      y: elemRect.top + elemRect.height / 2 - gameAreaRect.top,
    };
  };

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
        const startPos = getElementCenter(droneRefs.current[selectedDrone.id]);
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
   * STAT HEXAGON COMPONENT
   * Renders stat values in hexagonal containers with customizable styling.
   * Used for drone attack and speed display.
   * @param {number} value - The stat value to display
   * @param {boolean} isFlat - Whether to use flat hexagon shape
   * @param {string} bgColor - Tailwind background color class
   * @param {string} textColor - Tailwind text color class
   */
  const StatHexagon = ({ value, isFlat, bgColor, textColor }) => (
    <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-black flex items-center justify-center`}>
      <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-[calc(100%-2px)] h-[calc(100%-2px)] ${bgColor} flex items-center justify-center text-xs font-bold font-orbitron ${textColor}`}>
        {value}
      </div>
    </div>
  );

  /**
   * CARD STAT HEXAGON COMPONENT
   * Renders card stat values with icons in hexagonal containers.
   * Used for energy, deployment costs on cards.
   * @param {number} value - The stat value to display
   * @param {boolean} isFlat - Whether to use flat hexagon shape
   * @param {React.Component} Icon - Lucide icon component
   * @param {string} iconColor - Tailwind color class for icon
   * @param {string} textColor - Tailwind text color class
   */
  const CardStatHexagon = ({ value, isFlat, icon: Icon, iconColor, textColor = 'text-white' }) => (
    <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-black/60 flex items-center justify-center p-0.5`}>
        <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-slate-900/80 flex items-center justify-center`}>
            <div className={`flex items-center justify-center gap-1 font-bold ${textColor}`}>
                {Icon && <Icon size={12} className={iconColor} />}
                <span className="font-orbitron text-base">{value}</span>
            </div>
        </div>
    </div>
);

  /**
   * ABILITY ICON COMPONENT
   * Renders clickable ability activation button on drone tokens.
   * Shows circular icon with targeting reticle design.
   * @param {Function} onClick - Callback when ability button is clicked
   */
  const AbilityIcon = ({ onClick }) => (
    <button onClick={onClick} className="absolute top-5 -right-3.5 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center border-2 border-black/50 z-20 hover:bg-purple-500 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
    </button>
  );

  /**
   * SHIP ABILITY ICON COMPONENT
   * Renders clickable ship section ability button with state indicators.
   * Shows cost tooltip and visual feedback for usability.
   * @param {Function} onClick - Callback when ability button is clicked
   * @param {Object} ability - The ship ability data
   * @param {boolean} isUsable - Whether ability can currently be activated
   * @param {boolean} isSelected - Whether ability is currently selected
   */
  const ShipAbilityIcon = ({ onClick, ability, isUsable, isSelected }) => (
<button
    onClick={onClick}
    disabled={!isUsable}
    // The className is now just for appearance, not position
    className={`absolute w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center border-2 border-black/50 z-20 transition-all duration-200 ${isUsable ? 'hover:bg-purple-500' : 'bg-gray-700 opacity-60 cursor-not-allowed'} ${isSelected ? 'ring-2 ring-yellow-300 scale-110' : ''}`}
    // This inline style will override any external CSS file
    style={{
        top: '50%',
        right: '-0.875rem', // This is the equivalent of Tailwind's -right-3.5
        transform: 'translateY(-50%)'
    }}
    title={`${ability.name} - Cost: ${ability.cost.energy} Energy`}
>
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
</button>
);
  /**
   * DRONE TOKEN COMPONENT
   * Renders interactive drone cards on the battlefield with all visual states.
   * Handles animations, stats display, shield visualization, and ability access.
   * @param {Object} drone - The drone data object
   * @param {Function} onClick - Callback when drone is clicked
   * @param {boolean} isPlayer - Whether this is a player-owned drone
   * @param {boolean} isSelected - Whether drone is currently selected
   * @param {boolean} isSelectedForMove - Whether drone is selected for movement
   * @param {boolean} isHit - Whether drone was recently hit (for animation)
   * @param {boolean} isPotentialInterceptor - Whether drone can intercept current attack
   * @param {Function} onMouseEnter - Mouse enter event handler
   * @param {Function} onMouseLeave - Mouse leave event handler
   * @param {Object} effectiveStats - Calculated drone stats with modifiers
   * @param {Function} onAbilityClick - Callback when ability icon is clicked
   * @param {boolean} isActionTarget - Whether drone is target of current action
   */
  const DroneToken = ({ drone, onClick, isPlayer, isSelected, isSelectedForMove, isHit, isPotentialInterceptor, onMouseEnter, onMouseLeave, effectiveStats, onAbilityClick, isActionTarget }) => {
    const baseDrone = useMemo(() => fullDroneCollection.find(d => d.name === drone.name), [drone.name]);
    const { maxShields } = effectiveStats;
    const currentShields = drone.currentShields ?? maxShields;
    const activeAbilities = baseDrone.abilities.filter(a => a.type === 'ACTIVE');

    // --- Dynamic Class Calculation ---
    const borderColor = isPlayer ? 'border-cyan-400' : 'border-pink-500';
    const nameBgColor = isPlayer ? 'bg-cyan-900' : 'bg-pink-950';
    const nameTextColor = isPlayer ? 'text-cyan-100' : 'text-pink-100';
    const statBgColor = isPlayer ? 'bg-cyan-900' : 'bg-pink-950';
    const shieldColor = isPlayer ? 'text-cyan-400' : 'text-pink-500';
    const emptyShieldColor = isPlayer ? 'text-cyan-300 opacity-50' : 'text-pink-400 opacity-60';

    const isAttackBuffed = effectiveStats.attack > effectiveStats.baseAttack;
    const isAttackDebuffed = effectiveStats.attack < effectiveStats.baseAttack;
    const attackTextColor = isAttackBuffed ? 'text-green-400' : isAttackDebuffed ? 'text-red-400' : 'text-white';
    
    const isSpeedBuffed = effectiveStats.speed > effectiveStats.baseSpeed;
    const isSpeedDebuffed = effectiveStats.speed < effectiveStats.baseSpeed;
    const speedTextColor = isSpeedBuffed ? 'text-green-400' : isSpeedDebuffed ? 'text-red-400' : 'text-white';

    // --- State Effects ---
    const exhaustEffect = drone.isExhausted ? 'grayscale opacity-60' : '';
    const hitEffect = isHit ? 'animate-shake' : '';
    const selectedEffect = (isSelected || isSelectedForMove) ? 'scale-105 ring-2 ring-cyan-400 shadow-xl shadow-cyan-400/50' : '';
    const actionTargetEffect = isActionTarget ? 'scale-105 ring-2 ring-purple-400 shadow-xl shadow-purple-500/50 animate-pulse' : '';
    const mandatoryDestroyEffect = mandatoryAction?.type === 'destroy' && isPlayer ? 'ring-2 ring-red-500 animate-pulse' : '';

    const isAbilityUsable = (ability) => {
      if (drone.isExhausted && ability.cost.exhausts !== false) return false;
      if (ability.cost.energy && localPlayerState.energy < ability.cost.energy) return false;
      return true;
    };

    return (
      <div ref={el => droneRefs.current[drone.id] = el}
        onClick={(e) => onClick && onClick(e, drone, isPlayer)}
        onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
        className={`relative w-[90px] h-[135px] transition-all duration-200 ${exhaustEffect} ${hitEffect} ${selectedEffect} ${actionTargetEffect} ${mandatoryDestroyEffect}`}
      >
        {/* Main Token Body */}
        <div className={`relative w-full h-full rounded-lg shadow-lg border ${borderColor} cursor-pointer shadow-black overflow-hidden`}>
          <img src={drone.image} alt={drone.name} className="absolute inset-0 w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 h-full">
            <div className="absolute bottom-6 left-0 right-0 w-full flex flex-col gap-1 px-2">
              <div className="flex w-full justify-center gap-1 min-h-[12px]">
                {Array.from({ length: maxShields }).map((_, i) => (
                  i < currentShields 
                    ? <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={shieldColor}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                    : <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={emptyShieldColor}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                ))}
              </div>
              <div className="flex w-full justify-center gap-0.5">
                {Array.from({ length: baseDrone.hull }).map((_, i) => {
                  const isFullHull = i < drone.hull;
                  const fullHullColor = drone.isExhausted ? 'bg-green-800' : 'bg-green-500';
                  const damagedHullColor = 'bg-gray-400';
                  return (
                    <div key={i} className={`h-2 w-2 rounded-sm ${isFullHull ? fullHullColor : damagedHullColor} border border-black/50`}></div>
                  );
                })}
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-5 ${nameBgColor} flex items-center justify-center border-t ${borderColor}`}>
              <span className={`font-orbitron text-[8px] uppercase ${nameTextColor} tracking-wider w-full text-center`}>{drone.name}</span>
            </div>
          </div>
        </div>

        {/* Overlapping Hexagons */}
        <div className="absolute -top-3 left-[-14px] w-6 h-7 z-20">
            <StatHexagon value={effectiveStats.attack} isFlat={false} bgColor={statBgColor} textColor={attackTextColor} />
        </div>
        <div className={`absolute -top-3 right-[-14px] w-7 h-7 z-20 ${isPotentialInterceptor ? 'interceptor-glow' : ''}`}>
            <StatHexagon value={effectiveStats.speed} isFlat={true} bgColor={statBgColor} textColor={speedTextColor} />
        </div>

        {/* Overlapping Ability Icon */}
        {isPlayer && activeAbilities.length > 0 && isAbilityUsable(activeAbilities[0]) && (
            <AbilityIcon onClick={(e) => onAbilityClick && onAbilityClick(e, drone, activeAbilities[0])} />
        )}
      </div>
    );
  };

  /**
   * UPGRADE SELECTION MODAL COMPONENT
   * Displays modal for selecting which drone type to apply an upgrade to.
   * Shows available targets with visual selection feedback.
   * @param {Object} selectionData - Contains card and target data
   * @param {Function} onConfirm - Callback when upgrade target is confirmed
   * @param {Function} onCancel - Callback when selection is cancelled
   */
  const UpgradeSelectionModal = ({ selectionData, onConfirm, onCancel }) => {
    const { card, targets } = selectionData;
    const [selectedTarget, setSelectedTarget] = useState(null);

    return (
        <GamePhaseModal
            title={`Apply Upgrade: ${card.name}`}
            text="Select a drone type from your active pool to apply this permanent upgrade to."
            onClose={onCancel}
            maxWidthClass="max-w-4xl"
        >
            <div className="flex justify-center my-4">
                <ActionCard card={card} isPlayable={false} />
            </div>
            
            <div className="my-4 p-4 bg-black/20 rounded-lg max-h-64 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {targets.map(drone => (
                        <div
                            key={drone.id}
                            onClick={() => setSelectedTarget(drone)}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-4
                                ${selectedTarget?.id === drone.id ? 'bg-purple-700 border-purple-400' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}
                            `}
                        >
                            <img src={drone.image} alt={drone.name} className="w-12 h-12 rounded-md object-cover" />
                            <span className="font-semibold text-white">{drone.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
                <button 
                    onClick={onCancel} 
                    className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(card, selectedTarget)}
                    disabled={!selectedTarget}
                    className="bg-green-600 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed enabled:hover:bg-green-700"
                >
                    Confirm Upgrade
                </button>
            </div>
        </GamePhaseModal>
    );
};

  /**
   * VIEW UPGRADES MODAL COMPONENT
   * Displays all upgrades currently applied to a specific drone type.
   * Shows upgrade details in a scrollable list format.
   * @param {Object} modalData - Contains drone name and upgrades array
   * @param {Function} onClose - Callback when modal is closed
   */
  const ViewUpgradesModal = ({ modalData, onClose }) => {
    const { droneName, upgrades } = modalData;

    return (
        <GamePhaseModal
            title={`Applied Upgrades: ${droneName}`}
            text="The following permanent upgrades have been applied to this drone type."
            onClose={onClose}
        >
            <div className="my-4 p-2 bg-black/20 rounded-lg max-h-80 overflow-y-auto space-y-3">
                {upgrades.length > 0 ? (
                    upgrades.map(upgrade => (
                        <div key={upgrade.instanceId} className="bg-slate-800/70 p-3 rounded-lg border border-purple-500/50">
                            <h4 className="font-bold text-purple-300">{upgrade.name}</h4>
                            <p className="text-sm text-gray-400 mt-1">{upgrade.description}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 italic">No upgrades applied.</p>
                )}
            </div>
            <div className="flex justify-center mt-6">
                <button 
                    onClick={onClose} 
                    className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors"
                >
                    Close
                </button>
            </div>
        </GamePhaseModal>
    );
};

  /**
   * DESTROY UPGRADE MODAL COMPONENT
   * Allows player to select and destroy an opponent's upgrade.
   * Groups upgrades by drone type for easy navigation.
   * @param {Object} selectionData - Contains card, targets, and opponent state
   * @param {Function} onConfirm - Callback when upgrade destruction is confirmed
   * @param {Function} onCancel - Callback when action is cancelled
   */
  const DestroyUpgradeModal = ({ selectionData, onConfirm, onCancel }) => {
    const { card, targets: upgradedDrones, opponentState } = selectionData;
    const [selectedUpgrade, setSelectedUpgrade] = useState(null); // e.g., { droneName: 'Scout Drone', instanceId: '...' }

    return (
        <GamePhaseModal
            title={`System Sabotage`}
            text="Select an enemy upgrade to destroy. The upgrade will be permanently removed."
            onClose={onCancel}
            maxWidthClass="max-w-4xl"
        >
            <div className="my-4 p-2 bg-black/20 rounded-lg max-h-[60vh] overflow-y-auto space-y-4">
                {upgradedDrones.length > 0 ? (
                    upgradedDrones.map(drone => {
                        const upgradesOnThisDrone = opponentState.appliedUpgrades[drone.name] || [];
                        return (
                            <div key={drone.id} className="bg-slate-800/70 p-3 rounded-lg border border-pink-500/50">
                                <h4 className="font-bold text-pink-300 mb-2">Enemy: {drone.name}</h4>
                                <div className="space-y-2">
                                    {upgradesOnThisDrone.map(upgrade => (
                                        <div
                                            key={upgrade.instanceId}
                                            onClick={() => setSelectedUpgrade({ droneName: drone.name, instanceId: upgrade.instanceId })}
                                            className={`p-2 rounded-md border-2 transition-all cursor-pointer 
                                                ${selectedUpgrade?.instanceId === upgrade.instanceId 
                                                    ? 'bg-red-700 border-red-400' 
                                                    : 'bg-slate-900/50 border-slate-600 hover:bg-slate-700'}`
                                            }
                                        >
                                            <p className="font-semibold text-white">{upgrade.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-gray-500 italic">The opponent has no active upgrades to destroy.</p>
                )}
            </div>

            <div className="flex justify-center gap-4 mt-6">
                <button 
                    onClick={onCancel} 
                    className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:bg-gray-700 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(card, selectedUpgrade)}
                    disabled={!selectedUpgrade}
                    className="bg-red-600 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed enabled:hover:bg-red-700"
                >
                    Destroy Upgrade
                </button>
            </div>
        </GamePhaseModal>
    );
};

  /**
   * SHIP SECTIONS DISPLAY COMPONENT
   * Renders the ship sections area with interactive sections for each player.
   * Handles shield allocation, abilities, and targeting states.
   * @param {Object} player - Player state data
   * @param {Object} playerEffectiveStats - Calculated ship stats
   * @param {boolean} isPlayer - Whether this is the current player's ship
   * @param {Array} placedSections - Array of placed section names
   * @param {Function} onSectionClick - Callback for shield allocation interactions
   * @param {Function} onAbilityClick - Callback for ship ability activation
   * @param {Function} onTargetClick - Callback for targeting interactions
   * @param {boolean} isInteractive - Whether sections should be interactive
   * @param {Array} validCardTargets - Array of valid targets for current action
   * @param {string} reallocationPhase - Current shield reallocation state
   */
  const ShipSectionsDisplay = ({ player, playerEffectiveStats, isPlayer, placedSections, onSectionClick, onAbilityClick, onTargetClick, isInteractive, validCardTargets, reallocationPhase }) => {
    return (
      <div className="flex w-full justify-between gap-8">
        {[0, 1, 2].map((laneIndex) => {
          const sectionName = localPlacedSections[laneIndex];
          if (!sectionName) {
            return <div key={laneIndex} className="flex-1 min-w-0 h-full bg-black/20 rounded-lg border-2 border-dashed border-gray-700"></div>;
          }
          
          const sectionStats = player.shipSections[sectionName];
          const isCardTarget = validCardTargets.some(t => t.id === sectionName);

          // Determine shield reallocation visual state
          let reallocationState = null;
          if (reallocationPhase && isPlayer) {
            if (reallocationPhase === 'removing') {
              if (sectionStats.allocatedShields > 0) {
                reallocationState = 'can-remove';
              } else {
                reallocationState = 'cannot-remove';
              }
            } else if (reallocationPhase === 'adding') {
              const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, player, placedSections);
              if (sectionStats.allocatedShields < effectiveMaxShields) {
                reallocationState = 'can-add';
              } else {
                reallocationState = 'cannot-add';
              }
            }
          }

          return (
            <div key={laneIndex} className="flex-1 min-w-0">
              <ShipSection
                section={sectionName}
                stats={sectionStats}
                effectiveStatsForDisplay={playerEffectiveStats.bySection[sectionName]}
                isPlayer={isPlayer}
                isOpponent={!isPlayer}
                onClick={() => {
                  if (isInteractive && onSectionClick) { // Specifically for shield allocation
                    onSectionClick(sectionName);
                  } else if (onTargetClick) { // For attacks and card/ability targeting
                    onTargetClick({ id: sectionName, name: sectionName, ...sectionStats }, 'section', isPlayer);
                  }
                }}
                onAbilityClick={onAbilityClick}
                isInteractive={isInteractive || (turnPhase === 'action' && isPlayer && sectionStats.ability && localPlayerState.energy >= sectionStats.ability.cost.energy)}
                isCardTarget={isCardTarget}
                isInMiddleLane={laneIndex === 1}
                isHovered={hoveredTarget?.type === 'section' && hoveredTarget?.target.name === sectionName}
                onMouseEnter={() => !isPlayer && setHoveredTarget({ target: { name: sectionName, ...sectionStats }, type: 'section' })}
                onMouseLeave={() => !isPlayer && setHoveredTarget(null)}
                reallocationState={reallocationState}
              />
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * DRONE LANES DISPLAY COMPONENT
   * Renders the three battlefield lanes with their drone contents.
   * Handles lane targeting, deployment, and visual states.
   * @param {Object} player - Player state data
   * @param {boolean} isPlayer - Whether this is the current player's lanes
   * @param {Function} onLaneClick - Callback when a lane is clicked
   */
  const DroneLanesDisplay = ({ player, isPlayer, onLaneClick }) => {
    return (
      <div className="flex w-full justify-between gap-8 min-h-[160px]">
        {['lane1', 'lane2', 'lane3'].map((lane) => {
          const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
          const isTargetable = (abilityMode && validAbilityTargets.some(t => t.id === lane && t.owner === owner)) ||
                               (selectedCard && validCardTargets.some(t => t.id === lane && t.owner === owner)) ||
                               (multiSelectState && validCardTargets.some(t => t.id === lane && t.owner === owner));
          
          const isInteractivePlayerLane = isPlayer && (turnPhase === 'deployment' || turnPhase === 'action');

          return (
            <div 
              key={lane} 
              onClick={(e) => onLaneClick(e, lane, isPlayer)}
              className={`flex-1 rounded-lg border-2 transition-all duration-200 p-2 lane-background
                ${isTargetable ? 'border-purple-500 bg-purple-900/40 ring-2 ring-purple-400 animate-pulse' : 'border-gray-700/50 bg-black/20'} 
                ${isInteractivePlayerLane ? 'cursor-pointer hover:bg-cyan-900/50' : ''}
              `}
            >
              {renderDronesOnBoard(player.dronesOnBoard[lane], isPlayer, lane)}
            </div>
          );
        })}
      </div>
    );
  };


  /**
   * RENDER DRONES ON BOARD
   * Renders all drones within a specific lane with proper positioning.
   * Applies all visual states and interaction handlers.
   * @param {Array} drones - Array of drone objects in the lane
   * @param {boolean} isPlayer - Whether these are player-owned drones
   * @param {string} lane - The lane ID (lane1, lane2, lane3)
   */
  const renderDronesOnBoard = (drones, isPlayer, lane) => {
    return (
      <div className="flex flex-wrap gap-8 pt-2 min-h-[100px] justify-center items-center">
       {drones.map((drone) => {
            const player = isPlayer ? localPlayerState : opponentPlayerState;
            const opponent = isPlayer ? opponentPlayerState : localPlayerState;
            const sections = isPlayer ? localPlacedSections : opponentPlacedSections;
            const effectiveStats = gameEngine.calculateEffectiveStats(drone, lane, player, opponent, getPlacedSectionsForEngine());
            return (
                <DroneToken
                key={drone.id}
                drone={drone}
                effectiveStats={effectiveStats}
                isPlayer={isPlayer}
                onClick={handleTokenClick}
                onAbilityClick={handleAbilityIconClick}
                isSelected={selectedDrone && selectedDrone.id === drone.id}
                isSelectedForMove={multiSelectState?.phase === 'select_drones' && multiSelectState.selectedDrones.some(d => d.id === drone.id)}
                isHit={recentlyHitDrones.includes(drone.id)}
                isPotentialInterceptor={potentialInterceptors.includes(drone.id)}
                isActionTarget={validAbilityTargets.some(t => t.id === drone.id) || validCardTargets.some(t => t.id === drone.id)}
                onMouseEnter={() => !isPlayer && setHoveredTarget({ target: drone, type: 'drone', lane })}
                onMouseLeave={() => !isPlayer && setHoveredTarget(null)}
                 />
            );
        })}
      </div>
    );
  };

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
           <DroneToken drone={attacker} isPlayer={false} effectiveStats={gameEngine.calculateEffectiveStats(attacker, lane, opponentPlayerState, localPlayerState, getPlacedSectionsForEngine())}/>
          </div>
          <div className="text-4xl font-bold text-gray-500">VS</div>
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-cyan-400 mb-2">Target</h4>
           {targetType === 'drone' ? (
             <DroneToken drone={target} isPlayer={true} effectiveStats={gameEngine.calculateEffectiveStats(target, lane, localPlayerState, opponentPlayerState, getPlacedSectionsForEngine())} />

           ) : (
             <div className="transform scale-75">
               <ShipSection
                 section={target.name}
                 stats={localPlayerState.shipSections[target.name]}
                 isPlayer={true}
                 isInteractive={false}
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
   * DRONE CARD COMPONENT
   * Renders detailed drone cards for deck building and drone pool display.
   * Shows stats, abilities, deployment limits, and upgrade effects.
   * @param {Object} drone - The drone data object
   * @param {Function} onClick - Callback when card is clicked
   * @param {boolean} isSelectable - Whether card can be selected
   * @param {boolean} isSelected - Whether card is currently selected
   * @param {number} deployedCount - Number of this drone type already deployed
   * @param {boolean} ignoreDeployLimit - Whether to ignore deployment limits
   * @param {Array} appliedUpgrades - Array of upgrades applied to this drone type
   * @param {boolean} isUpgradeTarget - Whether this card is targeted for upgrade
   * @param {Function} onViewUpgrades - Callback to view applied upgrades
   */
  const DroneCard = ({ drone, onClick, isSelectable, isSelected, deployedCount, ignoreDeployLimit = false, appliedUpgrades = [], isUpgradeTarget = false, onViewUpgrades }) => {
    // We need to recalculate the limit here for the UI display
    let effectiveLimit = drone.limit;
    appliedUpgrades.forEach(upg => { if (upg.mod.stat === 'limit') effectiveLimit += upg.mod.value; });

    const atLimit = deployedCount >= effectiveLimit;
    const isInteractive = isSelectable && (!atLimit || ignoreDeployLimit);
    // --- Calculate effective stats and determine colors ---
    const effectiveCardStats = useMemo(() => {
        const stats = { attack: drone.attack, speed: drone.speed, cost: drone.class };
        appliedUpgrades.forEach(upg => {
            if (upg.mod.stat === 'cost') {
                stats.cost = Math.max(0, stats.cost + upg.mod.value);
            } else if (stats.hasOwnProperty(upg.mod.stat)) {
                stats[upg.mod.stat] += upg.mod.value;
            }
        });
        return stats;
    }, [drone, appliedUpgrades]);

    const deploymentCost = effectiveCardStats.cost;
    
    const isAttackBuffed = effectiveCardStats.attack > drone.attack;
    const isAttackDebuffed = effectiveCardStats.attack < drone.attack;
    const attackTextColor = isAttackBuffed ? 'text-green-400' : isAttackDebuffed ? 'text-red-400' : 'text-white';
    const isSpeedBuffed = effectiveCardStats.speed > drone.speed;
    const isSpeedDebuffed = effectiveCardStats.speed < drone.speed;
    const speedTextColor = isSpeedBuffed ? 'text-green-400' : isSpeedDebuffed ? 'text-red-400' : 'text-white';
    const isCostReduced = effectiveCardStats.cost < drone.class;
    const isCostIncreased = effectiveCardStats.cost > drone.class;
    const costTextColor = isCostReduced ? 'text-green-400' : isCostIncreased ? 'text-red-400' : 'text-white';
    const isLimitBuffed = effectiveLimit > drone.limit;
    const limitTextColor = isLimitBuffed ? 'text-green-400' : 'text-white';
    const { name, image, attack, hull, shields, speed, abilities } = drone;
    
    return (
      <div
      onClick={isInteractive ? () => onClick(drone) : undefined}
      className={`
        w-60 h-[320px] rounded-lg p-[2px] relative group
        transition-all duration-200
       ${isInteractive ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isSelected ? 'bg-cyan-400' : 'bg-cyan-800/80'}
       ${!isInteractive ? 'opacity-60' : ''}
       ${isUpgradeTarget ? 'ring-4 ring-purple-500 animate-pulse' : ''}
      `}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
      >
    <div
        className={`
            w-full h-full relative flex flex-col font-orbitron text-cyan-300 overflow-hidden
        `}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
    >
        {/* 1. Image takes up all of the background */}
        <img src={image} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Wrapper for all content on top of the image */}
        <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="text-center py-1 px-3 bg-black/40 flex-shrink-0 h-8 flex items-center justify-center">
                <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap text-white" />
            </div>

            {/* Repositioned Stats */}
            <div className="flex justify-between items-center px-2 flex-shrink-0 mt-2 h-12">
                {/* Attack Hexagon */}
                <div className="w-10 h-12">
                    <CardStatHexagon value={effectiveCardStats.attack} isFlat={false} icon={Sword} iconColor="text-red-400" textColor={attackTextColor} />
                </div>

                {/* Center Hull and Shields */}
                <div className="flex flex-col items-center gap-1">
                    <div className="flex w-full justify-center gap-1.5 min-h-[12px]">
                        {shields > 0 && Array.from({ length: shields }).map((_, i) => (
                            <svg key={`shield-${i}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-300"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                        ))}
                    </div>
                    <div className="flex w-full justify-center gap-1">
                        {Array.from({ length: hull }).map((_, i) => (
                            <div key={`hull-${i}`} className="h-3 w-3 rounded-sm bg-green-500 border border-black/50"></div>
                        ))}
                    </div>
                </div>

                {/* Speed Hexagon */}
                <div className="w-12 h-12">
                    <CardStatHexagon value={effectiveCardStats.speed} isFlat={true} icon={Rocket} iconColor="text-blue-400" textColor={speedTextColor} />
                </div>
            </div>

            {/* Resized, semi-transparent abilities box */}
            <div className="mx-2 mt-auto mb-2 max-h-40 bg-black/60 backdrop-blur-sm border border-cyan-800/70 p-2 flex flex-col space-y-2 overflow-y-auto rounded-md">
                {abilities && abilities.length > 0 ? (
                    abilities.map((ability, index) => (
                        <div key={index}>
                            <h4 className="text-xs text-purple-400 tracking-wider font-bold">{ability.name}</h4>
                            <p className="text-gray-400 text-xs leading-tight font-exo">{ability.description}</p>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-cyan-700 italic opacity-70">[ No Abilities ]</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="grid grid-cols-3 items-center p-1 border-t border-cyan-800/70 flex-shrink-0 h-12">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-400">Cost</span>
                    <div className="flex items-center">
                        <Bolt size={14} className="text-yellow-300"/>
                        <span className={`font-bold text-base ml-1 ${costTextColor}`}>{deploymentCost}</span>
                    </div>
                </div>

                {/* --- NEW UPGRADE COUNTER --- */}
                  {drone.upgradeSlots > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevents the main card onClick from firing
                            if (onViewUpgrades) onViewUpgrades(drone, appliedUpgrades);
                        }}
                        className="flex flex-col items-center cursor-pointer group"
                    >
                        <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors">Upgrades</span>
                        <div className="flex items-center">
                            <span className="font-bold text-base text-purple-400">
                                {appliedUpgrades.length}/{drone.upgradeSlots}
                            </span>
                        </div>
                    </button>
                )}

                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-400">Deployed</span>
                    <div className="flex items-center">
                        <span className={`font-bold text-base ${atLimit ? 'text-pink-500' : limitTextColor}`}>
                            {deployedCount}/{effectiveLimit}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
);
  };

  /**
   * SHIP PLACEMENT SCREEN COMPONENT
   * Provides interface for placing ship sections during initial setup.
   * Shows unplaced sections and lane slots with center lane bonus indication.
   * @param {Array} unplaced - Array of unplaced section names
   * @param {Array} placed - Array of placed sections by lane index
   * @param {string} selected - Currently selected section name
   * @param {Function} onSectionSelect - Callback when section is selected
   * @param {Function} onLaneSelect - Callback when lane is selected for placement
   * @param {Function} onConfirm - Callback when layout is confirmed
   * @param {Object} player - Player state data
   */
  const ShipPlacementScreen = ({ unplaced, placed, selected, onSectionSelect, onLaneSelect, onConfirm, player }) => {
    const allPlaced = placed.every(section => section !== null);

    console.log(`🔥 ShipPlacementScreen rendered:`, {
      allPlaced,
      placed,
      unplaced,
      selected
    });
  
    return (
      <div className="flex flex-col items-center w-full h-full justify-start pt-8 px-4">
        <h2 className="text-3xl font-bold mb-2 text-white text-center font-orbitron">
          Configure Your Ship Layout
        </h2>
        <p className="text-center text-gray-400 mb-8">
          Select a section, then click an empty lane to place it. You can also click a placed section to pick it up again. 
          The ship section placed in the centre lane will gain a bonus to its stats.
        </p>
        
        {/* This container holds both rows of ship sections */}
        <div className="flex flex-col items-center w-full space-y-4">
          {/* Unplaced Sections Row */}
          <div className="flex w-full justify-between gap-8">
            {['bridge', 'powerCell', 'droneControlHub'].map(sectionName => (
              <div key={sectionName} className="flex-1 min-w-0 h-[190px]">
                {unplaced.includes(sectionName) && (
                  <div 
                    onClick={() => onSectionSelect(sectionName)}
                    className={`h-full transition-all duration-300 rounded-xl ${selected === sectionName ? 'scale-105 ring-4 ring-cyan-400' : 'opacity-70 hover:opacity-100 cursor-pointer'}`}
                  >
                    <ShipSection 
                      section={sectionName} 
                      stats={player.shipSections[sectionName]}
                      // This is the updated line that shows the base stats
                      effectiveStatsForDisplay={player.shipSections[sectionName].stats.healthy}
                      isPlayer={true}
                      isInteractive={true}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Placed Sections Row */}
          <div className="flex w-full justify-between gap-8">
            {[0, 1, 2].map(laneIndex => {
              const placedSectionName = placed[laneIndex];
              const isSelectedForPlacement = selected && !placed[laneIndex];
              
              return (
                <div 
                  key={laneIndex} 
                  className="flex-1 min-w-0 h-[190px]"
                  onClick={() => onLaneSelect(laneIndex)}
                >
                  {placedSectionName ? (
                    <ShipSection 
                      section={placedSectionName} 
                      stats={player.shipSections[placedSectionName]} 
                      effectiveStatsForDisplay={gameEngine.calculateEffectiveShipStats(player, placed).bySection[placedSectionName]}
                      isPlayer={true} 
                      isInteractive={true}
                      isInMiddleLane={laneIndex === 1}
                    />
                  ) : (
                    <div className={`bg-black/30 rounded-xl border-2 border-dashed border-purple-500/50 flex items-center justify-center text-purple-300/70 p-4 h-full transition-colors duration-300 ${isSelectedForPlacement ? 'cursor-pointer hover:border-purple-500 hover:bg-purple-900/20' : ''}`}>
                      <span className="text-center font-bold">
                        {laneIndex === 1 ? 'Lane 2 (Center Bonus)' : `Lane ${laneIndex + 1}`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <button
          onClick={() => {
            console.log(`🔥 Confirm Layout button clicked! allPlaced: ${allPlaced}`);
            onConfirm();
          }}
          disabled={!allPlaced}
          className="mt-12 bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-green-500 shadow-lg"
        >
          Confirm Layout
        </button>
      </div>
    );
  };

  /**
   * SHIP SECTION COMPONENT
   * Renders individual ship sections with stats, abilities, and visual states.
   * Handles shield allocation, damage states, and interaction feedback.
   * @param {string} section - Section name identifier
   * @param {Object} stats - Section stats data
   * @param {Object} effectiveStatsForDisplay - Calculated effective stats for display
   * @param {boolean} isPlayer - Whether this is the player's section
   * @param {boolean} isPlaceholder - Whether this is a placeholder slot
   * @param {Function} onClick - Callback when section is clicked
   * @param {Function} onAbilityClick - Callback when ability is activated
   * @param {boolean} isInteractive - Whether section should be interactive
   * @param {boolean} isOpponent - Whether this is opponent's section
   * @param {boolean} isHovered - Whether section is currently hovered
   * @param {Function} onMouseEnter - Mouse enter event handler
   * @param {Function} onMouseLeave - Mouse leave event handler
   * @param {boolean} isCardTarget - Whether section is targeted by current action
   * @param {boolean} isInMiddleLane - Whether section is in center lane (bonus)
   * @param {string} reallocationState - Current shield reallocation state
   */
  const ShipSection = ({ section, stats, effectiveStatsForDisplay, isPlayer, isPlaceholder, onClick, onAbilityClick, isInteractive, isOpponent, isHovered, onMouseEnter, onMouseLeave, isCardTarget, isInMiddleLane, reallocationState }) => {
    if (isPlaceholder) {
      return (
        <div
          className="bg-black/30 rounded-lg border-2 border-dashed border-purple-500/50 flex items-center justify-center text-purple-300/70 p-4 min-h-[160px] h-full transition-colors duration-300 cursor-pointer hover:border-purple-500 hover:text-purple-300"
          onClick={onClick}
        >
          <span className="text-center">Click to place section</span>
        </div>
      );
    }
    
    const sectionStatus = gameEngine.getShipStatus(stats);
    
    const overlayColor = sectionStatus === 'critical' ? 'bg-red-900/60' : sectionStatus === 'damaged' ? 'bg-yellow-900/50' : 'bg-black/60';
    let borderColor = sectionStatus === 'critical' ? 'border-red-500' : sectionStatus === 'damaged' ? 'border-yellow-500' : (isOpponent ? 'border-pink-500' : 'border-cyan-500');
    const shadowColor = isOpponent ? 'shadow-pink-500/20' : 'shadow-cyan-500/20';
    const hoverEffect = isHovered ? 'scale-105 shadow-xl' : '';

    // Override border color for shield reallocation states
    let reallocationEffect = '';
    if (reallocationState) {
      switch (reallocationState) {
        case 'can-remove':
          borderColor = 'border-orange-400';
          reallocationEffect = 'ring-2 ring-orange-400/50 shadow-lg shadow-orange-400/30';
          break;
        case 'removed-from':
          borderColor = 'border-orange-600';
          reallocationEffect = 'ring-4 ring-orange-600/80 shadow-lg shadow-orange-600/50 bg-orange-900/20';
          break;
        case 'cannot-remove':
          borderColor = 'border-gray-600';
          reallocationEffect = 'opacity-50';
          break;
        case 'can-add':
          borderColor = 'border-green-400';
          reallocationEffect = 'ring-2 ring-green-400/50 shadow-lg shadow-green-400/30';
          break;
        case 'added-to':
          borderColor = 'border-green-600';
          reallocationEffect = 'ring-4 ring-green-600/80 shadow-lg shadow-green-600/50 bg-green-900/20';
          break;
        case 'cannot-add':
          borderColor = 'border-gray-600';
          reallocationEffect = 'opacity-50';
          break;
      }
    }

    const cardTargetEffect = isCardTarget ? 'ring-4 ring-purple-400 shadow-lg shadow-purple-400/50 animate-pulse' : '';
    const sectionName = section === 'droneControlHub' ? 'Drone Control Hub' : section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    const backgroundImageStyle = {
      backgroundImage: `url(${stats.image})`,
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    };

    return (
      <div
        className={`
          relative rounded-xl shadow-lg ${shadowColor} border-2 h-full
          transition-all duration-300 overflow-hidden
          ${borderColor}
          ${isInteractive ? `cursor-pointer ${hoverEffect}` : ''}
          ${cardTargetEffect}
          ${reallocationEffect}
        `}
        style={backgroundImageStyle}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className={`absolute inset-0 ${overlayColor}`}></div>
        
        <div className="relative z-10 flex flex-col items-center p-4 h-full">
            <div className={`absolute top-2 right-2 flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${sectionStatus === 'healthy' ? 'bg-green-500/20 text-green-300' : sectionStatus === 'damaged' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                {sectionStatus.charAt(0).toUpperCase() + sectionStatus.slice(1)}
            </div>
          
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="font-bold text-lg text-white">{sectionName}</p>
              <p className="text-xs text-gray-400 italic max-w-[200px]">{stats.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full items-center mt-auto">
              <div className="flex flex-col items-start text-sm text-gray-300">
                {effectiveStatsForDisplay && Object.entries(effectiveStatsForDisplay).map(([key, value]) => {
                  const isBoosted = isInMiddleLane && stats.middleLaneBonus && stats.middleLaneBonus[key];
                  return (
                      <span key={key} className="flex items-center text-xs">
                          <span className="font-semibold mr-1">{key}:</span>
                          <span className={isBoosted ? 'text-green-400 font-bold' : ''}>{value}</span>
                      </span>
                  );
                })}
              </div>

              <div className="flex flex-col items-center">
                <div className="flex gap-1 items-center mb-2">
                  {Array(stats.shields).fill(0).map((_, i) => (
                    <div key={i}>
                      {i < stats.allocatedShields 
                        ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-300"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                      }
                    </div>
                  ))}
                </div>
                <div className="flex w-full justify-center gap-1">
                  {Array.from({ length: stats.maxHull }).map((_, i) => {
                      const hullPoint = i + 1;
                      const { critical, damaged } = stats.thresholds;
                      let thresholdColor;
                      if (hullPoint <= critical) {
                          thresholdColor = 'bg-red-500';
                      } else if (hullPoint <= damaged) {
                          thresholdColor = 'bg-orange-500';
                      } else {
                          thresholdColor = 'bg-green-500';
                      }
                      const isFilled = i < stats.hull;
                      return (
                        <div key={i} className={`h-4 w-4 rounded-sm ${isFilled ? thresholdColor : 'bg-gray-400'} border border-black/50`}></div>
                      );
                  })}
                </div>
              </div>
              
              {/* --- THIS IS THE UPDATED SECTION --- */}
              <div className="flex flex-col items-center justify-center h-full pl-4 text-center">
                {isPlayer && stats.ability && (
                  <>
                    <div className="relative w-full mb-1">
                      <h4 className="font-bold text-sm text-purple-300 leading-tight">{stats.ability.name}</h4>
                      <ShipAbilityIcon 
                        ability={stats.ability}
                        isUsable={
                          turnPhase === 'action' &&
                          isMyTurn() &&
                          !passInfo[`${getLocalPlayerId()}Passed`] &&
                          localPlayerState.energy >= stats.ability.cost.energy
                        }
                        isSelected={shipAbilityMode?.ability.id === stats.ability.id}
                        onClick={(e) => onAbilityClick(e, {name: section, ...stats}, stats.ability)}
                      />
                    </div>
                    <p className="text-xs text-gray-400 leading-tight">{stats.ability.description}</p>
                  </>
                )}
              </div>
            </div>
        </div>
      </div>
    );
  };
  
  // --- NEW: ActionCard COMPONENT ---
  const ActionCard = ({ card, onClick, isPlayable, isSelected, isMandatoryTarget }) => {
    const { name, cost, image, description } = card;
  
    return (
<div
  onClick={(e) => {
    e.stopPropagation();
    if (isPlayable || isMandatoryTarget) {
      onClick(card);
    }
  }}
  className={`
    w-52 h-72 rounded-lg p-1 relative group transition-all duration-200 flex-shrink-0
          ${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed'}
          ${isSelected ? 'bg-purple-400' : 'bg-purple-800/80'}
            ${!isPlayable && !isMandatoryTarget ? 'grayscale' : ''}
          ${isMandatoryTarget ? 'cursor-pointer ring-2 ring-red-500 animate-pulse' : ''}
        `}
      >
        <div
          className={`
            w-full h-full bg-slate-900 flex flex-col font-orbitron text-purple-300 overflow-hidden rounded-md
            transition-all duration-200
            ${isPlayable && !isSelected ? 'group-hover:bg-slate-800' : ''}
          `}
        >
          {/* Header */}
          <div className="text-center py-1 px-2 bg-purple-900/50 flex justify-between items-center">
            <span className="font-bold text-sm uppercase tracking-wider truncate">{name}</span>
            <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
              <Bolt size={12} className="text-yellow-300" />
              <span className="text-white font-bold text-sm ml-1">{cost}</span>
            </div>
          </div>
  
          {/* Image */}
          <div className="p-1">
            <div className="relative h-24">
              <img src={image} alt={name} className="w-full h-full object-cover rounded" />
              <div className="absolute inset-0 border border-purple-400/50 rounded"></div>
            </div>
          </div>
  
          {/* Description */}
          <div className="flex-grow mx-2 my-1 bg-black/50 border border-purple-800/70 p-2 flex flex-col min-h-0">
            <div className="flex-grow relative font-exo font-normal text-purple-200">
              <p className="text-sm leading-tight text-center">{description}</p>
            </div>
          </div>
  
          {/* Type Footer */}
          <div className="text-center text-xs py-1 bg-purple-900/50 uppercase font-semibold tracking-widest">
            {card.type} Card
          </div>
        </div>
      </div>
    );
  };

  /**
   * DRONE SELECTION SCREEN COMPONENT
   * Provides interface for selecting drones during initial setup.
   * Shows trio choices and tracks selected drones.
   * @param {Function} onChooseDrone - Callback when drone is selected
   * @param {Array} currentTrio - Current trio of drones to choose from
   * @param {Array} selectedDrones - Array of already selected drones
   */
  const WaitingForOpponentScreen = ({ phase, localPlayerStatus }) => {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center p-8">
          <Loader2 className="w-16 h-16 mx-auto text-cyan-400 animate-spin mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Waiting for Your Opponent
          </h2>
          <p className="text-gray-400 text-lg mb-6">
            {phase === 'droneSelection' && 'Your opponent is still selecting their drones...'}
            {phase === 'deckSelection' && 'Your opponent is still choosing their deck...'}
          </p>
          {localPlayerStatus && (
            <div className="bg-slate-800 rounded-lg p-4 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-green-400 mb-2">✅ Your Selection Complete</h3>
              <p className="text-gray-300 text-sm">{localPlayerStatus}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const DroneSelectionScreen = ({ onChooseDrone, currentTrio, selectedDrones }) => {
    return (
      <div className="flex flex-col items-center w-full p-4">
        <h2 className="text-3xl font-bold mb-2 text-white text-center">
          Choose Your Drones
        </h2>
        <p className="text-center text-gray-400 mb-6">Choice {selectedDrones.length + 1} of 5: Select one drone from the three options below to add to your Active Drone Pool.</p>

       {currentTrio.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 mb-8">
           {currentTrio.map((drone, index) => (
             <DroneCard key={drone.name || index} drone={drone} onClick={() => onChooseDrone(drone)} isSelectable={true} deployedCount={0}/>
            ))}
          </div>
        )}

        <div className="w-full mt-8 pt-8 border-t border-gray-700">
          <h3 className="text-2xl font-bold text-white text-center mb-4">Your Selection ({selectedDrones.length}/5)</h3>
         {selectedDrones.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-6">
             {selectedDrones.map((drone, index) => (
               <DroneCard key={index} drone={drone} isSelectable={false} deployedCount={0}/>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No drones selected yet.</p>
          )}
        </div>
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
    const p1Stats = localPlayerEffectiveStats.totals;
    const p2Stats = opponentPlayerEffectiveStats.totals;

    const compliance = gameEngine.checkHandLimitCompliance(localPlayerState, opponentPlayerState, localPlayerEffectiveStats, opponentPlayerEffectiveStats);

    if (compliance[getLocalPlayerId() + 'NeedsDiscard']) {
      setMandatoryAction({ type: 'discard', player: getLocalPlayerId(), count: compliance[getLocalPlayerId() + 'DiscardCount'] });
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
  const handleStartNewRound = () => {
    setShowRoundEndModal(false);
    addLogEntry({ player: 'SYSTEM', actionType: 'NEW_ROUND', source: `Round ${turn + 1}`, target: 'N/A', outcome: 'New round begins.' }, 'startNewRound');
    setSelectedCard(null);
    setSelectedDrone(null);
    setAbilityMode(null);
    setMultiSelectState(null);
    setFirstPasserOfPreviousRound(passInfo.firstPasser);
    updateGameState({ turn: turn + 1 });
    setPassInfo({ firstPasser: null, [getLocalPlayerId() + 'Passed']: false, [getOpponentPlayerId() + 'Passed']: false });
    
    // Use extracted game logic for round transitions
    const baseLocalPlayerState = gameEngine.calculateNewRoundPlayerState(
      localPlayerState,
      turn,
      localPlayerEffectiveStats,
      gameState.player2,
      getPlacedSectionsForEngine()
    );
    const newPlayer1State = gameEngine.drawToHandLimit(baseLocalPlayerState, localPlayerEffectiveStats.totals.handLimit);

    const baseOpponentPlayerState = gameEngine.calculateNewRoundPlayerState(
      opponentPlayerState,
      turn,
      opponentPlayerEffectiveStats,
      gameState.player1,
      getPlacedSectionsForEngine()
    );
    const newPlayer2State = gameEngine.drawToHandLimit(baseOpponentPlayerState, opponentPlayerEffectiveStats.totals.handLimit);

    gameStateManager.setPlayerStates(newPlayer1State, newPlayer2State);

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
           newOpponentPlayer.dronesOnBoard = gameEngine.updateAuras(newOpponentPlayer, gameState.player1, getPlacedSectionsForEngine());
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
    const isAiTurn = !isMultiplayer() && currentPlayer === getOpponentPlayerId() && (!modalContent || !modalContent.isBlocking) && !winner && !aiActionReport && !aiCardPlayReport && !pendingAttack && !playerInterceptionChoice && !mandatoryAction && !showFirstPlayerModal && !showActionPhaseStartModal && !showRoundEndModal;


    if (!isAiTurn) return;

    let aiTurnTimer;

    const executeAiTurn = () => {

      // Safety check: reset stuck attack flag before AI action
      if (isResolvingAttackRef.current) {
        console.warn('[AI TURN SAFETY] Detected stuck attack flag, resetting before AI turn');
        isResolvingAttackRef.current = false;
      }

      let result;
if (turnPhase === 'deployment' && !passInfo[getOpponentPlayerId() + 'Passed']) {
  result = aiBrain.handleOpponentTurn({
    ...getPlayerStatesForEngine(),
    turn,
    placedSections: gameState.placedSections,
    opponentPlacedSections: gameState.opponentPlacedSections,
    getShipStatus: gameEngine.getShipStatus,
    calculateEffectiveShipStats: gameEngine.calculateEffectiveShipStats,
    calculateEffectiveStats: gameEngine.calculateEffectiveStats,
    addLogEntry

  });
} else if (turnPhase === 'action' && !passInfo[getOpponentPlayerId() + 'Passed']) {
    result = aiBrain.handleOpponentAction({
    ...getPlayerStatesForEngine(),
    placedSections: gameState.placedSections,
    opponentPlacedSections: gameState.opponentPlacedSections,
    getShipStatus: gameEngine.getShipStatus,
    getLaneOfDrone: gameEngine.getLaneOfDrone,
    getValidTargets: gameEngine.getValidTargets,
    calculateEffectiveStats: gameEngine.calculateEffectiveStats,
    addLogEntry
  });
} else {
}

      if (!result) {
        return; // Exit if no action was decided
      }

      if (result.type === 'pass') {
        const wasFirstToPass = !passInfo[getLocalPlayerId() + 'Passed'];
        const newPassInfo = { ...passInfo, [getOpponentPlayerId() + 'Passed']: true, firstPasser: passInfo.firstPasser || (wasFirstToPass ? getOpponentPlayerId() : null) };

        setPassInfo(newPassInfo);

        if (newPassInfo[getLocalPlayerId() + 'Passed']) {
          if (turnPhase === 'deployment') endDeploymentPhase();
          else if (turnPhase === 'action') endActionPhase();
        } else {
          endTurn(getOpponentPlayerId());
        }
      } else if (result.type === 'deploy') {
        const { droneToDeploy, targetLane, logContext } = result.payload;

        addLogEntry({
          player: opponentPlayerState.name,
          actionType: 'DEPLOY',
          source: droneToDeploy.name,
          target: targetLane,
          outcome: `Deployed to ${targetLane}.`
        }, 'aiDeploymentDeploy', logContext);

        const deployResult = gameEngine.executeAiDeployment(
          droneToDeploy,
          targetLane,
          turn,
          gameState.player2,
          gameState.player1,
          getPlacedSectionsForEngine(),
          { addLogEntry }
        );

        if (deployResult.success) {
          gameStateManager.updatePlayerState('player2', deployResult.newPlayerState);
          endTurn(getOpponentPlayerId());
        } else {
        }

      } else if (result.type === 'action') {
        const chosenAction = result.payload;
        const { logContext } = result;
        switch (chosenAction.type) {
          case 'play_card':
            resolveCardPlay(chosenAction.card, chosenAction.target, getOpponentPlayerId(), logContext);
            break;
          case 'attack':
            setPendingAttack({
              attacker: chosenAction.attacker,
              target: chosenAction.target,
              targetType: chosenAction.targetType,
              lane: chosenAction.attacker.lane,
              attackingPlayer: getOpponentPlayerId(),
              aiContext: logContext,
            });
            break;
          case 'move': {
            const { drone, fromLane, toLane } = chosenAction;

            addLogEntry({
              player: opponentPlayerState.name,
              actionType: 'MOVE',
              source: drone.name,
              target: toLane,
              outcome: `Moved from ${fromLane} to ${toLane}.`
            }, 'aiActionMove', logContext);

            // Create a synthetic movement card for the gameEngine
            const moveCard = {
              name: 'AI Move',
              cost: 0,
              effect: { type: 'MOVE', properties: [] } // No special properties for AI moves
            };

            const moveResult = gameEngine.resolveSingleMove(
              moveCard,
              drone,
              fromLane,
              toLane,
              opponentPlayerState,
              gameState.player1,
              getPlacedSectionsForEngine(),
              {
                logCallback: () => {}, // Already logged above
                applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
                updateAurasCallback: gameEngine.updateAuras
              }
            );

            updatePlayerState(getOpponentPlayerId(), moveResult.newPlayerState);
            endTurn(getOpponentPlayerId());
            break;
          }
          default:
            endTurn(getOpponentPlayerId());
            break;
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

    // 1. Set up the opponent (Player 2) with the selected AI's data
    // Find the full drone objects from the collection based on the names in the AI's pool
    const aiDrones = fullDroneCollection.filter(d => selectedAI.dronePool.includes(d.name));

    // Initialize the drone counts for the AI's specific pool
    const aiInitialCounts = {};
    aiDrones.forEach(drone => {
      aiInitialCounts[drone.name] = 0;
    });

    // Create new state for Player 2 and update via GameStateManager
    const newPlayer2State = {
      ...gameEngine.initialPlayerState(selectedAI.name, selectedAI.decklist), // Use AI's name and decklist
      activeDronePool: aiDrones,
      deployedDroneCounts: aiInitialCounts,
    };

    updatePlayerState(getOpponentPlayerId(), newPlayer2State);
    // 2. Standard game start procedure
    setTurnPhase('droneSelection'); // CHANGED: This now sends you to drone selection.
    // Randomly place the opponent's ship sections
    const sections = Object.keys(opponentPlayerState.shipSections);
    const shuffledSections = sections.sort(() => 0.5 - Math.random());
    updateGameState({ opponentPlacedSections: shuffledSections });
    
    // 3. Set the initial modal message for the player
    setModalContent({
        title: 'Phase 2: Choose Your Drones', // CHANGED: Updated title for the modal.
        text: 'Select 5 drones from your full collection to add to your Active Drone Pool. These are the drones you can launch during the game. Once you have made your selection, click "Confirm Selection".', // CHANGED: Updated instructions.
        isBlocking: true
    });
    
    // ADDED: This code prepares the drones for the selection screen. It was previously in handlePlaceSection.
    const initialPool = [...fullDroneCollection].sort(() => 0.5 - Math.random());
    const firstTrio = initialPool.slice(0, 3);
    const remaining = initialPool.slice(3);

    updateGameState({
      droneSelectionTrio: firstTrio,
      droneSelectionPool: remaining
    });
    setTempSelectedDrones([]);
  };
    
 
  /**
   * HANDLE START ACTION PHASE
   * Transitions from deployment to action phase.
   * Sets first player and displays appropriate turn modal.
   */
  const handleStartActionPhase = () => {
   setShowActionPhaseStartModal(false);
   setPassInfo({ firstPasser: null, [getLocalPlayerId() + 'Passed']: false, [getOpponentPlayerId() + 'Passed']: false });
   const firstActor = firstPlayerOfRound;
   setCurrentPlayer(firstActor);
   setTurnPhase('action');

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
  const proceedToFirstTurn = () => {
    const determineFirstPlayer = () => {
        if (firstPlayerOverride) {
           setFirstPlayerOverride(null);
            return firstPlayerOverride;
        }
        if (turn === 1) {
            return Math.random() < 0.5 ? getLocalPlayerId() : getOpponentPlayerId();
        }
        return firstPasserOfPreviousRound || getLocalPlayerId();
    };

    const firstPlayer = determineFirstPlayer();
    setCurrentPlayer(firstPlayer);
    setFirstPlayerOfRound(firstPlayer);
    setShowFirstPlayerModal(true);
  };

  /**
   * PROCEED TO SHIELD ALLOCATION
   * Initiates shield restoration phase.
   * Calculates available shields and sets up allocation UI.
   */
  const proceedToShieldAllocation = () => {
    setSelectedCard(null);
    setSelectedDrone(null);
    setAbilityMode(null);
    const shieldsPerTurn = localPlayerEffectiveStats.totals.shieldsPerTurn;
    updateGameState({ shieldsToAllocate: shieldsPerTurn });
    setInitialShieldAllocation(JSON.parse(JSON.stringify(localPlayerState.shipSections)));
    setTurnPhase('allocateShields');
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
   * @param {string} sectionName - Name of the section being selected
   */
  const handleSelectSectionForPlacement = (sectionName) => {
    // If clicking a section in the top "unplaced" row
    if (unplacedSections.includes(sectionName)) {
        // Toggle selection: if it's already selected, unselect it. Otherwise, select it.
        setSelectedSectionForPlacement(prev => prev === sectionName ? null : sectionName);
    } else {
        // If clicking a section that's already in a lane (a "placed" section)
        const laneIndex = localPlacedSections.indexOf(sectionName);
        const newPlaced = [...localPlacedSections];
        newPlaced[laneIndex] = null; // Remove from lane
        updateGameState({
          placedSections: gameState.gameMode === 'guest' ? opponentPlacedSections : newPlaced,
          opponentPlacedSections: gameState.gameMode === 'guest' ? newPlaced : placedSections,
          unplacedSections: [...unplacedSections, sectionName]
        });
        setSelectedSectionForPlacement(null); // This is the fix: clear the selection
    }
  };

  /**
   * HANDLE LANE SELECT FOR PLACEMENT
   * Places selected ship section in chosen lane.
   * Handles lane swapping and section management.
   * @param {number} laneIndex - Index of the lane (0, 1, 2)
   */
  const handleLaneSelectForPlacement = (laneIndex) => {
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
        
        updateGameState({
          unplacedSections: newUnplaced,
          placedSections: gameState.gameMode === 'guest' ? opponentPlacedSections : newPlaced,
          opponentPlacedSections: gameState.gameMode === 'guest' ? newPlaced : placedSections
        });

      } else {
        // If the lane is empty, place the section
        const newPlaced = [...localPlacedSections];
        newPlaced[laneIndex] = selectedSectionForPlacement;
        updateGameState({
          placedSections: gameState.gameMode === 'guest' ? opponentPlacedSections : newPlaced,
          opponentPlacedSections: gameState.gameMode === 'guest' ? newPlaced : placedSections,
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
   * Finalizes ship section placement and initiates initial card draw.
   * Sets up both players' hands and transitions to first turn determination.
   */
  const handleConfirmPlacement = () => {
    console.log(`🔥 handleConfirmPlacement called`);

    // Draw cards for local player
    drawPlayerHand();

    // In local mode, also draw cards for AI player
    if (!isMultiplayer()) {
      let newDeck = [...opponentPlayerState.deck];
      let newHand = [];
      const handSize = gameEngine.calculateEffectiveShipStats(opponentPlayerState, opponentPlacedSections).totals.handLimit;

      for (let i = 0; i < handSize; i++) {
        if (newDeck.length > 0) {
          newHand.push(newDeck.pop());
        } else {
          break;
        }
      }
      updatePlayerState(getOpponentPlayerId(), { ...opponentPlayerState, deck: newDeck, hand: newHand });
    }

    console.log(`🔥 About to call sendPhaseCompletion('placement')`);
    // Send completion notification to opponent
    sendPhaseCompletion('placement');

    console.log(`🔥 About to check if both players are ready`);
    // Check if both players are ready to proceed
    if (areBothPlayersReady('placement')) {
      console.log(`🔥 Both players ready! Proceeding to next phase`);
    } else {
      console.log(`🔥 Not both players ready yet, staying in placement phase`);
    }

    if (areBothPlayersReady('placement')) {
      setTurnPhase('initialDraw');

      const proceed = () => {
        setModalContent(null);
        proceedToFirstTurn();
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
    // If not both ready in multiplayer, stay in placement phase and let WaitingForOpponentScreen handle it
  };

  /**
   * HANDLE ALLOCATE SHIELD
   * Allocates a shield to a specific ship section during shield allocation phase.
   * Validates shield limits and available shield count.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAllocateShield = (sectionName) => {
    const section = localPlayerState.shipSections[sectionName];
    const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, localPlayerState, localPlacedSections);
    if (shieldsToAllocate > 0 && section.allocatedShields < effectiveMaxShields) {
     const newShipSections = {
        ...localPlayerState.shipSections,
        [sectionName]: {
          ...localPlayerState.shipSections[sectionName],
          allocatedShields: localPlayerState.shipSections[sectionName].allocatedShields + 1,
        }
      };
      updatePlayerState(getLocalPlayerId(), { ...localPlayerState, shipSections: newShipSections });
     updateGameState({ shieldsToAllocate: shieldsToAllocate - 1 });
    }
  };

  /**
   * HANDLE REMOVE SHIELD
   * Removes a shield from a section during shield reallocation.
   * Transfers removed shields to allocation pool.
   * @param {string} sectionName - Name of the section losing the shield
   */
  const handleRemoveShield = (sectionName) => {
    if (shieldsToRemove <= 0) return;

    const section = localPlayerState.shipSections[sectionName];
    if (section.allocatedShields <= 0) return;

    const newShipSections = {
      ...localPlayerState.shipSections,
      [sectionName]: {
        ...localPlayerState.shipSections[sectionName],
        allocatedShields: localPlayerState.shipSections[sectionName].allocatedShields - 1
      }
    };
    updatePlayerState(getLocalPlayerId(), { ...localPlayerState, shipSections: newShipSections });

    setShieldsToRemove(prev => prev - 1);
    setShieldsToAdd(prev => prev + 1);
  };

  /**
   * HANDLE ADD SHIELD
   * Adds a shield to a section during shield reallocation.
   * Validates section shield limits before allocation.
   * @param {string} sectionName - Name of the section receiving the shield
   */
  const handleAddShield = (sectionName) => {
    if (shieldsToAdd <= 0) return;

    const section = localPlayerState.shipSections[sectionName];
    const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, localPlayerState, localPlacedSections);
    if (section.allocatedShields >= effectiveMaxShields) return;

    const newShipSections = {
      ...localPlayerState.shipSections,
      [sectionName]: {
        ...localPlayerState.shipSections[sectionName],
        allocatedShields: localPlayerState.shipSections[sectionName].allocatedShields + 1
      }
    };
    updatePlayerState(getLocalPlayerId(), { ...localPlayerState, shipSections: newShipSections });

    setShieldsToAdd(prev => prev - 1);
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
  const handleCancelReallocation = () => {
    // Restore original shields
    updatePlayerState(getLocalPlayerId(), {
      ...localPlayerState,
      shipSections: originalShieldAllocation
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
  const handleResetShieldAllocation = () => {
   updatePlayerState(getLocalPlayerId(), { ...localPlayerState, shipSections: initialShieldAllocation });
   updateGameState({ shieldsToAllocate: localPlayerEffectiveStats.totals.shieldsPerTurn });
  };

  /**
   * HANDLE END ALLOCATION
   * Completes shield allocation phase and handles AI shield allocation.
   * Determines first player and transitions to deployment phase.
   */
  const handleEndAllocation = () => {
    const shieldsToAllocateAI = opponentPlayerEffectiveStats.shieldsPerTurn;
    const aiSections = Object.keys(opponentPlayerState.shipSections);
   // AI shield allocation
   let remainingAIShields = shieldsToAllocateAI;
   const newSections = JSON.parse(JSON.stringify(opponentPlayerState.shipSections));
   let i = 0;
   let failsafe = 0;
   while (remainingAIShields > 0 && failsafe < 100) {
     const sectionName = aiSections[i % aiSections.length];
     if (newSections[sectionName].allocatedShields < newSections[sectionName].shields) {
      newSections[sectionName].allocatedShields++;
       remainingAIShields--;
     }
     i++;
     failsafe++;
   }
   updatePlayerState(getOpponentPlayerId(), { ...opponentPlayerState, shipSections: newSections });


    const determineFirstPlayer = () => {
        // Priority 1: A card/ability effect overrides the normal rules.
        if (firstPlayerOverride) {
           setFirstPlayerOverride(null); // Clear the override after using it
            return firstPlayerOverride;
        }
        // Priority 2: For the very first round, it's random.
        if (turn === 1) {
            return Math.random() < 0.5 ? getLocalPlayerId() : getOpponentPlayerId();
        }
        // Priority 3: The player who passed first in the previous round goes first.
        // If for some reason no one passed first (e.g. simultaneous pass), default to local player.
        return firstPasserOfPreviousRound || getLocalPlayerId();
    };

    const firstPlayer = determineFirstPlayer();
   setCurrentPlayer(firstPlayer);
   setFirstPlayerOfRound(firstPlayer);
   setShowFirstPlayerModal(true);
  };

  /**
   * HANDLE START DEPLOYMENT PHASE
   * Initiates deployment phase with appropriate turn modals.
   * Sets first player and displays deployment instructions.
   */
  const handleStartDeploymentPhase = () => {
   setPassInfo({ firstPasser: null, [getLocalPlayerId() + 'Passed']: false, [getOpponentPlayerId() + 'Passed']: false });
   setTurnPhase('deployment');

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

  /**
   * HANDLE CONFIRM DRONE SELECTION
   * Finalizes player's drone pool selection and transitions to deck phase.
   * Updates player state with selected drones and counts.
   * @param {Array} selectedDrones - Array of selected drone objects
   */
  const handleConfirmDroneSelection = (selectedDrones) => {
    const droneNames = selectedDrones.map(d => d.name).join(', ');
    addLogEntry({
      player: 'SYSTEM',
      actionType: 'DRONE_SELECTION',
      source: 'Player Setup',
      target: 'N/A',
      outcome: `Player selected drones: ${droneNames}.`
    }, 'handleConfirmDroneSelection');

    const initialCounts = {};
    selectedDrones.forEach(drone => {
      initialCounts[drone.name] = 0;
    });

    const localPlayerId = getLocalPlayerId();
    updatePlayerState(localPlayerId, {
      ...gameState[localPlayerId],
      activeDronePool: selectedDrones,
      deployedDroneCounts: initialCounts
    });

    // Send completion notification to opponent
    sendPhaseCompletion('droneSelection');

    // Check if both players are ready to proceed
    if (areBothPlayersReady('droneSelection')) {
      setTurnPhase('deckSelection');
      setModalContent(null);
    } else {
      // Show waiting screen
      setModalContent(null); // This will trigger the waiting screen in the render logic
    }
  };

  /**
   * START PLACEMENT PHASE
   * Initiates ship section placement phase.
   * Sets up unplaced sections and placement UI state.
   */
  const startPlacementPhase = () => {
    updateGameState({ unplacedSections: ['bridge', 'powerCell', 'droneControlHub'] });
    setSelectedSectionForPlacement(null);
    updateGameState({ placedSections: Array(3).fill(null), opponentPlacedSections: Array(3).fill(null) });
    setTurnPhase('placement');
    setModalContent({
      title: 'Phase 3: Place Your Ship Sections',
      text: 'Now, place your ship sections. The middle lane provides a strategic bonus to whichever section is placed there.',
      isBlocking: true,
    });
  };

  /**
   * HANDLE DECK CHOICE
   * Processes player's choice between standard deck or custom deck building.
   * Routes to appropriate phase based on selection.
   * @param {string} choice - 'standard' or 'custom' deck choice
   */
  const handleDeckChoice = (choice) => {
    if (choice === 'standard') {
      // Build the standard deck for the local player
      const localPlayerId = getLocalPlayerId();
      const standardDeck = gameEngine.buildDeckFromList(startingDecklist);

      updatePlayerState(localPlayerId, {
        ...gameState[localPlayerId],
        deck: standardDeck
      });

      addLogEntry({
        player: 'SYSTEM',
        actionType: 'DECK_SELECTION',
        source: 'Player Setup',
        target: 'N/A',
        outcome: 'Player selected the Standard Deck.'
      }, 'handleDeckChoice');

      // Send completion notification to opponent
      sendPhaseCompletion('deckSelection');

      // Check if both players are ready to proceed
      if (areBothPlayersReady('deckSelection')) {
        startPlacementPhase();
      }
      // If not ready, the waiting screen will be shown by the render logic
    } else if (choice === 'custom') {
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
   */
  const handleConfirmDeck = () => {
    // ADD THIS BLOCK
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
    // The 'deck' state has been updated by handleDeckChange, so we can use it directly
    const decklist = Object.entries(deck).map(([id, quantity]) => ({ id, quantity }));

    // Use our existing helper to build the final, shuffled deck
    const newPlayerDeck = gameEngine.buildDeckFromList(decklist);

    // Update local player's state with the new custom deck
    const localPlayerId = getLocalPlayerId();
    updatePlayerState(localPlayerId, {
      ...gameState[localPlayerId],
      deck: newPlayerDeck
    });

    // Send completion notification to opponent
    sendPhaseCompletion('deckSelection');

    // Check if both players are ready to proceed
    if (areBothPlayersReady('deckSelection')) {
      startPlacementPhase();
    }
    // If not ready, the waiting screen will be shown by the render logic
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
   * @param {Object} chosenDrone - The drone being selected
   */
  const handleChooseDroneForSelection = (chosenDrone) => {
    const newSelection = [...tempSelectedDrones, chosenDrone];
    if (newSelection.length >= 5) {
     handleConfirmDroneSelection(newSelection);
    } else {
     setTempSelectedDrones(newSelection);
      const newTrio = droneSelectionPool.slice(0, 3);
      const remaining = droneSelectionPool.slice(3);

     updateGameState({
       droneSelectionTrio: newTrio,
       droneSelectionPool: remaining
     });
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
   * Executes drone deployment using gameEngine logic.
   * Updates player state and handles deployment success/failure.
   * @param {string} lane - The lane to deploy the drone to
   */
  const executeDeployment = (lane) => {
    const result = gameEngine.executeDeployment(
      selectedDrone,
      lane,
      turn,
      gameState.player1,
      gameState.player2,
      getPlacedSectionsForEngine(),
      (logEntry) => addLogEntry(logEntry, 'executeDeployment')
    );

    if (result.success) {
      updatePlayerState(getLocalPlayerId(), result.newPlayerState);
      setSelectedDrone(null);
      endTurn(getLocalPlayerId());
    } else {
      setModalContent({ title: result.error, text: result.message, isBlocking: true });
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

    const validationResult = gameEngine.validateDeployment(localPlayerState, selectedDrone, turn, totalLocalPlayerDrones, localPlayerEffectiveStats);

    if (!validationResult.isValid) {
      setModalContent({ title: validationResult.reason, text: validationResult.message, isBlocking: true });
      return;
    }

    const { budgetCost, energyCost } = validationResult;

    if (turn === 1 && energyCost > 0) {
      setDeploymentConfirmation({ lane, budgetCost, energyCost });
    } else {
      executeDeployment(lane);
    }
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
  const handlePlayerPass = () => {
    if (passInfo[`${getLocalPlayerId()}Passed`]) return;
    addLogEntry({ player: localPlayerState.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during ${turnPhase} phase.` }, 'playerPass');

    const opponentPassKey = `${getOpponentPlayerId()}Passed`;
    const localPassKey = `${getLocalPlayerId()}Passed`;
    const wasFirstToPass = !passInfo[opponentPassKey];
    const newPassInfo = {
        ...passInfo,
        [localPassKey]: true,
        firstPasser: passInfo.firstPasser || (wasFirstToPass ? getLocalPlayerId() : null)
    };

    console.log('[PLAYER PASS DEBUG] Updating pass info:', newPassInfo);
    setPassInfo(newPassInfo);

    if (newPassInfo[getOpponentPlayerId() + 'Passed']) {
        if (turnPhase === 'deployment') endDeploymentPhase();
        if (turnPhase === 'action') endActionPhase();
    } else {
        endTurn(getLocalPlayerId());
    }
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
       newPlayerState.dronesOnBoard = gameEngine.updateAuras(newPlayerState, gameState.player2, getPlacedSectionsForEngine());

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
                    newOpponentPlayer.dronesOnBoard = gameEngine.updateAuras(newOpponentPlayer, gameState.player1, getPlacedSectionsForEngine());
                    updatePlayerState(getOpponentPlayerId(), newOpponentPlayer);
            }
           handleStartDeploymentPhase();
            return null;
        }
        return { ...prev, count: newCount };
    });
   setConfirmationModal(null);
  };


  /**
   * GET PHASE DISPLAY NAME
   * Returns human-readable name for game phases.
   * Used for UI display and debugging.
   * @param {string} phase - The game phase identifier
   * @returns {string} Human-readable phase name
   */
  const getPhaseDisplayName = (phase) => {
    const names = {
      preGame: "Pre-Game Setup",
      placement: "Placement Phase",
      droneSelection: "Drone Selection",
      initialDraw: "Draw Phase",
      optionalDiscard: "Discard Phase",
      allocateShields: "Shield Allocation",
      deployment: "Deployment Phase",
      action: "Action Phase",
      combatPending: "Combat Phase Pending",
      roundEnd: "Round Over"
    };
    return names[phase] || "Unknown Phase";
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
    const handleCloseAiReport = useCallback(() => {
        setAiActionReport(null);
        endTurn(getOpponentPlayerId());
    }, [endTurn]);

    const handleCloseAiCardReport = useCallback(() => {
        // The turn ends only if the card doesn't grant another action.
        if (aiCardPlayReport && !aiCardPlayReport.card.effect.goAgain) {
            endTurn(getOpponentPlayerId());
        } else if (aiCardPlayReport && aiCardPlayReport.card.effect.goAgain && !winner) {
             // If AI can go again and game hasn't ended, the AI's turn continues.
             setCurrentPlayer(getOpponentPlayerId());
             setModalContent({ title: "Opponent's Turn", text: "Your opponent takes another action!", isBlocking: false });
        }
        setAiCardPlayReport(null);
    }, [endTurn, aiCardPlayReport, winner]);

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
                      {turnPhase === 'placement' ? (
                        (() => {
                          const localPlacedSections = getLocalPlacedSections();
                          const localPlayerCompletedPlacement = localPlacedSections && localPlacedSections.length === 3 && localPlacedSections.every(section => section !== null);

                          if (isMultiplayer() && localPhaseCompletion.placement && !opponentPhaseCompletion.placement) {
                            const localSectionNames = localPlacedSections.map((section, index) => section ? section.name : 'Empty').join(', ');
                            return (
                              <WaitingForOpponentScreen
                                phase="placement"
                                localPlayerStatus={`Your ship layout: ${localSectionNames}`}
                              />
                            );
                          } else {
                            return (
                              <ShipPlacementScreen
                                unplaced={unplacedSections}
                                placed={localPlacedSections}
                                selected={selectedSectionForPlacement}
                                onSectionSelect={handleSelectSectionForPlacement}
                                onLaneSelect={handleLaneSelectForPlacement}
                                onConfirm={handleConfirmPlacement}
                                player={localPlayerState}
                              />
                            );
                          }
                        })()
                      ) : turnPhase === 'droneSelection' ? (
                        (() => {
                          const localPlayerHasSelectedDrones = localPlayerState.activeDronePool && localPlayerState.activeDronePool.length === 5;
                          const opponentPlayerHasSelectedDrones = opponentPlayerState.activeDronePool && opponentPlayerState.activeDronePool.length === 5;

                          if (isMultiplayer() && localPlayerHasSelectedDrones && !opponentPhaseCompletion.droneSelection) {
                            const localDroneNames = localPlayerState.activeDronePool.map(d => d.name).join(', ');
                            return (
                              <WaitingForOpponentScreen
                                phase="droneSelection"
                                localPlayerStatus={`You selected: ${localDroneNames}`}
                              />
                            );
                          } else {
                            return (
                              <DroneSelectionScreen
                                onChooseDrone={handleChooseDroneForSelection}
                                currentTrio={droneSelectionTrio}
                                selectedDrones={tempSelectedDrones}
                              />
                            );
                          }
                        })()
                ) : turnPhase === 'deckSelection' ? (
                  (() => {
                    const localPlayerHasDeck = localPlayerState.deck && localPlayerState.deck.length > 0;
                    const opponentPlayerHasDeck = opponentPlayerState.deck && opponentPlayerState.deck.length > 0;

                    console.log('Deck selection render check:', {
                      isMultiplayer: isMultiplayer(),
                      localPlayerHasDeck,
                      opponentPhaseCompletion_deckSelection: opponentPhaseCompletion.deckSelection,
                      turnPhase,
                      localPlayerDeckLength: localPlayerState.deck?.length
                    });

                    if (isMultiplayer() && localPlayerHasDeck && !opponentPhaseCompletion.deckSelection) {
                      return (
                        <WaitingForOpponentScreen
                          phase="deckSelection"
                          localPlayerStatus="You have selected your deck and are ready to begin."
                        />
                      );
                    } else {
                      return (
                        <div className="flex flex-col items-center justify-center h-full">
                          <h1 className="text-3xl font-orbitron font-bold text-white mb-2">Select Your Deck</h1>
                          <p className="text-gray-400 mb-8">Choose a pre-defined deck or build your own.</p>
                          <div className="flex flex-wrap justify-center gap-8">
                            <div
                              onClick={() => handleDeckChoice('standard')}
                              className="w-72 bg-gray-900 border-2 border-cyan-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-cyan-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20"
                            >
                              <h2 className="text-2xl font-orbitron font-bold text-cyan-400 mb-3">Use Standard Deck</h2>
                              <p className="font-exo text-gray-300 flex-grow">Play with the balanced, pre-built starter deck.</p>
                              <button className="mt-6 bg-cyan-600 text-white font-bold px-6 py-2 rounded-full hover:bg-cyan-700 transition-colors duration-200">
                                Select
                              </button>
                            </div>
                            <div
                              onClick={() => handleDeckChoice('custom')}
                              className="w-72 bg-gray-900 border-2 border-purple-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-purple-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
                            >
                              <h2 className="text-2xl font-orbitron font-bold text-purple-400 mb-3">Build Custom Deck</h2>
                              <p className="font-exo text-gray-300 flex-grow">Create your own deck from your card collection.</p>
                              <button className="mt-6 bg-purple-600 text-white font-bold px-6 py-2 rounded-full hover:bg-purple-700 transition-colors duration-200">
                                Select
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })()
                ) : turnPhase === 'deckBuilding' ? (
                  (() => {
                    const localPlayerHasDeck = localPlayerState.deck && localPlayerState.deck.length > 0;
                    const opponentPlayerHasDeck = opponentPlayerState.deck && opponentPlayerState.deck.length > 0;

                    if (isMultiplayer() && localPlayerHasDeck && !opponentPhaseCompletion.deckSelection) {
                      return (
                        <WaitingForOpponentScreen
                          phase="deckSelection"
                          localPlayerStatus="You have built your custom deck and are ready to begin."
                        />
                      );
                    } else {
                      return (
                        <DeckBuilder
                          selectedDrones={localPlayerState.activeDronePool}
                          fullCardCollection={fullCardCollection}
                          deck={deck}
                          onDeckChange={handleDeckChange}
                          onConfirmDeck={handleConfirmDeck}
                          onImportDeck={handleImportDeck}
                        />
                      );
                    }
                  })()
                ) : (
                  <div className="flex flex-col items-center w-full space-y-2">
                      <ShipSectionsDisplay player={opponentPlayerState} playerEffectiveStats={opponentPlayerEffectiveStats} isPlayer={false} placedSections={opponentPlacedSections} onTargetClick={handleTargetClick} isInteractive={false} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <DroneLanesDisplay player={opponentPlayerState} isPlayer={false} placedSections={opponentPlacedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <DroneLanesDisplay player={localPlayerState} isPlayer={true} placedSections={localPlacedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} selectedCard={selectedCard} validCardTargets={validCardTargets} />


                      <ShipSectionsDisplay player={localPlayerState} playerEffectiveStats={localPlayerEffectiveStats} isPlayer={true} placedSections={localPlacedSections} onSectionClick={handleShipSectionClick} onAbilityClick={handleShipAbilityClick} onTargetClick={handleTargetClick} isInteractive={turnPhase === 'allocateShields' || reallocationPhase} selectedCard={selectedCard} validCardTargets={validCardTargets} reallocationPhase={reallocationPhase} />
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
                                        ? handleOptionalDiscardClick
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
                          <button onClick={handleFinishOptionalDiscard} className={`mt-4 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20`}>
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
            setTurnPhase('droneSelection');

            // Initialize drone selection pools for multiplayer
            const initialPool = [...fullDroneCollection].sort(() => 0.5 - Math.random());
            const firstTrio = initialPool.slice(0, 3);
            const remaining = initialPool.slice(3);

            updateGameState({
              droneSelectionTrio: firstTrio,
              droneSelectionPool: remaining
            });
            setTempSelectedDrones([]);

            // Clear player decks for multiplayer deck selection
            const localPlayerId = getLocalPlayerId();
            const opponentPlayerId = getOpponentPlayerId();
            updatePlayerState(localPlayerId, {
              ...gameState[localPlayerId],
              deck: [],
              activeDronePool: []
            });
            updatePlayerState(opponentPlayerId, {
              ...gameState[opponentPlayerId],
              deck: [],
              activeDronePool: []
            });

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