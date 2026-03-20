/**
 * ReputationCalculator.test.js
 * Tests for event-driven reputation calculation
 *
 * TDD: Tests written first for sumReputationEvents and calculateRunReputation
 */

import { describe, it, expect } from 'vitest';
import { sumReputationEvents, calculateRunReputation } from '../ReputationCalculator.js';

describe('sumReputationEvents', () => {
  it('should return 0 for empty events array', () => {
    expect(sumReputationEvents([])).toBe(0);
  });

  it('should sum rep from a single event', () => {
    const events = [{ type: 'COMBAT_WIN', key: 'Medium', rep: 300 }];
    expect(sumReputationEvents(events)).toBe(300);
  });

  it('should sum rep from multiple events', () => {
    const events = [
      { type: 'COMBAT_WIN', key: 'Easy', rep: 150 },
      { type: 'COMBAT_WIN', key: 'Medium', rep: 300 },
      { type: 'POI_LOOT', key: 'core', rep: 400 },
    ];
    expect(sumReputationEvents(events)).toBe(850);
  });

  it('should handle events with 0 rep', () => {
    const events = [
      { type: 'COMBAT_WIN', key: 'Easy', rep: 0 },
      { type: 'POI_LOOT', key: 'perimeter', rep: 100 },
    ];
    expect(sumReputationEvents(events)).toBe(100);
  });
});

describe('calculateRunReputation', () => {
  describe('basic event summation', () => {
    it('should return 0 for empty events on failed run', () => {
      const result = calculateRunReputation([], false, 1, 0);
      expect(result.eventRep).toBe(0);
      expect(result.extractionBonus).toBe(0);
      expect(result.totalRep).toBe(0);
    });

    it('should sum combat-only events', () => {
      const events = [
        { type: 'COMBAT_WIN', key: 'Medium', rep: 300 },
        { type: 'COMBAT_WIN', key: 'Hard', rep: 500 },
      ];
      const result = calculateRunReputation(events, false, 1, 0);
      expect(result.eventRep).toBe(800);
      expect(result.combatRep).toBe(800);
      expect(result.explorationRep).toBe(0);
    });

    it('should sum mixed events', () => {
      const events = [
        { type: 'COMBAT_WIN', key: 'Easy', rep: 150 },
        { type: 'POI_LOOT', key: 'mid', rep: 200 },
        { type: 'BOSS_KILL', key: 'Medium', rep: 600 },
      ];
      const result = calculateRunReputation(events, false, 1, 0);
      expect(result.eventRep).toBe(950);
      expect(result.combatRep).toBe(750); // COMBAT_WIN + BOSS_KILL
      expect(result.explorationRep).toBe(200); // POI_LOOT
    });
  });

  describe('extraction bonus', () => {
    it('should add extraction bonus on successful run', () => {
      const events = [{ type: 'COMBAT_WIN', key: 'Medium', rep: 300 }];
      const result = calculateRunReputation(events, true, 1, 0);
      expect(result.extractionBonus).toBe(200); // Tier 1 bonus
      expect(result.totalRep).toBe(500); // 300 event + 200 bonus
    });

    it('should NOT add extraction bonus on failed run', () => {
      const events = [{ type: 'COMBAT_WIN', key: 'Medium', rep: 300 }];
      const result = calculateRunReputation(events, false, 1, 0);
      expect(result.extractionBonus).toBe(0);
      expect(result.totalRep).toBe(300);
    });

    it('should scale extraction bonus by map tier', () => {
      const events = [];

      const t1 = calculateRunReputation(events, true, 1, 0);
      expect(t1.extractionBonus).toBe(200);

      const t2 = calculateRunReputation(events, true, 2, 0);
      expect(t2.extractionBonus).toBe(400);

      const t3 = calculateRunReputation(events, true, 3, 0);
      expect(t3.extractionBonus).toBe(700);
    });

    it('should default to 0 bonus for unknown tier', () => {
      const result = calculateRunReputation([], true, 99, 0);
      expect(result.extractionBonus).toBe(0);
    });
  });

  describe('level progression', () => {
    it('should track previous and new rep', () => {
      const events = [{ type: 'COMBAT_WIN', key: 'Medium', rep: 300 }];
      const result = calculateRunReputation(events, false, 1, 1000);
      expect(result.previousRep).toBe(1000);
      expect(result.newRep).toBe(1300);
    });

    it('should detect level up', () => {
      // Level 1 threshold is 5000, start at 4900
      const events = [{ type: 'COMBAT_WIN', key: 'Medium', rep: 300 }];
      const result = calculateRunReputation(events, false, 1, 4900);
      expect(result.previousLevel).toBe(0);
      expect(result.newLevel).toBe(1);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(1);
    });

    it('should report no level up when staying in same level', () => {
      const events = [{ type: 'COMBAT_WIN', key: 'Easy', rep: 150 }];
      const result = calculateRunReputation(events, false, 1, 100);
      expect(result.leveledUp).toBe(false);
      expect(result.levelsGained).toBe(0);
    });

    it('should include progress data', () => {
      const result = calculateRunReputation([], false, 1, 2500);
      expect(result.progress).toBeDefined();
      expect(typeof result.progress).toBe('number');
    });

    it('should include newRewards for level-up scenarios', () => {
      // Level 1 at 5000 has a reward
      const events = [{ type: 'COMBAT_WIN', key: 'Hard', rep: 500 }];
      const result = calculateRunReputation(events, true, 3, 4500);
      // 4500 + 500 + 700 (tier 3 bonus) = 5700 → crosses level 1 at 5000
      expect(result.newLevel).toBe(1);
      expect(result.unlockedLevels.length).toBeGreaterThan(0);
      expect(result.newRewards.length).toBeGreaterThan(0);
    });
  });

  describe('return shape', () => {
    it('should return all required fields', () => {
      const events = [{ type: 'COMBAT_WIN', key: 'Medium', rep: 300 }];
      const result = calculateRunReputation(events, true, 1, 0);

      expect(result).toHaveProperty('eventRep');
      expect(result).toHaveProperty('extractionBonus');
      expect(result).toHaveProperty('totalRep');
      expect(result).toHaveProperty('combatRep');
      expect(result).toHaveProperty('explorationRep');
      expect(result).toHaveProperty('previousRep');
      expect(result).toHaveProperty('newRep');
      expect(result).toHaveProperty('previousLevel');
      expect(result).toHaveProperty('newLevel');
      expect(result).toHaveProperty('leveledUp');
      expect(result).toHaveProperty('levelsGained');
      expect(result).toHaveProperty('progress');
      expect(result).toHaveProperty('unlockedLevels');
      expect(result).toHaveProperty('newRewards');
    });
  });
});
