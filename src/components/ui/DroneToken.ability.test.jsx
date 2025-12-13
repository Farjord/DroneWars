/**
 * DroneToken.ability.test.jsx
 * TDD tests for DroneToken ability button interaction and ability source visual feedback
 *
 * These tests verify:
 * 1. Ability button clicks work correctly (not blocked by drag handlers)
 * 2. Drag is NOT initiated when clicking on ability button
 * 3. Drag IS initiated when clicking on card body
 * 4. Visual feedback (ability-source-glow) is applied when drone is ability source
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DroneToken from './DroneToken.jsx';

// Mock the useGameData hook
vi.mock('../../hooks/useGameData.js', async () => {
  const actual = await vi.importActual('../../hooks/useGameData.js');
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
vi.mock('../../contexts/EditorStatsContext.jsx', () => ({
  useEditorStats: () => null
}));

describe('DroneToken - Ability Icon Interaction', () => {
  // Mock drone with an active ability (like Repair Drone)
  const mockDroneWithAbility = {
    id: 'repair_drone_1',
    name: 'Repair Drone',
    image: '/images/repair.png',
    hull: 1,
    currentShields: 3,
    isExhausted: false,
    isMarked: false,
    isTeleporting: false,
    abilities: [{
      name: 'Hull Repair',
      type: 'ACTIVE',
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'SAME_LANE' },
      effect: { type: 'HEAL', value: 3 },
      cost: { energy: 1, exhausts: true }
    }]
  };

  let defaultProps;
  let mockOnAbilityClick;
  let mockOnDragStart;
  let mockOnClick;

  beforeEach(() => {
    mockOnAbilityClick = vi.fn();
    mockOnDragStart = vi.fn();
    mockOnClick = vi.fn();

    defaultProps = {
      drone: mockDroneWithAbility,
      onClick: mockOnClick,
      isPlayer: true,
      isSelected: false,
      isSelectedForMove: false,
      isHit: false,
      isPotentialInterceptor: false,
      isPotentialGuardian: false,
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      lane: 'lane1',
      onAbilityClick: mockOnAbilityClick,
      isActionTarget: false,
      droneRefs: { current: {} },
      mandatoryAction: null,
      localPlayerState: { energy: 5 },
      interceptedBadge: null,
      onDragStart: mockOnDragStart,
      onDragDrop: vi.fn(),
      isDragging: false,
      isHovered: false
    };
  });

  it('should call onAbilityClick when ability icon button is clicked', () => {
    const { container } = render(<DroneToken {...defaultProps} />);

    // Find the ability button (it's the only button in DroneToken)
    const abilityButton = container.querySelector('button');
    expect(abilityButton).toBeInTheDocument();

    // Click the ability button
    fireEvent.click(abilityButton);

    // onAbilityClick should have been called
    expect(mockOnAbilityClick).toHaveBeenCalledTimes(1);
  });

  it('should NOT initiate drag when clicking on ability button', () => {
    const { container } = render(<DroneToken {...defaultProps} />);

    // Find the ability button
    const abilityButton = container.querySelector('button');
    expect(abilityButton).toBeInTheDocument();

    // Trigger mouseDown on the ability button
    fireEvent.mouseDown(abilityButton);

    // onDragStart should NOT have been called
    expect(mockOnDragStart).not.toHaveBeenCalled();
  });

  it('should initiate drag when clicking on card body (not on button)', () => {
    const { container } = render(<DroneToken {...defaultProps} />);

    // Find the main token div (the one with data-drone-id)
    const tokenDiv = container.querySelector('[data-drone-id]');
    expect(tokenDiv).toBeInTheDocument();

    // Trigger mouseDown on the main token div
    fireEvent.mouseDown(tokenDiv);

    // onDragStart should have been called
    expect(mockOnDragStart).toHaveBeenCalledTimes(1);
    expect(mockOnDragStart).toHaveBeenCalledWith(
      mockDroneWithAbility,
      'lane1',
      expect.any(Object) // the event
    );
  });

  it('should NOT initiate drag for exhausted drone', () => {
    const exhaustedDrone = { ...mockDroneWithAbility, isExhausted: true };
    const { container } = render(
      <DroneToken {...defaultProps} drone={exhaustedDrone} />
    );

    const tokenDiv = container.querySelector('[data-drone-id]');
    fireEvent.mouseDown(tokenDiv);

    // onDragStart should NOT have been called for exhausted drone
    expect(mockOnDragStart).not.toHaveBeenCalled();
  });

  it('should NOT initiate drag for opponent drone', () => {
    const { container } = render(
      <DroneToken {...defaultProps} isPlayer={false} />
    );

    const tokenDiv = container.querySelector('[data-drone-id]');
    fireEvent.mouseDown(tokenDiv);

    // onDragStart should NOT have been called for opponent drone
    expect(mockOnDragStart).not.toHaveBeenCalled();
  });

  it('should NOT show ability button for opponent drones', () => {
    const { container } = render(
      <DroneToken {...defaultProps} isPlayer={false} />
    );

    // Ability button should not exist for opponent drones
    const abilityButton = container.querySelector('button');
    expect(abilityButton).not.toBeInTheDocument();
  });
});

describe('DroneToken - Ability Source Visual Feedback', () => {
  const mockDroneWithAbility = {
    id: 'repair_drone_1',
    name: 'Repair Drone',
    image: '/images/repair.png',
    hull: 1,
    currentShields: 3,
    isExhausted: false,
    isMarked: false,
    isTeleporting: false,
    abilities: [{
      name: 'Hull Repair',
      type: 'ACTIVE',
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'SAME_LANE' },
      effect: { type: 'HEAL', value: 3 },
      cost: { energy: 1, exhausts: true }
    }]
  };

  const defaultProps = {
    drone: mockDroneWithAbility,
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

  it('should apply ability-source-glow class when isAbilitySource is true', () => {
    const { container } = render(
      <DroneToken {...defaultProps} isAbilitySource={true} />
    );

    // The ability source glow class should be applied somewhere in the component
    const glowElement = container.querySelector('.ability-source-glow');
    expect(glowElement).toBeInTheDocument();
  });

  it('should NOT apply ability-source-glow class when isAbilitySource is false', () => {
    const { container } = render(
      <DroneToken {...defaultProps} isAbilitySource={false} />
    );

    const glowElement = container.querySelector('.ability-source-glow');
    expect(glowElement).not.toBeInTheDocument();
  });

  it('should NOT apply ability-source-glow class when isAbilitySource is not provided', () => {
    const { container } = render(
      <DroneToken {...defaultProps} />
    );

    const glowElement = container.querySelector('.ability-source-glow');
    expect(glowElement).not.toBeInTheDocument();
  });
});
