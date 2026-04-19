/**
 * useDragMechanics — chain destination insertion preview
 *
 * Verifies that handleLaneMouseMove updates insertionPreview during the
 * chain destination subphase even when no drag is active. This covers
 * click-based destination selection for opponent-owned drones (e.g.
 * Forced Reposition step 2: player clicks an opponent lane to choose
 * where the enemy drone lands).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDragMechanics from '../useDragMechanics.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../utils/debugLogger.js', () => ({ debugLog: vi.fn() }));
vi.mock('../../components/ui/TargetingArrow.jsx', () => ({ calculatePolygonPoints: vi.fn() }));
vi.mock('../../logic/targeting/uiTargetingHelpers.js', () => ({
  calculateAllValidTargets: vi.fn().mockReturnValue({ validCardTargets: [], validAbilityTargets: [] }),
  calculateAffectedDroneIds: vi.fn().mockReturnValue([]),
  calculateAffectedSections: vi.fn().mockReturnValue([]),
}));
vi.mock('../../utils/gameUtils.js', () => ({
  getElementCenter: vi.fn().mockReturnValue({ x: 0, y: 0 }),
}));
vi.mock('../../logic/cards/chainTargetResolver.js', () => ({
  isCompoundEffect: vi.fn().mockReturnValue(false),
  resolveDestinationRefs: vi.fn().mockReturnValue(null),
}));
vi.mock('../../logic/utils/gameEngineUtils.js', () => ({
  isLaneFull: vi.fn().mockReturnValue(false),
  MAX_TECH_PER_LANE: 2,
}));
vi.mock('../../components/ui/insertionIndexCalculator.js', () => ({
  calculateInsertionIndex: vi.fn().mockReturnValue(2),
}));
vi.mock('../../components/ui/ghostSideHelpers.js', () => ({
  computeGhostIsPlayer: vi.fn().mockReturnValue(true),
}));
vi.mock('../isRepositionNoOp.js', () => ({
  isRepositionNoOp: vi.fn().mockReturnValue(false),
}));
vi.mock('../../data/droneData.js', () => ({ default: [] }));
vi.mock('../../utils/pixelUtils.js', () => ({
  roundToDevicePixel: vi.fn(x => x),
}));

import { calculateInsertionIndex } from '../../components/ui/insertionIndexCalculator.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockGameAreaRef = {
  current: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 800, height: 600 }),
  },
};

const emptyState = (id = 'player1') => ({
  id,
  dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
  hand: [],
});

function makeMinimalProps(overrides = {}) {
  return {
    gameAreaRef: mockGameAreaRef,
    turnPhase: 'action',
    currentPlayer: 'player1',
    getLocalPlayerId: vi.fn().mockReturnValue('player1'),
    passInfo: null,
    roundNumber: 1,
    totalLocalPlayerDrones: 0,
    localPlayerState: emptyState('player1'),
    localPlayerEffectiveStats: {},
    gameEngine: null,
    setSelectedDrone: vi.fn(),
    setModalContent: vi.fn(),
    executeDeployment: vi.fn(),
    setAffectedDroneIds: vi.fn(),
    setAffectedSectionIds: vi.fn(),
    setHoveredLane: vi.fn(),
    setSelectedCard: vi.fn(),
    cancelCardSelection: vi.fn(),
    setCardConfirmation: vi.fn(),
    setUpgradeSelectionModal: vi.fn(),
    setDestroyUpgradeModal: vi.fn(),
    setValidCardTargets: vi.fn(),
    validCardTargets: [],
    selectedCard: null,
    interceptionModeActive: false,
    playerInterceptionChoice: null,
    setSelectedInterceptor: vi.fn(),
    startEffectChain: vi.fn(),
    effectChainState: null,
    selectChainTarget: vi.fn(),
    selectChainDestination: vi.fn(),
    draggedDrone: null,
    setDraggedDrone: vi.fn(),
    cancelAllActions: vi.fn(),
    opponentPlayerState: emptyState('player2'),
    gameState: { player1: emptyState('player1'), player2: emptyState('player2') },
    gameDataService: null,
    getPlacedSectionsForEngine: vi.fn().mockReturnValue([]),
    droneRefs: { current: {} },
    setMoveConfirmation: vi.fn(),
    resolveAttack: vi.fn(),
    getEffectiveStats: vi.fn().mockReturnValue({}),
    selectedDrone: null,
    abilityMode: null,
    addLogEntry: vi.fn(),
    ...overrides,
  };
}

const mockLaneElement = {
  querySelectorAll: vi.fn().mockReturnValue([]),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDragMechanics — chain destination insertion preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calculateInsertionIndex.mockReturnValue(2);
  });

  it('does NOT set insertionPreview when no drag and chain is NOT in destination phase', () => {
    const { result } = renderHook(() => useDragMechanics(makeMinimalProps({
      effectChainState: null,
    })));

    act(() => {
      result.current.handleLaneMouseMove('lane1', 100, mockLaneElement);
    });

    expect(result.current.insertionPreview).toBeNull();
  });

  it('sets insertionPreview for an enemy drone during chain destination phase (no drag)', () => {
    const enemyDrone = { id: 'enemy-d1', name: 'Fighter', attack: 3, speed: 5, hull: 4 };
    const props = makeMinimalProps({
      effectChainState: {
        subPhase: 'destination',
        complete: false,
        pendingTarget: enemyDrone,
        pendingDroneOwnerId: 'player2',
        effects: [],
        selections: [],
        validTargets: [],
      },
    });

    const { result } = renderHook(() => useDragMechanics(props));

    act(() => {
      result.current.handleLaneMouseMove('lane1', 100, mockLaneElement);
    });

    expect(result.current.insertionPreview).not.toBeNull();
    expect(result.current.insertionPreview.laneId).toBe('lane1');
    expect(result.current.insertionPreview.index).toBe(2);
    expect(result.current.insertionPreview.drone).toEqual(enemyDrone);
    expect(result.current.insertionPreview.isPlayer).toBe(false); // enemy drone → opponent side
  });

  it('sets insertionPreview for a friendly drone during chain destination phase (no drag)', () => {
    const friendlyDrone = { id: 'my-d1', name: 'Scout', attack: 2, speed: 4, hull: 3 };
    const props = makeMinimalProps({
      effectChainState: {
        subPhase: 'destination',
        complete: false,
        pendingTarget: friendlyDrone,
        pendingDroneOwnerId: 'player1',
        effects: [],
        selections: [],
        validTargets: [],
      },
    });

    const { result } = renderHook(() => useDragMechanics(props));

    act(() => {
      result.current.handleLaneMouseMove('lane2', 150, mockLaneElement);
    });

    expect(result.current.insertionPreview).not.toBeNull();
    expect(result.current.insertionPreview.laneId).toBe('lane2');
    expect(result.current.insertionPreview.isPlayer).toBe(true); // friendly drone → player side
  });

  it('does NOT set insertionPreview when chain is complete', () => {
    const props = makeMinimalProps({
      effectChainState: {
        subPhase: 'destination',
        complete: true, // chain finished — should not fire
        pendingTarget: { id: 'enemy-d1' },
        pendingDroneOwnerId: 'player2',
      },
    });

    const { result } = renderHook(() => useDragMechanics(props));

    act(() => {
      result.current.handleLaneMouseMove('lane1', 100, mockLaneElement);
    });

    expect(result.current.insertionPreview).toBeNull();
  });
});
