/**
 * DroneTooltipPanel.test.jsx
 * TDD tests for the DroneTooltipPanel component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Zap, ShieldCheck } from 'lucide-react';
import DroneTooltipPanel from '../DroneTooltipPanel.jsx';

// --- Helpers ---

const makeItem = (overrides = {}) => ({
  key: 'test-item',
  icon: <Zap size={16} data-testid="icon" />,
  label: 'Test Label',
  description: 'Test description text.',
  accentColor: 'border-red-500',
  ...overrides,
});

// --- Tests ---

describe('DroneTooltipPanel', () => {
  it('renders nothing when items array is empty', () => {
    const { container } = render(<DroneTooltipPanel items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when items is null', () => {
    const { container } = render(<DroneTooltipPanel items={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one toast per item', () => {
    const items = [
      makeItem({ key: 'a', label: 'Alpha' }),
      makeItem({ key: 'b', label: 'Beta' }),
      makeItem({ key: 'c', label: 'Charlie' }),
    ];
    render(<DroneTooltipPanel items={items} />);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('displays the correct label text for each toast', () => {
    const items = [makeItem({ key: 'guardian', label: 'Guardian' })];
    render(<DroneTooltipPanel items={items} />);
    expect(screen.getByText('Guardian')).toBeInTheDocument();
  });

  it('displays the correct description text for each toast', () => {
    const items = [makeItem({ key: 'x', description: 'Protects the ship.' })];
    render(<DroneTooltipPanel items={items} />);
    expect(screen.getByText('Protects the ship.')).toBeInTheDocument();
  });

  it('applies left-full positioning class when position is right', () => {
    const items = [makeItem()];
    const { container } = render(<DroneTooltipPanel items={items} position="right" />);
    const panel = container.firstChild;
    expect(panel.className).toContain('left-full');
  });

  it('applies right-full positioning class when position is left', () => {
    const items = [makeItem()];
    const { container } = render(<DroneTooltipPanel items={items} position="left" />);
    const panel = container.firstChild;
    expect(panel.className).toContain('right-full');
  });

  it('container has pointer-events-none class', () => {
    const items = [makeItem()];
    const { container } = render(<DroneTooltipPanel items={items} />);
    const panel = container.firstChild;
    expect(panel.className).toContain('pointer-events-none');
  });

  it('container has drone-tooltip-container class', () => {
    const items = [makeItem()];
    const { container } = render(<DroneTooltipPanel items={items} />);
    const panel = container.firstChild;
    expect(panel.className).toContain('drone-tooltip-container');
  });

  it('container has z-[45] class', () => {
    const items = [makeItem()];
    const { container } = render(<DroneTooltipPanel items={items} />);
    const panel = container.firstChild;
    expect(panel.className).toContain('z-[45]');
  });
});
