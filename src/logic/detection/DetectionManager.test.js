// ========================================
// DETECTION MANAGER TESTS
// ========================================
// TDD tests for detection clamping behavior

import { describe, it, expect, vi, beforeEach } from 'vitest';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import gameStateManager from '../../managers/GameStateManager.js';

// Import the actual DetectionManager (not mocked)
import DetectionManager from './DetectionManager.js';

// Mock tacticalMapStateManager
vi.mock('../../managers/TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn()
  }
}));

// Mock gameStateManager (for MIA trigger)
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    endRun: vi.fn(),
    setState: vi.fn()
  }
}));

describe('DetectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addDetection', () => {
    it('should clamp detection to minimum of 0 when reducing', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        detection: 9
      });

      DetectionManager.addDetection(-20, 'Signal Dampener');

      expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
        detection: 0  // Should be 0, not -11
      });
    });

    it('should clamp detection to maximum of 100 when increasing', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        detection: 95
      });

      DetectionManager.addDetection(10, 'Combat ended');

      expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
        detection: 100  // Should be 100, not 105
      });
    });

    it('should allow normal increases within range', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        detection: 50
      });

      DetectionManager.addDetection(10, 'Movement');

      expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
        detection: 60
      });
    });

    it('should allow normal decreases within range', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        detection: 50
      });

      DetectionManager.addDetection(-20, 'Signal Dampener');

      expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
        detection: 30
      });
    });

    it('should not call setState when no active run', () => {
      tacticalMapStateManager.getState.mockReturnValue(null);

      DetectionManager.addDetection(10, 'Test');

      expect(tacticalMapStateManager.setState).not.toHaveBeenCalled();
    });
  });
});
