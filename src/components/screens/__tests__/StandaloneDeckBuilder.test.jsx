import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock dependencies
vi.mock('../../../data/cardData.js', () => ({ default: [] }));
vi.mock('../../../data/droneData.js', () => ({ default: [] }));
vi.mock('../../../data/ships.js', () => ({
  default: [],
  getDefaultShip: vi.fn(() => ({ id: 'test-ship', name: 'Test Ship' })),
  getShipById: vi.fn()
}));
vi.mock('../DeckBuilder.jsx', () => ({
  default: ({ deck }) => <div data-testid="deck-builder" data-deck={JSON.stringify(deck)} />
}));

import StandaloneDeckBuilder from '../StandaloneDeckBuilder.jsx';

describe('StandaloneDeckBuilder - Initial State', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should start with an empty deck even when localStorage has data', () => {
    // Setup localStorage with saved deck
    localStorage.setItem('customDeck', JSON.stringify({ 'CARD_001': 2 }));
    localStorage.setItem('customDrones', JSON.stringify({ 'DRONE_001': 1 }));

    const { getByTestId } = render(
      <StandaloneDeckBuilder onBack={() => {}} onConfirm={() => {}} />
    );

    const deckBuilder = getByTestId('deck-builder');
    const deckProp = JSON.parse(deckBuilder.getAttribute('data-deck'));

    // Should be empty, NOT loaded from localStorage
    expect(deckProp).toEqual({});
  });
});
