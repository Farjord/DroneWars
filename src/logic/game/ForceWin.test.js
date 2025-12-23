import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// FORCE WIN TESTS
// ========================================
// TDD tests for the Force Win dev feature.
// This feature allows developers to quickly win combat
// for testing extraction mode flows.

import { forceWinCombat } from './ForceWin.js';
import winConditionChecker from './WinConditionChecker.js';

// Mock WinConditionChecker
vi.mock('./WinConditionChecker.js', () => ({
  default: {
    checkGameStateForWinner: vi.fn()
  }
}));

describe('forceWinCombat', () => {
  let mockPlayer1State;
  let mockPlayer2State;
  let mockCallbacks;
  let mockUpdatePlayerState;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mock player states with ship sections
    mockPlayer1State = {
      shipSections: {
        bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 6, critical: 3 } },
        powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 6, critical: 3 } },
        droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 6, critical: 3 } }
      }
    };

    mockPlayer2State = {
      shipSections: {
        bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 6, critical: 3 } },
        powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 6, critical: 3 } },
        droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 6, critical: 3 } }
      }
    };

    mockUpdatePlayerState = vi.fn();

    mockCallbacks = {
      logCallback: vi.fn(),
      setWinnerCallback: vi.fn(),
      showWinnerModalCallback: vi.fn()
    };
  });

  it('should set all opponent ship sections to hull = 0', () => {
    forceWinCombat({
      player1State: mockPlayer1State,
      player2State: mockPlayer2State,
      updatePlayerState: mockUpdatePlayerState,
      callbacks: mockCallbacks
    });

    // Verify updatePlayerState was called with player2 and damaged sections
    expect(mockUpdatePlayerState).toHaveBeenCalledWith('player2', expect.objectContaining({
      shipSections: expect.objectContaining({
        bridge: expect.objectContaining({ hull: 0 }),
        powerCell: expect.objectContaining({ hull: 0 }),
        droneControlHub: expect.objectContaining({ hull: 0 })
      })
    }));
  });

  it('should preserve other ship section properties when setting hull to 0', () => {
    forceWinCombat({
      player1State: mockPlayer1State,
      player2State: mockPlayer2State,
      updatePlayerState: mockUpdatePlayerState,
      callbacks: mockCallbacks
    });

    const updateCall = mockUpdatePlayerState.mock.calls[0];
    const updatedSections = updateCall[1].shipSections;

    // Verify maxHull and thresholds are preserved
    expect(updatedSections.bridge.maxHull).toBe(10);
    expect(updatedSections.bridge.thresholds).toEqual({ damaged: 6, critical: 3 });
    expect(updatedSections.powerCell.maxHull).toBe(10);
    expect(updatedSections.droneControlHub.maxHull).toBe(10);
  });

  it('should trigger win condition check after damaging opponent', () => {
    forceWinCombat({
      player1State: mockPlayer1State,
      player2State: mockPlayer2State,
      updatePlayerState: mockUpdatePlayerState,
      callbacks: mockCallbacks
    });

    // Verify win condition checker was called
    expect(winConditionChecker.checkGameStateForWinner).toHaveBeenCalled();
  });

  it('should pass player states and callbacks to win condition checker', () => {
    forceWinCombat({
      player1State: mockPlayer1State,
      player2State: mockPlayer2State,
      updatePlayerState: mockUpdatePlayerState,
      callbacks: mockCallbacks
    });

    // Get the call arguments
    const callArgs = winConditionChecker.checkGameStateForWinner.mock.calls[0];

    // First arg should be playerStates object
    expect(callArgs[0]).toHaveProperty('player1');
    expect(callArgs[0]).toHaveProperty('player2');

    // Second arg should be callbacks
    expect(callArgs[1]).toBe(mockCallbacks);
  });

  it('should use damaged opponent state for win condition check', () => {
    forceWinCombat({
      player1State: mockPlayer1State,
      player2State: mockPlayer2State,
      updatePlayerState: mockUpdatePlayerState,
      callbacks: mockCallbacks
    });

    const callArgs = winConditionChecker.checkGameStateForWinner.mock.calls[0];
    const playerStates = callArgs[0];

    // Player2 in the win check should have hull = 0 on all sections
    expect(playerStates.player2.shipSections.bridge.hull).toBe(0);
    expect(playerStates.player2.shipSections.powerCell.hull).toBe(0);
    expect(playerStates.player2.shipSections.droneControlHub.hull).toBe(0);
  });

  it('should add a log entry for the force win action', () => {
    forceWinCombat({
      player1State: mockPlayer1State,
      player2State: mockPlayer2State,
      updatePlayerState: mockUpdatePlayerState,
      callbacks: mockCallbacks
    });

    expect(mockCallbacks.logCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        player: 'SYSTEM',
        actionType: 'DEV_ACTION'
      }),
      'forceWin'
    );
  });
});
