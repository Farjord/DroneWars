import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'

// ========================================
// ESCAPE LOADING SCREEN TESTS
// ========================================
// Tests for the escape animation screen shown after confirming escape
// Shows real-time damage hits and requires user acknowledgment

import EscapeLoadingScreen from '../EscapeLoadingScreen.jsx'

describe('EscapeLoadingScreen', () => {
  const mockOnComplete = vi.fn()

  const defaultEscapeData = {
    totalDamage: 3,
    shipSections: {
      'Bridge': { hull: 6, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
      'Power Cell': { hull: 7, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
      'Drone Control Hub': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
    },
    initialSections: {
      'Bridge': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
      'Power Cell': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
      'Drone Control Hub': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
    },
    damageHits: [
      { section: 'Bridge', newHull: 7, maxHull: 8 },
      { section: 'Bridge', newHull: 6, maxHull: 8 },
      { section: 'Power Cell', newHull: 7, maxHull: 8 }
    ],
    aiName: 'Rogue Scout Pattern'
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('should render with escape data', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByText(/EMERGENCY ESCAPE/i)).toBeInTheDocument()
    })

    it('should display AI name being evaded', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByText(/Evading Rogue Scout Pattern/i)).toBeInTheDocument()
    })

    it('should have amber/warning themed overlay class', () => {
      const { container } = render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      const overlay = container.querySelector('.escape-loading-overlay')
      expect(overlay).toBeInTheDocument()
    })
  })

  describe('progress animation', () => {
    it('should start at 0% progress', () => {
      const { container } = render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      const progressBar = container.querySelector('.escape-progress-fill')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should increment progress over time', () => {
      const { container } = render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Advance by 500ms (5 ticks at 100ms each = 25%)
      act(() => {
        vi.advanceTimersByTime(500)
      })

      const progressBar = container.querySelector('.escape-progress-fill')
      expect(progressBar).toHaveStyle({ width: '25%' })
    })

    it('should reach 100% after ~2 seconds', () => {
      const { container } = render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Advance to 2000ms
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const progressBar = container.querySelector('.escape-progress-fill')
      expect(progressBar).toHaveStyle({ width: '100%' })
    })
  })

  describe('status messages', () => {
    it('should show "Initiating evasive maneuvers..." at start', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByText('Initiating evasive maneuvers...')).toBeInTheDocument()
    })

    it('should cycle through messages as progress increases', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // At 0%
      expect(screen.getByText('Initiating evasive maneuvers...')).toBeInTheDocument()

      // Advance to 20% (400ms)
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(screen.getByText('Jamming tracking signals...')).toBeInTheDocument()

      // Advance to 40% (400ms more = 800ms total)
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(screen.getByText('Calculating escape vector...')).toBeInTheDocument()

      // Advance to 60% (400ms more = 1200ms total)
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(screen.getByText('Taking evasive damage...')).toBeInTheDocument()

      // Advance to 80% (400ms more = 1600ms total)
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(screen.getByText('Breaking contact...')).toBeInTheDocument()
    })
  })

  describe('real-time damage display', () => {
    it('should start with initial hull values (before damage)', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Initial values - all three sections at 8/8
      const hullDisplays = screen.getAllByText('8/8')
      expect(hullDisplays.length).toBe(3)
    })

    it('should show 0 damage revealed initially', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Damage counter should show 0/3
      expect(screen.getByText(/0/)).toBeInTheDocument()
    })

    it('should reveal damage hits progressively after 1200ms', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Before any hits (1200ms) - damage counter shows revealed/total
      act(() => {
        vi.advanceTimersByTime(1100)
      })
      // Still 0 damage shown - damage text format: "Ship sustained <strong>0</strong>/3 damage"
      expect(screen.getByText('0')).toBeInTheDocument()

      // First hit at 1200ms
      act(() => {
        vi.advanceTimersByTime(200)
      })
      // Now 1 damage shown
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should update section hull when hit is revealed', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // First hit targets Bridge: 8 -> 7
      act(() => {
        vi.advanceTimersByTime(1300)
      })

      // Bridge should now show 7/8
      expect(screen.getByText('7/8')).toBeInTheDocument()
    })

    it('should flash section when hit is revealed', () => {
      const { container } = render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // First hit at 1200ms
      act(() => {
        vi.advanceTimersByTime(1200)
      })

      // Section should have hit class
      const hitSection = container.querySelector('.escape-section-hit')
      expect(hitSection).toBeInTheDocument()
    })

    it('should clear flash after 300ms', () => {
      const { container } = render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // First hit at 1200ms
      act(() => {
        vi.advanceTimersByTime(1200)
      })
      expect(container.querySelector('.escape-section-hit')).toBeInTheDocument()

      // After 300ms flash should clear
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(container.querySelector('.escape-section-hit')).not.toBeInTheDocument()
    })
  })

  describe('completion and acknowledgment', () => {
    it('should show Continue button when escape is complete', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Button not shown initially
      expect(screen.queryByText('Continue')).not.toBeInTheDocument()

      // Advance past all damage hits + buffer
      // 3 hits at 1200 + (0*400), 1200 + (1*400), 1200 + (2*400) = 1200, 1600, 2000
      // Complete time: 1200 + (3 * 400) + 500 = 2900ms
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('should NOT auto-complete - requires button click', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Advance well past completion time
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // onComplete should NOT have been called yet
      expect(mockOnComplete).not.toHaveBeenCalled()
    })

    it('should call onComplete when Continue button is clicked', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Advance to show button (2900ms to complete)
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // Click continue
      fireEvent.click(screen.getByText('Continue'))

      // Wait for fade animation
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockOnComplete).toHaveBeenCalledTimes(1)
    })

    it('should add fade-out class when Continue is clicked', () => {
      const { container } = render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Advance to show button (2900ms to complete)
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // No fade-out initially
      expect(container.querySelector('.fade-out')).not.toBeInTheDocument()

      // Click continue
      fireEvent.click(screen.getByText('Continue'))

      expect(container.querySelector('.fade-out')).toBeInTheDocument()
    })

    it('should show "ESCAPE SUCCESSFUL" when complete', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      // Advance to completion (2900ms)
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.getByText('ESCAPE SUCCESSFUL')).toBeInTheDocument()
    })
  })

  describe('damage display', () => {
    it('should show section names', () => {
      render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByText('Bridge')).toBeInTheDocument()
      expect(screen.getByText('Power Cell')).toBeInTheDocument()
      expect(screen.getByText('Drone Control Hub')).toBeInTheDocument()
    })

    it('should color-code hull based on damage thresholds', () => {
      const damagedEscapeData = {
        ...defaultEscapeData,
        initialSections: {
          'Bridge': { hull: 3, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
          'Power Cell': { hull: 5, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
          'Drone Control Hub': { hull: 0, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
        },
        damageHits: []
      }

      const { container } = render(
        <EscapeLoadingScreen
          escapeData={damagedEscapeData}
          onComplete={mockOnComplete}
        />
      )

      const sectionRows = container.querySelectorAll('.escape-section-row')
      expect(sectionRows.length).toBe(3)
    })

    it('should handle zero damage gracefully', () => {
      const zeroDamageData = {
        ...defaultEscapeData,
        totalDamage: 0,
        damageHits: []
      }

      render(
        <EscapeLoadingScreen
          escapeData={zeroDamageData}
          onComplete={mockOnComplete}
        />
      )

      // Should show 0 damage
      expect(screen.getByText(/0/)).toBeInTheDocument()
    })
  })

  describe('cleanup', () => {
    it('should clear timers on unmount', () => {
      const { unmount } = render(
        <EscapeLoadingScreen
          escapeData={defaultEscapeData}
          onComplete={mockOnComplete}
        />
      )

      unmount()

      // Advance time after unmount
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // onComplete should NOT have been called since component unmounted
      expect(mockOnComplete).not.toHaveBeenCalled()
    })
  })
})
