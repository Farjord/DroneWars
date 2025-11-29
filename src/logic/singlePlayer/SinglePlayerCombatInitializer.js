// ========================================
// SINGLE PLAYER COMBAT INITIALIZER
// ========================================
// Initializes combat state for Exploring the Eremos mode
// Skips deck/drone selection phases, starts at roundInitialization
// GameFlowManager.processRoundInitialization() handles energy, draw, etc.

import { gameEngine } from '../gameLogic.js';
import { calculateEffectiveShipStats, calculateSectionBaseStats } from '../statsCalculator.js';
import shipSectionData from '../../data/shipSectionData.js';
import { getShipById, getDefaultShip } from '../../data/shipData.js';
import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import aiPersonalities from '../../data/aiData.js';
import aiPhaseProcessor from '../../managers/AIPhaseProcessor.js';
import gameStateManager from '../../managers/GameStateManager.js';
import { debugLog } from '../../utils/debugLogger.js';

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
   * @returns {boolean} Success status
   */
  async initiateCombat(aiId, currentRunState, quickDeployId = null) {
    debugLog('SP_COMBAT', '=== Initiating Single Player Combat ===');
    debugLog('SP_COMBAT', 'AI ID:', aiId);
    debugLog('SP_COMBAT', 'Quick Deploy ID:', quickDeployId);
    debugLog('SP_COMBAT', 'Current Run State:', currentRunState);

    try {
      // 1. Get AI personality
      const aiPersonality = this.getAIPersonality(aiId);
      if (!aiPersonality) {
        console.error('[SP Combat] AI personality not found:', aiId);
        return false;
      }
      debugLog('SP_COMBAT', 'Found AI:', aiPersonality.name);

      // 2. Get ship slot data from current run
      const shipSlotId = currentRunState?.shipSlotId;
      const shipSlots = gameStateManager.getState().singlePlayerShipSlots || [];
      const shipSlot = shipSlots.find(s => s.id === shipSlotId);

      if (!shipSlot) {
        console.error('[SP Combat] Ship slot not found:', shipSlotId);
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
      const placedSections = shipSlot?.shipPlacement || ['bridge', 'powerCell', 'droneControlHub'];
      const opponentPlacedSections = aiPersonality.shipDeployment?.placement || ['bridge', 'powerCell', 'droneControlHub'];

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
          startingHull: currentRunState?.currentHull || 30
        },

        // Quick deploy ID (if selected at POI encounter modal)
        pendingQuickDeploy: quickDeployId || currentRunState?.pendingQuickDeploy || null
      };

      // 8. Apply state to GameStateManager
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
      aiPhaseProcessor.initialize(
        aiPersonalities,
        fullDroneCollection,
        aiPersonality,
        gameStateManager.actionProcessor,
        gameStateManager
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
        console.warn('[SP Combat] GameFlowManager not available - round initialization skipped');
      }

      debugLog('SP_COMBAT', '=== Combat Initialized Successfully ===');

      return true;
    } catch (error) {
      console.error('[SP Combat] Error initializing combat:', error);
      return false;
    }
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

    // Create ship sections using ship card system
    const shipSections = {};
    for (const key in shipSectionData) {
      const sectionTemplate = shipSectionData[key];
      if (sectionTemplate) {
        // Calculate base stats from ship card + section modifiers
        const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);

        // Preserve hull damage from run state if available
        const savedHull = runState?.shipSections?.[key]?.hull;

        shipSections[key] = {
          ...JSON.parse(JSON.stringify(sectionTemplate)),
          hull: savedHull ?? baseStats.hull,
          maxHull: baseStats.maxHull,
          shields: baseStats.shields,
          allocatedShields: baseStats.allocatedShields,
          thresholds: baseStats.thresholds
        };
      }
    }

    if (runState?.shipSections) {
      debugLog('SP_COMBAT', 'Loaded hull from run state:', {
        bridge: shipSections.bridge?.hull,
        powerCell: shipSections.powerCell?.hull,
        droneControlHub: shipSections.droneControlHub?.hull
      });
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
            deck.push(gameEngine.createCard(cardTemplate, `sp-card-${Date.now()}-${instanceCounter++}`));
          }
        }
      });
    } else {
      // Object format (default decklist)
      Object.entries(decklist).forEach(([cardId, quantity]) => {
        for (let i = 0; i < quantity; i++) {
          const cardTemplate = fullCardCollection.find(c => c.id === cardId);
          if (cardTemplate) {
            deck.push(gameEngine.createCard(cardTemplate, `sp-card-${Date.now()}-${instanceCounter++}`));
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

    // Shuffle deck
    deck = deck.sort(() => 0.5 - Math.random());

    // Get drone pool from ship slot or use default
    const droneNames = shipSlot?.activeDronePool || this.getDefaultDronePool();
    const activeDronePool = droneNames.map(name => {
      const droneData = fullDroneCollection.find(d => d.name === name);
      return droneData || { name };
    }).filter(d => d);

    return {
      name: 'Player',
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
      appliedUpgrades: {}
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

    // Create ship sections using ship card system
    const shipSections = {};
    for (const key in shipSectionData) {
      const sectionTemplate = shipSectionData[key];
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
            deck.push(gameEngine.createCard(cardTemplate, `ai-card-${Date.now()}-${instanceCounter++}`));
          }
        }
      });
    }

    // Shuffle deck
    deck = deck.sort(() => 0.5 - Math.random());

    // Get drone pool from AI
    const activeDronePool = (aiPersonality.dronePool || []).map(name => {
      const droneData = fullDroneCollection.find(d => d.name === name);
      return droneData || { name };
    }).filter(d => d);

    return {
      name: aiPersonality.name,
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
      'Scout Drone',
      'Standard Fighter',
      'Heavy Fighter',
      'Guardian Drone',
      'Interceptor'
    ];
  }
}

// Export singleton
export default new SinglePlayerCombatInitializer();
