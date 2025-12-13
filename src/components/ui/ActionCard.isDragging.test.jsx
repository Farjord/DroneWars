// ========================================
// ACTION CARD isDragging VISUAL FEEDBACK TESTS
// ========================================
// TDD tests for positive visual feedback when dragging action cards

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActionCard from './ActionCard.jsx';

// Mock the image loading
vi.mock('../../services/assetService', () => ({
  getAssetPath: (path) => path
}));

describe('ActionCard isDragging visual feedback', () => {
  const mockCard = {
    id: 'CARD001',
    instanceId: 'CARD001-inst-1',
    name: 'Laser Blast',
    cost: 2,
    type: 'Ordnance',
    targeting: { type: 'DRONE', affinity: 'ANY' },
    effect: { type: 'DAMAGE', amount: 2 },
    image: '/cards/laser-blast.png',
    description: 'Deal 2 damage to target drone'
  };

  it('should apply positive glow styling when isDragging is true', () => {
    const { container } = render(
      <ActionCard
        card={mockCard}
        isDragging={true}
        isPlayable={true}
      />
    );

    // The outer card element should have positive feedback classes (cyan glow)
    const cardElement = container.firstChild;
    expect(cardElement.className).toContain('ring-2');
    expect(cardElement.className).toContain('ring-cyan-400');
    expect(cardElement.className).toContain('shadow-lg');
    expect(cardElement.className).toContain('shadow-cyan-500/50');
  });

  it('should NOT apply negative styling (opacity/scale reduction) when isDragging is true', () => {
    const { container } = render(
      <ActionCard
        card={mockCard}
        isDragging={true}
        isPlayable={true}
      />
    );

    const cardElement = container.firstChild;
    // Should NOT have the old negative styling
    expect(cardElement.className).not.toContain('opacity-50');
    expect(cardElement.className).not.toContain('scale-95');
  });

  it('should NOT apply glow styling when isDragging is false', () => {
    const { container } = render(
      <ActionCard
        card={mockCard}
        isDragging={false}
        isPlayable={true}
      />
    );

    const cardElement = container.firstChild;
    expect(cardElement.className).not.toContain('ring-cyan-400');
    expect(cardElement.className).not.toContain('shadow-cyan-500/50');
  });

  it('should NOT apply glow styling by default (isDragging undefined)', () => {
    const { container } = render(
      <ActionCard
        card={mockCard}
        isPlayable={true}
      />
    );

    const cardElement = container.firstChild;
    expect(cardElement.className).not.toContain('ring-cyan-400');
    expect(cardElement.className).not.toContain('shadow-cyan-500/50');
  });
});

describe('ActionCard onClick guards', () => {
  const mockCard = {
    id: 'CARD001',
    instanceId: 'CARD001-inst-1',
    name: 'Laser Blast',
    cost: 2,
    type: 'Ordnance',
    targeting: { type: 'DRONE', affinity: 'ANY' },
    effect: { type: 'DAMAGE', amount: 2 },
    image: '/cards/laser-blast.png',
    description: 'Deal 2 damage to target drone'
  };

  it('should NOT call onClick when isDragging is true', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <ActionCard
        card={mockCard}
        isDragging={true}
        isPlayable={true}
        onClick={mockOnClick}
      />
    );

    fireEvent.click(container.firstChild);

    // onClick should NOT be called when isDragging is true (drag in progress)
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should NOT throw when onClick is null', () => {
    const { container } = render(
      <ActionCard
        card={mockCard}
        isDragging={false}
        isPlayable={true}
        onClick={null}
      />
    );

    // Should not throw when onClick is null
    expect(() => {
      fireEvent.click(container.firstChild);
    }).not.toThrow();
  });

  it('should call onClick when isPlayable and not dragging', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <ActionCard
        card={mockCard}
        isDragging={false}
        isPlayable={true}
        onClick={mockOnClick}
      />
    );

    fireEvent.click(container.firstChild);

    // onClick should be called when not dragging and playable
    expect(mockOnClick).toHaveBeenCalledWith(mockCard);
  });
});
