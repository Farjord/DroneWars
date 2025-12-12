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
})
