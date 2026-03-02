/**
 * TokenCreationProcessor - Lane Capacity Tests
 * TDD: Tests for MAX_DRONES_PER_LANE enforcement in token creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import TokenCreationProcessor from '../TokenCreationProcessor.js';

describe('TokenCreationProcessor - lane capacity limit', () => {
  let processor;
  let mockContext;

  const makeDrones = (count, name = 'Dart') =>
    Array.from({ length: count }, (_, i) => ({
      id: `${name}_${i}`,
      name,
      hull: 2,
      isExhausted: false,
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new TokenCreationProcessor();

    mockContext = {
      actingPlayerId: 'player1',
      playerStates: {
        player1: {
          name: 'Player',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          totalDronesDeployed: 0,
        },
        player2: {
          name: 'Opponent',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          totalDronesDeployed: 0,
        },
      },
      callbacks: { logCallback: vi.fn() },
      card: { name: 'Deploy Mine', instanceId: 'card_1' },
    };
  });

  it('should skip token creation in a full lane', () => {
    // Fill opponent's lane1 to capacity
    mockContext.playerStates.player2.dronesOnBoard.lane1 = makeDrones(5);

    const effect = {
      type: 'CREATE_TOKENS',
      tokenName: 'Thruster Inhibitor',
      targetOwner: 'OPPONENT',
      locations: ['lane1'],
    };

    const result = processor.process(effect, mockContext);

    // No token should be created
    expect(result.newPlayerStates.player2.dronesOnBoard.lane1).toHaveLength(5);
    expect(result.animationEvents).toHaveLength(0);
    // Should log TOKEN_BLOCKED
    expect(mockContext.callbacks.logCallback).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'TOKEN_BLOCKED' })
    );
  });

  it('should create token in non-full lane', () => {
    mockContext.playerStates.player2.dronesOnBoard.lane1 = makeDrones(4);

    const effect = {
      type: 'CREATE_TOKENS',
      tokenName: 'Thruster Inhibitor',
      targetOwner: 'OPPONENT',
      locations: ['lane1'],
    };

    const result = processor.process(effect, mockContext);

    expect(result.newPlayerStates.player2.dronesOnBoard.lane1).toHaveLength(5);
    expect(result.animationEvents).toHaveLength(1);
  });

  it('should handle multi-lane token with one full lane (Deploy Thruster Inhibitors)', () => {
    // lane1 full, lane2 and lane3 have room
    mockContext.playerStates.player2.dronesOnBoard.lane1 = makeDrones(5);
    mockContext.playerStates.player2.dronesOnBoard.lane2 = makeDrones(2);
    mockContext.playerStates.player2.dronesOnBoard.lane3 = makeDrones(1);

    const effect = {
      type: 'CREATE_TOKENS',
      tokenName: 'Thruster Inhibitor',
      targetOwner: 'OPPONENT',
      locations: ['lane1', 'lane2', 'lane3'],
    };

    const result = processor.process(effect, mockContext);

    // lane1 blocked, lane2 and lane3 get tokens
    expect(result.newPlayerStates.player2.dronesOnBoard.lane1).toHaveLength(5);
    expect(result.newPlayerStates.player2.dronesOnBoard.lane2).toHaveLength(3);
    expect(result.newPlayerStates.player2.dronesOnBoard.lane3).toHaveLength(2);
    expect(result.animationEvents).toHaveLength(2);
  });

  it('should create no tokens when all lanes are full', () => {
    mockContext.playerStates.player2.dronesOnBoard.lane1 = makeDrones(5);
    mockContext.playerStates.player2.dronesOnBoard.lane2 = makeDrones(5);
    mockContext.playerStates.player2.dronesOnBoard.lane3 = makeDrones(5);

    const effect = {
      type: 'CREATE_TOKENS',
      tokenName: 'Thruster Inhibitor',
      targetOwner: 'OPPONENT',
      locations: ['lane1', 'lane2', 'lane3'],
    };

    const result = processor.process(effect, mockContext);

    expect(result.animationEvents).toHaveLength(0);
  });

  it('should check capacity before maxPerLane (both can block independently)', () => {
    // Lane is full, AND maxPerLane would also block — capacity check fires first
    mockContext.playerStates.player2.dronesOnBoard.lane1 = [
      ...makeDrones(4),
      { id: 'jammer_0', name: 'Thruster Inhibitor', hull: 1, isToken: true }, // already has one Jammer
    ];

    const effect = {
      type: 'CREATE_TOKENS',
      tokenName: 'Thruster Inhibitor',
      targetOwner: 'OPPONENT',
      locations: ['lane1'],
    };

    const result = processor.process(effect, mockContext);

    // Should be blocked by capacity (5 drones), not maxPerLane
    expect(result.newPlayerStates.player2.dronesOnBoard.lane1).toHaveLength(5);
    expect(mockContext.callbacks.logCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'TOKEN_BLOCKED',
        outcome: expect.stringContaining('full'),
      })
    );
  });
});
