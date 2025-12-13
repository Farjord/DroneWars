/**
 * DroneLanesDisplay.ability.test.jsx
 * TDD tests for passing ability mode state to DroneToken components
 *
 * These tests verify:
 * 1. isAbilitySource=true is passed to the drone that matches abilityMode.drone.id
 * 2. isAbilitySource=false is passed to other drones
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DroneLanesDisplay from './DroneLanesDisplay.jsx';

// Track props passed to DroneToken
let droneTokenProps = [];

// Mock DroneToken to capture the props it receives
vi.mock('./DroneToken.jsx', () => ({
  default: (props) => {
    droneTokenProps.push(props);
    return (
      <div
        data-testid={`drone-token-${props.drone.id}`}
        data-ability-source={props.isAbilitySource}
      >
        {props.drone.name}
      </div>
    );
  }
}));

vi.mock('../../hooks/useGameData.js', () => ({
  useGameData: () => ({
    getEffectiveStats: vi.fn()
  })
}));

describe('DroneLanesDisplay - Ability Mode Props', () => {
  const mockDrone1 = {
    id: 'repair_drone_1',
    name: 'Repair Drone',
    hull: 1,
    currentShields: 3,
    isExhausted: false
  };

  const mockDrone2 = {
    id: 'scout_drone_1',
    name: 'Scout Drone',
    hull: 1,
    currentShields: 1,
    isExhausted: false
  };

  const mockAbility = {
    name: 'Hull Repair',
    type: 'ACTIVE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'SAME_LANE' },
    effect: { type: 'HEAL', value: 3 },
    cost: { energy: 1, exhausts: true }
  };

  const defaultProps = {
    player: {
      dronesOnBoard: {
        lane1: [mockDrone1, mockDrone2],
        lane2: [],
        lane3: []
      }
    },
    isPlayer: true,
    onLaneClick: vi.fn(),
    getLocalPlayerId: () => 'player1',
    getOpponentPlayerId: () => 'player2',
    abilityMode: null,
    validAbilityTargets: [],
    selectedCard: null,
    validCardTargets: [],
    multiSelectState: null,
    turnPhase: 'action',
    localPlayerState: { energy: 5 },
    opponentPlayerState: { energy: 5 },
    localPlacedSections: [],
    opponentPlacedSections: [],
    gameEngine: {},
    getPlacedSectionsForEngine: vi.fn(),
    handleTokenClick: vi.fn(),
    handleAbilityIconClick: vi.fn(),
    selectedDrone: null,
    recentlyHitDrones: [],
    potentialInterceptors: [],
    potentialGuardians: [],
    droneRefs: { current: {} },
    mandatoryAction: null,
    setHoveredTarget: vi.fn(),
    interceptedBadge: null
  };

  beforeEach(() => {
    droneTokenProps = [];
  });

  it('should pass isAbilitySource=true to drone that matches abilityMode.drone.id', () => {
    const abilityMode = {
      drone: mockDrone1,
      ability: mockAbility
    };

    render(
      <DroneLanesDisplay
        {...defaultProps}
        abilityMode={abilityMode}
      />
    );

    // Find the props passed to the Repair Drone (the ability source)
    const repairDroneProps = droneTokenProps.find(p => p.drone.id === 'repair_drone_1');
    expect(repairDroneProps).toBeDefined();
    expect(repairDroneProps.isAbilitySource).toBe(true);
  });

  it('should pass isAbilitySource=false to drones that do NOT match abilityMode.drone.id', () => {
    const abilityMode = {
      drone: mockDrone1,
      ability: mockAbility
    };

    render(
      <DroneLanesDisplay
        {...defaultProps}
        abilityMode={abilityMode}
      />
    );

    // Find the props passed to the Scout Drone (not the ability source)
    const scoutDroneProps = droneTokenProps.find(p => p.drone.id === 'scout_drone_1');
    expect(scoutDroneProps).toBeDefined();
    expect(scoutDroneProps.isAbilitySource).toBe(false);
  });

  it('should pass isAbilitySource=false to all drones when abilityMode is null', () => {
    render(
      <DroneLanesDisplay
        {...defaultProps}
        abilityMode={null}
      />
    );

    // Both drones should have isAbilitySource=false
    const repairDroneProps = droneTokenProps.find(p => p.drone.id === 'repair_drone_1');
    const scoutDroneProps = droneTokenProps.find(p => p.drone.id === 'scout_drone_1');

    expect(repairDroneProps.isAbilitySource).toBe(false);
    expect(scoutDroneProps.isAbilitySource).toBe(false);
  });

  it('should render data-ability-source attribute correctly in DOM', () => {
    const abilityMode = {
      drone: mockDrone1,
      ability: mockAbility
    };

    render(
      <DroneLanesDisplay
        {...defaultProps}
        abilityMode={abilityMode}
      />
    );

    // Verify the DOM reflects the correct state
    const repairDroneElement = screen.getByTestId('drone-token-repair_drone_1');
    const scoutDroneElement = screen.getByTestId('drone-token-scout_drone_1');

    expect(repairDroneElement.getAttribute('data-ability-source')).toBe('true');
    expect(scoutDroneElement.getAttribute('data-ability-source')).toBe('false');
  });
});
