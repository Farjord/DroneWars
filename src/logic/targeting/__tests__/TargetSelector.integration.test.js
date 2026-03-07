import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock gameLogic to break circular dependency
vi.mock('../../gameLogic.js', () => ({
  gameEngine: {
    onDroneDestroyed: vi.fn().mockReturnValue({ deployedDroneCounts: {} })
  }
}));

vi.mock('../../combat/AttackProcessor.js', () => ({
  resolveAttack: vi.fn()
}));

vi.mock('../../effects/damage/animations/DefaultDamageAnimation.js', () => ({
  buildDefaultDamageAnimation: vi.fn().mockReturnValue([])
}));
vi.mock('../../effects/damage/animations/RailgunAnimation.js', () => ({
  buildRailgunAnimation: vi.fn().mockReturnValue([])
}));
vi.mock('../../effects/damage/animations/OverflowAnimation.js', () => ({
  buildOverflowAnimation: vi.fn().mockReturnValue([])
}));
vi.mock('../../effects/damage/animations/SplashAnimation.js', () => ({
  buildSplashAnimation: vi.fn().mockReturnValue([])
}));
vi.mock('../../effects/damage/animations/FilteredDamageAnimation.js', () => ({
  buildFilteredDamageAnimation: vi.fn().mockReturnValue([{ type: 'FILTERED_DAMAGE' }])
}));
vi.mock('../../effects/destroy/animations/DefaultDestroyAnimation.js', () => ({
  buildDefaultDestroyAnimation: vi.fn().mockReturnValue([])
}));
vi.mock('../../effects/destroy/animations/NukeAnimation.js', () => ({
  buildNukeAnimation: vi.fn().mockReturnValue([])
}));
vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({ ...drone }))
}));

// Mock TriggerProcessor dependencies
vi.mock('../../../data/droneData.js', () => ({ default: [] }));
vi.mock('../../../data/techData.js', () => ({ default: [] }));
vi.mock('../../utils/droneStateUtils.js', () => ({
  onDroneDestroyed: vi.fn().mockReturnValue({ deployedDroneCounts: {} })
}));
vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn((ps) => ps.dronesOnBoard)
}));
vi.mock('../../EffectRouter.js', () => {
  class MockEffectRouter {
    routeEffect() { return { newPlayerStates: null, animationEvents: [] }; }
  }
  return { default: MockEffectRouter };
});

import DamageEffectProcessor from '../../effects/damage/DamageEffectProcessor.js';
import DestroyEffectProcessor from '../../effects/DestroyEffectProcessor.js';
import TriggerProcessor from '../../triggers/TriggerProcessor.js';

// ---- Helpers ----

const makeDrone = (id, name, overrides = {}) => ({
  id, name, hull: 4, currentShields: 1, speed: 3, attack: 2, class: 1,
  owner: 'player2', isExhausted: false, isMarked: false,
  ...overrides
});

const basePlayerStates = (lane1Drones = []) => ({
  player1: {
    name: 'Player 1', energy: 10,
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: { bridge: { hull: 10, allocatedShields: 5 } },
    deployedDroneCounts: {}, appliedUpgrades: {}, droneAvailability: {}
  },
  player2: {
    name: 'Player 2', energy: 10,
    dronesOnBoard: { lane1: lane1Drones, lane2: [], lane3: [] },
    shipSections: { bridge: { hull: 10, allocatedShields: 5 } },
    deployedDroneCounts: {}, appliedUpgrades: {}, droneAvailability: {}
  }
});

const placedSections = { player1: ['bridge', null, null], player2: ['bridge', null, null] };

// ---- Tests ----

describe('TargetSelector integration', () => {

  describe('DamageEffectProcessor + targetSelection', () => {
    let processor;
    beforeEach(() => { processor = new DamageEffectProcessor(); });

    it('RANDOM count=1 damages exactly 1 drone in a lane of 3', () => {
      const drones = [
        makeDrone('d1', 'Alpha', { hull: 4, currentShields: 0 }),
        makeDrone('d2', 'Beta', { hull: 4, currentShields: 0 }),
        makeDrone('d3', 'Gamma', { hull: 4, currentShields: 0 })
      ];

      const result = processor.process({ type: 'DAMAGE', value: 2 }, {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: basePlayerStates(drones),
        placedSections,
        callbacks: { logCallback: vi.fn() },
        card: {
          id: 'TEST', name: 'Random Strike', instanceId: 'inst_1',
          targeting: { type: 'LANE', affinity: 'ENEMY', targetSelection: { method: 'RANDOM', count: 1 } }
        },
        gameSeed: 42, roundNumber: 1
      });

      const damaged = result.newPlayerStates.player2.dronesOnBoard.lane1.filter(d => d.hull < 4);
      expect(damaged).toHaveLength(1);
      expect(damaged[0].hull).toBe(2);
    });

    it('affectedFilter narrows pool, then targetSelection picks from filtered', () => {
      const drones = [
        makeDrone('fast1', 'Dart', { speed: 6, hull: 4, currentShields: 0 }),
        makeDrone('slow1', 'Tank', { speed: 2, hull: 4, currentShields: 0 }),
        makeDrone('slow2', 'Mule', { speed: 3, hull: 4, currentShields: 0 })
      ];

      const result = processor.process({ type: 'DAMAGE', value: 1 }, {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: basePlayerStates(drones),
        placedSections,
        callbacks: { logCallback: vi.fn() },
        card: {
          id: 'TEST', name: 'Slow Hunter', instanceId: 'inst_2',
          targeting: {
            type: 'LANE', affinity: 'ENEMY',
            affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 4 }],
            targetSelection: { method: 'RANDOM', count: 1 }
          }
        },
        gameSeed: 42, roundNumber: 1
      });

      const lane1 = result.newPlayerStates.player2.dronesOnBoard.lane1;
      expect(lane1.find(d => d.id === 'fast1').hull).toBe(4); // Fast drone untouched
      expect(lane1.filter(d => d.hull < 4)).toHaveLength(1); // Exactly 1 slow drone hit
    });

    it('HIGHEST with tied stats produces deterministic result across runs', () => {
      const makeDrones = () => [
        makeDrone('t1', 'A', { attack: 5, hull: 4, currentShields: 0 }),
        makeDrone('t2', 'B', { attack: 5, hull: 4, currentShields: 0 }),
        makeDrone('t3', 'C', { attack: 5, hull: 4, currentShields: 0 })
      ];
      const card = {
        id: 'TEST', name: 'Snipe', instanceId: 'inst_3',
        targeting: { type: 'LANE', affinity: 'ENEMY', targetSelection: { method: 'HIGHEST', stat: 'attack', count: 1 } }
      };

      const run = () => processor.process({ type: 'DAMAGE', value: 1 }, {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: basePlayerStates(makeDrones()),
        placedSections,
        callbacks: { logCallback: vi.fn() },
        card, gameSeed: 99, roundNumber: 2
      });

      const hit1 = run().newPlayerStates.player2.dronesOnBoard.lane1.find(d => d.hull < 4);
      const hit2 = run().newPlayerStates.player2.dronesOnBoard.lane1.find(d => d.hull < 4);
      expect(hit1.id).toBe(hit2.id);
    });

    it('RANDOM count=2 damages exactly 2 drones', () => {
      const drones = [
        makeDrone('m1', 'A', { hull: 4, currentShields: 0 }),
        makeDrone('m2', 'B', { hull: 4, currentShields: 0 }),
        makeDrone('m3', 'C', { hull: 4, currentShields: 0 })
      ];

      const result = processor.process({ type: 'DAMAGE', value: 1 }, {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: basePlayerStates(drones),
        placedSections,
        callbacks: { logCallback: vi.fn() },
        card: {
          id: 'TEST', name: 'Double', instanceId: 'inst_4',
          targeting: { type: 'LANE', affinity: 'ENEMY', targetSelection: { method: 'RANDOM', count: 2 } }
        },
        gameSeed: 42, roundNumber: 1
      });

      expect(result.newPlayerStates.player2.dronesOnBoard.lane1.filter(d => d.hull < 4)).toHaveLength(2);
    });
  });

  describe('DestroyEffectProcessor + targetSelection', () => {
    it('LOWEST stat=class count=1 destroys only the lowest class drone', () => {
      const drones = [
        makeDrone('c1', 'Heavy', { class: 3 }),
        makeDrone('c2', 'Light', { class: 1 }),
        makeDrone('c3', 'Medium', { class: 2 })
      ];

      const processor = new DestroyEffectProcessor();
      const result = processor.process({
        type: 'DESTROY',
        targeting: { affinity: 'ENEMY', targetSelection: { method: 'LOWEST', stat: 'class', count: 1 } }
      }, {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: basePlayerStates(drones),
        placedSections,
        card: { id: 'TEST', name: 'Cull', instanceId: 'inst_5' },
        gameSeed: 42, roundNumber: 1
      });

      const lane1 = result.newPlayerStates.player2.dronesOnBoard.lane1;
      expect(lane1).toHaveLength(2);
      expect(lane1.find(d => d.id === 'c2')).toBeUndefined(); // Light (class 1) destroyed
      expect(lane1.find(d => d.id === 'c1')).toBeDefined();
      expect(lane1.find(d => d.id === 'c3')).toBeDefined();
    });
  });

  describe('TriggerProcessor._buildTarget + targetSelection', () => {
    it('HIGHEST resolves drone pool and selects highest stat target', () => {
      const tp = new TriggerProcessor();
      const states = {
        player1: {
          name: 'P1', energy: 10,
          dronesOnBoard: { lane1: [makeDrone('r1', 'Reactor', { owner: 'player1' })], lane2: [], lane3: [] },
          shipSections: {}, deployedDroneCounts: {}, appliedUpgrades: {}
        },
        player2: {
          name: 'P2', energy: 10,
          dronesOnBoard: {
            lane1: [
              makeDrone('e1', 'Scout', { speed: 5 }),
              makeDrone('e2', 'Bruiser', { speed: 2 }),
              makeDrone('e3', 'Runner', { speed: 4 })
            ], lane2: [], lane3: []
          },
          shipSections: {}, deployedDroneCounts: {}, appliedUpgrades: {}
        }
      };

      const effect = {
        type: 'DAMAGE', value: 1, scope: 'SAME_LANE', affinity: 'ENEMY',
        targetSelection: { method: 'HIGHEST', stat: 'speed', count: 1 }
      };

      const targets = tp._buildTarget(effect, states.player1.dronesOnBoard.lane1[0], 'player1', 'lane1', states, 42);
      expect(Array.isArray(targets)).toBe(true);
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('e1'); // Scout has highest speed (5)
    });

    it('NOT_MARKED filter excludes marked drones from pool', () => {
      const tp = new TriggerProcessor();
      const states = {
        player1: {
          name: 'P1', energy: 10,
          dronesOnBoard: { lane1: [makeDrone('r1', 'Scanner', { owner: 'player1' })], lane2: [], lane3: [] },
          shipSections: {}, deployedDroneCounts: {}, appliedUpgrades: {}
        },
        player2: {
          name: 'P2', energy: 10,
          dronesOnBoard: {
            lane1: [
              makeDrone('e1', 'Marked', { isMarked: true }),
              makeDrone('e2', 'Free-A', { isMarked: false }),
              makeDrone('e3', 'Free-B', { isMarked: false })
            ], lane2: [], lane3: []
          },
          shipSections: {}, deployedDroneCounts: {}, appliedUpgrades: {}
        }
      };

      const effect = {
        type: 'MARK_DRONE', scope: 'SAME_LANE', affinity: 'ENEMY',
        targetSelection: { method: 'RANDOM', count: 1 }, filter: 'NOT_MARKED'
      };

      const targets = tp._buildTarget(effect, states.player1.dronesOnBoard.lane1[0], 'player1', 'lane1', states, 42);
      expect(targets).toHaveLength(1);
      expect(targets[0].id).not.toBe('e1'); // Marked drone excluded
    });
  });
});
