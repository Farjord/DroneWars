/**
 * ReputationService.test.js
 * Tests for event-driven reputation awarding
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReputationService from '../ReputationService.js';
import gameStateManager from '../../../managers/GameStateManager.js';

// Mock gameStateManager
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
  }
}));

describe('ReputationService - Event-Based Awarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProfile = (currentRep = 0) => ({
    singlePlayerProfile: {
      reputation: {
        current: currentRep,
        level: 0,
        unclaimedRewards: []
      }
    }
  });

  it('should award reputation from events on successful extraction', () => {
    gameStateManager.getState.mockReturnValue(mockProfile(0));

    const events = [
      { type: 'COMBAT_WIN', key: 'Medium', rep: 300 },
      { type: 'POI_LOOT', key: 'core', rep: 400 },
    ];
    const result = ReputationService.awardReputation(events, true, 1);

    // 300 combat + 400 poi + 200 extraction bonus = 900
    expect(result.success).toBe(true);
    expect(result.combatRep).toBe(300);
    expect(result.explorationRep).toBe(400);
    expect(result.extractionBonus).toBe(200);
    expect(result.totalRep).toBe(900);
    expect(gameStateManager.setState).toHaveBeenCalled();
  });

  it('should NOT add extraction bonus on failed run', () => {
    gameStateManager.getState.mockReturnValue(mockProfile(0));

    const events = [
      { type: 'COMBAT_WIN', key: 'Hard', rep: 500 },
    ];
    const result = ReputationService.awardReputation(events, false, 1);

    expect(result.extractionBonus).toBe(0);
    expect(result.totalRep).toBe(500);
  });

  it('should award full rep on failed run (no penalty)', () => {
    gameStateManager.getState.mockReturnValue(mockProfile(0));

    const events = [
      { type: 'COMBAT_WIN', key: 'Medium', rep: 300 },
      { type: 'COMBAT_WIN', key: 'Easy', rep: 150 },
    ];
    const result = ReputationService.awardReputation(events, false, 2);

    // No penalty — all event rep is kept
    expect(result.combatRep).toBe(450);
    expect(result.totalRep).toBe(450);
  });

  it('should handle empty events array', () => {
    gameStateManager.getState.mockReturnValue(mockProfile(1000));

    const result = ReputationService.awardReputation([], false, 1);

    expect(result.totalRep).toBe(0);
    expect(result.previousRep).toBe(1000);
    expect(result.newRep).toBe(1000);
  });

  it('should handle empty events with successful extraction (bonus only)', () => {
    gameStateManager.getState.mockReturnValue(mockProfile(0));

    const result = ReputationService.awardReputation([], true, 2);

    expect(result.extractionBonus).toBe(400); // Tier 2
    expect(result.totalRep).toBe(400);
  });

  it('should detect level-up and add unclaimed rewards', () => {
    // Start near level 1 threshold (5000)
    gameStateManager.getState.mockReturnValue(mockProfile(4800));

    const events = [{ type: 'COMBAT_WIN', key: 'Hard', rep: 500 }];
    const result = ReputationService.awardReputation(events, false, 1);

    expect(result.leveledUp).toBe(true);
    expect(result.previousLevel).toBe(0);
    expect(result.newLevel).toBe(1);
    expect(result.newRewards.length).toBeGreaterThan(0);
  });

  it('should return error when no profile exists', () => {
    gameStateManager.getState.mockReturnValue({ singlePlayerProfile: null });

    const result = ReputationService.awardReputation([], true, 1);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should initialize reputation if missing from profile', () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerProfile: {}
    });

    const events = [{ type: 'COMBAT_WIN', key: 'Easy', rep: 150 }];
    const result = ReputationService.awardReputation(events, false, 1);

    expect(result.success).toBe(true);
    expect(result.previousRep).toBe(0);
    expect(result.totalRep).toBe(150);
  });

  it('should include boss kill rep in combat breakdown', () => {
    gameStateManager.getState.mockReturnValue(mockProfile(0));

    const events = [
      { type: 'COMBAT_WIN', key: 'Easy', rep: 150 },
      { type: 'BOSS_KILL', key: 'Hard', rep: 1000 },
    ];
    const result = ReputationService.awardReputation(events, true, 1);

    expect(result.combatRep).toBe(1150); // 150 + 1000
    expect(result.explorationRep).toBe(0);
    expect(result.extractionBonus).toBe(200);
    expect(result.totalRep).toBe(1350);
  });
});
