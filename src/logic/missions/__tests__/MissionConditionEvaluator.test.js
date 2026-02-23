/**
 * MissionConditionEvaluator.test.js
 * TDD tests for mission condition evaluation
 *
 * These tests define the expected behavior of the condition evaluator
 * which determines mission progress based on game events.
 */

import { describe, it, expect } from 'vitest';
import MissionConditionEvaluator from '../MissionConditionEvaluator.js';
import { MISSION_CONDITIONS } from '../../../data/missionData.js';

describe('MissionConditionEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new MissionConditionEvaluator();
  });

  describe('VISIT_SCREEN condition', () => {
    it('should return 1 when screen matches', () => {
      const condition = {
        type: MISSION_CONDITIONS.VISIT_SCREEN,
        screen: 'inventory',
      };

      const result = evaluator.evaluateProgress(condition, 'SCREEN_VISIT', { screen: 'inventory' });
      expect(result).toBe(1);
    });

    it('should return 0 when screen does not match', () => {
      const condition = {
        type: MISSION_CONDITIONS.VISIT_SCREEN,
        screen: 'inventory',
      };

      const result = evaluator.evaluateProgress(condition, 'SCREEN_VISIT', { screen: 'shop' });
      expect(result).toBe(0);
    });

    it('should return 0 for wrong event type', () => {
      const condition = {
        type: MISSION_CONDITIONS.VISIT_SCREEN,
        screen: 'inventory',
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', {});
      expect(result).toBe(0);
    });
  });

  describe('WIN_COMBATS condition', () => {
    it('should return 1 on COMBAT_WIN event', () => {
      const condition = {
        type: MISSION_CONDITIONS.WIN_COMBATS,
        count: 10,
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', {});
      expect(result).toBe(1);
    });

    it('should return 0 for non-combat events', () => {
      const condition = {
        type: MISSION_CONDITIONS.WIN_COMBATS,
        count: 10,
      };

      const result = evaluator.evaluateProgress(condition, 'SCREEN_VISIT', {});
      expect(result).toBe(0);
    });
  });

  describe('DESTROY_DRONES condition', () => {
    it('should return count from event data', () => {
      const condition = {
        type: MISSION_CONDITIONS.DESTROY_DRONES,
        count: 25,
      };

      const result = evaluator.evaluateProgress(condition, 'DRONE_DESTROYED', { count: 3 });
      expect(result).toBe(3);
    });

    it('should return 1 if no count specified in event', () => {
      const condition = {
        type: MISSION_CONDITIONS.DESTROY_DRONES,
        count: 25,
      };

      const result = evaluator.evaluateProgress(condition, 'DRONE_DESTROYED', {});
      expect(result).toBe(1);
    });

    it('should return 0 for wrong event type', () => {
      const condition = {
        type: MISSION_CONDITIONS.DESTROY_DRONES,
        count: 25,
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', {});
      expect(result).toBe(0);
    });
  });

  describe('COMPLETE_EXTRACTIONS condition', () => {
    it('should return 1 on EXTRACTION_COMPLETE event', () => {
      const condition = {
        type: MISSION_CONDITIONS.COMPLETE_EXTRACTIONS,
        count: 5,
      };

      const result = evaluator.evaluateProgress(condition, 'EXTRACTION_COMPLETE', {});
      expect(result).toBe(1);
    });

    it('should return 0 for non-extraction events', () => {
      const condition = {
        type: MISSION_CONDITIONS.COMPLETE_EXTRACTIONS,
        count: 5,
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', {});
      expect(result).toBe(0);
    });
  });

  describe('COLLECT_CREDITS condition', () => {
    it('should return amount from event data', () => {
      const condition = {
        type: MISSION_CONDITIONS.COLLECT_CREDITS,
        count: 1000,
      };

      const result = evaluator.evaluateProgress(condition, 'CREDITS_EARNED', { amount: 150 });
      expect(result).toBe(150);
    });

    it('should return 0 if no amount in event', () => {
      const condition = {
        type: MISSION_CONDITIONS.COLLECT_CREDITS,
        count: 1000,
      };

      const result = evaluator.evaluateProgress(condition, 'CREDITS_EARNED', {});
      expect(result).toBe(0);
    });

    it('should return 0 for wrong event type', () => {
      const condition = {
        type: MISSION_CONDITIONS.COLLECT_CREDITS,
        count: 1000,
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', {});
      expect(result).toBe(0);
    });
  });

  describe('VISIT_POI condition', () => {
    it('should return 1 on POI_VISITED event', () => {
      const condition = {
        type: MISSION_CONDITIONS.VISIT_POI,
        count: 10,
      };

      const result = evaluator.evaluateProgress(condition, 'POI_VISITED', {});
      expect(result).toBe(1);
    });

    it('should return 0 for wrong event type', () => {
      const condition = {
        type: MISSION_CONDITIONS.VISIT_POI,
        count: 10,
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', {});
      expect(result).toBe(0);
    });
  });

  describe('CRAFT_ITEM condition', () => {
    it('should return 1 on ITEM_CRAFTED event', () => {
      const condition = {
        type: MISSION_CONDITIONS.CRAFT_ITEM,
        count: 1,
      };

      const result = evaluator.evaluateProgress(condition, 'ITEM_CRAFTED', {});
      expect(result).toBe(1);
    });

    it('should return 0 for wrong event type', () => {
      const condition = {
        type: MISSION_CONDITIONS.CRAFT_ITEM,
        count: 1,
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', {});
      expect(result).toBe(0);
    });
  });

  describe('Unknown condition type', () => {
    it('should return 0 for unknown condition type', () => {
      const condition = {
        type: 'UNKNOWN_CONDITION',
        count: 1,
      };

      const result = evaluator.evaluateProgress(condition, 'SOME_EVENT', {});
      expect(result).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle null event data', () => {
      const condition = {
        type: MISSION_CONDITIONS.WIN_COMBATS,
        count: 1,
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', null);
      expect(result).toBe(1);
    });

    it('should handle undefined event data', () => {
      const condition = {
        type: MISSION_CONDITIONS.WIN_COMBATS,
        count: 1,
      };

      const result = evaluator.evaluateProgress(condition, 'COMBAT_WIN', undefined);
      expect(result).toBe(1);
    });
  });
});
