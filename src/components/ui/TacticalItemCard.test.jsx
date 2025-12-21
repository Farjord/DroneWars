/**
 * TacticalItemCard Component Tests
 * TDD: Tests for the tactical item card display component
 */

import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TacticalItemCard from './TacticalItemCard.jsx';
import { getTacticalItemById } from '../../data/tacticalItemData.js';

describe('TacticalItemCard', () => {
  const mockItem = getTacticalItemById('ITEM_EVADE');

  describe('Basic Rendering', () => {
    test('renders item name in header', () => {
      render(<TacticalItemCard item={mockItem} />);
      expect(screen.getByText(mockItem.name)).toBeInTheDocument();
    });

    test('renders item description', () => {
      render(<TacticalItemCard item={mockItem} />);
      expect(screen.getByText(mockItem.description)).toBeInTheDocument();
    });

    test('renders item image', () => {
      render(<TacticalItemCard item={mockItem} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', mockItem.image);
      expect(img).toHaveAttribute('alt', mockItem.name);
    });
  });

  describe('Click Handling', () => {
    test('handles click events when onClick is provided', () => {
      const onClick = vi.fn();
      render(<TacticalItemCard item={mockItem} onClick={onClick} />);
      fireEvent.click(screen.getByText(mockItem.name).closest('div'));
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    test('applies selected styling when isSelected is true', () => {
      const { container } = render(<TacticalItemCard item={mockItem} isSelected={true} />);
      // Check for selection indicator (green styling)
      expect(container.firstChild).toHaveClass('selected');
    });
  });
});
