// ========================================
// TECH CREATION PROCESSOR — SHIELD AURA TESTS
// ========================================
// Verifies that deploying shield-granting tech triggers an aura update so
// existing drones in the lane gain active (not spent) shields.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../utils/debugLogger.js', () => ({ debugLog: vi.fn() }));
vi.mock('../../../config/animationTypes.js', () => ({ TECH_DEPLOY: 'TECH_DEPLOY' }));
vi.mock('../../utils/gameEngineUtils.js', () => ({
  countDroneTypeInLane: vi.fn(() => 0),
  MAX_TECH_PER_LANE: 3
}));
vi.mock('../../../data/techData.js', () => ({
  default: [{
    name: 'Shield Array',
    hull: 1,
    abilities: [{
      type: 'PASSIVE',
      scope: 'FRIENDLY_IN_LANE',
      effect: { type: 'MODIFY_STAT', stat: 'shields', value: 1 }
    }]
  }]
}));
vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn()
}));

import TechCreationProcessor from '../TechCreationProcessor.js';
import { updateAuras } from '../../utils/auraManager.js';

const makeDrone = () => ({
  id: 'player1_Dart_0001',
  name: 'Dart',
  hull: 2,
  currentShields: 1,
  currentMaxShields: 1
});

const makePlayerStates = () => ({
  player1: {
    name: 'Player 1',
    totalDronesDeployed: 0,
    dronesOnBoard: { lane1: [makeDrone()], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] }
  },
  player2: {
    name: 'Player 2',
    totalDronesDeployed: 0,
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] }
  }
});

const makeContext = (overrides = {}) => ({
  actingPlayerId: 'player1',
  playerStates: makePlayerStates(),
  target: { id: 'lane1' },
  placedSections: {},
  callbacks: { logCallback: vi.fn() },
  card: { name: 'Deploy Shield Array', instanceId: 'card_1' },
  ...overrides
});

describe('TechCreationProcessor — shield aura update', () => {
  let processor;

  beforeEach(() => {
    processor = new TechCreationProcessor();
    vi.clearAllMocks();
    updateAuras.mockImplementation((playerState) => playerState.dronesOnBoard);
  });

  it('calls updateAuras after placing tech so drones can gain active shields', () => {
    processor.process({ type: 'CREATE_TECH', tokenName: 'Shield Array' }, makeContext());

    expect(updateAuras).toHaveBeenCalledOnce();
  });

  it('calls updateAuras with player state that already has the tech in techSlots', () => {
    processor.process({ type: 'CREATE_TECH', tokenName: 'Shield Array' }, makeContext());

    const calledWithPlayerState = updateAuras.mock.calls[0][0];
    expect(calledWithPlayerState.techSlots.lane1).toHaveLength(1);
    expect(calledWithPlayerState.techSlots.lane1[0].name).toBe('Shield Array');
  });

  it('assigns updateAuras return value to dronesOnBoard so shield increments reach game state', () => {
    const updatedDrones = {
      lane1: [{ ...makeDrone(), currentShields: 2, currentMaxShields: 2 }],
      lane2: [],
      lane3: []
    };
    updateAuras.mockReturnValue(updatedDrones);

    const result = processor.process({ type: 'CREATE_TECH', tokenName: 'Shield Array' }, makeContext());

    expect(result.newPlayerStates.player1.dronesOnBoard).toBe(updatedDrones);
  });

  it('does not call updateAuras when tech is not found', () => {
    processor.process({ type: 'CREATE_TECH', tokenName: 'Unknown Tech' }, makeContext());

    expect(updateAuras).not.toHaveBeenCalled();
  });
});
