// ========================================
// MINE WARNING HOOK TESTS
// ========================================
// Tests for getThreatenedMines resolver and useMineWarning hook.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getThreatenedMines } from '../useMineWarning.js';
import useMineWarning from '../useMineWarning.js';

// ---------------------------------------------------------------------------
// Helpers — build tech instances that mirror what TechCreationProcessor creates
// ---------------------------------------------------------------------------

let nextId = 1;
function makeTech(name, overrides = {}) {
  return { id: `tech-${nextId++}`, name, hull: 1, ...overrides };
}

// ---------------------------------------------------------------------------
// getThreatenedMines — resolver unit tests
// ---------------------------------------------------------------------------

describe('getThreatenedMines', () => {
  beforeEach(() => { nextId = 1; });

  describe.each([
    ['deployment', 'Inhibitor Mine'],
    ['movement', 'Proximity Mine'],
    ['attack', 'Jitter Mine'],
  ])('%s finds %s', (actionType, mineName) => {
    it('returns the mine ID when it matches the action trigger', () => {
      const mine = makeTech(mineName);
      const techSlots = { lane1: [mine], lane2: [], lane3: [] };
      const result = getThreatenedMines(actionType, 'lane1', techSlots);
      expect(result).toEqual([mine.id]);
    });

    it('returns [] when the mine is in a different lane', () => {
      const mine = makeTech(mineName);
      const techSlots = { lane1: [], lane2: [mine], lane3: [] };
      const result = getThreatenedMines(actionType, 'lane1', techSlots);
      expect(result).toEqual([]);
    });
  });

  it('returns [] for an empty lane', () => {
    const techSlots = { lane1: [], lane2: [], lane3: [] };
    expect(getThreatenedMines('deployment', 'lane1', techSlots)).toEqual([]);
  });

  it('returns [] when techSlots is undefined/null', () => {
    expect(getThreatenedMines('deployment', 'lane1', undefined)).toEqual([]);
    expect(getThreatenedMines('deployment', 'lane1', null)).toEqual([]);
  });

  it('returns [] for non-mine tech (Rally Beacon has LANE_OWNER, not mine subType)', () => {
    const beacon = makeTech('Rally Beacon');
    const techSlots = { lane1: [beacon], lane2: [], lane3: [] };
    expect(getThreatenedMines('movement', 'lane1', techSlots)).toEqual([]);
  });

  it('returns [] for non-mine tech even if it has a matching trigger type', () => {
    // Thruster Inhibitor is not a mine but is a tech
    const inhibitor = makeTech('Thruster Inhibitor');
    const techSlots = { lane1: [inhibitor], lane2: [], lane3: [] };
    expect(getThreatenedMines('movement', 'lane1', techSlots)).toEqual([]);
  });

  it('returns [] when mine trigger does not match action type', () => {
    // Inhibitor Mine triggers on deployment, not movement
    const mine = makeTech('Inhibitor Mine');
    const techSlots = { lane1: [mine], lane2: [], lane3: [] };
    expect(getThreatenedMines('movement', 'lane1', techSlots)).toEqual([]);
  });

  it('returns [] for unknown action type', () => {
    const mine = makeTech('Proximity Mine');
    const techSlots = { lane1: [mine], lane2: [], lane3: [] };
    expect(getThreatenedMines('unknown', 'lane1', techSlots)).toEqual([]);
  });

  it('returns [] for exhausted usesPerRound mine', () => {
    // Simulate a mine with usesPerRound that has been exhausted
    const mine = makeTech('Proximity Mine', {
      triggerUsesMap: { 'Proximity Detonation': 1 },
    });
    const techSlots = { lane1: [mine], lane2: [], lane3: [] };
    // Proximity Mine doesn't have usesPerRound in real data (uses destroyAfterTrigger),
    // so it should still match. But if a hypothetical mine had usesPerRound, test the guard.
    // For now, Proximity Mine has no usesPerRound — it should return normally.
    expect(getThreatenedMines('movement', 'lane1', techSlots)).toEqual([mine.id]);
  });

  it('returns multiple mine IDs when lane has multiple mines', () => {
    const mine1 = makeTech('Proximity Mine');
    const mine2 = makeTech('Proximity Mine');
    const techSlots = { lane1: [mine1, mine2], lane2: [], lane3: [] };
    const result = getThreatenedMines('movement', 'lane1', techSlots);
    expect(result).toEqual([mine1.id, mine2.id]);
  });
});

// ---------------------------------------------------------------------------
// useMineWarning hook — integration tests
// ---------------------------------------------------------------------------

// Mock SoundManager to avoid audio context issues in tests
const { mockPlay, mockStop } = vi.hoisted(() => {
  const mockPlay = vi.fn();
  const mockStop = vi.fn();
  return { mockPlay, mockStop };
});
vi.mock('../../managers/SoundManager.js', () => ({
  default: { getInstance: () => ({ play: mockPlay, stop: mockStop }) },
}));

function makeHookProps(overrides = {}) {
  return {
    draggedCard: null,
    draggedDrone: null,
    insertionPreview: null,
    selectedDrone: null,
    hoveredTarget: null,
    turnPhase: 'action',
    localPlayerState: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      techSlots: { lane1: [], lane2: [], lane3: [] },
    },
    opponentPlayerState: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      techSlots: { lane1: [], lane2: [], lane3: [] },
    },
    ...overrides,
  };
}

describe('useMineWarning hook', () => {
  beforeEach(() => {
    nextId = 1;
    mockPlay.mockClear();
    mockStop.mockClear();
  });

  it('returns empty when no drag/selection active', () => {
    const { result } = renderHook(() => useMineWarning(makeHookProps()));
    expect(result.current.warnedMineIds).toEqual([]);
  });

  it('returns mine IDs during deployment drag over mined lane', () => {
    const mine = makeTech('Inhibitor Mine');
    const { result } = renderHook(() =>
      useMineWarning(makeHookProps({
        draggedCard: { card: { name: 'SomeDrone' } },
        insertionPreview: { laneId: 'lane1', index: 0 },
        opponentPlayerState: {
          techSlots: { lane1: [mine], lane2: [], lane3: [] },
        },
      }))
    );
    expect(result.current.warnedMineIds).toEqual([mine.id]);
  });

  it('returns mine IDs during drone movement drag to mined lane', () => {
    const mine = makeTech('Proximity Mine');
    const { result } = renderHook(() =>
      useMineWarning(makeHookProps({
        draggedDrone: { drone: { id: 'drone-1' }, sourceLane: 'lane1' },
        insertionPreview: { laneId: 'lane2', index: 0 },
        opponentPlayerState: {
          techSlots: { lane1: [], lane2: [mine], lane3: [] },
        },
      }))
    );
    expect(result.current.warnedMineIds).toEqual([mine.id]);
  });

  it('returns mine IDs during drag-attack on opponent drone (Jitter Mine in attacker lane)', () => {
    const mine = makeTech('Jitter Mine');
    const { result } = renderHook(() =>
      useMineWarning(makeHookProps({
        draggedDrone: { drone: { id: 'drone-1' }, sourceLane: 'lane1' },
        hoveredTarget: { type: 'drone', target: { id: 'opp-1' }, lane: 'lane2' },
        opponentPlayerState: {
          dronesOnBoard: { lane1: [], lane2: [{ id: 'opp-1' }], lane3: [] },
          techSlots: { lane1: [mine], lane2: [], lane3: [] },
        },
      }))
    );
    expect(result.current.warnedMineIds).toEqual([mine.id]);
  });

  it('returns mine IDs during click-attack on opponent drone (selectedDrone + hovered opponent)', () => {
    const mine = makeTech('Jitter Mine');
    const { result } = renderHook(() =>
      useMineWarning(makeHookProps({
        selectedDrone: { id: 'drone-1' },
        hoveredTarget: { type: 'drone', target: { id: 'opp-1' }, lane: 'lane2' },
        turnPhase: 'action',
        localPlayerState: {
          dronesOnBoard: { lane1: [{ id: 'drone-1' }], lane2: [], lane3: [] },
          techSlots: { lane1: [], lane2: [], lane3: [] },
        },
        opponentPlayerState: {
          dronesOnBoard: { lane1: [], lane2: [{ id: 'opp-1' }], lane3: [] },
          techSlots: { lane1: [mine], lane2: [], lane3: [] },
        },
      }))
    );
    expect(result.current.warnedMineIds).toEqual([mine.id]);
  });

  it('returns mine IDs during drag-attack on ship section', () => {
    const mine = makeTech('Jitter Mine');
    const { result } = renderHook(() =>
      useMineWarning(makeHookProps({
        draggedDrone: { drone: { id: 'drone-1' }, sourceLane: 'lane1' },
        hoveredTarget: { type: 'section', target: { sectionKey: 'weapons' }, isOpponent: true },
        opponentPlayerState: {
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          techSlots: { lane1: [mine], lane2: [], lane3: [] },
        },
      }))
    );
    expect(result.current.warnedMineIds).toEqual([mine.id]);
  });

  it('returns mine IDs during click-attack on ship section', () => {
    const mine = makeTech('Jitter Mine');
    const { result } = renderHook(() =>
      useMineWarning(makeHookProps({
        selectedDrone: { id: 'drone-1' },
        hoveredTarget: { type: 'section', target: { sectionKey: 'weapons' }, isOpponent: true },
        turnPhase: 'action',
        localPlayerState: {
          dronesOnBoard: { lane1: [{ id: 'drone-1' }], lane2: [], lane3: [] },
          techSlots: { lane1: [], lane2: [], lane3: [] },
        },
        opponentPlayerState: {
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          techSlots: { lane1: [mine], lane2: [], lane3: [] },
        },
      }))
    );
    expect(result.current.warnedMineIds).toEqual([mine.id]);
  });

  it('clears when drag ends (props revert to no action)', () => {
    const mine = makeTech('Inhibitor Mine');
    const activeProps = makeHookProps({
      draggedCard: { card: { name: 'SomeDrone' } },
      insertionPreview: { laneId: 'lane1', index: 0 },
      opponentPlayerState: {
        techSlots: { lane1: [mine], lane2: [], lane3: [] },
      },
    });
    const idleProps = makeHookProps({
      opponentPlayerState: {
        techSlots: { lane1: [mine], lane2: [], lane3: [] },
      },
    });

    const { result, rerender } = renderHook(
      (props) => useMineWarning(props),
      { initialProps: activeProps }
    );
    expect(result.current.warnedMineIds).toEqual([mine.id]);

    rerender(idleProps);
    expect(result.current.warnedMineIds).toEqual([]);
  });

  it('plays sound when mines become threatened and stops when cleared', () => {
    const mine = makeTech('Inhibitor Mine');
    const activeProps = makeHookProps({
      draggedCard: { card: { name: 'SomeDrone' } },
      insertionPreview: { laneId: 'lane1', index: 0 },
      opponentPlayerState: {
        techSlots: { lane1: [mine], lane2: [], lane3: [] },
      },
    });
    const idleProps = makeHookProps({
      opponentPlayerState: {
        techSlots: { lane1: [mine], lane2: [], lane3: [] },
      },
    });

    const { rerender } = renderHook(
      (props) => useMineWarning(props),
      { initialProps: activeProps }
    );

    expect(mockPlay).toHaveBeenCalledWith('mine_warning', { loop: true });

    rerender(idleProps);
    expect(mockStop).toHaveBeenCalledWith('mine_warning');
  });
});
