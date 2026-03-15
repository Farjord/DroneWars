import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HealthBar from '../HealthBar';


describe('HealthBar', () => {
  it('renders correct number of filled and empty segments', () => {
    render(<HealthBar current={7} max={10} side="player" />);
    const filled = screen.getAllByTestId('health-segment-filled');
    const empty = screen.getAllByTestId('health-segment-empty');
    expect(filled).toHaveLength(7);
    expect(empty).toHaveLength(3);
  });

  it('displays health number as current/max', () => {
    render(<HealthBar current={5} max={20} side="opponent" />);
    expect(screen.getByText('5/20')).toBeTruthy();
  });

  it('renders all segments empty when current is 0', () => {
    render(<HealthBar current={0} max={10} side="player" />);
    const filled = screen.queryAllByTestId('health-segment-filled');
    const empty = screen.getAllByTestId('health-segment-empty');
    expect(filled).toHaveLength(0);
    expect(empty).toHaveLength(10);
  });

  it('renders all segments filled when current equals max', () => {
    render(<HealthBar current={15} max={15} side="opponent" />);
    const filled = screen.getAllByTestId('health-segment-filled');
    const empty = screen.queryAllByTestId('health-segment-empty');
    expect(filled).toHaveLength(15);
    expect(empty).toHaveLength(0);
  });

  it('caps segments at 30 even if max exceeds 30', () => {
    render(<HealthBar current={40} max={50} side="player" />);
    const filled = screen.getAllByTestId('health-segment-filled');
    const empty = screen.getAllByTestId('health-segment-empty');
    // 40/50 = 80%, so 24 of 30 filled, 6 empty
    expect(filled).toHaveLength(24);
    expect(empty).toHaveLength(6);
  });

  it('opponent side: number appears before bar in DOM', () => {
    const { container } = render(
      <HealthBar current={5} max={10} side="opponent" />
    );
    const contentRow = container.querySelector('[data-testid="health-bar-content"]');
    const children = Array.from(contentRow.children);
    const numberIdx = children.findIndex(el => el.dataset.testid === 'health-number');
    const barIdx = children.findIndex(el => el.dataset.testid === 'health-segments');
    expect(numberIdx).toBeLessThan(barIdx);
  });

  it('player side: number appears before bar in DOM', () => {
    const { container } = render(
      <HealthBar current={5} max={10} side="player" />
    );
    const contentRow = container.querySelector('[data-testid="health-bar-content"]');
    const children = Array.from(contentRow.children);
    const numberIdx = children.findIndex(el => el.dataset.testid === 'health-number');
    const barIdx = children.findIndex(el => el.dataset.testid === 'health-segments');
    expect(numberIdx).toBeLessThan(barIdx);
  });
});
