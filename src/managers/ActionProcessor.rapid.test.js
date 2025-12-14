import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActionProcessor from './ActionProcessor.js';
import GameDataService from '../services/GameDataService.js';
import fullDroneCollection from '../data/droneData.js';

/**
 * RAPID KEYWORD - MOVEMENT EXHAUSTION BYPASS TESTS
 *
 * RAPID is a passive ability that allows a drone's first move each round
 * to not exhaust the drone. This enables drones to reposition and still
 * take actions (attack, use abilities) in the same turn.
 *
 * Implementation Requirements:
 * - Drones with RAPID keyword and rapidUsed=false should NOT be exhausted on move
 * - After using RAPID, rapidUsed flag should be set to true
 * - Drones with RAPID and rapidUsed=true should exhaust normally
 * - Drones WITHOUT RAPID should exhaust normally (existing behavior)
 */

describe('RAPID keyword - Movement exhaustion bypass', () => {
  let actionProcessor;
  let mockGameStateManager;
  let mockPhaseManager;

  // Create a mock Blitz Drone with RAPID ability for testing
  const createBlitzDrone = (overrides = {}) => ({
    id: 'blitz_drone_1',
    name: 'Blitz',
    attack: 2,
    hull: 2,
    shields: 1,
    speed: 5,
    isExhausted: false,
    rapidUsed: false,
    assaultUsed: false,
    abilities: [{
      name: 'Rapid Response',
      description: 'First move each round does not exhaust this drone.',
      type: 'PASSIVE',
      effect: { type: 'GRANT_KEYWORD', keyword: 'RAPID' }
    }],
    ...overrides
  });

  // Create a standard drone WITHOUT RAPID for comparison testing
  const createStandardDrone = (overrides = {}) => ({
    id: 'scout_drone_1',
    name: 'Dart',
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 6,
    isExhausted: false,
    rapidUsed: false,
    assaultUsed: false,
    abilities: [],
    ...overrides
  });

  // Helper to create base game state
  const createBaseState = (overrides = {}) => ({
    gameMode: 'local',
    turnPhase: 'action',
    currentPlayer: 'player1',
    player1: {
      name: 'Player 1',
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      appliedUpgrades: {},
      deployedDroneCounts: {}
    },
    player2: {
      name: 'Player 2',
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      appliedUpgrades: {},
      deployedDroneCounts: {}
    },
    placedSections: ['core', null, null],
    opponentPlacedSections: ['core', null, null],
    ...overrides
  });

  beforeEach(() => {
    // Reset singletons
    ActionProcessor.instance = null;
    GameDataService.instance = null;

    // Create state that can be mutated
    let currentState = createBaseState();

    // Create mock GameStateManager
    mockGameStateManager = {
      getState: vi.fn(() => currentState),
      setState: vi.fn((updates) => {
        currentState = { ...currentState, ...updates };
      }),
      updatePlayerState: vi.fn((playerId, updates) => {
        currentState[playerId] = { ...currentState[playerId], ...updates };
      }),
      get: vi.fn((key) => currentState[key]),
      subscribe: vi.fn(() => vi.fn()),
      addLogEntry: vi.fn()
    };

    // Create mock PhaseManager
    mockPhaseManager = {
      notifyHostAction: vi.fn(),
      notifyGuestAction: vi.fn(),
      getCurrentPhase: vi.fn(() => 'action')
    };

    // Initialize ActionProcessor
    actionProcessor = ActionProcessor.getInstance(mockGameStateManager);
    actionProcessor.phaseManager = mockPhaseManager;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when drone has RAPID keyword', () => {
    it('should NOT exhaust drone on first move of the round (rapidUsed=false)', async () => {
      // EXPLANATION: This is the core RAPID behavior. When a drone with the RAPID
      // keyword moves for the first time in a round (rapidUsed is false), it should
      // NOT become exhausted. This allows the drone to reposition and still attack
      // or use abilities in the same turn.

      // Setup: Blitz Drone in lane1 with rapidUsed=false
      const blitzDrone = createBlitzDrone({ rapidUsed: false });
      const state = createBaseState();
      state.player1.dronesOnBoard.lane1 = [blitzDrone];
      mockGameStateManager.getState.mockReturnValue(state);

      // Action: Move drone from lane1 to lane2
      await actionProcessor.processMove({
        droneId: 'blitz_drone_1',
        fromLane: 'lane1',
        toLane: 'lane2',
        playerId: 'player1'
      });

      // Assert: Drone should NOT be exhausted
      const updateCall = mockGameStateManager.updatePlayerState.mock.calls[0];
      expect(updateCall).toBeDefined();
      const updatedPlayerState = updateCall[1];
      const movedDrone = updatedPlayerState.dronesOnBoard.lane2.find(d => d.id === 'blitz_drone_1');

      expect(movedDrone.isExhausted).toBe(false);
    });

    it('should set rapidUsed to true after first move', async () => {
      // EXPLANATION: After using the RAPID ability, the rapidUsed flag must be
      // set to true to prevent the ability from being used again until the next
      // round when it resets.

      // Setup: Blitz Drone in lane1 with rapidUsed=false
      const blitzDrone = createBlitzDrone({ rapidUsed: false });
      const state = createBaseState();
      state.player1.dronesOnBoard.lane1 = [blitzDrone];
      mockGameStateManager.getState.mockReturnValue(state);

      // Action: Move drone from lane1 to lane2
      await actionProcessor.processMove({
        droneId: 'blitz_drone_1',
        fromLane: 'lane1',
        toLane: 'lane2',
        playerId: 'player1'
      });

      // Assert: rapidUsed should be true
      const updateCall = mockGameStateManager.updatePlayerState.mock.calls[0];
      const updatedPlayerState = updateCall[1];
      const movedDrone = updatedPlayerState.dronesOnBoard.lane2.find(d => d.id === 'blitz_drone_1');

      expect(movedDrone.rapidUsed).toBe(true);
    });

    it('should exhaust drone on second move of the round (rapidUsed=true)', async () => {
      // EXPLANATION: Once RAPID has been used (rapidUsed=true), subsequent moves
      // in the same round should exhaust the drone normally. RAPID only provides
      // one free move per round.

      // Setup: Blitz Drone in lane1 with rapidUsed=true (already used this round)
      const blitzDrone = createBlitzDrone({ rapidUsed: true });
      const state = createBaseState();
      state.player1.dronesOnBoard.lane1 = [blitzDrone];
      mockGameStateManager.getState.mockReturnValue(state);

      // Action: Move drone from lane1 to lane2
      await actionProcessor.processMove({
        droneId: 'blitz_drone_1',
        fromLane: 'lane1',
        toLane: 'lane2',
        playerId: 'player1'
      });

      // Assert: Drone SHOULD be exhausted
      const updateCall = mockGameStateManager.updatePlayerState.mock.calls[0];
      const updatedPlayerState = updateCall[1];
      const movedDrone = updatedPlayerState.dronesOnBoard.lane2.find(d => d.id === 'blitz_drone_1');

      expect(movedDrone.isExhausted).toBe(true);
    });
  });

  describe('when drone does NOT have RAPID keyword', () => {
    it('should exhaust drone normally on move', async () => {
      // EXPLANATION: Drones without the RAPID keyword should continue to
      // exhaust when moving, preserving the existing game behavior.

      // Setup: Standard Scout Drone in lane1
      const scoutDrone = createStandardDrone();
      const state = createBaseState();
      state.player1.dronesOnBoard.lane1 = [scoutDrone];
      mockGameStateManager.getState.mockReturnValue(state);

      // Action: Move drone from lane1 to lane2
      await actionProcessor.processMove({
        droneId: 'scout_drone_1',
        fromLane: 'lane1',
        toLane: 'lane2',
        playerId: 'player1'
      });

      // Assert: Drone SHOULD be exhausted (normal behavior)
      const updateCall = mockGameStateManager.updatePlayerState.mock.calls[0];
      const updatedPlayerState = updateCall[1];
      const movedDrone = updatedPlayerState.dronesOnBoard.lane2.find(d => d.id === 'scout_drone_1');

      expect(movedDrone.isExhausted).toBe(true);
    });

    it('should preserve rapidUsed state when drone without RAPID moves', async () => {
      // EXPLANATION: Drones without RAPID should still have the rapidUsed property
      // preserved (should remain false or whatever value it was) but it won't
      // affect exhaustion since they don't have the RAPID keyword.

      // Setup: Standard Scout Drone in lane1
      const scoutDrone = createStandardDrone({ rapidUsed: false });
      const state = createBaseState();
      state.player1.dronesOnBoard.lane1 = [scoutDrone];
      mockGameStateManager.getState.mockReturnValue(state);

      // Action: Move drone from lane1 to lane2
      await actionProcessor.processMove({
        droneId: 'scout_drone_1',
        fromLane: 'lane1',
        toLane: 'lane2',
        playerId: 'player1'
      });

      // Assert: rapidUsed should remain false (not changed)
      const updateCall = mockGameStateManager.updatePlayerState.mock.calls[0];
      const updatedPlayerState = updateCall[1];
      const movedDrone = updatedPlayerState.dronesOnBoard.lane2.find(d => d.id === 'scout_drone_1');

      expect(movedDrone.rapidUsed).toBe(false);
    });
  });
});
