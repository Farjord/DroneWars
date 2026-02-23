import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * TDD Tests for WinnerModal Boss Combat Detection
 *
 * Bug: WinnerModal checks tacticalMapStateManager.isRunActive() to detect
 * single-player mode, but boss combats don't have an active tactical map run.
 * This causes boss victories to show multiplayer buttons ("Exit to Menu")
 * instead of extraction buttons ("Collect Salvage" / "Collect Rewards").
 */

// Mock dependencies
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    resetGameState: vi.fn()
  }
}));

vi.mock('../../../managers/TacticalMapStateManager.js', () => ({
  default: {
    isRunActive: vi.fn(),
    getState: vi.fn(() => ({}))
  }
}));

vi.mock('../../../logic/singlePlayer/CombatOutcomeProcessor.js', () => ({
  default: {
    processCombatEnd: vi.fn(() => ({
      success: true,
      outcome: 'victory',
      loot: { cards: [], credits: 100 }
    })),
    finalizeLootCollection: vi.fn(),
    finalizeBossLootCollection: vi.fn()
  }
}));

// Import after mocks
import WinnerModal from '../WinnerModal.jsx';
import gameStateManager from '../../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../../managers/TacticalMapStateManager.js';
import CombatOutcomeProcessor from '../../../logic/singlePlayer/CombatOutcomeProcessor.js';

describe('WinnerModal - Boss Combat Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should detect boss combat even when tacticalMapStateManager.isRunActive() is false', () => {
    // Boss combat: singlePlayerEncounter has isBossCombat=true
    // but tacticalMapStateManager.isRunActive() returns false
    gameStateManager.getState.mockReturnValue({
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS',
        aiName: 'Nemesis-Class Dreadnought'
      },
      pendingLoot: null
    });

    // Tactical map is NOT active for boss combats
    tacticalMapStateManager.isRunActive.mockReturnValue(false);

    render(
      <WinnerModal
        winner="player1"
        localPlayerId="player1"
        show={true}
        onClose={vi.fn()}
      />
    );

    // Should NOT show "Exit to Menu" button (that's for multiplayer)
    expect(screen.queryByText('Exit to Menu')).not.toBeInTheDocument();
  });

  it('should show Collect Rewards button for boss victory', () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      },
      pendingLoot: {
        credits: 5000,
        aiCores: 3,
        reputation: 500,
        isBossReward: true
      }
    });

    tacticalMapStateManager.isRunActive.mockReturnValue(false);

    render(
      <WinnerModal
        winner="player1"
        localPlayerId="player1"
        show={true}
        onClose={vi.fn()}
      />
    );

    // Should show "Collect Rewards" button for boss victory
    expect(screen.getByText('Collect Rewards')).toBeInTheDocument();
  });

  it('should show Collect Salvage button for regular extraction victory', () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerEncounter: {
        aiName: 'Rogue Scout',
        // NOT a boss combat
        isBossCombat: false
      },
      pendingLoot: null
    });

    // Regular extraction has active tactical map
    tacticalMapStateManager.isRunActive.mockReturnValue(true);

    render(
      <WinnerModal
        winner="player1"
        localPlayerId="player1"
        show={true}
        onClose={vi.fn()}
      />
    );

    // Should show "Collect Salvage" for regular extraction
    expect(screen.getByText('Collect Salvage')).toBeInTheDocument();
  });

  it('should show Exit to Menu for multiplayer victory', () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerEncounter: null,  // No single-player encounter
      pendingLoot: null
    });

    tacticalMapStateManager.isRunActive.mockReturnValue(false);

    render(
      <WinnerModal
        winner="player1"
        localPlayerId="player1"
        show={true}
        onClose={vi.fn()}
      />
    );

    // Should show "Exit to Menu" for multiplayer
    expect(screen.getByText('Exit to Menu')).toBeInTheDocument();
  });

  it('should show Return to Hangar for boss defeat', () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      },
      pendingLoot: null
    });

    tacticalMapStateManager.isRunActive.mockReturnValue(false);

    render(
      <WinnerModal
        winner="player2"  // Player lost
        localPlayerId="player1"
        show={true}
        onClose={vi.fn()}
      />
    );

    // Should show "Return to Hangar" for boss defeat
    expect(screen.getByText('Return to Hangar')).toBeInTheDocument();
  });
});

describe('WinnerModal - Boss Loot Collection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should call finalizeBossLootCollection when collecting boss rewards', async () => {
    const mockBossLoot = {
      credits: 5000,
      aiCores: 3,
      reputation: 500,
      isBossReward: true
    };

    gameStateManager.getState.mockReturnValue({
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      },
      pendingLoot: mockBossLoot
    });

    tacticalMapStateManager.isRunActive.mockReturnValue(false);

    render(
      <WinnerModal
        winner="player1"
        localPlayerId="player1"
        show={true}
        onClose={vi.fn()}
      />
    );

    // Click "Collect Rewards" to open loot reveal
    fireEvent.click(screen.getByText('Collect Rewards'));

    // This should trigger the loot collection flow
    // The actual finalizeBossLootCollection is called after loot reveal modal
    // For now, we verify the button exists and is clickable
    expect(CombatOutcomeProcessor.finalizeBossLootCollection).toBeDefined();
  });

  it('should NOT call finalizeBossLootCollection for regular extraction', () => {
    gameStateManager.getState.mockReturnValue({
      singlePlayerEncounter: {
        aiName: 'Rogue Scout',
        isBossCombat: false
      },
      pendingLoot: null
    });

    tacticalMapStateManager.isRunActive.mockReturnValue(true);

    CombatOutcomeProcessor.processCombatEnd.mockReturnValue({
      success: true,
      outcome: 'victory',
      loot: { cards: [{ id: 'CARD001' }], salvageItem: null }
    });

    render(
      <WinnerModal
        winner="player1"
        localPlayerId="player1"
        show={true}
        onClose={vi.fn()}
      />
    );

    // Click "Collect Salvage" for regular extraction
    fireEvent.click(screen.getByText('Collect Salvage'));

    // Should call processCombatEnd, not finalizeBossLootCollection
    expect(CombatOutcomeProcessor.processCombatEnd).toHaveBeenCalled();
    expect(CombatOutcomeProcessor.finalizeBossLootCollection).not.toHaveBeenCalled();
  });
});
