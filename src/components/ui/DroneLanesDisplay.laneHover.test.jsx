// ========================================
// DRONE LANES DISPLAY - LANE HOVER TARGETING TESTS
// ========================================
// TDD tests for hover-based drone targeting with LANE-targeting cards
// When dragging a LANE-targeting card:
// - All valid lanes should flash/highlight
// - Only when hovering a specific lane should drone targets appear
// - Moving between lanes should update drone targets dynamically

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DroneLanesDisplay from './DroneLanesDisplay.jsx';

// Mock the hooks
vi.mock('../../hooks/useGameData.js', () => ({
  useGameData: () => ({
    getEffectiveStats: vi.fn(() => ({ speed: 3, attack: 2, hull: 2, maxShields: 0 }))
  })
}));

// Mock debugLog
vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Mock DroneToken to avoid deep component rendering issues
vi.mock('./DroneToken.jsx', () => ({
  default: ({ drone, isActionTarget }) => (
    <div data-testid={`drone-${drone.id}`} data-is-action-target={isActionTarget}>
      {drone.name}
    </div>
  )
}));

describe('DroneLanesDisplay lane hover for action card targeting', () => {
  // Test drones
  const slowDrone = { id: 'slow-1', name: 'Slow Drone', speed: 2, attack: 2, hull: 2 };
  const fastDrone = { id: 'fast-1', name: 'Fast Drone', speed: 6, attack: 2, hull: 2 };
  const anotherDrone = { id: 'drone-2', name: 'Another Drone', speed: 4, attack: 2, hull: 2 };

  // Mock player state with drones in lanes
  const mockPlayerState = {
    dronesOnBoard: {
      lane1: [slowDrone, fastDrone],
      lane2: [anotherDrone],
      lane3: []
    }
  };

  // Mock LANE-targeting card (like Shrieker Missiles)
  const mockLaneTargetingCard = {
    id: 'CARD013',
    name: 'Shrieker Missiles',
    targeting: { type: 'LANE', affinity: 'ENEMY' },
    effect: { type: 'DAMAGE', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'GTE', value: 5 } }
  };

  // Mock DRONE-targeting card (like Ion Blast)
  const mockDroneTargetingCard = {
    id: 'CARD001',
    name: 'Ion Blast',
    targeting: { type: 'DRONE', affinity: 'ENEMY' },
    effect: { type: 'DAMAGE', value: 1 }
  };

  let mockSetHoveredLane;

  // Default props for DroneLanesDisplay
  const getDefaultProps = () => ({
    player: mockPlayerState,
    isPlayer: false,
    onLaneClick: vi.fn(),
    getLocalPlayerId: () => 'player1',
    getOpponentPlayerId: () => 'player2',
    abilityMode: null,
    validAbilityTargets: [],
    selectedCard: null,
    validCardTargets: [],
    affectedDroneIds: [],
    multiSelectState: null,
    turnPhase: 'action',
    localPlayerState: mockPlayerState,
    opponentPlayerState: mockPlayerState,
    localPlacedSections: [],
    opponentPlacedSections: [],
    gameEngine: null,
    getPlacedSectionsForEngine: vi.fn(() => ({})),
    handleTokenClick: vi.fn(),
    handleAbilityIconClick: vi.fn(),
    selectedDrone: null,
    recentlyHitDrones: [],
    potentialInterceptors: [],
    potentialGuardians: [],
    droneRefs: {},
    mandatoryAction: null,
    setHoveredTarget: vi.fn(),
    hoveredTarget: null,
    interceptedBadge: null,
    draggedCard: null,
    handleCardDragEnd: vi.fn(),
    draggedDrone: null,
    handleDroneDragStart: vi.fn(),
    handleDroneDragEnd: vi.fn(),
    draggedActionCard: null,
    handleActionCardDragEnd: vi.fn(),
    // New props for hover-based targeting
    hoveredLane: null,
    setHoveredLane: mockSetHoveredLane
  });

  beforeEach(() => {
    mockSetHoveredLane = vi.fn();
  });

  describe('lane hover handlers', () => {
    it('should call setHoveredLane on mouseEnter when draggedActionCard with LANE targeting is active', () => {
      const props = {
        ...getDefaultProps(),
        setHoveredLane: mockSetHoveredLane,
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [
          { id: 'lane1', owner: 'player2' },
          { id: 'lane2', owner: 'player2' }
        ]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      // Find lane containers
      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');
      const lane1 = laneContainers[0];

      // Simulate mouse enter on lane1
      fireEvent.mouseEnter(lane1);

      // setHoveredLane should be called with lane info (id matches calculateAffectedDroneIds expectations)
      expect(mockSetHoveredLane).toHaveBeenCalledWith({ id: 'lane1', owner: 'player2' });
    });

    it('should call setHoveredLane(null) on mouseLeave when draggedActionCard is active', () => {
      const props = {
        ...getDefaultProps(),
        setHoveredLane: mockSetHoveredLane,
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');
      const lane1 = laneContainers[0];

      // Simulate mouse leave on lane1
      fireEvent.mouseLeave(lane1);

      // setHoveredLane should be called with null
      expect(mockSetHoveredLane).toHaveBeenCalledWith(null);
    });

    it('should NOT call setHoveredLane when no action card is being dragged', () => {
      const props = {
        ...getDefaultProps(),
        setHoveredLane: mockSetHoveredLane,
        draggedActionCard: null // No card being dragged
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');
      const lane1 = laneContainers[0];

      // Simulate mouse enter/leave
      fireEvent.mouseEnter(lane1);
      fireEvent.mouseLeave(lane1);

      // setHoveredLane should NOT be called
      expect(mockSetHoveredLane).not.toHaveBeenCalled();
    });

    it('should NOT trigger lane hover for DRONE-targeting cards (only LANE-targeting)', () => {
      const props = {
        ...getDefaultProps(),
        setHoveredLane: mockSetHoveredLane,
        draggedActionCard: { card: mockDroneTargetingCard }, // DRONE targeting, not LANE
        validCardTargets: [{ id: 'drone-1', owner: 'player2' }] // Drone targets, not lane targets
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');
      const lane1 = laneContainers[0];

      // Simulate mouse enter
      fireEvent.mouseEnter(lane1);

      // setHoveredLane should NOT be called for DRONE-targeting cards
      expect(mockSetHoveredLane).not.toHaveBeenCalled();
    });

    it('should only trigger hover for valid target lanes', () => {
      const props = {
        ...getDefaultProps(),
        setHoveredLane: mockSetHoveredLane,
        draggedActionCard: { card: mockLaneTargetingCard },
        // Only lane1 is a valid target, not lane2 or lane3
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');
      const lane2 = laneContainers[1]; // lane2 is NOT a valid target

      // Simulate mouse enter on non-target lane
      fireEvent.mouseEnter(lane2);

      // setHoveredLane should NOT be called for non-target lanes
      expect(mockSetHoveredLane).not.toHaveBeenCalled();
    });
  });

  describe('affectedDroneIds based on hovered lane', () => {
    it('should show no drone highlights when hoveredLane is null', () => {
      const props = {
        ...getDefaultProps(),
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }],
        hoveredLane: null, // No lane hovered
        affectedDroneIds: [] // Empty because nothing hovered
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      // Both drones should have isActionTarget=false
      const slowDroneEl = container.querySelector('[data-testid="drone-slow-1"]');
      const fastDroneEl = container.querySelector('[data-testid="drone-fast-1"]');

      expect(slowDroneEl.getAttribute('data-is-action-target')).toBe('false');
      expect(fastDroneEl.getAttribute('data-is-action-target')).toBe('false');
    });

    it('should show drone highlights only for the hovered lane', () => {
      // Only fast drone (speed 6) matches filter (speed >= 5)
      const props = {
        ...getDefaultProps(),
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [
          { id: 'lane1', owner: 'player2' },
          { id: 'lane2', owner: 'player2' }
        ],
        hoveredLane: { laneId: 'lane1', owner: 'player2' },
        affectedDroneIds: ['fast-1'] // Only fast drone in lane1 is affected
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      // Fast drone in lane1 should be highlighted
      const fastDroneEl = container.querySelector('[data-testid="drone-fast-1"]');
      expect(fastDroneEl.getAttribute('data-is-action-target')).toBe('true');

      // Slow drone in lane1 should NOT be highlighted (doesn't match filter)
      const slowDroneEl = container.querySelector('[data-testid="drone-slow-1"]');
      expect(slowDroneEl.getAttribute('data-is-action-target')).toBe('false');

      // Drone in lane2 should NOT be highlighted (not the hovered lane)
      const anotherDroneEl = container.querySelector('[data-testid="drone-drone-2"]');
      expect(anotherDroneEl.getAttribute('data-is-action-target')).toBe('false');
    });

    it('should clear drone highlights when mouse leaves lane (hoveredLane becomes null)', () => {
      // First, simulate hovering with drone highlights
      const propsHovering = {
        ...getDefaultProps(),
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }],
        hoveredLane: { laneId: 'lane1', owner: 'player2' },
        affectedDroneIds: ['fast-1']
      };

      const { container, rerender } = render(<DroneLanesDisplay {...propsHovering} />);

      // Fast drone should be highlighted
      let fastDroneEl = container.querySelector('[data-testid="drone-fast-1"]');
      expect(fastDroneEl.getAttribute('data-is-action-target')).toBe('true');

      // Now simulate mouse leaving - hoveredLane becomes null
      const propsNotHovering = {
        ...getDefaultProps(),
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }],
        hoveredLane: null,
        affectedDroneIds: [] // Empty when no lane hovered
      };

      rerender(<DroneLanesDisplay {...propsNotHovering} />);

      // Fast drone should no longer be highlighted
      fastDroneEl = container.querySelector('[data-testid="drone-fast-1"]');
      expect(fastDroneEl.getAttribute('data-is-action-target')).toBe('false');
    });
  });

  describe('lane visual states', () => {
    it('should still show lane highlight (ring/background) when draggedActionCard is active', () => {
      const props = {
        ...getDefaultProps(),
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }],
        hoveredLane: null // Even without hover, lane should be highlighted
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');
      const lane1 = laneContainers[0];

      // Targetable lane gets a pulse overlay child with lane-target-pulse class
      const pulseOverlay = lane1.querySelector('.lane-target-pulse');
      expect(pulseOverlay).not.toBeNull();
    });
  });
});
