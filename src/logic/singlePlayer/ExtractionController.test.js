import { describe, it, expect, vi, beforeEach } from 'vitest'

// ========================================
// EXTRACTION CONTROLLER TESTS
// ========================================
// Tests for run abandonment and state cleanup
// Specifically tests that game state is properly cleared when abandoning mid-combat

// Mock all dependencies
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    get: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
    endRun: vi.fn(),
    resetGameState: vi.fn()
  }
}))

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('./DroneDamageProcessor.js', () => ({
  default: {}
}))

vi.mock('../detection/DetectionManager.js', () => ({
  default: {}
}))

vi.mock('../../data/mapData.js', () => ({
  mapTiers: []
}))

vi.mock('../../data/economyData.js', () => ({
  ECONOMY: {}
}))

// Import after mocks are set up
import ExtractionController from './ExtractionController.js'
import gameStateManager from '../../managers/GameStateManager.js'

describe('ExtractionController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('abandonRun - mid-combat cleanup', () => {
    /**
     * BUG TEST: When abandoning a run mid-combat, game state (player1, player2,
     * gameActive, turnPhase, etc.) should be cleared so the next combat starts fresh.
     *
     * Current behavior: Only currentRunState is cleared, game state persists
     * Expected behavior: Both run state AND game state should be cleared
     *
     * This test documents the bug and will FAIL until fixed.
     */
    it('should clear game state when abandoning mid-combat', () => {
      // SETUP: Simulate being in mid-combat
      // This is the state when player clicks "Abandon" during a game
      gameStateManager.get.mockImplementation((key) => {
        const midCombatState = {
          appState: 'inGame',
          turnPhase: 'deployment',
          gameActive: true,
          gameStage: 'roundLoop',
          roundNumber: 1,
          player1: { name: 'Player', deck: [], hand: [] },
          player2: { name: 'AI', deck: [], hand: [] },
          currentRunState: { shipSlotId: 0 }
        }
        return midCombatState[key]
      })

      // ACT: Abandon the run
      ExtractionController.abandonRun()

      // ASSERT: resetGameState should be called when abandoning mid-combat
      expect(gameStateManager.resetGameState).toHaveBeenCalled()

      // ASSERT: endRun should still be called
      expect(gameStateManager.endRun).toHaveBeenCalledWith(false)
    })

    /**
     * Verify that abandoning outside of combat doesn't unnecessarily reset state
     */
    it('should NOT call resetGameState when abandoning from tactical map (not mid-combat)', () => {
      // SETUP: Simulate being on tactical map (not in combat)
      gameStateManager.get.mockImplementation((key) => {
        const tacticalMapState = {
          appState: 'tacticalMap',
          turnPhase: null,
          gameActive: false,
          gameStage: 'preGame',
          roundNumber: 0,
          player1: null,
          player2: null,
          currentRunState: { shipSlotId: 0 }
        }
        return tacticalMapState[key]
      })

      // ACT: Abandon the run
      ExtractionController.abandonRun()

      // ASSERT: resetGameState should NOT be called (not in combat)
      expect(gameStateManager.resetGameState).not.toHaveBeenCalled()

      // ASSERT: endRun should still be called
      expect(gameStateManager.endRun).toHaveBeenCalledWith(false)

      // ASSERT: appState should go to hangar
      const hangarCall = gameStateManager.setState.mock.calls.find(
        call => call[0].appState === 'hangar'
      )
      expect(hangarCall).toBeDefined()
    })
  })
})
