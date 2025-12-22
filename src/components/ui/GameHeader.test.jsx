import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ========================================
// GAME HEADER INTERCEPTION MODE TESTS
// ========================================
// Tests for the interception mode button group in the header

// Mock dependencies
vi.mock('../../utils/gameUtils.js', () => ({
  getPhaseDisplayName: vi.fn((phase) => phase || 'Unknown Phase')
}))

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('../../config/devConfig.js', () => ({
  default: { AI_HAND_DEBUG_MODE: false }
}))

vi.mock('../../config/backgrounds.js', () => ({
  BACKGROUNDS: []
}))

import GameHeader from './GameHeader.jsx'

describe('GameHeader - Interception Mode', () => {
  const mockHandleShowInterceptionDialog = vi.fn()
  const mockHandleDeclineInterceptionFromHeader = vi.fn()
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
    // NEW: Interception mode props
    interceptionModeActive: false,
    selectedInterceptor: null,
    handleShowInterceptionDialog: mockHandleShowInterceptionDialog,
    handleDeclineInterceptionFromHeader: mockHandleDeclineInterceptionFromHeader,
    handleConfirmInterception: mockHandleConfirmInterception
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('interception mode inactive', () => {
    it('should NOT render interception buttons when interceptionModeActive is false', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={false} />)

      expect(screen.queryByText('Show Dialog')).toBeNull()
      expect(screen.queryByText('Decline')).toBeNull()
      // Note: "Confirm" might exist for other button groups, but interception-specific Confirm should not
    })
  })

  describe('interception mode active', () => {
    it('should render Show Dialog button when interceptionModeActive is true', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      expect(screen.getByText('Show Dialog')).toBeTruthy()
    })

    it('should render Decline button when interceptionModeActive is true', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      expect(screen.getByText('Decline')).toBeTruthy()
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

    it('should call handleDeclineInterceptionFromHeader when Decline is clicked', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      const declineButton = screen.getByText('Decline')
      fireEvent.click(declineButton)

      expect(mockHandleDeclineInterceptionFromHeader).toHaveBeenCalled()
    })

    describe('Confirm button state', () => {
      it('should have Confirm button disabled when no interceptor selected', () => {
        render(
          <GameHeader
            {...defaultProps}
            interceptionModeActive={true}
            selectedInterceptor={null}
          />
        )

        const confirmButtons = screen.getAllByText('Confirm')
        // Find the interception Confirm button (should be disabled)
        const interceptionConfirm = confirmButtons.find(btn =>
          btn.closest('button')?.disabled
        )
        expect(interceptionConfirm).toBeTruthy()
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

      it('should call handleConfirmInterception when Confirm is clicked with interceptor selected', () => {
        const mockInterceptor = { id: 'drone-1', name: 'Test Interceptor' }
        render(
          <GameHeader
            {...defaultProps}
            interceptionModeActive={true}
            selectedInterceptor={mockInterceptor}
          />
        )

        // Find and click the enabled Confirm button
        const confirmButtons = screen.getAllByText('Confirm')
        const enabledConfirm = confirmButtons.find(btn =>
          !btn.closest('button')?.disabled
        )
        if (enabledConfirm) {
          fireEvent.click(enabledConfirm)
        }

        expect(mockHandleConfirmInterception).toHaveBeenCalled()
      })

      it('should NOT call handleConfirmInterception when Confirm is clicked without interceptor', () => {
        render(
          <GameHeader
            {...defaultProps}
            interceptionModeActive={true}
            selectedInterceptor={null}
          />
        )

        const confirmButtons = screen.getAllByText('Confirm')
        // Try to click the disabled button
        confirmButtons.forEach(btn => {
          if (btn.closest('button')?.disabled) {
            fireEvent.click(btn)
          }
        })

        expect(mockHandleConfirmInterception).not.toHaveBeenCalled()
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

    it('Decline button should have danger styling', () => {
      render(<GameHeader {...defaultProps} interceptionModeActive={true} />)

      const declineButton = screen.getByText('Decline').closest('button')
      // Check for danger button class (styled via CSS)
      expect(declineButton.className).toContain('dw-btn-danger')
    })
  })
})
