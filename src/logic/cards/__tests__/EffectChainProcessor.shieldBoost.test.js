// Integration test: Shield Boost through processEffectChain with REAL EffectRouter
// Tests the full chain path without mocking the processor layer.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules to break circular dependencies and isolate the chain
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    fireTrigger() {
      return { triggered: false, newPlayerStates: null, animationEvents: [], goAgain: false };
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_CARD_PLAY: 'ON_CARD_PLAY' }
}));
vi.mock('../../gameLogic.js', () => ({
  gameEngine: { updateAuras: vi.fn() },
}));
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  flowCheckpoint: vi.fn(),
}));

import EffectChainProcessor from '../EffectChainProcessor.js';

describe('Shield Boost — full processEffectChain integration', () => {
  let processor;

  const createPlayerStates = () => ({
    player1: {
      name: 'Player 1',
      energy: 5,
      momentum: 0,
      hand: [
        { id: 'SHIELD_BOOST', instanceId: 'inst_sb_1', name: 'Shield Boost', type: 'Support', cost: 1,
          effects: [{ type: 'RESTORE_SECTION_SHIELDS', value: 2, goAgain: true, targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } }] }
      ],
      deck: [],
      discardPile: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      techSlots: { lane1: [], lane2: [], lane3: [] },
      shipSections: {
        bridge: {
          id: 'BRIDGE_001', type: 'Bridge', key: 'bridge', name: 'Standard Command Bridge',
          hull: 10, maxHull: 10, shields: 4, allocatedShields: 1, destroyed: false,
          thresholds: { damaged: 5, critical: 0 },
          middleLaneBonus: { 'Shields Per Turn': 1 },
          lane: 'm',
        },
        powerCell: {
          id: 'POWER_CELL_001', type: 'Power Cell', key: 'powerCell', name: 'Standard Power Cell',
          hull: 8, maxHull: 8, shields: 3, allocatedShields: 0, destroyed: false,
          thresholds: { damaged: 4, critical: 0 },
          lane: 'l',
        },
        droneControlHub: {
          id: 'DRONE_CONTROL_HUB_001', type: 'Drone Control Hub', key: 'droneControlHub', name: 'Standard Drone Control Hub',
          hull: 6, maxHull: 6, shields: 2, allocatedShields: 0, destroyed: false,
          thresholds: { damaged: 3, critical: 0 },
          lane: 'r',
        },
      },
      activeDronePool: [],
    },
    player2: {
      name: 'Player 2',
      energy: 5,
      momentum: 0,
      hand: [],
      deck: [],
      discardPile: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      techSlots: { lane1: [], lane2: [], lane3: [] },
      shipSections: {
        bridge: { hull: 10, maxHull: 10, shields: 4, allocatedShields: 4, destroyed: false, thresholds: { damaged: 5, critical: 0 }, lane: 'm' },
        powerCell: { hull: 8, maxHull: 8, shields: 3, allocatedShields: 3, destroyed: false, thresholds: { damaged: 4, critical: 0 }, lane: 'l' },
        droneControlHub: { hull: 6, maxHull: 6, shields: 2, allocatedShields: 2, destroyed: false, thresholds: { damaged: 3, critical: 0 }, lane: 'r' },
      },
      activeDronePool: [],
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new EffectChainProcessor();
  });

  it('restores shields on a ship section with missing shields', () => {
    const playerStates = createPlayerStates();
    const card = playerStates.player1.hand[0];

    // Target: bridge with 1/4 shields (3 missing)
    const target = {
      ...playerStates.player1.shipSections.bridge,
      id: 'bridge',
      name: 'bridge',
      owner: 'player1',
    };

    const selections = [{ target, lane: null }];
    const placedSections = {
      player1: ['powerCell', 'bridge', 'droneControlHub'],  // bridge in middle
      player2: ['powerCell', 'bridge', 'droneControlHub'],
    };

    const result = processor.processEffectChain(card, selections, 'player1', {
      playerStates,
      placedSections,
      callbacks: { logCallback: vi.fn(), resolveAttackCallback: vi.fn(), updateAurasCallback: vi.fn(), actionsTakenThisTurn: 0 },
      localPlayerId: 'player1',
      isPlayerAI: false,
    });

    // Bridge: base 4 shields + 1 middle lane bonus = 5 max
    // Had 1 allocated → restore min(2, 4) = 2 → now 3
    expect(result.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(3);
    expect(result.shouldEndTurn).toBe(false); // goAgain
  });

  it('restores shields on powerCell (not in middle lane)', () => {
    const playerStates = createPlayerStates();
    const card = playerStates.player1.hand[0];

    const target = {
      ...playerStates.player1.shipSections.powerCell,
      id: 'powerCell',
      name: 'powerCell',
      owner: 'player1',
    };

    const selections = [{ target, lane: null }];
    const placedSections = {
      player1: ['powerCell', 'bridge', 'droneControlHub'],
      player2: ['powerCell', 'bridge', 'droneControlHub'],
    };

    const result = processor.processEffectChain(card, selections, 'player1', {
      playerStates,
      placedSections,
      callbacks: { logCallback: vi.fn(), resolveAttackCallback: vi.fn(), updateAurasCallback: vi.fn(), actionsTakenThisTurn: 0 },
      localPlayerId: 'player1',
      isPlayerAI: false,
    });

    // powerCell: base 3 shields, not in middle → max 3
    // Had 0 allocated → restore min(2, 3) = 2 → now 2
    expect(result.newPlayerStates.player1.shipSections.powerCell.allocatedShields).toBe(2);
  });

  it('does not restore beyond max shields', () => {
    const playerStates = createPlayerStates();
    // Set bridge to 4/4 shields (full base, no middle bonus used)
    playerStates.player1.shipSections.bridge.allocatedShields = 4;
    const card = playerStates.player1.hand[0];

    const target = {
      ...playerStates.player1.shipSections.bridge,
      id: 'bridge',
      name: 'bridge',
      owner: 'player1',
    };

    const selections = [{ target, lane: null }];
    const placedSections = {
      player1: ['powerCell', 'bridge', 'droneControlHub'],
      player2: ['powerCell', 'bridge', 'droneControlHub'],
    };

    const result = processor.processEffectChain(card, selections, 'player1', {
      playerStates,
      placedSections,
      callbacks: { logCallback: vi.fn(), resolveAttackCallback: vi.fn(), updateAurasCallback: vi.fn(), actionsTakenThisTurn: 0 },
      localPlayerId: 'player1',
      isPlayerAI: false,
    });

    // Bridge has 4/4 base + 1 middle bonus = 5 max
    // Had 4 → restore min(2, 1) = 1 → now 5
    expect(result.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(5);
  });
});
