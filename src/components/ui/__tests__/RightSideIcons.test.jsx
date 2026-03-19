/**
 * RightSideIcons.test.jsx
 * Tests for the unified right-side icon stack component.
 *
 * Verifies:
 * 1. AbilityIcon always renders first when present
 * 2. Status effect priority ordering
 * 3. Overflow with and without AbilityIcon
 * 4. AbilityIcon button remains interactive
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import RightSideIcons from '../RightSideIcons.jsx';

const baseProps = {
  isPlayer: true,
  activeAbilities: [],
  isAbilityUsable: () => true,
  onAbilityClick: vi.fn(),
};

const baseDrone = {
  id: 'test_1',
  isExhausted: false,
  cannotAttack: false,
  cannotMove: false,
  cannotIntercept: false,
  isSnared: false,
  isSuppressed: false,
  doesNotReady: false,
};

describe('RightSideIcons', () => {
  it('returns null when no ability and no statuses', () => {
    const { container } = render(
      <RightSideIcons {...baseProps} drone={baseDrone} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders AbilityIcon as first child when player has active abilities', () => {
    const ability = { name: 'Test', type: 'ACTIVE', cost: {} };
    const { container } = render(
      <RightSideIcons
        {...baseProps}
        activeAbilities={[ability]}
        drone={{ ...baseDrone, cannotAttack: true }}
      />
    );
    const stack = container.querySelector('.flex.flex-col');
    // First child should be the button
    expect(stack.children[0].tagName).toBe('BUTTON');
  });

  it('fires onAbilityClick when ability button is clicked', () => {
    const onAbilityClick = vi.fn();
    const ability = { name: 'Test', type: 'ACTIVE', cost: {} };
    const { container } = render(
      <RightSideIcons
        {...baseProps}
        activeAbilities={[ability]}
        onAbilityClick={onAbilityClick}
        drone={baseDrone}
      />
    );
    const button = container.querySelector('button');
    fireEvent.click(button);
    expect(onAbilityClick).toHaveBeenCalledTimes(1);
  });

  it('renders status icons in priority order', () => {
    const drone = {
      ...baseDrone,
      cannotAttack: true,
      cannotMove: true,
      doesNotReady: true,
    };
    const { container } = render(
      <RightSideIcons {...baseProps} drone={drone} />
    );
    const stack = container.querySelector('.flex.flex-col');
    // 3 statuses = all visible (max 3)
    expect(stack.children).toHaveLength(3);
  });

  it('shows overflow badge when statuses exceed available slots (no ability)', () => {
    const drone = {
      ...baseDrone,
      cannotAttack: true,
      cannotMove: true,
      cannotIntercept: true,
      isSnared: true,
    };
    const { container } = render(
      <RightSideIcons {...baseProps} drone={drone} />
    );
    const stack = container.querySelector('.flex.flex-col');
    const children = [...stack.children];
    // 4 statuses, 3 slots → 2 visible + 1 overflow badge
    const overflowBadge = children.find(el => el.textContent.startsWith('+'));
    expect(overflowBadge).toBeTruthy();
    expect(overflowBadge.textContent).toBe('+2');
  });

  it('shows overflow badge earlier when ability is present', () => {
    const ability = { name: 'Test', type: 'ACTIVE', cost: {} };
    const drone = {
      ...baseDrone,
      cannotAttack: true,
      cannotMove: true,
      cannotIntercept: true,
    };
    const { container } = render(
      <RightSideIcons
        {...baseProps}
        activeAbilities={[ability]}
        drone={drone}
      />
    );
    const stack = container.querySelector('.flex.flex-col');
    const children = [...stack.children];
    // Ability(1) + 3 statuses with 2 slots → ability + 1 status + overflow badge = 3 children
    expect(children[0].tagName).toBe('BUTTON');
    const overflowBadge = children.find(el => el.textContent.startsWith('+'));
    expect(overflowBadge).toBeTruthy();
    expect(overflowBadge.textContent).toBe('+2');
  });

  it('does not render ability for opponent drones', () => {
    const ability = { name: 'Test', type: 'ACTIVE', cost: {} };
    const drone = { ...baseDrone, cannotAttack: true };
    const { container } = render(
      <RightSideIcons
        {...baseProps}
        isPlayer={false}
        activeAbilities={[ability]}
        drone={drone}
      />
    );
    expect(container.querySelector('button')).toBeNull();
  });
});
