import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import ActionCard from '../ActionCard.jsx';

// Mock useCardTilt to avoid DOM measurement issues in tests
vi.mock('../../../hooks/useCardTilt.js', () => ({
  default: () => ({ current: null }),
}));

const baseCard = {
  id: 'TEST_CARD',
  name: 'Test Card',
  cost: 3,
  type: 'Ordnance',
  rarity: 'Common',
  image: '/test.png',
  description: 'Deal 4 damage to target drone.',
};

describe('ActionCard diffHighlights', () => {
  test('without diffHighlights, cost renders in white (default)', () => {
    const { container } = render(<ActionCard card={baseCard} isPlayable={true} />);
    // Find the energy cost span (the one next to the Power icon)
    const costSpans = container.querySelectorAll('.text-white.font-bold.text-sm');
    const costSpan = Array.from(costSpans).find(el => el.textContent === '3');
    expect(costSpan).toBeTruthy();
    expect(costSpan.classList.contains('text-orange-400')).toBe(false);
  });

  test('with diffHighlights.cost = true, cost number has text-orange-400', () => {
    const diffHighlights = { cost: true, slots: false, descriptionNode: null };
    const { container } = render(<ActionCard card={baseCard} isPlayable={true} diffHighlights={diffHighlights} />);
    const costSpans = container.querySelectorAll('.text-orange-400.font-bold.text-sm');
    const costSpan = Array.from(costSpans).find(el => el.textContent === '3');
    expect(costSpan).toBeTruthy();
  });

  test('with diffHighlights.cost = false, cost stays white', () => {
    const diffHighlights = { cost: false, slots: false, descriptionNode: null };
    const { container } = render(<ActionCard card={baseCard} isPlayable={true} diffHighlights={diffHighlights} />);
    const costSpans = container.querySelectorAll('.text-white.font-bold.text-sm');
    const costSpan = Array.from(costSpans).find(el => el.textContent === '3');
    expect(costSpan).toBeTruthy();
  });

  test('with diffHighlights.descriptionNode, description renders the node content', () => {
    const descNode = [
      <span key={0}>Deal </span>,
      <span key={1} className="text-orange-400">5</span>,
      <span key={2}> damage to target drone.</span>,
    ];
    const diffHighlights = { cost: false, slots: false, descriptionNode: descNode };
    const { container } = render(<ActionCard card={baseCard} isPlayable={true} diffHighlights={diffHighlights} />);
    // The orange "5" should be in the DOM
    const orangeSpan = container.querySelector('.text-orange-400');
    expect(orangeSpan).toBeTruthy();
    expect(orangeSpan.textContent).toBe('5');
  });

  test('without diffHighlights, description renders plain text', () => {
    const { container } = render(<ActionCard card={baseCard} isPlayable={true} />);
    // No orange spans should exist in the description
    const descSection = container.querySelector('.bg-black\\/80');
    const orangeSpans = descSection?.querySelectorAll('.text-orange-400');
    expect(orangeSpans?.length ?? 0).toBe(0);
  });

  test('with diffHighlights.slots = true on Upgrade card, slot cost has text-orange-400', () => {
    const upgradeCard = {
      ...baseCard,
      id: 'UPGRADE_CARD',
      type: 'Upgrade',
      slots: 2,
    };
    const diffHighlights = { cost: false, slots: true, descriptionNode: null };
    const { container } = render(<ActionCard card={upgradeCard} isPlayable={true} diffHighlights={diffHighlights} />);
    // Find the slot cost text — should be orange instead of purple
    const slotSpan = Array.from(container.querySelectorAll('span')).find(
      el => el.textContent.includes('Slot Cost:')
    );
    expect(slotSpan).toBeTruthy();
    expect(slotSpan.classList.contains('text-orange-400')).toBe(true);
    expect(slotSpan.classList.contains('text-purple-400')).toBe(false);
  });

  test('with diffHighlights.slots = false on Upgrade card, slot cost stays purple', () => {
    const upgradeCard = {
      ...baseCard,
      id: 'UPGRADE_CARD',
      type: 'Upgrade',
      slots: 2,
    };
    const diffHighlights = { cost: false, slots: false, descriptionNode: null };
    const { container } = render(<ActionCard card={upgradeCard} isPlayable={true} diffHighlights={diffHighlights} />);
    const slotSpan = Array.from(container.querySelectorAll('span')).find(
      el => el.textContent.includes('Slot Cost:')
    );
    expect(slotSpan).toBeTruthy();
    expect(slotSpan.classList.contains('text-purple-400')).toBe(true);
  });
});
