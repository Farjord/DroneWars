// ========================================
// DRONE LANES DISPLAY - LANE PULSE ISOLATION TESTS
// ========================================
// TDD tests to verify that animate-pulse is NOT on lane containers
// Only individual drones that match affectedDroneIds should pulse

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    handleActionCardDragEnd: vi.fn()
  };

  // Mock action card for LANE targeting (like Sidewinder Missiles)
  const mockLaneTargetingCard = {
    id: 'CARD013',
    name: 'Sidewinder Missiles',
    targeting: { type: 'LANE', affinity: 'ENEMY' },
    effect: { type: 'DAMAGE', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'LTE', value: 3 } }
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

      // Find lane containers - they are the flex-1 divs
      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');

      // Check that NO lane container has animate-pulse class
      laneContainers.forEach(lane => {
        expect(lane.className).not.toContain('animate-pulse');
      });
    });

    it('should have pulse overlay on targetable lanes (without animate-pulse on container)', () => {
      const props = {
        ...defaultProps,
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');
      const lane1 = laneContainers[0]; // First lane

      // Lane should have a pulse overlay child (not ring classes on the container)
      const pulseOverlay = lane1.querySelector('.lane-target-pulse');
      expect(pulseOverlay).not.toBeNull();
      expect(pulseOverlay.className).toContain('absolute');
    });

    it('should have background color on pulse overlay for targetable lanes', () => {
      const props = {
        ...defaultProps,
        draggedActionCard: { card: mockLaneTargetingCard },
        validCardTargets: [{ id: 'lane1', owner: 'player2' }]
      };

      const { container } = render(<DroneLanesDisplay {...props} />);

      const laneContainers = container.querySelectorAll('.flex-1.rounded-lg');
      const lane1 = laneContainers[0]; // First lane

      // Pulse overlay should have a backgroundColor style (inline, not class)
      const pulseOverlay = lane1.querySelector('.lane-target-pulse');
      expect(pulseOverlay).not.toBeNull();
      expect(pulseOverlay.style.backgroundColor).toBeTruthy();
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
