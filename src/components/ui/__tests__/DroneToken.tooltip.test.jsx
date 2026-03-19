/**
 * DroneToken.tooltip.test.jsx
 * TDD tests for tooltip integration into DroneToken.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import DroneToken from '../DroneToken.jsx';

// Mock useGameData with keywords support
vi.mock('../../../hooks/useGameData.js', async () => {
  let _keywords = new Set();
  return {
    useGameData: () => ({
      getEffectiveStats: () => ({
        attack: 2,
        speed: 3,
        baseAttack: 2,
        baseSpeed: 3,
        maxShields: 1,
        keywords: _keywords,
      }),
    }),
    GameDataProvider: ({ children }) => children,
    __setKeywords: (kw) => { _keywords = kw; },
  };
});

vi.mock('../../../contexts/EditorStatsContext.jsx', () => ({
  useEditorStats: () => null,
}));

// Helper to get the mock's keyword setter
const getKeywordSetter = async () => {
  const mod = await import('../../../hooks/useGameData.js');
  return mod.__setKeywords;
};

const baseDrone = {
  id: 'test_drone_1',
  name: 'Dart',
  image: '/images/scout.png',
  hull: 2,
  currentShields: 1,
  isExhausted: false,
  isMarked: false,
  isTeleporting: false,
  cannotAttack: false,
  cannotMove: false,
  cannotIntercept: false,
  isSnared: false,
  isSuppressed: false,
  doesNotReady: false,
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
  localPlayerState: { energy: 5 },
};

describe('DroneToken - Tooltip Integration', () => {
  it('does NOT render tooltip container when drone has no effects/keywords/damageType', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set());

    const { container } = render(<DroneToken {...defaultProps} />);
    const tooltipContainer = container.querySelector('.drone-tooltip-container');
    expect(tooltipContainer).toBeNull();
  });

  it('renders tooltip container when drone has cannotAttack', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set());

    const drone = { ...baseDrone, cannotAttack: true };
    const { container } = render(<DroneToken {...defaultProps} drone={drone} />);
    const tooltipContainer = container.querySelector('.drone-tooltip-container');
    expect(tooltipContainer).not.toBeNull();
  });

  it('renders tooltip with ion item when drone has damageType ION', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set());

    const drone = { ...baseDrone, damageType: 'ION' };
    const { container } = render(<DroneToken {...defaultProps} drone={drone} />);
    const tooltipContainer = container.querySelector('.drone-tooltip-container');
    expect(tooltipContainer).not.toBeNull();
    expect(tooltipContainer.textContent).toContain('Ion Damage');
  });

  it('renders tooltip with guardian item when keywords include GUARDIAN', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set(['GUARDIAN']));

    const { container } = render(<DroneToken {...defaultProps} />);
    const tooltipContainer = container.querySelector('.drone-tooltip-container');
    expect(tooltipContainer).not.toBeNull();
    expect(tooltipContainer.textContent).toContain('Guardian');
  });

  it('passes position=left when lane is lane3', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set());

    const drone = { ...baseDrone, cannotAttack: true };
    const { container } = render(
      <DroneToken {...defaultProps} drone={drone} lane="lane3" />
    );
    const tooltipContainer = container.querySelector('.drone-tooltip-container');
    expect(tooltipContainer.className).toContain('right-full');
  });

  it('passes position=right when lane is lane1', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set());

    const drone = { ...baseDrone, cannotAttack: true };
    const { container } = render(
      <DroneToken {...defaultProps} drone={drone} lane="lane1" />
    );
    const tooltipContainer = container.querySelector('.drone-tooltip-container');
    expect(tooltipContainer.className).toContain('left-full');
  });

  it('outer div has data-drone-token attribute', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set());

    const { container } = render(<DroneToken {...defaultProps} />);
    const outerDiv = container.firstChild;
    expect(outerDiv.hasAttribute('data-drone-token')).toBe(true);
  });

  it('outer div has data-dragging="true" when isDragging is true', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set());

    const { container } = render(<DroneToken {...defaultProps} isDragging={true} />);
    const outerDiv = container.firstChild;
    expect(outerDiv.getAttribute('data-dragging')).toBe('true');
  });

  it('outer div does NOT have data-dragging when not dragging', async () => {
    const setKeywords = await getKeywordSetter();
    setKeywords(new Set());

    const { container } = render(<DroneToken {...defaultProps} isDragging={false} />);
    const outerDiv = container.firstChild;
    expect(outerDiv.hasAttribute('data-dragging')).toBe(false);
  });
});
