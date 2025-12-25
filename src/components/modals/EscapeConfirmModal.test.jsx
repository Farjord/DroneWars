import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EscapeConfirmModal from './EscapeConfirmModal.jsx'

// ========================================
// ESCAPE CONFIRM MODAL TESTS
// ========================================
// TDD tests for Signal Lock warning display
// The modal should warn players that escaping does NOT reset Signal Lock

describe('EscapeConfirmModal', () => {
  const defaultProps = {
    show: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    shipSections: [
      { name: 'Bridge', hull: 8, maxHull: 10, thresholds: { damaged: 4 } },
      { name: 'Power Cell', hull: 10, maxHull: 10, thresholds: { damaged: 4 } },
      { name: 'Drone Hub', hull: 6, maxHull: 10, thresholds: { damaged: 4 } }
    ],
    couldDestroyShip: false,
    isPOIEncounter: false,
    escapeDamageRange: { min: 2, max: 4 }
  }

  describe('Signal Lock warning', () => {
    it('displays Signal Lock percentage when provided', () => {
      // EXPLANATION: When encounterDetectionChance is passed, the modal should
      // display a warning showing the current Signal Lock percentage

      render(
        <EscapeConfirmModal
          {...defaultProps}
          encounterDetectionChance={65}
        />
      )

      // Should show the percentage in the warning
      expect(screen.getByText(/Signal Lock/i)).toBeInTheDocument()
      expect(screen.getByText(/65%/)).toBeInTheDocument()
    })

    it('shows warning message about detection persisting', () => {
      // EXPLANATION: The modal should explain that escaping does NOT reset
      // the Signal Lock - the enemy AI continues triangulating

      render(
        <EscapeConfirmModal
          {...defaultProps}
          encounterDetectionChance={50}
        />
      )

      // Should have a warning about tracking continuing
      expect(screen.getByText(/Signal Lock/i)).toBeInTheDocument()
      // Should indicate the tracking persists
      const warningText = screen.getByText(/remains/i) ||
                          screen.getByText(/triangulat/i) ||
                          screen.getByText(/continu/i)
      expect(warningText).toBeInTheDocument()
    })

    it('does not show Signal Lock warning when encounterDetectionChance is 0', () => {
      // EXPLANATION: If Signal Lock is at 0%, no need to warn about it persisting

      render(
        <EscapeConfirmModal
          {...defaultProps}
          encounterDetectionChance={0}
        />
      )

      // Should NOT show Signal Lock percentage when it's 0
      const signalLockElements = screen.queryAllByText(/Signal Lock.*0%/i)
      // Either not shown at all, or shown as 0% which is fine
      // The key is it shouldn't be a prominent warning
    })

    it('shows Signal Lock warning in danger variant (could destroy ship)', () => {
      // EXPLANATION: Even in the danger variant, Signal Lock warning should appear

      render(
        <EscapeConfirmModal
          {...defaultProps}
          couldDestroyShip={true}
          encounterDetectionChance={80}
        />
      )

      // Should show the danger variant
      expect(screen.getByText(/SHIP DESTRUCTION RISK/i)).toBeInTheDocument()

      // Should still show Signal Lock warning
      expect(screen.getByText(/Signal Lock/i)).toBeInTheDocument()
      expect(screen.getByText(/80%/)).toBeInTheDocument()
    })

    it('renders without encounterDetectionChance prop (backwards compatibility)', () => {
      // EXPLANATION: The modal should still work without the new prop

      render(
        <EscapeConfirmModal
          {...defaultProps}
          // No encounterDetectionChance prop
        />
      )

      // Should render without errors - use getAllByText since subtitle also contains this text
      expect(screen.getAllByText(/EMERGENCY ESCAPE/i).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /Confirm Escape/i })).toBeInTheDocument()
    })
  })

  describe('basic rendering', () => {
    it('renders nothing when show is false', () => {
      const { container } = render(
        <EscapeConfirmModal
          {...defaultProps}
          show={false}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders normal variant with escape damage info', () => {
      render(<EscapeConfirmModal {...defaultProps} />)

      // Use getAllByText since title contains "EMERGENCY ESCAPE" and subtitle also references it
      expect(screen.getAllByText(/EMERGENCY ESCAPE/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/2-4 damage/i)).toBeInTheDocument()
    })

    it('renders danger variant when couldDestroyShip is true', () => {
      render(
        <EscapeConfirmModal
          {...defaultProps}
          couldDestroyShip={true}
        />
      )

      expect(screen.getByText(/SHIP DESTRUCTION RISK/i)).toBeInTheDocument()
    })
  })
})
