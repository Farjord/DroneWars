// ========================================
// INCREASE THREAT EFFECT PROCESSOR TESTS
// ========================================
// TDD tests for the INCREASE_THREAT effect
// Increases player threat/detection in Extraction mode

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DetectionManager before importing the processor
vi.mock('../../detection/DetectionManager.js', () => ({
  default: { addDetection: vi.fn() }
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

import IncreaseThreatEffectProcessor from './IncreaseThreatEffectProcessor.js';
import DetectionManager from '../../detection/DetectionManager.js';

describe('IncreaseThreatEffectProcessor', () => {
  let processor;
  let mockContext;
  let mockPlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new IncreaseThreatEffectProcessor();

    mockPlayerStates = {
      player1: { energy: 5, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
      player2: { energy: 5, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
    };

    mockContext = {
      actingPlayerId: 'player2',
      playerStates: mockPlayerStates,
      sourceDroneName: 'Signal Beacon'
    };
  });

  describe('Core Functionality', () => {
    it('should call DetectionManager.addDetection with effect value', () => {
      const effect = { type: 'INCREASE_THREAT', value: 5 };

      processor.process(effect, mockContext);

      expect(DetectionManager.addDetection).toHaveBeenCalledWith(5, expect.any(String));
    });

    it('should default to value of 1 if not specified', () => {
      const effect = { type: 'INCREASE_THREAT' };

      processor.process(effect, mockContext);

      expect(DetectionManager.addDetection).toHaveBeenCalledWith(1, expect.any(String));
    });

    it('should handle value of 0 (no threat increase)', () => {
      const effect = { type: 'INCREASE_THREAT', value: 0 };

      processor.process(effect, mockContext);

      expect(DetectionManager.addDetection).toHaveBeenCalledWith(0, expect.any(String));
    });
  });

  describe('Return Value', () => {
    it('should return unmodified playerStates', () => {
      const effect = { type: 'INCREASE_THREAT', value: 3 };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates).toBeDefined();
      expect(result.newPlayerStates.player1).toEqual(mockPlayerStates.player1);
      expect(result.newPlayerStates.player2).toEqual(mockPlayerStates.player2);
    });

    it('should return empty animationEvents array', () => {
      const effect = { type: 'INCREASE_THREAT', value: 2 };

      const result = processor.process(effect, mockContext);

      expect(result.animationEvents).toBeDefined();
      expect(result.animationEvents).toEqual([]);
    });

    it('should return empty additionalEffects array', () => {
      const effect = { type: 'INCREASE_THREAT', value: 2 };

      const result = processor.process(effect, mockContext);

      expect(result.additionalEffects).toBeDefined();
      expect(result.additionalEffects).toEqual([]);
    });
  });

  describe('Reason String', () => {
    it('should include source drone name in reason string', () => {
      const effect = { type: 'INCREASE_THREAT', value: 2 };

      processor.process(effect, mockContext);

      expect(DetectionManager.addDetection).toHaveBeenCalledWith(
        2,
        expect.stringContaining('Signal Beacon')
      );
    });

    it('should include source card name when provided', () => {
      const contextWithCard = {
        ...mockContext,
        sourceDroneName: undefined,
        card: { name: 'Distress Signal' }
      };
      const effect = { type: 'INCREASE_THREAT', value: 5 };

      processor.process(effect, contextWithCard);

      expect(DetectionManager.addDetection).toHaveBeenCalledWith(
        5,
        expect.stringContaining('Distress Signal')
      );
    });

    it('should use fallback reason when no source name provided', () => {
      const contextNoSource = {
        actingPlayerId: 'player2',
        playerStates: mockPlayerStates
      };
      const effect = { type: 'INCREASE_THREAT', value: 1 };

      processor.process(effect, contextNoSource);

      expect(DetectionManager.addDetection).toHaveBeenCalledWith(1, expect.any(String));
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing playerStates gracefully', () => {
      const contextNoStates = {
        actingPlayerId: 'player2'
      };
      const effect = { type: 'INCREASE_THREAT', value: 1 };

      // Should not throw
      expect(() => processor.process(effect, contextNoStates)).not.toThrow();
    });

    it('should work when called from player1 (player drones with threat effects)', () => {
      const player1Context = {
        ...mockContext,
        actingPlayerId: 'player1'
      };
      const effect = { type: 'INCREASE_THREAT', value: 3 };

      processor.process(effect, player1Context);

      expect(DetectionManager.addDetection).toHaveBeenCalledWith(3, expect.any(String));
    });
  });
});
