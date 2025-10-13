// ========================================
// TEST GAME INITIALIZER
// ========================================
// Service for initializing game state directly for testing purposes
// Bypasses normal game flow and allows direct setup of game scenarios

import { gameEngine } from '../logic/gameLogic.js';
import { calculateEffectiveShipStats } from '../logic/statsCalculator.js';
import shipSectionData from '../data/shipData.js';
import fullCardCollection from '../data/cardData.js';
import fullDroneCollection from '../data/droneData.js';
import aiPersonalities from '../data/aiData.js';
import aiPhaseProcessor from '../state/AIPhaseProcessor.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * Initialize a drone instance for placement in a lane
 * Adds all runtime properties required for combat and damage tracking
 * @param {Object} droneTemplate - Base drone template from drone pool
 * @returns {Object} Fully initialized drone instance ready for lane placement
 */
function initializeDroneForLane(droneTemplate) {
  return {
    ...droneTemplate,
    id: `test-drone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    currentShields: droneTemplate.shields,
    currentMaxShields: droneTemplate.shields,
    hull: droneTemplate.hull,
    isExhausted: false,
    statMods: []
  };
}

/**
 * Apply passive abilities to initialized drones
 * Calculates effective shields based on passive abilities from other drones in the same lane
 * (e.g., Aegis Drone's Shield Harmonizer gives +1 max shields to other friendly drones)
 * @param {Object} dronesOnBoard - Initialized drones on board { lane1: [], lane2: [], lane3: [] }
 * @returns {Object} Updated drones on board with passive abilities applied
 */
function applyPassiveAbilitiesToInitializedDrones(dronesOnBoard) {
  const updatedDronesOnBoard = {
    lane1: [...dronesOnBoard.lane1],
    lane2: [...dronesOnBoard.lane2],
    lane3: [...dronesOnBoard.lane3]
  };

  // Process each lane
  Object.keys(updatedDronesOnBoard).forEach(laneKey => {
    const lane = updatedDronesOnBoard[laneKey];

    // For each drone in the lane
    lane.forEach((drone, droneIndex) => {
      let shieldBonus = 0;

      // Check OTHER drones in the same lane for passive abilities
      lane.forEach((otherDrone, otherIndex) => {
        if (droneIndex === otherIndex) return; // Skip self

        // Find the base drone data to get abilities
        const otherBaseDrone = fullDroneCollection.find(d => d.name === otherDrone.name);
        if (!otherBaseDrone || !otherBaseDrone.abilities) return;

        // Check for FRIENDLY_IN_LANE MODIFY_STAT passive abilities
        otherBaseDrone.abilities.forEach(ability => {
          if (
            ability.type === 'PASSIVE' &&
            ability.scope === 'FRIENDLY_IN_LANE' &&
            ability.effect.type === 'MODIFY_STAT' &&
            ability.effect.stat === 'shields'
          ) {
            shieldBonus += ability.effect.value;
          }
        });
      });

      // Apply shield bonus if any
      if (shieldBonus > 0) {
        const baseShields = drone.currentMaxShields;
        const effectiveMaxShields = baseShields + shieldBonus;

        // Update drone with effective shields (full health)
        drone.currentMaxShields = effectiveMaxShields;
        drone.currentShields = effectiveMaxShields;

        debugLog('TESTING', `🛡️ Applied passive shield bonus to ${drone.name} in ${laneKey}: ${baseShields} → ${effectiveMaxShields} (bonus: +${shieldBonus})`);
      }
    });
  });

  return updatedDronesOnBoard;
}

/**
 * Initialize a test game with custom configuration
 * @param {Object} config - Test game configuration
 * @param {Object} gameStateManager - GameStateManager instance
 * @returns {boolean} Success status
 */
export function initializeTestGame(config, gameStateManager) {
  debugLog('TESTING', '🧪 TEST MODE: Initializing test game with config:', config);

  // Validate configuration
  const validation = validateTestConfig(config);
  if (!validation.valid) {
    console.error('❌ TEST MODE: Invalid configuration:', validation.errors);
    alert(`Test configuration invalid:\n${validation.errors.join('\n')}`);
    return false;
  }

  try {
    // Build placement data first (needed for stats calculation)
    const placedSections = config.player1.shipSections || ['bridge', 'powerCell', 'droneControlHub'];
    const opponentPlacedSections = config.player2.shipSections || ['bridge', 'powerCell', 'droneControlHub'];
    const roundNumber = config.roundNumber || 1;

    // Calculate resource values based on round number
    // Round 1: Use config overrides or defaults (for testing flexibility)
    // Round 2+: Calculate from ship stats (match normal gameplay)
    let player1Resources, player2Resources;
    let shieldsToAllocate = 0;
    let opponentShieldsToAllocate = 0;

    if (roundNumber === 1) {
      // Round 1: Use config values or defaults
      player1Resources = {
        energy: config.player1.energy ?? 10,
        initialDeploymentBudget: config.player1.initialDeploymentBudget ?? 10,
        deploymentBudget: 0
      };
      player2Resources = {
        energy: config.player2.energy ?? 10,
        initialDeploymentBudget: config.player2.initialDeploymentBudget ?? 10,
        deploymentBudget: 0
      };
      // No shields in round 1
      shieldsToAllocate = 0;
      opponentShieldsToAllocate = 0;
    } else {
      // Round 2+: Calculate from ship stats
      // Create temporary player states with just ship sections for stats calculation
      const tempPlayer1 = {
        shipSections: {
          bridge: JSON.parse(JSON.stringify(shipSectionData.bridge)),
          powerCell: JSON.parse(JSON.stringify(shipSectionData.powerCell)),
          droneControlHub: JSON.parse(JSON.stringify(shipSectionData.droneControlHub))
        }
      };
      const tempPlayer2 = {
        shipSections: {
          bridge: JSON.parse(JSON.stringify(shipSectionData.bridge)),
          powerCell: JSON.parse(JSON.stringify(shipSectionData.powerCell)),
          droneControlHub: JSON.parse(JSON.stringify(shipSectionData.droneControlHub))
        }
      };

      const player1EffectiveStats = calculateEffectiveShipStats(tempPlayer1, placedSections);
      const player2EffectiveStats = calculateEffectiveShipStats(tempPlayer2, opponentPlacedSections);

      player1Resources = {
        energy: player1EffectiveStats.totals.energyPerTurn,
        initialDeploymentBudget: 0,
        deploymentBudget: player1EffectiveStats.totals.deploymentBudget
      };
      player2Resources = {
        energy: player2EffectiveStats.totals.energyPerTurn,
        initialDeploymentBudget: 0,
        deploymentBudget: player2EffectiveStats.totals.deploymentBudget
      };

      // Calculate shields for round 2+
      shieldsToAllocate = player1EffectiveStats.totals.shieldsPerTurn;
      opponentShieldsToAllocate = player2EffectiveStats.totals.shieldsPerTurn;

      debugLog('TESTING', `🔧 Round ${roundNumber}: Calculated resources from ship stats`);
      debugLog('TESTING', `  Player 1: ${player1Resources.energy} energy, ${player1Resources.deploymentBudget} deployment, ${shieldsToAllocate} shields`);
      debugLog('TESTING', `  Player 2: ${player2Resources.energy} energy, ${player2Resources.deploymentBudget} deployment, ${opponentShieldsToAllocate} shields`);
    }

    // Create player states from configuration with calculated resources
    const player1State = createPlayerStateFromConfig(config.player1, 'Player 1', player1Resources);
    const player2State = createPlayerStateFromConfig(config.player2, 'Player 2', player2Resources);

    // Create complete game state
    const testGameState = {
      // Application state
      appState: 'inGame',
      gameActive: true,
      gameMode: 'local', // Always local for testing
      testMode: true, // Flag indicating this is a test game

      // Game metadata
      turnPhase: 'action', // Start directly at action phase
      gameStage: 'roundLoop',
      roundNumber: config.roundNumber || 1,
      turn: config.roundNumber || 1,
      currentPlayer: config.firstPlayer || 'player1',
      firstPlayerOfRound: config.firstPlayer || 'player1',
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

      // Other game state
      shieldsToAllocate: shieldsToAllocate,
      opponentShieldsToAllocate: opponentShieldsToAllocate,
      winner: null,
      gameLog: [{
        type: 'system',
        message: '🧪 Test game initialized',
        timestamp: Date.now(),
        round: config.roundNumber || 1
      }],

      // Drone selection (not used in test mode, but needed for state structure)
      droneSelectionPool: [],
      droneSelectionTrio: [],

      // Commitments - populate with drone selection for UI compatibility
      commitments: {
        droneSelection: {
          player1: {
            drones: player1State.activeDronePool,
            timestamp: Date.now()
          },
          player2: {
            drones: player2State.activeDronePool,
            timestamp: Date.now()
          }
        }
      },
    };

    // Apply state to GameStateManager
    gameStateManager.setState(testGameState, 'TEST_GAME_INITIALIZED');

    // Initialize AIPhaseProcessor for AI functionality in test mode
    const defaultAI = aiPersonalities[0]; // Use first AI personality as default
    aiPhaseProcessor.initialize(
      aiPersonalities,
      fullDroneCollection,
      defaultAI,
      gameStateManager.actionProcessor,
      gameStateManager
    );
    debugLog('TESTING', '🤖 TEST MODE: AIPhaseProcessor initialized with:', defaultAI.name);

    // Give ActionProcessor reference to AIPhaseProcessor for interception
    gameStateManager.actionProcessor.setAIPhaseProcessor(aiPhaseProcessor);

    debugLog('TESTING', '✅ TEST MODE: Game state initialized successfully');
    debugLog('TESTING', '🎮 TEST MODE: Starting at action phase with first player:', config.firstPlayer);

    return true;
  } catch (error) {
    console.error('❌ TEST MODE: Error initializing test game:', error);
    alert(`Failed to initialize test game: ${error.message}`);
    return false;
  }
}

/**
 * Create a player state object from test configuration
 * @param {Object} playerConfig - Player configuration
 * @param {string} playerName - Player name
 * @param {Object} calculatedResources - Pre-calculated resource values { energy, initialDeploymentBudget, deploymentBudget }
 * @returns {Object} Player state object
 */
function createPlayerStateFromConfig(playerConfig, playerName, calculatedResources = {}) {
  // Create deep copies of ship sections to avoid mutations
  // shipSectionData contains the template objects from shipData.js
  const shipSections = {
    bridge: JSON.parse(JSON.stringify(shipSectionData.bridge)),
    powerCell: JSON.parse(JSON.stringify(shipSectionData.powerCell)),
    droneControlHub: JSON.parse(JSON.stringify(shipSectionData.droneControlHub))
  };

  // Build deck from deckComposition if provided, otherwise use provided deck array
  let deck = playerConfig.deck || [];
  if (playerConfig.deckComposition && Object.keys(playerConfig.deckComposition).length > 0) {
    const deckArray = [];
    let instanceCounter = 0;

    Object.entries(playerConfig.deckComposition).forEach(([cardId, quantity]) => {
      for (let i = 0; i < quantity; i++) {
        const cardTemplate = fullCardCollection.find(c => c.id === cardId);
        if (cardTemplate) {
          deckArray.push(gameEngine.createCard(cardTemplate, `card-${Date.now()}-${instanceCounter++}`));
        }
      }
    });

    // Shuffle the deck for random card draw order
    deck = deckArray.sort(() => 0.5 - Math.random());

    debugLog('TESTING', `🃏 Built deck from composition for ${playerName}: ${deck.length} cards`);
  }

  // Initialize drones on board with proper runtime properties
  const laneAssignments = playerConfig.laneAssignments || { lane1: [], lane2: [], lane3: [] };
  let initializedDronesOnBoard = {
    lane1: laneAssignments.lane1.map(drone => initializeDroneForLane(drone)),
    lane2: laneAssignments.lane2.map(drone => initializeDroneForLane(drone)),
    lane3: laneAssignments.lane3.map(drone => initializeDroneForLane(drone))
  };

  // Apply passive abilities to drones (e.g., Aegis Shield Harmonizer)
  // This ensures drones start with full health shields accounting for bonuses
  initializedDronesOnBoard = applyPassiveAbilitiesToInitializedDrones(initializedDronesOnBoard);

  // Build hand from handCards configuration OR auto-draw to hand limit
  let hand = [];
  if (playerConfig.handCards && Array.isArray(playerConfig.handCards) && playerConfig.handCards.length > 0) {
    // Explicit hand cards specified - use them
    let handInstanceCounter = 0;

    playerConfig.handCards.forEach(cardIdOrObject => {
      // Check if it's already a card instance (has instanceId) or just a card ID
      if (typeof cardIdOrObject === 'string') {
        // It's a card ID, need to create instance
        const cardTemplate = fullCardCollection.find(c => c.id === cardIdOrObject);
        if (cardTemplate) {
          hand.push(gameEngine.createCard(cardTemplate, `hand-${Date.now()}-${handInstanceCounter++}`));
        } else {
          console.warn(`⚠️ TEST MODE: Card ID "${cardIdOrObject}" not found in card collection`);
        }
      } else if (cardIdOrObject && cardIdOrObject.id) {
        // It's a card object, use it directly (but ensure it has instanceId)
        if (!cardIdOrObject.instanceId) {
          // Add instanceId if missing
          hand.push({
            ...cardIdOrObject,
            instanceId: `hand-${Date.now()}-${handInstanceCounter++}`
          });
        } else {
          hand.push(cardIdOrObject);
        }
      }
    });

    debugLog('TESTING', `🃏 Built hand from configuration for ${playerName}: ${hand.length} cards`);
  } else {
    // No hand cards specified - auto-draw to hand limit from deck
    if (deck.length > 0) {
      // Calculate hand limit from ship sections
      const tempPlayerState = {
        shipSections: shipSections
      };
      const shipStats = calculateEffectiveShipStats(tempPlayerState, playerConfig.shipSections || ['bridge', 'powerCell', 'droneControlHub']);
      const handLimit = shipStats.totals.handLimit;

      // Draw random cards from deck to hand limit
      const cardsToDraw = Math.min(handLimit, deck.length);
      hand = deck.splice(0, cardsToDraw); // Remove from deck, add to hand

      debugLog('TESTING', `🎲 Auto-drew ${cardsToDraw} cards to hand limit (${handLimit}) for ${playerName}`);
    } else {
      debugLog('TESTING', `⚠️ No deck available to auto-draw hand cards for ${playerName}`);
    }
  }

  // Create base player state
  // Use calculated resources if provided, otherwise fall back to config or defaults
  const playerState = {
    name: playerName,
    shipSections: shipSections,
    energy: calculatedResources.energy ?? (playerConfig.energy ?? 10),
    initialDeploymentBudget: calculatedResources.initialDeploymentBudget ?? (playerConfig.initialDeploymentBudget ?? 10),
    deploymentBudget: calculatedResources.deploymentBudget ?? (playerConfig.deploymentBudget ?? 10),
    hand: hand,
    deck: deck,
    discardPile: [],
    activeDronePool: playerConfig.selectedDrones || [],
    dronesOnBoard: initializedDronesOnBoard,
    deployedDroneCounts: calculateDeployedCounts(laneAssignments),
    appliedUpgrades: {},
  };

  debugLog('TESTING', `📊 Created ${playerName} state:`, {
    energy: playerState.energy,
    handSize: playerState.hand.length,
    deckSize: playerState.deck.length,
    activeDronePoolSize: playerState.activeDronePool.length,
    dronesOnBoard: {
      lane1: playerState.dronesOnBoard.lane1.length,
      lane2: playerState.dronesOnBoard.lane2.length,
      lane3: playerState.dronesOnBoard.lane3.length
    }
  });

  return playerState;
}

/**
 * Calculate deployed drone counts from lane assignments
 * @param {Object} laneAssignments - Lane assignments { lane1: [], lane2: [], lane3: [] }
 * @returns {Object} Deployed counts by drone name
 */
function calculateDeployedCounts(laneAssignments) {
  if (!laneAssignments) return {};

  const counts = {};
  Object.values(laneAssignments).forEach(lane => {
    lane.forEach(drone => {
      counts[drone.name] = (counts[drone.name] || 0) + 1;
    });
  });

  return counts;
}

/**
 * Validate test configuration before initialization
 * @param {Object} config - Test configuration
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateTestConfig(config) {
  const errors = [];

  // Validate player1 configuration
  if (!config.player1) {
    errors.push('Player 1 configuration is required');
  } else {
    const p1Errors = validatePlayerConfig(config.player1, 'Player 1');
    errors.push(...p1Errors);
  }

  // Validate player2 configuration
  if (!config.player2) {
    errors.push('Player 2 configuration is required');
  } else {
    const p2Errors = validatePlayerConfig(config.player2, 'Player 2');
    errors.push(...p2Errors);
  }

  // Validate first player
  if (config.firstPlayer && !['player1', 'player2'].includes(config.firstPlayer)) {
    errors.push('First player must be "player1" or "player2"');
  }

  // Validate round number
  if (config.roundNumber !== undefined && (config.roundNumber < 1 || !Number.isInteger(config.roundNumber))) {
    errors.push('Round number must be a positive integer');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validate individual player configuration
 * @param {Object} playerConfig - Player configuration
 * @param {string} playerName - Player name for error messages
 * @returns {string[]} Array of error messages
 */
function validatePlayerConfig(playerConfig, playerName) {
  const errors = [];

  // Validate selected drones
  if (playerConfig.selectedDrones) {
    if (!Array.isArray(playerConfig.selectedDrones)) {
      errors.push(`${playerName}: selectedDrones must be an array`);
    } else if (playerConfig.selectedDrones.length !== 5) {
      errors.push(`${playerName}: Must have exactly 5 selected drones (found ${playerConfig.selectedDrones.length})`);
    }
  }

  // Validate lane assignments
  if (playerConfig.laneAssignments) {
    if (!playerConfig.laneAssignments.lane1 || !playerConfig.laneAssignments.lane2 || !playerConfig.laneAssignments.lane3) {
      errors.push(`${playerName}: Lane assignments must include lane1, lane2, and lane3`);
    } else {
      // Count total drones in lanes
      const totalDrones =
        playerConfig.laneAssignments.lane1.length +
        playerConfig.laneAssignments.lane2.length +
        playerConfig.laneAssignments.lane3.length;

      // Validate that drones in lanes are from selected pool
      if (playerConfig.selectedDrones && totalDrones > 0) {
        const selectedDroneNames = new Set(playerConfig.selectedDrones.map(d => d.name));
        Object.values(playerConfig.laneAssignments).forEach(lane => {
          lane.forEach(drone => {
            if (!selectedDroneNames.has(drone.name)) {
              errors.push(`${playerName}: Drone "${drone.name}" in lane not in selected drone pool`);
            }
          });
        });
      }
    }
  }

  // Validate energy
  if (playerConfig.energy !== undefined && (playerConfig.energy < 0 || playerConfig.energy > 100)) {
    errors.push(`${playerName}: Energy must be between 0 and 100`);
  }

  // Validate hand cards
  if (playerConfig.handCards && !Array.isArray(playerConfig.handCards)) {
    errors.push(`${playerName}: Hand cards must be an array`);
  }

  // Validate deck
  if (playerConfig.deck && !Array.isArray(playerConfig.deck)) {
    errors.push(`${playerName}: Deck must be an array`);
  }

  return errors;
}

/**
 * Create a default test configuration
 * Useful for quick testing scenarios
 * @returns {Object} Default test configuration
 */
export function createDefaultTestConfig() {
  return {
    player1: {
      selectedDrones: [],
      laneAssignments: { lane1: [], lane2: [], lane3: [] },
      handCards: [],
      deck: [],
      deckComposition: {},  // Card selection { "CARD001": 2, "CARD002": 3 }
      energy: 10,
      initialDeploymentBudget: 10,
      deploymentBudget: 10,
      shipSections: ['bridge', 'powerCell', 'droneControlHub']
    },
    player2: {
      selectedDrones: [],
      laneAssignments: { lane1: [], lane2: [], lane3: [] },
      handCards: [],
      deck: [],
      deckComposition: {},  // Card selection { "CARD001": 2, "CARD002": 3 }
      energy: 10,
      initialDeploymentBudget: 10,
      deploymentBudget: 10,
      shipSections: ['bridge', 'powerCell', 'droneControlHub']
    },
    firstPlayer: 'player1',
    roundNumber: 1
  };
}

export default {
  initializeTestGame,
  validateTestConfig,
  createDefaultTestConfig
};
