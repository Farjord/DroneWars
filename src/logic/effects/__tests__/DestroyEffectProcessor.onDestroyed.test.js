// ========================================
// DESTROY EFFECT PROCESSOR — ON_DESTROYED TRIGGER TESTS
// ========================================
// Verifies that ON_DESTROYED triggers fire correctly when drones are
// removed via DESTROY effects (e.g. Shrieker Missiles, filtered lane destroy).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock drone data with a Banshee-equivalent that has ON_DESTROYED + DISCARD
vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'BansheeTest',
      attack: 1, hull: 1, shields: 0, speed: 5,
      abilities: [{
        name: 'Disruption Vortex',
        type: 'TRIGGERED',
        trigger: 'ON_DESTROYED',
        effects: [{ type: 'DISCARD', count: 1 }]
      }]
    },
    {
      name: 'SlowDrone',
      attack: 2, hull: 3, shields: 0, speed: 3,
      abilities: []
    }
  ]
}));

vi.mock('../../../data/techData.js', () => ({ default: [] }));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../utils/gameEngineUtils.js', () => ({
  getLaneOfDrone: vi.fn((droneId, playerState) => {
    for (const [lane, drones] of Object.entries(playerState.dronesOnBoard || {})) {
      if (drones.some(d => d.id === droneId)) return lane;
    }
    return null;
  })
}));

vi.mock('../../gameLogic.js', () => ({
  gameEngine: {
    onDroneDestroyed: vi.fn((playerState) => ({
      deployedDroneCounts: playerState.deployedDroneCounts || {}
    }))
  }
}));

vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({ ...drone }))
}));

vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn((playerState) => playerState.dronesOnBoard)
}));

vi.mock('./destroy/animations/DefaultDestroyAnimation.js', () => ({
  buildDefaultDestroyAnimation: vi.fn(() => [])
}));

vi.mock('./destroy/animations/NukeAnimation.js', () => ({
  buildNukeAnimation: vi.fn(() => [])
}));

vi.mock('../../targeting/TargetSelector.js', () => ({
  applyTargetSelection: vi.fn((drones) => drones),
  hashString: vi.fn((s) => s.length)
}));

vi.mock('../../../utils/seededRandom.js', () => ({
  SeededRandom: class {
    constructor() {}
    randomInt(min, max) { return min; }
    select(arr) { return arr[0]; }
    static forTargetSelection() { return new this(); }
  }
}));

import DestroyEffectProcessor from '../DestroyEffectProcessor.js';
import { TRIGGER_FIRED, DRONE_DESTROYED } from '../../../config/animationTypes.js';

describe('DestroyEffectProcessor — ON_DESTROYED trigger', () => {
  let processor;
  let basePlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DestroyEffectProcessor();

    basePlayerStates = {
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [{ id: 'c1', name: 'Card A' }, { id: 'c2', name: 'Card B' }],
        discardPile: [],
        deployedDroneCounts: {}
      },
      player2: {
        name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [{ id: 'c3', name: 'Card C' }, { id: 'c4', name: 'Card D' }],
        discardPile: [],
        deployedDroneCounts: {}
      }
    };
  });

  it('fires ON_DESTROYED when Banshee is destroyed by a filtered DESTROY effect (Shrieker Missiles path)', () => {
    // Player1 has a Banshee (speed 5) — player2 plays Shrieker Missiles
    const banshee = { id: 'banshee-1', name: 'BansheeTest', speed: 5, hull: 1, shields: 0, attack: 1 };
    basePlayerStates.player1.dronesOnBoard.lane2 = [banshee];

    const effect = {
      type: 'DESTROY',
      targeting: {
        type: 'LANE',
        affinity: 'ENEMY',
        affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }]
      }
    };

    const result = processor.process(effect, {
      actingPlayerId: 'player2',
      playerStates: basePlayerStates,
      target: { id: 'lane2' },
      card: { name: 'Shrieker Missiles' },
      placedSections: {},
      callbacks: { logCallback: vi.fn() },
      gameSeed: 12345,
      roundNumber: 1
    });

    // Banshee should be removed
    expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(0);

    // Disruption Vortex should have fired — player2's hand shrinks by 1
    expect(result.newPlayerStates.player2.hand).toHaveLength(1);
    expect(result.newPlayerStates.player2.discardPile).toHaveLength(1);
  });

  it('emits TRIGGER_FIRED before DRONE_DESTROYED for filtered destroy', () => {
    const banshee = { id: 'banshee-1', name: 'BansheeTest', speed: 5, hull: 1, shields: 0, attack: 1 };
    basePlayerStates.player1.dronesOnBoard.lane2 = [banshee];

    const effect = {
      type: 'DESTROY',
      targeting: {
        type: 'LANE',
        affinity: 'ENEMY',
        affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }]
      }
    };

    const result = processor.process(effect, {
      actingPlayerId: 'player2',
      playerStates: basePlayerStates,
      target: { id: 'lane2' },
      card: { name: 'Shrieker Missiles' },
      placedSections: {},
      callbacks: { logCallback: vi.fn() },
      gameSeed: 12345,
      roundNumber: 1
    });

    const triggerFiredIdx = result.animationEvents.findIndex(e => e.type === TRIGGER_FIRED);
    const droneDestroyedIdx = result.animationEvents.findIndex(e => e.type === DRONE_DESTROYED);

    expect(triggerFiredIdx).toBeGreaterThanOrEqual(0);
    expect(droneDestroyedIdx).toBeGreaterThanOrEqual(0);
    expect(triggerFiredIdx).toBeLessThan(droneDestroyedIdx);
  });

  it('does NOT fire ON_DESTROYED for drones that do not match the filter (SlowDrone speed 3)', () => {
    const slowDrone = { id: 'slow-1', name: 'SlowDrone', speed: 3, hull: 3, shields: 0, attack: 2 };
    basePlayerStates.player1.dronesOnBoard.lane2 = [slowDrone];

    const effect = {
      type: 'DESTROY',
      targeting: {
        type: 'LANE',
        affinity: 'ENEMY',
        affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }]
      }
    };

    const result = processor.process(effect, {
      actingPlayerId: 'player2',
      playerStates: basePlayerStates,
      target: { id: 'lane2' },
      card: { name: 'Shrieker Missiles' },
      placedSections: {},
      callbacks: { logCallback: vi.fn() },
      gameSeed: 12345,
      roundNumber: 1
    });

    // SlowDrone doesn't match filter — not destroyed, no trigger
    expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(1);
    expect(result.newPlayerStates.player2.hand).toHaveLength(2); // unchanged
  });

  it('fires ON_DESTROYED when multiple Banshees are destroyed', () => {
    const banshee1 = { id: 'banshee-1', name: 'BansheeTest', speed: 5, hull: 1, shields: 0, attack: 1 };
    const banshee2 = { id: 'banshee-2', name: 'BansheeTest', speed: 5, hull: 1, shields: 0, attack: 1 };
    basePlayerStates.player1.dronesOnBoard.lane2 = [banshee1, banshee2];

    // Give player2 3 cards so both discards are visible
    basePlayerStates.player2.hand = [
      { id: 'c1', name: 'Card A' },
      { id: 'c2', name: 'Card B' },
      { id: 'c3', name: 'Card C' }
    ];

    const effect = {
      type: 'DESTROY',
      targeting: {
        type: 'LANE',
        affinity: 'ENEMY',
        affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }]
      }
    };

    const result = processor.process(effect, {
      actingPlayerId: 'player2',
      playerStates: basePlayerStates,
      target: { id: 'lane2' },
      card: { name: 'Shrieker Missiles' },
      placedSections: {},
      callbacks: { logCallback: vi.fn() },
      gameSeed: 12345,
      roundNumber: 1
    });

    // Both Banshees destroyed
    expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(0);

    // Each Banshee fired Disruption Vortex — player2 discards 2 cards
    expect(result.newPlayerStates.player2.hand).toHaveLength(1);
    expect(result.newPlayerStates.player2.discardPile).toHaveLength(2);
  });
});
