// ========================================
// SINGLE PLAYER COMBAT INITIALIZER
// ========================================
// Initializes combat state for Exploring the Eremos mode
// Skips deck/drone selection phases, starts at roundInitialization
// GameFlowManager.processRoundInitialization() handles energy, draw, etc.

import { gameEngine } from '../gameLogic.js';
import { calculateEffectiveShipStats, calculateSectionBaseStats } from '../statsCalculator.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { getShipById, getDefaultShip } from '../../data/shipData.js';
import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import aiPersonalities from '../../data/aiData.js';
import aiPhaseProcessor from '../../managers/AIPhaseProcessor.js';
import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import { shipComponentsToPlacement } from '../../utils/deckExportUtils.js';
import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';
import { buildActiveDronePool as buildDronePoolFromSlots } from '../combat/slotDamageUtils.js';
import { initializeForCombat as initializeDroneAvailability } from '../availability/DroneAvailabilityManager.js';

/**
 * SinglePlayerCombatInitializer
 * Handles combat initialization for extraction mode encounters
 */
class SinglePlayerCombatInitializer {
  constructor() {
    if (SinglePlayerCombatInitializer.instance) {
      return SinglePlayerCombatInitializer.instance;
    }
    SinglePlayerCombatInitializer.instance = this;
  }

  /**
   * Initialize combat for a single-player encounter
   * @param {string} aiId - AI personality ID/name from threat table
   * @param {Object} currentRunState - Current run state from GameStateManager
   * @param {string|null} quickDeployId - Optional quick deploy ID for auto-deployment
   * @param {boolean} isBlockade - Whether this is a blockade encounter (triggers auto-extraction on victory)
   * @returns {boolean} Success status
   */
  async initiateCombat(aiId, currentRunState, quickDeployId = null, isBlockade = false) {
    // CRITICAL: Check abort flag - prevents combat from starting if run is being abandoned
    if (gameStateManager.get('runAbandoning')) {
      debugLog('SP_COMBAT', '🚫 ABORT: Combat init blocked - run is being abandoned', {
        runAbandoningFlag: true,
        hasCurrentRunState: !!currentRunState
      });
      return false;
    }

    // CRITICAL: Hard abort if run state is missing (except for boss combat which doesn't need mapData)
    if (!currentRunState || (!currentRunState.mapData && !currentRunState.isBossCombat)) {
      debugLog('SP_COMBAT', '🚫 ABORT: Combat init blocked - run state is null/invalid', {
        hasCurrentRunState: !!currentRunState,
        hasMapData: !!currentRunState?.mapData,
        isBossCombat: !!currentRunState?.isBossCombat
      });
      debugLog('SP_COMBAT', '[SP Combat] Attempted to initiate combat with null run state - aborting');
      return false;
    }

    debugLog('SP_COMBAT', '=== Initiating Single Player Combat ===');
    debugLog('SP_COMBAT', 'AI ID:', aiId);
    debugLog('SP_COMBAT', 'Quick Deploy ID:', quickDeployId);

    // Check for residual state from previous combat (potential bug source)
    const preExistingState = {
      appState: gameStateManager.get('appState'),
      turnPhase: gameStateManager.get('turnPhase'),
      gameActive: gameStateManager.get('gameActive'),
      gameStage: gameStateManager.get('gameStage'),
      roundNumber: gameStateManager.get('roundNumber'),
      hasPlayer1: !!gameStateManager.get('player1'),
      hasPlayer2: !!gameStateManager.get('player2'),
      player1DeckSize: gameStateManager.get('player1')?.deck?.length || 0,
      player2DeckSize: gameStateManager.get('player2')?.deck?.length || 0
    };
    debugLog('SP_COMBAT', 'Pre-existing game state (check for residual):', preExistingState);

    // Log pending state from run state for debugging consecutive combat issues
    debugLog('SP_COMBAT', '=== Pre-Combat State Verification ===', {
      pendingPOICombat: !!currentRunState?.pendingPOICombat,
      pendingSalvageLoot: !!currentRunState?.pendingSalvageLoot,
      pendingSalvageState: !!currentRunState?.pendingSalvageState,
      pendingPOICombatData: currentRunState?.pendingPOICombat
    });

    // Flag and cleanup residual state (e.g., from Force Win or unexpected exits)
    if (preExistingState.gameActive || preExistingState.turnPhase) {
      debugLog('SP_COMBAT', '⚠️ WARNING: Residual state detected - cleaning up before new combat');
      debugLog('SP_COMBAT', '  gameActive:', preExistingState.gameActive);
      debugLog('SP_COMBAT', '  turnPhase:', preExistingState.turnPhase);
      debugLog('SP_COMBAT', '  hasPlayer1:', preExistingState.hasPlayer1);
      debugLog('SP_COMBAT', '  hasPlayer2:', preExistingState.hasPlayer2);

      // Clean up residual state to prevent the new game from getting stuck
      gameStateManager.resetGameState();

      // Clear animation queue to prevent stale animations blocking new game
      // (e.g., old roundAnnouncement blocking new one via deduplication)
      if (gameStateManager.actionProcessor?.phaseAnimationQueue) {
        gameStateManager.actionProcessor.phaseAnimationQueue.clear();
        debugLog('SP_COMBAT', '✅ Animation queue cleared');
      }

      debugLog('SP_COMBAT', '✅ Residual state cleaned up');
    }

    debugLog('SP_COMBAT', 'Current Run State:', currentRunState);

    try {
      // 1. Get AI personality
      const aiPersonality = this.getAIPersonality(aiId);
      if (!aiPersonality) {
        debugLog('SP_COMBAT', '[SP Combat] AI personality not found:', aiId);
        return false;
      }
      debugLog('SP_COMBAT', 'Found AI:', aiPersonality.name);

      // 2. Get ship slot data from current run
      const shipSlotId = currentRunState?.shipSlotId;
      const shipSlots = gameStateManager.getState().singlePlayerShipSlots || [];
      const shipSlot = shipSlots.find(s => s.id === shipSlotId);

      if (!shipSlot) {
        debugLog('SP_COMBAT', '[SP Combat] Ship slot not found:', shipSlotId);
        // Fall back to default deck for testing
        debugLog('SP_COMBAT', 'Using fallback deck for testing');
      }

      // 3. Build player state
      const player1State = this.buildPlayerState(shipSlot, currentRunState);
      debugLog('SP_COMBAT', 'Built player1 state:', {
        name: player1State.name,
        deckSize: player1State.deck.length,
        dronePoolSize: player1State.activeDronePool.length
      });

      // 4. Build AI state
      const player2State = this.buildAIState(aiPersonality);
      debugLog('SP_COMBAT', 'Built player2 state:', {
        name: player2State.name,
        deckSize: player2State.deck.length,
        dronePoolSize: player2State.activeDronePool.length
      });

      // 5. Get ship placements
      // Build placedSections from runState.shipSections lane assignments
      // Array order: [0: left lane, 1: middle lane, 2: right lane]
      let placedSections = ['bridge', 'powerCell', 'droneControlHub']; // Default fallback
      if (currentRunState?.shipSections) {
        const laneToIndex = { 'l': 0, 'm': 1, 'r': 2 };
        const sectionsByLane = ['', '', ''];
        for (const [key, section] of Object.entries(currentRunState.shipSections)) {
          if (section.lane && laneToIndex[section.lane] !== undefined) {
            sectionsByLane[laneToIndex[section.lane]] = key;
          }
        }
        // Only use if all lanes are filled
        if (sectionsByLane.every(s => s)) {
          placedSections = sectionsByLane;
        }
      }
      const opponentPlacedSections = (aiPersonality.shipComponents && shipComponentsToPlacement(aiPersonality.shipComponents).length === 3)
        ? shipComponentsToPlacement(aiPersonality.shipComponents)
        : ['bridge', 'powerCell', 'droneControlHub'];

      // 6. Set initial resources to 0 - roundInitialization will calculate from ship stats
      // This ensures middle lane bonus and other stat modifiers are properly applied
      player1State.energy = 0;
      player1State.initialDeploymentBudget = 0;
      player1State.deploymentBudget = 0;

      player2State.energy = 0;
      player2State.initialDeploymentBudget = 0;
      player2State.deploymentBudget = 0;

      // 7. Create game state - start at roundInitialization for proper flow
      // GameFlowManager.processRoundInitialization() will handle energy, draw, etc.
      const gameSeed = Math.floor(Math.random() * 2147483647);

      const combatGameState = {
        // Application state
        appState: 'inGame',
        gameActive: true,
        gameMode: 'local', // Must be 'local' for AIPhaseProcessor to work
        gameSeed: gameSeed,

        // Game metadata - start at roundInitialization (handles energy, draw, drone readying)
        // Note: roundNumber starts at 0 so processRoundInitialization() will initialize it to 1
        turnPhase: 'roundInitialization',
        gameStage: 'roundLoop',
        roundNumber: 0,
        turn: 1,
        currentPlayer: 'player1', // Player goes first
        firstPlayerOfRound: 'player1',
        firstPasserOfPreviousRound: null,
        firstPlayerOverride: null,

        // Pass state
        passInfo: {
          firstPasser: null,
          player1Passed: false,
          player2Passed: false
        },

        // Player states
        player1: player1State,
        player2: player2State,

        // Ship placement
        placedSections: placedSections,
        opponentPlacedSections: opponentPlacedSections,
        unplacedSections: [],

        // Shields (none in round 1)
        shieldsToAllocate: 0,
        opponentShieldsToAllocate: 0,

        // Other state
        winner: null,
        gameLog: [{
          type: 'system',
          message: `Combat initiated: ${aiPersonality.name}`,
          timestamp: Date.now(),
          round: 1
        }],

        // Drone selection (pre-populated)
        droneSelectionPool: [],
        droneSelectionTrio: [],

        // Commitments - mark deck/drone selection as complete
        commitments: {
          deckSelection: {
            player1: {
              completed: true,
              deck: player1State.deck,
              drones: player1State.activeDronePool,
              timestamp: Date.now()
            },
            player2: {
              completed: true,
              deck: player2State.deck,
              drones: player2State.activeDronePool,
              timestamp: Date.now()
            }
          },
          droneSelection: {
            player1: {
              completed: true,
              drones: player1State.activeDronePool,
              timestamp: Date.now()
            },
            player2: {
              completed: true,
              drones: player2State.activeDronePool,
              timestamp: Date.now()
            }
          },
          placement: {
            player1: {
              completed: true,
              placedSections: placedSections,
              timestamp: Date.now()
            },
            player2: {
              completed: true,
              placedSections: opponentPlacedSections,
              timestamp: Date.now()
            }
          }
        },

        // Store encounter info for outcome processing
        singlePlayerEncounter: {
          aiId: aiId,
          aiName: aiPersonality.name,
          aiDifficulty: aiPersonality.difficulty,  // For AI Cores drop chance calculation
          startingHull: currentRunState?.currentHull || 30,
          isBlockade: isBlockade  // For auto-extraction after blockade victory
        },

        // Quick deploy ID (if selected at POI encounter modal)
        pendingQuickDeploy: quickDeployId || currentRunState?.pendingQuickDeploy || null
      };

      // Update TacticalMapStateManager with isBlockadeCombat flag for fallback detection
      // This survives if singlePlayerEncounter is cleared before CombatOutcomeProcessor reads it
      if (isBlockade && tacticalMapStateManager.isRunActive()) {
        tacticalMapStateManager.setState({
          isBlockadeCombat: true  // Fallback flag for blockade detection
        });
      }

      // 8. Apply state to GameStateManager
      debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> inGame ===', {
        trigger: 'async_event',
        source: 'SinglePlayerCombatInitializer.initiateCombat',
        detail: 'Combat state fully initialized, transitioning to inGame',
        aiId,
        isBlockade,
        hasQuickDeploy: !!quickDeployId
      });
      gameStateManager.setState(combatGameState, 'SP_COMBAT_INITIALIZED');

      // DIAGNOSTIC: Verify state was set correctly
      const verifyState = gameStateManager.getState();
      debugLog('EXTRACTION', '✅ State verification after setState:', {
        player1DeckSize: verifyState.player1?.deck?.length || 0,
        player1HandSize: verifyState.player1?.hand?.length || 0,
        player2DeckSize: verifyState.player2?.deck?.length || 0,
        player2HandSize: verifyState.player2?.hand?.length || 0,
        turnPhase: verifyState.turnPhase,
        gameStage: verifyState.gameStage
      });

      // 9. Queue ROUND 1 announcement for UI display
      const actionProcessor = gameStateManager.actionProcessor;
      if (actionProcessor?.phaseAnimationQueue) {
        // DIAGNOSTIC: Track SP_INIT round announcement
        debugLog('PHASE_FLOW', '📢 SP_INIT queuing ROUND 1 announcement');
        actionProcessor.phaseAnimationQueue.queueAnimation('roundAnnouncement', 'ROUND', null);
        debugLog('SP_COMBAT', 'Queued ROUND 1 announcement for display');
      }

      // 10. Initialize AIPhaseProcessor
      const ap = gameStateManager.actionProcessor;
      aiPhaseProcessor.initialize(
        aiPersonalities,
        fullDroneCollection,
        aiPersonality,
        ap,
        gameStateManager,
        { isAnimationBlocking: () => ap?.phaseAnimationQueue?.isPlaying() || ap?.animationManager?.isBlocking }
      );
      debugLog('SP_COMBAT', 'AIPhaseProcessor initialized with:', aiPersonality.name);

      // 11. Give ActionProcessor reference to AIPhaseProcessor
      if (gameStateManager.actionProcessor) {
        gameStateManager.actionProcessor.setAIPhaseProcessor(aiPhaseProcessor);
      }

      // 12. Explicitly trigger roundInitialization processing
      // GameFlowManager handles: energy calculation, card draw, drone readying, first player
      const gameFlowManager = gameStateManager.gameFlowManager;
      if (gameFlowManager) {
        debugLog('SP_COMBAT', 'Triggering processRoundInitialization via GameFlowManager');
        const nextPhase = await gameFlowManager.processRoundInitialization('placement');
        debugLog('SP_COMBAT', 'processRoundInitialization completed, next phase:', nextPhase);

        // CRITICAL: Must transition to the returned phase (typically 'deployment')
        if (nextPhase) {
          debugLog('SP_COMBAT', 'Transitioning to phase:', nextPhase);
          await gameFlowManager.transitionToPhase(nextPhase);
          debugLog('SP_COMBAT', 'Phase transition complete');
        }
      } else {
        debugLog('SP_COMBAT', '[SP Combat] GameFlowManager not available - round initialization skipped');
      }

      debugLog('SP_COMBAT', '=== Combat Initialized Successfully ===');

      return true;
    } catch (error) {
      debugLog('SP_COMBAT', '[SP Combat] Error initializing combat:', error);
      return false;
    }
  }

  /**
   * Initialize combat for a boss encounter
   * Boss fights bypass tactical map and go straight to combat
   * @param {string} bossId - Boss ID from aiData (e.g., 'BOSS_T1_NEMESIS')
   * @param {number} shipSlotId - Player's ship slot ID to use
   * @returns {boolean} Success status
   */
  async initiateBossCombat(bossId, shipSlotId) {
    debugLog('SP_COMBAT', '=== Initiating Boss Combat ===');
    debugLog('SP_COMBAT', 'Boss ID:', bossId);
    debugLog('SP_COMBAT', 'Ship Slot ID:', shipSlotId);

    try {
      // 1. Get boss AI by bossId
      const bossAI = this.getBossAIByBossId(bossId);
      if (!bossAI) {
        debugLog('SP_COMBAT', '[Boss Combat] Boss AI not found:', bossId);
        return false;
      }
      debugLog('SP_COMBAT', 'Found Boss AI:', bossAI.name);

      // 2. Increment boss attempts in profile
      const currentState = gameStateManager.getState();
      const profile = currentState.singlePlayerProfile || {};
      const bossProgress = profile.bossProgress || { defeatedBosses: [], totalBossVictories: 0, totalBossAttempts: 0 };

      gameStateManager.setState({
        singlePlayerProfile: {
          ...profile,
          bossProgress: {
            ...bossProgress,
            totalBossAttempts: bossProgress.totalBossAttempts + 1
          }
        }
      });

      // 3. Get ship slot and build ship sections from sectionSlots
      const shipSlots = currentState.singlePlayerShipSlots || [];
      const shipSlot = shipSlots.find(s => s.id === shipSlotId);

      // Build shipSections from ship slot's sectionSlots configuration
      let shipSections = {};
      if (shipSlot?.sectionSlots) {
        const shipCard = getShipById(shipSlot.shipId) || getDefaultShip();

        for (const [lane, slotData] of Object.entries(shipSlot.sectionSlots)) {
          if (slotData?.componentId) {
            const component = shipComponentCollection.find(c => c.id === slotData.componentId);
            if (component) {
              const baseStats = calculateSectionBaseStats(shipCard, component);
              // Use component.key as the section key (bridge, powerCell, droneControlHub)
              shipSections[component.key] = {
                ...JSON.parse(JSON.stringify(component)),
                id: component.id,
                hull: baseStats.maxHull - (slotData.damageDealt || 0),
                maxHull: baseStats.maxHull,
                shields: baseStats.shields ?? 0,
                allocatedShields: baseStats.allocatedShields ?? 0,
                thresholds: baseStats.thresholds,
                lane: lane  // Preserve lane assignment from sectionSlots key
              };
            }
          }
        }
        debugLog('SP_COMBAT', 'Built ship sections from sectionSlots:', {
          bridge: shipSections.bridge?.name,
          powerCell: shipSections.powerCell?.name,
          droneControlHub: shipSections.droneControlHub?.name
        });
      }

      // 4. Create run state for boss combat with ship sections
      const bossRunState = {
        shipSlotId: shipSlotId,
        isBossCombat: true,
        bossId: bossId,
        shipSections: shipSections
      };

      // 5. Use existing initiateCombat but with boss-specific flags
      // We call initiateCombat internally with the boss AI name
      const result = await this.initiateCombat(bossAI.name, bossRunState, null, false);

      // 6. After initiateCombat, update the singlePlayerEncounter with boss flags
      if (result) {
        const state = gameStateManager.getState();
        gameStateManager.setState({
          singlePlayerEncounter: {
            ...state.singlePlayerEncounter,
            isBossCombat: true,
            bossId: bossId
          }
        });
      }

      return result;
    } catch (error) {
      debugLog('SP_COMBAT', '[Boss Combat] Error initiating boss combat:', error);
      return false;
    }
  }

  /**
   * Get boss AI by bossId field
   * @param {string} bossId - Boss ID (e.g., 'BOSS_T1_NEMESIS')
   * @returns {Object|null} Boss AI personality or null if not found
   */
  getBossAIByBossId(bossId) {
    return aiPersonalities.find(ai => ai.bossId === bossId) || null;
  }

  /**
   * Get AI personality by ID or name
   * @param {string} aiId - AI ID or name
   * @returns {Object|null} AI personality or null if not found
   */
  getAIPersonality(aiId) {
    // Try to find by exact name first
    let ai = aiPersonalities.find(p => p.name === aiId);

    // If not found, try to find extraction mode AIs by partial match
    if (!ai) {
      ai = aiPersonalities.find(p =>
        p.modes?.includes('extraction') &&
        (p.name.toLowerCase().includes(aiId.toLowerCase()) ||
         aiId.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()))
      );
    }

    // Fall back to first extraction mode AI if not found
    if (!ai) {
      ai = aiPersonalities.find(p => p.modes?.includes('extraction'));
      if (ai) {
        debugLog('SP_COMBAT', `AI "${aiId}" not found, falling back to:`, ai.name);
      }
    }

    return ai;
  }

  /**
   * Build player state from ship slot data
   * @param {Object} shipSlot - Ship slot configuration (may be null for testing)
   * @param {Object} runState - Current run state
   * @returns {Object} Player state object
   */
  buildPlayerState(shipSlot, runState) {
    // Get ship card from slot or use default
    const shipCard = getShipById(shipSlot?.shipId) || getDefaultShip();
    debugLog('SP_COMBAT', 'Using ship card:', shipCard.id, shipCard.name);

    // Create ship sections from run state (has custom component data) or fall back to defaults
    const shipSections = {};

    if (runState?.shipSections && Object.keys(runState.shipSections).length > 0) {
      // Use ship sections from runState - they have the correct custom component data
      for (const key in runState.shipSections) {
        const savedSection = runState.shipSections[key];
        // Look up the actual component to get full data (abilities, stats, etc.)
        const component = savedSection.id
          ? shipComponentCollection.find(c => c.id === savedSection.id)
          : null;
        const baseStats = component
          ? calculateSectionBaseStats(shipCard, component)
          : calculateSectionBaseStats(shipCard, savedSection);

        shipSections[key] = {
          ...(component ? JSON.parse(JSON.stringify(component)) : JSON.parse(JSON.stringify(savedSection))),
          id: savedSection.id,
          hull: savedSection.hull,
          maxHull: baseStats.maxHull,
          shields: baseStats.shields ?? 0,
          allocatedShields: baseStats.allocatedShields ?? 0,
          thresholds: savedSection.thresholds || baseStats.thresholds,
          lane: savedSection.lane
        };
      }
      debugLog('SP_COMBAT', 'Using custom ship sections from run state:', {
        bridge: shipSections.bridge?.name,
        powerCell: shipSections.powerCell?.name,
        droneControlHub: shipSections.droneControlHub?.name
      });
    } else {
      // Fall back to default sections
      const defaultSectionKeys = ['bridge', 'powerCell', 'droneControlHub'];
      for (const key of defaultSectionKeys) {
        const sectionTemplate = shipComponentCollection.find(c => c.key === key);
        if (sectionTemplate) {
          const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
          shipSections[key] = {
            ...JSON.parse(JSON.stringify(sectionTemplate)),
            hull: baseStats.hull,
            maxHull: baseStats.maxHull,
            shields: baseStats.shields,
            allocatedShields: baseStats.allocatedShields,
            thresholds: baseStats.thresholds
          };
        }
      }
      debugLog('SP_COMBAT', 'Using default ship sections');
    }

    // Build deck from ship slot decklist or use default
    let deck = [];
    const decklist = shipSlot?.decklist || this.getDefaultDecklist();

    let instanceCounter = 0;

    // Handle both formats:
    // - Array format from ship slot: [{id: 'CARD001', quantity: 4}, ...]
    // - Object format from default: {'CARD001': 4, ...}
    if (Array.isArray(decklist)) {
      // Array format (ship slot storage)
      decklist.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          const cardTemplate = fullCardCollection.find(c => c.id === item.id);
          if (cardTemplate) {
            deck.push(gameEngine.createCard(cardTemplate, `sp-card-${crypto.randomUUID()}`));
          }
        }
      });
    } else {
      // Object format (default decklist)
      Object.entries(decklist).forEach(([cardId, quantity]) => {
        for (let i = 0; i < quantity; i++) {
          const cardTemplate = fullCardCollection.find(c => c.id === cardId);
          if (cardTemplate) {
            deck.push(gameEngine.createCard(cardTemplate, `sp-card-${crypto.randomUUID()}`));
          }
        }
      });
    }

    // DIAGNOSTIC: Log deck creation result
    debugLog('EXTRACTION', `🃏 Deck created with ${deck.length} cards:`,
      deck.slice(0, 5).map(c => c?.name || 'UNDEFINED'));

    // If deck is empty, log what went wrong
    if (deck.length === 0) {
      debugLog('EXTRACTION', '❌ DECK IS EMPTY! Checking decklist:', decklist);
      debugLog('EXTRACTION', '❌ fullCardCollection has', fullCardCollection?.length || 0, 'cards');
      // Log first few card IDs to verify format
      const decklistKeys = Object.keys(decklist);
      debugLog('EXTRACTION', '❌ Decklist card IDs:', decklistKeys.slice(0, 5));
      // Log first few cards from collection to verify IDs
      debugLog('EXTRACTION', '❌ Collection card IDs:', fullCardCollection?.slice(0, 5).map(c => c.id) || []);
    }

    // Shuffle deck using seeded RNG for determinism
    const rng = new SeededRandom(Date.now());
    deck = rng.shuffle(deck);

    // Build drone pool from ship slot's droneSlots (new slot-based format)
    // or fall back to legacy activeDronePool or default
    let activeDronePool = [];

    if (shipSlot?.droneSlots) {
      // New slot-based format: droneSlots array with { assignedDrone, slotDamaged }
      // Uses utility that handles both old and new field names
      activeDronePool = buildDronePoolFromSlots(shipSlot);

      // Log damaged drones for debugging
      activeDronePool.forEach(drone => {
        if (drone.slotDamaged) {
          debugLog('SP_COMBAT', `Drone ${drone.name} in damaged slot: limit ${drone.limit} -> ${drone.effectiveLimit}`);
        }
      });
    } else if (shipSlot?.activeDronePool) {
      // Legacy format fallback
      const droneNames = shipSlot.activeDronePool;
      const shipSlotId = runState?.shipSlotId;
      const droneDamageState = shipSlotId !== undefined
        ? gameStateManager.getDroneDamageStateForSlot(shipSlotId)
        : {};

      activeDronePool = droneNames.map(name => {
        const droneData = fullDroneCollection.find(d => d.name === name);
        const drone = droneData ? { ...droneData } : { name };

        if (droneDamageState[name]) {
          drone.isDamaged = true;
        }
        drone.effectiveLimit = drone.limit;

        return drone;
      }).filter(d => d);
    } else {
      // Use default drone pool
      const defaultDrones = this.getDefaultDronePool();
      activeDronePool = defaultDrones.map(name => {
        const droneData = fullDroneCollection.find(d => d.name === name);
        const drone = droneData ? { ...droneData } : { name };
        drone.effectiveLimit = drone.limit;
        return drone;
      }).filter(d => d);
    }

    // Initialize drone availability system (all copies start ready)
    const appliedUpgrades = {}; // TODO: Load from ship slot if upgrades are supported
    const droneAvailability = initializeDroneAvailability(activeDronePool, appliedUpgrades);
    debugLog('SP_COMBAT', 'Initialized drone availability:', Object.keys(droneAvailability));

    return {
      name: 'Player',
      shipId: shipCard.id,
      shipSections: shipSections,
      energy: 0,
      initialDeploymentBudget: 10,
      deploymentBudget: 0,
      hand: [],
      deck: deck,
      discardPile: [],
      activeDronePool: activeDronePool,
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      deployedDroneCounts: {},
      totalDronesDeployed: 0,
      appliedUpgrades: appliedUpgrades,
      droneAvailability: droneAvailability
    };
  }

  /**
   * Build AI state from personality
   * @param {Object} aiPersonality - AI personality from aiData
   * @returns {Object} AI player state object
   */
  buildAIState(aiPersonality) {
    // Get ship card from AI personality or use default
    const shipCard = getShipById(aiPersonality.shipId) || getDefaultShip();
    debugLog('SP_COMBAT', 'AI using ship card:', shipCard.id, shipCard.name);

    // Create ship sections using default components and ship card system
    const shipSections = {};
    const defaultSectionKeys = ['bridge', 'powerCell', 'droneControlHub'];
    for (const key of defaultSectionKeys) {
      const sectionTemplate = shipComponentCollection.find(c => c.key === key);
      if (sectionTemplate) {
        // Calculate base stats from ship card + section modifiers
        const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
        shipSections[key] = {
          ...JSON.parse(JSON.stringify(sectionTemplate)),
          hull: baseStats.hull,
          maxHull: baseStats.maxHull,
          shields: baseStats.shields,
          allocatedShields: baseStats.allocatedShields,
          thresholds: baseStats.thresholds
        };
      }
    }

    // Build deck from AI decklist
    let deck = [];
    let instanceCounter = 0;

    if (aiPersonality.decklist) {
      aiPersonality.decklist.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          const cardTemplate = fullCardCollection.find(c => c.id === item.id);
          if (cardTemplate) {
            deck.push(gameEngine.createCard(cardTemplate, `ai-card-${crypto.randomUUID()}`));
          }
        }
      });
    }

    // Shuffle deck using seeded RNG for determinism
    const rng = new SeededRandom(Date.now() + 1); // Offset to get different sequence from player
    deck = rng.shuffle(deck);

    // Get drone pool from AI
    const activeDronePool = (aiPersonality.dronePool || []).map(name => {
      const droneData = fullDroneCollection.find(d => d.name === name);
      return droneData || { name };
    }).filter(d => d);

    // Initialize drone availability system for AI (all copies start ready)
    const droneAvailability = initializeDroneAvailability(activeDronePool, {});
    debugLog('SP_COMBAT', 'Initialized AI drone availability:', Object.keys(droneAvailability));

    return {
      name: aiPersonality.name,
      shipId: shipCard.id,
      shipSections: shipSections,
      energy: 0,
      initialDeploymentBudget: 10,
      deploymentBudget: 0,
      hand: [],
      deck: deck,
      discardPile: [],
      activeDronePool: activeDronePool,
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      deployedDroneCounts: {},
      totalDronesDeployed: 0,
      appliedUpgrades: {},
      droneAvailability: droneAvailability,
      aiPersonality: aiPersonality // Store reference for AI decision making
    };
  }

  /**
   * Get default decklist for testing/fallback
   * @returns {Object} Decklist object { cardId: quantity }
   */
  getDefaultDecklist() {
    return {
      'CARD001': 4,   // Laser Blast
      'CARD002': 4,   // System Reboot
      'CARD003': 4,   // Out Think
      'CARD004': 4,   // Energy Surge
      'CARD005': 4,   // Adrenaline Rush
      'CARD006': 2,   // Nanobot Repair
      'CARD007': 4,   // Emergency Patch
      'CARD008': 4,   // Shield Recharge
      'CARD009': 2,   // Target Lock
      'CARD012': 2,   // Armor-Piercing Shot
      'CARD015': 2,   // Streamline
      'CARD016': 4,   // Static Field
    };
  }

  /**
   * Get default drone pool for testing/fallback
   * @returns {Array} Array of drone names
   */
  getDefaultDronePool() {
    return [
      'Dart',
      'Talon',
      'Mammoth',
      'Bastion',
      'Harrier'
    ];
  }
}

// Export singleton
export default new SinglePlayerCombatInitializer();
