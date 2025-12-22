/**
 * ReplicatorModal Component Tests
 * TDD: Tests for the full card layout display
 */

import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReplicatorModal from './ReplicatorModal.jsx';

// Use vi.hoisted() to ensure mockCards is available before vi.mock() runs
// (vi.mock is hoisted to top of file, so regular const declarations aren't available)
const { mockCards } = vi.hoisted(() => ({
  mockCards: [
    {
      card: { id: 'CARD_1', name: 'Test Card', type: 'Ordnance', rarity: 'Common', cost: 1, image: '/test.png', description: 'Test description' },
      quantity: 3,
      replicationCost: 1000,
      isStarterCard: false
    },
    {
      card: { id: 'CARD_2', name: 'Rare Missile', type: 'Ordnance', rarity: 'Rare', cost: 3, image: '/test2.png', description: 'A rare missile' },
      quantity: 1,
      replicationCost: 3000,
      isStarterCard: false
    },
    {
      card: { id: 'CARD_3', name: 'Shield Boost', type: 'Tactic', rarity: 'Uncommon', cost: 2, image: '/test3.png', description: 'Boost shields' },
      quantity: 5,
      replicationCost: 2500,
      isStarterCard: false
    }
  ]
}));

// Mock replicatorService
vi.mock('../../logic/economy/ReplicatorService.js', () => ({
  default: {
    getReplicatableCards: vi.fn(() => mockCards),
    getAllCosts: vi.fn(() => ({ Common: 1000, Uncommon: 2500, Rare: 3000, Mythic: 5000 })),
    replicate: vi.fn(() => ({ success: true, cost: 1000, newQuantity: 4 }))
  }
}));

// Mock useGameState
vi.mock('../../hooks/useGameState', () => ({
  useGameState: () => ({
    gameState: {
      singlePlayerProfile: { credits: 5000 },
      singlePlayerInventory: { CARD_1: 3 }
    }
  })
}));

// Mock MissionService
vi.mock('../../logic/missions/MissionService.js', () => ({
  default: { recordProgress: vi.fn() }
}));

describe('ReplicatorModal - Full Card Layout', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders ActionCard component for each replicatable card', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    // ActionCard renders the card name in the header
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  test('displays replicate cost with cr suffix', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    // Multiple cards, so use getAllBy
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getAllByText('cr').length).toBeGreaterThan(0);
  });

  test('displays replicate button', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    // Multiple cards, so multiple replicate buttons
    const buttons = screen.getAllByRole('button', { name: /replicate/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('displays owned quantity', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    expect(screen.getByText(/Owned: 3/)).toBeInTheDocument();
  });

  test('replicate button enabled when player can afford', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    // Multiple cards, check first replicate button
    const buttons = screen.getAllByRole('button', { name: /replicate/i });
    expect(buttons[0]).not.toBeDisabled();
  });

  test('displays current credits', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    expect(screen.getByText('5000')).toBeInTheDocument();
  });

  test('closes modal on close button click', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('closes modal on overlay click', () => {
    const { container } = render(<ReplicatorModal onClose={mockOnClose} />);
    const overlay = container.querySelector('.dw-modal-overlay');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });
});

describe('ReplicatorModal - Filters', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('displays filter button', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  test('renders all cards initially', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    // All 3 mock cards should be visible
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Rare Missile')).toBeInTheDocument();
    expect(screen.getByText('Shield Boost')).toBeInTheDocument();
  });

  test('opens filter modal when filter button is clicked', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);
    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);
    // Filter modal should appear with search input
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  test('filters cards by search text', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);

    // Open filter modal
    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Missile' } });

    // Close modal to see filtered results
    const doneButton = screen.getByRole('button', { name: /done/i });
    fireEvent.click(doneButton);

    // Only "Rare Missile" should be visible
    expect(screen.getByText('Rare Missile')).toBeInTheDocument();
    expect(screen.queryByText('Test Card')).not.toBeInTheDocument();
    expect(screen.queryByText('Shield Boost')).not.toBeInTheDocument();
  });

  test('displays active filter chips when filters are applied', () => {
    render(<ReplicatorModal onClose={mockOnClose} />);

    // Open filter modal
    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Test' } });

    // Close modal
    const doneButton = screen.getByRole('button', { name: /done/i });
    fireEvent.click(doneButton);

    // Filter chip should be visible with the search text
    expect(screen.getByText(/"Test"/)).toBeInTheDocument();
  });
});
