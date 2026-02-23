import { describe, it, expect, beforeEach, vi } from 'vitest';

// ========================================
// HIGH ALERT MANAGER TESTS
// ========================================
// TDD tests for the High Alert mechanic.
// When a player wins combat at a PoI during salvage, the PoI
// enters "High Alert" state with increased encounter chance.

import HighAlertManager from '../HighAlertManager.js';

describe('HighAlertManager', () => {
  let mockRunState;

  beforeEach(() => {
    mockRunState = {
      highAlertPOIs: []
    };
  });

  // ========================================
  // ADD HIGH ALERT TESTS
  // ========================================

  describe('addHighAlert()', () => {
    it('should add PoI to highAlertPOIs with random 5-15% bonus', () => {
      const poi = { q: 2, r: -1 };

      const result = HighAlertManager.addHighAlert(mockRunState, poi);

      expect(result.highAlertPOIs).toHaveLength(1);
      expect(result.highAlertPOIs[0].q).toBe(2);
      expect(result.highAlertPOIs[0].r).toBe(-1);
      expect(result.highAlertPOIs[0].alertBonus).toBeGreaterThanOrEqual(0.05);
      expect(result.highAlertPOIs[0].alertBonus).toBeLessThanOrEqual(0.15);
    });

    it('should not add duplicate entries for same PoI', () => {
      const poi = { q: 2, r: -1 };

      // Add first time
      const result1 = HighAlertManager.addHighAlert(mockRunState, poi);
      // Add second time (same PoI)
      const result2 = HighAlertManager.addHighAlert(result1, poi);

      expect(result2.highAlertPOIs).toHaveLength(1);
    });

    it('should preserve existing high alert POIs when adding new one', () => {
      const existingPoi = { q: 0, r: 0, alertBonus: 0.10 };
      mockRunState.highAlertPOIs = [existingPoi];

      const newPoi = { q: 3, r: 2 };
      const result = HighAlertManager.addHighAlert(mockRunState, newPoi);

      expect(result.highAlertPOIs).toHaveLength(2);
      expect(result.highAlertPOIs[0]).toEqual(existingPoi);
    });

    it('should handle undefined highAlertPOIs array', () => {
      const runStateWithoutArray = {};
      const poi = { q: 1, r: 1 };

      const result = HighAlertManager.addHighAlert(runStateWithoutArray, poi);

      expect(result.highAlertPOIs).toHaveLength(1);
    });
  });

  // ========================================
  // GET ALERT BONUS TESTS
  // ========================================

  describe('getAlertBonus()', () => {
    it('should return alert bonus for a PoI in high alert', () => {
      mockRunState.highAlertPOIs = [
        { q: 2, r: -1, alertBonus: 0.12 }
      ];
      const poi = { q: 2, r: -1 };

      const bonus = HighAlertManager.getAlertBonus(mockRunState, poi);

      expect(bonus).toBe(0.12);
    });

    it('should return 0 bonus for PoI not in high alert', () => {
      mockRunState.highAlertPOIs = [
        { q: 2, r: -1, alertBonus: 0.12 }
      ];
      const poi = { q: 5, r: 5 }; // Different PoI

      const bonus = HighAlertManager.getAlertBonus(mockRunState, poi);

      expect(bonus).toBe(0);
    });

    it('should return 0 when highAlertPOIs is empty', () => {
      const poi = { q: 2, r: -1 };

      const bonus = HighAlertManager.getAlertBonus(mockRunState, poi);

      expect(bonus).toBe(0);
    });

    it('should return 0 when highAlertPOIs is undefined', () => {
      const runStateWithoutArray = {};
      const poi = { q: 2, r: -1 };

      const bonus = HighAlertManager.getAlertBonus(runStateWithoutArray, poi);

      expect(bonus).toBe(0);
    });
  });

  // ========================================
  // IS HIGH ALERT TESTS
  // ========================================

  describe('isHighAlert()', () => {
    it('should return true for PoI in high alert', () => {
      mockRunState.highAlertPOIs = [
        { q: 2, r: -1, alertBonus: 0.12 }
      ];
      const poi = { q: 2, r: -1 };

      const result = HighAlertManager.isHighAlert(mockRunState, poi);

      expect(result).toBe(true);
    });

    it('should return false for PoI not in high alert', () => {
      mockRunState.highAlertPOIs = [
        { q: 2, r: -1, alertBonus: 0.12 }
      ];
      const poi = { q: 5, r: 5 };

      const result = HighAlertManager.isHighAlert(mockRunState, poi);

      expect(result).toBe(false);
    });

    it('should return false when no high alert POIs exist', () => {
      const poi = { q: 2, r: -1 };

      const result = HighAlertManager.isHighAlert(mockRunState, poi);

      expect(result).toBe(false);
    });
  });
});
