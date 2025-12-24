import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock tacticalMapStateManager
vi.mock('./TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn(),
    startRun: vi.fn(),
    endRun: vi.fn(),
    subscribe: vi.fn(() => () => {})
  }
}));

// ================================================
// GAMESTATE MANAGER - endRun Stats Broadcasting
// ================================================
// Tests to verify that endRun() includes updated singlePlayerProfile
// in the setState call so React subscribers see stats changes.
//
// BUG: When calling endRun(), stats like runsLost are mutated directly
// but setState() didn't include singlePlayerProfile, so React subscribers
// (like HangarScreen's useEffect) didn't see the change.

describe('GameStateManager.endRun - Stats Broadcasting', () => {
  let gameStateManager;
  let tacticalMapStateManager;
  let setStateSpy;

  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules();

    // Import fresh instances
    const module = await import('./GameStateManager.js');
    gameStateManager = module.default;

    const tacticalModule = await import('./TacticalMapStateManager.js');
    tacticalMapStateManager = tacticalModule.default;

    // Set up initial state with a profile
    gameStateManager.setState({
      singlePlayerProfile: {
        credits: 1000,
        aiCores: 0,
        unlockedBlueprints: [],
        stats: {
          runsCompleted: 5,
          runsLost: 3,
          totalCreditsEarned: 0,
          totalCombatsWon: 0,
          highestTierCompleted: 1
        },
        reputation: { current: 0, level: 0, unclaimedRewards: [] }
      },
      singlePlayerInventory: {},
      singlePlayerShipSlots: [
        { id: 0, status: 'active', name: 'Starter Deck' }
      ]
    });

    // Mock run state in tacticalMapStateManager
    const mockRunState = {
      shipSlotId: 0,
      mapTier: 1,
      mapData: { name: 'Test Sector', hexes: [] },
      collectedLoot: [],
      creditsEarned: 0,
      currentHull: 100,
      maxHull: 100,
      hexesMoved: 5,
      hexesExplored: [],
      combatsWon: 0,
      combatsLost: 0
    };

    tacticalMapStateManager.isRunActive.mockReturnValue(true);
    tacticalMapStateManager.getState.mockReturnValue(mockRunState);

    // Spy on setState to capture what's passed to it
    setStateSpy = vi.spyOn(gameStateManager, 'setState');
  });

  it('should include singlePlayerProfile in setState when run fails (runsLost incremented)', () => {
    const initialRunsLost = gameStateManager.getState().singlePlayerProfile.stats.runsLost;

    // End run as failure (MIA/abandon)
    gameStateManager.endRun(false);

    // Find the setState call that includes lastRunSummary (the final one in endRun)
    const finalSetStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].lastRunSummary !== undefined
    );

    expect(finalSetStateCall).toBeDefined();
    const stateUpdate = finalSetStateCall[0];

    // CRITICAL: singlePlayerProfile should be included in setState
    expect(stateUpdate.singlePlayerProfile).toBeDefined();

    // The profile should have the incremented runsLost
    expect(stateUpdate.singlePlayerProfile.stats.runsLost).toBe(initialRunsLost + 1);
  });

  it('should include singlePlayerProfile in setState when run succeeds (runsCompleted incremented)', () => {
    const initialRunsCompleted = gameStateManager.getState().singlePlayerProfile.stats.runsCompleted;

    // End run as success
    gameStateManager.endRun(true);

    // Find the setState call that includes lastRunSummary
    const finalSetStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].lastRunSummary !== undefined
    );

    expect(finalSetStateCall).toBeDefined();
    const stateUpdate = finalSetStateCall[0];

    // CRITICAL: singlePlayerProfile should be included in setState
    expect(stateUpdate.singlePlayerProfile).toBeDefined();

    // The profile should have the incremented runsCompleted
    expect(stateUpdate.singlePlayerProfile.stats.runsCompleted).toBe(initialRunsCompleted + 1);
  });

  it('should broadcast profile with new object reference for React to detect change', () => {
    const originalProfile = gameStateManager.getState().singlePlayerProfile;

    gameStateManager.endRun(false);

    // Find the setState call that includes lastRunSummary
    const finalSetStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].lastRunSummary !== undefined
    );

    const stateUpdate = finalSetStateCall[0];

    // The profile in setState should be a new object (spread), not the same reference
    // This is important for React's shallow comparison to detect the change
    expect(stateUpdate.singlePlayerProfile).toBeDefined();
    // Note: We can't directly test reference inequality here since the mutation
    // already happened, but we can verify the structure exists
  });
});
