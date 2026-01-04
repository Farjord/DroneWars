import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * TDD Tests for Boss Combat Initiation
 *
 * Tests for initiateBossCombat method that:
 * - Finds boss AI by bossId (not name)
 * - Sets isBossCombat and bossId flags in singlePlayerEncounter
 * - Increments totalBossAttempts in profile
 * - Does NOT require tactical map (no hexes in currentRunState)
 */

// Mock dependencies
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    get: vi.fn(() => null),
    getDroneDamageStateForSlot: vi.fn(() => ({})),
    actionProcessor: {
      phaseAnimationQueue: {
        queueAnimation: vi.fn()
      },
      setAIPhaseProcessor: vi.fn()
    },
    gameFlowManager: {
      processRoundInitialization: vi.fn(async () => 'deployment'),
      transitionToPhase: vi.fn(async () => {})
    }
  }
}));

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../managers/AIPhaseProcessor.js', () => ({
  default: {
    initialize: vi.fn()
  }
}));

vi.mock('../gameLogic.js', () => ({
  gameEngine: {
    createCard: vi.fn((template, id) => ({ ...template, instanceId: id }))
  }
}));

vi.mock('../../data/shipData.js', () => ({
  getShipById: vi.fn(() => ({
    id: 'SHIP_001',
    name: 'Test Ship',
    stats: { hull: 30, shields: 5, energy: 5, deploymentBudget: 10 }
  })),
  getDefaultShip: vi.fn(() => ({
    id: 'SHIP_001',
    name: 'Default Ship',
    stats: { hull: 30, shields: 5, energy: 5, deploymentBudget: 10 }
  }))
}));

vi.mock('../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    { id: 'BRIDGE_001', key: 'bridge', name: 'Bridge', type: 'Bridge', lane: 'm' },
    { id: 'POWERCELL_001', key: 'powerCell', name: 'Power Cell', type: 'Power Cell', lane: 'l' },
    { id: 'DRONECONTROL_001', key: 'droneControlHub', name: 'Drone Control Hub', type: 'Drone Control Hub', lane: 'r' }
  ]
}));

vi.mock('../statsCalculator.js', () => ({
  calculateEffectiveShipStats: vi.fn(() => ({})),
  calculateSectionBaseStats: vi.fn(() => ({
    hull: 10,
    maxHull: 10,
    shields: 0,
    allocatedShields: 0,
    thresholds: []
  }))
}));

vi.mock('../../data/cardData.js', () => ({
  default: [
    { id: 'CARD001', name: 'Test Card 1' },
    { id: 'CARD002', name: 'Test Card 2' }
  ]
}));

vi.mock('../../data/droneData.js', () => ({
  default: [
    { name: 'Dart', limit: 2 },
    { name: 'Mammoth', limit: 1 },
    { name: 'Devastator', limit: 1 }
  ]
}));

vi.mock('../../data/aiData.js', () => ({
  default: [
    {
      name: 'Rogue Scout Pattern',
      modes: ['extraction'],
      shipId: 'SHIP_003',
      dronePool: ['Dart', 'Talon'],
      decklist: [{ id: 'CARD001', quantity: 4 }]
    },
    {
      bossId: 'BOSS_T1_NEMESIS',
      name: 'Nemesis-Class Dreadnought',
      modes: ['boss'],
      difficulty: 'Hard',
      shipId: 'SHIP_001',
      dronePool: ['Mammoth', 'Devastator'],
      decklist: [{ id: 'CARD001', quantity: 4 }],
      bossConfig: {
        displayName: 'THE NEMESIS',
        subtitle: 'Commander of the Eremos Blockade',
        firstTimeReward: { credits: 5000, aiCores: 3, reputation: 500 },
        repeatReward: { credits: 1000, aiCores: 1, reputation: 100 }
      }
    }
  ]
}));

vi.mock('../../utils/seededRandom.js', () => ({
  default: class SeededRandom {
    constructor() {}
    shuffle(arr) { return arr; }
  }
}));

vi.mock('../../utils/slotDamageUtils.js', () => ({
  buildActiveDronePool: vi.fn(() => [
    { name: 'Dart', limit: 2, effectiveLimit: 2 }
  ])
}));

// Import after mocks
import SinglePlayerCombatInitializer from './SinglePlayerCombatInitializer.js';
import gameStateManager from '../../managers/GameStateManager.js';

describe('initiateBossCombat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock state
    gameStateManager.getState.mockReturnValue({
      singlePlayerShipSlots: [{
        id: 0,
        status: 'active',
        shipId: 'SHIP_001',
        decklist: [{ id: 'CARD001', quantity: 4 }],
        droneSlots: [
          { slotIndex: 0, assignedDrone: 'Dart', slotDamaged: false }
        ]
      }],
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],
          totalBossVictories: 0,
          totalBossAttempts: 0
        }
      }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should find boss AI by bossId', async () => {
    const result = await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);

    // Should succeed
    expect(result).toBe(true);

    // Find the setState call that has singlePlayerEncounter with aiName
    const setStateCalls = gameStateManager.setState.mock.calls;
    const encounterCall = setStateCalls.find(call =>
      call[0].singlePlayerEncounter?.aiName
    );

    expect(encounterCall).toBeDefined();
    expect(encounterCall[0].singlePlayerEncounter.aiName).toBe('Nemesis-Class Dreadnought');
  });

  it('should set isBossCombat flag in singlePlayerEncounter', async () => {
    await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);

    // Find the setState call that adds isBossCombat flag
    const setStateCalls = gameStateManager.setState.mock.calls;
    const bossCall = setStateCalls.find(call =>
      call[0].singlePlayerEncounter?.isBossCombat !== undefined
    );

    expect(bossCall).toBeDefined();
    expect(bossCall[0].singlePlayerEncounter.isBossCombat).toBe(true);
  });

  it('should set bossId in singlePlayerEncounter', async () => {
    await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);

    // Find the setState call that adds bossId
    const setStateCalls = gameStateManager.setState.mock.calls;
    const bossCall = setStateCalls.find(call =>
      call[0].singlePlayerEncounter?.bossId !== undefined
    );

    expect(bossCall).toBeDefined();
    expect(bossCall[0].singlePlayerEncounter.bossId).toBe('BOSS_T1_NEMESIS');
  });

  it('should increment totalBossAttempts in profile', async () => {
    await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);

    // Check that setState was called to update the profile
    const setStateCalls = gameStateManager.setState.mock.calls;

    // Find the call that updates singlePlayerProfile
    const profileUpdateCall = setStateCalls.find(call =>
      call[0].singlePlayerProfile?.bossProgress?.totalBossAttempts !== undefined
    );

    expect(profileUpdateCall).toBeDefined();
    expect(profileUpdateCall[0].singlePlayerProfile.bossProgress.totalBossAttempts).toBe(1);
  });

  it('should NOT require tactical map (no currentRunState.hexes)', async () => {
    // Mock state without any tactical map hexes
    gameStateManager.getState.mockReturnValue({
      singlePlayerShipSlots: [{
        id: 0,
        status: 'active',
        shipId: 'SHIP_001',
        decklist: [{ id: 'CARD001', quantity: 4 }],
        droneSlots: [{ slotIndex: 0, assignedDrone: 'Dart', slotDamaged: false }]
      }],
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],
          totalBossVictories: 0,
          totalBossAttempts: 0
        }
      }
      // No currentRunState with hexes!
    });

    // Should still succeed without tactical map data
    const result = await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);
    expect(result).toBe(true);

    // Verify combat was initiated - find the call that sets appState
    const setStateCalls = gameStateManager.setState.mock.calls;
    const gameStateCall = setStateCalls.find(call => call[0].appState === 'inGame');

    expect(gameStateCall).toBeDefined();
    expect(gameStateCall[0].appState).toBe('inGame');
    expect(gameStateCall[0].gameActive).toBe(true);
  });

  it('should return false if boss AI not found', async () => {
    const result = await SinglePlayerCombatInitializer.initiateBossCombat('NON_EXISTENT_BOSS', 0);

    expect(result).toBe(false);
  });

  it('should use specified ship slot', async () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerShipSlots: [
        { id: 0, status: 'active', shipId: 'SHIP_001', decklist: [], droneSlots: [] },
        { id: 1, status: 'active', shipId: 'SHIP_002', decklist: [{ id: 'CARD002', quantity: 2 }], droneSlots: [] }
      ],
      singlePlayerProfile: {
        bossProgress: { defeatedBosses: [], totalBossVictories: 0, totalBossAttempts: 0 }
      }
    });

    const result = await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 1);

    expect(result).toBe(true);
  });
});

describe('getBossAIByBossId', () => {
  it('should find boss AI by bossId field', () => {
    const bossAI = SinglePlayerCombatInitializer.getBossAIByBossId('BOSS_T1_NEMESIS');

    expect(bossAI).toBeDefined();
    expect(bossAI.bossId).toBe('BOSS_T1_NEMESIS');
    expect(bossAI.modes).toContain('boss');
  });

  it('should return null for non-existent bossId', () => {
    const bossAI = SinglePlayerCombatInitializer.getBossAIByBossId('NON_EXISTENT');

    expect(bossAI).toBeNull();
  });
});

/**
 * TDD Tests for Boss Combat Ship Sections Loading
 *
 * Bug: initiateBossCombat creates minimal bossRunState without shipSections,
 * causing buildPlayerState to fall back to defaults instead of using the
 * player's configured ship slot sectionSlots.
 */
describe('initiateBossCombat - Ship Sections Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should load ship sections from ship slot sectionSlots', async () => {
    // Ship slot with custom sectionSlots configuration
    gameStateManager.getState.mockReturnValue({
      singlePlayerShipSlots: [{
        id: 0,
        status: 'active',
        shipId: 'SHIP_001',
        decklist: [{ id: 'CARD001', quantity: 4 }],
        droneSlots: [{ slotIndex: 0, assignedDrone: 'Dart', slotDamaged: false }],
        // Custom sectionSlots configuration
        sectionSlots: {
          l: { componentId: 'POWERCELL_001', damageDealt: 0 },
          m: { componentId: 'BRIDGE_001', damageDealt: 0 },
          r: { componentId: 'DRONECONTROL_001', damageDealt: 0 }
        }
      }],
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],
          totalBossVictories: 0,
          totalBossAttempts: 0
        }
      }
    });

    await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);

    // Find the setState call that sets player1 state
    const setStateCalls = gameStateManager.setState.mock.calls;
    const gameStateCall = setStateCalls.find(call => call[0].player1?.shipSections);

    expect(gameStateCall).toBeDefined();

    // Should have loaded ship sections from sectionSlots, not defaults
    const shipSections = gameStateCall[0].player1.shipSections;
    expect(shipSections.bridge).toBeDefined();
    expect(shipSections.bridge.id).toBe('BRIDGE_001');
    expect(shipSections.powerCell).toBeDefined();
    expect(shipSections.powerCell.id).toBe('POWERCELL_001');
    expect(shipSections.droneControlHub).toBeDefined();
    expect(shipSections.droneControlHub.id).toBe('DRONECONTROL_001');
  });

  it('should use custom component configurations from sectionSlots', async () => {
    // Ship slot with custom upgraded components
    gameStateManager.getState.mockReturnValue({
      singlePlayerShipSlots: [{
        id: 0,
        status: 'active',
        shipId: 'SHIP_001',
        decklist: [{ id: 'CARD001', quantity: 4 }],
        droneSlots: [],
        sectionSlots: {
          l: { componentId: 'POWERCELL_001', damageDealt: 0 },
          m: { componentId: 'BRIDGE_001', damageDealt: 0 },
          r: { componentId: 'DRONECONTROL_001', damageDealt: 0 }
        }
      }],
      singlePlayerProfile: {
        bossProgress: { defeatedBosses: [], totalBossVictories: 0, totalBossAttempts: 0 }
      }
    });

    await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);

    // Find the setState call that sets player1
    const setStateCalls = gameStateManager.setState.mock.calls;
    const gameStateCall = setStateCalls.find(call => call[0].player1?.shipSections);

    expect(gameStateCall).toBeDefined();

    // Each section should have component data from the mock shipComponentCollection
    const shipSections = gameStateCall[0].player1.shipSections;
    expect(shipSections.bridge.name).toBe('Bridge');
    expect(shipSections.powerCell.name).toBe('Power Cell');
    expect(shipSections.droneControlHub.name).toBe('Drone Control Hub');
  });

  it('should preserve lane assignments from sectionSlots', async () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerShipSlots: [{
        id: 0,
        status: 'active',
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [],
        sectionSlots: {
          l: { componentId: 'BRIDGE_001', damageDealt: 0 },  // Bridge in left lane (unusual)
          m: { componentId: 'POWERCELL_001', damageDealt: 0 },
          r: { componentId: 'DRONECONTROL_001', damageDealt: 0 }
        }
      }],
      singlePlayerProfile: {
        bossProgress: { defeatedBosses: [], totalBossVictories: 0, totalBossAttempts: 0 }
      }
    });

    await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);

    // Find the setState call with player1
    const setStateCalls = gameStateManager.setState.mock.calls;
    const gameStateCall = setStateCalls.find(call => call[0].player1?.shipSections);

    expect(gameStateCall).toBeDefined();

    // Lane assignments should be preserved
    const shipSections = gameStateCall[0].player1.shipSections;
    expect(shipSections.bridge.lane).toBe('l');
    expect(shipSections.powerCell.lane).toBe('m');
    expect(shipSections.droneControlHub.lane).toBe('r');
  });

  it('should apply damage from sectionSlots damageDealt', async () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerShipSlots: [{
        id: 0,
        status: 'active',
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [],
        sectionSlots: {
          l: { componentId: 'POWERCELL_001', damageDealt: 3 },  // 3 damage dealt
          m: { componentId: 'BRIDGE_001', damageDealt: 0 },
          r: { componentId: 'DRONECONTROL_001', damageDealt: 5 }  // 5 damage dealt
        }
      }],
      singlePlayerProfile: {
        bossProgress: { defeatedBosses: [], totalBossVictories: 0, totalBossAttempts: 0 }
      }
    });

    await SinglePlayerCombatInitializer.initiateBossCombat('BOSS_T1_NEMESIS', 0);

    // Find the setState call with player1
    const setStateCalls = gameStateManager.setState.mock.calls;
    const gameStateCall = setStateCalls.find(call => call[0].player1?.shipSections);

    expect(gameStateCall).toBeDefined();

    // Hull should be maxHull - damageDealt
    // Mock calculateSectionBaseStats returns maxHull: 10
    const shipSections = gameStateCall[0].player1.shipSections;
    expect(shipSections.powerCell.hull).toBe(7);  // 10 - 3
    expect(shipSections.bridge.hull).toBe(10);     // 10 - 0
    expect(shipSections.droneControlHub.hull).toBe(5);  // 10 - 5
  });
});
