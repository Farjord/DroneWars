/**
 * DroneToken.special-abilities.test.jsx
 * Tests for SpecialAbilityIcons component (RAPID/ASSAULT visual indicators)
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

// Mock fullDroneCollection to use keywordIcon-based detection
vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'Blitz',
      class: 2, hull: 2, shields: 1, attack: 2, speed: 5,
      abilities: [{ name: 'Rapid Response', type: 'TRIGGERED', trigger: 'ON_MOVE', usesPerRound: 1, keywordIcon: 'RAPID', effects: [{ type: 'DOES_NOT_EXHAUST' }] }]
    },
    {
      name: 'Striker',
      class: 2, hull: 2, shields: 1, attack: 3, speed: 3,
      abilities: [{ name: 'Assault Protocol', type: 'TRIGGERED', trigger: 'ON_ATTACK', usesPerRound: 1, keywordIcon: 'ASSAULT', effects: [{ type: 'DOES_NOT_EXHAUST' }] }]
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
        { name: 'Rapid Response', type: 'TRIGGERED', trigger: 'ON_MOVE', usesPerRound: 1, keywordIcon: 'RAPID', effects: [{ type: 'DOES_NOT_EXHAUST' }] },
        { name: 'Assault Protocol', type: 'TRIGGERED', trigger: 'ON_ATTACK', usesPerRound: 1, keywordIcon: 'ASSAULT', effects: [{ type: 'DOES_NOT_EXHAUST' }] }
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
    triggerUsesMap: {},
    abilities: [{
      name: 'Rapid Response',
      type: 'TRIGGERED',
      trigger: 'ON_MOVE',
      usesPerRound: 1,
      keywordIcon: 'RAPID',
      effects: [{ type: 'DOES_NOT_EXHAUST' }]
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
    triggerUsesMap: {},
    abilities: [{
      name: 'Assault Protocol',
      type: 'TRIGGERED',
      trigger: 'ON_ATTACK',
      usesPerRound: 1,
      keywordIcon: 'ASSAULT',
      effects: [{ type: 'DOES_NOT_EXHAUST' }]
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
    triggerUsesMap: {},
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

      // SpecialAbilityIcons renders in a left-positioned container
      const leftContainer = container.querySelector('[class*="-left-"]');
      expect(leftContainer).toBeInTheDocument();

      // Tooltip should contain Rapid Response text
      const tooltipContainer = container.querySelector('.drone-tooltip-container');
      expect(tooltipContainer).not.toBeNull();
      expect(tooltipContainer.textContent).toContain('Rapid Response');
    });

    it('should show blue color when triggerUsesMap has no usage', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={{ ...mockBlitzDrone, triggerUsesMap: {} }} />
      );

      // Gauge icon with text-blue-400 class indicates available state
      const blueIcon = container.querySelector('.text-blue-400');
      expect(blueIcon).toBeInTheDocument();
    });

    it('should show grey color when triggerUsesMap shows Rapid Response used', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={{ ...mockBlitzDrone, triggerUsesMap: { 'Rapid Response': 1 } }} />
      );

      // Gauge icon with text-slate-500 class indicates used state
      const greyIcon = container.querySelector('.text-slate-500');
      expect(greyIcon).toBeInTheDocument();
    });

    it('should NOT render RAPID icon for non-RAPID drones', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={mockStandardDrone} />
      );

      // No tooltip container should exist for standard drones (no effects at all)
      const tooltipContainer = container.querySelector('.drone-tooltip-container');
      expect(tooltipContainer).toBeNull();
    });
  });

  describe('ASSAULT icon', () => {
    it('should render Crosshair icon on left side for ASSAULT drones', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={mockStrikerDrone} />
      );

      // Tooltip should contain Assault Protocol text
      const tooltipContainer = container.querySelector('.drone-tooltip-container');
      expect(tooltipContainer).not.toBeNull();
      expect(tooltipContainer.textContent).toContain('Assault Protocol');
    });

    it('should show red color when triggerUsesMap has no usage', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={{ ...mockStrikerDrone, triggerUsesMap: {} }} />
      );

      // Crosshair icon with text-red-400 class indicates available state
      const redIcon = container.querySelector('.text-red-400');
      expect(redIcon).toBeInTheDocument();
    });

    it('should show grey color when triggerUsesMap shows Assault Protocol used', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={{ ...mockStrikerDrone, triggerUsesMap: { 'Assault Protocol': 1 } }} />
      );

      // Both the SpecialAbilityIcons Crosshair and tooltip Crosshair show grey when used
      const greyIcons = container.querySelectorAll('.text-slate-500');
      expect(greyIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT render ASSAULT icon for non-ASSAULT drones', () => {
      const { container } = render(
        <DroneToken {...defaultProps} drone={mockStandardDrone} />
      );

      const tooltipContainer = container.querySelector('.drone-tooltip-container');
      expect(tooltipContainer).toBeNull();
    });
  });

  describe('stacking', () => {
    it('should stack icons vertically when drone has both RAPID and ASSAULT abilities', () => {
      const mockDualAbilityDrone = {
        id: 'dual_drone_1',
        name: 'Tempest',
        image: '/images/dual.png',
        hull: 2,
        currentShields: 1,
        isExhausted: false,
        isMarked: false,
        isTeleporting: false,
        triggerUsesMap: {},
        abilities: [
          { name: 'Rapid Response', type: 'TRIGGERED', trigger: 'ON_MOVE', usesPerRound: 1, keywordIcon: 'RAPID', effects: [{ type: 'DOES_NOT_EXHAUST' }] },
          { name: 'Assault Protocol', type: 'TRIGGERED', trigger: 'ON_ATTACK', usesPerRound: 1, keywordIcon: 'ASSAULT', effects: [{ type: 'DOES_NOT_EXHAUST' }] }
        ]
      };

      const { container } = render(
        <DroneToken {...defaultProps} drone={mockDualAbilityDrone} />
      );

      // Tooltip should contain both ability labels
      const tooltipContainer = container.querySelector('.drone-tooltip-container');
      expect(tooltipContainer).not.toBeNull();
      expect(tooltipContainer.textContent).toContain('Rapid Response');
      expect(tooltipContainer.textContent).toContain('Assault Protocol');

      // SpecialAbilityIcons uses flex-col for vertical stacking
      const flexContainer = container.querySelector('[class*="flex-col"]');
      expect(flexContainer).toBeInTheDocument();
    });
  });
});
