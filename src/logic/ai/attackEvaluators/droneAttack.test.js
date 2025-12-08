// ========================================
// DRONE ATTACK EVALUATOR TESTS
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateDroneAttack } from './droneAttack.js';

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

      // Should have piercing bonus: 2 shields × 8 = 16
      expect(result.logic.some(l => l.includes('Piercing') || l.includes('piercing'))).toBe(true);
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

      // Should NOT have piercing bonus
      expect(result.logic.some(l => l.includes('Piercing') || l.includes('piercing'))).toBe(false);
    });

    it('applies piercing with zero bonus when target has no shields', () => {
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
      // Piercing damage bonus should be 0 (no shields)
      const piercingLine = result.logic.find(l => l.includes('Piercing Damage'));
      expect(piercingLine).toContain('+0');
    });
  });

  describe('Gladiator AFTER_ATTACK - Growth bonus', () => {
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
      expect(result.logic.some(l => l.includes('Growth') || l.includes('Veteran'))).toBe(true);
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
      expect(result.logic.some(l => l.includes('Growth') || l.includes('Veteran'))).toBe(false);
    });
  });
});
