/**
 * DroneToken.tokenStyling.test.jsx
 * TDD tests: token drones should render with desaturated styling
 * (bg-slate-600 / bg-stone-700) instead of normal drone colors.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import DroneToken from '../DroneToken.jsx';

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
        maxShields: 1
      })
    })
  };
});

vi.mock('../../../contexts/EditorStatsContext.jsx', () => ({
  useEditorStats: () => null
}));

describe('DroneToken - Token Styling', () => {
  const baseDrone = {
    id: 'test_drone_1',
    name: 'Dart',
    image: '/images/scout.png',
    hull: 2,
    currentShields: 1,
    isExhausted: false,
    isMarked: false,
    isTeleporting: false
  };

  const defaultProps = {
    drone: baseDrone,
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
    localPlayerState: { energy: 5 }
  };

  it('renders token drone with desaturated name bar (bg-slate-600) when isToken is true on instance', () => {
    const tokenDrone = { ...baseDrone, isToken: true };
    const { container } = render(
      <DroneToken {...defaultProps} drone={tokenDrone} isPlayer={true} />
    );

    // The name bar div has the nameBgColor class applied
    const nameBar = container.querySelector('.bg-slate-600');
    expect(nameBar).not.toBeNull();

    // Should NOT have the normal drone background
    const normalBar = container.querySelector('.bg-cyan-900');
    expect(normalBar).toBeNull();
  });

  it('renders normal drone with standard name bar (bg-cyan-900) when isToken is absent', () => {
    const { container } = render(
      <DroneToken {...defaultProps} isPlayer={true} />
    );

    const normalBar = container.querySelector('.bg-cyan-900');
    expect(normalBar).not.toBeNull();

    const tokenBar = container.querySelector('.bg-slate-600');
    expect(tokenBar).toBeNull();
  });
});
