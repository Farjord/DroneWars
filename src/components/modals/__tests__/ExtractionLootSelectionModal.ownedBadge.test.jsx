import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExtractionLootSelectionModal from '../ExtractionLootSelectionModal.jsx';

// Mock useGameState to provide inventory
vi.mock('../../../hooks/useGameState', () => ({
  useGameState: () => ({
    gameState: {
      singlePlayerInventory: {
        'CONVERGENCE_BEAM': 4,
        'NUKE': 1
      }
    }
  })
}));

// Mock SoundManager
vi.mock('../../../managers/SoundManager.js', () => ({
  default: { getInstance: () => ({ play: vi.fn() }) }
}));

const cardItem = { type: 'card', id: 'CONVERGENCE_BEAM', cardId: 'CONVERGENCE_BEAM', name: 'Convergence Beam' };
const cardItemZero = { type: 'card', id: 'PIERCING_SHOT', cardId: 'PIERCING_SHOT', name: 'Piercing Shot' };
const creditItem = { type: 'credits', amount: 500 };
const salvageItem = { type: 'salvageItem', name: 'Scrap Metal', creditValue: 100, image: '/test.png', description: 'Metal' };

describe('ExtractionLootSelectionModal - Owned Badge', () => {
  test('card items show "Owned: X" badge with inventory count', () => {
    render(
      <ExtractionLootSelectionModal
        isOpen={true}
        collectedLoot={[cardItem]}
        limit={3}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Owned: 4')).toBeInTheDocument();
  });

  test('card items show "Owned: 0" when player has no copies', () => {
    render(
      <ExtractionLootSelectionModal
        isOpen={true}
        collectedLoot={[cardItemZero]}
        limit={3}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Owned: 0')).toBeInTheDocument();
  });

  test('non-card items do NOT show owned badge', () => {
    render(
      <ExtractionLootSelectionModal
        isOpen={true}
        collectedLoot={[creditItem, salvageItem]}
        limit={3}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByText(/Owned:/)).not.toBeInTheDocument();
  });
});
