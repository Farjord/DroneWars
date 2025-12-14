// ========================================
// AI EVALUATION TESTS - DOGFIGHT & RETALIATE
// ========================================
// Tests for AI scoring of attacks involving Dogfight and Retaliate abilities

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluateDroneAttack } from './droneAttack.js';
import { PENALTIES } from '../aiConstants.js';

// Mock game data service
const createMockGameDataService = () => ({
  getEffectiveStats: (drone, lane) => ({
    attack: drone.attack || 0,
    hull: drone.hull || 0,
    shields: drone.shields || 0,
    speed: drone.speed || 0,
    class: drone.class || 0,
    keywords: new Set(drone.keywords || []),
  }),
});

// Helper to create minimal test context
const createTestContext = (overrides = {}) => ({
  player1: {
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: {
      'Bridge': { hull: 5, maxHull: 5, allocatedShields: 3 },
      'Engine': { hull: 5, maxHull: 5, allocatedShields: 3 },
      'Cargo': { hull: 5, maxHull: 5, allocatedShields: 3 },
    },
  },
  player2: {
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: {
      'Bridge': { hull: 5, maxHull: 5, allocatedShields: 3 },
      'Engine': { hull: 5, maxHull: 5, allocatedShields: 3 },
      'Cargo': { hull: 5, maxHull: 5, allocatedShields: 3 },
    },
  },
  gameDataService: createMockGameDataService(),
  allSections: {
    player1: ['Bridge', 'Engine', 'Cargo'],
    player2: ['Bridge', 'Engine', 'Cargo'],
  },
  getShipStatus: () => ({ shields: 3, hull: 5, maxHull: 5, damaged: false, critical: false }),
  ...overrides,
});

describe('AI Drone Attack Evaluation - Retaliate Ability', () => {
  describe('Retaliate Penalty Application', () => {
    it('applies penalty when attacking a Thornback (RETALIATE) that would survive', () => {
      // Attacker: drone that cannot one-shot Thornback but can survive retaliate
      const attacker = {
        id: 'attacker-1',
        name: 'Talon', // 3 attack, cannot kill Thornback (4 HP), but survives retaliate (3 HP vs 2 dmg)
        attack: 3,
        hull: 2,
        currentShields: 1,
        speed: 4,
        class: 2,
        lane: 'lane1',
        isExhausted: false,
      };

      // Target: Thornback with RETALIATE (2 attack, 3 hull, 1 shields = 4 total HP)
      const target = {
        id: 'target-1',
        name: 'Thornback',
        attack: 2,
        hull: 3,
        currentShields: 1,
        speed: 2,
        class: 2,
        lane: 'lane1',
        isExhausted: false,
      };

      const context = createTestContext();
      const result = evaluateDroneAttack(attacker, target, context);

      // Should include retaliate penalty in logic
      const retaliateLogEntry = result.logic.find(l => l.includes('Retaliate'));
      expect(retaliateLogEntry).toBeDefined();

      // Penalty should be damage-based (2 attack * -5 = -10)
      expect(retaliateLogEntry).toContain(`${PENALTIES.RETALIATE_DAMAGE_MULTIPLIER * 2}`);
    });

    it('applies lethal penalty when retaliate would kill the attacker', () => {
      // Attacker: weak drone that would die to Thornback's retaliate
      const attacker = {
        id: 'attacker-1',
        name: 'Dart',
        attack: 1,
        hull: 1,
        currentShields: 0,
        speed: 6,
        class: 1,
        lane: 'lane1',
        isExhausted: false,
      };

      // Target: Thornback with RETALIATE (2 attack)
      const target = {
        id: 'target-1',
        name: 'Thornback',
        attack: 2,
        hull: 3,
        currentShields: 1,
        speed: 2,
        class: 2,
        lane: 'lane1',
        isExhausted: false,
      };

      const context = createTestContext();
      const result = evaluateDroneAttack(attacker, target, context);

      // Should include LETHAL retaliate penalty
      const retaliateLogEntry = result.logic.find(l => l.includes('Retaliate') && l.includes('LETHAL'));
      expect(retaliateLogEntry).toBeDefined();
      expect(retaliateLogEntry).toContain(`${PENALTIES.RETALIATE_LETHAL}`);
    });

    it('does NOT apply penalty if attacker can one-shot the target', () => {
      // Attacker: Strong drone that can kill Thornback
      const attacker = {
        id: 'attacker-1',
        name: 'Mammoth', // 4 attack
        attack: 4,
        hull: 4,
        shields: 1,
        speed: 3,
        class: 3,
        lane: 'lane1',
        isExhausted: false,
      };

      // Target: Thornback with RETALIATE (4 HP total - attackable can exactly kill it)
      const target = {
        id: 'target-1',
        name: 'Thornback',
        attack: 2,
        hull: 3,
        currentShields: 1,
        speed: 2,
        class: 2,
        lane: 'lane1',
        isExhausted: false,
      };

      const context = createTestContext();
      const result = evaluateDroneAttack(attacker, target, context);

      // Should NOT include retaliate penalty (target dies before retaliate)
      const retaliateLogEntry = result.logic.find(l => l.includes('Retaliate'));
      expect(retaliateLogEntry).toBeUndefined();
    });

    it('does NOT apply penalty to drones without RETALIATE', () => {
      const attacker = {
        id: 'attacker-1',
        name: 'Dart',
        attack: 1,
        hull: 1,
        shields: 1,
        speed: 6,
        class: 1,
        lane: 'lane1',
        isExhausted: false,
      };

      // Target: Regular drone without RETALIATE
      const target = {
        id: 'target-1',
        name: 'Talon', // No RETALIATE
        attack: 3,
        hull: 2,
        currentShields: 1,
        speed: 4,
        class: 2,
        lane: 'lane1',
        isExhausted: false,
      };

      const context = createTestContext();
      const result = evaluateDroneAttack(attacker, target, context);

      // Should NOT include retaliate penalty
      const retaliateLogEntry = result.logic.find(l => l.includes('Retaliate'));
      expect(retaliateLogEntry).toBeUndefined();
    });
  });

  describe('Retaliate Penalty Calculation', () => {
    it('scales penalty with target attack value', () => {
      const attacker = {
        id: 'attacker-1',
        name: 'Talon',
        attack: 3,
        hull: 2,
        currentShields: 5, // Won't die to retaliate
        speed: 4,
        class: 2,
        lane: 'lane1',
        isExhausted: false,
      };

      // Target: Scorpion with RETALIATE (2 attack, 4 HP)
      const target = {
        id: 'target-1',
        name: 'Scorpion', // Has both DOGFIGHT and RETALIATE
        attack: 2,
        hull: 3,
        currentShields: 1,
        speed: 4,
        class: 3,
        lane: 'lane1',
        isExhausted: false,
      };

      const context = createTestContext();
      const result = evaluateDroneAttack(attacker, target, context);

      // Scorpion has 2 attack, so penalty = 2 * -5 = -10
      const retaliateLogEntry = result.logic.find(l => l.includes('Retaliate'));
      expect(retaliateLogEntry).toBeDefined();
      expect(retaliateLogEntry).toContain('2 dmg');
    });
  });
});
