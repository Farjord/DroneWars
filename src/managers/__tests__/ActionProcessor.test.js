import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActionProcessor from '../ActionProcessor.js';

// Mock all heavy dependencies at module level
vi.mock('../../logic/gameLogic.js', () => ({
  gameEngine: {
    calculateTurnTransition: vi.fn(() => ({ type: 'normal' })),
    resolveCardPlay: vi.fn(() => ({ newPlayerStates: {}, animationEvents: [] })),
    payCardCosts: vi.fn((card, pid, states) => states),
    finishCardPlay: vi.fn((card, pid, states) => ({ newPlayerStates: states, shouldEndTurn: true })),
    applyOnMoveEffects: vi.fn((state) => ({ newState: state, animationEvents: [] })),
    updateAuras: vi.fn((playerState) => playerState.dronesOnBoard),
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
vi.mock('../../logic/effects/MovementEffectProcessor.js', () => ({ default: class {} }));
vi.mock('../../logic/effects/conditional/ConditionalEffectProcessor.js', () => ({ default: class {} }));
vi.mock('../../logic/EffectRouter.js', () => ({ default: class {} }));
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
vi.mock('../../services/GameDataService.js', () => ({ default: { getInstance: vi.fn(() => ({ getEffectiveStats: vi.fn(), getEffectiveShipStats: vi.fn() })) } }));
vi.mock('../PhaseManager.js', () => ({ default: {} }));
vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(),
  getTimestamp: vi.fn()
}));
vi.mock('../../data/shipSectionData.js', () => ({ shipComponentCollection: [] }));
vi.mock('../../utils/seededRandom.js', () => ({ default: {} }));
vi.mock('../../logic/availability/DroneAvailabilityManager.js', () => ({ initializeForCombat: vi.fn() }));
vi.mock('../../logic/utils/rallyBeaconHelper.js', () => ({ checkRallyBeaconGoAgain: vi.fn() }));
vi.mock('../../logic/effects/mines/MineTriggeredEffectProcessor.js', () => ({ processTrigger: vi.fn() }));

function createMockGameStateManager(overrides = {}) {
  const defaultState = {
    gameMode: 'local',
    currentPlayer: 'player1',
    turnPhase: 'action',
    turn: 1,
    roundNumber: 1,
    actionsTakenThisTurn: 0,
    winner: null,
    passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
    commitments: {},
    player1: { name: 'Player 1', dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, hand: [], energy: 5, shipSections: {} },
    player2: { name: 'Player 2', dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, hand: [], energy: 5, shipSections: {} },
    placedSections: [null, null, null],
    opponentPlacedSections: [null, null, null],
    ...overrides
  };

  return {
    getState: vi.fn(() => ({ ...defaultState })),
    get: vi.fn((key) => defaultState[key]),
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
    createCallbacks: vi.fn(() => ({ logCallback: vi.fn() })),
    _updateContext: null
  };
}

describe('ActionProcessor — Queue & Locking', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createMockGameStateManager();
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('processes queued actions serially — second action waits for first to complete', async () => {
    const executionOrder = [];
    let resolveFirst;
    const firstBlocking = new Promise(r => { resolveFirst = r; });

    // Mock processDraw to block on first call, resolve immediately on second
    const originalProcessDraw = ap.processDraw.bind(ap);
    let callCount = 0;
    ap.processDraw = vi.fn(async (payload) => {
      callCount++;
      if (callCount === 1) {
        executionOrder.push('first-start');
        await firstBlocking;
        executionOrder.push('first-end');
      } else {
        executionOrder.push('second');
      }
      return { success: true };
    });

    const p1 = ap.queueAction({ type: 'draw', payload: { player1: {}, player2: {} } });
    const p2 = ap.queueAction({ type: 'draw', payload: { player1: {}, player2: {} } });

    // Let event loop process
    await new Promise(r => setTimeout(r, 10));
    expect(executionOrder).toEqual(['first-start']);

    resolveFirst();
    await p1;
    await p2;

    expect(executionOrder).toEqual(['first-start', 'first-end', 'second']);
  });

  it('rejects duplicate action types while locked', async () => {
    // Manually set a lock
    ap.actionLocks.attack = true;

    await expect(
      ap.processAction({ type: 'attack', payload: {} })
    ).rejects.toThrow('Action attack is currently locked');
  });

  it('releases lock after action completes even on error', async () => {
    ap.processDraw = vi.fn(async () => { throw new Error('intentional'); });

    await expect(
      ap.queueAction({ type: 'draw', payload: {} })
    ).rejects.toThrow('intentional');

    expect(ap.actionLocks.draw).toBe(false);
  });
});

describe('ActionProcessor — Pass Validation', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createMockGameStateManager({
      passInfo: { firstPasser: 'player1', player1Passed: true, player2Passed: false }
    });
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('blocks player actions after that player has passed', async () => {
    await expect(
      ap.processAction({ type: 'attack', payload: { playerId: 'player1' } })
    ).rejects.toThrow('Cannot perform attack action: player1 has already passed');
  });

  it('allows actions from player who has NOT passed', async () => {
    // player2 has not passed, so their action should not be blocked by pass validation
    // It will reach the switch statement — we just verify it doesn't throw the pass error
    gsm.getState.mockReturnValue({
      ...gsm.getState(),
      currentPlayer: 'player2',
      passInfo: { firstPasser: 'player1', player1Passed: true, player2Passed: false }
    });

    // This will fail at the switch statement processing, but NOT at pass validation
    ap.processDraw = vi.fn(async () => ({ success: true }));
    const result = await ap.processAction({ type: 'draw', payload: { playerId: 'player2' } });
    expect(result.success).toBe(true);
  });
});

describe('ActionProcessor — Turn Validation', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createMockGameStateManager({
      turnPhase: 'action',
      currentPlayer: 'player1'
    });
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('rejects actions from wrong player in sequential phases', async () => {
    await expect(
      ap.processAction({ type: 'attack', payload: { playerId: 'player2' } })
    ).rejects.toThrow("Invalid action: player2 attempted attack but it's player1's turn");
  });

  it('allows network actions from non-current player (already validated by host)', async () => {
    ap.processDraw = vi.fn(async () => ({ success: true }));
    // Network actions skip turn validation
    const result = await ap.processAction({ type: 'draw', payload: { playerId: 'player2' }, isNetworkAction: true });
    expect(result.success).toBe(true);
  });
});

describe('ActionProcessor — Event Emission', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createMockGameStateManager();
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('emits action_completed for player action types with correct payload', async () => {
    const events = [];
    ap.subscribe((event) => events.push(event));

    ap.processDraw = vi.fn(async () => ({ success: true, message: 'Draw completed' }));
    // 'draw' is not in playerActionTypes list, so won't emit
    // Use a type that IS in the list
    ap.processPlayerPass = vi.fn(async () => ({ success: true, newPassInfo: {} }));

    await ap.queueAction({ type: 'playerPass', payload: { playerId: 'player1', playerName: 'P1', turnPhase: 'action', passInfo: {}, opponentPlayerId: 'player2' } });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('action_completed');
    expect(events[0].actionType).toBe('playerPass');
    expect(events[0].result.success).toBe(true);
  });

  it('does NOT emit action_completed for non-player action types', async () => {
    const events = [];
    ap.subscribe((event) => events.push(event));

    ap.processDraw = vi.fn(async () => ({ success: true }));
    await ap.queueAction({ type: 'draw', payload: { player1: {}, player2: {} } });

    // 'draw' is not in playerActionTypes, so no event should be emitted
    expect(events).toHaveLength(0);
  });
});

describe('ActionProcessor — Action Counter', () => {
  let ap;
  let gsm;
  let storedState;

  beforeEach(() => {
    ActionProcessor.reset();
    storedState = {
      gameMode: 'local',
      currentPlayer: 'player1',
      turnPhase: 'action',
      turn: 1,
      roundNumber: 1,
      actionsTakenThisTurn: 0,
      winner: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      commitments: {},
      player1: { name: 'Player 1', dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, hand: [], energy: 5, shipSections: {} },
      player2: { name: 'Player 2', dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, hand: [], energy: 5, shipSections: {} },
      placedSections: [null, null, null],
      opponentPlacedSections: [null, null, null]
    };
    gsm = {
      getState: vi.fn(() => ({ ...storedState })),
      get: vi.fn((key) => storedState[key]),
      setState: vi.fn((updates) => { Object.assign(storedState, updates); }),
      setPlayerStates: vi.fn(),
      updatePlayerState: vi.fn(),
      setTurnPhase: vi.fn(),
      setCurrentPlayer: vi.fn(),
      setPassInfo: vi.fn(),
      setWinner: vi.fn(),
      addLogEntry: vi.fn(),
      getLocalPlayerId: vi.fn(() => 'player1'),
      getLocalPlacedSections: vi.fn(() => [null, null, null]),
      createCallbacks: vi.fn(() => ({ logCallback: vi.fn() })),
      _updateContext: null
    };
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('increments actionsTakenThisTurn for qualifying action types', async () => {
    // Mock processDeployment to return success — deployment is a counting type
    ap.processDeployment = vi.fn(async () => ({ success: true, shouldEndTurn: true }));

    await ap.queueAction({ type: 'deployment', payload: { droneData: {}, laneId: 'lane1', playerId: 'player1' } });

    // setState should have been called with actionsTakenThisTurn: 1
    const setStateCalls = gsm.setState.mock.calls;
    const incrementCall = setStateCalls.find(call => call[0].actionsTakenThisTurn === 1);
    expect(incrementCall).toBeTruthy();
  });

  it('does NOT increment for non-qualifying action types', async () => {
    ap.processDraw = vi.fn(async () => ({ success: true }));

    await ap.queueAction({ type: 'draw', payload: { player1: {}, player2: {} } });

    // draw is not in actionCountingTypes, so actionsTakenThisTurn should not be set
    const setStateCalls = gsm.setState.mock.calls;
    const incrementCall = setStateCalls.find(call => call[0].actionsTakenThisTurn !== undefined);
    expect(incrementCall).toBeFalsy();
  });
});

describe('ActionProcessor — processForceWin (DEV)', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createMockGameStateManager({
      player2: {
        name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5,
        shipSections: {
          bridge: { hull: 10, maxHull: 10 },
          powerCell: { hull: 10, maxHull: 10 },
          droneControlHub: { hull: 10, maxHull: 10 }
        }
      }
    });
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('damages all opponent ship sections to hull 0', () => {
    ap.processForceWin();

    const updateCall = gsm.updatePlayerState.mock.calls.find(call => call[0] === 'player2');
    expect(updateCall).toBeDefined();
    expect(updateCall[1].shipSections.bridge.hull).toBe(0);
    expect(updateCall[1].shipSections.powerCell.hull).toBe(0);
    expect(updateCall[1].shipSections.droneControlHub.hull).toBe(0);
  });

  it('calls checkWinCondition after damaging sections', () => {
    const checkWinSpy = vi.spyOn(ap, 'checkWinCondition');

    ap.processForceWin();

    expect(checkWinSpy).toHaveBeenCalled();
  });

  it('adds log entry for dev action', () => {
    ap.processForceWin();

    expect(gsm.addLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'DEV_ACTION',
        source: 'Force Win'
      }),
      'forceWin'
    );
  });
});

describe('ActionProcessor — clearQueue Full Cleanup', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    gsm = createMockGameStateManager();
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('clears listeners array', () => {
    ap.listeners = [() => {}, () => {}, () => {}];
    ap.clearQueue();
    expect(ap.listeners).toEqual([]);
  });

  it('clears pending animation arrays', () => {
    ap.pendingActionAnimations = [{ type: 'move' }, { type: 'attack' }];
    ap.pendingSystemAnimations = [{ type: 'system1' }];
    ap.clearQueue();
    expect(ap.pendingActionAnimations).toEqual([]);
    expect(ap.pendingSystemAnimations).toEqual([]);
  });

  it('clears pending state fields', () => {
    ap.pendingStateUpdate = { player1: {}, player2: {} };
    ap.pendingFinalState = { player1: {}, player2: {} };
    ap.clearQueue();
    expect(ap.pendingStateUpdate).toBeNull();
    expect(ap.pendingFinalState).toBeNull();
  });

  it('clears action queue and locks', () => {
    ap.actionQueue = [
      { type: 'action1', resolve: vi.fn(), reject: vi.fn() },
      { type: 'action2', resolve: vi.fn(), reject: vi.fn() }
    ];
    ap.actionLocks.action = true;
    ap.isProcessing = true;
    ap.clearQueue();

    expect(ap.actionQueue).toEqual([]);
    expect(ap.actionLocks.action).toBe(false);
    expect(ap.isProcessing).toBe(false);
  });

  it('rejects pending actions when clearing', () => {
    const reject1 = vi.fn();
    const reject2 = vi.fn();
    ap.actionQueue = [
      { type: 'action1', resolve: vi.fn(), reject: reject1 },
      { type: 'action2', resolve: vi.fn(), reject: reject2 }
    ];
    ap.clearQueue();

    expect(reject1).toHaveBeenCalledWith(expect.any(Error));
    expect(reject2).toHaveBeenCalledWith(expect.any(Error));
  });
});
