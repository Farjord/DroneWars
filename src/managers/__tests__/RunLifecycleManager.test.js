import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
vi.mock('../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    { id: 'bridge_mk1', name: 'Bridge Mk1', type: 'Bridge', hull: 8, maxHull: 8, hullModifier: 0 },
    { id: 'power_mk1', name: 'Power Cell Mk1', type: 'Power Cell', hull: 8, maxHull: 8, hullModifier: 0 },
    { id: 'dch_mk1', name: 'Drone Hub Mk1', type: 'Drone Control Hub', hull: 8, maxHull: 8, hullModifier: 0 },
  ]
}));
vi.mock('../../data/shipData.js', () => ({
  getAllShips: vi.fn(() => [{ id: 'ship1', baseHull: 8, baseThresholds: { damaged: 4, critical: 0 } }]),
  getDefaultShip: vi.fn(() => ({ id: 'default', baseHull: 8, baseThresholds: { damaged: 4, critical: 0 } })),
}));
vi.mock('../../logic/statsCalculator.js', () => ({
  calculateSectionBaseStats: vi.fn((ship, comp) => ({ maxHull: comp.hull || 8, thresholds: { damaged: 4, critical: 0 } })),
}));
vi.mock('../../data/cardData.js', () => ({ default: [{ id: 'card1', name: 'Test Card' }] }));
vi.mock('../../logic/reputation/ReputationService.js', () => ({
  default: { awardReputation: vi.fn(() => ({ repGained: 10, newRep: 10, previousRep: 0, newLevel: 1, previousLevel: 1, leveledUp: false, levelsGained: 0, newRewards: [], loadout: { totalValue: 100, isStarterDeck: false }, wasCapped: false, tierCap: 0 })) }
}));
vi.mock('../../logic/singlePlayer/ExtractionController.js', () => ({
  calculateExtractedCredits: vi.fn(() => 500),
}));
vi.mock('../../data/cardPackData.js', () => ({
  generateRandomShopPack: vi.fn(() => ({ cards: ['card1'] })),
}));
vi.mock('../../utils/mapGenerator.js', () => ({
  generateMapData: vi.fn(() => ({
    hexes: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
    gates: [{ q: 0, r: 0 }],
    name: 'Test Sector',
    poiCount: 2,
    gateCount: 1,
    baseDetection: 0,
  })),
}));
vi.mock('../TacticalMapStateManager.js', () => ({
  default: {
    startRun: vi.fn(),
    endRun: vi.fn(),
    isRunActive: vi.fn(() => true),
    getState: vi.fn(() => null),
  }
}));
vi.mock('../TransitionManager.js', () => ({ default: { forceReset: vi.fn() } }));
vi.mock('../../utils/debugLogger.js', () => ({ debugLog: vi.fn() }));

import RunLifecycleManager from '../RunLifecycleManager.js';
import tacticalMapStateManager from '../TacticalMapStateManager.js';
import transitionManager from '../TransitionManager.js';
import { calculateExtractedCredits } from '../../logic/singlePlayer/ExtractionController.js';
import { generateRandomShopPack } from '../../data/cardPackData.js';
import ReputationService from '../../logic/reputation/ReputationService.js';

// --- Mock GSM Factory ---
function createMockGSM(stateOverrides = {}) {
  const baseState = {
    appState: 'hangar',
    runAbandoning: false,
    singlePlayerShipSlots: [
      {
        id: 0, status: 'active', shipId: 'ship1',
        sectionSlots: {
          l: { componentId: 'power_mk1', damageDealt: 0 },
          m: { componentId: 'bridge_mk1', damageDealt: 0 },
          r: { componentId: 'dch_mk1', damageDealt: 0 },
        },
        droneSlots: [], decklist: [],
      },
      {
        id: 1, status: 'active', shipId: 'ship1',
        sectionSlots: {
          l: { componentId: 'power_mk1', damageDealt: 2 },
          m: { componentId: 'bridge_mk1', damageDealt: 0 },
          r: { componentId: 'dch_mk1', damageDealt: 3 },
        },
        droneSlots: [], decklist: [],
      },
    ],
    singlePlayerProfile: {
      credits: 1000, securityTokens: 3, stats: { runsCompleted: 0, runsLost: 0, totalCreditsEarned: 0, totalCombatsWon: 0, highestTierCompleted: 0 },
      unlockedBlueprints: [],
    },
    singlePlayerInventory: {},
    gameActive: false, turnPhase: null, gameStage: 'preGame',
    player1: null, player2: null,
  };
  const state = { ...baseState, ...stateOverrides };
  return {
    state,
    setState: vi.fn((updates) => Object.assign(state, updates)),
  };
}

function createMockRunState(overrides = {}) {
  return {
    shipSlotId: 1, mapTier: 1,
    mapData: { name: 'Test Sector', hexes: [{ q: 0, r: 0 }], poiCount: 1 },
    collectedLoot: [{ type: 'card', cardId: 'card1' }],
    hexesExplored: [{ q: 0, r: 0 }], hexesMoved: 5, poisVisited: [],
    combatsWon: 2, combatsLost: 0, damageDealtToEnemies: 10,
    currentHull: 20, maxHull: 24, runStartTime: Date.now() - 60000,
    detection: 15,
    shipSections: {
      bridge: { hull: 6, maxHull: 8, lane: 'm' },
      powerCell: { hull: 8, maxHull: 8, lane: 'l' },
      droneControlHub: { hull: 6, maxHull: 8, lane: 'r' },
    },
    combatReputationEarned: [{ repEarned: 5 }],
    aiCoresEarned: 0,
    ...overrides,
  };
}

// --- Tests ---
describe('RunLifecycleManager', () => {
  let gsm;
  let rlm;

  beforeEach(() => {
    vi.clearAllMocks();
    gsm = createMockGSM();
    rlm = new RunLifecycleManager(gsm);
  });

  // --- startRun ---
  describe('startRun', () => {
    it('sets appState to tacticalMap, calls tacticalMapStateManager.startRun and transitionManager.forceReset', () => {
      const preMap = {
        hexes: [{ q: 0, r: 0 }], gates: [{ q: 0, r: 0 }],
        name: 'Pre Map', poiCount: 1, gateCount: 1, baseDetection: 0,
      };

      rlm.startRun(0, 1, 0, preMap);

      expect(tacticalMapStateManager.startRun).toHaveBeenCalledOnce();
      expect(transitionManager.forceReset).toHaveBeenCalledOnce();
      expect(gsm.state.appState).toBe('tacticalMap');
      expect(gsm.state.runAbandoning).toBe(false);
    });

    it('throws for an invalid (non-existent) ship slot', () => {
      expect(() => rlm.startRun(99, 1)).toThrow('Invalid ship slot ID');
    });

    it('throws for a non-active ship slot', () => {
      gsm.state.singlePlayerShipSlots[1].status = 'mia';
      expect(() => rlm.startRun(1, 1)).toThrow(/not active/);
    });

    it('deducts a security token when map requires one', () => {
      const tokenMap = {
        hexes: [{ q: 0, r: 0 }], gates: [{ q: 0, r: 0 }],
        name: 'Token Map', poiCount: 1, gateCount: 1, baseDetection: 0,
        requiresToken: true,
      };

      rlm.startRun(0, 2, 0, tokenMap);

      // setState is called multiple times; the first call should deduct the token
      const tokenCall = gsm.setState.mock.calls.find(
        ([update]) => update.singlePlayerProfile?.securityTokens !== undefined
      );
      expect(tokenCall).toBeDefined();
      expect(tokenCall[0].singlePlayerProfile.securityTokens).toBe(2);
    });

    it('returns early without starting run when token required but insufficient', () => {
      gsm.state.singlePlayerProfile.securityTokens = 0;
      const tokenMap = {
        hexes: [{ q: 0, r: 0 }], gates: [{ q: 0, r: 0 }],
        name: 'Token Map', poiCount: 1, gateCount: 1, baseDetection: 0,
        requiresToken: true,
      };

      rlm.startRun(0, 2, 0, tokenMap);

      expect(tacticalMapStateManager.startRun).not.toHaveBeenCalled();
    });

    it('builds sections from sectionSlots, applying damageDealt for non-slot-0 ships', () => {
      // Slot 1 has damageDealt: l=2, m=0, r=3. maxHull per component = 8.
      // Expected hull: l=6, m=8, r=5. Total = 19, maxHull = 24.
      const preMap = {
        hexes: [{ q: 0, r: 0 }], gates: [{ q: 0, r: 0 }],
        name: 'Test', poiCount: 1, gateCount: 1, baseDetection: 0,
      };

      rlm.startRun(1, 1, 0, preMap);

      const startRunArg = tacticalMapStateManager.startRun.mock.calls[0][0];
      const sections = startRunArg.shipSections;

      expect(sections.powerCell.hull).toBe(6);   // 8 - 2
      expect(sections.bridge.hull).toBe(8);       // 8 - 0
      expect(sections.droneControlHub.hull).toBe(5); // 8 - 3
    });

    it('ignores damageDealt for slot 0 (starter deck)', () => {
      // Give slot 0 some damage — it should be ignored
      gsm.state.singlePlayerShipSlots[0].sectionSlots.l.damageDealt = 5;
      const preMap = {
        hexes: [{ q: 0, r: 0 }], gates: [{ q: 0, r: 0 }],
        name: 'Test', poiCount: 1, gateCount: 1, baseDetection: 0,
      };

      rlm.startRun(0, 1, 0, preMap);

      const startRunArg = tacticalMapStateManager.startRun.mock.calls[0][0];
      const sections = startRunArg.shipSections;
      // All sections should be at full maxHull regardless of damageDealt
      expect(sections.powerCell.hull).toBe(8);
      expect(sections.bridge.hull).toBe(8);
      expect(sections.droneControlHub.hull).toBe(8);
    });

    it('uses ship card defaults when no sectionSlots or shipComponents exist', () => {
      // Remove sectionSlots entirely
      delete gsm.state.singlePlayerShipSlots[0].sectionSlots;
      const preMap = {
        hexes: [{ q: 0, r: 0 }], gates: [{ q: 0, r: 0 }],
        name: 'Test', poiCount: 1, gateCount: 1, baseDetection: 0,
      };

      rlm.startRun(0, 1, 0, preMap);

      const startRunArg = tacticalMapStateManager.startRun.mock.calls[0][0];
      const sections = startRunArg.shipSections;
      expect(sections.bridge.hull).toBe(8);
      expect(sections.bridge.maxHull).toBe(8);
      expect(sections.powerCell.hull).toBe(8);
      expect(sections.droneControlHub.hull).toBe(8);
    });
  });

  // --- endRun ---
  describe('endRun', () => {
    it('returns early when no active run exists', () => {
      tacticalMapStateManager.getState.mockReturnValue(null);

      rlm.endRun(true);

      expect(tacticalMapStateManager.endRun).not.toHaveBeenCalled();
      expect(gsm.setState).not.toHaveBeenCalled();
    });

    it('on success: transfers loot, adds credits, updates stats, persists hull damage, refreshes shop', () => {
      const mockRunState = createMockRunState();
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      rlm.endRun(true);

      expect(tacticalMapStateManager.endRun).toHaveBeenCalledOnce();

      // Single setState call at end of endRun
      const finalCall = gsm.setState.mock.calls[0][0];

      // Loot transferred to inventory
      expect(finalCall.singlePlayerInventory.card1).toBe(1);

      // Credits added (mock returns 500)
      expect(finalCall.singlePlayerProfile.credits).toBe(1500);

      // Stats updated
      expect(finalCall.singlePlayerProfile.stats.runsCompleted).toBe(1);
      expect(finalCall.singlePlayerProfile.stats.totalCreditsEarned).toBe(500);
      expect(finalCall.singlePlayerProfile.stats.totalCombatsWon).toBe(2);

      // Hull damage persisted to sectionSlots for slot 1
      const slot1 = finalCall.singlePlayerShipSlots.find(s => s.id === 1);
      expect(slot1.sectionSlots.m.damageDealt).toBe(2); // bridge: maxHull 8 - hull 6 = 2
      expect(slot1.sectionSlots.l.damageDealt).toBe(0); // powerCell: 8 - 8 = 0
      expect(slot1.sectionSlots.r.damageDealt).toBe(2); // droneControlHub: 8 - 6 = 2

      // Shop pack refreshed
      expect(generateRandomShopPack).toHaveBeenCalledOnce();
      expect(finalCall.singlePlayerProfile.shopPack).toEqual({ cards: ['card1'] });

      // Reputation awarded
      expect(ReputationService.awardReputation).toHaveBeenCalledOnce();
      expect(finalCall.lastRunSummary.reputation.repGained).toBe(10);
    });

    it('on failure (MIA): marks non-zero slot as MIA and increments runsLost', () => {
      const mockRunState = createMockRunState();
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      rlm.endRun(false);

      const finalCall = gsm.setState.mock.calls[0][0];

      // Slot 1 marked as MIA
      const slot1 = finalCall.singlePlayerShipSlots.find(s => s.id === 1);
      expect(slot1.status).toBe('mia');

      // runsLost incremented, runsCompleted unchanged
      expect(finalCall.singlePlayerProfile.stats.runsLost).toBe(1);
      expect(finalCall.singlePlayerProfile.stats.runsCompleted).toBe(0);

      // No loot transferred (credits unchanged)
      expect(finalCall.singlePlayerProfile.credits).toBe(1000);
    });

    it('on failure: slot 0 does NOT go MIA', () => {
      const mockRunState = createMockRunState({ shipSlotId: 0 });
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      rlm.endRun(false);

      const finalCall = gsm.setState.mock.calls[0][0];
      const slot0 = finalCall.singlePlayerShipSlots.find(s => s.id === 0);
      expect(slot0.status).toBe('active');
    });
  });
});
