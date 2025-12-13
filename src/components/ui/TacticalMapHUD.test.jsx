import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TacticalMapHUD from './TacticalMapHUD.jsx'

// ========================================
// TACTICAL MAP HUD TESTS
// ========================================
// Tests for HUD display elements

// Default props for testing
const createDefaultProps = () => ({
  currentRunState: {
    creditsEarned: 100,
    collectedLoot: [],
    playerPosition: { q: 0, r: 0 },
    insertionGate: { q: 0, r: 0 },
    mapData: {
      gates: [{ q: 0, r: 0 }, { q: 5, r: 5 }]
    },
    shipSlotId: 0,
    shipSections: {
      bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
      powerCell: { hull: 8, maxHull: 8, thresholds: { damaged: 4 } },
      droneControl: { hull: 12, maxHull: 12, thresholds: { damaged: 6 } }
    }
  },
  shipSections: [
    { id: 'bridge', type: 'Bridge', hull: 10, maxHull: 10 },
    { id: 'powerCell', type: 'Power Cell', hull: 8, maxHull: 8 },
    { id: 'droneControl', type: 'Drone Control', hull: 12, maxHull: 12 }
  ],
  onExtractClick: vi.fn(),
  onAbandonClick: vi.fn(),
  onInventoryClick: vi.fn()
})

describe('TacticalMapHUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // HUD ELEMENTS TESTS
  // ========================================

  describe('HUD elements', () => {
    it('displays credits earned', () => {
      const props = createDefaultProps()
      props.currentRunState.creditsEarned = 250

      render(<TacticalMapHUD {...props} />)

      expect(screen.getByText('250')).toBeInTheDocument()
    })

    it('displays loot count', () => {
      const props = createDefaultProps()
      props.currentRunState.collectedLoot = [{ id: 1 }, { id: 2 }]

      render(<TacticalMapHUD {...props} />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('displays extraction limit', () => {
      const props = createDefaultProps()

      render(<TacticalMapHUD {...props} />)

      expect(screen.getByText('Extract Limit')).toBeInTheDocument()
    })
  })

  // ========================================
  // SHIP SECTION STATUS COLORING TESTS (TDD)
  // ========================================
  // Tests that ship sections display with correct colors based on
  // their health status (healthy/damaged/critical) using thresholds

  describe('Ship section status coloring', () => {
    /**
     * Helper to find the section hull display by section type label
     */
    const findSectionHullByType = (container, sectionType) => {
      const statDivs = container.querySelectorAll('.hud-stat')
      for (const div of statDivs) {
        const label = div.querySelector('.stat-label')
        if (label && label.textContent === sectionType) {
          return div.querySelector('.stat-value')
        }
      }
      return null
    }

    it('should display healthy section with healthy color class', () => {
      // EXPLANATION: A section with hull > damaged threshold should be healthy
      // Reconnaissance Corvette thresholds: damaged=4, critical=0
      // Hull of 8 > 4, so it's healthy

      const props = createDefaultProps()
      props.shipSections = [
        {
          id: 'bridge',
          type: 'Bridge',
          hull: 8,  // Full health
          maxHull: 8,
          thresholds: { damaged: 4, critical: 0 }
        }
      ]

      const { container } = render(<TacticalMapHUD {...props} />)

      // Find the hull display for Bridge section specifically
      const hullDisplay = findSectionHullByType(container, 'Bridge')

      expect(hullDisplay).not.toBeNull()
      expect(hullDisplay.textContent).toBe('8/8')
      // Should have healthy color class
      expect(hullDisplay.className).toMatch(/healthy/i)
    })

    it('should display damaged section with warning color class', () => {
      // EXPLANATION: A section with hull <= damaged threshold but > critical should be damaged (warning)
      // Hull of 4 <= 4 (damaged threshold), and 4 > 0 (critical), so it's damaged

      const props = createDefaultProps()
      props.shipSections = [
        {
          id: 'bridge',
          type: 'Bridge',
          hull: 4,  // At damaged threshold
          maxHull: 8,
          thresholds: { damaged: 4, critical: 0 }
        }
      ]

      const { container } = render(<TacticalMapHUD {...props} />)

      // Find the hull display for Bridge section specifically
      const hullDisplay = findSectionHullByType(container, 'Bridge')

      expect(hullDisplay).not.toBeNull()
      expect(hullDisplay.textContent).toBe('4/8')
      // Should have warning color class (for damaged state)
      expect(hullDisplay.className).toMatch(/warning/i)
    })

    it('should display critical section with critical color class', () => {
      // EXPLANATION: A section with hull <= critical threshold should be critical
      // Hull of 0 <= 0 (critical threshold), so it's critical

      const props = createDefaultProps()
      props.shipSections = [
        {
          id: 'bridge',
          type: 'Bridge',
          hull: 0,  // Critical
          maxHull: 8,
          thresholds: { damaged: 4, critical: 0 }
        }
      ]

      const { container } = render(<TacticalMapHUD {...props} />)

      // Find the hull display for Bridge section specifically
      const hullDisplay = findSectionHullByType(container, 'Bridge')

      expect(hullDisplay).not.toBeNull()
      expect(hullDisplay.textContent).toBe('0/8')
      // Should have critical color class
      expect(hullDisplay.className).toMatch(/critical/i)
    })

    it('should handle Heavy Assault Carrier thresholds correctly', () => {
      // EXPLANATION: Heavy Assault Carrier has thresholds: damaged=5, critical=2
      // Hull of 2 <= 2 (critical threshold), so it's critical

      const props = createDefaultProps()
      props.shipSections = [
        {
          id: 'bridge',
          type: 'Bridge',
          hull: 2,  // At critical threshold
          maxHull: 12,
          thresholds: { damaged: 5, critical: 2 }
        }
      ]

      const { container } = render(<TacticalMapHUD {...props} />)

      // Find the hull display
      const hullDisplay = findSectionHullByType(container, 'Bridge')

      expect(hullDisplay).not.toBeNull()
      expect(hullDisplay.textContent).toBe('2/12')
      // Should have critical color class
      expect(hullDisplay.className).toMatch(/critical/i)
    })

    it('should use percentage-based coloring when no thresholds provided (fallback)', () => {
      // EXPLANATION: For backwards compatibility, if thresholds aren't provided,
      // should fall back to percentage-based coloring

      const props = createDefaultProps()
      props.shipSections = [
        {
          id: 'bridge',
          type: 'Bridge',
          hull: 3,  // 30% health (3/10 = 30%)
          maxHull: 10
          // No thresholds - should fall back to percentage
        }
      ]

      const { container } = render(<TacticalMapHUD {...props} />)

      // Find the hull display
      const hullDisplay = findSectionHullByType(container, 'Bridge')

      // Should still render without errors
      expect(hullDisplay).not.toBeNull()
      expect(hullDisplay.textContent).toBe('3/10')
    })
  })
})
