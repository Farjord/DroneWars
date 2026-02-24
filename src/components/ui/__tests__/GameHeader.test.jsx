import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ========================================
// GAME HEADER INTERCEPTION MODE TESTS
// ========================================
// Tests for the interception mode button group in the header

// Mock dependencies
vi.mock('../../../logic/phase/phaseDisplayUtils.js', () => ({
  getPhaseDisplayName: vi.fn((phase) => phase || 'Unknown Phase')
}))

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('../../../config/devConfig.js', () => ({
  default: { AI_HAND_DEBUG_MODE: false }
}))

vi.mock('../../../config/backgrounds.js', () => ({
  BACKGROUNDS: []
}))

import GameHeader from '../GameHeader.jsx'

describe('GameHeader - Interception Mode', () => {
  const mockHandleShowInterceptionDialog = vi.fn()
  const mockHandleResetInterception = vi.fn()
  const mockHandleConfirmInterception = vi.fn()

  const defaultProps = {
    localPlayerState: { hand: [], energy: 5, maxEnergy: 5 },
    opponentPlayerState: { hand: [], energy: 5, maxEnergy: 5 },
    localPlayerEffectiveStats: { totals: { energy: 5, maxEnergy: 5 } },
    opponentPlayerEffectiveStats: { totals: { energy: 5, maxEnergy: 5 } },
    turnPhase: 'action',
    turn: 1,
    roundNumber: 1,
    passInfo: {},
    firstPlayerOfRound: 'player1',
    shieldsToAllocate: 0,
    opponentShieldsToAllocate: 0,
    pendingShieldAllocations: {},
    pendingShieldsRemaining: 0,
    shieldsToRemove: 0,
    shieldsToAdd: 0,
    reallocationPhase: null,
    totalLocalPlayerDrones: 0,
    totalOpponentPlayerDrones: 0,
    getLocalPlayerId: () => 'player1',
    getOpponentPlayerId: () => 'player2',
    isMyTurn: () => true,
    currentPlayer: 'player1',
    isMultiplayer: () => false,
    handlePlayerPass: vi.fn(),
    handleExitGame: vi.fn(),
    handleResetShields: vi.fn(),
    handleConfirmShields: vi.fn(),
    handleCancelReallocation: vi.fn(),
    handleResetReallocation: vi.fn(),
    handleContinueToAddPhase: vi.fn(),
    handleConfirmReallocation: vi.fn(),
    handleRoundStartDraw: vi.fn(),
    handleMandatoryDiscardContinue: vi.fn(),
    handleMandatoryDroneRemovalContinue: vi.fn(),
    optionalDiscardCount: 0,
    mandatoryAction: null,
    excessCards: 0,
    excessDrones: 0,
    multiSelectState: null,
    AI_HAND_DEBUG_MODE: false,
    setShowAiHandModal: vi.fn(),
    onShowDebugModal: vi.fn(),
    onShowOpponentDrones: vi.fn(),
    onShowGlossary: vi.fn(),
    onShowAIStrategy: vi.fn(),
    onShowAddCardModal: vi.fn(),
    testMode: false,
    handleCancelMultiMove: vi.fn(),
    handleConfirmMultiMoveDrones: vi.fn(),
    selectedBackground: null,
    onBackgroundChange: vi.fn(),
    // Interception mode props
    interceptionModeActive: false,
    selectedInterceptor: null,
    handleShowInterceptionDialog: mockHandleShowInterceptionDialog,
    handleResetInterception: mockHandleResetInterception,
    handleConfirmInterception: mockHandleConfirmInterception
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('interception mode inactive', () => {
    it('should NOT render interception buttons when interceptionModeActive is false', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={false} />)

      expect(screen.queryByText('Show Dialog')).toBeNull()
      // Note: "Reset" and "Confirm" might exist for other button groups, but interception-specific ones should not
    })
  })

  describe('interception mode active', () => {
    it('should render Show Dialog button when interceptionModeActive is true', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      expect(screen.getByText('Show Dialog')).toBeTruthy()
    })

    it('should render Reset button when interceptionModeActive is true', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      expect(screen.getByText('Reset')).toBeTruthy()
    })

    it('should render Confirm button when interceptionModeActive is true', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      // There should be a Confirm button specifically for interception
      const confirmButtons = screen.getAllByText('Confirm')
      expect(confirmButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('should call handleShowInterceptionDialog when Show Dialog is clicked', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      const showDialogButton = screen.getByText('Show Dialog')
      fireEvent.click(showDialogButton)

      expect(mockHandleShowInterceptionDialog).toHaveBeenCalled()
    })

    it('should call handleResetInterception when Reset is clicked', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      const resetButton = screen.getByText('Reset')
      fireEvent.click(resetButton)

      expect(mockHandleResetInterception).toHaveBeenCalled()
    })

    describe('Confirm button state', () => {
      it('should have Confirm button always enabled (no disabled state based on selectedInterceptor)', () => {
        render(
          <GameHeader
            {...defaultProps}
            interceptionModeActive={true}
            selectedInterceptor={null}
          />
        )

        const confirmButtons = screen.getAllByText('Confirm')
        // The interception Confirm button should be enabled (source has no disabled prop)
        const enabledConfirm = confirmButtons.find(btn =>
          !btn.closest('button')?.disabled
        )
        expect(enabledConfirm).toBeTruthy()
      })

      it('should have Confirm button enabled when interceptor is selected', () => {
        const mockInterceptor = { id: 'drone-1', name: 'Test Interceptor' }
        render(
          <GameHeader
            {...defaultProps}
            interceptionModeActive={true}
            selectedInterceptor={mockInterceptor}
          />
        )

        const confirmButtons = screen.getAllByText('Confirm')
        // At least one should be enabled
        const enabledConfirm = confirmButtons.find(btn =>
          !btn.closest('button')?.disabled
        )
        expect(enabledConfirm).toBeTruthy()
      })

      it('should call handleConfirmInterception when Confirm is clicked', () => {
        render(
          <GameHeader
            {...defaultProps}
            interceptionModeActive={true}
            selectedInterceptor={null}
          />
        )

        // Find and click the Confirm button
        const confirmButtons = screen.getAllByText('Confirm')
        const confirmBtn = confirmButtons.find(btn =>
          !btn.closest('button')?.disabled
        )
        fireEvent.click(confirmBtn)

        expect(mockHandleConfirmInterception).toHaveBeenCalled()
      })
    })

    describe('status text display', () => {
      it('should display intercepting status text when in interception mode', () => {
        render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

        // Should show some indication of interception mode
        // This could be "Intercepting" or similar text
        expect(screen.getByText(/intercept/i)).toBeTruthy()
      })
    })
  })

  describe('button styling', () => {
    it('Show Dialog button should have confirm styling', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      const showDialogButton = screen.getByText('Show Dialog').closest('button')
      // Check for confirm button class (styled via CSS)
      expect(showDialogButton.className).toContain('dw-btn-confirm')
    })

    it('Reset button should have warning styling', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      const resetButton = screen.getByText('Reset').closest('button')
      expect(resetButton.className).toContain('dw-btn-warning')
    })
  })
})
