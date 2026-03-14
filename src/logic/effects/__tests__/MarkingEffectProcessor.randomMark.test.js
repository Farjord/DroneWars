// ========================================
// MARKING EFFECT PROCESSOR — RANDOM MARK VIA targetSelection
// ========================================
// TDD: Tests for Scanner's MARK_DRONE + targetSelection pipeline.
// Verifies that the new effect shape flows through TriggerProcessor._buildTarget
// → _resolveDronePool → selectTargets → MarkingEffectProcessor.processMarkDrone.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock droneData with a test Scanner using the NEW effect shape
vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'TestScanner',
      attack: 0, hull: 1, shields: 0, speed: 1,
      abilities: [{
        name: 'Target Scanner',
        type: 'TRIGGERED',
        trigger: 'ON_DEPLOY',
        effects: [{
          type: 'MARK_DRONE',
          scope: 'SAME_LANE',
          affinity: 'ENEMY',
          filter: 'NOT_MARKED',
          targetSelection: { method: 'RANDOM', count: 1 }
        }]
      }]
    }
  ]
}));

vi.mock('../../../data/techData.js', () => ({ default: [] }));
vi.mock('../../../utils/debugLogger.js', () => ({ debugLog: vi.fn() }));
vi.mock('../../../utils/flowVerification.js', () => ({ flowCheckpoint: vi.fn() }));
vi.mock('../../utils/droneStateUtils.js', () => ({
  onDroneDestroyed: vi.fn((playerState) => playerState)
}));
vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn((playerState) => playerState.dronesOnBoard)
}));
// Break circular import: DamageEffectProcessor/DestroyEffectProcessor → gameLogic.js → CardPlayManager → EffectRouter
vi.mock('../../gameLogic.js', () => ({
  gameEngine: {}
}));

import TriggerProcessor from '../../triggers/TriggerProcessor.js';
import { TRIGGER_TYPES } from '../../triggers/triggerConstants.js';

const makeDrone = (id, name, overrides = {}) => ({
  id, name, hull: 2, currentShields: 1, attack: 1, speed: 2,
  isMarked: false, isExhausted: false, owner: 'player2',
  ...overrides
});

const makePlayerStates = (scannerLane, scannerOwner, enemyDrones) => ({
  [scannerOwner]: {
    dronesOnBoard: {
      lane1: scannerOwner === 'player1' ? [{ id: 'scanner-1', name: 'TestScanner', isMarked: false, isExhausted: false, owner: scannerOwner }] : [],
      lane2: [],
      lane3: []
    }
  },
  [scannerOwner === 'player1' ? 'player2' : 'player1']: {
    dronesOnBoard: {
      lane1: enemyDrones,
      lane2: [],
      lane3: []
    }
  }
});

describe('Scanner MARK_DRONE via targetSelection pipeline', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new TriggerProcessor();
  });

  it('marks exactly 1 random enemy in the same lane', () => {
    const enemies = [
      makeDrone('e1', 'EnemyA'),
      makeDrone('e2', 'EnemyB'),
      makeDrone('e3', 'EnemyC')
    ];
    const playerStates = makePlayerStates('lane1', 'player1', enemies);
    const scannerDrone = playerStates.player1.dronesOnBoard.lane1[0];

    const result = processor.fireTrigger(TRIGGER_TYPES.ON_DEPLOY, {
      lane: 'lane1',
      triggeringDrone: scannerDrone,
      triggeringPlayerId: 'player1',
      actingPlayerId: 'player1',
      playerStates,
      placedSections: { player1: [], player2: [] },
      logCallback: vi.fn(),
      gameSeed: 42,
      roundNumber: 1
    });

    expect(result.triggered).toBe(true);

    const markedDrones = result.newPlayerStates.player2.dronesOnBoard.lane1
      .filter(d => d.isMarked);
    expect(markedDrones).toHaveLength(1);
  });

  it('skips already-marked drones — marks the single unmarked one', () => {
    const enemies = [
      makeDrone('e1', 'EnemyA', { isMarked: true }),
      makeDrone('e2', 'EnemyB', { isMarked: true }),
      makeDrone('e3', 'EnemyC', { isMarked: false })
    ];
    const playerStates = makePlayerStates('lane1', 'player1', enemies);
    const scannerDrone = playerStates.player1.dronesOnBoard.lane1[0];

    const result = processor.fireTrigger(TRIGGER_TYPES.ON_DEPLOY, {
      lane: 'lane1',
      triggeringDrone: scannerDrone,
      triggeringPlayerId: 'player1',
      actingPlayerId: 'player1',
      playerStates,
      placedSections: { player1: [], player2: [] },
      logCallback: vi.fn(),
      gameSeed: 42,
      roundNumber: 1
    });

    expect(result.triggered).toBe(true);

    const lane1 = result.newPlayerStates.player2.dronesOnBoard.lane1;
    const newlyMarked = lane1.filter(d => d.isMarked && d.id === 'e3');
    expect(newlyMarked).toHaveLength(1);
    // The 2 previously marked should still be marked
    expect(lane1.filter(d => d.isMarked)).toHaveLength(3);
  });

  it('silent no-op when all enemies are already marked', () => {
    const enemies = [
      makeDrone('e1', 'EnemyA', { isMarked: true }),
      makeDrone('e2', 'EnemyB', { isMarked: true })
    ];
    const playerStates = makePlayerStates('lane1', 'player1', enemies);
    const scannerDrone = playerStates.player1.dronesOnBoard.lane1[0];

    const result = processor.fireTrigger(TRIGGER_TYPES.ON_DEPLOY, {
      lane: 'lane1',
      triggeringDrone: scannerDrone,
      triggeringPlayerId: 'player1',
      actingPlayerId: 'player1',
      playerStates,
      placedSections: { player1: [], player2: [] },
      logCallback: vi.fn(),
      gameSeed: 42,
      roundNumber: 1
    });

    // Should still trigger (ability fires), but no drones get newly marked
    const lane1 = result.newPlayerStates.player2.dronesOnBoard.lane1;
    const markedCount = lane1.filter(d => d.isMarked).length;
    expect(markedCount).toBe(2); // unchanged — both were already marked
  });
});
