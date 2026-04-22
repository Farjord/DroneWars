// ========================================
// DESTROY TECH EFFECT PROCESSOR — SHIELD AURA TESTS
// ========================================
// Verifies that removing shield-granting tech triggers an aura update so
// drones' currentShields are capped at the new (lower) max.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../utils/debugLogger.js', () => ({ debugLog: vi.fn() }));
vi.mock('../../../config/animationTypes.js', () => ({ TECH_DESTROY: 'TECH_DESTROY' }));
vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn()
}));

import DestroyTechEffectProcessor from '../DestroyTechEffectProcessor.js';
import { updateAuras } from '../../utils/auraManager.js';

const makeTech = (id, name) => ({ id, name, hull: 1, isTech: true });
const makeDrone = () => ({
  id: 'player2_Dart_0001',
  name: 'Dart',
  hull: 2,
  currentShields: 2,
  currentMaxShields: 2
});

const makePlayerStates = () => ({
  player1: {
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] }
  },
  player2: {
    dronesOnBoard: { lane1: [makeDrone()], lane2: [], lane3: [] },
    techSlots: {
      lane1: [makeTech('tech_shield_1', 'Shield Array')],
      lane2: [],
      lane3: []
    }
  }
});

const makeContext = (overrides = {}) => ({
  actingPlayerId: 'player1',
  playerStates: makePlayerStates(),
  target: { id: 'tech_shield_1', lane: 'lane1', owner: 'player2' },
  placedSections: {},
  ...overrides
});

describe('DestroyTechEffectProcessor — shield aura update', () => {
  let processor;

  beforeEach(() => {
    processor = new DestroyTechEffectProcessor();
    vi.clearAllMocks();
    updateAuras.mockImplementation((playerState) => playerState.dronesOnBoard);
  });

  it('calls updateAuras after removing tech so drone shields can be recalculated', () => {
    processor.process({ type: 'DESTROY_TECH' }, makeContext());

    expect(updateAuras).toHaveBeenCalledOnce();
  });

  it('calls updateAuras with player state that has the tech already removed from techSlots', () => {
    processor.process({ type: 'DESTROY_TECH' }, makeContext());

    const calledWithPlayerState = updateAuras.mock.calls[0][0];
    expect(calledWithPlayerState.techSlots.lane1).toHaveLength(0);
  });

  it('assigns updateAuras return value to dronesOnBoard so shield caps are applied', () => {
    const updatedDrones = {
      lane1: [{ ...makeDrone(), currentShields: 1, currentMaxShields: 1 }],
      lane2: [],
      lane3: []
    };
    updateAuras.mockReturnValue(updatedDrones);

    const result = processor.process({ type: 'DESTROY_TECH' }, makeContext());

    expect(result.newPlayerStates.player2.dronesOnBoard).toBe(updatedDrones);
  });

  it('does not call updateAuras when target is missing', () => {
    processor.process({ type: 'DESTROY_TECH' }, makeContext({ target: null }));

    expect(updateAuras).not.toHaveBeenCalled();
  });

  it('does not call updateAuras when tech is not found in techSlots', () => {
    processor.process({ type: 'DESTROY_TECH' }, makeContext({
      target: { id: 'nonexistent', lane: 'lane1', owner: 'player2' }
    }));

    expect(updateAuras).not.toHaveBeenCalled();
  });
});
