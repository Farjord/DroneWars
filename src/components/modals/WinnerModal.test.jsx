import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ========================================
// WINNER MODAL TESTS
// ========================================
// Tests for game state cleanup on exit
// Specifically tests that resetGameState() is called when exiting to menu

// Mock dependencies BEFORE importing the component
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    resetGameState: vi.fn()
  }
}))

vi.mock('../../logic/singlePlayer/CombatOutcomeProcessor.js', () => ({
  default: {
    processCombatEnd: vi.fn(),
    finalizeLootCollection: vi.fn()
  }
}))

// Import after mocks
import gameStateManager from '../../managers/GameStateManager.js'
import WinnerModal from './WinnerModal.jsx'

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
        currentRunState: null,
        gameActive: true,
        turnPhase: 'action',
        player1: { name: 'Player 1' },
        player2: { name: 'Player 2' }
      })

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
        currentRunState: null,
        gameActive: true,
        winner: 'player2',
        player1: { name: 'Player 1' },
        player2: { name: 'Player 2' }
      })

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
        currentRunState: { shipSlotId: 0 },
        gameActive: true
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
})
