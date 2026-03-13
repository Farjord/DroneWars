// ========================================
// TECH SLOTS ACTION CARD DROP TESTS
// ========================================
// TDD tests for action card targeting via drag-and-drop onto tech slots

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TechSlots from '../TechSlots.jsx';

vi.mock('../../../data/techData.js', () => ({
  default: [{
    name: 'Shield Generator',
    abilities: [{ name: 'Shield Boost', usesPerRound: 1 }]
  }]
}));

describe('TechSlots action card drop', () => {
  const mockTechDrone = {
    id: 'tech-1',
    name: 'Shield Generator',
    image: '/test-tech.png',
  };

  const mockActionCard = {
    id: 'SYSTEM_PURGE',
    instanceId: 'SYSTEM_PURGE-inst-1',
    name: 'System Purge',
    cost: 3,
    type: 'Ordnance',
    targeting: { type: 'TECH', affinity: 'OPPONENT' },
    effect: { type: 'DESTROY_TECH' }
  };

  const defaultProps = {
    faction: 'opponent',
    techDrones: [mockTechDrone],
    highlightedSlots: [],
    onTechClick: vi.fn(),
  };

  describe('drop detection', () => {
    it('should call onActionCardDrop on mouseUp when draggedActionCard is set', () => {
      const mockOnActionCardDrop = vi.fn();
      render(
        <TechSlots
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard }}
          onActionCardDrop={mockOnActionCardDrop}
          owner="player2"
        />
      );

      const techElement = document.querySelector('[data-drone-id="tech-1"]');
      fireEvent.mouseUp(techElement);

      expect(mockOnActionCardDrop).toHaveBeenCalledWith(
        mockTechDrone,
        'tech',
        'player2'
      );
    });

    it('should pass correct owner prop through to callback', () => {
      const mockOnActionCardDrop = vi.fn();
      render(
        <TechSlots
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard }}
          onActionCardDrop={mockOnActionCardDrop}
          owner="player1"
        />
      );

      const techElement = document.querySelector('[data-drone-id="tech-1"]');
      fireEvent.mouseUp(techElement);

      expect(mockOnActionCardDrop).toHaveBeenCalledWith(
        mockTechDrone,
        'tech',
        'player1'
      );
    });

    it('should NOT call onActionCardDrop when draggedActionCard is null', () => {
      const mockOnActionCardDrop = vi.fn();
      render(
        <TechSlots
          {...defaultProps}
          draggedActionCard={null}
          onActionCardDrop={mockOnActionCardDrop}
          owner="player2"
        />
      );

      const techElement = document.querySelector('[data-drone-id="tech-1"]');
      fireEvent.mouseUp(techElement);

      expect(mockOnActionCardDrop).not.toHaveBeenCalled();
    });

    it('should NOT throw if onActionCardDrop prop is not provided', () => {
      render(
        <TechSlots
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard }}
        />
      );

      const techElement = document.querySelector('[data-drone-id="tech-1"]');

      expect(() => {
        fireEvent.mouseUp(techElement);
      }).not.toThrow();
    });

    it('should stopPropagation on mouseUp when handling action card drop', () => {
      const mockOnActionCardDrop = vi.fn();
      const parentHandler = vi.fn();

      const { container } = render(
        <div onMouseUp={parentHandler}>
          <TechSlots
            {...defaultProps}
            draggedActionCard={{ card: mockActionCard }}
            onActionCardDrop={mockOnActionCardDrop}
            owner="player2"
          />
        </div>
      );

      const techElement = document.querySelector('[data-drone-id="tech-1"]');
      fireEvent.mouseUp(techElement);

      expect(mockOnActionCardDrop).toHaveBeenCalled();
      expect(parentHandler).not.toHaveBeenCalled();
    });

    it('should still fire onClick when no draggedActionCard', () => {
      const mockOnTechClick = vi.fn();
      render(
        <TechSlots
          {...defaultProps}
          onTechClick={mockOnTechClick}
          draggedActionCard={null}
        />
      );

      const techElement = document.querySelector('[data-drone-id="tech-1"]');
      fireEvent.click(techElement);

      expect(mockOnTechClick).toHaveBeenCalledWith(mockTechDrone);
    });
  });
});
