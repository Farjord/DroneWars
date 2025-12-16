import { describe, it, expect } from 'vitest';
import aiPersonalities from './aiData.js';

/**
 * TDD Tests for Boss AI Configuration
 *
 * Boss AIs are special encounters with:
 * - A unique bossId for tracking progress
 * - modes: ['boss'] to distinguish from 'vs' and 'extraction' modes
 * - bossConfig containing first-time and repeatable rewards
 */

describe('Boss AI Configuration', () => {
  // Get all boss AIs from the personalities array
  const bossAIs = aiPersonalities.filter(ai => ai.modes?.includes('boss'));

  it('should have at least one boss AI defined', () => {
    expect(bossAIs.length).toBeGreaterThanOrEqual(1);
  });

  it('should have a boss AI with bossId field', () => {
    const bossWithId = bossAIs.find(ai => ai.bossId);
    expect(bossWithId).toBeDefined();
    expect(typeof bossWithId.bossId).toBe('string');
    expect(bossWithId.bossId.length).toBeGreaterThan(0);
  });

  it('should have modes: ["boss"] for boss AI', () => {
    bossAIs.forEach(boss => {
      expect(boss.modes).toContain('boss');
    });
  });

  it('should have bossConfig with firstTimeReward and repeatReward', () => {
    bossAIs.forEach(boss => {
      expect(boss.bossConfig).toBeDefined();
      expect(boss.bossConfig.firstTimeReward).toBeDefined();
      expect(boss.bossConfig.repeatReward).toBeDefined();
    });
  });

  it('should have valid reward structure with credits, aiCores, and reputation', () => {
    bossAIs.forEach(boss => {
      const { firstTimeReward, repeatReward } = boss.bossConfig;

      // First time reward structure
      expect(typeof firstTimeReward.credits).toBe('number');
      expect(firstTimeReward.credits).toBeGreaterThan(0);
      expect(typeof firstTimeReward.aiCores).toBe('number');
      expect(firstTimeReward.aiCores).toBeGreaterThanOrEqual(0);
      expect(typeof firstTimeReward.reputation).toBe('number');
      expect(firstTimeReward.reputation).toBeGreaterThan(0);

      // Repeat reward structure
      expect(typeof repeatReward.credits).toBe('number');
      expect(repeatReward.credits).toBeGreaterThan(0);
      expect(typeof repeatReward.aiCores).toBe('number');
      expect(repeatReward.aiCores).toBeGreaterThanOrEqual(0);
      expect(typeof repeatReward.reputation).toBe('number');
      expect(repeatReward.reputation).toBeGreaterThan(0);
    });
  });

  it('should have first time rewards greater than or equal to repeat rewards', () => {
    bossAIs.forEach(boss => {
      const { firstTimeReward, repeatReward } = boss.bossConfig;

      expect(firstTimeReward.credits).toBeGreaterThanOrEqual(repeatReward.credits);
      expect(firstTimeReward.reputation).toBeGreaterThanOrEqual(repeatReward.reputation);
    });
  });

  it('should have display information in bossConfig', () => {
    bossAIs.forEach(boss => {
      expect(boss.bossConfig.displayName).toBeDefined();
      expect(typeof boss.bossConfig.displayName).toBe('string');
      expect(boss.bossConfig.subtitle).toBeDefined();
      expect(typeof boss.bossConfig.subtitle).toBe('string');
    });
  });

  it('should have standard AI fields (name, description, difficulty, shipId)', () => {
    bossAIs.forEach(boss => {
      expect(boss.name).toBeDefined();
      expect(boss.description).toBeDefined();
      expect(boss.difficulty).toBeDefined();
      expect(boss.shipId).toBeDefined();
      expect(boss.dronePool).toBeDefined();
      expect(Array.isArray(boss.dronePool)).toBe(true);
      expect(boss.decklist).toBeDefined();
      expect(Array.isArray(boss.decklist)).toBe(true);
    });
  });
});

// Export helper for other test files that need to get boss AI
export const getBossAI = (bossId) => {
  return aiPersonalities.find(ai => ai.bossId === bossId);
};
