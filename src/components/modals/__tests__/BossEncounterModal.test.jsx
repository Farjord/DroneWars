/**
 * BossEncounterModal.test.jsx
 * TDD tests for BossEncounterModal component
 *
 * Tests for:
 * - Display boss name and subtitle
 * - Show first-time vs repeatable rewards based on progress
 * - Display MIA warning
 * - Ship slot selector dropdown
 * - Challenge and Back button functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// Mock dependencies BEFORE importing the component
vi.mock('../../../hooks/useGameState.js', () => ({
  useGameState: vi.fn()
}));

vi.mock('../../../data/aiData.js', () => ({
  default: [
    {
      bossId: 'BOSS_T1_NEMESIS',
      name: 'Nemesis-Class Dreadnought',
      modes: ['boss'],
      difficulty: 'Hard',
      bossConfig: {
        displayName: 'THE NEMESIS',
        subtitle: 'Commander of the Eremos Blockade',
        firstTimeReward: { credits: 5000, aiCores: 3, reputation: 500 },
        repeatReward: { credits: 1000, aiCores: 1, reputation: 100 }
      }
    }
  ]
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../logic/singlePlayer/singlePlayerDeckUtils.js', () => ({
  validateDeckForDeployment: vi.fn(() => ({ valid: true, errors: [] }))
}));

// Import after mocks
import { useGameState } from '../../../hooks/useGameState.js';
import BossEncounterModal from '../BossEncounterModal.jsx';

// Helper to create mock game state
const createMockGameState = (overrides = {}) => ({
  singlePlayerShipSlots: [
    {
      id: 0,
      status: 'active',
      name: 'Starter Deck',
      decklist: Array(40).fill({ id: 'card1', quantity: 1 }),
      droneSlots: [
        { slotIndex: 0, assignedDrone: 'Dart' },
        { slotIndex: 1, assignedDrone: 'Fighter Drone' },
        { slotIndex: 2, assignedDrone: 'Mammoth' },
        { slotIndex: 3, assignedDrone: 'Bastion' },
        { slotIndex: 4, assignedDrone: 'Seraph' },
      ],
      shipComponents: { left: 'COMP1', middle: 'COMP2', right: 'COMP3' }
    },
    {
      id: 1,
      status: 'active',
      name: 'Custom Ship',
      decklist: Array(40).fill({ id: 'card1', quantity: 1 }),
      droneSlots: [
        { slotIndex: 0, assignedDrone: 'Dart' },
        { slotIndex: 1, assignedDrone: 'Fighter Drone' },
        { slotIndex: 2, assignedDrone: 'Mammoth' },
        { slotIndex: 3, assignedDrone: 'Bastion' },
        { slotIndex: 4, assignedDrone: 'Seraph' },
      ],
      shipComponents: { left: 'COMP1', middle: 'COMP2', right: 'COMP3' }
    }
  ],
  singlePlayerProfile: {
    credits: 1000,
    bossProgress: {
      defeatedBosses: [],
      totalBossVictories: 0,
      totalBossAttempts: 0
    },
    ...overrides.profile
  },
  ...overrides
});

const defaultProps = {
  bossId: 'BOSS_T1_NEMESIS',
  selectedSlotId: 0,
  onChallenge: vi.fn(),
  onClose: vi.fn()
};

describe('BossEncounterModal - Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display boss name and subtitle', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} />);

    expect(screen.getByText('THE NEMESIS')).toBeInTheDocument();
    expect(screen.getByText('Commander of the Eremos Blockade')).toBeInTheDocument();
  });

  it('should show first-time rewards when boss not defeated', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState({
        profile: {
          bossProgress: {
            defeatedBosses: [],  // Boss not defeated
            totalBossVictories: 0,
            totalBossAttempts: 0
          }
        }
      }),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} />);

    // First-time rewards: 5000 credits, 3 AI Cores, 500 reputation
    expect(screen.getByText('FIRST VICTORY REWARDS')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();  // Credits formatted
    expect(screen.getByText('3')).toBeInTheDocument();      // AI Cores
    expect(screen.getByText('500')).toBeInTheDocument();    // Reputation
  });

  it('should show repeatable rewards when boss already defeated', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState({
        profile: {
          bossProgress: {
            defeatedBosses: ['BOSS_T1_NEMESIS'],  // Boss already defeated
            totalBossVictories: 1,
            totalBossAttempts: 1
          }
        }
      }),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} />);

    // Repeat rewards: 1000 credits, 1 AI Core, 100 reputation
    expect(screen.getByText('REPEAT VICTORY REWARDS')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();  // Credits formatted
    expect(screen.getByText('1')).toBeInTheDocument();      // AI Cores
    expect(screen.getByText('100')).toBeInTheDocument();    // Reputation
  });

  it('should display MIA warning', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} />);

    // Look for specific warning header text
    expect(screen.getByText('WARNING: MIA RISK')).toBeInTheDocument();
    expect(screen.getByText(/Ship will be lost/i)).toBeInTheDocument();
  });
});

describe('BossEncounterModal - Ship Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have ship slot selector dropdown', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} />);

    const selector = screen.getByRole('combobox');
    expect(selector).toBeInTheDocument();

    // Should have options for active slots
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(2);  // At least starter deck and custom ship
  });

  it('should change selected slot when dropdown changes', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} />);

    const selector = screen.getByRole('combobox');
    fireEvent.change(selector, { target: { value: '1' } });

    expect(selector.value).toBe('1');
  });
});

describe('BossEncounterModal - Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onChallenge with slotId and bossId when Challenge clicked', () => {
    const onChallenge = vi.fn();
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} onChallenge={onChallenge} />);

    const challengeButton = screen.getByText('Challenge Boss');
    fireEvent.click(challengeButton);

    expect(onChallenge).toHaveBeenCalledWith(0, 'BOSS_T1_NEMESIS');
  });

  it('should call onChallenge with correct slotId after changing dropdown', () => {
    const onChallenge = vi.fn();
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} onChallenge={onChallenge} />);

    // Change to slot 1
    const selector = screen.getByRole('combobox');
    fireEvent.change(selector, { target: { value: '1' } });

    // Click challenge
    const challengeButton = screen.getByText('Challenge Boss');
    fireEvent.click(challengeButton);

    expect(onChallenge).toHaveBeenCalledWith(1, 'BOSS_T1_NEMESIS');
  });

  it('should call onClose when Back clicked', () => {
    const onClose = vi.fn();
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} onClose={onClose} />);

    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when clicking overlay', () => {
    const onClose = vi.fn();
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} onClose={onClose} />);

    const overlay = document.querySelector('.dw-modal-overlay');
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });
});

describe('BossEncounterModal - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show error message when boss not found', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    render(<BossEncounterModal {...defaultProps} bossId="NON_EXISTENT_BOSS" />);

    expect(screen.getByText(/Boss not found/i)).toBeInTheDocument();
  });
});
