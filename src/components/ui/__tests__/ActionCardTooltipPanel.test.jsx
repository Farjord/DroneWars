/**
 * ActionCardTooltipPanel.test.jsx
 * TDD tests for the ActionCardTooltipPanel component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Zap } from 'lucide-react';
import ActionCardTooltipPanel from '../ActionCardTooltipPanel.jsx';

// --- Helpers ---

const makeItem = (overrides = {}) => ({
  key: 'test-item',
  icon: <Zap size={14} data-testid="icon" />,
  label: 'Test Label',
  description: 'Test description text.',
  accentColor: 'border-amber-400',
  ...overrides,
});

// --- Tests ---

describe('ActionCardTooltipPanel', () => {
  it('renders nothing when items array is empty', () => {
    const { container } = render(<ActionCardTooltipPanel items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when items is null', () => {
    const { container } = render(<ActionCardTooltipPanel items={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when items is undefined', () => {
    const { container } = render(<ActionCardTooltipPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one toast per item with correct label and description text', () => {
    const items = [
      makeItem({ key: 'item-1', label: 'First Label', description: 'First desc' }),
      makeItem({ key: 'item-2', label: 'Second Label', description: 'Second desc' }),
    ];
    render(<ActionCardTooltipPanel items={items} visible={true} />);
    expect(screen.getByText('First Label')).toBeDefined();
    expect(screen.getByText('First desc')).toBeDefined();
    expect(screen.getByText('Second Label')).toBeDefined();
    expect(screen.getByText('Second desc')).toBeDefined();
  });

  it('defaults to right positioning when no position prop', () => {
    const items = [makeItem()];
    const { container } = render(<ActionCardTooltipPanel items={items} visible={true} />);
    const panel = container.firstChild;
    expect(panel.className).toContain('left-full');
    expect(panel.className).toContain('ml-1');
    expect(panel.style.transformOrigin).toBe('top left');
  });

  it('positions to the left when position="left"', () => {
    const items = [makeItem()];
    const { container } = render(<ActionCardTooltipPanel items={items} visible={true} position="left" />);
    const panel = container.firstChild;
    expect(panel.className).toContain('right-full');
    expect(panel.className).toContain('mr-1');
    expect(panel.style.transformOrigin).toBe('top right');
  });

  it('has pointer-events-none class on container', () => {
    const items = [makeItem()];
    const { container } = render(<ActionCardTooltipPanel items={items} visible={true} />);
    const panel = container.firstChild;
    expect(panel.className).toContain('pointer-events-none');
  });

  it('has action-card-tooltip-container class on container', () => {
    const items = [makeItem()];
    const { container } = render(<ActionCardTooltipPanel items={items} visible={true} />);
    const panel = container.firstChild;
    expect(panel.className).toContain('action-card-tooltip-container');
  });

  it('has visible class when visible prop is true', () => {
    const items = [makeItem()];
    const { container } = render(<ActionCardTooltipPanel items={items} visible={true} />);
    const panel = container.firstChild;
    expect(panel.className).toContain('visible');
  });

  it('does NOT have visible class when visible prop is false', () => {
    const items = [makeItem()];
    const { container } = render(<ActionCardTooltipPanel items={items} visible={false} />);
    const panel = container.firstChild;
    expect(panel.className).not.toContain('visible');
  });
});
