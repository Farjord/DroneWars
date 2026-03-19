/**
 * DroneToken.zIndex.test.jsx
 * TDD tests: z-index layering so source drone renders above TargetingArrow (z-100)
 * but below FloatingDragCard (z-200).
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

describe('DroneToken - z-index layering', () => {
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

  it('isDragging drone should have z-[150] class (above TargetingArrow z-100)', () => {
    const { container } = render(
      <DroneToken {...defaultProps} isDragging={true} />
    );
    const outer = container.firstChild;
    expect(outer.className).toContain('z-[150]');
    expect(outer.className).not.toContain('z-50');
  });

  it('isSelected drone should have z-[150] class (above TargetingArrow z-100)', () => {
    const { container } = render(
      <DroneToken {...defaultProps} isSelected={true} />
    );
    const outer = container.firstChild;
    expect(outer.className).toContain('z-[150]');
    expect(outer.className).not.toContain('z-50');
  });

  it('normal drone should have z-10 class', () => {
    const { container } = render(
      <DroneToken {...defaultProps} />
    );
    const outer = container.firstChild;
    expect(outer.className).toContain('z-10');
  });

  it('elevated drone should have z-20 class', () => {
    const { container } = render(
      <DroneToken {...defaultProps} isElevated={true} />
    );
    const outer = container.firstChild;
    expect(outer.className).toContain('z-20');
  });
});
