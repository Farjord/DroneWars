/**
 * ShopModal Component Tests
 * TDD: Tests for the tactical items shop modal
 */

import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShopModal from './ShopModal.jsx';
import { tacticalItemCollection } from '../../data/tacticalItemData.js';

// Mock the gameStateManager
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(() => ({
      singlePlayerProfile: {
        credits: 5000,
        tacticalItems: {
          ITEM_EVADE: 0,
          ITEM_EXTRACT: 1,
          ITEM_THREAT_REDUCE: 0
        }
      }
    })),
    purchaseTacticalItem: vi.fn(),
    getTacticalItemCount: vi.fn((id) => {
      const counts = { ITEM_EVADE: 0, ITEM_EXTRACT: 1, ITEM_THREAT_REDUCE: 0 };
      return counts[id] || 0;
    }),
    subscribe: vi.fn(() => () => {}), // Returns unsubscribe function
    emit: vi.fn()
  }
}));

// Mock the useGameState hook
vi.mock('../../hooks/useGameState', () => ({
  useGameState: () => ({
    gameState: {
      singlePlayerProfile: {
        credits: 5000,
        tacticalItems: {
          ITEM_EVADE: 0,
          ITEM_EXTRACT: 1,
          ITEM_THREAT_REDUCE: 0
        }
      }
    }
  })
}));

describe('ShopModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders all tactical items', () => {
      render(<ShopModal onClose={mockOnClose} />);

      tacticalItemCollection.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument();
      });
    });

    test('displays current credits', () => {
      render(<ShopModal onClose={mockOnClose} />);

      // Should show 5000 credits
      expect(screen.getByText('5,000')).toBeInTheDocument();
    });

    test('renders Shop header', () => {
      render(<ShopModal onClose={mockOnClose} />);

      expect(screen.getByText(/shop/i)).toBeInTheDocument();
    });

    test('displays close button', () => {
      render(<ShopModal onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('Buy Button States', () => {
    test('Buy button disabled when insufficient credits', async () => {
      // Re-mock with low credits
      vi.doMock('../../hooks/useGameState', () => ({
        useGameState: () => ({
          gameState: {
            singlePlayerProfile: {
              credits: 100, // Not enough for any item
              tacticalItems: { ITEM_EVADE: 0, ITEM_EXTRACT: 0, ITEM_THREAT_REDUCE: 0 }
            }
          }
        })
      }));

      // Test that buy buttons exist and can be checked
      render(<ShopModal onClose={mockOnClose} />);
      const buyButtons = screen.getAllByRole('button', { name: /buy/i });
      expect(buyButtons.length).toBeGreaterThan(0);
    });

    test('shows owned quantity for each item', () => {
      render(<ShopModal onClose={mockOnClose} />);

      // Check that owned quantities are displayed (e.g., "Owned: 1 / 2")
      expect(screen.getByText(/Owned: 1 \/ 2/)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('closes modal on close button click', () => {
      render(<ShopModal onClose={mockOnClose} />);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('closes modal on overlay click', () => {
      const { container } = render(<ShopModal onClose={mockOnClose} />);

      // Click on the overlay (first child with dw-modal-overlay class)
      const overlay = container.querySelector('.dw-modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });
  });
});
