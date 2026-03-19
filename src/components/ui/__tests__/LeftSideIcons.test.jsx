/**
 * LeftSideIcons.test.jsx
 * Tests for the unified left-side icon stack component.
 *
 * Verifies:
 * 1. Priority ordering (Marked → Rapid → Assault → Passive → Inert)
 * 2. Overflow: max 3 visible, then +X badge
 * 3. Individual icon rendering and used/available states
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import LeftSideIcons from '../LeftSideIcons.jsx';

// Mock fullDroneCollection
vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'Blitz',
      abilities: [{ keywordIcon: 'RAPID', name: 'Rapid Response' }]
    },
    {
      name: 'Striker',
      abilities: [{ keywordIcon: 'ASSAULT', name: 'Assault Protocol' }]
    },
    {
      name: 'Tempest',
      abilities: [
        { keywordIcon: 'RAPID', name: 'Rapid Response' },
        { keywordIcon: 'ASSAULT', name: 'Assault Protocol' }
      ]
    },
    {
      name: 'Scout',
      abilities: []
    }
  ]
}));

const baseProps = {
  effectiveStats: { keywords: new Set() },
  isPlayer: true,
};

describe('LeftSideIcons', () => {
  it('returns null when drone has no left-side icons', () => {
    const { container } = render(
      <LeftSideIcons {...baseProps} drone={{ name: 'Scout', triggerUsesMap: {}, isMarked: false }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Marked icon first (priority 1)', () => {
    const { container } = render(
      <LeftSideIcons
        {...baseProps}
        drone={{ name: 'Blitz', triggerUsesMap: {}, isMarked: true }}
      />
    );
    const children = container.querySelector('.flex.flex-col').children;
    // First child should be the marked-glow container
    expect(children[0].classList.contains('marked-glow')).toBe(true);
  });

  it('renders RAPID icon with blue color when available', () => {
    const { container } = render(
      <LeftSideIcons {...baseProps} drone={{ name: 'Blitz', triggerUsesMap: {}, isMarked: false }} />
    );
    expect(container.querySelector('.text-blue-400')).toBeInTheDocument();
  });

  it('renders RAPID icon greyed out when used', () => {
    const { container } = render(
      <LeftSideIcons {...baseProps} drone={{ name: 'Blitz', triggerUsesMap: { 'Rapid Response': 1 }, isMarked: false }} />
    );
    expect(container.querySelector('.text-slate-500')).toBeInTheDocument();
  });

  it('renders ASSAULT icon with red color when available', () => {
    const { container } = render(
      <LeftSideIcons {...baseProps} drone={{ name: 'Striker', triggerUsesMap: {}, isMarked: false }} />
    );
    expect(container.querySelector('.text-red-400')).toBeInTheDocument();
  });

  it('shows overflow badge when more than 3 icons would display', () => {
    // Marked + Rapid + Assault + Passive = 4 icons → 2 visible + +2 badge
    const { container } = render(
      <LeftSideIcons
        {...baseProps}
        effectiveStats={{ keywords: new Set(['PASSIVE']) }}
        drone={{ name: 'Tempest', triggerUsesMap: {}, isMarked: true }}
      />
    );
    const stack = container.querySelector('.flex.flex-col');
    const children = [...stack.children];
    const overflowBadge = children.find(el => el.textContent.startsWith('+'));
    expect(overflowBadge).toBeTruthy();
    expect(overflowBadge.textContent).toBe('+2');
  });

  it('shows all 3 icons without overflow when exactly 3', () => {
    // Marked + Rapid + Assault = 3 icons → all visible, no badge
    const { container } = render(
      <LeftSideIcons
        {...baseProps}
        drone={{ name: 'Tempest', triggerUsesMap: {}, isMarked: true }}
      />
    );
    const stack = container.querySelector('.flex.flex-col');
    const children = [...stack.children];
    const overflowBadge = children.find(el => el.textContent.startsWith('+'));
    expect(overflowBadge).toBeFalsy();
    expect(children).toHaveLength(3);
  });

  it('uses opponent border colors when isPlayer is false', () => {
    const { container } = render(
      <LeftSideIcons
        {...baseProps}
        isPlayer={false}
        drone={{ name: 'Blitz', triggerUsesMap: {}, isMarked: false }}
      />
    );
    expect(container.querySelector('.border-red-500')).toBeInTheDocument();
  });
});
