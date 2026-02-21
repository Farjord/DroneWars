import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActionProcessor from '../ActionProcessor.js';

vi.mock('../../logic/gameLogic.js', () => ({
  gameEngine: {
    resolveCardPlay: vi.fn(),
    payCardCosts: vi.fn((card, pid, states) => states),
    finishCardPlay: vi.fn((card, pid, states) => ({
      newPlayerStates: states,
      shouldEndTurn: true
    })),
    applyOnMoveEffects: vi.fn((state) => ({ newState: state, animationEvents: [] })),
    updateAuras: vi.fn((ps) => ps.dronesOnBoard),
    calculateTurnTransition: vi.fn(() => ({ type: 'normal' })),
    getLaneOfDrone: vi.fn(),
    onDroneDestroyed: vi.fn(() => ({})),
    getEffectiveSectionMaxShields: vi.fn(() => 3)
  }
}));
vi.mock('../../logic/cards/CardPlayManager.js', () => ({ default: {} }));
vi.mock('../../logic/combat/AttackProcessor.js', () => ({ resolveAttack: vi.fn() }));
vi.mock('../../data/droneData.js', () => ({ default: [] }));
vi.mock('../../logic/statsCalculator.js', () => ({ calculateEffectiveStats: vi.fn() }));
vi.mock('../../logic/combat/LaneControlCalculator.js', () => ({ LaneControlCalculator: { calculateLaneControl: vi.fn() } }));
vi.mock('../../logic/combat/InterceptionProcessor.js', () => ({
  calculatePotentialInterceptors: vi.fn(),
  calculateAiInterception: vi.fn(() => ({ hasInterceptors: false }))
}));
vi.mock('../../logic/effects/movement/MovementEffectProcessor.js', () => ({
  default: class {
    executeSingleMove() {
      return { newPlayerStates: { player1: {}, player2: {} }, shouldEndTurn: true, effectResult: {} };
    }
    executeMultiMove() {
      return { newPlayerStates: { player1: {}, player2: {} }, shouldEndTurn: true, effectResult: {} };
    }
  }
}));
vi.mock('../../logic/effects/conditional/ConditionalEffectProcessor.js', () => ({ default: class {} }));
vi.mock('../../logic/EffectRouter.js', () => ({ default: class { routeEffect() { return null; } } }));
vi.mock('../../logic/deployment/DeploymentProcessor.js', () => ({ default: class {} }));
vi.mock('../../logic/round/RoundManager.js', () => ({ default: {} }));
vi.mock('../../logic/shields/ShieldManager.js', () => ({ default: {} }));
vi.mock('../../logic/game/WinConditionChecker.js', () => ({ default: { checkGameStateForWinner: vi.fn() } }));
vi.mock('../../logic/abilities/AbilityResolver.js', () => ({ default: {} }));
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
vi.mock('../../logic/utils/rallyBeaconHelper.js', () => ({ checkRallyBeaconGoAgain: vi.fn(() => false) }));
vi.mock('../../logic/effects/mines/MineTriggeredEffectProcessor.js', () => ({
  processTrigger: vi.fn(() => ({ triggered: false, animationEvents: [] }))
}));

function createState(overrides = {}) {
  return {
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
        lane1: [{ id: 'd1', name: 'FriendlyDrone', attack: 2, hull: 3 }],
        lane2: [],
        lane3: []
      },
      hand: [{ id: 'c1', instanceId: 'c1-inst', name: 'TestCard', cost: { energy: 1 } }],
      energy: 5,
      shipSections: { bridge: { hull: 3, allocatedShields: 1 } },
      activeDronePool: [{ name: 'PoolDrone', id: 'pd1' }],
      discardPile: [], deck: []
    },
    player2: {
      name: 'Player 2',
      dronesOnBoard: {
        lane1: [{ id: 'e1', name: 'EnemyDrone', attack: 2, hull: 2 }],
        lane2: [],
        lane3: []
      },
      hand: [], energy: 5,
      shipSections: { bridge: { hull: 3, allocatedShields: 0 } },
      activeDronePool: [],
      discardPile: [], deck: []
    },
    placedSections: [null, null, null],
    opponentPlacedSections: [null, null, null],
    ...overrides
  };
}

function createGSM(state) {
  return {
    getState: vi.fn(() => JSON.parse(JSON.stringify(state))),
    get: vi.fn((key) => state[key]),
    setState: vi.fn(), setPlayerStates: vi.fn(), updatePlayerState: vi.fn(),
    setTurnPhase: vi.fn(), setCurrentPlayer: vi.fn(), setPassInfo: vi.fn(),
    setWinner: vi.fn(), addLogEntry: vi.fn(),
    getLocalPlayerId: vi.fn(() => 'player1'),
    getLocalPlacedSections: vi.fn(() => [null, null, null]),
    createCallbacks: vi.fn(() => ({ logCallback: vi.fn() })),
    _updateContext: null
  };
}

describe('ActionProcessor — processCardPlay target resolution', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createGSM(createState());
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager({
      animations: {},
      executeAnimations: vi.fn(),
      executeWithStateUpdate: vi.fn(async (animations, context) => {
        if (context.pendingStateUpdate) context.applyPendingStateUpdate();
      }),
      waitForReactRender: vi.fn()
    });
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('resolves drone targets, ship section targets, pool drone targets, and lane targets', async () => {
    const { gameEngine } = await import('../../logic/gameLogic.js');
    let capturedTarget;
    gameEngine.resolveCardPlay.mockImplementation((card, target, playerId, playerStates, placedSections, callbacks) => {
      capturedTarget = target;
      return {
        newPlayerStates: playerStates,
        animationEvents: [],
        shouldEndTurn: true
      };
    });

    const card = { id: 'c1', instanceId: 'c1-inst', name: 'TestCard', cost: { energy: 1 } };

    // Test 1: Drone target resolution
    await ap.processCardPlay({ card, targetId: 'e1', playerId: 'player1' });
    expect(capturedTarget).toBeTruthy();
    expect(capturedTarget.id).toBe('e1');
    expect(capturedTarget.owner).toBe('player2');

    // Test 2: Ship section target resolution
    await ap.processCardPlay({ card, targetId: 'bridge', playerId: 'player1' });
    expect(capturedTarget).toBeTruthy();
    expect(capturedTarget.name).toBe('bridge');

    // Test 3: Pool drone target
    await ap.processCardPlay({ card, targetId: 'PoolDrone', playerId: 'player1' });
    expect(capturedTarget).toBeTruthy();
    expect(capturedTarget.name).toBe('PoolDrone');
    expect(capturedTarget.owner).toBe('player1');

    // Test 4: Lane target
    await ap.processCardPlay({ card, targetId: 'lane2', playerId: 'player1' });
    expect(capturedTarget).toBeTruthy();
    expect(capturedTarget.id).toBe('lane2');
  });
});

describe('ActionProcessor — processMovementCompletion', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createGSM(createState());
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

  it('pays card costs, calls finishCardPlay, and returns shouldEndTurn', async () => {
    const { gameEngine } = await import('../../logic/gameLogic.js');
    const state = createState();

    gameEngine.payCardCosts.mockReturnValue({
      player1: state.player1,
      player2: state.player2
    });

    gameEngine.finishCardPlay.mockReturnValue({
      newPlayerStates: { player1: state.player1, player2: state.player2 },
      shouldEndTurn: true
    });

    const card = { id: 'c1', instanceId: 'c1-inst', name: 'MoveCard', cost: { energy: 1 }, effect: { type: 'SINGLE_MOVE' } };
    const drone = { id: 'd1', name: 'FriendlyDrone' };

    const result = await ap.processMovementCompletion({
      card,
      movementType: 'single_move',
      drones: [drone],
      fromLane: 'lane1',
      toLane: 'lane2',
      playerId: 'player1'
    });

    expect(result.success).toBe(true);
    expect(result.shouldEndTurn).toBe(true);
    expect(gameEngine.payCardCosts).toHaveBeenCalledWith(card, 'player1', expect.any(Object));
    expect(gameEngine.finishCardPlay).toHaveBeenCalled();
    expect(gsm.setPlayerStates).toHaveBeenCalled();
  });
});
