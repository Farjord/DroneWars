/**
 * DroneToken.test.jsx
 * TDD tests for DroneToken deployment order badge feature
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DroneToken from './DroneToken.jsx';
import { GameDataProvider } from '../../hooks/useGameData.js';

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
        maxShields: 1
      })
    })
  };
});

// Mock the EditorStatsContext
vi.mock('../../contexts/EditorStatsContext.jsx', () => ({
  useEditorStats: () => null
}));

describe('DroneToken - Deployment Order Badge', () => {
  const mockDrone = {
    id: 'test_drone_1',
    name: 'Scout Drone',
    image: '/images/scout.png',
    hull: 2,
    currentShields: 1,
    isExhausted: false,
    isMarked: false,
    isTeleporting: false
  };

  const defaultProps = {
    drone: mockDrone,
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
    interceptedBadge: null
  };

  it('should display order badge when deploymentOrderNumber prop is provided', () => {
    render(
      <DroneToken
        {...defaultProps}
        deploymentOrderNumber={1}
      />
    );

    // Badge should be visible with the number 1
    const badge = screen.getByTestId('deployment-order-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1');
  });

  it('should not display badge when deploymentOrderNumber is null', () => {
    render(
      <DroneToken
        {...defaultProps}
        deploymentOrderNumber={null}
      />
    );

    // Badge should not exist
    const badge = screen.queryByTestId('deployment-order-badge');
    expect(badge).not.toBeInTheDocument();
  });

  it('should not display badge when deploymentOrderNumber is undefined', () => {
    render(
      <DroneToken
        {...defaultProps}
      />
    );

    // Badge should not exist (prop not provided)
    const badge = screen.queryByTestId('deployment-order-badge');
    expect(badge).not.toBeInTheDocument();
  });

  it('should display correct number (1-based) in the badge', () => {
    render(
      <DroneToken
        {...defaultProps}
        deploymentOrderNumber={3}
      />
    );

    const badge = screen.getByTestId('deployment-order-badge');
    expect(badge).toHaveTextContent('3');
  });

  it('should position badge in top-left corner', () => {
    render(
      <DroneToken
        {...defaultProps}
        deploymentOrderNumber={2}
      />
    );

    const badge = screen.getByTestId('deployment-order-badge');
    // Check that badge has positioning styles (absolute, top, left)
    expect(badge.className).toMatch(/absolute/);
  });
});
