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

describe('DroneToken - Interceptor Glow Colors', () => {
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

  describe('player interceptor (cyan glow)', () => {
    it('should apply cyan card glow class when isPlayer=true and isPotentialInterceptor=true', () => {
      const { container } = render(
        <DroneToken
          {...defaultProps}
          isPlayer={true}
          isPotentialInterceptor={true}
        />
      );

      // Main token body should have cyan glow class
      const tokenBody = container.querySelector('.interceptor-card-glow-cyan');
      expect(tokenBody).toBeInTheDocument();
    });

    it('should apply cyan hex glow class when isPlayer=true and isPotentialInterceptor=true', () => {
      const { container } = render(
        <DroneToken
          {...defaultProps}
          isPlayer={true}
          isPotentialInterceptor={true}
        />
      );

      // Speed hexagon should have cyan glow class
      const hexGlow = container.querySelector('.interceptor-glow-cyan');
      expect(hexGlow).toBeInTheDocument();
    });

    it('should NOT apply yellow/orange glow class when isPlayer=true', () => {
      const { container } = render(
        <DroneToken
          {...defaultProps}
          isPlayer={true}
          isPotentialInterceptor={true}
        />
      );

      // Should NOT have the opponent (yellow) glow classes
      const yellowCardGlow = container.querySelector('.interceptor-card-glow:not(.interceptor-card-glow-cyan)');
      const yellowHexGlow = container.querySelector('.interceptor-glow:not(.interceptor-glow-cyan)');
      expect(yellowCardGlow).not.toBeInTheDocument();
      expect(yellowHexGlow).not.toBeInTheDocument();
    });
  });

  describe('opponent interceptor (yellow/orange glow)', () => {
    it('should apply yellow/orange card glow class when isPlayer=false and isPotentialInterceptor=true', () => {
      const { container } = render(
        <DroneToken
          {...defaultProps}
          isPlayer={false}
          isPotentialInterceptor={true}
        />
      );

      // Main token body should have yellow/orange glow class (not cyan)
      const tokenBody = container.querySelector('.interceptor-card-glow');
      expect(tokenBody).toBeInTheDocument();
      expect(tokenBody).not.toHaveClass('interceptor-card-glow-cyan');
    });

    it('should apply yellow/orange hex glow class when isPlayer=false and isPotentialInterceptor=true', () => {
      const { container } = render(
        <DroneToken
          {...defaultProps}
          isPlayer={false}
          isPotentialInterceptor={true}
        />
      );

      // Speed hexagon should have yellow/orange glow class (not cyan)
      const hexGlow = container.querySelector('.interceptor-glow');
      expect(hexGlow).toBeInTheDocument();
      expect(hexGlow).not.toHaveClass('interceptor-glow-cyan');
    });

    it('should NOT apply cyan glow class when isPlayer=false', () => {
      const { container } = render(
        <DroneToken
          {...defaultProps}
          isPlayer={false}
          isPotentialInterceptor={true}
        />
      );

      // Should NOT have cyan glow classes
      const cyanCardGlow = container.querySelector('.interceptor-card-glow-cyan');
      const cyanHexGlow = container.querySelector('.interceptor-glow-cyan');
      expect(cyanCardGlow).not.toBeInTheDocument();
      expect(cyanHexGlow).not.toBeInTheDocument();
    });
  });

  describe('no interceptor glow when isPotentialInterceptor=false', () => {
    it('should NOT apply any interceptor glow when isPotentialInterceptor=false (player)', () => {
      const { container } = render(
        <DroneToken
          {...defaultProps}
          isPlayer={true}
          isPotentialInterceptor={false}
        />
      );

      const anyCardGlow = container.querySelector('[class*="interceptor-card-glow"]');
      const anyHexGlow = container.querySelector('[class*="interceptor-glow"]');
      expect(anyCardGlow).not.toBeInTheDocument();
      expect(anyHexGlow).not.toBeInTheDocument();
    });

    it('should NOT apply any interceptor glow when isPotentialInterceptor=false (opponent)', () => {
      const { container } = render(
        <DroneToken
          {...defaultProps}
          isPlayer={false}
          isPotentialInterceptor={false}
        />
      );

      const anyCardGlow = container.querySelector('[class*="interceptor-card-glow"]');
      const anyHexGlow = container.querySelector('[class*="interceptor-glow"]');
      expect(anyCardGlow).not.toBeInTheDocument();
      expect(anyHexGlow).not.toBeInTheDocument();
    });
  });
});
