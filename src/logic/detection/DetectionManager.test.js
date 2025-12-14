// ========================================
// DETECTION MANAGER TESTS
// ========================================
// TDD tests for detection clamping behavior

import { describe, it, expect, vi, beforeEach } from 'vitest';
import gameStateManager from '../../managers/GameStateManager.js';

// Import the actual DetectionManager (not mocked)
import DetectionManager from './DetectionManager.js';

// Mock gameStateManager
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    endRun: vi.fn()
  }
}));

describe('DetectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addDetection', () => {
    it('should clamp detection to minimum of 0 when reducing', () => {
      gameStateManager.getState.mockReturnValue({
        currentRunState: { detection: 9 }
      });

      DetectionManager.addDetection(-20, 'Signal Dampener');

      expect(gameStateManager.setState).toHaveBeenCalledWith({
        currentRunState: {
          detection: 0  // Should be 0, not -11
        }
      });
    });

    it('should clamp detection to maximum of 100 when increasing', () => {
      gameStateManager.getState.mockReturnValue({
        currentRunState: { detection: 95 }
      });

      DetectionManager.addDetection(10, 'Combat ended');

      expect(gameStateManager.setState).toHaveBeenCalledWith({
        currentRunState: {
          detection: 100  // Should be 100, not 105
        }
      });
    });

    it('should allow normal increases within range', () => {
      gameStateManager.getState.mockReturnValue({
        currentRunState: { detection: 50 }
      });

      DetectionManager.addDetection(10, 'Movement');

      expect(gameStateManager.setState).toHaveBeenCalledWith({
        currentRunState: {
          detection: 60
        }
      });
    });

    it('should allow normal decreases within range', () => {
      gameStateManager.getState.mockReturnValue({
        currentRunState: { detection: 50 }
      });

      DetectionManager.addDetection(-20, 'Signal Dampener');

      expect(gameStateManager.setState).toHaveBeenCalledWith({
        currentRunState: {
          detection: 30
        }
      });
    });

    it('should not call setState when no active run', () => {
      gameStateManager.getState.mockReturnValue({
        currentRunState: null
      });

      DetectionManager.addDetection(10, 'Test');

      expect(gameStateManager.setState).not.toHaveBeenCalled();
    });
  });
});
