import { vi } from 'vitest';
import PhaseManager from '../../managers/PhaseManager.js';

/**
 * Phase Management Test Helpers
 * Reusable utilities for testing phase transitions, state tracking, and synchronization
 */

/**
 * Creates a mock GameStateManager for testing
 * NOTE: PhaseManager constructor signature is: constructor(gameStateManager, gameMode)
 */
export const createMockGameStateManager = () => {
  const state = {
    turnPhase: 'deployment',
    gameMode: 'host',
    currentPlayer: 'player1',
    roundNumber: 1,
    turn: 1,
    gameStage: 'roundLoop',
    passInfo: {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    },
    commitments: {},
    firstPlayerOfRound: null,
    firstPasserOfPreviousRound: null,
    player1: createMockPlayer('Player 1'),
    player2: createMockPlayer('Player 2')
  };

  const subscribers = [];

  return {
    // Get entire state
    getState: vi.fn(() => state),

    // Get individual property
    get: vi.fn((key) => state[key]),

    // Set entire state
    setState: vi.fn((updates) => {
      Object.assign(state, updates);
      // Notify subscribers
      subscribers.forEach(callback => callback({ state, type: 'setState' }));
    }),

    // Update partial state
    updateState: vi.fn((updates) => {
      Object.assign(state, updates);
      // Notify subscribers
      subscribers.forEach(callback => callback({ state, type: 'updateState' }));
    }),

    // Subscribe to state changes
    subscribe: vi.fn((callback) => {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) subscribers.splice(index, 1);
      };
    }),

    // Get local player ID
    getLocalPlayerId: vi.fn(() => state.gameMode === 'guest' ? 'player2' : 'player1'),

    // Get opponent player ID
    getOpponentPlayerId: vi.fn(() => {
      const localPlayerId = state.gameMode === 'guest' ? 'player2' : 'player1';
      return localPlayerId === 'player1' ? 'player2' : 'player1';
    })
  };
};

/**
 * Creates a PhaseManager instance for testing
 * @param {string} gameMode - 'host', 'guest', or 'local'
 * @returns {PhaseManager}
 */
export const createMockPhaseManager = (gameMode = 'host') => {
  const mockGameStateManager = createMockGameStateManager();
  // IMPORTANT: Constructor signature is (gameStateManager, gameMode)
  return new PhaseManager(mockGameStateManager, gameMode);
};

/**
 * Creates a mock player object
 */
export const createMockPlayer = (name) => {
  return {
    name,
    energy: 10,
    deploymentBudget: 5,
    hand: [],
    deck: [],
    discard: [],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: {
      section1: {
        hull: 10,
        shields: 5,
        thresholds: { damaged: 6, critical: 3 }
      }
    },
    appliedUpgrades: {},
    deployedDroneCounts: {}
  };
};

/**
 * Creates a mock game state with overrides
 */
export const createMockGameState = (overrides = {}) => {
  return {
    turnPhase: 'deployment',
    gameMode: 'host',
    currentPlayer: 'player1',
    roundNumber: 1,
    turn: 1,
    gameStage: 'roundLoop',
    passInfo: {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    },
    commitments: {},
    firstPlayerOfRound: 'player1',
    firstPasserOfPreviousRound: null,
    player1: createMockPlayer('Player 1'),
    player2: createMockPlayer('Player 2'),
    ...overrides
  };
};

/**
 * Simulates a player pass action via PhaseManager
 */
export const simulatePass = (phaseManager, playerId) => {
  const actionType = playerId === 'player1' ? 'notifyHostAction' : 'notifyGuestAction';
  const currentPhase = phaseManager.phaseState?.turnPhase || 'deployment';
  phaseManager[actionType]('pass', { phase: currentPhase });
};

/**
 * Simulates a player commitment via PhaseManager
 */
export const simulateCommitment = (phaseManager, playerId, phase) => {
  const actionType = playerId === 'player1' ? 'notifyHostAction' : 'notifyGuestAction';
  phaseManager[actionType]('commit', { phase });
};

/**
 * Asserts that phase has transitioned to expected phase
 */
export const assertPhaseTransitioned = (phaseManager, expectedPhase) => {
  const actualPhase = phaseManager.phaseState?.turnPhase;
  if (actualPhase !== expectedPhase) {
    throw new Error(`Expected phase ${expectedPhase} but got ${actualPhase}`);
  }
};

/**
 * Asserts first passer is set correctly
 */
export const assertFirstPasser = (phaseManager, expectedPlayerId) => {
  const hostFirstPasser = phaseManager.hostLocalState?.passInfo?.firstPasser;
  const guestFirstPasser = phaseManager.guestLocalState?.passInfo?.firstPasser;

  if (hostFirstPasser !== expectedPlayerId) {
    throw new Error(`Expected host firstPasser ${expectedPlayerId} but got ${hostFirstPasser}`);
  }
  if (guestFirstPasser !== expectedPlayerId) {
    throw new Error(`Expected guest firstPasser ${expectedPlayerId} but got ${guestFirstPasser}`);
  }
};

/**
 * Creates a minimal mock for ActionProcessor
 */
export const createMockActionProcessor = () => {
  return {
    broadcastStateToGuest: vi.fn(),
    queueAction: vi.fn(),
    processPlayerPass: vi.fn(),
    processCommitment: vi.fn()
  };
};

// ========================================
// INTEGRATION TEST FIXTURES
// ========================================

/**
 * Creates a complete game state for integration testing
 * Includes realistic deck, cards, ship sections, etc.
 */
export const createIntegrationGameState = (overrides = {}) => {
  // Create sample cards for decks
  const createCard = (id, name, cost) => ({
    id,
    name,
    cost,
    type: 'drone',
    attack: 2,
    health: 3
  });

  const player1Deck = [
    createCard('card1', 'Drone Alpha', 2),
    createCard('card2', 'Drone Beta', 3),
    createCard('card3', 'Drone Gamma', 2),
    createCard('card4', 'Drone Delta', 4),
    createCard('card5', 'Drone Epsilon', 3)
  ];

  const player2Deck = [
    createCard('card6', 'Drone Zeta', 2),
    createCard('card7', 'Drone Eta', 3),
    createCard('card8', 'Drone Theta', 2),
    createCard('card9', 'Drone Iota', 4),
    createCard('card10', 'Drone Kappa', 3)
  ];

  return {
    turnPhase: 'deployment',
    gameMode: 'host',
    currentPlayer: 'player1',
    roundNumber: 1,
    turn: 1,
    gameStage: 'roundLoop',
    passInfo: {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    },
    commitments: {},
    firstPlayerOfRound: 'player1',
    firstPasserOfPreviousRound: null,
    player1: {
      name: 'Player 1',
      energy: 10,
      deploymentBudget: 5,
      hand: player1Deck.slice(0, 3),
      deck: player1Deck.slice(3),
      discard: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {
        fore: { hull: 10, shields: 5, maxHull: 10, maxShields: 5, thresholds: { damaged: 6, critical: 3 } },
        mid: { hull: 15, shields: 8, maxHull: 15, maxShields: 8, thresholds: { damaged: 10, critical: 5 } },
        aft: { hull: 10, shields: 5, maxHull: 10, maxShields: 5, thresholds: { damaged: 6, critical: 3 } }
      },
      appliedUpgrades: {},
      deployedDroneCounts: {}
    },
    player2: {
      name: 'Player 2',
      energy: 10,
      deploymentBudget: 5,
      hand: player2Deck.slice(0, 3),
      deck: player2Deck.slice(3),
      discard: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {
        fore: { hull: 10, shields: 5, maxHull: 10, maxShields: 5, thresholds: { damaged: 6, critical: 3 } },
        mid: { hull: 15, shields: 8, maxHull: 15, maxShields: 8, thresholds: { damaged: 10, critical: 5 } },
        aft: { hull: 10, shields: 5, maxHull: 10, maxShields: 5, thresholds: { damaged: 6, critical: 3 } }
      },
      appliedUpgrades: {},
      deployedDroneCounts: {}
    },
    ...overrides
  };
};

/**
 * Creates a mock GameStateManager for integration tests
 * More complete than unit test version
 */
export const createIntegrationGameStateManager = (initialState = null) => {
  const state = initialState || createIntegrationGameState();
  const subscribers = [];

  return {
    getState: vi.fn(() => state),
    get: vi.fn((key) => state[key]),
    setState: vi.fn((updates, source) => {
      Object.assign(state, updates);
      subscribers.forEach(cb => cb({ state, type: 'setState', source }));
    }),
    updateState: vi.fn((updates) => {
      Object.assign(state, updates);
      subscribers.forEach(cb => cb({ state, type: 'updateState' }));
    }),
    subscribe: vi.fn((callback) => {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) subscribers.splice(index, 1);
      };
    }),
    getLocalPlayerId: vi.fn(() => state.gameMode === 'guest' ? 'player2' : 'player1'),
    getOpponentPlayerId: vi.fn(() => state.gameMode === 'guest' ? 'player1' : 'player2'),
    isMilestonePhase: vi.fn((phase) => ['deployment', 'action'].includes(phase)),
    // Direct state access for tests
    _state: state
  };
};

/**
 * Creates a mock ActionProcessor for integration tests
 * Tracks all calls for verification
 */
export const createIntegrationActionProcessor = () => {
  const phaseTransitions = [];
  const broadcasts = [];

  return {
    broadcastStateToGuest: vi.fn(() => {
      broadcasts.push({ timestamp: Date.now() });
    }),
    processPhaseTransition: vi.fn(async (data) => {
      phaseTransitions.push(data);
      return { success: true };
    }),
    processTurnTransition: vi.fn(async () => ({ success: true })),
    processPlayerPass: vi.fn(async () => ({ success: true })),
    processCommitment: vi.fn(async () => ({ success: true })),
    processFirstPlayerDetermination: vi.fn(async () => ({ success: true, firstPlayer: 'player1' })),
    queueAction: vi.fn(async () => ({ success: true })),
    setPhaseManager: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    // Test helpers
    getPhaseTransitions: () => phaseTransitions,
    getBroadcasts: () => broadcasts,
    clearHistory: () => {
      phaseTransitions.length = 0;
      broadcasts.length = 0;
    }
  };
};

// ========================================
// MODE-SPECIFIC TEST FIXTURES
// ========================================
// Source: Design/PHASE_FLOW_TEST_COVERAGE.md
// These fixtures enable testing asymmetric scenarios per game mode

/**
 * LOCAL MODE FIXTURES (Human P1 vs AI P2)
 * Test ID prefix: L (e.g., MD-L1, DP-L2)
 *
 * Key behavior: AI commits/passes are processed SYNCHRONOUSLY inline
 * via handleAICommitment() and checkForAITurn()
 */

/**
 * Creates a Local mode game state for asymmetric mandatory phase testing
 * @param {object} options - Configuration for the asymmetric scenario
 * @param {boolean} options.p1NeedsAction - Whether P1 (Human) needs to perform action
 * @param {boolean} options.p2NeedsAction - Whether P2 (AI) needs to perform action
 * @param {string} options.phase - The phase to configure for (mandatoryDiscard, allocateShields, etc.)
 * @returns {object} Game state configured for the scenario
 */
export const createLocalModeAsymmetricState = ({
  p1NeedsAction = true,
  p2NeedsAction = true,
  phase = 'mandatoryDiscard'
} = {}) => {
  const baseState = createIntegrationGameState({
    gameMode: 'local',
    turnPhase: phase,
    roundNumber: phase === 'optionalDiscard' || phase === 'allocateShields' ? 2 : 1
  });

  // Configure asymmetric conditions based on phase
  switch (phase) {
    case 'mandatoryDiscard': {
      const handLimit = 6;
      // P1 needs discard if hand > limit
      baseState.player1.hand = p1NeedsAction
        ? createTestCards(8, 'p1') // 8 cards, needs to discard 2
        : createTestCards(5, 'p1'); // 5 cards, under limit
      // P2 (AI) needs discard if hand > limit
      baseState.player2.hand = p2NeedsAction
        ? createTestCards(8, 'p2') // 8 cards, needs to discard 2
        : createTestCards(5, 'p2'); // 5 cards, under limit
      baseState.handLimit = handLimit;
      break;
    }

    case 'optionalDiscard': {
      // P1 has cards to optionally discard
      baseState.player1.hand = p1NeedsAction
        ? createTestCards(4, 'p1')
        : [];
      // P2 (AI) has cards to optionally discard
      baseState.player2.hand = p2NeedsAction
        ? createTestCards(4, 'p2')
        : [];
      break;
    }

    case 'allocateShields': {
      // P1 has shields to allocate
      baseState.player1.shieldsToAllocate = p1NeedsAction ? 3 : 0;
      // P2 (AI) has shields to allocate
      baseState.player2.shieldsToAllocate = p2NeedsAction ? 3 : 0;
      break;
    }

    case 'mandatoryDroneRemoval': {
      const cpuLimit = 4;
      // P1 exceeds drone limit
      baseState.player1.dronesOnBoard = p1NeedsAction
        ? { lane1: createTestDrones(3, 'p1'), lane2: createTestDrones(2, 'p1'), lane3: createTestDrones(1, 'p1') }
        : { lane1: createTestDrones(2, 'p1'), lane2: [], lane3: [] };
      // P2 (AI) exceeds drone limit
      baseState.player2.dronesOnBoard = p2NeedsAction
        ? { lane1: createTestDrones(3, 'p2'), lane2: createTestDrones(2, 'p2'), lane3: createTestDrones(1, 'p2') }
        : { lane1: createTestDrones(2, 'p2'), lane2: [], lane3: [] };
      baseState.cpuLimit = cpuLimit;
      break;
    }
  }

  return baseState;
};

/**
 * Creates a Local mode GameStateManager with asymmetric state
 */
export const createLocalModeGameStateManager = (options = {}) => {
  const state = createLocalModeAsymmetricState(options);
  return createIntegrationGameStateManager(state);
};

/**
 * MULTIPLAYER HOST MODE FIXTURES (Human P1 vs Guest P2)
 * Test ID prefix: H (e.g., MD-H1, DP-H2)
 *
 * Key behavior: Guest actions arrive via NETWORK, processed asynchronously
 * Host calls notifyGuestAction() when network message is received
 */

/**
 * Creates a Host mode game state for asymmetric mandatory phase testing
 */
export const createHostModeAsymmetricState = ({
  p1NeedsAction = true,
  p2NeedsAction = true,
  phase = 'mandatoryDiscard'
} = {}) => {
  // Start with local mode state, then override to host mode
  const baseState = createLocalModeAsymmetricState({ p1NeedsAction, p2NeedsAction, phase });
  baseState.gameMode = 'host';
  return baseState;
};

/**
 * Creates a Host mode GameStateManager with asymmetric state
 */
export const createHostModeGameStateManager = (options = {}) => {
  const state = createHostModeAsymmetricState(options);
  return createIntegrationGameStateManager(state);
};

/**
 * Creates a mock network message handler for simulating guest actions
 * Used to test host receiving guest actions via network
 */
export const createMockNetworkHandler = () => {
  const receivedMessages = [];
  const sentMessages = [];

  return {
    // Simulate receiving a guest action
    receiveGuestAction: vi.fn((action) => {
      receivedMessages.push({ action, timestamp: Date.now() });
      return action;
    }),
    // Simulate sending a broadcast to guest
    sendToGuest: vi.fn((message) => {
      sentMessages.push({ message, timestamp: Date.now() });
    }),
    // Test helpers
    getReceivedMessages: () => [...receivedMessages],
    getSentMessages: () => [...sentMessages],
    clearHistory: () => {
      receivedMessages.length = 0;
      sentMessages.length = 0;
    }
  };
};

/**
 * MULTIPLAYER GUEST MODE FIXTURES (local view as P2)
 * Test ID prefix: G (e.g., MD-G1, DP-G2)
 *
 * Key behavior: Guest receives host broadcasts, does NOT call PhaseManager methods
 * Guest actions are sent to host, not processed locally
 */

/**
 * Creates a Guest mode game state (player is P2, receives from host)
 */
export const createGuestModeState = ({
  phase = 'mandatoryDiscard',
  guestNeedsAction = true
} = {}) => {
  const baseState = createLocalModeAsymmetricState({
    p1NeedsAction: true, // Host always has some state
    p2NeedsAction: guestNeedsAction,
    phase
  });
  baseState.gameMode = 'guest';
  return baseState;
};

/**
 * Creates a Guest mode GameStateManager
 */
export const createGuestModeGameStateManager = (options = {}) => {
  const state = createGuestModeState(options);
  const manager = createIntegrationGameStateManager(state);

  // Override getLocalPlayerId for guest mode
  manager.getLocalPlayerId = vi.fn(() => 'player2');
  manager.getOpponentPlayerId = vi.fn(() => 'player1');

  return manager;
};

/**
 * Creates a mock host broadcast for guest to receive
 * @param {object} options - Broadcast configuration
 * @returns {object} Mock broadcast message
 */
export const createMockHostBroadcast = ({
  phase,
  phaseComplete = false,
  firstPasser = null,
  stateUpdates = {}
} = {}) => {
  return {
    type: 'stateSync',
    phase,
    phaseComplete,
    passInfo: { firstPasser },
    state: stateUpdates,
    timestamp: Date.now()
  };
};

// ========================================
// HELPER FUNCTIONS FOR FIXTURES
// ========================================

/**
 * Creates test cards for hand/deck
 */
const createTestCards = (count, ownerPrefix) => {
  const cards = [];
  for (let i = 0; i < count; i++) {
    cards.push({
      id: `${ownerPrefix}-card-${i}`,
      name: `Test Card ${i}`,
      cost: 2,
      type: 'drone',
      attack: 2,
      health: 3
    });
  }
  return cards;
};

/**
 * Creates test drones for board positions
 */
const createTestDrones = (count, ownerPrefix) => {
  const drones = [];
  for (let i = 0; i < count; i++) {
    drones.push({
      id: `${ownerPrefix}-drone-${i}`,
      name: `Test Drone ${i}`,
      attack: 2,
      health: 3,
      energy: 1,
      maxEnergy: 1
    });
  }
  return drones;
};

// ========================================
// ASYMMETRIC SCENARIO TEST UTILITIES
// ========================================

/**
 * Test scenarios for asymmetric phase tests
 * Maps to test IDs from Design/PHASE_FLOW_TEST_COVERAGE.md
 */
export const ASYMMETRIC_SCENARIOS = {
  // Both players need action
  BOTH_NEED: { p1NeedsAction: true, p2NeedsAction: true },
  // Only P1 (Human/Host) needs action
  ONLY_P1: { p1NeedsAction: true, p2NeedsAction: false },
  // Only P2 (AI/Guest) needs action
  ONLY_P2: { p1NeedsAction: false, p2NeedsAction: true },
  // Neither needs action (phase should skip)
  NEITHER: { p1NeedsAction: false, p2NeedsAction: false }
};

/**
 * Maps scenario to expected behavior
 */
export const getExpectedBehavior = (scenario, mode) => {
  const behaviors = {
    BOTH_NEED: {
      local: { p1Acts: true, p2Acts: true, aiAutoCommits: true },
      host: { p1Acts: true, p2Acts: true, networkRequired: true },
      guest: { receiveBroadcast: true, guestCommits: true }
    },
    ONLY_P1: {
      local: { p1Acts: true, p2Acts: false, aiAutoApproves: true },
      host: { p1Acts: true, p2Acts: false, guestAutoApproves: true },
      guest: { receiveBroadcast: true, guestAutoApproves: true }
    },
    ONLY_P2: {
      local: { p1Acts: false, p2Acts: true, humanAutoApproves: true, aiActs: true },
      host: { p1Acts: false, p2Acts: true, hostAutoApproves: true, networkRequired: true },
      guest: { receiveBroadcast: true, guestCommits: true }
    },
    NEITHER: {
      local: { phaseSkipped: true },
      host: { phaseSkipped: true, broadcastSkip: true },
      guest: { receiveBroadcast: true, phaseSkipped: true }
    }
  };

  return behaviors[scenario]?.[mode] || {};
};
