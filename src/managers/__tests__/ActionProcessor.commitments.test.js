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


describe('ActionProcessor — processCommitment (round-loop phases)', () => {
  let ap;
  let storedState;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    storedState = {
      gameMode: 'local',
      currentPlayer: 'player1',
      turnPhase: 'allocateShields',
      turn: 1, roundNumber: 1, actionsTakenThisTurn: 0,
      winner: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      commitments: {},
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5,
        shipSections: { core: { allocatedShields: 0 }, left: { allocatedShields: 0 }, right: { allocatedShields: 0 } },
        shieldsToAllocate: 3
      },
      player2: {
        name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5,
        shipSections: { core: { allocatedShields: 0 }, left: { allocatedShields: 0 }, right: { allocatedShields: 0 } },
        shieldsToAllocate: 2
      },
      placedSections: [null, null, null],
      opponentPlacedSections: [null, null, null],
      shieldsToAllocate: 3,
      opponentShieldsToAllocate: 2
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
      phase: 'allocateShields',
      actionData: { shieldAllocations: { core: 3 } }
    });

    expect(result.success).toBe(true);
    expect(result.data.bothPlayersComplete).toBe(false);
    expect(result.data.playerId).toBe('player1');
    expect(result.data.phase).toBe('allocateShields');
    expect(storedState.commitments.allocateShields.player1.completed).toBe(true);
  });

  it('returns bothPlayersComplete=true when both players commit', async () => {
    // Player 1 commits
    await ap.processCommitment({
      playerId: 'player1',
      phase: 'allocateShields',
      actionData: { shieldAllocations: { core: 3 } }
    });

    // Prevent AI auto-commit by making isPlayerAI return false
    ap.setGameServer({ isPlayerAI: () => false });

    // Player 2 commits
    const result = await ap.processCommitment({
      playerId: 'player2',
      phase: 'allocateShields',
      actionData: { shieldAllocations: { left: 2 } }
    });

    expect(result.success).toBe(true);
    expect(result.data.bothPlayersComplete).toBe(true);
  });
});

describe('ActionProcessor — allocateShields Phase', () => {
  let ap;
  let storedState;
  let gsm;

  beforeEach(() => {
    ActionProcessor.reset();
    storedState = {
      gameMode: 'host',
      currentPlayer: 'player1',
      turnPhase: 'allocateShields',
      turn: 1, roundNumber: 1, actionsTakenThisTurn: 0,
      winner: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      commitments: {},
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5,
        shipSections: {
          core: { allocatedShields: 3 },
          left: { allocatedShields: 2 },
          right: { allocatedShields: 0 }
        },
        shieldsToAllocate: 0
      },
      player2: {
        name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [], energy: 5,
        shipSections: {
          core: { allocatedShields: 0 },
          left: { allocatedShields: 0 },
          right: { allocatedShields: 0 }
        },
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

  it('clears existing shield allocations before applying new ones', async () => {
    await ap.processCommitment({
      playerId: 'player1',
      phase: 'allocateShields',
      actionData: { shieldAllocations: { right: 4 } }
    });

    // processCommitment mutates state directly then calls setState
    // Check storedState which was mutated in-place
    expect(storedState.player1.shipSections.core.allocatedShields).toBe(0);
    expect(storedState.player1.shipSections.left.allocatedShields).toBe(0);
    expect(storedState.player1.shipSections.right.allocatedShields).toBe(4);
  });

  it('resets opponentShieldsToAllocate after player2 shield allocation', async () => {
    storedState.opponentShieldsToAllocate = 3;

    await ap.processCommitment({
      playerId: 'player2',
      phase: 'allocateShields',
      actionData: { shieldAllocations: { core: 3 } }
    });

    expect(gsm.setState).toHaveBeenCalledWith(
      expect.objectContaining({ opponentShieldsToAllocate: 0 }),
      'COMMITMENT_UPDATE'
    );
  });
});
