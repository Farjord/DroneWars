// ========================================
// DRONE ATTACK EVALUATOR TESTS
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateDroneAttack } from '../droneAttack.js';

// Mock helpers
const createMockDrone = (overrides = {}) => ({
  id: 'drone-1',
  name: 'Test Drone',
  class: 1,
  attack: 2,
  hull: 2,
  maxHull: 2,
  shields: 1,
  currentShields: 1,
  currentMaxShields: 1,
  speed: 3,
  lane: 'lane1',
  isExhausted: false,
  isMarked: false,
  damageType: 'NORMAL',
  ...overrides
});

const createMockContext = (overrides = {}) => ({
  player1: {
    dronesOnBoard: {
      lane1: [],
      lane2: [],
      lane3: []
    },
    shipSections: {
      section1: { hull: 10, maxHull: 10 },
      section2: { hull: 10, maxHull: 10 },
      section3: { hull: 10, maxHull: 10 }
    }
  },
  player2: {
    dronesOnBoard: {
      lane1: [],
      lane2: [],
      lane3: []
    },
    shipSections: {
      section1: { hull: 10, maxHull: 10 },
      section2: { hull: 10, maxHull: 10 },
      section3: { hull: 10, maxHull: 10 }
    }
  },
  gameDataService: {
    getEffectiveStats: (drone, lane) => ({
      ...drone,
      keywords: new Set(drone.keywords || [])
    })
  },
  allSections: {
    player1: ['section1', 'section2', 'section3'],
    player2: ['section1', 'section2', 'section3']
  },
  getShipStatus: () => 'healthy',
  ...overrides
});

describe('evaluateDroneAttack', () => {
  describe('Hunter CONDITIONAL_KEYWORD - Piercing vs Marked', () => {
    it('applies piercing bonus when Hunter attacks marked target with shields', () => {
      const attacker = createMockDrone({
        name: 'Hunter',
        class: 2,
        attack: 2,
        damageType: 'NORMAL' // Hunter doesn't have static piercing
      });
      const target = createMockDrone({
        isMarked: true,
        currentShields: 2
      });
      const context = createMockContext();

      const result = evaluateDroneAttack(attacker, target, context);

      // Should have Hunter Protocol triggered and piercing bypass bonus
      expect(result.logic.some(l => l.includes('Hunter Protocol'))).toBe(true);
      expect(result.logic.some(l => l.includes('Piercing Bypass'))).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('does not apply piercing bonus when Hunter attacks unmarked target', () => {
      const attacker = createMockDrone({
        name: 'Hunter',
        class: 2,
        attack: 2,
        damageType: 'NORMAL'
      });
      const target = createMockDrone({
        isMarked: false,
        currentShields: 2
      });
      const context = createMockContext();

      const result = evaluateDroneAttack(attacker, target, context);

      // Should NOT have Hunter Protocol or piercing bypass
      expect(result.logic.some(l => l.includes('Hunter Protocol'))).toBe(false);
      expect(result.logic.some(l => l.includes('Piercing Bypass'))).toBe(false);
    });

    it('triggers Hunter Protocol but no piercing bonus when target has no shields', () => {
      const attacker = createMockDrone({
        name: 'Hunter',
        class: 2,
        attack: 2,
        damageType: 'NORMAL'
      });
      const target = createMockDrone({
        isMarked: true,
        currentShields: 0
      });
      const context = createMockContext();

      const result = evaluateDroneAttack(attacker, target, context);

      // Hunter Protocol should trigger (target is marked)
      expect(result.logic.some(l => l.includes('Hunter Protocol'))).toBe(true);
      // Piercing Bypass should NOT appear (no shields to bypass)
      expect(result.logic.some(l => l.includes('Piercing Bypass'))).toBe(false);
    });
  });

  describe('Gladiator ON_ATTACK - Growth bonus', () => {
    it('applies growth bonus for Gladiator attacks', () => {
      const attacker = createMockDrone({
        name: 'Gladiator',
        class: 2,
        attack: 2
      });
      const target = createMockDrone({
        class: 1,
        hull: 2
      });
      const context = createMockContext();

      const result = evaluateDroneAttack(attacker, target, context);

      // Should have growth bonus (Veteran Instincts)
      expect(result.logic.some(l => l.includes('Veteran Instincts'))).toBe(true);
    });

    it('does not apply growth bonus for non-growth drones', () => {
      const attacker = createMockDrone({
        name: 'Test Drone',
        class: 1,
        attack: 2
      });
      const target = createMockDrone({
        class: 1,
        hull: 2
      });
      const context = createMockContext();

      const result = evaluateDroneAttack(attacker, target, context);

      // Should NOT have growth bonus
      expect(result.logic.some(l => l.includes('Veteran Instincts'))).toBe(false);
    });
  });

  describe('Interception Coverage Penalty', () => {
    // Test: Applies penalty when attacker is blocking enemy ship attackers
    it('applies interception coverage penalty when blocking enemy ship attackers', () => {
      const attacker = createMockDrone({
        name: 'Scout',
        class: 1,
        attack: 1,
        speed: 4,  // Can intercept slower enemies
        lane: 'lane1'
      });
      const target = createMockDrone({
        id: 'target-1',
        name: 'Enemy Drone',
        class: 1,
        hull: 2,
        lane: 'lane1'
      });
      // Enemy drone in lane that attacker can intercept
      const enemyShipAttacker = createMockDrone({
        id: 'enemy-attacker',
        name: 'Striker',
        class: 2,
        attack: 3,
        speed: 3,  // Slower than attacker - can be intercepted
        lane: 'lane1',
        isExhausted: false
      });
      const context = createMockContext({
        player1: {
          dronesOnBoard: {
            lane1: [target, enemyShipAttacker],
            lane2: [],
            lane3: []
          },
          shipSections: {
            section1: { hull: 10, maxHull: 10 },
            section2: { hull: 10, maxHull: 10 },
            section3: { hull: 10, maxHull: 10 }
          }
        }
      });

      const result = evaluateDroneAttack(attacker, target, context);

      // Should have interception coverage penalty
      expect(result.logic.some(l => l.includes('Losing Interception Coverage'))).toBe(true);
    });

    // Test: Does not apply penalty when no enemies can be intercepted
    it('does not apply penalty when no enemies can be intercepted', () => {
      const attacker = createMockDrone({
        name: 'Slow Drone',
        class: 1,
        attack: 2,
        speed: 2,  // Too slow to intercept
        lane: 'lane1'
      });
      const target = createMockDrone({
        id: 'target-1',
        name: 'Enemy Drone',
        class: 1,
        hull: 2,
        lane: 'lane1'
      });
      // Enemy drone faster than attacker - cannot be intercepted
      const fastEnemy = createMockDrone({
        id: 'fast-enemy',
        name: 'Fast Enemy',
        class: 2,
        attack: 3,
        speed: 5,  // Faster than attacker
        lane: 'lane1',
        isExhausted: false
      });
      const context = createMockContext({
        player1: {
          dronesOnBoard: {
            lane1: [target, fastEnemy],
            lane2: [],
            lane3: []
          },
          shipSections: {
            section1: { hull: 10, maxHull: 10 },
            section2: { hull: 10, maxHull: 10 },
            section3: { hull: 10, maxHull: 10 }
          }
        }
      });

      const result = evaluateDroneAttack(attacker, target, context);

      // Should NOT have interception coverage penalty
      expect(result.logic.some(l => l.includes('Losing Interception Coverage'))).toBe(false);
    });

    // Note: DEFENDER keyword removed - all drones now get interception coverage penalty when attacking
    // (because attacking exhausts them, even though intercepting no longer does)
    it('applies penalty to all drones when they could provide interception coverage', () => {
      const attacker = createMockDrone({
        name: 'Fast Drone',
        class: 2,
        attack: 2,
        speed: 4,
        lane: 'lane1',
        keywords: [] // No special keywords
      });
      const target = createMockDrone({
        id: 'target-1',
        name: 'Enemy Drone',
        class: 1,
        hull: 2,
        lane: 'lane1'
      });
      const enemyAttacker = createMockDrone({
        id: 'enemy-attacker',
        name: 'Striker',
        class: 2,
        attack: 3,
        speed: 3, // Slower than attacker, so attacker could intercept it
        lane: 'lane1',
        isExhausted: false
      });
      const context = createMockContext({
        player1: {
          dronesOnBoard: {
            lane1: [target, enemyAttacker],
            lane2: [],
            lane3: []
          },
          shipSections: {
            section1: { hull: 10, maxHull: 10 },
            section2: { hull: 10, maxHull: 10 },
            section3: { hull: 10, maxHull: 10 }
          }
        }
      });

      const result = evaluateDroneAttack(attacker, target, context);

      // All drones should get interception coverage penalty when attacking exhausts them
      expect(result.logic.some(l => l.includes('Losing Interception Coverage'))).toBe(true);
    });

    // Test: Does not apply penalty for Guardians (handled by Guardian Protection Risk)
    it('does not apply penalty for Guardian drones (handled separately)', () => {
      const attacker = createMockDrone({
        name: 'Bastion',
        class: 2,
        attack: 2,
        speed: 4,
        lane: 'lane1',
        keywords: ['GUARDIAN']
      });
      const target = createMockDrone({
        id: 'target-1',
        name: 'Enemy Drone',
        class: 1,
        hull: 2,
        lane: 'lane1'
      });
      const enemyAttacker = createMockDrone({
        id: 'enemy-attacker',
        name: 'Striker',
        class: 2,
        attack: 3,
        speed: 3,
        lane: 'lane1',
        isExhausted: false
      });
      const context = createMockContext({
        player1: {
          dronesOnBoard: {
            lane1: [target, enemyAttacker],
            lane2: [],
            lane3: []
          },
          shipSections: {
            section1: { hull: 10, maxHull: 10 },
            section2: { hull: 10, maxHull: 10 },
            section3: { hull: 10, maxHull: 10 }
          }
        }
      });

      const result = evaluateDroneAttack(attacker, target, context);

      // Guardian should have Guardian Protection Risk instead
      expect(result.logic.some(l => l.includes('Guardian Protection Risk'))).toBe(true);
      // Should NOT have the general interception coverage penalty
      expect(result.logic.some(l => l.includes('Losing Interception Coverage'))).toBe(false);
    });

    // Test: Penalty scales with threat level
    it('penalty scales with threat level of enemies being blocked', () => {
      const attacker = createMockDrone({
        name: 'Scout',
        class: 1,
        attack: 1,
        speed: 6,
        lane: 'lane1'
      });
      const target = createMockDrone({
        id: 'target-1',
        name: 'Enemy Drone',
        class: 1,
        hull: 2,
        lane: 'lane1'
      });
      // Low threat enemy
      const lowThreatEnemy = createMockDrone({
        id: 'low-threat',
        name: 'Weak Enemy',
        class: 0,
        attack: 1,
        speed: 2,
        lane: 'lane1',
        isExhausted: false
      });
      // High threat enemy
      const highThreatEnemy = createMockDrone({
        id: 'high-threat',
        name: 'Strong Enemy',
        class: 3,
        attack: 4,
        speed: 3,
        lane: 'lane1',
        isExhausted: false
      });

      const lowThreatContext = createMockContext({
        player1: {
          dronesOnBoard: {
            lane1: [target, lowThreatEnemy],
            lane2: [],
            lane3: []
          },
          shipSections: {
            section1: { hull: 10, maxHull: 10 },
            section2: { hull: 10, maxHull: 10 },
            section3: { hull: 10, maxHull: 10 }
          }
        }
      });
      const highThreatContext = createMockContext({
        player1: {
          dronesOnBoard: {
            lane1: [target, highThreatEnemy],
            lane2: [],
            lane3: []
          },
          shipSections: {
            section1: { hull: 10, maxHull: 10 },
            section2: { hull: 10, maxHull: 10 },
            section3: { hull: 10, maxHull: 10 }
          }
        }
      });

      const lowThreatResult = evaluateDroneAttack(attacker, target, lowThreatContext);
      const highThreatResult = evaluateDroneAttack(attacker, target, highThreatContext);

      // Both should have penalty
      expect(lowThreatResult.logic.some(l => l.includes('Losing Interception Coverage'))).toBe(true);
      expect(highThreatResult.logic.some(l => l.includes('Losing Interception Coverage'))).toBe(true);

      // High threat should have larger penalty (lower score)
      expect(highThreatResult.score).toBeLessThan(lowThreatResult.score);
    });
  });
});
