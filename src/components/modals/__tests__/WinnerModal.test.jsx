import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ========================================
// WINNER MODAL TESTS
// ========================================
// Tests for game state cleanup on exit
// Specifically tests that resetGameState() is called when exiting to menu

// Mock dependencies BEFORE importing the component
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    resetGameState: vi.fn()
  }
}))

vi.mock('../../../managers/TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn(),
    startRun: vi.fn(),
    endRun: vi.fn()
  }
}))

vi.mock('../../../logic/singlePlayer/CombatOutcomeProcessor.js', () => ({
  default: {
    processCombatEnd: vi.fn(),
    finalizeLootCollection: vi.fn(),
    finalizeBlueprintCollection: vi.fn()
  }
}))

// Mock LootRevealModal
vi.mock('../LootRevealModal.jsx', () => ({
  default: ({ loot, onCollect, show }) => {
    if (!show) return null;
    return (
      <div data-testid="loot-reveal-modal">
        <button onClick={() => onCollect(loot)} data-testid="collect-loot-btn">
          Collect Loot
        </button>
      </div>
    );
  }
}))

// Mock DroneBlueprintRewardModal
vi.mock('../DroneBlueprintRewardModal.jsx', () => ({
  default: ({ blueprint, onAccept, show }) => {
    if (!show) return null;
    return (
      <div data-testid="drone-blueprint-modal">
        <span data-testid="blueprint-name">{blueprint?.blueprintId}</span>
        <button onClick={() => onAccept(blueprint)} data-testid="accept-blueprint-btn">
          Accept Blueprint
        </button>
      </div>
    );
  }
}))

// Import after mocks
import gameStateManager from '../../../managers/GameStateManager.js'
import tacticalMapStateManager from '../../../managers/TacticalMapStateManager.js'
import CombatOutcomeProcessor from '../../../logic/singlePlayer/CombatOutcomeProcessor.js'
import WinnerModal from '../WinnerModal.jsx'

describe('WinnerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleExitToMenu - game state cleanup', () => {
    /**
     * BUG TEST: When clicking "Exit to Menu" in multiplayer mode, game state
     * (player1, player2, gameActive, turnPhase, etc.) should be cleared.
     *
     * Current behavior: Only appState is changed to 'menu', game state persists
     * Expected behavior: resetGameState() should be called before setting appState
     *
     * This test documents the bug and will FAIL until fixed.
     */
    it('should call resetGameState() when exiting to menu after multiplayer victory', () => {
      // SETUP: Simulate multiplayer game state (not single-player extraction)
      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: null,  // NOT single-player extraction
        gameActive: true,
        turnPhase: 'action',
        player1: { name: 'Player 1' },
        player2: { name: 'Player 2' }
      })

      // Mock that run is NOT active (multiplayer mode)
      tacticalMapStateManager.isRunActive.mockReturnValue(false)

      // Render the WinnerModal in multiplayer victory state
      render(
        <WinnerModal
          winner="player1"
          localPlayerId="player1"
          show={true}
          onClose={() => {}}
        />
      )

      // ACT: Click "Exit to Menu" button
      const exitButton = screen.getByText('Exit to Menu')
      fireEvent.click(exitButton)

      // ASSERT: resetGameState should be called before setState
      // This assertion will FAIL because the current code doesn't call resetGameState
      expect(gameStateManager.resetGameState).toHaveBeenCalled()

      // Also verify setState was called to go to menu
      expect(gameStateManager.setState).toHaveBeenCalledWith({ appState: 'menu' })
    })

    it('should call resetGameState() when exiting to menu after multiplayer defeat', () => {
      // SETUP: Simulate multiplayer game after defeat
      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: null,
        gameActive: true,
        winner: 'player2',
        player1: { name: 'Player 1' },
        player2: { name: 'Player 2' }
      })

      // Mock that run is NOT active (multiplayer mode)
      tacticalMapStateManager.isRunActive.mockReturnValue(false)

      // Render the WinnerModal in multiplayer defeat state
      render(
        <WinnerModal
          winner="player2"
          localPlayerId="player1"
          show={true}
          onClose={() => {}}
        />
      )

      // ACT: Click "Exit to Menu" button (shown for defeat in multiplayer)
      const exitButton = screen.getByText('Exit to Menu')
      fireEvent.click(exitButton)

      // ASSERT: resetGameState should be called
      expect(gameStateManager.resetGameState).toHaveBeenCalled()
    })

    it('should NOT show Exit to Menu for single-player extraction mode', () => {
      // SETUP: Simulate single-player extraction mode
      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { enemyId: 'test-enemy' },  // IS single-player
        gameActive: true
      })

      // Mock that run IS active (extraction mode)
      tacticalMapStateManager.isRunActive.mockReturnValue(true)
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0
      })

      // Render the WinnerModal in extraction mode
      render(
        <WinnerModal
          winner="player1"
          localPlayerId="player1"
          show={true}
          onClose={() => {}}
        />
      )

      // ASSERT: Exit to Menu button should NOT exist
      // Extraction mode shows "Collect Salvage" or "Return to Hangar" instead
      expect(screen.queryByText('Exit to Menu')).toBeNull()
    })
  })

  /**
   * TDD Tests: Drone Blueprint Flow
   *
   * When winning combat at a Drone Blueprint PoI:
   * 1. Player clicks "Collect Salvage" → LootRevealModal shows
   * 2. After collecting loot, if pendingDroneBlueprint exists, show DroneBlueprintRewardModal
   * 3. When player accepts blueprint, call finalizeBlueprintCollection
   */
  describe('Drone Blueprint Flow', () => {
    const mockBlueprint = {
      blueprintId: 'Gunship',
      blueprintType: 'drone',
      rarity: 'Uncommon',
      droneData: { name: 'Gunship', attack: 3, hull: 4, speed: 2 }
    }

    it('should show DroneBlueprintRewardModal after loot collection when hasPendingDroneBlueprint is true', () => {
      // SETUP: Victory with pending blueprint
      CombatOutcomeProcessor.processCombatEnd.mockReturnValue({
        success: true,
        outcome: 'victory',
        loot: { cards: [], salvageItem: null, aiCores: 0 }
      })

      // First render: No pending blueprint yet
      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { enemyId: 'test' },
        hasPendingDroneBlueprint: false,
        pendingDroneBlueprint: null
      })

      tacticalMapStateManager.isRunActive.mockReturnValue(true)
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0
      })

      const { rerender } = render(
        <WinnerModal
          winner="player1"
          localPlayerId="player1"
          show={true}
          onClose={() => {}}
        />
      )

      // Click "Collect Salvage"
      fireEvent.click(screen.getByText('Collect Salvage'))

      // Simulate state change after finalizeLootCollection (blueprint available)
      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { enemyId: 'test' },
        hasPendingDroneBlueprint: true,
        pendingDroneBlueprint: mockBlueprint
      })

      // Collect loot from LootRevealModal
      fireEvent.click(screen.getByTestId('collect-loot-btn'))

      // Force re-render to pick up state change
      rerender(
        <WinnerModal
          winner="player1"
          localPlayerId="player1"
          show={true}
          onClose={() => {}}
        />
      )

      // ASSERT: DroneBlueprintRewardModal should be shown
      expect(screen.getByTestId('drone-blueprint-modal')).toBeInTheDocument()
      expect(screen.getByTestId('blueprint-name')).toHaveTextContent('Gunship')
    })

    it('should NOT show DroneBlueprintRewardModal when no pending blueprint', () => {
      // SETUP: Victory without blueprint
      CombatOutcomeProcessor.processCombatEnd.mockReturnValue({
        success: true,
        outcome: 'victory',
        loot: { cards: [], salvageItem: null, aiCores: 0 }
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { enemyId: 'test' },
        hasPendingDroneBlueprint: false,
        pendingDroneBlueprint: null
      })

      tacticalMapStateManager.isRunActive.mockReturnValue(true)
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0
      })

      render(
        <WinnerModal
          winner="player1"
          localPlayerId="player1"
          show={true}
          onClose={() => {}}
        />
      )

      // Click "Collect Salvage"
      fireEvent.click(screen.getByText('Collect Salvage'))

      // Collect loot
      fireEvent.click(screen.getByTestId('collect-loot-btn'))

      // ASSERT: DroneBlueprintRewardModal should NOT be shown
      expect(screen.queryByTestId('drone-blueprint-modal')).not.toBeInTheDocument()
    })

    it('should call finalizeBlueprintCollection when blueprint is accepted', () => {
      // SETUP: Pending blueprint after loot collection
      CombatOutcomeProcessor.processCombatEnd.mockReturnValue({
        success: true,
        outcome: 'victory',
        loot: { cards: [], salvageItem: null, aiCores: 0 }
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { enemyId: 'test' },
        hasPendingDroneBlueprint: true,
        pendingDroneBlueprint: mockBlueprint
      })

      tacticalMapStateManager.isRunActive.mockReturnValue(true)
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0
      })

      render(
        <WinnerModal
          winner="player1"
          localPlayerId="player1"
          show={true}
          onClose={() => {}}
        />
      )

      // Click "Collect Salvage" to show loot modal
      fireEvent.click(screen.getByText('Collect Salvage'))

      // Collect loot - should trigger blueprint modal
      fireEvent.click(screen.getByTestId('collect-loot-btn'))

      // ASSERT: Blueprint modal should be shown
      expect(screen.getByTestId('drone-blueprint-modal')).toBeInTheDocument()

      // Accept the blueprint
      fireEvent.click(screen.getByTestId('accept-blueprint-btn'))

      // ASSERT: finalizeBlueprintCollection should be called with the blueprint
      expect(CombatOutcomeProcessor.finalizeBlueprintCollection).toHaveBeenCalledTimes(1)
      expect(CombatOutcomeProcessor.finalizeBlueprintCollection).toHaveBeenCalledWith(mockBlueprint)
    })
  })
})
