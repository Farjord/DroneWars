// ========================================
// AI CARD EVALUATORS - UNIT TESTS
// ========================================
// Comprehensive tests for all card evaluation functions

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateDestroyCard, evaluateDamageCard, evaluateOverflowDamageCard, evaluateSplashDamageCard, evaluateDamageScalingCard, evaluateDestroyUpgradeCard } from '../damageCards.js';
import { evaluateGainEnergyCard, evaluateDrawCard, evaluateSearchAndDrawCard } from '../utilityCards.js';
import { evaluateHealShieldsCard, evaluateHealHullCard, evaluateRestoreSectionShieldsCard } from '../healCards.js';
import { evaluateRepeatingEffectCard, evaluateModifyStatCard } from '../statCards.js';
import { evaluateSingleMoveCard, evaluateMultiMoveCard } from '../movementCards.js';
import { evaluateCreateTokensCard } from '../droneCards.js';
import { evaluateModifyDroneBaseCard } from '../upgradeCards.js';
import { CARD_EVALUATION, SCORING_WEIGHTS, INVALID_SCORE, UPGRADE_EVALUATION } from '../../aiConstants.js';

// Mock external dependencies for complex evaluators
vi.mock('../../scoring/laneScoring.js', () => ({
  calculateLaneScore: vi.fn(() => 10)
}));

vi.mock('../../helpers/jammerHelpers.js', () => ({
  hasJammerInLane: vi.fn(() => false)
}));

vi.mock('../../helpers/upgradeHelpers.js', () => ({
  getDeployedDroneCount: vi.fn(() => 2),
  getReadyDroneCountByType: vi.fn(() => 1),
  getRemainingDeploymentCapacity: vi.fn(() => 2),
  getRemainingUpgradeSlots: vi.fn(() => 2),
  droneHasUpgradedKeyword: vi.fn(() => false)
}));

vi.mock('../../../../data/droneData.js', () => ({
  default: [
    { name: 'Test Drone', class: 1, attack: 2, speed: 3, abilities: [] },
    { name: 'Specter', class: 2, attack: 3, speed: 4, abilities: [
      { type: 'TRIGGERED', trigger: 'ON_MOVE', effects: [
        { type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1 } }
      ]}
    ]}
  ]
}));

// ========================================
// MOCK FACTORIES
// ========================================

const createMockDrone = (overrides = {}) => ({
  id: 'drone_1',
  name: 'Test Drone',
  class: 1,
  attack: 2,
  speed: 3,
  hull: 2,
  currentShields: 1,
  currentMaxShields: 2,
  isExhausted: false,
  isMarked: false,
  owner: 'player1',
  ...overrides
});

const createMockPlayer = (id, overrides = {}) => ({
  id,
  energy: 5,
  hand: [],
  dronesOnBoard: {
    lane1: [],
    lane2: [],
    lane3: []
  },
  shipSections: {
    bridge: { hull: 3, maxHull: 3 },
    powerCell: { hull: 3, maxHull: 3 },
    droneControlHub: { hull: 3, maxHull: 3 }
  },
  ...overrides
});

const createMockGameDataService = () => ({
  getEffectiveStats: vi.fn((drone, lane) => ({
    attack: drone?.attack || 2,
    speed: drone?.speed || 3,
    hull: drone?.hull || 2,
    maxShields: drone?.currentMaxShields || 2,
    keywords: new Set()
  }))
});

const createMockContext = (overrides = {}) => ({
  player1: createMockPlayer('player1'),
  player2: createMockPlayer('player2'),
  gameDataService: createMockGameDataService(),
  getLaneOfDrone: vi.fn(() => 'lane1'),
  placedSections: ['bridge', 'powerCell', 'droneControlHub'],
  allSections: {},
  getShipStatus: vi.fn(() => 'healthy'),
  ...overrides
});

// ========================================
// DAMAGE CARD EVALUATORS
// ========================================

describe('evaluateOverflowDamageCard', () => {
  // Uses unified target scoring with flat bonuses:
  // Ready: +25, Class 1: +3, Attack 2: +4, Lethal: +20, Piercing bypass: +5
  // OVERFLOW_SHIP_DAMAGE_MULTIPLIER: 12
  // COST_PENALTY_MULTIPLIER: 4

  it('calculates base damage value correctly', () => {
    const card = {
      id: 'CARD031',
      cost: 5,
      effect: { type: 'OVERFLOW_DAMAGE', baseDamage: 2, isPiercing: true, markedBonus: 2 }
    };
    const target = createMockDrone({ hull: 10, currentShields: 0, isMarked: false, class: 1 });
    const context = createMockContext();

    const result = evaluateOverflowDamageCard(card, target, context);

    // Unified scoring: Ready(25) + Class1(3) + Attack2(4) = 32
    // No lethal (10 hull > 2 damage)
    // No overflow, no piercing bypass (no shields)
    // Cost: 5 × 4 = 20
    // Expected: 32 - 20 = 12
    expect(result.score).toBe(12);
  });

  it('adds lethal bonus when damage kills target', () => {
    const card = {
      id: 'CARD031',
      cost: 5,
      effect: { type: 'OVERFLOW_DAMAGE', baseDamage: 2, isPiercing: true, markedBonus: 2 }
    };
    const target = createMockDrone({ hull: 2, currentShields: 0, isMarked: false, class: 2 });
    const context = createMockContext();

    const result = evaluateOverflowDamageCard(card, target, context);

    // Unified scoring: Ready(25) + Class2(6) + Attack2(4) + Lethal(20) = 55
    // No overflow (exactly kills)
    // Cost: 20
    // Expected: 55 - 20 = 35
    expect(result.score).toBe(35);
    expect(result.logic.some(l => l.includes('Lethal'))).toBe(true);
  });

  it('calculates overflow damage to ship correctly', () => {
    const card = {
      id: 'CARD031',
      cost: 5,
      effect: { type: 'OVERFLOW_DAMAGE', baseDamage: 2, isPiercing: true, markedBonus: 2 }
    };
    const target = createMockDrone({ hull: 1, currentShields: 0, isMarked: false, class: 1 });
    const context = createMockContext();

    const result = evaluateOverflowDamageCard(card, target, context);

    // Unified scoring: Ready(25) + Class1(3) + Attack2(4) + Lethal(20) = 52
    // Overflow: 2 - 1 = 1 → 1 × 12 = 12
    // Cost: 20
    // Expected: 52 + 12 - 20 = 44
    expect(result.score).toBe(44);
    expect(result.logic.some(l => l.includes('Overflow'))).toBe(true);
  });

  it('applies marked bonus to increase damage', () => {
    const card = {
      id: 'CARD031',
      cost: 5,
      effect: { type: 'OVERFLOW_DAMAGE', baseDamage: 2, isPiercing: true, markedBonus: 2 }
    };
    const target = createMockDrone({ hull: 2, currentShields: 0, isMarked: true, class: 1 });
    const context = createMockContext();

    const result = evaluateOverflowDamageCard(card, target, context);

    // Marked: 2 + 2 = 4 total damage
    // Unified scoring: Ready(25) + Class1(3) + Attack2(4) + Lethal(20) = 52
    // Overflow: 4 - 2 = 2 → 2 × 12 = 24
    // Cost: 20
    // Expected: 52 + 24 - 20 = 56
    expect(result.score).toBe(56);
    expect(result.logic.some(l => l.includes('Marked'))).toBe(true);
  });

  it('adds piercing bonus for shielded targets', () => {
    const card = {
      id: 'CARD031',
      cost: 5,
      effect: { type: 'OVERFLOW_DAMAGE', baseDamage: 2, isPiercing: true, markedBonus: 2 }
    };
    const target = createMockDrone({ hull: 10, currentShields: 3, isMarked: false, class: 1 });
    const context = createMockContext();

    const result = evaluateOverflowDamageCard(card, target, context);

    // Unified scoring: Ready(25) + Class1(3) + Attack2(4) + PiercingBypass(5) = 37
    // No lethal (10 hull)
    // Cost: 20
    // Expected: 37 - 20 = 17
    expect(result.score).toBe(17);
    expect(result.logic.some(l => l.includes('Piercing'))).toBe(true);
  });

  it('calculates maximum overflow with marked target on 1-hull drone', () => {
    const card = {
      id: 'CARD031',
      cost: 5,
      effect: { type: 'OVERFLOW_DAMAGE', baseDamage: 2, isPiercing: true, markedBonus: 2 }
    };
    const target = createMockDrone({ hull: 1, currentShields: 0, isMarked: true, class: 1 });
    const context = createMockContext();

    const result = evaluateOverflowDamageCard(card, target, context);

    // Marked: 4 total damage
    // Unified scoring: Ready(25) + Class1(3) + Attack2(4) + Lethal(20) = 52
    // Overflow: 4 - 1 = 3 → 3 × 12 = 36
    // Cost: 20
    // Expected: 52 + 36 - 20 = 68
    expect(result.score).toBe(68);
  });
});

describe('evaluateDamageCard', () => {
  it('calculates single target damage correctly', () => {
    const card = {
      id: 'CARD001',
      cost: 2,
      effect: { type: 'DAMAGE', scope: 'SINGLE', value: 2 }
    };
    const target = createMockDrone({ hull: 3, class: 1 });
    const context = createMockContext();

    const result = evaluateDamageCard(card, target, context);

    // Unified scoring: Ready(25) + Class1(3) + Attack2(4) = 32
    // No lethal (3 hull > 2 damage)
    // Cost: 2 × 4 = 8
    // Expected: 32 - 8 = 24
    expect(result.score).toBe(24);
  });

  it('adds lethal bonus when damage is lethal', () => {
    const card = {
      id: 'CARD001',
      cost: 2,
      effect: { type: 'DAMAGE', scope: 'SINGLE', value: 2 }
    };
    // Set currentShields: 0 so 2 damage kills 2 hull target
    const target = createMockDrone({ hull: 2, currentShields: 0, class: 2 });
    const context = createMockContext();

    const result = evaluateDamageCard(card, target, context);

    // Unified scoring: Ready(25) + Class2(6) + Attack2(4) + Lethal(20) = 55
    // Cost: 8
    // Expected: 55 - 8 = 47
    expect(result.score).toBe(47);
    expect(result.logic.some(l => l.includes('Lethal'))).toBe(true);
  });

  it('logs piercing bypass for shielded targets', () => {
    const card = {
      id: 'CARD012',
      cost: 4,
      effect: { type: 'DAMAGE', scope: 'SINGLE', value: 2, damageType: 'PIERCING' }
    };
    const target = createMockDrone({ hull: 3, currentShields: 2, class: 1 });
    const context = createMockContext();

    const result = evaluateDamageCard(card, target, context);

    expect(result.logic.some(l => l.includes('Piercing'))).toBe(true);
  });

  it('calculates filtered damage with multi-hit bonus', () => {
    const card = {
      id: 'CARD013',
      cost: 3,
      targeting: { type: 'LANE', affinity: 'ENEMY', affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 3 }] },
      effect: {
        type: 'DAMAGE',
        value: 2
      }
    };
    const target = { id: 'lane1' };
    // Explicitly set hull/shields so 2 damage is lethal
    const slowDrone1 = createMockDrone({ id: 'd1', speed: 2, hull: 2, currentShields: 0 });
    const slowDrone2 = createMockDrone({ id: 'd2', speed: 3, hull: 2, currentShields: 0 });
    const fastDrone = createMockDrone({ id: 'd3', speed: 5 });

    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: { lane1: [slowDrone1, slowDrone2, fastDrone], lane2: [], lane3: [] }
      })
    });
    context.gameDataService.getEffectiveStats = vi.fn((drone) => ({ speed: drone.speed }));

    const result = evaluateDamageCard(card, target, context);

    // 2 targets hit: each with Ready(25)+Class1(3)+Attack2(4)+Lethal(20) = 52
    // Total: 52 × 2 = 104
    // Multi-hit: 2 × 15 = 30
    // Cost: 3 × 4 = 12
    // Expected: 104 + 30 - 12 = 122
    expect(result.score).toBe(122);
    expect(result.logic.some(l => l.includes('Multi-Hit'))).toBe(true);
  });
});

describe('evaluateSplashDamageCard', () => {
  it('scores damage to target and adjacent drones', () => {
    const card = {
      id: 'CARD032',
      cost: 4,
      effect: {
        type: 'SPLASH_DAMAGE',
        primaryDamage: 1,
        splashDamage: 1,
        conditional: { type: 'FRIENDLY_COUNT_IN_LANE', threshold: 3, bonusDamage: 1 }
      }
    };
    // Target drone in lane with 2 adjacent drones
    const target = createMockDrone({ id: 'drone_1', hull: 2, currentShields: 0 });
    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: {
          lane1: [
            { id: 'drone_1', hull: 2, currentShields: 0, class: 1, attack: 2 },
            { id: 'drone_2', hull: 1, currentShields: 0, class: 1, attack: 2 },
            { id: 'drone_3', hull: 2, currentShields: 1, class: 2, attack: 2 }
          ],
          lane2: [],
          lane3: []
        }
      }),
      player2: createMockPlayer('player2', {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      }),
      getLaneOfDrone: vi.fn(() => 'lane1')
    });

    const result = evaluateSplashDamageCard(card, target, context);

    // Base damage 1 (no bonus - 0 friendly drones)
    // Target drone_1: Ready(25)+Class1(3)+Attack2(4) = 32 (no lethal, 1 < 2 hull)
    // Adjacent drone_2: Ready(25)+Class1(3)+Attack2(4)+Lethal(20) = 52 (lethal: 1>=1)
    // Multi-hit: 2 × 15 = 30
    // Cost: 16
    // Expected: 32 + 52 + 30 - 16 = 98
    expect(result.score).toBe(98);
  });

  it('applies bonus damage when friendly threshold met', () => {
    const card = {
      id: 'CARD032',
      cost: 4,
      effect: {
        type: 'SPLASH_DAMAGE',
        primaryDamage: 1,
        splashDamage: 1,
        conditional: { type: 'FRIENDLY_COUNT_IN_LANE', threshold: 3, bonusDamage: 1 }
      }
    };
    const target = createMockDrone({ id: 'drone_e1', hull: 2, currentShields: 0 });
    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: {
          lane1: [
            { id: 'drone_e1', hull: 2, currentShields: 0, class: 1, attack: 2 },
            { id: 'drone_e2', hull: 1, currentShields: 0, class: 1, attack: 2 }
          ],
          lane2: [],
          lane3: []
        }
      }),
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [
            { id: 'drone_f1', hull: 2 },
            { id: 'drone_f2', hull: 2 },
            { id: 'drone_f3', hull: 2 }
          ],
          lane2: [],
          lane3: []
        }
      }),
      getLaneOfDrone: vi.fn(() => 'lane1')
    });

    const result = evaluateSplashDamageCard(card, target, context);

    // Bonus damage applies (3 friendly drones): damage is now 2
    // Target: Ready(25)+Class1(3)+Attack2(4)+Lethal(20) = 52
    // Adjacent: Ready(25)+Class1(3)+Attack2(4)+Lethal(20) = 52
    // Multi-hit: 2 × 15 = 30
    // Cost: 16
    // Expected: 52 + 52 + 30 - 16 = 118
    expect(result.score).toBe(118);
    expect(result.logic.some(l => l.includes('Bonus'))).toBe(true);
  });

  it('adds lethal bonus when damage kills target', () => {
    const card = {
      id: 'CARD032',
      cost: 4,
      effect: {
        type: 'SPLASH_DAMAGE',
        primaryDamage: 1,
        splashDamage: 1,
        conditional: { type: 'FRIENDLY_COUNT_IN_LANE', threshold: 3, bonusDamage: 1 }
      }
    };
    // Target with only 1 hull - will die
    const target = createMockDrone({ id: 'drone_1', hull: 1, currentShields: 0, class: 2 });
    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: {
          lane1: [{ id: 'drone_1', hull: 1, currentShields: 0, class: 2, attack: 2 }],
          lane2: [],
          lane3: []
        }
      }),
      player2: createMockPlayer('player2', {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      }),
      getLaneOfDrone: vi.fn(() => 'lane1')
    });

    const result = evaluateSplashDamageCard(card, target, context);

    // Single target, no splash (no adjacent)
    // Target: Ready(25)+Class2(6)+Attack2(4)+Lethal(20) = 55
    // Cost: 16
    // Expected: 55 - 16 = 39
    expect(result.score).toBe(39);
    // Score includes lethal bonus (damage 1 kills 1 hull target)
    expect(result.score).toBeGreaterThan(30); // Would be ~15 without lethal
  });
});

describe('evaluateDamageScalingCard', () => {
  it('scores damage based on ready friendly drones in lane', () => {
    const card = {
      id: 'CARD035',
      cost: 2,
      effect: {
        type: 'DAMAGE_SCALING',
        source: 'READY_DRONES_IN_LANE'
      }
    };
    // Target with 2 hull, class 1
    const target = createMockDrone({ id: 'enemy_1', hull: 2, currentShields: 0, class: 1 });
    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: {
          lane1: [{ id: 'enemy_1', hull: 2, currentShields: 0 }],
          lane2: [],
          lane3: []
        }
      }),
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [
            { id: 'friendly_1', isExhausted: false },
            { id: 'friendly_2', isExhausted: false },
            { id: 'friendly_3', isExhausted: true }  // Exhausted, doesn't count
          ],
          lane2: [],
          lane3: []
        }
      }),
      getLaneOfDrone: vi.fn(() => 'lane1')
    });

    const result = evaluateDamageScalingCard(card, target, context);

    // 2 ready friendly drones = 2 damage
    // Unified: Ready(25)+Class1(3)+Attack2(4)+Lethal(20) = 52
    // Cost: 8
    // Expected: 52 - 8 = 44
    expect(result.score).toBe(44);
    expect(result.logic.some(l => l.includes('Scaling Damage'))).toBe(true);
  });

  it('returns low score with no ready drones', () => {
    const card = {
      id: 'CARD035',
      cost: 2,
      effect: {
        type: 'DAMAGE_SCALING',
        source: 'READY_DRONES_IN_LANE'
      }
    };
    const target = createMockDrone({ id: 'enemy_1', hull: 2 });
    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: { lane1: [{ id: 'enemy_1', hull: 2 }], lane2: [], lane3: [] }
      }),
      player2: createMockPlayer('player2', {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      }),
      getLaneOfDrone: vi.fn(() => 'lane1')
    });

    const result = evaluateDamageScalingCard(card, target, context);

    // 0 ready friendly drones = 0 damage (not lethal)
    // Unified: Ready(25)+Class1(3)+Attack2(4) = 32
    // Cost: 8
    // Expected: 32 - 8 = 24
    expect(result.score).toBe(24);
  });

  it('scores high with many ready drones for lethal', () => {
    const card = {
      id: 'CARD035',
      cost: 2,
      effect: {
        type: 'DAMAGE_SCALING',
        source: 'READY_DRONES_IN_LANE'
      }
    };
    // Target with 3 hull, class 3 (valuable target)
    const target = createMockDrone({ id: 'enemy_1', hull: 3, currentShields: 0, class: 3 });
    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: { lane1: [{ id: 'enemy_1', hull: 3, currentShields: 0 }], lane2: [], lane3: [] }
      }),
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [
            { id: 'f1', isExhausted: false },
            { id: 'f2', isExhausted: false },
            { id: 'f3', isExhausted: false },
            { id: 'f4', isExhausted: false }
          ],
          lane2: [],
          lane3: []
        }
      }),
      getLaneOfDrone: vi.fn(() => 'lane1')
    });

    const result = evaluateDamageScalingCard(card, target, context);

    // 4 ready friendly drones = 4 damage (lethal: 4 >= 3)
    // Unified: Ready(25)+Class3(10)+Attack2(4)+Lethal(20) = 59
    // Cost: 8
    // Expected: 59 - 8 = 51
    expect(result.score).toBe(51);
  });
});

describe('evaluateDestroyUpgradeCard', () => {
  it('scores based on upgrade value removed from enemy', () => {
    const card = {
      id: 'CARD022',
      cost: 1,
      effect: { type: 'DESTROY_UPGRADE' }
    };
    // Target is an upgrade with stat modification
    const target = {
      id: 'upgrade_1',
      mod: { stat: 'attack', value: 2 }
    };
    const context = createMockContext();

    const result = evaluateDestroyUpgradeCard(card, target, context);

    // Attack upgrade value: 2 × 20 = 40 (attack is very valuable to remove)
    // Cost: 1 × 4 = 4
    // Expected: 40 - 4 = 36
    expect(result.score).toBe(36);
    expect(result.logic.some(l => l.includes('Upgrade Destroyed'))).toBe(true);
  });

  it('scores speed upgrades lower than attack', () => {
    const card = {
      id: 'CARD022',
      cost: 1,
      effect: { type: 'DESTROY_UPGRADE' }
    };
    const target = {
      id: 'upgrade_1',
      mod: { stat: 'speed', value: 2 }
    };
    const context = createMockContext();

    const result = evaluateDestroyUpgradeCard(card, target, context);

    // Speed upgrade value: 2 × 10 = 20
    // Cost: 1 × 4 = 4
    // Expected: 20 - 4 = 16
    expect(result.score).toBe(16);
  });

  it('handles upgrades without mod (keyword grants)', () => {
    const card = {
      id: 'CARD022',
      cost: 1,
      effect: { type: 'DESTROY_UPGRADE' }
    };
    const target = {
      id: 'upgrade_1',
      keyword: 'PIERCING'
    };
    const context = createMockContext();

    const result = evaluateDestroyUpgradeCard(card, target, context);

    // Keyword upgrade base value: 25
    // Cost: 1 × 4 = 4
    // Expected: 25 - 4 = 21
    expect(result.score).toBe(21);
  });
});

describe('evaluateDestroyCard', () => {
  it('scores single target destroy based on unified scoring', () => {
    const card = {
      id: 'CARD009',
      cost: 3,
      effect: { type: 'DESTROY', scope: 'SINGLE' }
    };
    const target = createMockDrone({ hull: 3, currentShields: 2 });
    const context = createMockContext();

    const result = evaluateDestroyCard(card, target, context);

    // Unified: Ready(25)+Class1(3)+Attack2(4)+Lethal(20) = 52
    // Cost: 12
    // Expected: 52 - 12 = 40
    expect(result.score).toBe(40);
  });

  it('calculates lane-wide destroy comparing enemy vs friendly', () => {
    const card = {
      id: 'CARD011',
      cost: 8,
      effect: { type: 'DESTROY', scope: 'LANE' }
    };
    const target = { id: 'lane1' };

    const enemyDrone = createMockDrone({ hull: 2, currentShields: 1, class: 2, isExhausted: false });
    const friendlyDrone = createMockDrone({ hull: 1, currentShields: 0, class: 1, isExhausted: true });

    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: { lane1: [enemyDrone], lane2: [], lane3: [] }
      }),
      player2: createMockPlayer('player2', {
        dronesOnBoard: { lane1: [friendlyDrone], lane2: [], lane3: [] }
      })
    });

    const result = evaluateDestroyCard(card, target, context);

    // Enemy unified: Ready(25)+Class2(6)+Attack2(4)+Lethal(20) = 55
    // Friendly unified (swapped context): Class1(3)+Attack2(4)+Lethal(20) = 27 (exhausted = no ready bonus)
    // Net: 55 - 27 = 28
    // Cost: 32
    // Expected: 28 - 32 = -4
    expect(result.score).toBe(-4);
  });
});

// ========================================
// UTILITY CARD EVALUATORS
// ========================================

describe('evaluateGainEnergyCard', () => {
  it('scores high when enabling expensive cards', () => {
    const card = {
      id: 'CARD004',
      instanceId: 'inst1',
      cost: 1,
      effect: { type: 'GAIN_ENERGY', value: 2 }
    };
    const expensiveCard = { instanceId: 'inst2', name: 'Expensive Card', cost: 6 };

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        energy: 5,
        hand: [card, expensiveCard]
      })
    });

    const result = evaluateGainEnergyCard(card, null, context);

    // Enables card: 60 + (6 × 5) = 90
    expect(result.score).toBe(90);
    expect(result.logic.some(l => l.includes('Enables'))).toBe(true);
  });

  it('returns invalid score when no cards enabled', () => {
    const card = {
      id: 'CARD004',
      instanceId: 'inst1',
      cost: 1,
      effect: { type: 'GAIN_ENERGY', value: 2 }
    };
    const cheapCard = { instanceId: 'inst2', name: 'Cheap Card', cost: 2 };

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        energy: 5,
        hand: [card, cheapCard]
      })
    });

    const result = evaluateGainEnergyCard(card, null, context);

    // No new cards enabled (already have enough energy for cheapCard)
    expect(result.score).toBe(INVALID_SCORE);
    expect(result.logic.some(l => l.includes('No cards enabled by energy gain'))).toBe(true);
  });

  it('returns invalid score when enabled cards have no valid targets', () => {
    const card = {
      id: 'CARD004',
      instanceId: 'inst1',
      cost: 1,
      effect: { type: 'GAIN_ENERGY', value: 2 }
    };
    const targetedCard = {
      instanceId: 'inst2',
      name: 'Targeted Card',
      cost: 6,
      targeting: { type: 'ENEMY_DRONE' }
    };

    const mockGetValidTargets = vi.fn(() => []);

    const context = createMockContext({
      player1: createMockPlayer('player1'),
      player2: createMockPlayer('player2', {
        energy: 5,
        hand: [card, targetedCard]
      }),
      getValidTargets: mockGetValidTargets,
    });

    const result = evaluateGainEnergyCard(card, null, context);

    expect(result.score).toBe(INVALID_SCORE);
    expect(result.logic.some(l => l.includes('no valid targets'))).toBe(true);
  });

  it('scores high when enabling untargeted cards', () => {
    const card = {
      id: 'CARD004',
      instanceId: 'inst1',
      cost: 1,
      effect: { type: 'GAIN_ENERGY', value: 2 }
    };
    const drawCard = {
      instanceId: 'inst2',
      name: 'Big Draw',
      cost: 6,
      // No targeting property - untargeted cards are always usable
    };

    const mockGetValidTargets = vi.fn(() => []);

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        energy: 5,
        hand: [card, drawCard]
      }),
      getValidTargets: mockGetValidTargets,
    });

    const result = evaluateGainEnergyCard(card, null, context);

    // Enables card: 60 + (6 × 5) = 90
    expect(result.score).toBe(90);
    expect(result.logic.some(l => l.includes('Enables'))).toBe(true);
    // getValidTargets should NOT have been called for untargeted card
    expect(mockGetValidTargets).not.toHaveBeenCalled();
  });
});

describe('evaluateDrawCard', () => {
  it('scores higher with more energy remaining', () => {
    const card = {
      id: 'CARD003',
      cost: 1,
      effect: { type: 'DRAW', value: 2 }
    };

    const context = createMockContext({
      player2: createMockPlayer('player2', { energy: 5 })
    });

    const result = evaluateDrawCard(card, null, context);

    // Energy after: 5 - 1 = 4
    // Draw value: 10 + (4 × 2) = 18
    expect(result.score).toBe(18);
  });

  it('returns low priority when no energy after play', () => {
    const card = {
      id: 'CARD003',
      cost: 1,
      effect: { type: 'DRAW', value: 2 }
    };

    const context = createMockContext({
      player2: createMockPlayer('player2', { energy: 1 })
    });

    const result = evaluateDrawCard(card, null, context);

    // Energy after: 0
    expect(result.score).toBe(CARD_EVALUATION.LOW_PRIORITY_SCORE);
  });
});

describe('evaluateSearchAndDrawCard', () => {
  it('calculates draw and search value correctly', () => {
    const card = {
      id: 'CARD025',
      cost: 2,
      effect: { type: 'SEARCH_AND_DRAW', drawCount: 1, searchCount: 5 }
    };

    const context = createMockContext({
      player2: createMockPlayer('player2', { energy: 5 })
    });

    const result = evaluateSearchAndDrawCard(card, null, context);

    // Draw: 1 × 12 = 12
    // Search: 5 × 2 = 10
    // Energy after: 5 - 2 = 3 → 3 × 2 = 6
    // Expected: 12 + 10 + 6 = 28
    expect(result.score).toBe(28);
  });
});

// ========================================
// HEAL CARD EVALUATORS
// ========================================

describe('evaluateHealShieldsCard', () => {
  it('scores based on shields actually healed', () => {
    const card = {
      id: 'CARD008',
      cost: 2,
      effect: { type: 'HEAL_SHIELDS', value: 2 }
    };
    const target = createMockDrone({ currentShields: 0, currentMaxShields: 2 });
    const context = createMockContext();

    const result = evaluateHealShieldsCard(card, target, context);

    // Shields healed: min(2, 2-0) = 2
    // Score: 2 × 5 = 10
    expect(result.score).toBe(10);
  });

  it('caps healing at max shields', () => {
    const card = {
      id: 'CARD008',
      cost: 2,
      effect: { type: 'HEAL_SHIELDS', value: 3 }
    };
    const target = createMockDrone({ currentShields: 1, currentMaxShields: 2 });
    const context = createMockContext();

    const result = evaluateHealShieldsCard(card, target, context);

    // Shields healed: min(3, 2-1) = 1
    // Score: 1 × 5 = 5
    expect(result.score).toBe(5);
  });

  it('returns zero when shields already full', () => {
    const card = {
      id: 'CARD008',
      cost: 2,
      effect: { type: 'HEAL_SHIELDS', value: 2 }
    };
    const target = createMockDrone({ currentShields: 2, currentMaxShields: 2 });
    const context = createMockContext();

    const result = evaluateHealShieldsCard(card, target, context);

    expect(result.score).toBe(0);
  });
});

describe('evaluateHealHullCard', () => {
  it('returns fixed section heal value for ship sections', () => {
    const card = {
      id: 'CARD007',
      cost: 2,
      effect: { type: 'HEAL_HULL', value: 1 }
    };
    // Ship section (no hull/maxHull properties)
    const target = { id: 'bridge' };
    const context = createMockContext();

    const result = evaluateHealHullCard(card, target, context);

    expect(result.score).toBe(CARD_EVALUATION.SECTION_HEAL_VALUE);
    expect(result.score).toBe(80);
  });

  it('scores drone hull healing with go-again bonus', () => {
    const card = {
      id: 'CARD006',
      cost: 1,
      effect: { type: 'HEAL_HULL', value: 3, goAgain: true }
    };
    // Drone with missing hull
    const target = { id: 'drone_1', hull: 1, maxHull: 3 };
    const context = createMockContext();

    const result = evaluateHealHullCard(card, target, context);

    // Heals 2 hull (min of 3 value and 2 missing)
    // Hull value: 2 × (5 + 3) = 16
    // Go again: +40
    // Expected: 16 + 40 = 56
    expect(result.score).toBe(56);
    expect(result.logic.some(l => l.includes('Drone Hull'))).toBe(true);
    expect(result.logic.some(l => l.includes('Go Again'))).toBe(true);
  });

  it('returns invalid score for drone at full hull', () => {
    const card = {
      id: 'CARD006',
      cost: 1,
      effect: { type: 'HEAL_HULL', value: 3, goAgain: true }
    };
    const target = { id: 'drone_1', hull: 3, maxHull: 3 };
    const context = createMockContext();

    const result = evaluateHealHullCard(card, target, context);

    expect(result.score).toBe(INVALID_SCORE);
    expect(result.logic.some(l => l.includes('full hull'))).toBe(true);
  });
});

describe('evaluateRestoreSectionShieldsCard', () => {
  it('scores based on shields that can be restored', () => {
    const card = {
      id: 'CARD037',
      cost: 1,
      effect: { type: 'RESTORE_SECTION_SHIELDS', value: 2 }
    };
    // Ship section with 4 max shields, 1 currently allocated
    const target = {
      id: 'bridge',
      name: 'bridge',
      shields: 4,
      allocatedShields: 1
    };
    const context = createMockContext();

    const result = evaluateRestoreSectionShieldsCard(card, target, context);

    // Can restore 2 shields (min of value=2 and missing=3)
    // Score = 2 × SHIELD_HEAL_VALUE_PER_POINT (5) = 10
    expect(result.score).toBe(10);
    expect(result.logic).toContain('✅ Section Shields: +10 (2 shields restored)');
  });

  it('caps restoration at missing shields', () => {
    const card = {
      id: 'CARD037',
      cost: 1,
      effect: { type: 'RESTORE_SECTION_SHIELDS', value: 2 }
    };
    // Section with only 1 shield missing
    const target = {
      id: 'powerCell',
      name: 'powerCell',
      shields: 3,
      allocatedShields: 2
    };
    const context = createMockContext();

    const result = evaluateRestoreSectionShieldsCard(card, target, context);

    // Can only restore 1 shield (min of value=2 and missing=1)
    // Score = 1 × 5 = 5
    expect(result.score).toBe(5);
  });

  it('returns zero for fully shielded section', () => {
    const card = {
      id: 'CARD037',
      cost: 1,
      effect: { type: 'RESTORE_SECTION_SHIELDS', value: 2 }
    };
    // Section at full shields
    const target = {
      id: 'droneControlHub',
      name: 'droneControlHub',
      shields: 2,
      allocatedShields: 2
    };
    const context = createMockContext();

    const result = evaluateRestoreSectionShieldsCard(card, target, context);

    expect(result.score).toBe(INVALID_SCORE);
    expect(result.logic.some(l => l.includes('full shields'))).toBe(true);
  });

  it('handles enhanced version with higher restore value', () => {
    const card = {
      id: 'CARD037_ENHANCED',
      cost: 2,
      effect: { type: 'RESTORE_SECTION_SHIELDS', value: 3 }
    };
    // Section with 4 shields missing
    const target = {
      id: 'bridge',
      name: 'bridge',
      shields: 5,
      allocatedShields: 1
    };
    const context = createMockContext();

    const result = evaluateRestoreSectionShieldsCard(card, target, context);

    // Can restore 3 shields (min of value=3 and missing=4)
    expect(result.score).toBe(15);
  });
});

// ========================================
// REPEATING EFFECT EVALUATORS
// ========================================

describe('evaluateRepeatingEffectCard', () => {
  it('scores based on repeat count from damaged sections', () => {
    const card = {
      id: 'CARD018',
      cost: 1,
      condition: 'OWN_DAMAGED_SECTIONS',
      effect: { type: 'REPEATING_EFFECT' }
    };

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        shipSections: {
          bridge: { hull: 1, maxHull: 3 },
          powerCell: { hull: 0, maxHull: 3 },
          droneControlHub: { hull: 3, maxHull: 3 }
        }
      }),
      getShipStatus: vi.fn((section) => {
        if (section.hull === 0) return 'critical';
        if (section.hull < section.maxHull) return 'damaged';
        return 'healthy';
      })
    });

    const result = evaluateRepeatingEffectCard(card, null, context);

    // Base: 1 repeat
    // 2 damaged/critical sections → +2 repeats = 3 total
    // Score: 3 × 25 = 75 - (1 × 4) = 71
    expect(result.score).toBe(71);
  });

  it('gives minimum value with no damaged sections', () => {
    const card = {
      id: 'CARD018',
      cost: 1,
      condition: 'OWN_DAMAGED_SECTIONS',
      effect: { type: 'REPEATING_EFFECT' }
    };

    const context = createMockContext({
      player2: createMockPlayer('player2'),
      getShipStatus: vi.fn(() => 'healthy')
    });

    const result = evaluateRepeatingEffectCard(card, null, context);

    // 1 repeat × 25 = 25 - 4 cost = 21
    expect(result.score).toBe(21);
  });
});

// ========================================
// MODIFY STAT EVALUATORS
// ========================================

describe('evaluateModifyStatCard', () => {
  it('scores attack buff on non-exhausted friendly drone', () => {
    const card = {
      id: 'CARD014',
      cost: 1,
      targeting: { type: 'FRIENDLY_DRONE' },
      effect: {
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: 2, type: 'temporary' }
      }
    };
    const target = createMockDrone({ class: 2, isExhausted: false });
    const context = createMockContext();

    const result = evaluateModifyStatCard(card, target, context);

    // Class value: 2 × 10 = 20
    // Attack buff: 2 × 8 = 16
    // Cost: 1 × 4 = 4
    // Expected: 20 + 16 - 4 = 32
    expect(result.score).toBe(32);
  });

  it('returns invalid score for exhausted target', () => {
    const card = {
      id: 'CARD014',
      cost: 1,
      targeting: { type: 'FRIENDLY_DRONE' },
      effect: {
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: 2, type: 'temporary' }
      }
    };
    const target = createMockDrone({ isExhausted: true });
    const context = createMockContext();

    const result = evaluateModifyStatCard(card, target, context);

    expect(result.score).toBe(-1);
  });

  it('scores attack debuff on enemy based on threat reduction', () => {
    const card = {
      id: 'CARD016',
      cost: 2,
      targeting: { type: 'ENEMY_DRONE' },
      effect: {
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: -2, type: 'temporary' },
        goAgain: true
      }
    };
    const target = createMockDrone({ attack: 4, isExhausted: false, owner: 'player1' });
    const context = createMockContext();
    context.gameDataService.getEffectiveStats = vi.fn(() => ({ attack: 4 }));

    const result = evaluateModifyStatCard(card, target, context);

    // Threat reduction: 4 × 8 = 32
    // Go again: +40
    // Cost: 2 × 4 = 8
    // Expected: 32 + 40 - 8 = 64
    expect(result.score).toBe(64);
  });

  it('gives bonus for speed buff that overcomes interceptors', () => {
    const card = {
      id: 'CARD017',
      cost: 1,
      targeting: { type: 'FRIENDLY_DRONE' },
      effect: {
        type: 'MODIFY_STAT',
        mod: { stat: 'speed', value: 2, type: 'temporary' }
      }
    };
    const target = createMockDrone({ speed: 3, isExhausted: false });
    const enemyDrone = createMockDrone({ id: 'enemy1', speed: 4 });

    const context = createMockContext({
      player1: createMockPlayer('player1', {
        dronesOnBoard: { lane1: [enemyDrone], lane2: [], lane3: [] }
      })
    });
    context.gameDataService.getEffectiveStats = vi.fn((drone) => ({
      speed: drone.speed,
      attack: drone.attack
    }));

    const result = evaluateModifyStatCard(card, target, context);

    // Speed buff overcomes interceptor (3 → 5 > 4)
    // Interceptor overcome bonus: 60
    // Cost: 4
    // Expected: 60 - 4 = 56
    expect(result.score).toBe(56);
  });

  it('applies permanent mod multiplier', () => {
    const card = {
      id: 'CARD_PERM',
      cost: 1,
      targeting: { type: 'FRIENDLY_DRONE' },
      effect: {
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: 1, type: 'permanent' }
      }
    };
    const target = createMockDrone({ class: 1, isExhausted: false });
    const context = createMockContext();

    const result = evaluateModifyStatCard(card, target, context);

    // Class: 10, Attack: 8 = 18
    // Permanent: 18 × 1.5 = 27
    // Cost: 4
    // Expected: 27 - 4 = 23
    expect(result.score).toBe(23);
  });
});

// ========================================
// MOVEMENT CARD EVALUATORS
// ========================================

describe('evaluateSingleMoveCard', () => {
  it('returns invalid score when moveData is missing', () => {
    const card = {
      id: 'CARD023',
      cost: 0,
      effect: { type: 'SINGLE_MOVE' }
    };
    const context = createMockContext();

    const result = evaluateSingleMoveCard(card, null, null, context);

    expect(result.score).toBe(INVALID_SCORE);
    expect(result.logic).toContain('❌ Missing move metadata');
  });

  it('calculates move impact and applies cost', () => {
    const card = {
      id: 'CARD023',
      cost: 0,
      effect: { type: 'SINGLE_MOVE' }
    };
    const drone = createMockDrone({ name: 'Test Drone' });
    const moveData = { drone, fromLane: 'lane1', toLane: 'lane2' };

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [drone],
          lane2: [],
          lane3: []
        }
      })
    });

    const result = evaluateSingleMoveCard(card, null, moveData, context);

    // Lane scores are mocked to return 10
    // Move impact is calculated based on lane score changes
    // Cost: 0 × 4 = 0
    expect(result.logic.some(l => l.includes('Move Impact'))).toBe(true);
  });

  it('adds go-again bonus when card has goAgain', () => {
    const card = {
      id: 'CARD023_ENHANCED',
      cost: 1,
      effect: { type: 'SINGLE_MOVE', goAgain: true }
    };
    const drone = createMockDrone({ name: 'Test Drone' });
    const moveData = { drone, fromLane: 'lane1', toLane: 'lane2' };

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [drone],
          lane2: [],
          lane3: []
        }
      })
    });

    const result = evaluateSingleMoveCard(card, null, moveData, context);

    expect(result.logic.some(l => l.includes('Go Again'))).toBe(true);
    // Score should include GO_AGAIN_BONUS (40)
    expect(result.score).toBeGreaterThanOrEqual(40 - 4); // At least go-again minus cost
  });

  it('adds ON_MOVE ability bonus for drones with triggered abilities', () => {
    const card = {
      id: 'CARD023',
      cost: 0,
      effect: { type: 'SINGLE_MOVE' }
    };
    const drone = createMockDrone({ name: 'Specter' });
    const moveData = { drone, fromLane: 'lane1', toLane: 'lane2' };

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [drone],
          lane2: [],
          lane3: []
        }
      })
    });

    const result = evaluateSingleMoveCard(card, null, moveData, context);

    // Specter has ON_MOVE +1 attack ability
    // ON_MOVE_ATTACK_BONUS_PER_POINT = 15
    expect(result.logic.some(l => l.includes('OnMove Ability'))).toBe(true);
  });
});

describe('evaluateMultiMoveCard', () => {
  it('scores based on drones available to move', () => {
    const card = {
      id: 'CARD019',
      cost: 4,
      effect: {
        type: 'MULTI_MOVE',
        count: 3,
        properties: ['DO_NOT_EXHAUST']
      }
    };
    // Target is the source lane
    const target = { id: 'lane1' };
    const context = createMockContext({
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [
            { id: 'drone_1' },
            { id: 'drone_2' }
          ],
          lane2: [],
          lane3: []
        }
      })
    });

    const result = evaluateMultiMoveCard(card, target, context);

    // 2 drones can move (min of 2 in lane and 3 max)
    // Flexibility: 2 × 15 = 30
    // Stay Ready: 2 × 10 = 20
    // Cost: 4 × 4 = 16
    // Expected: 30 + 20 - 16 = 34
    expect(result.score).toBe(34);
    expect(result.logic.some(l => l.includes('Flexibility'))).toBe(true);
  });

  it('returns zero for empty lane', () => {
    const card = {
      id: 'CARD019',
      cost: 4,
      effect: { type: 'MULTI_MOVE', count: 3 }
    };
    const target = { id: 'lane1' };
    const context = createMockContext({
      player2: createMockPlayer('player2', {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      })
    });

    const result = evaluateMultiMoveCard(card, target, context);

    expect(result.score).toBe(INVALID_SCORE);
    expect(result.logic.some(l => l.includes('No drones'))).toBe(true);
  });

  it('caps moves at effect count', () => {
    const card = {
      id: 'CARD019',
      cost: 4,
      effect: { type: 'MULTI_MOVE', count: 2 }  // Only 2 max
    };
    const target = { id: 'lane1' };
    const context = createMockContext({
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [
            { id: 'd1' }, { id: 'd2' }, { id: 'd3' }, { id: 'd4' }
          ],
          lane2: [],
          lane3: []
        }
      })
    });

    const result = evaluateMultiMoveCard(card, target, context);

    // Only 2 can move despite 4 in lane
    // Flexibility: 2 × 15 = 30
    // Cost: 4 × 4 = 16
    // Expected: 30 - 16 = 14
    expect(result.score).toBe(14);
  });
});

// ========================================
// INDEX/REGISTRY TESTS
// ========================================

describe('Card Evaluator Registry', () => {
  it('exports evaluateCardPlay function', async () => {
    const { evaluateCardPlay } = await import('../index.js');
    expect(typeof evaluateCardPlay).toBe('function');
  });

  it('evaluateCardPlay adds conditional bonus to base score', async () => {
    const { evaluateCardPlay } = await import('../index.js');

    // CARD053 Executioner: DAMAGE 0, but conditional DESTROY if hull < 2
    const card = {
      id: 'CARD053',
      cost: 2,
      effect: { type: 'DAMAGE', value: 0 },
      conditionalEffects: [{
        timing: 'PRE',
        condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
        grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
      }]
    };
    const target = createMockDrone({ hull: 1, currentShields: 0, class: 1 });
    const context = createMockContext();

    const result = evaluateCardPlay(card, target, context);

    // Base DAMAGE 0: unified Ready(25)+Class1(3)+Attack2(4) = 32, minus cost 8 = 24
    // Conditional DESTROY uses old scoring: (1×8) + (1×15+50) = 73
    // Total: 24 + 73 = 97
    expect(result.score).toBe(97);
    expect(result.logic.some(l => l.includes('Conditional DESTROY'))).toBe(true);
  });

  it('evaluateCardPlay returns only base score when no conditionals', async () => {
    const { evaluateCardPlay } = await import('../index.js');

    // Regular damage card without conditionals
    const card = {
      id: 'CARD001',
      cost: 2,
      effect: { type: 'DAMAGE', value: 2 }
    };
    // Default currentShields is 1, so total HP is 3, making 2 damage non-lethal
    const target = createMockDrone({ hull: 2, class: 1 });
    const context = createMockContext();

    const result = evaluateCardPlay(card, target, context);

    // Unified: Ready(25)+Class1(3)+Attack2(4) = 32 (no Lethal - 2 dmg < 3 HP)
    // Cost: 8
    // Expected: 32 - 8 = 24
    expect(result.score).toBe(24);
  });

  it('exports hasEvaluator function', async () => {
    const { hasEvaluator } = await import('../index.js');
    expect(typeof hasEvaluator).toBe('function');
  });

  it('hasEvaluator returns true for registered effect types', async () => {
    const { hasEvaluator } = await import('../index.js');

    expect(hasEvaluator('DESTROY')).toBe(true);
    expect(hasEvaluator('DAMAGE')).toBe(true);
    expect(hasEvaluator('OVERFLOW_DAMAGE')).toBe(true);
    expect(hasEvaluator('GAIN_ENERGY')).toBe(true);
    expect(hasEvaluator('DRAW')).toBe(true);
    expect(hasEvaluator('HEAL_SHIELDS')).toBe(true);
    expect(hasEvaluator('HEAL_HULL')).toBe(true);
    expect(hasEvaluator('MODIFY_STAT')).toBe(true);
    expect(hasEvaluator('SINGLE_MOVE')).toBe(true);
    expect(hasEvaluator('MODIFY_DRONE_BASE')).toBe(true);
  });

  it('hasEvaluator returns false for unregistered effect types', async () => {
    const { hasEvaluator } = await import('../index.js');

    expect(hasEvaluator('UNKNOWN_EFFECT')).toBe(false);
    expect(hasEvaluator('SOME_FUTURE_EFFECT')).toBe(false);
  });
});

// ========================================
// CREATE TOKENS (JAMMER) EVALUATORS
// ========================================

describe('evaluateCreateTokensCard', () => {
  it('calculates jammer value with drones on board', () => {
    const card = {
      id: 'CARD030',
      cost: 5,
      effect: { type: 'CREATE_TOKENS' }
    };

    const drone1 = createMockDrone({ id: 'd1', class: 2 });
    const drone2 = createMockDrone({ id: 'd2', class: 3 });

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        dronesOnBoard: {
          lane1: [drone1],
          lane2: [drone2],
          lane3: []
        }
      })
    });

    const result = evaluateCreateTokensCard(card, null, context);

    // Base value: 30
    // CPU: (2 + 3) × 5 = 25
    // High value (class >= 3): 1 × 15 = 15
    // Cost: 5 × 4 = 20
    // Unscaled: 30 + 25 + 15 - 20 = 50
    // Scaling: 3/3 = 1.0 (all lanes available)
    // Expected: 50
    expect(result.score).toBe(50);
    expect(result.logic.some(l => l.includes('CPU Protection'))).toBe(true);
  });

  it('includes available lanes info in logic', () => {
    const card = {
      id: 'CARD030',
      cost: 5,
      effect: { type: 'CREATE_TOKENS' }
    };

    const context = createMockContext({
      player2: createMockPlayer('player2', {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      })
    });

    const result = evaluateCreateTokensCard(card, null, context);

    // Should include available lanes info
    expect(result.logic.some(l => l.includes('Available Lanes'))).toBe(true);
  });
});

// ========================================
// UPGRADE CARD EVALUATORS
// ========================================

describe('evaluateModifyDroneBaseCard', () => {
  it('returns invalid score for null target', () => {
    const card = {
      id: 'CARD028',
      cost: 5,
      effect: { type: 'MODIFY_DRONE_BASE', mod: { stat: 'attack', value: 1 } }
    };

    const context = createMockContext();

    const result = evaluateModifyDroneBaseCard(card, null, context);

    expect(result.score).toBe(-999);
    expect(result.logic).toContain('No valid target');
  });

  it('returns invalid score for unknown drone type', () => {
    const card = {
      id: 'CARD028',
      cost: 5,
      effect: { type: 'MODIFY_DRONE_BASE', mod: { stat: 'attack', value: 1 } }
    };
    const target = { name: 'Unknown Drone' };

    const context = createMockContext();

    const result = evaluateModifyDroneBaseCard(card, target, context);

    expect(result.score).toBe(-999);
  });

  it('calculates attack upgrade score with synergy bonus for fast drones', () => {
    const card = {
      id: 'CARD028',
      cost: 5,
      effect: { type: 'MODIFY_DRONE_BASE', mod: { stat: 'attack', value: 1 } }
    };
    // Specter has speed 4 (from mock)
    const target = { name: 'Specter' };

    const context = createMockContext();

    const result = evaluateModifyDroneBaseCard(card, target, context);

    // Base: 40 (ATTACK_UPGRADE_BASE)
    // Fast drone synergy: +20
    // Class (2): 2 × 8 = 16
    // Deployed (2): 2 × 15 = 30
    // Ready (1): 1 × 8 = 8
    // Future (2): 2 × 10 = 20
    // Cost: 5 × 4 = 20
    // Expected: 40 + 20 + 16 + 30 + 8 + 20 - 20 = 114
    expect(result.score).toBe(114);
    expect(result.logic.some(l => l.includes('Fast attacker'))).toBe(true);
  });

  it('calculates speed upgrade score', () => {
    const card = {
      id: 'CARD021',
      cost: 3,
      effect: { type: 'MODIFY_DRONE_BASE', mod: { stat: 'speed', value: 1 } }
    };
    const target = { name: 'Test Drone' };

    const context = createMockContext();

    const result = evaluateModifyDroneBaseCard(card, target, context);

    // Base: 35 (SPEED_UPGRADE_BASE)
    // Class (1): 1 × 8 = 8
    // Deployed: 30
    // Ready: 8
    // Future: 20
    // Cost: 12
    // Expected: 35 + 8 + 30 + 8 + 20 - 12 = 89
    expect(result.score).toBe(89);
  });

  it('calculates limit upgrade score', () => {
    const card = {
      id: 'CARD020',
      cost: 3,
      effect: { type: 'MODIFY_DRONE_BASE', mod: { stat: 'limit', value: 1 }, goAgain: true }
    };
    const target = { name: 'Test Drone' };

    const context = createMockContext();

    const result = evaluateModifyDroneBaseCard(card, target, context);

    // Base: 50 (LIMIT_UPGRADE_BASE)
    // Class (1): 8
    // Deployed: 30
    // Ready: 8
    // Future: 20
    // Cost: 12
    // Go Again: 40
    // Expected: 50 + 8 + 30 + 8 + 20 - 12 + 40 = 144
    expect(result.score).toBe(144);
    expect(result.logic.some(l => l.includes('Go Again'))).toBe(true);
  });
});

// ========================================
// CONDITIONAL EFFECTS EVALUATOR
// ========================================

// ========================================
// DAMAGE TYPE SCORING TESTS
// ========================================

describe('Damage Type AI Scoring', () => {
  describe('SHIELD_BREAKER damage type', () => {
    it('adds bonus when target has high shields (>=3)', () => {
      const card = {
        id: 'CARD_SB',
        cost: 3,
        effect: { type: 'DAMAGE', value: 2, damageType: 'SHIELD_BREAKER' }
      };
      // Target with 3 shields - should get SHIELD_BREAKER_HIGH_SHIELD_BONUS (+15)
      const target = createMockDrone({ hull: 3, currentShields: 3, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: Ready(25) + Class1(3) + Attack2(4) = 32
      // SHIELD_BREAKER_HIGH_SHIELD_BONUS: +15
      // Cost: 3 × 4 = 12
      // Expected: 32 + 15 - 12 = 35
      expect(result.score).toBe(35);
      expect(result.logic.some(l => l.includes('Shield-Breaker'))).toBe(true);
    });

    it('adds penalty when target has low shields (<=1)', () => {
      const card = {
        id: 'CARD_SB',
        cost: 3,
        effect: { type: 'DAMAGE', value: 2, damageType: 'SHIELD_BREAKER' }
      };
      // Target with 1 shield - should get SHIELD_BREAKER_LOW_SHIELD_PENALTY (-5)
      const target = createMockDrone({ hull: 3, currentShields: 1, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: Ready(25) + Class1(3) + Attack2(4) = 32
      // SHIELD_BREAKER_LOW_SHIELD_PENALTY: -5
      // Cost: 12
      // Expected: 32 - 5 - 12 = 15
      expect(result.score).toBe(15);
    });

    it('no bonus/penalty for moderate shields (2)', () => {
      const card = {
        id: 'CARD_SB',
        cost: 3,
        effect: { type: 'DAMAGE', value: 2, damageType: 'SHIELD_BREAKER' }
      };
      const target = createMockDrone({ hull: 3, currentShields: 2, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: 32, no damage type modifier, Cost: 12
      // Expected: 32 - 12 = 20
      expect(result.score).toBe(20);
    });
  });

  describe('ION damage type', () => {
    it('adds heavy penalty for targets with no shields', () => {
      const card = {
        id: 'CARD_ION',
        cost: 2,
        effect: { type: 'DAMAGE', value: 3, damageType: 'ION' }
      };
      // Target with 0 shields - ION is useless
      const target = createMockDrone({ hull: 3, currentShields: 0, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: Ready(25) + Class1(3) + Attack2(4) = 32
      // ION can never kill (shield-only damage), so no lethal bonus
      // ION_NO_SHIELDS_PENALTY: -50
      // Cost: 8
      // Expected: 32 - 50 - 8 = -26
      expect(result.score).toBe(-26);
      expect(result.logic.some(l => l.includes('Ion vs no shields'))).toBe(true);
    });

    it('adds per-shield value and full strip bonus', () => {
      const card = {
        id: 'CARD_ION',
        cost: 2,
        effect: { type: 'DAMAGE', value: 3, damageType: 'ION' }
      };
      // Target with 2 shields - 3 ION damage will strip all 2 + waste 1
      const target = createMockDrone({ hull: 3, currentShields: 2, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: 32
      // ION shields damaged (2): 2 × 6 = 12
      // ION_FULL_STRIP_BONUS (damage 3 >= shields 2): +20
      // ION_WASTED_PENALTY (1 wasted): 1 × -3 = -3
      // Total type bonus: 12 + 20 - 3 = 29
      // Cost: 8
      // Expected: 32 + 29 - 8 = 53
      expect(result.score).toBe(53);
      expect(result.logic.some(l => l.includes('Ion full strip'))).toBe(true);
    });

    it('values shields damaged without wasting', () => {
      const card = {
        id: 'CARD_ION',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2, damageType: 'ION' }
      };
      // Target with 3 shields - 2 ION will damage 2 shields with no waste
      const target = createMockDrone({ hull: 3, currentShields: 3, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: 32
      // ION shields damaged (2): 2 × 6 = 12
      // No full strip (2 < 3), no waste
      // Cost: 8
      // Expected: 32 + 12 - 8 = 36
      expect(result.score).toBe(36);
    });
  });

  describe('KINETIC damage type', () => {
    it('adds heavy penalty when target has shields', () => {
      const card = {
        id: 'CARD_KIN',
        cost: 2,
        effect: { type: 'DAMAGE', value: 3, damageType: 'KINETIC' }
      };
      // Target with shields - KINETIC is blocked entirely
      const target = createMockDrone({ hull: 3, currentShields: 1, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: 32
      // KINETIC_BLOCKED_PENALTY: -100
      // Cost: 8
      // Expected: 32 - 100 - 8 = -76
      expect(result.score).toBe(-76);
      expect(result.logic.some(l => l.includes('Kinetic blocked'))).toBe(true);
    });

    it('adds bonus when target has no shields', () => {
      const card = {
        id: 'CARD_KIN',
        cost: 2,
        effect: { type: 'DAMAGE', value: 3, damageType: 'KINETIC' }
      };
      // Target with no shields - KINETIC is effective
      const target = createMockDrone({ hull: 3, currentShields: 0, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: 32
      // Lethal (3 damage kills 3 hull): +20
      // KINETIC_UNSHIELDED_BONUS: +25
      // Cost: 8
      // Expected: 32 + 20 + 25 - 8 = 69
      expect(result.score).toBe(69);
      expect(result.logic.some(l => l.includes('Kinetic vs unshielded'))).toBe(true);
    });
  });

  describe('Normal/PIERCING damage type (control)', () => {
    it('PIERCING adds bypass bonus for shielded targets', () => {
      const card = {
        id: 'CARD_PIERCE',
        cost: 3,
        effect: { type: 'DAMAGE', value: 2, damageType: 'PIERCING' }
      };
      const target = createMockDrone({ hull: 3, currentShields: 2, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: 32
      // PIERCING_BYPASS_BONUS: +5
      // Cost: 12
      // Expected: 32 + 5 - 12 = 25
      expect(result.score).toBe(25);
      expect(result.logic.some(l => l.includes('Piercing'))).toBe(true);
    });

    it('normal damage has no type bonus', () => {
      const card = {
        id: 'CARD_NORMAL',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 } // No damageType = NORMAL
      };
      const target = createMockDrone({ hull: 3, currentShields: 2, class: 1 });
      const context = createMockContext();

      const result = evaluateDamageCard(card, target, context);

      // Base: 32, no damage type modifier, Cost: 8
      // Expected: 32 - 8 = 24
      expect(result.score).toBe(24);
    });
  });
});

describe('evaluateConditionalEffects', () => {
  // Import will be added once the module exists
  let evaluateConditionalEffects;

  beforeEach(async () => {
    const module = await import('../conditionalEvaluator.js');
    evaluateConditionalEffects = module.evaluateConditionalEffects;
  });

  describe('Cards without conditionals', () => {
    it('returns zero bonus for cards without conditionalEffects', () => {
      const card = {
        id: 'CARD001',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 }
        // No conditionalEffects
      };
      const target = createMockDrone({ hull: 2 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      expect(result.bonusScore).toBe(0);
      expect(result.logic).toEqual([]);
    });

    it('returns zero bonus for empty conditionalEffects array', () => {
      const card = {
        id: 'CARD001',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: []
      };
      const target = createMockDrone({ hull: 2 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      expect(result.bonusScore).toBe(0);
    });
  });

  describe('PRE timing conditionals - TARGET_STAT_LT (Executioner pattern)', () => {
    it('adds DESTROY bonus when hull < threshold', () => {
      // CARD053 Executioner: If hull < 2, DESTROY
      const card = {
        id: 'CARD053',
        cost: 2,
        effect: { type: 'DAMAGE', value: 0 },
        conditionalEffects: [{
          id: 'execute-weak',
          timing: 'PRE',
          condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
          grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
        }]
      };
      const target = createMockDrone({ hull: 1, currentShields: 0, class: 1 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // Should add destroy value: (1 hull + 0 shields) × 8 = 8
      // Plus lethal bonus: 1×15 + 50 = 65
      // Total: 73
      expect(result.bonusScore).toBe(73);
      expect(result.logic.some(l => l.includes('Conditional DESTROY'))).toBe(true);
    });

    it('returns zero when hull >= threshold (condition not met)', () => {
      const card = {
        id: 'CARD053',
        cost: 2,
        effect: { type: 'DAMAGE', value: 0 },
        conditionalEffects: [{
          id: 'execute-weak',
          timing: 'PRE',
          condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
          grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
        }]
      };
      const target = createMockDrone({ hull: 3 }); // hull 3 >= 2, condition NOT met
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      expect(result.bonusScore).toBe(0);
    });
  });

  describe('PRE timing conditionals - TARGET_STAT_LTE (Finishing Blow pattern)', () => {
    it('adds BONUS_DAMAGE when hull <= threshold', () => {
      // CARD051 Finishing Blow: If hull <= 2, +2 damage
      const card = {
        id: 'CARD051',
        cost: 3,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          timing: 'PRE',
          condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
        }]
      };
      const target = createMockDrone({ hull: 2 }); // hull 2 <= 2, condition met
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // +2 bonus damage × 8 = 16
      expect(result.bonusScore).toBe(16);
      expect(result.logic.some(l => l.includes('Bonus Damage'))).toBe(true);
    });
  });

  describe('PRE timing conditionals - TARGET_IS_MARKED (Opportunist Strike pattern)', () => {
    it('adds bonuses when target is marked', () => {
      // CARD052: If marked, +2 damage
      const card = {
        id: 'CARD052',
        cost: 4,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          timing: 'PRE',
          condition: { type: 'TARGET_IS_MARKED' },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
        }]
      };
      const target = createMockDrone({ isMarked: true });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // +2 damage × 8 = 16
      expect(result.bonusScore).toBe(16);
    });

    it('returns zero when target is not marked', () => {
      const card = {
        id: 'CARD052',
        cost: 4,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          timing: 'PRE',
          condition: { type: 'TARGET_IS_MARKED' },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
        }]
      };
      const target = createMockDrone({ isMarked: false });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      expect(result.bonusScore).toBe(0);
    });
  });

  describe('PRE timing conditionals - TARGET_STAT_GTE (Swift Maneuver pattern)', () => {
    it('adds GO_AGAIN bonus when speed >= threshold', () => {
      // CARD060: If speed >= 5, go again
      const card = {
        id: 'CARD060',
        cost: 0,
        effect: { type: 'SINGLE_MOVE' },
        conditionalEffects: [{
          timing: 'PRE',
          condition: { type: 'TARGET_STAT_GTE', stat: 'speed', value: 5 },
          grantedEffect: { type: 'GO_AGAIN' }
        }]
      };
      const target = createMockDrone({ speed: 6 }); // speed 6 >= 5
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // GO_AGAIN_BONUS = 40
      expect(result.bonusScore).toBe(40);
      expect(result.logic.some(l => l.includes('Go Again'))).toBe(true);
    });
  });

  describe('Multiple conditionals on same card', () => {
    it('accumulates bonuses from multiple triggered conditionals', () => {
      // Card with multiple PRE conditionals
      const card = {
        id: 'MULTI_COND',
        cost: 3,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [
          {
            timing: 'PRE',
            condition: { type: 'TARGET_IS_MARKED' },
            grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
          },
          {
            timing: 'PRE',
            condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 3 },
            grantedEffect: { type: 'GO_AGAIN' }
          }
        ]
      };
      const target = createMockDrone({ isMarked: true, hull: 2 }); // Both conditions met
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // +2 damage × 8 = 16, plus GO_AGAIN = 40
      expect(result.bonusScore).toBe(56);
    });
  });

  describe('POST timing conditionals - ON_DESTROY', () => {
    it('adds draw bonus when damage will kill target (CARD050 Scavenger Shot)', () => {
      // CARD050: Deal 2 damage, if destroyed draw 1
      const card = {
        id: 'CARD050',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        }]
      };
      // 2 damage will kill 2 hull drone (no shields)
      const target = createMockDrone({ hull: 2, currentShields: 0 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // Draw bonus: 1 × 10 = 10 (DRAW_BASE_VALUE = 10)
      expect(result.bonusScore).toBe(10);
      expect(result.logic.some(l => l.includes('Draw'))).toBe(true);
    });

    it('no bonus when damage will NOT kill target', () => {
      const card = {
        id: 'CARD050',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        }]
      };
      // 2 damage won't kill 3 hull drone
      const target = createMockDrone({ hull: 3, currentShields: 0 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // No bonus - damage won't kill
      expect(result.bonusScore).toBe(0);
    });

    it('accounts for shields when predicting kill', () => {
      const card = {
        id: 'CARD050',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        }]
      };
      // 2 damage vs 1 hull + 1 shield = 2 total, will kill
      const target = createMockDrone({ hull: 1, currentShields: 1 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // Should trigger draw bonus: 1 × 10 = 10
      expect(result.bonusScore).toBe(10);
    });

    it('no bonus when shields prevent kill', () => {
      const card = {
        id: 'CARD050',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        }]
      };
      // 2 damage vs 1 hull + 2 shields = won't kill
      const target = createMockDrone({ hull: 1, currentShields: 2 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      expect(result.bonusScore).toBe(0);
    });
  });

  describe('POST timing conditionals - ON_HULL_DAMAGE', () => {
    it('adds energy bonus when hull damage will be dealt (CARD054 Energy Leech)', () => {
      // CARD054: Deal 1 damage, if hull damage dealt gain 3 energy
      // Target has 0 shields, so 1 damage will deal hull damage
      const card = {
        id: 'CARD054',
        cost: 2,
        effect: { type: 'DAMAGE', value: 1 },
        conditionalEffects: [{
          timing: 'POST',
          condition: { type: 'ON_HULL_DAMAGE' },
          grantedEffect: { type: 'GAIN_ENERGY', value: 3 }
        }]
      };
      const target = createMockDrone({ hull: 3, currentShields: 0 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // Energy bonus: 3 × 5 = 15
      expect(result.bonusScore).toBe(15);
      expect(result.logic.some(l => l.includes('Energy'))).toBe(true);
    });

    it('no bonus when damage blocked by shields (no hull damage)', () => {
      // Target has 2 shields, dealing 1 damage won't cause hull damage
      const card = {
        id: 'CARD054',
        cost: 2,
        effect: { type: 'DAMAGE', value: 1 },
        conditionalEffects: [{
          timing: 'POST',
          condition: { type: 'ON_HULL_DAMAGE' },
          grantedEffect: { type: 'GAIN_ENERGY', value: 3 }
        }]
      };
      const target = createMockDrone({ hull: 3, currentShields: 2 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // No bonus - shields will absorb all damage
      expect(result.bonusScore).toBe(0);
    });

    it('no bonus for non-damage effects', () => {
      const card = {
        id: 'TEST_CARD',
        cost: 2,
        effect: { type: 'HEAL_HULL', value: 2 }, // Not damage
        conditionalEffects: [{
          timing: 'POST',
          condition: { type: 'ON_HULL_DAMAGE' },
          grantedEffect: { type: 'GAIN_ENERGY', value: 3 }
        }]
      };
      const target = createMockDrone({ hull: 3 });
      const context = createMockContext();

      const result = evaluateConditionalEffects(card, target, context);

      // No bonus - not a damage effect
      expect(result.bonusScore).toBe(0);
    });
  });
});
