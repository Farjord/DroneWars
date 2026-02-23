import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ========================================
// INTERCEPTION OPPORTUNITY MODAL TESTS
// ========================================
// Tests for the interception modal, including the new View Battlefield feature

// Mock DroneToken and ShipSection to simplify rendering
vi.mock('../../ui/DroneToken.jsx', () => ({
  default: ({ drone, onClick }) => (
    <div
      data-testid={`drone-token-${drone.id}`}
      onClick={onClick}
    >
      {drone.name}
    </div>
  )
}))

vi.mock('../../ui/ShipSection.jsx', () => ({
  default: ({ section }) => (
    <div data-testid={`ship-section-${section}`}>
      {section}
    </div>
  )
}))

import InterceptionOpportunityModal from '../InterceptionOpportunityModal.jsx'

describe('InterceptionOpportunityModal', () => {
  const mockOnIntercept = vi.fn()
  const mockOnDecline = vi.fn()
  const mockOnViewBattlefield = vi.fn()

  const mockChoiceData = {
    attackDetails: {
      attacker: { id: 'attacker-1', name: 'Enemy Drone' },
      target: { id: 'target-1', name: 'My Drone' },
      targetType: 'drone',
      lane: 'lane1'
    },
    interceptors: [
      { id: 'interceptor-1', name: 'Interceptor A' },
      { id: 'interceptor-2', name: 'Interceptor B' }
    ]
  }

  const defaultProps = {
    choiceData: mockChoiceData,
    show: true,
    onIntercept: mockOnIntercept,
    onDecline: mockOnDecline,
    onViewBattlefield: mockOnViewBattlefield,
    gameEngine: {},
    turnPhase: 'action',
    isMyTurn: false,
    passInfo: {},
    getLocalPlayerId: () => 'player1',
    localPlayerState: { shipSections: {} },
    shipAbilityMode: null,
    droneRefs: { current: {} },
    mandatoryAction: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should not render when show is false', () => {
      render(<InterceptionOpportunityModal {...defaultProps} show={false} />)
      expect(screen.queryByText('Interception Opportunity')).toBeNull()
    })

    it('should not render when choiceData is null', () => {
      render(<InterceptionOpportunityModal {...defaultProps} choiceData={null} />)
      expect(screen.queryByText('Interception Opportunity')).toBeNull()
    })

    it('should render when show is true and choiceData exists', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)
      expect(screen.getByText('Interception Opportunity')).toBeTruthy()
    })

    it('should display the attacker drone', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)
      expect(screen.getByTestId('drone-token-attacker-1')).toBeTruthy()
    })

    it('should display available interceptors', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)
      expect(screen.getByTestId('drone-token-interceptor-1')).toBeTruthy()
      expect(screen.getByTestId('drone-token-interceptor-2')).toBeTruthy()
    })
  })

  describe('onIntercept callback', () => {
    it('should call onIntercept when clicking an interceptor drone', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)

      const interceptor = screen.getByTestId('drone-token-interceptor-1')
      fireEvent.click(interceptor)

      expect(mockOnIntercept).toHaveBeenCalledWith(mockChoiceData.interceptors[0])
    })

    it('should call onIntercept with correct drone when clicking second interceptor', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)

      const interceptor = screen.getByTestId('drone-token-interceptor-2')
      fireEvent.click(interceptor)

      expect(mockOnIntercept).toHaveBeenCalledWith(mockChoiceData.interceptors[1])
    })
  })

  describe('onDecline callback', () => {
    it('should call onDecline when clicking Decline Interception button', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)

      const declineButton = screen.getByText('Decline Interception')
      fireEvent.click(declineButton)

      expect(mockOnDecline).toHaveBeenCalled()
    })

    it('should call onDecline when clicking the modal overlay', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)

      // The overlay has the dw-modal-overlay class
      const overlay = document.querySelector('.dw-modal-overlay')
      fireEvent.click(overlay)

      expect(mockOnDecline).toHaveBeenCalled()
    })
  })

  describe('onViewBattlefield callback (NEW FEATURE)', () => {
    /**
     * NEW FEATURE: View Battlefield button allows the player to close the modal
     * and select an interceptor directly from the battlefield via drag-and-drop.
     * This test verifies the button exists and calls the correct callback.
     */
    it('should render View Battlefield button', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)

      const viewBattlefieldButton = screen.getByText('View Battlefield')
      expect(viewBattlefieldButton).toBeTruthy()
    })

    it('should call onViewBattlefield when clicking View Battlefield button', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)

      const viewBattlefieldButton = screen.getByText('View Battlefield')
      fireEvent.click(viewBattlefieldButton)

      expect(mockOnViewBattlefield).toHaveBeenCalled()
      expect(mockOnDecline).not.toHaveBeenCalled() // Should NOT decline
      expect(mockOnIntercept).not.toHaveBeenCalled() // Should NOT intercept
    })

    it('should NOT call onViewBattlefield when clicking modal content area', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)

      // Click on the modal content, not the View Battlefield button
      const modalContent = document.querySelector('.dw-modal-content')
      fireEvent.click(modalContent)

      expect(mockOnViewBattlefield).not.toHaveBeenCalled()
    })
  })

  describe('ship section target', () => {
    it('should render ship section when targetType is section', () => {
      const shipTargetChoiceData = {
        ...mockChoiceData,
        attackDetails: {
          ...mockChoiceData.attackDetails,
          target: { name: 'Bridge' },
          targetType: 'section'
        }
      }

      const props = {
        ...defaultProps,
        choiceData: shipTargetChoiceData,
        localPlayerState: {
          shipSections: {
            Bridge: { hull: 5, maxHull: 5, shields: 2 }
          }
        }
      }

      render(<InterceptionOpportunityModal {...props} />)
      expect(screen.getByTestId('ship-section-Bridge')).toBeTruthy()
    })
  })

  describe('modal collapse/expand', () => {
    it('should toggle expanded state when clicking header', () => {
      render(<InterceptionOpportunityModal {...defaultProps} />)

      // Modal body should be visible initially
      const modalBody = document.querySelector('.dw-modal-body')
      expect(modalBody.style.opacity).not.toBe('0')

      // Click header to collapse
      const header = document.querySelector('.dw-modal-header')
      fireEvent.click(header)

      // Modal body should now have opacity 0 (collapsed)
      expect(modalBody.style.opacity).toBe('0')
    })
  })
})
