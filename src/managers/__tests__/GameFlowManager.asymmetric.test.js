import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameFlowManager from '../GameFlowManager.js';

/**
 * ASYMMETRIC PHASE TESTS - GameFlowManager.autoCompleteUnnecessaryCommitments()
 *
 * These tests verify behavior for asymmetric phases:
 * - When one player needs to act and the other doesn't
 * - The player who doesn't need to act should auto-commit
 * - All mandatory simultaneous phases are handled consistently
 *
 * Implemented phases:
 * - allocateShields - Auto-commits players with 0 shields to allocate
 * - mandatoryDiscard - Auto-commits players under hand limit
 * - mandatoryDroneRemoval - Auto-commits players under drone limit
 *
 * Test IDs from: Design/PHASE_FLOW_TEST_COVERAGE.md
 */

describe('GameFlowManager - Asymmetric Phase Auto-Completion', () => {
  let gameFlowManager;
  let mockGameStateManager;
  let mockActionProcessor;
  let mockGameDataService;

  // Helper to create test cards
  const createCards = (count) => {
    const cards = [];
    for (let i = 0; i < count; i++) {
      cards.push({ id: `card-${i}`, name: `Card ${i}`, cost: 2 });
    }
    return cards;
  };

  // Helper to create test drones
  const createDrones = (count) => {
    const drones = [];
    for (let i = 0; i < count; i++) {
      drones.push({ id: `drone-${i}`, name: `Drone ${i}`, attack: 2, health: 3 });
    }
    return drones;
  };

  beforeEach(() => {
    // Clear singleton instance
    GameFlowManager.instance = null;

    // Create mock GameStateManager
    mockGameStateManager = {
      getState: vi.fn(),
      get: vi.fn(),
      setState: vi.fn(),
      getLocalPlayerId: vi.fn(() => 'player1')
    };

    // Create mock ActionProcessor
    mockActionProcessor = {
      processCommitment: vi.fn().mockResolvedValue({ success: true }),
      handleAICommitment: vi.fn().mockResolvedValue({ success: true }),
      setPhaseManager: vi.fn()
    };

    // Create mock GameDataService with effective stats
    mockGameDataService = {
      getEffectiveShipStats: vi.fn((player) => ({
        totals: {
          handLimit: 6,  // Default hand limit
          cpuLimit: 4    // Default drone limit
        }
      }))
    };

    // Create GameFlowManager and inject mocks
    gameFlowManager = new GameFlowManager();
    gameFlowManager.gameStateManager = mockGameStateManager;
    gameFlowManager.actionProcessor = mockActionProcessor;
    gameFlowManager.gameDataService = mockGameDataService;
    gameFlowManager.isInitialized = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
    GameFlowManager.instance = null;
  });

  // ========================================
  // ALLOCATE SHIELDS - Currently Implemented
  // ========================================
  describe('allocateShields (currently implemented)', () => {
    it('AS-L2: Both have shields → no auto-commit', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        shieldsToAllocate: 3,
        opponentShieldsToAllocate: 2
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('allocateShields');

      // Neither player should auto-commit
      expect(mockActionProcessor.processCommitment).not.toHaveBeenCalled();
    });

    it('AS-L3: Only P1 has shields → P2 auto-commits', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        shieldsToAllocate: 3,
        opponentShieldsToAllocate: 0
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('allocateShields');

      // P2 should auto-commit (no shields to allocate)
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player2',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      // P1 should NOT auto-commit (has shields)
      expect(mockActionProcessor.processCommitment).not.toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player1' })
      );
    });

    it('AS-L4: Only P2 (AI) has shields → P1 auto-commits, AI triggered', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        shieldsToAllocate: 0,
        opponentShieldsToAllocate: 3
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('allocateShields');

      // P1 should auto-commit (no shields)
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      // AI should be triggered (P2 has shields, P1 doesn't)
      expect(mockActionProcessor.handleAICommitment).toHaveBeenCalledWith(
        'allocateShields',
        expect.any(Object)
      );
    });

    it('AS-L5: Neither has shields → both auto-commit', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        shieldsToAllocate: 0,
        opponentShieldsToAllocate: 0
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('allocateShields');

      // Both should auto-commit
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player2',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });
    });
  });

  // ========================================
  // MANDATORY DISCARD - Implemented
  // ========================================
  describe('mandatoryDiscard', () => {
    /**
     * MD-L2: Only P1 exceeds hand limit → P2 auto-commits
     */
    it('MD-L2: Only P1 exceeds hand limit → P2 auto-commits', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        player1: { hand: createCards(8) },  // 8 cards, exceeds limit of 6
        player2: { hand: createCards(5) },  // 5 cards, under limit
        placedSections: {},
        opponentPlacedSections: {}
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('mandatoryDiscard');

      // P2 should auto-commit (under limit)
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player2',
        phase: 'mandatoryDiscard',
        actionData: { autoCompleted: true }
      });

      // P1 should NOT auto-commit (exceeds limit)
      expect(mockActionProcessor.processCommitment).not.toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player1' })
      );
    });

    /**
     * MD-L3: Only P2 (AI) exceeds hand limit → P1 auto-commits, AI triggered
     */
    it('MD-L3: Only P2 (AI) exceeds hand limit → P1 auto-commits, AI triggered', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        player1: { hand: createCards(5) },  // 5 cards, under limit
        player2: { hand: createCards(8) },  // 8 cards, exceeds limit
        placedSections: {},
        opponentPlacedSections: {}
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('mandatoryDiscard');

      // P1 should auto-commit (under limit)
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player1',
        phase: 'mandatoryDiscard',
        actionData: { autoCompleted: true }
      });

      // AI should be triggered (P2 exceeds, P1 doesn't)
      expect(mockActionProcessor.handleAICommitment).toHaveBeenCalledWith(
        'mandatoryDiscard',
        expect.any(Object)
      );
    });

    /**
     * MD-L4: Neither exceeds hand limit → both auto-commit (phase skipped)
     */
    it('MD-L4: Neither exceeds hand limit → both auto-commit', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        player1: { hand: createCards(5) },
        player2: { hand: createCards(4) },
        placedSections: {},
        opponentPlacedSections: {}
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('mandatoryDiscard');

      // Both should auto-commit
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player1',
        phase: 'mandatoryDiscard',
        actionData: { autoCompleted: true }
      });
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player2',
        phase: 'mandatoryDiscard',
        actionData: { autoCompleted: true }
      });
    });

    /**
     * MD-H4: Multiplayer Host - Only Guest (P2) exceeds → Host auto-commits
     */
    it('MD-H4: Multiplayer - Only Guest exceeds → Host auto-commits', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'host',
        player1: { hand: createCards(5) },  // Host under limit
        player2: { hand: createCards(8) },  // Guest exceeds limit
        placedSections: {},
        opponentPlacedSections: {}
      });
      mockGameStateManager.getLocalPlayerId.mockReturnValue('player1');

      await gameFlowManager.autoCompleteUnnecessaryCommitments('mandatoryDiscard');

      // Host (P1) should auto-commit (under limit, is local player)
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player1',
        phase: 'mandatoryDiscard',
        actionData: { autoCompleted: true }
      });

      // Guest (P2) should NOT auto-commit from host (handled by guest client)
      expect(mockActionProcessor.processCommitment).not.toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player2' })
      );

      // AI should NOT be triggered (multiplayer mode)
      expect(mockActionProcessor.handleAICommitment).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // MANDATORY DRONE REMOVAL - Implemented
  // ========================================
  describe('mandatoryDroneRemoval', () => {
    /**
     * MR-L2: Only P1 exceeds drone limit → P2 auto-commits
     */
    it('MR-L2: Only P1 exceeds drone limit → P2 auto-commits', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        player1: {
          dronesOnBoard: {
            lane1: createDrones(3),
            lane2: createDrones(2),
            lane3: createDrones(1)
          } // 6 drones, exceeds limit of 4
        },
        player2: {
          dronesOnBoard: {
            lane1: createDrones(2),
            lane2: [],
            lane3: []
          } // 2 drones, under limit
        },
        placedSections: {},
        opponentPlacedSections: {}
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('mandatoryDroneRemoval');

      // P2 should auto-commit (under limit)
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player2',
        phase: 'mandatoryDroneRemoval',
        actionData: { autoCompleted: true }
      });

      // P1 should NOT auto-commit (exceeds limit)
      expect(mockActionProcessor.processCommitment).not.toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player1' })
      );
    });

    /**
     * MR-L3: Only P2 (AI) exceeds drone limit → P1 auto-commits, AI triggered
     */
    it('MR-L3: Only P2 (AI) exceeds drone limit → P1 auto-commits, AI triggered', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        player1: {
          dronesOnBoard: { lane1: createDrones(2), lane2: [], lane3: [] } // 2 drones
        },
        player2: {
          dronesOnBoard: {
            lane1: createDrones(3),
            lane2: createDrones(2),
            lane3: createDrones(1)
          } // 6 drones, exceeds limit
        },
        placedSections: {},
        opponentPlacedSections: {}
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('mandatoryDroneRemoval');

      // P1 should auto-commit (under limit)
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player1',
        phase: 'mandatoryDroneRemoval',
        actionData: { autoCompleted: true }
      });

      // AI should be triggered (P2 exceeds, P1 doesn't)
      expect(mockActionProcessor.handleAICommitment).toHaveBeenCalledWith(
        'mandatoryDroneRemoval',
        expect.any(Object)
      );
    });

    /**
     * MR-L4: Neither exceeds drone limit → both auto-commit
     */
    it('MR-L4: Neither exceeds drone limit → both auto-commit', async () => {
      mockGameStateManager.getState.mockReturnValue({
        gameMode: 'local',
        player1: { dronesOnBoard: { lane1: createDrones(2), lane2: [], lane3: [] } },
        player2: { dronesOnBoard: { lane1: createDrones(3), lane2: [], lane3: [] } },
        placedSections: {},
        opponentPlacedSections: {}
      });

      await gameFlowManager.autoCompleteUnnecessaryCommitments('mandatoryDroneRemoval');

      // Both under limit, both should auto-commit
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player1',
        phase: 'mandatoryDroneRemoval',
        actionData: { autoCompleted: true }
      });
      expect(mockActionProcessor.processCommitment).toHaveBeenCalledWith({
        playerId: 'player2',
        phase: 'mandatoryDroneRemoval',
        actionData: { autoCompleted: true }
      });
    });
  });

  // ========================================
  // PER-PLAYER LIMIT CHECK METHODS - Implemented
  // ========================================
  describe('Per-player limit check methods', () => {
    it('playerExceedsHandLimit should check individual player', () => {
      mockGameStateManager.getState.mockReturnValue({
        player1: { hand: createCards(8) },
        player2: { hand: createCards(5) },
        placedSections: {},
        opponentPlacedSections: {}
      });

      const gameState = mockGameStateManager.getState();
      expect(gameFlowManager.playerExceedsHandLimit('player1', gameState)).toBe(true);
      expect(gameFlowManager.playerExceedsHandLimit('player2', gameState)).toBe(false);
    });

    it('playerExceedsDroneLimit should check individual player', () => {
      mockGameStateManager.getState.mockReturnValue({
        player1: { dronesOnBoard: { lane1: createDrones(6) } },
        player2: { dronesOnBoard: { lane1: createDrones(2) } },
        placedSections: {},
        opponentPlacedSections: {}
      });

      const gameState = mockGameStateManager.getState();
      expect(gameFlowManager.playerExceedsDroneLimit('player1', gameState)).toBe(true);
      expect(gameFlowManager.playerExceedsDroneLimit('player2', gameState)).toBe(false);
    });
  });
});
