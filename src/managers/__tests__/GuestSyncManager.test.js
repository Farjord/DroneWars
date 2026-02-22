/**
 * GuestSyncManager Tests
 * Tests for P2P guest sync methods extracted from GameStateManager
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('./OptimisticActionService.js', () => ({
  default: class {
    trackAction = vi.fn();
    filterAnimations = vi.fn((a, s) => ({ actionAnimations: a, systemAnimations: s }));
    getStatus = vi.fn(() => ({ actionAnimationsTracked: 0, systemAnimationsTracked: 0 }));
    clearTrackedAnimations = vi.fn();
  }
}));

import { debugLog } from '../../utils/debugLogger.js';

// Minimal GSM stub
function createMockGSM(overrides = {}) {
  return {
    state: { gameMode: 'guest', turnPhase: null },
    setState: vi.fn(),
    emit: vi.fn(),
    actionProcessor: {
      setP2PManager: vi.fn(),
      phaseAnimationQueue: null,
    },
    ...overrides,
  };
}

const { default: GuestSyncManager } = await import('../GuestSyncManager.js');

describe('GuestSyncManager', () => {
  let manager;
  let mockGSM;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGSM = createMockGSM();
    manager = new GuestSyncManager(mockGSM);
  });

  describe('isMilestonePhase', () => {
    const milestonePhases = ['droneSelection', 'placement', 'mandatoryDiscard', 'optionalDiscard', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'];
    const nonMilestonePhases = ['action', 'draw', 'energyReset', 'gameEnd', 'roundEnd'];

    test('returns true for milestone phases', () => {
      for (const phase of milestonePhases) {
        expect(manager.isMilestonePhase(phase)).toBe(true);
      }
    });

    test('returns false for non-milestone phases', () => {
      for (const phase of nonMilestonePhases) {
        expect(manager.isMilestonePhase(phase)).toBe(false);
      }
    });
  });

  describe('shouldValidateBroadcast', () => {
    test('returns true when validating and phase matches', () => {
      manager.startValidation('deployment', { turnPhase: 'action' });

      expect(manager.shouldValidateBroadcast('deployment')).toBe(true);
    });

    test('returns false when not validating', () => {
      expect(manager.shouldValidateBroadcast('deployment')).toBe(false);
    });

    test('returns false when phase does not match', () => {
      manager.startValidation('deployment', { turnPhase: 'action' });

      expect(manager.shouldValidateBroadcast('action')).toBe(false);
    });
  });

  describe('startValidation', () => {
    test('sets validatingState correctly', () => {
      const guestState = { turnPhase: 'action', player1: {} };

      manager.startValidation('deployment', guestState);

      expect(manager.validatingState.isValidating).toBe(true);
      expect(manager.validatingState.targetPhase).toBe('deployment');
      expect(manager.validatingState.guestState).toEqual(guestState);
      expect(manager.validatingState.timestamp).toBeGreaterThan(0);
    });

    test('deep copies guest state', () => {
      const guestState = { turnPhase: 'action', nested: { value: 1 } };

      manager.startValidation('deployment', guestState);

      // Mutating original should not affect stored copy
      guestState.nested.value = 999;
      expect(manager.validatingState.guestState.nested.value).toBe(1);
    });
  });

  describe('applyHostState', () => {
    test('overwrites GSM state and preserves gameMode', () => {
      const hostState = { turnPhase: 'deployment', player1: {}, player2: {}, currentPlayer: 'player1' };

      manager.applyHostState(hostState);

      // Should directly set gsm.state
      expect(mockGSM.state.turnPhase).toBe('deployment');
      expect(mockGSM.state.gameMode).toBe('guest');
    });

    test('emits HOST_STATE_UPDATE event', () => {
      const hostState = { turnPhase: 'deployment' };

      manager.applyHostState(hostState);

      expect(mockGSM.emit).toHaveBeenCalledWith('HOST_STATE_UPDATE', { hostState });
    });

    test('skips if not in guest mode', () => {
      mockGSM.state.gameMode = 'host';

      manager.applyHostState({ turnPhase: 'deployment' });

      expect(mockGSM.emit).not.toHaveBeenCalled();
    });
  });
});
