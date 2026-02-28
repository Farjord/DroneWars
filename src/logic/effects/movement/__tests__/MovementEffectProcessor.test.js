// ========================================
// MOVEMENT EFFECT PROCESSOR TESTS
// ========================================
// TDD: Tests for cannotMove restriction in SINGLE_MOVE and MULTI_MOVE effects

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TriggerProcessor to avoid EffectRouter import chain
vi.mock('../../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = vi.fn().mockReturnValue({
        triggered: false, newPlayerStates: null, animationEvents: []
      });
    }
  }
}));
vi.mock('../../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: {
    ON_MOVE: 'ON_MOVE',
    ON_LANE_MOVEMENT_IN: 'ON_LANE_MOVEMENT_IN',
    ON_LANE_MOVEMENT_OUT: 'ON_LANE_MOVEMENT_OUT'
  }
}));

import MovementEffectProcessor from '../../MovementEffectProcessor.js';

describe('MovementEffectProcessor - cannotMove restriction', () => {
  let processor;
  let mockPlayerStates;
  let mockContext;
  let mockCard;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new MovementEffectProcessor();

    // Mock player states with drones in lanes
    mockPlayerStates = {
      player1: {
        name: 'Test Player',
        energy: 10,
        appliedUpgrades: {},
        dronesOnBoard: {
          lane1: [
            {
              id: 'drone_1',
              name: 'TestDrone1',
              hull: 3,
              isExhausted: false,
              attack: 2,
              cannotMove: false
            }
          ],
          lane2: [],
          lane3: []
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      },
      player2: {
        name: 'Opponent',
        energy: 10,
        appliedUpgrades: {},
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      }
    };

    // Mock callbacks
    const mockLogCallback = vi.fn();

    // Mock context for movement
    mockContext = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      callbacks: {
        logCallback: mockLogCallback,
        resolveAttackCallback: vi.fn()
      },
      placedSections: {
        player1: ['Section_A', 'Section_B', 'Section_C'],
        player2: ['Section_X', 'Section_Y', 'Section_Z']
      }
    };

    // Mock card with SINGLE_MOVE effect
    mockCard = {
      id: 'CARD_TEST_MOVE',
      name: 'Test Move Card',
      effects: [{
        type: 'SINGLE_MOVE',
        properties: []
      }]
    };
  });

  describe('executeSingleMove - cannotMove restriction', () => {
    it('should return error when attempting to move drone with cannotMove flag', () => {
      // Set cannotMove flag on drone
      mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove = true;

      const droneToMove = mockPlayerStates.player1.dronesOnBoard.lane1[0];
      const fromLane = 'lane1';
      const toLane = 'lane2';
      const actingPlayerId = 'player1';
      const opponentPlayerId = 'player2';
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeSingleMove(
        mockCard,
        droneToMove,
        fromLane,
        toLane,
        actingPlayerId,
        newPlayerStates,
        opponentPlayerId,
        mockContext
      );

      // Verify error is returned
      expect(result.error).toBeDefined();
      expect(result.error).toContain('cannot move');
      expect(result.shouldShowErrorModal).toBe(true);
      expect(result.shouldCancelCardSelection).toBe(true);
      expect(result.shouldClearMultiSelectState).toBe(true);

      // Verify drone was NOT moved (remains in lane1)
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(1);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(0);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].id).toBe('drone_1');
    });

    it('should allow movement when cannotMove is false', () => {
      const droneToMove = mockPlayerStates.player1.dronesOnBoard.lane1[0];
      const fromLane = 'lane1';
      const toLane = 'lane2';
      const actingPlayerId = 'player1';
      const opponentPlayerId = 'player2';
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeSingleMove(
        mockCard,
        droneToMove,
        fromLane,
        toLane,
        actingPlayerId,
        newPlayerStates,
        opponentPlayerId,
        mockContext
      );

      // Verify no error
      expect(result.error).toBeUndefined();

      // Verify drone was moved to lane2
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(0);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(1);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2[0].id).toBe('drone_1');
    });

    it('should show drone name in error message', () => {
      mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove = true;
      mockPlayerStates.player1.dronesOnBoard.lane1[0].name = 'Talon';

      const droneToMove = mockPlayerStates.player1.dronesOnBoard.lane1[0];
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeSingleMove(
        mockCard,
        droneToMove,
        'lane1',
        'lane2',
        'player1',
        newPlayerStates,
        'player2',
        mockContext
      );

      expect(result.error).toContain('Talon');
      expect(result.error).toContain('cannot move');
    });
  });

  describe('executeMultiMove - cannotMove restriction', () => {
    it('should return error when attempting to move drone with cannotMove flag', () => {
      // Add multiple drones, one with cannotMove
      mockPlayerStates.player1.dronesOnBoard.lane1 = [
        {
          id: 'drone_1',
          name: 'Drone1',
          hull: 3,
          isExhausted: false,
          attack: 2,
          cannotMove: false
        },
        {
          id: 'drone_2',
          name: 'Drone2',
          hull: 3,
          isExhausted: false,
          attack: 2,
          cannotMove: true  // This drone cannot move
        }
      ];

      const dronesToMove = [mockPlayerStates.player1.dronesOnBoard.lane1[1]]; // Try to move drone_2
      const multiMoveCard = {
        ...mockCard,
        effects: [{ type: 'MULTI_MOVE', count: 3, properties: [] }]
      };
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeMultiMove(
        multiMoveCard,
        dronesToMove,
        'lane1',
        'lane2',
        'player1',
        newPlayerStates,
        'player2',
        mockContext
      );

      // Verify error is returned
      expect(result.error).toBeDefined();
      expect(result.error).toContain('cannot move');
      expect(result.shouldShowErrorModal).toBe(true);

      // Verify drones were NOT moved
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(2);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(0);
    });

    it('should allow movement when all drones have cannotMove false', () => {
      mockPlayerStates.player1.dronesOnBoard.lane1 = [
        {
          id: 'drone_1',
          name: 'Drone1',
          hull: 3,
          isExhausted: false,
          attack: 2,
          cannotMove: false
        },
        {
          id: 'drone_2',
          name: 'Drone2',
          hull: 3,
          isExhausted: false,
          attack: 2,
          cannotMove: false
        }
      ];

      const dronesToMove = mockPlayerStates.player1.dronesOnBoard.lane1;
      const multiMoveCard = {
        ...mockCard,
        effects: [{ type: 'MULTI_MOVE', count: 3, properties: [] }]
      };
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeMultiMove(
        multiMoveCard,
        dronesToMove,
        'lane1',
        'lane2',
        'player1',
        newPlayerStates,
        'player2',
        mockContext
      );

      // Verify no error
      expect(result.error).toBeUndefined();

      // Verify drones were moved
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(0);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(2);
    });

    it('should catch first drone with cannotMove in multi-move', () => {
      mockPlayerStates.player1.dronesOnBoard.lane1 = [
        {
          id: 'drone_1',
          name: 'AllowedDrone',
          hull: 3,
          isExhausted: false,
          attack: 2,
          cannotMove: false
        },
        {
          id: 'drone_2',
          name: 'BlockedDrone',
          hull: 3,
          isExhausted: false,
          attack: 2,
          cannotMove: true
        }
      ];

      const dronesToMove = mockPlayerStates.player1.dronesOnBoard.lane1; // Try to move both
      const multiMoveCard = {
        ...mockCard,
        effects: [{ type: 'MULTI_MOVE', count: 3, properties: [] }]
      };
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeMultiMove(
        multiMoveCard,
        dronesToMove,
        'lane1',
        'lane2',
        'player1',
        newPlayerStates,
        'player2',
        mockContext
      );

      // Verify error contains the blocked drone's name
      expect(result.error).toContain('BlockedDrone');
      expect(result.error).toContain('cannot move');
    });
  });

  describe('Edge cases', () => {
    it('should handle drone without cannotMove property (undefined)', () => {
      // Remove cannotMove property entirely
      const droneWithoutProperty = {
        id: 'drone_1',
        name: 'TestDrone1',
        hull: 3,
        isExhausted: false,
        attack: 2
        // No cannotMove property
      };
      mockPlayerStates.player1.dronesOnBoard.lane1[0] = droneWithoutProperty;

      const droneToMove = mockPlayerStates.player1.dronesOnBoard.lane1[0];
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeSingleMove(
        mockCard,
        droneToMove,
        'lane1',
        'lane2',
        'player1',
        newPlayerStates,
        'player2',
        mockContext
      );

      // Should allow movement (undefined treated as false)
      expect(result.error).toBeUndefined();
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(1);
    });
  });

  describe('postMovementState capture', () => {
    it('executeSingleMove returns postMovementState with pre-trigger board state', () => {
      const droneToMove = mockPlayerStates.player1.dronesOnBoard.lane1[0];
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeSingleMove(
        mockCard,
        droneToMove,
        'lane1',
        'lane2',
        'player1',
        newPlayerStates,
        'player2',
        mockContext
      );

      expect(result.error).toBeUndefined();
      expect(result.postMovementState).toBeDefined();
      // postMovementState should show drone in lane2 (post-move, pre-trigger)
      expect(result.postMovementState.player1.dronesOnBoard.lane2).toHaveLength(1);
      expect(result.postMovementState.player1.dronesOnBoard.lane2[0].id).toBe('drone_1');
      expect(result.postMovementState.player1.dronesOnBoard.lane1).toHaveLength(0);
    });

    it('executeMultiMove returns postMovementState with pre-trigger board state', () => {
      mockPlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'drone_1', name: 'Drone1', hull: 3, isExhausted: false, attack: 2, cannotMove: false },
        { id: 'drone_2', name: 'Drone2', hull: 3, isExhausted: false, attack: 2, cannotMove: false }
      ];

      const dronesToMove = mockPlayerStates.player1.dronesOnBoard.lane1;
      const multiMoveCard = { ...mockCard, effects: [{ type: 'MULTI_MOVE', count: 3, properties: [] }] };
      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeMultiMove(
        multiMoveCard,
        dronesToMove,
        'lane1',
        'lane2',
        'player1',
        newPlayerStates,
        'player2',
        mockContext
      );

      expect(result.error).toBeUndefined();
      expect(result.postMovementState).toBeDefined();
      expect(result.postMovementState.player1.dronesOnBoard.lane2).toHaveLength(2);
      expect(result.postMovementState.player1.dronesOnBoard.lane1).toHaveLength(0);
    });
  });

  describe('ON_LANE_MOVEMENT_IN fires for enemy force-moves', () => {
    it('should successfully force-move an enemy drone into a new lane', () => {
      // Set up: player1 is acting player, moving player2's drone (enemy force-move)
      const enemyDrone = {
        id: 'enemy_drone_1',
        name: 'EnemyDrone',
        hull: 3,
        isExhausted: false,
        attack: 2,
        cannotMove: false,
        owner: 'player2'
      };

      mockPlayerStates.player2.dronesOnBoard.lane1 = [enemyDrone];
      mockPlayerStates.player2.dronesOnBoard.lane2 = [];

      const enemyMoveCard = {
        id: 'CARD_ENEMY_MOVE',
        name: 'Enemy Move Card',
        effects: [{ type: 'SINGLE_MOVE', properties: ['DO_NOT_EXHAUST'] }]
      };

      const newPlayerStates = processor.clonePlayerStates(mockPlayerStates);

      const result = processor.executeSingleMove(
        enemyMoveCard,
        enemyDrone,
        'lane1',
        'lane2',
        'player1',       // actingPlayerId (the one who played the card)
        newPlayerStates,
        'player2',        // opponentPlayerId
        mockContext
      );

      expect(result.error).toBeUndefined();
      // The drone ended up in lane2 (movement succeeded)
      expect(result.newPlayerStates.player2.dronesOnBoard.lane2).toHaveLength(1);
      expect(result.newPlayerStates.player2.dronesOnBoard.lane1).toHaveLength(0);
      // postMovementState should also be captured
      expect(result.postMovementState).toBeDefined();
    });
  });
});
