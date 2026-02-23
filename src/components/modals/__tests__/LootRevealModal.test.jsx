/**
 * LootRevealModal.test.jsx
 * TDD tests for Security Token display in loot reveal
 *
 * BUG: Security tokens from TOKEN_REWARD salvage are generated correctly,
 * but they don't appear as interactive items in the LootRevealModal.
 * Only cards and salvageItems are counted/displayed in the card grid.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies
vi.mock('../../../data/cardPackData.js', () => ({
  RARITY_COLORS: { Common: '#808080', Uncommon: '#22c55e', Rare: '#3b82f6', Mythic: '#a855f7' }
}));

vi.mock('../../../data/cardData.js', () => ({
  default: [
    { id: 'CARD001', name: 'Test Card', type: 'Ordnance', rarity: 'Common' }
  ]
}));

// Mock UI components
vi.mock('../../ui/ActionCard', () => ({
  default: ({ card }) => <div data-testid="action-card">{card?.name || 'Unknown'}</div>
}));

vi.mock('../../ui/HiddenCard', () => ({
  default: ({ variant, rarity }) => (
    <div data-testid="hidden-card" data-variant={variant} data-rarity={rarity}>
      Hidden {variant || rarity}
    </div>
  )
}));

vi.mock('../../ui/ResourceCard', () => ({
  default: ({ resourceType, salvageItem, tokenData }) => (
    <div data-testid="resource-card" data-type={resourceType}>
      {resourceType === 'token' ? `Token: ${tokenData?.amount}` : salvageItem?.name || 'Resource'}
    </div>
  )
}));

// Import after mocks
import LootRevealModal from '../LootRevealModal.jsx';

describe('LootRevealModal - Token Display', () => {
  const mockOnCollect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('totalRevealableItems count', () => {
    it('includes tokens in the count along with cards and salvageItems', () => {
      const loot = {
        cards: [{ cardId: 'CARD001', cardName: 'Test Card', rarity: 'Common' }],
        salvageItems: [{ itemId: 's1', name: 'Salvage Item', creditValue: 50 }],
        tokens: [{ tokenType: 'security', amount: 1 }]
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // The "Reveal All" button should show 3 remaining (1 card + 1 salvage + 1 token)
      const revealAllButton = screen.getByText(/Reveal All/);
      expect(revealAllButton.textContent).toContain('3 remaining');
    });

    it('counts multiple tokens correctly', () => {
      const loot = {
        cards: [],
        salvageItems: [{ itemId: 's1', name: 'Salvage Item', creditValue: 50 }],
        tokens: [
          { tokenType: 'security', amount: 1 },
          { tokenType: 'security', amount: 1 }
        ]
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Should show 3 remaining (1 salvage + 2 tokens)
      const revealAllButton = screen.getByText(/Reveal All/);
      expect(revealAllButton.textContent).toContain('3 remaining');
    });

    it('works with only tokens (no cards or salvageItems)', () => {
      const loot = {
        cards: [],
        salvageItems: [],
        tokens: [{ tokenType: 'security', amount: 1 }]
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Should show 1 remaining
      const revealAllButton = screen.getByText(/Reveal All/);
      expect(revealAllButton.textContent).toContain('1 remaining');
    });
  });

  describe('token rendering in card grid', () => {
    it('renders tokens as clickable items in the grid', () => {
      const loot = {
        cards: [],
        salvageItems: [],
        tokens: [{ tokenType: 'security', amount: 1 }]
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Should find a hidden card for the token (before reveal)
      const hiddenCards = screen.getAllByTestId('hidden-card');
      expect(hiddenCards.length).toBeGreaterThanOrEqual(1);
    });

    it('reveals token when clicked', () => {
      const loot = {
        cards: [],
        salvageItems: [],
        tokens: [{ tokenType: 'security', amount: 1 }]
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Click on the card grid container
      const cardContainers = document.querySelectorAll('.loot-card-container');
      expect(cardContainers.length).toBe(1);

      fireEvent.click(cardContainers[0]);

      // After clicking, should show the ResourceCard with token type
      const resourceCard = screen.getByTestId('resource-card');
      expect(resourceCard).toHaveAttribute('data-type', 'token');
    });
  });

  describe('allRevealed state with tokens', () => {
    it('requires all tokens to be revealed before enabling Continue', () => {
      const loot = {
        cards: [],
        salvageItems: [],
        tokens: [{ tokenType: 'security', amount: 1 }]
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Continue button should be disabled initially
      const continueButton = screen.getByText(/Continue|Reveal cards to continue/);
      expect(continueButton).toBeDisabled();

      // Click to reveal the token
      const cardContainers = document.querySelectorAll('.loot-card-container');
      fireEvent.click(cardContainers[0]);

      // Now Continue should be enabled
      const enabledContinue = screen.getByText('Continue');
      expect(enabledContinue).not.toBeDisabled();
    });

    it('handleRevealAll includes tokens', () => {
      const loot = {
        cards: [{ cardId: 'CARD001', cardName: 'Test Card', rarity: 'Common' }],
        salvageItems: [{ itemId: 's1', name: 'Salvage Item', creditValue: 50 }],
        tokens: [{ tokenType: 'security', amount: 1 }]
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Click "Reveal All"
      const revealAllButton = screen.getByText(/Reveal All/);
      fireEvent.click(revealAllButton);

      // Continue should now be enabled (all items revealed including token)
      const continueButton = screen.getByText('Continue');
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('backwards compatibility', () => {
    it('still works with single token property (direct encounters)', () => {
      const loot = {
        cards: [],
        salvageItems: [],
        token: { tokenType: 'security', amount: 1 } // singular token (direct encounter format)
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Should render without errors
      expect(screen.getByText('SALVAGE ACQUIRED')).toBeInTheDocument();
    });

    it('handles empty tokens array gracefully', () => {
      const loot = {
        cards: [{ cardId: 'CARD001', cardName: 'Test Card', rarity: 'Common' }],
        salvageItems: [],
        tokens: []
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Should show 1 remaining (just the card)
      const revealAllButton = screen.getByText(/Reveal All/);
      expect(revealAllButton.textContent).toContain('1 remaining');
    });

    it('handles undefined tokens gracefully', () => {
      const loot = {
        cards: [{ cardId: 'CARD001', cardName: 'Test Card', rarity: 'Common' }],
        salvageItems: []
        // tokens not provided
      };

      render(<LootRevealModal loot={loot} onCollect={mockOnCollect} show={true} />);

      // Should show 1 remaining (just the card)
      const revealAllButton = screen.getByText(/Reveal All/);
      expect(revealAllButton.textContent).toContain('1 remaining');
    });
  });
});
