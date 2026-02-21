import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActionProcessor from '../ActionProcessor.js';

vi.mock('../../logic/gameLogic.js', () => ({
  gameEngine: {
    calculateTurnTransition: vi.fn(() => ({ type: 'normal' }))
  }
}));
vi.mock('../../logic/cards/CardPlayManager.js', () => ({ default: {} }));
vi.mock('../../logic/combat/AttackProcessor.js', () => ({ resolveAttack: vi.fn() }));
vi.mock('../../data/droneData.js', () => ({ default: [] }));
vi.mock('../../logic/statsCalculator.js', () => ({ calculateEffectiveStats: vi.fn() }));
vi.mock('../../logic/combat/LaneControlCalculator.js', () => ({ LaneControlCalculator: {} }));
vi.mock('../../logic/combat/InterceptionProcessor.js', () => ({
  calculatePotentialInterceptors: vi.fn(),
  calculateAiInterception: vi.fn()
}));
vi.mock('../../logic/effects/movement/MovementEffectProcessor.js', () => ({ default: class {} }));
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
vi.mock('../../services/GameDataService.js', () => ({
  default: { getInstance: vi.fn(() => ({ getEffectiveStats: vi.fn(), getEffectiveShipStats: vi.fn() })) }
}));
vi.mock('../PhaseManager.js', () => ({ default: {} }));
vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(), timingLog: vi.fn(), getTimestamp: vi.fn()
}));
vi.mock('../../data/shipSectionData.js', () => ({ shipComponentCollection: [] }));
vi.mock('../../utils/seededRandom.js', () => ({ default: {} }));
vi.mock('../../logic/availability/DroneAvailabilityManager.js', () => ({
  initializeForCombat: vi.fn((drones) => {
    const availability = {};
    (drones || []).forEach(d => { availability[d.name] = { available: true, cooldownRemaining: 0 }; });
    return availability;
  })
}));
vi.mock('../../logic/utils/rallyBeaconHelper.js', () => ({ checkRallyBeaconGoAgain: vi.fn() }));
vi.mock('../../logic/effects/mines/MineTriggeredEffectProcessor.js', () => ({ processTrigger: vi.fn() }));

describe('ActionProcessor — processCommitment', () => {
  let ap;
  let storedState;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    storedState = {
      gameMode: 'local',
      currentPlayer: 'player1',
      turnPhase: 'droneSelection',
      turn: 1, roundNumber: 1, actionsTakenThisTurn: 0,
      winner: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      commitments: {},
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {},
        shieldsToAllocate: 0
      },
      player2: {
        name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {},
        shieldsToAllocate: 0
      },
      placedSections: [null, null, null],
      opponentPlacedSections: [null, null, null],
      shieldsToAllocate: 0,
      opponentShieldsToAllocate: 0
    };
    gsm = {
      getState: vi.fn(() => storedState),
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
      _updateContext: null
    };
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('stores commitment and returns bothPlayersComplete=false when only one player commits', async () => {
    const result = await ap.processCommitment({
      playerId: 'player1',
      phase: 'droneSelection',
      actionData: { drones: [{ name: 'Drone1' }] }
    });

    expect(result.success).toBe(true);
    expect(result.data.bothPlayersComplete).toBe(false);
    expect(result.data.playerId).toBe('player1');
    expect(result.data.phase).toBe('droneSelection');
    // Commitment should be stored in state
    expect(storedState.commitments.droneSelection.player1.completed).toBe(true);
  });

  it('returns bothPlayersComplete=true when both players commit', async () => {
    // Player 1 commits
    await ap.processCommitment({
      playerId: 'player1',
      phase: 'placement',
      actionData: { placedSections: ['bridge', 'powerCell', 'droneControlHub'] }
    });

    // Manually set player2 commitment (simulating non-local mode)
    storedState.commitments.placement.player2 = { completed: true, placedSections: ['bridge', 'powerCell', 'droneControlHub'] };
    storedState.gameMode = 'host'; // Prevent AI auto-commit path

    // Player 2 commits
    const result = await ap.processCommitment({
      playerId: 'player2',
      phase: 'placement',
      actionData: { placedSections: ['bridge', 'powerCell', 'droneControlHub'] }
    });

    expect(result.success).toBe(true);
    expect(result.data.bothPlayersComplete).toBe(true);
  });
});

describe('ActionProcessor — applyPhaseCommitments', () => {
  let ap;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    const state = {
      gameMode: 'local',
      currentPlayer: 'player1',
      turnPhase: 'droneSelection',
      turn: 1, roundNumber: 1, actionsTakenThisTurn: 0,
      winner: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      commitments: {
        droneSelection: {
          player1: { completed: true, drones: [{ name: 'Alpha' }, { name: 'Beta' }] },
          player2: { completed: true, drones: [{ name: 'Gamma' }] }
        },
        placement: {
          player1: { completed: true, placedSections: ['bridge', 'powerCell', 'droneControlHub'] },
          player2: { completed: true, placedSections: ['droneControlHub', 'bridge', 'powerCell'] }
        }
      },
      player1: {
        name: 'Player 1', appliedUpgrades: {},
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {}
      },
      player2: {
        name: 'Player 2', appliedUpgrades: {},
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5, shipSections: {}
      },
      placedSections: [null, null, null],
      opponentPlacedSections: [null, null, null]
    };
    gsm = {
      getState: vi.fn(() => state),
      get: vi.fn((key) => state[key]),
      setState: vi.fn(), setPlayerStates: vi.fn(), updatePlayerState: vi.fn(),
      setTurnPhase: vi.fn(), setCurrentPlayer: vi.fn(), setPassInfo: vi.fn(),
      setWinner: vi.fn(), addLogEntry: vi.fn(),
      getLocalPlayerId: vi.fn(() => 'player1'),
      getLocalPlacedSections: vi.fn(() => [null, null, null]),
      _updateContext: null
    };
    ap = ActionProcessor.getInstance(gsm);
    ap.setAnimationManager(null);
  });

  afterEach(() => {
    ActionProcessor.reset();
    vi.clearAllMocks();
  });

  it('transfers droneSelection commitments to activeDronePool with availability', () => {
    const updates = ap.applyPhaseCommitments('droneSelection');

    expect(updates.player1.activeDronePool).toEqual([{ name: 'Alpha' }, { name: 'Beta' }]);
    expect(updates.player2.activeDronePool).toEqual([{ name: 'Gamma' }]);
    // deployedDroneCounts initialized to 0 for each drone
    expect(updates.player1.deployedDroneCounts).toEqual({ Alpha: 0, Beta: 0 });
    expect(updates.player2.deployedDroneCounts).toEqual({ Gamma: 0 });
    // droneAvailability should be initialized
    expect(updates.player1.droneAvailability).toBeTruthy();
  });

  it('transfers placement commitments to placedSections and opponentPlacedSections', () => {
    const updates = ap.applyPhaseCommitments('placement');

    expect(updates.placedSections).toEqual(['bridge', 'powerCell', 'droneControlHub']);
    expect(updates.opponentPlacedSections).toEqual(['droneControlHub', 'bridge', 'powerCell']);
  });
});
