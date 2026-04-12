import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPlayerCommitment, processCommitment, isPreGameComplete, handleAICommitment } from '../CommitmentStrategy.js';

// Mock debug logger
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now()),
  getTimestamp: vi.fn(() => Date.now())
}));

// Mock DroneAvailabilityManager
vi.mock('../../availability/DroneAvailabilityManager.js', () => ({
  initializeForCombat: vi.fn((drones) => {
    const availability = {};
    drones.forEach(d => {
      availability[d.name] = { maxDeploy: d.maxDeploy || 2, deployed: 0 };
    });
    return availability;
  })
}));

// Mock droneSelectionUtils
vi.mock('../../../utils/droneSelectionUtils.js', () => ({
  initializeDroneSelection: vi.fn((drones, _maxSelect, _rng) => ({
    droneSelectionTrio: drones.slice(0, 3),
    droneSelectionPool: drones
  })),
  extractDronesFromDeck: vi.fn((drones) => drones)
}));

// Mock SeededRandom
vi.mock('../../../utils/seededRandom.js', () => ({
  SeededRandom: {
    forDroneSelection: vi.fn(() => ({ next: () => 0.5 }))
  }
}));

// Mock ship section data
vi.mock('../../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    { id: 'BRIDGE_001', key: 'bridge', type: 'Bridge', hullModifier: 0, shieldsModifier: 0, thresholdModifiers: { damaged: 0, critical: 0 } },
    { id: 'BRIDGE_002', key: 'tacticalBridge', type: 'Bridge', hullModifier: 0, shieldsModifier: 0, thresholdModifiers: { damaged: 0, critical: 0 } },
    { id: 'POWERCELL_001', key: 'powerCell', type: 'Power Cell', hullModifier: 0, shieldsModifier: 0, thresholdModifiers: { damaged: 0, critical: 0 } },
    { id: 'DRONECONTROL_001', key: 'droneControlHub', type: 'Drone Control Hub', hullModifier: 0, shieldsModifier: 0, thresholdModifiers: { damaged: 0, critical: 0 } }
  ]
}));

// Mock ship data
vi.mock('../../../data/shipData.js', () => ({
  getShipById: vi.fn(() => ({ baseHull: 10, baseShields: 3, baseThresholds: { damaged: 6, critical: 3 } })),
  getDefaultShip: vi.fn(() => ({ baseHull: 10, baseShields: 3, baseThresholds: { damaged: 6, critical: 3 } }))
}));

// Mock statsCalculator
vi.mock('../../statsCalculator.js', () => ({
  calculateSectionBaseStats: vi.fn((shipCard) => ({
    hull: shipCard.baseHull,
    maxHull: shipCard.baseHull,
    shields: shipCard.baseShields,
    allocatedShields: shipCard.baseShields,
    thresholds: shipCard.baseThresholds
  }))
}));

// Mock AIPhaseProcessor
vi.mock('../../../managers/AIPhaseProcessor.js', () => ({
  default: {
    processDeckSelection: vi.fn(async () => ({
      deck: [{ id: 'ai_c1' }],
      drones: [{ name: 'AIDart', maxDeploy: 2 }],
      shipComponents: {}
    })),
    processDroneSelection: vi.fn(async () => [{ name: 'AIDart', maxDeploy: 2 }])
  }
}));

describe('applyPlayerCommitment', () => {
  let mockCtx;
  let gameState;

  beforeEach(() => {
    gameState = {
      player1: {
        name: 'Player 1',
        deck: [],
        hand: [],
        deckDronePool: [],
        selectedShipComponents: {},
        activeDronePool: [],
        deployedDroneCounts: {},
        droneAvailability: {},
        appliedUpgrades: {},
        shipSections: {}
      },
      player2: {
        name: 'Player 2',
        deck: [],
        hand: [],
        deckDronePool: [],
        selectedShipComponents: {},
        activeDronePool: [],
        deployedDroneCounts: {},
        droneAvailability: {},
        appliedUpgrades: {},
        shipSections: {}
      },
      gameSeed: 12345,
      commitments: {},
      placedSections: null,
      opponentPlacedSections: null
    };

    mockCtx = {
      getState: vi.fn(() => gameState),
      setState: vi.fn((updates) => {
        Object.assign(gameState, updates);
        // Deep merge player states
        if (updates.player1) gameState.player1 = { ...gameState.player1, ...updates.player1 };
        if (updates.player2) gameState.player2 = { ...gameState.player2, ...updates.player2 };
      })
    };
  });

  describe('subPhase=deckSelection', () => {
    const testDeck = [{ id: 'c1', name: 'Card1' }, { id: 'c2', name: 'Card2' }];
    const testDrones = [{ name: 'Dart', maxDeploy: 2 }, { name: 'Talon', maxDeploy: 1 }];
    const testShipComponents = { bridge: 'Armored Bridge' };

    it('applies deck, deckDronePool, selectedShipComponents to specified player only', () => {
      applyPlayerCommitment('deckSelection', 'player1', {
        deck: testDeck,
        drones: testDrones,
        shipComponents: testShipComponents
      }, mockCtx);

      expect(mockCtx.setState).toHaveBeenCalled();
      const setStateCall = mockCtx.setState.mock.calls[0][0];

      // Player 1 should have updated state
      expect(setStateCall.player1.deck).toEqual(testDeck);
      expect(setStateCall.player1.deckDronePool).toEqual(testDrones);
      expect(setStateCall.player1.selectedShipComponents).toEqual(testShipComponents);

      // Player 2 should be unchanged
      expect(setStateCall.player2).toBeUndefined();
    });

    it('initializes drone selection trio/pool for that player', () => {
      applyPlayerCommitment('deckSelection', 'player1', {
        deck: testDeck,
        drones: testDrones,
        shipComponents: testShipComponents
      }, mockCtx);

      const setStateCall = mockCtx.setState.mock.calls[0][0];

      // Should initialize drone selection data
      expect(setStateCall.player1DroneSelectionTrio).toBeDefined();
      expect(setStateCall.player1DroneSelectionPool).toBeDefined();
    });

    it('applies to player2 without affecting player1', () => {
      // Pre-set player1 state
      gameState.player1.deck = [{ id: 'existing' }];

      applyPlayerCommitment('deckSelection', 'player2', {
        deck: testDeck,
        drones: testDrones,
        shipComponents: testShipComponents
      }, mockCtx);

      const setStateCall = mockCtx.setState.mock.calls[0][0];

      // Player 2 should have updated state
      expect(setStateCall.player2.deck).toEqual(testDeck);
      expect(setStateCall.player2.deckDronePool).toEqual(testDrones);

      // Player 1 should be unchanged
      expect(setStateCall.player1).toBeUndefined();

      // Drone selection should use player2 keys
      expect(setStateCall.player2DroneSelectionTrio).toBeDefined();
      expect(setStateCall.player2DroneSelectionPool).toBeDefined();
    });

    it('rebuilds shipSections when non-default components are selected (BRIDGE_002 fix)', () => {
      applyPlayerCommitment('deckSelection', 'player1', {
        deck: testDeck,
        drones: testDrones,
        shipComponents: {
          'BRIDGE_002': 'l',
          'POWERCELL_001': 'm',
          'DRONECONTROL_001': 'r'
        }
      }, mockCtx);

      const sections = mockCtx.setState.mock.calls[0][0].player1.shipSections;

      expect(sections).toHaveProperty('tacticalBridge');
      expect(sections).toHaveProperty('powerCell');
      expect(sections).toHaveProperty('droneControlHub');
      expect(sections).not.toHaveProperty('bridge');
      expect(sections.tacticalBridge.hull).toBe(10);
      expect(sections.tacticalBridge.thresholds).toEqual({ damaged: 6, critical: 3 });
    });

    it('rebuilds shipSections with standard default components', () => {
      applyPlayerCommitment('deckSelection', 'player1', {
        deck: testDeck,
        drones: testDrones,
        shipComponents: {
          'BRIDGE_001': 'l',
          'POWERCELL_001': 'm',
          'DRONECONTROL_001': 'r'
        }
      }, mockCtx);

      const sections = mockCtx.setState.mock.calls[0][0].player1.shipSections;
      expect(sections).toHaveProperty('bridge');
      expect(sections).toHaveProperty('powerCell');
      expect(sections).toHaveProperty('droneControlHub');
    });
  });

  describe('subPhase=droneSelection', () => {
    const testDrones = [
      { name: 'Dart', maxDeploy: 2 },
      { name: 'Talon', maxDeploy: 1 }
    ];

    it('applies activeDronePool, deployedDroneCounts, droneAvailability to specified player only', () => {
      applyPlayerCommitment('droneSelection', 'player1', {
        drones: testDrones
      }, mockCtx);

      const setStateCall = mockCtx.setState.mock.calls[0][0];

      expect(setStateCall.player1.activeDronePool).toEqual(testDrones);
      expect(setStateCall.player1.deployedDroneCounts).toEqual({ Dart: 0, Talon: 0 });
      expect(setStateCall.player1.droneAvailability).toBeDefined();

      // Player 2 should be unchanged
      expect(setStateCall.player2).toBeUndefined();
    });

    it('applies to player2 without affecting player1', () => {
      applyPlayerCommitment('droneSelection', 'player2', {
        drones: testDrones
      }, mockCtx);

      const setStateCall = mockCtx.setState.mock.calls[0][0];

      expect(setStateCall.player2.activeDronePool).toEqual(testDrones);
      expect(setStateCall.player1).toBeUndefined();
    });
  });

  describe('placement auto-derived from deckSelection', () => {
    it('stores placedSections for player1 derived from shipComponents lanes', () => {
      applyPlayerCommitment('deckSelection', 'player1', {
        deck: [],
        drones: [],
        shipComponents: {
          'BRIDGE_001': 'l',
          'POWERCELL_001': 'm',
          'DRONECONTROL_001': 'r'
        }
      }, mockCtx);

      const setStateCall = mockCtx.setState.mock.calls[0][0];
      expect(setStateCall.placedSections).toEqual(['bridge', 'powerCell', 'droneControlHub']);
      expect(setStateCall.opponentPlacedSections).toBeUndefined();
    });

    it('stores opponentPlacedSections for player2 derived from shipComponents lanes', () => {
      applyPlayerCommitment('deckSelection', 'player2', {
        deck: [],
        drones: [],
        shipComponents: {
          'BRIDGE_001': 'l',
          'POWERCELL_001': 'm',
          'DRONECONTROL_001': 'r'
        }
      }, mockCtx);

      const setStateCall = mockCtx.setState.mock.calls[0][0];
      expect(setStateCall.opponentPlacedSections).toEqual(['bridge', 'powerCell', 'droneControlHub']);
      expect(setStateCall.placedSections).toBeUndefined();
    });
  });
});

describe('processCommitment with preGameSetup', () => {
  let mockCtx;
  let gameState;

  beforeEach(() => {
    gameState = {
      turnPhase: 'preGameSetup',
      player1: {
        name: 'Player 1', deck: [], hand: [], deckDronePool: [],
        selectedShipComponents: {}, activeDronePool: [], deployedDroneCounts: {},
        droneAvailability: {}, appliedUpgrades: {}, shipSections: {}
      },
      player2: {
        name: 'Player 2', deck: [], hand: [], deckDronePool: [],
        selectedShipComponents: {}, activeDronePool: [], deployedDroneCounts: {},
        droneAvailability: {}, appliedUpgrades: {}, shipSections: {}
      },
      gameSeed: 12345,
      commitments: {},
      placedSections: null,
      opponentPlacedSections: null
    };

    mockCtx = {
      getState: vi.fn(() => gameState),
      setState: vi.fn((updates) => {
        // Simulate state merging
        if (updates.commitments) gameState.commitments = updates.commitments;
        if (updates.player1) gameState.player1 = { ...gameState.player1, ...updates.player1 };
        if (updates.player2) gameState.player2 = { ...gameState.player2, ...updates.player2 };
        if (updates.placedSections !== undefined) gameState.placedSections = updates.placedSections;
        if (updates.opponentPlacedSections !== undefined) gameState.opponentPlacedSections = updates.opponentPlacedSections;
        Object.keys(updates).forEach(k => {
          if (!['commitments', 'player1', 'player2'].includes(k)) gameState[k] = updates[k];
        });
      }),
      getPhaseManager: vi.fn(() => ({
        notifyPlayerAction: vi.fn()
      })),
      isPlayerAI: vi.fn(() => false)
    };
  });

  it('stores commitment under commitments.deckSelection.player1 for preGameSetup subPhase', async () => {
    const testDeck = [{ id: 'c1' }];
    const testDrones = [{ name: 'Dart', maxDeploy: 2 }];

    await processCommitment({
      playerId: 'player1',
      phase: 'preGameSetup',
      actionData: {
        subPhase: 'deckSelection',
        deck: testDeck,
        drones: testDrones,
        shipComponents: {}
      }
    }, mockCtx);

    // Should store under commitments.deckSelection.player1
    expect(gameState.commitments.deckSelection).toBeDefined();
    expect(gameState.commitments.deckSelection.player1.completed).toBe(true);
  });

  it('calls applyPlayerCommitment immediately after storing commitment', async () => {
    const testDeck = [{ id: 'c1' }];
    const testDrones = [{ name: 'Dart', maxDeploy: 2 }];

    await processCommitment({
      playerId: 'player1',
      phase: 'preGameSetup',
      actionData: {
        subPhase: 'deckSelection',
        deck: testDeck,
        drones: testDrones,
        shipComponents: {}
      }
    }, mockCtx);

    // Player state should have been applied immediately
    expect(gameState.player1.deck).toEqual(testDeck);
    expect(gameState.player1.deckDronePool).toEqual(testDrones);
  });
});

describe('isPreGameComplete', () => {
  it('returns false when no commitments exist', () => {
    expect(isPreGameComplete({})).toBe(false);
  });

  it('returns false when only deckSelection is complete', () => {
    const commitments = {
      deckSelection: {
        player1: { completed: true },
        player2: { completed: true }
      }
    };
    expect(isPreGameComplete(commitments)).toBe(false);
  });

  it('returns false when droneSelection is incomplete for one player', () => {
    const commitments = {
      deckSelection: {
        player1: { completed: true },
        player2: { completed: true }
      },
      droneSelection: {
        player1: { completed: true },
        player2: { completed: false }
      }
    };
    expect(isPreGameComplete(commitments)).toBe(false);
  });

  it('returns true when both players have completed deckSelection and droneSelection', () => {
    const commitments = {
      deckSelection: {
        player1: { completed: true },
        player2: { completed: true }
      },
      droneSelection: {
        player1: { completed: true },
        player2: { completed: true }
      }
    };
    expect(isPreGameComplete(commitments)).toBe(true);
  });
});

describe('handleAICommitment for preGameSetup', () => {
  let mockCtx;
  let processCommitmentCalls;

  beforeEach(() => {
    processCommitmentCalls = [];
    mockCtx = {
      getState: vi.fn(() => ({
        player1: { deck: [], deckDronePool: [], appliedUpgrades: {} },
        player2: { deck: [], deckDronePool: [], appliedUpgrades: {} },
        commitments: {},
        gameSeed: 12345
      })),
      setState: vi.fn(),
      processCommitment: vi.fn(async (payload) => {
        processCommitmentCalls.push(payload);
        return { success: true, data: { bothPlayersComplete: false } };
      }),
      getPhaseManager: vi.fn(() => ({ notifyPlayerAction: vi.fn() })),
      isPlayerAI: vi.fn(() => false)
    };
  });

  it('dispatches AI deckSelection commitment when subPhase is deckSelection', async () => {
    // Mock the AIPhaseProcessor import dynamically
    const { default: aiPhaseProcessor } = await import('../../../managers/AIPhaseProcessor.js');
    // AIPhaseProcessor is mocked as null, so we need to test the dispatch structure
    // This test verifies the switch case routes correctly
    await handleAICommitment('preGameSetup', {}, mockCtx, 'deckSelection');

    // Should have called processCommitment with preGameSetup phase and deckSelection subPhase
    expect(mockCtx.processCommitment).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 'player2',
        phase: 'preGameSetup',
        actionData: expect.objectContaining({
          subPhase: 'deckSelection'
        })
      })
    );
  });

  it('dispatches AI droneSelection commitment when subPhase is droneSelection', async () => {
    await handleAICommitment('preGameSetup', {}, mockCtx, 'droneSelection');

    expect(mockCtx.processCommitment).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 'player2',
        phase: 'preGameSetup',
        actionData: expect.objectContaining({
          subPhase: 'droneSelection'
        })
      })
    );
  });

});
