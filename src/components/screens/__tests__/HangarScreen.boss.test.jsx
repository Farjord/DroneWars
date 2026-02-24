/**
 * HangarScreen.boss.test.jsx
 * TDD tests for Boss Hex integration on Hangar map
 *
 * Tests for:
 * - Boss hex generation in valid random position
 * - Boss hex NOT placed on same cell as map sector
 * - Boss hex rendering with distinct visual
 * - BossEncounterModal opens when boss hex clicked
 * - Boss challenge flow (initiateBossCombat called)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock dependencies BEFORE importing the component
vi.mock('../../../hooks/useGameState.js', () => ({
  useGameState: vi.fn()
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../logic/map/mapGenerator.js', () => ({
  generateMapData: vi.fn(() => ({
    name: 'Test Sector',
    tier: 1,
    hexes: [],
    gates: [],
    pois: [],
    poiTypeBreakdown: {},
    poiCount: 5
  }))
}));

vi.mock('../../../utils/seededRandom.js', () => ({
  SeededRandom: class {
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
vi.mock('../../ui/LoadingEncounterScreen', () => ({
  default: ({ onComplete }) => {
    // Auto-trigger onComplete for tests to simulate player clicking "Engage"
    React.useEffect(() => {
      if (onComplete) onComplete();
    }, [onComplete]);
    return <div data-testid="loading-encounter-screen">Loading...</div>;
  }
}));
vi.mock('../../quickDeploy/QuickDeployManager', () => ({ default: () => null }));
vi.mock('../../ui/ReputationTrack', () => ({ default: () => <div data-testid="reputation-track" /> }));
vi.mock('../../modals/ReputationProgressModal', () => ({ default: () => null }));
vi.mock('../../modals/ReputationRewardModal', () => ({ default: () => null }));
vi.mock('../../ui/NewsTicker', () => ({ default: () => null }));
vi.mock('../../modals/BossEncounterModal', () => ({
  default: ({ bossId, onChallenge, onClose }) => (
    <div data-testid="boss-encounter-modal">
      <span data-testid="boss-id">{bossId}</span>
      <button data-testid="challenge-btn" onClick={() => onChallenge(0, bossId)}>Challenge</button>
      <button data-testid="close-btn" onClick={onClose}>Close</button>
    </div>
  )
}));

// Import after mocks
import { useGameState } from '../../../hooks/useGameState.js';
import SinglePlayerCombatInitializer from '../../../logic/singlePlayer/SinglePlayerCombatInitializer.js';

// Helper to create mock game state
const createMockGameState = (overrides = {}) => ({
  singlePlayerProfile: {
    gameSeed: 12345,
    credits: 1000,
    aiCores: 0,
    securityTokens: 0,
    defaultShipSlotId: 0,
    highestUnlockedSlot: 0,
    stats: { runsCompleted: 0, totalCombatsWon: 0, highestTierCompleted: 1 },
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
  ...overrides
});

// We need to import HangarScreen dynamically after all mocks are set up
let HangarScreen;

describe('Boss Hex on Hangar Grid', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock getBoundingClientRect for the map container
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600
    }));

    // Dynamic import to ensure mocks are applied
    const module = await import('../HangarScreen/HangarScreen.jsx');
    HangarScreen = module.default;
  });

  it('should generate a boss hex cell with isBoss: true', async () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: {
        setState: vi.fn(),
        isSlotUnlocked: vi.fn(() => true)
      }
    });

    const { container } = render(<HangarScreen />);

    // Wait for hex grid to generate
    await waitFor(() => {
      expect(container.querySelector('[data-boss-hex="true"]')).toBeInTheDocument();
    });

    // Look for boss hex element (should have distinct styling or data attribute)
    const bossHex = container.querySelector('[data-boss-hex="true"]');
    expect(bossHex).toBeInTheDocument();
  });

  it('should NOT place boss hex on same cell as map sector', async () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: {
        setState: vi.fn(),
        isSlotUnlocked: vi.fn(() => true)
      }
    });

    const { container } = render(<HangarScreen />);

    // Wait for hex grid to generate
    await waitFor(() => {
      expect(container.querySelector('[data-boss-hex="true"]')).toBeInTheDocument();
    });

    // Get all active sector hexes (map sectors)
    const sectorHexes = container.querySelectorAll('[data-sector-hex="true"]');
    const bossHex = container.querySelector('[data-boss-hex="true"]');

    if (bossHex && sectorHexes.length > 0) {
      const bossCoord = bossHex.getAttribute('data-coordinate');
      const sectorCoords = Array.from(sectorHexes).map(h => h.getAttribute('data-coordinate'));

      // Boss hex coordinate should not be in sector coordinates
      expect(sectorCoords).not.toContain(bossCoord);
    }
  });

  it('should render boss hex with distinct visual (red styling)', async () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: {
        setState: vi.fn(),
        isSlotUnlocked: vi.fn(() => true)
      }
    });

    const { container } = render(<HangarScreen />);

    // Wait for hex grid to generate
    await waitFor(() => {
      expect(container.querySelector('[data-boss-hex="true"]')).toBeInTheDocument();
    });

    // Boss hex should have red color scheme
    const bossHex = container.querySelector('[data-boss-hex="true"]');
    if (bossHex) {
      // The boss hex should contain red-colored elements
      const redElements = bossHex.querySelectorAll('[style*="239, 68, 68"], [stroke="#ef4444"], [fill*="239,68,68"]');
      expect(redElements.length).toBeGreaterThan(0);
    }
  });

  it('should open BossEncounterModal when boss hex clicked', async () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: {
        setState: vi.fn(),
        isSlotUnlocked: vi.fn(() => true)
      }
    });

    const { container } = render(<HangarScreen />);

    // Wait for hex grid to generate
    await waitFor(() => {
      expect(container.querySelector('[data-boss-hex="true"]')).toBeInTheDocument();
    });

    // Click boss hex
    const bossHex = container.querySelector('[data-boss-hex="true"]');
    if (bossHex) {
      fireEvent.click(bossHex);

      // Wait for modal to render
      await waitFor(() => {
        expect(screen.getByTestId('boss-encounter-modal')).toBeInTheDocument();
      });

      // BossEncounterModal should be visible
      expect(screen.getByTestId('boss-encounter-modal')).toBeInTheDocument();
    }
  });

  it('should pass correct bossId to BossEncounterModal', async () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: {
        setState: vi.fn(),
        isSlotUnlocked: vi.fn(() => true)
      }
    });

    const { container } = render(<HangarScreen />);

    // Wait for hex grid to generate
    await waitFor(() => {
      expect(container.querySelector('[data-boss-hex="true"]')).toBeInTheDocument();
    });

    // Click boss hex
    const bossHex = container.querySelector('[data-boss-hex="true"]');
    if (bossHex) {
      fireEvent.click(bossHex);

      // Wait for modal to render
      await waitFor(() => {
        expect(screen.getByTestId('boss-id')).toBeInTheDocument();
      });

      // Check bossId is passed correctly
      expect(screen.getByTestId('boss-id').textContent).toBe('BOSS_T1_NEMESIS');
    }
  });
});

describe('Boss Challenge Flow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600
    }));

    const module = await import('../HangarScreen/HangarScreen.jsx');
    HangarScreen = module.default;
  });

  it('should call initiateBossCombat when challenge confirmed', async () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: {
        setState: vi.fn(),
        isSlotUnlocked: vi.fn(() => true)
      }
    });

    const { container } = render(<HangarScreen />);

    // Wait for hex grid to generate
    await waitFor(() => {
      expect(container.querySelector('[data-boss-hex="true"]')).toBeInTheDocument();
    });

    // Click boss hex to open modal
    const bossHex = container.querySelector('[data-boss-hex="true"]');
    if (bossHex) {
      fireEvent.click(bossHex);

      // Wait for modal to render
      await waitFor(() => {
        expect(screen.getByTestId('challenge-btn')).toBeInTheDocument();
      });

      // Click challenge button
      const challengeBtn = screen.getByTestId('challenge-btn');
      fireEvent.click(challengeBtn);

      // initiateBossCombat should be called
      expect(SinglePlayerCombatInitializer.initiateBossCombat).toHaveBeenCalledWith('BOSS_T1_NEMESIS', 0);
    }
  });

  it('should close modal after initiating combat', async () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: {
        setState: vi.fn(),
        isSlotUnlocked: vi.fn(() => true)
      }
    });

    const { container } = render(<HangarScreen />);

    // Wait for hex grid to generate
    await waitFor(() => {
      expect(container.querySelector('[data-boss-hex="true"]')).toBeInTheDocument();
    });

    // Click boss hex to open modal
    const bossHex = container.querySelector('[data-boss-hex="true"]');
    if (bossHex) {
      fireEvent.click(bossHex);

      // Wait for modal to render
      await waitFor(() => {
        expect(screen.getByTestId('challenge-btn')).toBeInTheDocument();
      });

      // Click challenge button
      const challengeBtn = screen.getByTestId('challenge-btn');
      fireEvent.click(challengeBtn);

      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByTestId('boss-encounter-modal')).toBeNull();
      });

      // Modal should be closed
      expect(screen.queryByTestId('boss-encounter-modal')).toBeNull();
    }
  });
});
