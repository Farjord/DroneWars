// ========================================
// ROUND END ENTITIES — INTEGRATION TESTS
// ========================================
// Tests Repair Relay (tech) and Manticore (drone) ON_ROUND_END triggers
// through the full RoundManager → TriggerProcessor → EffectRouter pipeline.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock leaf dependencies only
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../utils/flowVerification.js', () => ({
  flowCheckpoint: vi.fn()
}));

vi.mock('../../utils/droneStateUtils.js', () => ({
  onDroneDestroyed: vi.fn((playerState) => playerState)
}));

vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn((dronesOnBoard) => dronesOnBoard)
}));

vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({
    maxShields: drone.shields || 0,
    attack: drone.attack || 1,
    speed: drone.speed || 1,
    keywords: new Set()
  }))
}));

// Break circular import: DamageEffectProcessor/DestroyEffectProcessor → gameLogic.js → CardPlayManager → EffectRouter
vi.mock('../../gameLogic.js', () => ({
  gameEngine: {}
}));

import RoundManager from '../RoundManager.js';

// Helper to create a player state with ship sections
const createPlayerState = (overrides = {}) => ({
  name: 'Player',
  dronesOnBoard: {
    lane1: [],
    lane2: [],
    lane3: []
  },
  techSlots: {
    lane1: [],
    lane2: [],
    lane3: []
  },
  shipSections: {},
  energy: 5,
  ...overrides
});

describe('RoundManager - ON_ROUND_END entity integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // REPAIR RELAY
  // ========================================

  describe('Repair Relay', () => {
    it('should heal ship section hull when owner controls the lane', () => {
      const repairRelay = {
        id: 'tech_rr_1',
        name: 'Repair Relay',
        hull: 1,
        isTech: true,
        statMods: []
      };

      const player1State = createPlayerState({
        dronesOnBoard: {
          lane1: [
            { id: 'p1_d1', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] },
            { id: 'p1_d2', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] }
          ],
          lane2: [],
          lane3: []
        },
        techSlots: {
          lane1: [repairRelay],
          lane2: [],
          lane3: []
        },
        shipSections: {
          Engines: { hull: 4, maxHull: 6, shields: 0, maxShields: 0 }
        }
      });

      // Player2 has 1 drone in lane1 → player1 controls (2 vs 1)
      const player2State = createPlayerState({
        dronesOnBoard: {
          lane1: [{ id: 'p2_d1', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] }],
          lane2: [],
          lane3: []
        },
        shipSections: {}
      });

      const placedSections = {
        player1: ['Engines', 'Bridge', 'Weapons'],
        player2: ['Shields', 'Bridge', 'Cargo']
      };

      const result = RoundManager.processRoundEndTriggers(
        player1State, player2State, placedSections, vi.fn()
      );

      // Repair Relay heals 1 hull to Engines (lane1 section)
      expect(result.player1.shipSections.Engines.hull).toBe(5);
    });

    it('should NOT heal when owner does NOT control the lane', () => {
      const repairRelay = {
        id: 'tech_rr_1',
        name: 'Repair Relay',
        hull: 1,
        isTech: true,
        statMods: []
      };

      const player1State = createPlayerState({
        dronesOnBoard: {
          lane1: [{ id: 'p1_d1', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] }],
          lane2: [],
          lane3: []
        },
        techSlots: {
          lane1: [repairRelay],
          lane2: [],
          lane3: []
        },
        shipSections: {
          Engines: { hull: 4, maxHull: 6, shields: 0, maxShields: 0 }
        }
      });

      // Player2 has 2 drones in lane1 → player2 controls (1 vs 2)
      const player2State = createPlayerState({
        dronesOnBoard: {
          lane1: [
            { id: 'p2_d1', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] },
            { id: 'p2_d2', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] }
          ],
          lane2: [],
          lane3: []
        },
        shipSections: {}
      });

      const placedSections = {
        player1: ['Engines', 'Bridge', 'Weapons'],
        player2: ['Shields', 'Bridge', 'Cargo']
      };

      const result = RoundManager.processRoundEndTriggers(
        player1State, player2State, placedSections, vi.fn()
      );

      // No heal — player1 doesn't control lane1
      expect(result.player1.shipSections.Engines.hull).toBe(4);
    });

    it('should NOT heal beyond max hull', () => {
      const repairRelay = {
        id: 'tech_rr_1',
        name: 'Repair Relay',
        hull: 1,
        isTech: true,
        statMods: []
      };

      const player1State = createPlayerState({
        dronesOnBoard: {
          lane1: [
            { id: 'p1_d1', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] },
            { id: 'p1_d2', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] }
          ],
          lane2: [],
          lane3: []
        },
        techSlots: {
          lane1: [repairRelay],
          lane2: [],
          lane3: []
        },
        shipSections: {
          Engines: { hull: 6, maxHull: 6, shields: 0, maxShields: 0 }
        }
      });

      const player2State = createPlayerState({
        dronesOnBoard: {
          lane1: [{ id: 'p2_d1', name: 'Dart', attack: 1, hull: 1, shields: 1, speed: 6, statMods: [] }],
          lane2: [],
          lane3: []
        },
        shipSections: {}
      });

      const placedSections = {
        player1: ['Engines', 'Bridge', 'Weapons'],
        player2: ['Shields', 'Bridge', 'Cargo']
      };

      const result = RoundManager.processRoundEndTriggers(
        player1State, player2State, placedSections, vi.fn()
      );

      // Already at max — stays at 6
      expect(result.player1.shipSections.Engines.hull).toBe(6);
    });
  });

  // ========================================
  // MANTICORE
  // ========================================

  describe('Manticore', () => {
    it('should deal 2 damage to a random enemy drone in its lane', () => {
      const manticore = {
        id: 'manticore_1',
        name: 'Manticore',
        attack: 1,
        hull: 1,
        shields: 0,
        speed: 3,
        statMods: []
      };

      const player1State = createPlayerState({
        dronesOnBoard: {
          lane1: [manticore],
          lane2: [],
          lane3: []
        }
      });

      const enemyDrone = {
        id: 'enemy_1',
        name: 'Dart',
        attack: 1,
        hull: 3,
        shields: 0,
        currentShields: 0,
        speed: 6,
        statMods: []
      };

      const player2State = createPlayerState({
        dronesOnBoard: {
          lane1: [enemyDrone],
          lane2: [],
          lane3: []
        }
      });

      const result = RoundManager.processRoundEndTriggers(
        player1State, player2State, {}, vi.fn()
      );

      // Enemy drone should have taken 2 hull damage (Manticore deals 2, no shields to absorb)
      const enemyAfter = result.player2.dronesOnBoard.lane1.find(d => d.id === 'enemy_1');
      expect(enemyAfter.hull).toBe(1);
    });

    it('should do nothing when no enemies in lane', () => {
      const manticore = {
        id: 'manticore_1',
        name: 'Manticore',
        attack: 1,
        hull: 1,
        shields: 0,
        speed: 3,
        statMods: []
      };

      const player1State = createPlayerState({
        dronesOnBoard: {
          lane1: [manticore],
          lane2: [],
          lane3: []
        }
      });

      const player2State = createPlayerState(); // No drones anywhere

      const result = RoundManager.processRoundEndTriggers(
        player1State, player2State, {}, vi.fn()
      );

      // Manticore still alive, no crash
      const manticoreAfter = result.player1.dronesOnBoard.lane1.find(d => d.id === 'manticore_1');
      expect(manticoreAfter).toBeDefined();
      expect(manticoreAfter.hull).toBe(1);
    });
  });
});
