import { describe, it, expect } from 'vitest';
import {
  defaultPlayerProfile,
  validateSaveFile,
  createNewSave,
  SAVE_VERSION
} from './saveGameSchema.js';

/**
 * TDD Tests for Boss Progress in Save Schema
 *
 * Boss progress tracks:
 * - defeatedBosses: Array of bossIds the player has defeated (for first-time rewards)
 * - totalBossVictories: Total number of boss wins (including repeats)
 * - totalBossAttempts: Total number of boss fight attempts
 */

describe('Boss Progress in Player Profile', () => {
  describe('defaultPlayerProfile', () => {
    it('should include bossProgress in defaultPlayerProfile', () => {
      expect(defaultPlayerProfile.bossProgress).toBeDefined();
    });

    it('should have defeatedBosses as empty array by default', () => {
      expect(defaultPlayerProfile.bossProgress.defeatedBosses).toBeDefined();
      expect(Array.isArray(defaultPlayerProfile.bossProgress.defeatedBosses)).toBe(true);
      expect(defaultPlayerProfile.bossProgress.defeatedBosses.length).toBe(0);
    });

    it('should have totalBossVictories as 0 by default', () => {
      expect(defaultPlayerProfile.bossProgress.totalBossVictories).toBeDefined();
      expect(defaultPlayerProfile.bossProgress.totalBossVictories).toBe(0);
    });

    it('should have totalBossAttempts as 0 by default', () => {
      expect(defaultPlayerProfile.bossProgress.totalBossAttempts).toBeDefined();
      expect(defaultPlayerProfile.bossProgress.totalBossAttempts).toBe(0);
    });
  });

  describe('createNewSave', () => {
    it('should include bossProgress in new save playerProfile', () => {
      const newSave = createNewSave();
      expect(newSave.playerProfile.bossProgress).toBeDefined();
      expect(newSave.playerProfile.bossProgress.defeatedBosses).toEqual([]);
      expect(newSave.playerProfile.bossProgress.totalBossVictories).toBe(0);
      expect(newSave.playerProfile.bossProgress.totalBossAttempts).toBe(0);
    });
  });

  describe('validateSaveFile - bossProgress validation', () => {
    it('should validate bossProgress.defeatedBosses is array', () => {
      const invalidSave = createNewSave();
      invalidSave.playerProfile.bossProgress.defeatedBosses = 'not-an-array';

      const result = validateSaveFile(invalidSave);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('defeatedBosses'))).toBe(true);
    });

    it('should pass validation with valid bossProgress', () => {
      const validSave = createNewSave();
      validSave.playerProfile.bossProgress = {
        defeatedBosses: ['BOSS_T1_NEMESIS'],
        totalBossVictories: 1,
        totalBossAttempts: 2
      };

      const result = validateSaveFile(validSave);
      expect(result.valid).toBe(true);
    });

    it('should pass validation with empty bossProgress', () => {
      const validSave = createNewSave();
      // bossProgress should be the default empty state

      const result = validateSaveFile(validSave);
      expect(result.valid).toBe(true);
    });

    it('should handle missing bossProgress gracefully (backward compatibility)', () => {
      const oldSave = createNewSave();
      delete oldSave.playerProfile.bossProgress;

      // Should not throw, should either pass or have a specific error
      const result = validateSaveFile(oldSave);
      // For backward compatibility, missing bossProgress should be acceptable
      // or the migration system should handle it
      expect(result).toBeDefined();
    });
  });
});
