import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnhancerModal from '../EnhancerModal.jsx';

const { mockEnhanceableCards } = vi.hoisted(() => ({
  mockEnhanceableCards: [
    {
      card: { id: 'CONVERGENCE_BEAM', name: 'Convergence Beam', type: 'Ordnance', rarity: 'Uncommon', cost: 2, image: '/test.png', description: 'Test' },
      enhancedCard: { id: 'CONVERGENCE_BEAM_ENHANCED', name: 'Convergence Beam+', type: 'Ordnance', rarity: 'Uncommon', cost: 2, image: '/test.png', description: 'Enhanced' },
      quantity: 5,
      enhancedQuantity: 2,
      copiesRequired: 3,
      cost: 2500,
      isStarterCard: false,
      canEnhance: true
    },
    {
      card: { id: 'PIERCING_SHOT', name: 'Piercing Shot', type: 'Ordnance', rarity: 'Uncommon', cost: 3, image: '/test2.png', description: 'Test2' },
      enhancedCard: { id: 'PIERCING_SHOT_ENHANCED', name: 'Piercing Shot+', type: 'Ordnance', rarity: 'Uncommon', cost: 3, image: '/test2.png', description: 'Enhanced2' },
      quantity: 2,
      enhancedQuantity: 0,
      copiesRequired: 3,
      cost: 2500,
      isStarterCard: false,
      canEnhance: false
    },
    {
      card: { id: 'SYSTEM_REBOOT', name: 'System Reboot', type: 'Tactic', rarity: 'Common', cost: 1, image: '/test3.png', description: 'Test3' },
      enhancedCard: { id: 'SYSTEM_REBOOT_ENHANCED', name: 'System Reboot+', type: 'Tactic', rarity: 'Common', cost: 1, image: '/test3.png', description: 'Enhanced3' },
      quantity: 0,
      enhancedQuantity: 1,
      copiesRequired: 0,
      cost: 1000,
      isStarterCard: true,
      canEnhance: true
    }
  ]
}));

vi.mock('../../../logic/economy/EnhancerService.js', () => ({
  default: {
    getEnhanceableCards: vi.fn(() => mockEnhanceableCards),
    enhance: vi.fn(() => ({ success: true, cost: 2500, removedCopies: 3, enhancedCardId: 'CONVERGENCE_BEAM_ENHANCED', deckWarnings: [] })),
    getEnhancementCost: vi.fn(() => 2500),
    getCopiesRequired: vi.fn(() => 3)
  }
}));

vi.mock('../../../hooks/useGameState', () => ({
  useGameState: () => ({
    gameState: {
      singlePlayerProfile: { credits: 5000 },
      singlePlayerInventory: { CONVERGENCE_BEAM: 5, PIERCING_SHOT: 2 }
    }
  })
}));

vi.mock('../../../logic/missions/MissionService.js', () => ({
  default: { recordProgress: vi.fn() }
}));

describe('EnhancerModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders modal with "Enhancer" title', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    expect(screen.getByText('Enhancer')).toBeInTheDocument();
  });

  test('shows "Upgrade cards to enhanced versions" subtitle', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    expect(screen.getByText('Upgrade cards to enhanced versions')).toBeInTheDocument();
  });

  test('shows enhanceable cards with enough copies', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    expect(screen.getByText('Convergence Beam')).toBeInTheDocument();
  });

  test('shows base card AND enhanced card names (two-card layout)', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    expect(screen.getByText('Convergence Beam')).toBeInTheDocument();
    expect(screen.getByText('Convergence Beam+')).toBeInTheDocument();
  });

  test('shows cards with fewer than required copies (not enhanceable)', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    expect(screen.getByText('Piercing Shot')).toBeInTheDocument();
  });

  test('shows starter cards (enhanceable for credits only)', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    expect(screen.getByText('System Reboot')).toBeInTheDocument();
  });

  test('shows credit cost per card', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    expect(screen.getAllByText('2,500').length).toBeGreaterThan(0);
  });

  test('shows copy requirement', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    // "3 copies" requirement shown for non-starter cards
    expect(screen.getAllByText(/3 copies/i).length).toBeGreaterThan(0);
  });

  test('enhance button disabled when requirements not met', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    const buttons = screen.getAllByRole('button', { name: /enhance/i });
    // Piercing Shot (index 1) cannot be enhanced — button disabled
    const piercingShotButton = buttons[1];
    expect(piercingShotButton).toBeDisabled();
  });

  test('enhance button enabled when requirements met', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    const buttons = screen.getAllByRole('button', { name: /enhance/i });
    expect(buttons[0]).not.toBeDisabled();
  });

  test('enhance button triggers enhancerService.enhance() on click', async () => {
    const { default: enhancerService } = await import('../../../logic/economy/EnhancerService.js');
    render(<EnhancerModal onClose={mockOnClose} />);
    const buttons = screen.getAllByRole('button', { name: /enhance/i });
    fireEvent.click(buttons[0]);
    expect(enhancerService.enhance).toHaveBeenCalledWith('CONVERGENCE_BEAM');
  });

  test('shows success feedback after enhancement', async () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    const buttons = screen.getAllByRole('button', { name: /enhance/i });
    fireEvent.click(buttons[0]);
    expect(screen.getByText(/enhanced.*convergence beam/i)).toBeInTheDocument();
  });

  test('shows deck warning when enhancement affects decks', async () => {
    const { default: enhancerService } = await import('../../../logic/economy/EnhancerService.js');
    enhancerService.enhance.mockReturnValueOnce({
      success: true, cost: 2500, removedCopies: 3, enhancedCardId: 'CONVERGENCE_BEAM_ENHANCED',
      deckWarnings: [{ slotIndex: 1, slotName: 'Slot 1', previousQuantity: 2, newQuantity: 1 }]
    });
    render(<EnhancerModal onClose={mockOnClose} />);
    const buttons = screen.getAllByRole('button', { name: /enhance/i });
    fireEvent.click(buttons[0]);
    expect(screen.getByText(/deck.*adjusted/i)).toBeInTheDocument();
  });

  test('shows current credits balance', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    expect(screen.getByText('5,000')).toBeInTheDocument();
  });

  test('tab filtering works', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    // Click Tactic tab
    const tacticTab = screen.getByRole('button', { name: /tactic/i });
    fireEvent.click(tacticTab);
    // System Reboot (Tactic) should be visible
    expect(screen.getByText('System Reboot')).toBeInTheDocument();
    // Convergence Beam (Ordnance) should NOT be visible
    expect(screen.queryByText('Convergence Beam')).not.toBeInTheDocument();
  });

  test('shows per-card owned counts under base and enhanced cards', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    // 3 cards × 2 owned labels each = 6 "Owned:" labels
    // 5 numeric + 1 infinity for starter base card
    const numericLabels = screen.getAllByText(/^Owned: \d+$/);
    expect(numericLabels).toHaveLength(5);
    // Starter base card shows ∞
    expect(screen.getByText('Owned: ∞')).toBeInTheDocument();
    // Convergence Beam: base=5, enhanced=2; Piercing Shot: base=2, enhanced=0
    expect(screen.getByText('Owned: 5')).toBeInTheDocument();
    // "Owned: 2" appears twice (Convergence Beam enhanced + Piercing Shot base)
    expect(screen.getAllByText('Owned: 2')).toHaveLength(2);
    // System Reboot enhanced: 1
    expect(screen.getByText('Owned: 1')).toBeInTheDocument();
  });

  test('closes modal on close button click', () => {
    render(<EnhancerModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('enhanced card with different cost renders orange cost highlight', () => {
    // CONVERGENCE_BEAM mock: base cost=2, enhanced cost=2 (same) — update to differ
    mockEnhanceableCards[0].card.cost = 3;
    mockEnhanceableCards[0].enhancedCard.cost = 2;
    const { container } = render(<EnhancerModal onClose={mockOnClose} />);
    // Find all orange cost spans (font-bold text-sm with text-orange-400)
    const orangeCostSpans = container.querySelectorAll('.text-orange-400.font-bold.text-sm');
    expect(orangeCostSpans.length).toBeGreaterThan(0);
    // The orange one should show the enhanced cost "2"
    const orangeCost = Array.from(orangeCostSpans).find(el => el.textContent === '2');
    expect(orangeCost).toBeTruthy();
    // Reset
    mockEnhanceableCards[0].card.cost = 2;
    mockEnhanceableCards[0].enhancedCard.cost = 2;
  });

  test('enhanced card with same cost does NOT have orange cost highlight', () => {
    // Both cards cost=2 in mock (same) — no orange
    mockEnhanceableCards[0].card.cost = 2;
    mockEnhanceableCards[0].enhancedCard.cost = 2;
    const { container } = render(<EnhancerModal onClose={mockOnClose} />);
    const orangeCostSpans = container.querySelectorAll('.text-orange-400.font-bold.text-sm');
    // None should show "2" as orange
    const orangeCost = Array.from(orangeCostSpans).find(el => el.textContent === '2');
    expect(orangeCost).toBeFalsy();
  });
});
