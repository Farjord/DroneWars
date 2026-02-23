import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ========================================
// FORCE WIN TESTS
// ========================================
// TDD tests for the Force Win dev feature.
// This feature allows developers to quickly win combat
// for testing extraction mode flows.
//
// REFACTORED: ForceWin now routes through ActionProcessor
// to avoid architecture violations.

import { forceWinCombat } from '../ForceWin.js';
import gameStateManager from '../../../managers/GameStateManager.js';

// Mock GameStateManager
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    actionProcessor: {
      processForceWin: vi.fn()
    }
  }
}));

describe('forceWinCombat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call ActionProcessor.processForceWin', () => {
    // ACT: Call forceWinCombat
    forceWinCombat();

    // ASSERT: ActionProcessor.processForceWin was called
    expect(gameStateManager.actionProcessor.processForceWin).toHaveBeenCalled();
  });

  it('should not accept any parameters (stateless)', () => {
    // ACT: Call with no params
    forceWinCombat();

    // ASSERT: processForceWin was called with no arguments
    expect(gameStateManager.actionProcessor.processForceWin).toHaveBeenCalledWith();
  });

  it('should delegate all logic to ActionProcessor', () => {
    // This test verifies that ForceWin is a thin wrapper
    // All actual logic (damaging sections, logging, win check) is in ActionProcessor

    forceWinCombat();

    // Only one call should be made
    expect(gameStateManager.actionProcessor.processForceWin).toHaveBeenCalledTimes(1);
  });
});
