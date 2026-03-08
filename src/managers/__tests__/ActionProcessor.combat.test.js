import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActionProcessor from '../ActionProcessor.js';

vi.mock('../../logic/gameLogic.js', () => ({
  gameEngine: {
    calculateTurnTransition: vi.fn(() => ({ type: 'normal' })),
    updateAuras: vi.fn((ps) => ps.dronesOnBoard)
  }
}));
vi.mock('../../logic/cards/CardPlayManager.js', () => ({ default: {} }));
vi.mock('../../logic/combat/AttackProcessor.js', () => ({
  resolveAttack: vi.fn(() => ({
    newPlayerStates: { player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }, player2: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } } },
    animationEvents: [],
    shouldEndTurn: true,
    mineAnimationEventCount: 0
  }))
}));
vi.mock('../../data/droneData.js', () => ({ default: [
  { name: 'TestDrone', abilities: [{ name: 'Rapid Response', type: 'TRIGGERED', trigger: 'ON_MOVE', usesPerRound: 1, keywordIcon: 'RAPID', effects: [{ type: 'DOES_NOT_EXHAUST' }] }] },
  { name: 'InertDrone', abilities: [] },
  { name: 'AbilityDrone', abilities: [{ name: 'TestAbility', activationLimit: 1, effect: { type: 'DAMAGE' } }] }
] }));
vi.mock('../../logic/statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({
    attack: 2, speed: 3, hull: 2, maxShields: 0,
    keywords: new Set(drone?.name === 'InertDrone' ? ['INERT'] : [])
  }))
}));
vi.mock('../../logic/combat/LaneControlCalculator.js', () => ({
  LaneControlCalculator: { calculateLaneControl: vi.fn(() => ({ lane1: null, lane2: null, lane3: null })) }
}));
vi.mock('../../logic/combat/InterceptionProcessor.js', () => ({
  calculatePotentialInterceptors: vi.fn(),
  calculateAiInterception: vi.fn(() => ({ hasInterceptors: false }))
}));
vi.mock('../../logic/effects/MovementEffectProcessor.js', () => ({ default: class {} }));
vi.mock('../../logic/effects/conditional/ConditionalEffectProcessor.js', () => ({ default: class {} }));
vi.mock('../../logic/EffectRouter.js', () => ({ default: class {} }));
vi.mock('../../logic/deployment/DeploymentProcessor.js', () => ({ default: class {} }));
vi.mock('../../logic/round/RoundManager.js', () => ({ default: {} }));
vi.mock('../../logic/shields/ShieldManager.js', () => ({ default: {} }));
vi.mock('../../logic/game/WinConditionChecker.js', () => ({ default: { checkGameStateForWinner: vi.fn() } }));
vi.mock('../../logic/abilities/AbilityResolver.js', () => ({
  default: {
    resolveAbility: vi.fn(() => ({
      newPlayerStates: { player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }, player2: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } } },
      animationEvents: [],
      shouldEndTurn: true
    }))
  }
}));
vi.mock('../../logic/abilities/ship/RecallAbilityProcessor.js', () => ({ default: {} }));
vi.mock('../../logic/abilities/ship/TargetLockAbilityProcessor.js', () => ({ default: {} }));
vi.mock('../../logic/abilities/ship/RecalculateAbilityProcessor.js', () => ({ default: {} }));
vi.mock('../../logic/abilities/ship/ReallocateShieldsAbilityProcessor.js', () => ({ default: {} }));
vi.mock('../AIPhaseProcessor.js', () => ({ default: null }));
vi.mock('../../services/GameDataService.js', () => ({
  default: { getInstance: vi.fn(() => ({ getEffectiveStats: vi.fn(), getEffectiveShipStats: vi.fn() })) }
}));
vi.mock('../PhaseManager.js', () => ({ default: {} }));
vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(), timingLog: vi.fn(), getTimestamp: vi.fn()
}));
vi.mock('../../data/shipSectionData.js', () => ({ shipComponentCollection: [] }));
vi.mock('../../utils/seededRandom.js', () => ({ default: {} }));
vi.mock('../../logic/availability/DroneAvailabilityManager.js', () => ({ initializeForCombat: vi.fn() }));

vi.mock('../../logic/triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = vi.fn().mockImplementation((triggerType, context) => {
        // Simulate DOES_NOT_EXHAUST for RAPID drones on ON_MOVE
        if (triggerType === 'ON_MOVE' && context.triggeringDrone) {
          const drone = context.triggeringDrone;
          // Check if the drone has a RAPID-style trigger (triggerUsesMap tracks usage)
          const uses = drone.triggerUsesMap?.['Rapid Response'] || 0;
          if (drone.name === 'TestDrone' && uses < 1) {
            // Return doesNotExhaust + increment triggerUsesMap
            const ps = context.playerStates;
            const pid = context.triggeringPlayerId;
            const newStates = JSON.parse(JSON.stringify(ps));
            // Find and update the drone's triggerUsesMap
            for (const lane of ['lane1', 'lane2', 'lane3']) {
              const idx = newStates[pid]?.dronesOnBoard?.[lane]?.findIndex(d => d.id === drone.id);
              if (idx !== undefined && idx !== -1) {
                newStates[pid].dronesOnBoard[lane][idx].triggerUsesMap = {
                  ...(newStates[pid].dronesOnBoard[lane][idx].triggerUsesMap || {}),
                  'Rapid Response': uses + 1
                };
                break;
              }
            }
            return { triggered: true, newPlayerStates: newStates, animationEvents: [], doesNotExhaust: true };
          }
        }
        return { triggered: false, newPlayerStates: null, animationEvents: [], doesNotExhaust: false };
      });
    }
  }
}));
vi.mock('../../logic/triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_MOVE: 'ON_MOVE', ON_LANE_MOVEMENT_IN: 'ON_LANE_MOVEMENT_IN', ON_LANE_ATTACK: 'ON_LANE_ATTACK' }
}));

function createMockGSM(overrides = {}) {
  const state = {
    gameMode: 'local',
    currentPlayer: 'player1',
    turnPhase: 'action',
    turn: 1,
    roundNumber: 1,
    actionsTakenThisTurn: 0,
    winner: null,
    passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
    commitments: {},
    player1: {
      name: 'Player 1',
      dronesOnBoard: {
        lane1: [{ id: 'd1', name: 'TestDrone', attack: 2, hull: 2, isExhausted: false, abilities: [], triggerUsesMap: {} }],
        lane2: [{ id: 'd2', name: 'InertDrone', attack: 2, hull: 2, isExhausted: false, abilities: [] }],
        lane3: []
      },
      hand: [], energy: 5, shipSections: {}
    },
    player2: {
      name: 'Player 2',
      dronesOnBoard: {
        lane1: [{ id: 'e1', name: 'EnemyDrone', attack: 2, hull: 2, isExhausted: false, abilities: [] }],
        lane2: [],
        lane3: []
      },
      hand: [], energy: 5, shipSections: {}
    },
    placedSections: [null, null, null],
    opponentPlacedSections: [null, null, null],
    ...overrides
  };
  return {
    getState: vi.fn(() => JSON.parse(JSON.stringify(state))),
    get: vi.fn((key) => state[key]),
    setState: vi.fn(),
    setPlayerStates: vi.fn(),
    updatePlayerState: vi.fn(),
    setTurnPhase: vi.fn(),
    setCurrentPlayer: vi.fn(),
    setPassInfo: vi.fn(),
    setWinner: vi.fn(),
    addLogEntry: vi.fn(),
    getLocalPlayerId: vi.fn(() => 'player1'),
    getLocalPlacedSections: vi.fn(() => [null, null, null]),
    _updateContext: null
  };
}

describe('ActionProcessor — processAttack go-again', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createMockGSM();
    ap = ActionProcessor.getInstance(gsm);
    // Mock AnimationManager with executeWithStateUpdate
    ap.setAnimationManager({
      animations: {},
      executeAnimations: vi.fn(),
      executeWithStateUpdate: vi.fn(async (animations, context) => {
        // Simulate what AnimationManager does: apply pending state
        if (context.pendingStateUpdate) {
          context.applyPendingStateUpdate();
        }
      }),
      waitForReactRender: vi.fn()
    });
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('returns shouldEndTurn=false for go-again attacks and fires GO_AGAIN_NOTIFICATION', async () => {
    const { resolveAttack } = await import('../../logic/combat/AttackProcessor.js');
    resolveAttack.mockReturnValueOnce({
      newPlayerStates: { player1: gsm.getState().player1, player2: gsm.getState().player2 },
      animationEvents: [],
      shouldEndTurn: false, // go-again
      mineAnimationEventCount: 0
    });

    const result = await ap.processAttack({
      attackDetails: {
        attacker: { id: 'd1', name: 'TestDrone' },
        target: { id: 'e1', name: 'EnemyDrone' },
        lane: 'lane1',
        attackingPlayer: 'player1'
      }
    });

    expect(result.shouldEndTurn).toBe(false);
    // GO_AGAIN_NOTIFICATION should have been collected for client delivery
    const collected = ap._actionAnimationLog.actionAnimations;
    expect(collected.some(a => a.animationName === 'GO_AGAIN_NOTIFICATION')).toBe(true);
  });
});

describe('ActionProcessor — processMove keywords', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createMockGSM();
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager({
      animations: {},
      executeAnimations: vi.fn(),
      executeWithStateUpdate: vi.fn(),
      waitForReactRender: vi.fn()
    });
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('blocks movement for drones with INERT keyword', async () => {
    const result = await ap.processMove({
      droneId: 'd2',
      fromLane: 'lane2',
      toLane: 'lane3',
      playerId: 'player1'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot move');
    expect(result.error).toContain('Inert');
  });

  it('consumes snare on move attempt — sets isExhausted and returns snaredConsumed', async () => {
    // Override state to have a snared drone
    const stateWithSnare = gsm.getState();
    stateWithSnare.player1.dronesOnBoard.lane1[0].isSnared = true;
    gsm.getState.mockReturnValue(stateWithSnare);

    const { calculateEffectiveStats } = await import('../../logic/statsCalculator.js');
    calculateEffectiveStats.mockReturnValue({
      attack: 2, speed: 3, hull: 2, maxShields: 0, keywords: new Set()
    });

    const result = await ap.processMove({
      droneId: 'd1',
      fromLane: 'lane1',
      toLane: 'lane3',
      playerId: 'player1'
    });

    expect(result.success).toBe(true);
    expect(result.snaredConsumed).toBe(true);
    expect(result.shouldEndTurn).toBe(true);
    expect(gsm.updatePlayerState).toHaveBeenCalled();
  });
});

describe('ActionProcessor — processAbility activation limit', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    const state = {
      gameMode: 'local',
      currentPlayer: 'player1',
      turnPhase: 'action',
      turn: 1, roundNumber: 1, actionsTakenThisTurn: 0,
      winner: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      commitments: {},
      player1: {
        name: 'Player 1',
        dronesOnBoard: {
          lane1: [{
            id: 'd1', name: 'AbilityDrone', attack: 2, hull: 2, isExhausted: false,
            abilities: [{ name: 'TestAbility', activationLimit: 1, effect: { type: 'DAMAGE' } }],
            abilityActivations: { 0: 1 } // Already used once
          }],
          lane2: [], lane3: []
        },
        hand: [], energy: 5, shipSections: {}
      },
      player2: {
        name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {}
      },
      placedSections: [null, null, null],
      opponentPlacedSections: [null, null, null]
    };
    gsm = {
      getState: vi.fn(() => JSON.parse(JSON.stringify(state))),
      get: vi.fn((key) => state[key]),
      setState: vi.fn(), setPlayerStates: vi.fn(), updatePlayerState: vi.fn(),
      setTurnPhase: vi.fn(), setCurrentPlayer: vi.fn(), setPassInfo: vi.fn(),
      setWinner: vi.fn(), addLogEntry: vi.fn(),
      getLocalPlayerId: vi.fn(() => 'player1'),
      getLocalPlacedSections: vi.fn(() => [null, null, null]),
      _updateContext: null
    };
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager({
      animations: {},
      executeAnimations: vi.fn(),
      executeWithStateUpdate: vi.fn(),
      waitForReactRender: vi.fn()
    });
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('throws when ability activation limit is reached', async () => {
    await expect(
      ap.processAbility({ droneId: 'd1', abilityIndex: 0, targetId: null })
    ).rejects.toThrow('activation limit');
  });
});

describe('ActionProcessor — processMove RAPID keyword', () => {
  let ap;
  let gsm;

  // RAPID is now handled via TriggerProcessor (DOES_NOT_EXHAUST effect on ON_MOVE)
  const createRapidDrone = (overrides = {}) => ({
    id: 'rapid_1',
    name: 'TestDrone',
    attack: 2, hull: 2, shields: 1, speed: 5,
    isExhausted: false,
    triggerUsesMap: {},
    abilities: [{
      name: 'Rapid Response',
      type: 'TRIGGERED',
      trigger: 'ON_MOVE',
      usesPerRound: 1,
      keywordIcon: 'RAPID',
      effects: [{ type: 'DOES_NOT_EXHAUST' }]
    }],
    ...overrides
  });

  const createNonRapidDrone = (overrides = {}) => ({
    id: 'std_1',
    name: 'NormalDrone',
    attack: 1, hull: 1, shields: 1, speed: 6,
    isExhausted: false,
    triggerUsesMap: {},
    abilities: [],
    ...overrides
  });

  const mockAnimManager = {
    animations: {},
    executeAnimations: vi.fn(),
    executeWithStateUpdate: vi.fn(),
    waitForReactRender: vi.fn()
  };

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('does NOT exhaust drone on first move (Rapid Response trigger)', async () => {
    ActionProcessor.reset();
    gsm = createMockGSM({
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [createRapidDrone()], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {}
      }
    });
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(mockAnimManager);

    await ap.processMove({ droneId: 'rapid_1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' });

    const updateCall = gsm.updatePlayerState.mock.calls[0];
    expect(updateCall).toBeDefined();
    const movedDrone = updateCall[1].dronesOnBoard.lane2.find(d => d.id === 'rapid_1');
    expect(movedDrone.isExhausted).toBe(false);
  });

  it('increments triggerUsesMap for Rapid Response after first move', async () => {
    ActionProcessor.reset();
    gsm = createMockGSM({
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [createRapidDrone()], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {}
      }
    });
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(mockAnimManager);

    await ap.processMove({ droneId: 'rapid_1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' });

    const updateCall = gsm.updatePlayerState.mock.calls[0];
    const movedDrone = updateCall[1].dronesOnBoard.lane2.find(d => d.id === 'rapid_1');
    expect(movedDrone.triggerUsesMap['Rapid Response']).toBe(1);
  });

  it('exhausts drone on second move when triggerUsesMap shows Rapid Response used', async () => {
    ActionProcessor.reset();
    gsm = createMockGSM({
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [createRapidDrone({ triggerUsesMap: { 'Rapid Response': 1 } })], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {}
      }
    });
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(mockAnimManager);

    await ap.processMove({ droneId: 'rapid_1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' });

    const updateCall = gsm.updatePlayerState.mock.calls[0];
    const movedDrone = updateCall[1].dronesOnBoard.lane2.find(d => d.id === 'rapid_1');
    expect(movedDrone.isExhausted).toBe(true);
  });

  it('exhausts drone without RAPID keyword normally on move', async () => {
    ActionProcessor.reset();
    gsm = createMockGSM({
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [createNonRapidDrone()], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {}
      }
    });
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(mockAnimManager);

    await ap.processMove({ droneId: 'std_1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' });

    const updateCall = gsm.updatePlayerState.mock.calls[0];
    const movedDrone = updateCall[1].dronesOnBoard.lane2.find(d => d.id === 'std_1');
    expect(movedDrone.isExhausted).toBe(true);
  });
});
