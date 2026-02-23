/**
 * DroneToken.special-abilities.test.jsx
 * TDD tests for SpecialAbilityIcons component (RAPID/ASSAULT visual indicators)
 *
 * These tests verify:
 * 1. RAPID icon (Gauge) renders on left side for RAPID drones
 * 2. ASSAULT icon (Crosshair) renders on left side for ASSAULT drones
 * 3. Icons show correct colors based on usage state (colored = available, grey = used)
 * 4. Icons stack vertically when drone has both abilities
 * 5. No icons render for drones without these abilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DroneToken from '../DroneToken.jsx';

// Mock the useGameData hook
vi.mock('../../../hooks/useGameData.js', async () => {
  const actual = await vi.importActual('../../../hooks/useGameData.js');
  return {
    ...actual,
    useGameData: () => ({
      getEffectiveStats: () => ({
        attack: 2,
        speed: 3,
        baseAttack: 2,
        baseSpeed: 3,
        maxShields: 1,
        keywords: new Set()
      })
    })
  };
});

// Mock the EditorStatsContext
vi.mock('../../../contexts/EditorStatsContext.jsx', () => ({
  useEditorStats: () => null
}));

// Mock fullDroneCollection to include our test drones
// Note: Tempest Drone now exists in real droneData.js, no mock needed for it
vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'Blitz',
      class: 2, hull: 2, shields: 1, attack: 2, speed: 5,
      abilities: [{ name: 'Rapid Response', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'RAPID' } }]
    },
    {
      name: 'Striker',
      class: 2, hull: 2, shields: 1, attack: 3, speed: 3,
      abilities: [{ name: 'Assault Protocol', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'ASSAULT' } }]
    },
    {
      name: 'Dart',
      class: 1, hull: 1, shields: 1, attack: 1, speed: 6,
      abilities: []
    },
    {
      name: 'Tempest',
      class: 3, hull: 2, shields: 1, attack: 2, speed: 4,
      abilities: [
        { name: 'Rapid Response', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'RAPID' } },
        { name: 'Assault Protocol', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'ASSAULT' } }
      ]
    }
  ]
}));

describe('DroneToken - SpecialAbilityIcons', () => {
  // Mock Blitz Drone with RAPID ability
  const mockBlitzDrone = {
    id: 'blitz_drone_1',
    name: 'Blitz',
    image: '/images/blitz.png',
    hull: 2,
    currentShields: 1,
    isExhausted: false,
    isMarked: false,
    isTeleporting: false,
    rapidUsed: false,
    assaultUsed: false,
    abilities: [{
      name: 'Rapid Response',
      type: 'PASSIVE',
      effect: { type: 'GRANT_KEYWORD', keyword: 'RAPID' }
    }]
  };

  // Mock Striker Drone with ASSAULT ability
  const mockStrikerDrone = {
    id: 'striker_drone_1',
    name: 'Striker',
    image: '/images/striker.png',
    hull: 2,
    currentShields: 1,
    isExhausted: false,
    isMarked: false,
    isTeleporting: false,
    rapidUsed: false,
    assaultUsed: false,
    abilities: [{
      name: 'Assault Protocol',
      type: 'PASSIVE',
      effect: { type: 'GRANT_KEYWORD', keyword: 'ASSAULT' }
    }]
  };

  // Mock standard drone without special abilities
  const mockStandardDrone = {
    id: 'scout_drone_1',
    name: 'Dart',
    image: '/images/scout.png',
    hull: 1,
    currentShields: 1,
    isExhausted: false,
    isMarked: false,
    isTeleporting: false,
    rapidUsed: false,
    assaultUsed: false,
    abilities: []
  };

  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      onClick: vi.fn(),
      isPlayer: true,
      isSelected: false,
      isSelectedForMove: false,
      isHit: false,
      isPotentialInterceptor: false,
      isPotentialGuardian: false,
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      lane: 'lane1',
      onAbilityClick: vi.fn(),
      isActionTarget: false,
      droneRefs: { current: {} },
      mandatoryAction: null,
      localPlayerState: { energy: 5 },
      interceptedBadge: null,
      onDragStart: vi.fn(),
      onDragDrop: vi.fn(),
      isDragging: false,
      isHovered: false
    };
  });

  describe('RAPID icon', () => {
    it('should render Gauge icon on left side for RAPID drones', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={mockBlitzDrone} />
      );

      // Look for the special ability icons container on the left side
      // The container should be positioned with class "left-" for left positioning
      const leftContainer = container.querySelector('[class*="-left-"]');
      expect(leftContainer).toBeInTheDocument();

      // Should contain a Gauge icon (title attribute or visual indicator)
      const rapidIcon = container.querySelector('[title*="Rapid"]');
      expect(rapidIcon).toBeInTheDocument();
    });

    it('should show blue color when rapidUsed is false', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={{ ...mockBlitzDrone, rapidUsed: false }} />
      );

      // Look for blue-colored icon (available state)
      const rapidIcon = container.querySelector('[title*="available"]');
      expect(rapidIcon).toBeInTheDocument();
    });

    it('should show grey color when rapidUsed is true', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={{ ...mockBlitzDrone, rapidUsed: true }} />
      );

      // Look for grey-colored icon (used state)
      const rapidIcon = container.querySelector('[title*="used"]');
      expect(rapidIcon).toBeInTheDocument();
    });

    it('should NOT render RAPID icon for non-RAPID drones', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={mockStandardDrone} />
      );

      // Should not find any Rapid-related elements
      const rapidIcon = container.querySelector('[title*="Rapid"]');
      expect(rapidIcon).not.toBeInTheDocument();
    });
  });

  describe('ASSAULT icon', () => {
    it('should render Crosshair icon on left side for ASSAULT drones', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={mockStrikerDrone} />
      );

      // Should contain an Assault icon
      const assaultIcon = container.querySelector('[title*="Assault"]');
      expect(assaultIcon).toBeInTheDocument();
    });

    it('should show red color when assaultUsed is false', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={{ ...mockStrikerDrone, assaultUsed: false }} />
      );

      // Look for red-colored icon (available state)
      const assaultIcon = container.querySelector('[title*="available"]');
      expect(assaultIcon).toBeInTheDocument();
    });

    it('should show grey color when assaultUsed is true', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={{ ...mockStrikerDrone, assaultUsed: true }} />
      );

      // Look for grey-colored icon (used state)
      const assaultIcon = container.querySelector('[title*="used"]');
      expect(assaultIcon).toBeInTheDocument();
    });

    it('should NOT render ASSAULT icon for non-ASSAULT drones', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={mockStandardDrone} />
      );

      // Should not find any Assault-related elements
      const assaultIcon = container.querySelector('[title*="Assault"]');
      expect(assaultIcon).not.toBeInTheDocument();
    });
  });

  describe('stacking', () => {
    it('should stack icons vertically when drone has both RAPID and ASSAULT abilities', () => {
      // Mock drone with both abilities
      const mockDualAbilityDrone = {
        id: 'dual_drone_1',
        name: 'Tempest',
        image: '/images/dual.png',
        hull: 2,
        currentShields: 1,
        isExhausted: false,
        isMarked: false,
        isTeleporting: false,
        rapidUsed: false,
        assaultUsed: false,
        abilities: [
          { name: 'Rapid Response', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'RAPID' } },
          { name: 'Assault Protocol', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'ASSAULT' } }
        ]
      };

      const { container } = render(
        <DroneToken {...defaultProps} drone={mockDualAbilityDrone} />
      );

      // Both icons should be present
      const rapidIcon = container.querySelector('[title*="Rapid"]');
      const assaultIcon = container.querySelector('[title*="Assault"]');
      expect(rapidIcon).toBeInTheDocument();
      expect(assaultIcon).toBeInTheDocument();

      // They should be in a flex container with flex-col for vertical stacking
      const flexContainer = container.querySelector('[class*="flex-col"]');
      expect(flexContainer).toBeInTheDocument();
    });
  });
});
