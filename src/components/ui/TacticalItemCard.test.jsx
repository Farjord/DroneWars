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

  describe('Shop Mode (showCost=true)', () => {
    test('renders cost when showCost is true', () => {
      render(<TacticalItemCard item={mockItem} showCost={true} />);
      expect(screen.getByText(mockItem.cost.toLocaleString())).toBeInTheDocument();
    });

    test('shows Buy button when onBuy is provided', () => {
      const onBuy = vi.fn();
      render(<TacticalItemCard item={mockItem} showCost={true} onBuy={onBuy} />);
      expect(screen.getByRole('button', { name: /buy/i })).toBeInTheDocument();
    });

    test('calls onBuy when Buy button is clicked', () => {
      const onBuy = vi.fn();
      render(<TacticalItemCard item={mockItem} showCost={true} onBuy={onBuy} />);
      fireEvent.click(screen.getByRole('button', { name: /buy/i }));
      expect(onBuy).toHaveBeenCalledTimes(1);
    });

    test('disables Buy button when disabled prop is true', () => {
      const onBuy = vi.fn();
      render(<TacticalItemCard item={mockItem} showCost={true} onBuy={onBuy} disabled={true} />);
      const button = screen.getByRole('button', { name: /buy/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Inventory Mode (showQuantity=true)', () => {
    test('renders owned/max quantity when showQuantity is true', () => {
      render(<TacticalItemCard item={mockItem} showQuantity={true} owned={2} />);
      expect(screen.getByText(/2/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(mockItem.maxCapacity.toString()))).toBeInTheDocument();
    });

    test('shows 0/max for items with zero quantity', () => {
      render(<TacticalItemCard item={mockItem} showQuantity={true} owned={0} />);
      expect(screen.getByText(/0/)).toBeInTheDocument();
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
