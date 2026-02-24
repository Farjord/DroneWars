/**
 * HangarScreen.mapRegeneration.test.jsx
 * TDD tests for map regeneration when returning from tactical map
 *
 * Bug: Maps persist when returning from tactical map instead of regenerating
 * Fix: Use runsCompleted + runsLost as deployment counter in map seed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// Track calls to generateMapData to verify seeds
let generateMapDataCalls = [];

// Mock dependencies BEFORE importing the component
vi.mock('../../../hooks/useGameState.js', () => ({
  useGameState: vi.fn()
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../logic/map/mapGenerator.js', () => ({
  generateMapData: vi.fn((seed, tier, type) => {
    generateMapDataCalls.push({ seed, tier, type });
    return {
      name: `Test Sector ${seed}`,
      tier: 1,
      hexes: [],
      gates: [],
      pois: [],
      poiTypeBreakdown: {},
      poiCount: 5
    };
  })
}));

// Track SeededRandom constructor calls for hex grid seed testing
let seededRandomCalls = [];

vi.mock('../../../utils/seededRandom.js', () => ({
  SeededRandom: class {
    constructor(seed) {
      seededRandomCalls.push(seed);
      this.seed = seed;
    }
    shuffle(arr) { return [...arr]; }
  }
}));

vi.mock('../../../data/mapData.js', () => ({
  mapTiers: [{ tier: 1, gridZone: { minDistance: 0, maxDistance: 1 } }]
}));

vi.mock('../../../data/aiData.js', () => ({
  default: [
    {
      bossId: 'BOSS_T1_NEMESIS',
      name: 'Nemesis-Class Dreadnought',
      modes: ['boss'],
      bossConfig: {
        displayName: 'THE NEMESIS',
        subtitle: 'Commander',
        firstTimeReward: { credits: 5000, aiCores: 3, reputation: 500 },
        repeatReward: { credits: 1000, aiCores: 1, reputation: 100 }
      }
    }
  ]
}));

vi.mock('../../../logic/singlePlayer/SinglePlayerCombatInitializer.js', () => ({
  default: {
    initiateBossCombat: vi.fn(() => Promise.resolve(true))
  }
}));

vi.mock('../../../logic/reputation/ReputationService.js', () => ({
  default: {
    getLevelData: vi.fn(() => ({ currentRep: 0, level: 0, progress: 0, currentInLevel: 0, requiredForNext: 100, isMaxLevel: false })),
    getUnclaimedRewards: vi.fn(() => []),
    getExtractionBonus: vi.fn(() => 0),
    getLoadoutValue: vi.fn(() => ({ isStarterDeck: true, totalValue: 0 }))
  }
}));

vi.mock('../../../logic/singlePlayer/MIARecoveryService.js', () => ({
  default: {
    calculateRecoveryCost: vi.fn(() => 1000)
  }
}));

vi.mock('../../../logic/singlePlayer/singlePlayerDeckUtils.js', () => ({
  validateDeckForDeployment: vi.fn(() => ({ valid: true, errors: [] }))
}));

vi.mock('../../../logic/combat/slotDamageUtils.js', () => ({
  validateShipSlot: vi.fn(() => ({ isUndeployable: false }))
}));

vi.mock('../../../data/economyData.js', () => ({
  ECONOMY: {
    STARTER_DECK_COPY_COST: 500,
    DECK_SLOT_UNLOCK_COSTS: [0, 500, 1000, 2000, 4000, 8000],
    STARTER_DECK_EXTRACTION_LIMIT: 3,
    CUSTOM_DECK_EXTRACTION_LIMIT: 6
  }
}));

vi.mock('../../../data/cardData.js', () => ({
  RARITY_COLORS: { Common: '#808080', Uncommon: '#22c55e', Rare: '#3b82f6', Mythic: '#a855f7' }
}));

vi.mock('../../../data/shipData.js', () => ({
  getShipById: vi.fn(() => null)
}));

vi.mock('../../../data/playerDeckData.js', () => ({
  starterDeck: {
    shipId: 'SHIP_001',
    decklist: [],
    droneSlots: [],
    shipComponents: {}
  }
}));

// Mock child components
vi.mock('../../modals/SaveLoadModal', () => ({ default: () => null }));
vi.mock('../../modals/InventoryModal', () => ({ default: () => null }));
vi.mock('../../modals/MapOverviewModal', () => ({ default: () => null }));
vi.mock('../../modals/BlueprintsModal', () => ({ default: () => null }));
vi.mock('../../modals/ReplicatorModal', () => ({ default: () => null }));
vi.mock('../../modals/ShopModal', () => ({ default: () => null }));
vi.mock('../../modals/RunSummaryModal', () => ({ default: () => null }));
vi.mock('../../modals/MIARecoveryModal', () => ({ default: () => null }));
vi.mock('../../modals/ConfirmationModal', () => ({ default: () => null }));
vi.mock('../../ui/DeployingScreen', () => ({ default: () => null }));
vi.mock('../../ui/LoadingEncounterScreen', () => ({ default: () => null }));
vi.mock('../../quickDeploy/QuickDeployManager', () => ({ default: () => null }));
vi.mock('../../ui/ReputationTrack', () => ({ default: () => <div data-testid="reputation-track" /> }));
vi.mock('../../modals/ReputationProgressModal', () => ({ default: () => null }));
vi.mock('../../modals/ReputationRewardModal', () => ({ default: () => null }));
vi.mock('../../ui/NewsTicker', () => ({ default: () => null }));
vi.mock('../../modals/BossEncounterModal', () => ({ default: () => null }));

// Import after mocks
import { useGameState } from '../../../hooks/useGameState.js';
import { generateMapData } from '../../../logic/map/mapGenerator.js';

// Helper to create mock game state
const createMockGameState = (overrides = {}) => ({
  gameState: {
    singlePlayerProfile: {
      gameSeed: 12345,
      credits: 1000,
      aiCores: 0,
      securityTokens: 0,
      defaultShipSlotId: 0,
      highestUnlockedSlot: 0,
      stats: {
        runsCompleted: 0,
        runsLost: 0,
        totalCombatsWon: 0,
        highestTierCompleted: 1
      },
      bossProgress: {
        defeatedBosses: [],
        totalBossVictories: 0,
        totalBossAttempts: 0
      },
      ...overrides.profile
    },
    singlePlayerInventory: {},
    singlePlayerShipSlots: [
      {
        id: 0,
        status: 'active',
        name: 'Starter Deck',
        decklist: Array(40).fill({ id: 'card1', quantity: 1 }),
        droneSlots: [
          { slotIndex: 0, assignedDrone: 'Dart' },
          { slotIndex: 1, assignedDrone: 'Fighter' },
          { slotIndex: 2, assignedDrone: 'Heavy' },
          { slotIndex: 3, assignedDrone: 'Guardian' },
          { slotIndex: 4, assignedDrone: 'Repair' },
        ],
        shipComponents: { left: 'COMP1', middle: 'COMP2', right: 'COMP3' }
      }
    ],
    singlePlayerDroneInstances: [],
    singlePlayerShipComponentInstances: [],
    singlePlayerDiscoveredCards: [],
    lastRunSummary: null,
    ...overrides.gameState
  },
  gameStateManager: {
    setState: vi.fn(),
    get: vi.fn(),
    getState: vi.fn()
  }
});

describe('HangarScreen - Map Regeneration', () => {
  let HangarScreen;

  beforeEach(async () => {
    // Clear call tracking
    generateMapDataCalls = [];
    seededRandomCalls = [];
    vi.clearAllMocks();

    // Dynamically import HangarScreen after mocks are set up
    const module = await import('../HangarScreen/HangarScreen.jsx');
    HangarScreen = module.default;
  });

  it('should regenerate maps when runsCompleted changes', async () => {
    // First render with runsCompleted: 0
    const initialState = createMockGameState();
    initialState.gameState.singlePlayerProfile.stats.runsCompleted = 0;
    initialState.gameState.singlePlayerProfile.stats.runsLost = 0;
    useGameState.mockReturnValue(initialState);

    const { rerender } = render(<HangarScreen />);

    // Wait for initial map generation
    await waitFor(() => {
      expect(generateMapDataCalls.length).toBeGreaterThan(0);
    });

    const initialSeeds = generateMapDataCalls.map(c => c.seed);
    generateMapDataCalls = [];

    // Re-render with runsCompleted: 1 (simulating return from tactical map after successful extraction)
    const updatedState = createMockGameState();
    updatedState.gameState.singlePlayerProfile.stats.runsCompleted = 1;
    updatedState.gameState.singlePlayerProfile.stats.runsLost = 0;
    useGameState.mockReturnValue(updatedState);

    rerender(<HangarScreen />);

    // Wait for new map generation
    await waitFor(() => {
      expect(generateMapDataCalls.length).toBeGreaterThan(0);
    });

    const newSeeds = generateMapDataCalls.map(c => c.seed);

    // Seeds should be different because runsCompleted changed
    expect(newSeeds).not.toEqual(initialSeeds);
  });

  it('should regenerate maps when runsLost changes', async () => {
    // First render with runsLost: 0
    const initialState = createMockGameState();
    initialState.gameState.singlePlayerProfile.stats.runsCompleted = 0;
    initialState.gameState.singlePlayerProfile.stats.runsLost = 0;
    useGameState.mockReturnValue(initialState);

    const { rerender } = render(<HangarScreen />);

    // Wait for initial map generation
    await waitFor(() => {
      expect(generateMapDataCalls.length).toBeGreaterThan(0);
    });

    const initialSeeds = generateMapDataCalls.map(c => c.seed);
    generateMapDataCalls = [];

    // Re-render with runsLost: 1 (simulating return from tactical map after abandon/MIA)
    const updatedState = createMockGameState();
    updatedState.gameState.singlePlayerProfile.stats.runsCompleted = 0;
    updatedState.gameState.singlePlayerProfile.stats.runsLost = 1;
    useGameState.mockReturnValue(updatedState);

    rerender(<HangarScreen />);

    // Wait for new map generation
    await waitFor(() => {
      expect(generateMapDataCalls.length).toBeGreaterThan(0);
    });

    const newSeeds = generateMapDataCalls.map(c => c.seed);

    // Seeds should be different because runsLost changed
    expect(newSeeds).not.toEqual(initialSeeds);
  });

  it('should use totalDeployments in seed calculation', async () => {
    // Render with totalDeployments = 5 (3 completed + 2 lost)
    const state = createMockGameState();
    state.gameState.singlePlayerProfile.gameSeed = 1000;
    state.gameState.singlePlayerProfile.stats.runsCompleted = 3;
    state.gameState.singlePlayerProfile.stats.runsLost = 2;
    useGameState.mockReturnValue(state);

    render(<HangarScreen />);

    // Wait for map generation
    await waitFor(() => {
      expect(generateMapDataCalls.length).toBeGreaterThan(0);
    });

    // Verify the seeds incorporate totalDeployments (5 * 1000 = 5000 offset)
    // Map seeds should be: gameSeed + i + (totalDeployments * 1000)
    // For i=0: 1000 + 0 + 5000 = 6000
    // For i=1: 1000 + 1 + 5000 = 6001
    // etc.
    const expectedFirstSeed = 1000 + 0 + (5 * 1000); // 6000
    expect(generateMapDataCalls[0].seed).toBe(expectedFirstSeed);
  });

  it('should NOT regenerate maps when other profile fields change', async () => {
    // First render
    const initialState = createMockGameState();
    initialState.gameState.singlePlayerProfile.credits = 1000;
    initialState.gameState.singlePlayerProfile.stats.runsCompleted = 0;
    initialState.gameState.singlePlayerProfile.stats.runsLost = 0;
    useGameState.mockReturnValue(initialState);

    const { rerender } = render(<HangarScreen />);

    // Wait for initial map generation
    await waitFor(() => {
      expect(generateMapDataCalls.length).toBeGreaterThan(0);
    });

    const initialSeeds = generateMapDataCalls.map(c => c.seed);
    generateMapDataCalls = [];

    // Re-render with different credits (unrelated field)
    const updatedState = createMockGameState();
    updatedState.gameState.singlePlayerProfile.credits = 2000; // Changed credits
    updatedState.gameState.singlePlayerProfile.stats.runsCompleted = 0; // Same stats
    updatedState.gameState.singlePlayerProfile.stats.runsLost = 0;
    useGameState.mockReturnValue(updatedState);

    rerender(<HangarScreen />);

    // Give time for potential regeneration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // If maps regenerated, seeds would be captured
    // Since stats didn't change, maps should NOT regenerate
    // generateMapDataCalls should still be empty (no new calls)
    expect(generateMapDataCalls.length).toBe(0);
  });
});

describe('HangarScreen - Hex Grid Position Regeneration', () => {
  let HangarScreen;

  beforeEach(async () => {
    // Clear call tracking
    seededRandomCalls = [];
    generateMapDataCalls = [];
    vi.clearAllMocks();

    // Dynamically import HangarScreen after mocks are set up
    const module = await import('../HangarScreen/HangarScreen.jsx');
    HangarScreen = module.default;
  });

  it('should regenerate hex grid positions when runsCompleted changes', async () => {
    // First render with runsCompleted: 0
    const initialState = createMockGameState();
    initialState.gameState.singlePlayerProfile.stats.runsCompleted = 0;
    initialState.gameState.singlePlayerProfile.stats.runsLost = 0;
    useGameState.mockReturnValue(initialState);

    const { rerender } = render(<HangarScreen />);

    // Wait for hex grid generation
    await waitFor(() => {
      expect(seededRandomCalls.length).toBeGreaterThan(0);
    });

    const initialGridSeeds = [...seededRandomCalls];
    seededRandomCalls = [];

    // Re-render with runsCompleted: 1
    const updatedState = createMockGameState();
    updatedState.gameState.singlePlayerProfile.stats.runsCompleted = 1;
    updatedState.gameState.singlePlayerProfile.stats.runsLost = 0;
    useGameState.mockReturnValue(updatedState);

    rerender(<HangarScreen />);

    // Wait for new hex grid generation
    await waitFor(() => {
      expect(seededRandomCalls.length).toBeGreaterThan(0);
    });

    const newGridSeeds = seededRandomCalls;

    // Seeds should be different because runsCompleted changed
    // The hex grid seed should incorporate totalDeployments
    expect(newGridSeeds).not.toEqual(initialGridSeeds);
  });

  it('should use totalDeployments in hex grid seed calculation', async () => {
    // Render with totalDeployments = 5 (3 completed + 2 lost)
    const state = createMockGameState();
    state.gameState.singlePlayerProfile.gameSeed = 1000;
    state.gameState.singlePlayerProfile.stats.runsCompleted = 3;
    state.gameState.singlePlayerProfile.stats.runsLost = 2;
    useGameState.mockReturnValue(state);

    render(<HangarScreen />);

    // Wait for hex grid generation
    await waitFor(() => {
      expect(seededRandomCalls.length).toBeGreaterThan(0);
    });

    // The hex grid seed should be: gameSeed + (totalDeployments * 1000)
    // = 1000 + (5 * 1000) = 6000
    const expectedHexGridSeed = 1000 + (5 * 1000);
    expect(seededRandomCalls).toContain(expectedHexGridSeed);
  });
});
