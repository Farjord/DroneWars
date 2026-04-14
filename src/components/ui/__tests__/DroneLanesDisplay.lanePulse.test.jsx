// ========================================
// DRONE LANES DISPLAY - LANE PULSE ISOLATION TESTS
// ========================================
// TDD tests to verify valid-target class placement on lane containers
// animate-pulse must NOT be on lane containers (drones handle their own pulse)

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DroneLanesDisplay from '../DroneLanesDisplay.jsx';

// Mock the hooks
vi.mock('../../../hooks/useGameData.js', () => ({
  useGameData: () => ({
    getEffectiveStats: vi.fn(() => ({ speed: 3, attack: 2, hull: 2, maxShields: 0 }))
  })
}));

// Mock debugLog
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Mock DroneToken to avoid deep component rendering issues
vi.mock('../DroneToken.jsx', () => ({
  default: ({ drone, isActionTarget }) => (
    <div data-testid={`drone-${drone.id}`} data-is-action-target={isActionTarget}>
      {drone.name}
    </div>
  )
}));

describe('DroneLanesDisplay lane targeting styles', () => {
  // Test drones
  const slowDrone = { id: 'slow-1', name: 'Slow Drone', speed: 2, attack: 2, hull: 2 };
  const fastDrone = { id: 'fast-1', name: 'Fast Drone', speed: 6, attack: 2, hull: 2 };

  // Mock player state with drones in lanes
  const mockPlayerState = {
    dronesOnBoard: {
      lane1: [slowDrone, fastDrone],
      lane2: [],
      lane3: []
    }
  };

  // Default props for DroneLanesDisplay
  const defaultProps = {
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
    draggedCard: null,
    handleCardDragEnd: vi.fn(),
    draggedDrone: null,
    handleDroneDragStart: vi.fn(),
    handleDroneDragEnd: vi.fn(),
    draggedActionCard: null,
    handleActionCardDragEnd: vi.fn()
  };

  // Mock action card for LANE targeting (like Sidewinder Missiles)
  const mockLaneTargetingCard = {
    id: 'SIDEWINDER_MISSILES',
    name: 'Sidewinder Missiles',
    targeting: { type: 'LANE', affinity: 'ENEMY', affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 3 }] },
    effect: { type: 'DAMAGE' }
  };

  describe('lane container styling', () => {
    it('should NOT have animate-pulse on targetable lanes', () => {
      // Setup: Lane is targetable (draggedActionCard with LANE targeting)
      const props = {
        ...defaultProps,
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      // Find lane containers by data-testid
      const laneContainers = container.querySelectorAll('[data-testid^="lane-drop-zone"]');

      // Check that NO lane container has animate-pulse class
      laneContainers.forEach(lane => {
        expect(lane.className).not.toContain('animate-pulse');
      });
    });

    it('should have valid-target-shaped class on visual layer of targetable lane', () => {
      const props = {
        ...defaultProps,
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);
      const laneContainers = container.querySelectorAll('[data-testid^="lane-drop-zone"]');
      const lane1 = laneContainers[0];

      // valid-target-shaped is on the visual layer child (drop-shadow follows trapezoid clip-path)
      expect(lane1.querySelector('.valid-target-shaped')).toBeTruthy();
    });

    it('should NOT have valid-target-shaped class on non-targetable lanes', () => {
      const props = {
        ...defaultProps,
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);
      const laneContainers = container.querySelectorAll('[data-testid^="lane-drop-zone"]');
      // lane2 and lane3 are not targeted — visual layer should NOT have valid-target-shaped
      expect(laneContainers[1].querySelector('.valid-target-shaped')).toBeNull();
      expect(laneContainers[2].querySelector('.valid-target-shaped')).toBeNull();
    });
  });

  describe('drone pulse isolation', () => {
    it('should pass isActionTarget=true only to drones in affectedDroneIds', () => {
      // Only fast drone is affected (speed >= 5 for Shrieker Missiles scenario)
      const props = {
        ...defaultProps,
        affectedDroneIds: ['fast-1'],
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      // Check the mocked DroneToken data attributes
      const fastDroneEl = container.querySelector('[data-testid="drone-fast-1"]');
      const slowDroneEl = container.querySelector('[data-testid="drone-slow-1"]');

      // Fast drone should have isActionTarget=true
      expect(fastDroneEl.getAttribute('data-is-action-target')).toBe('true');
      // Slow drone should have isActionTarget=false
      expect(slowDroneEl.getAttribute('data-is-action-target')).toBe('false');
    });

    it('should NOT have isActionTarget=true for drones NOT in affectedDroneIds', () => {
      // Only fast drone is affected
      const props = {
        ...defaultProps,
        affectedDroneIds: ['fast-1'],
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      const slowDroneEl = container.querySelector('[data-testid="drone-slow-1"]');
      expect(slowDroneEl.getAttribute('data-is-action-target')).toBe('false');
    });
  });
});
