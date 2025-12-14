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
    collectedLoot: [],
    playerPosition: { q: 0, r: 0 },
    insertionGate: { q: 0, r: 0 },
    mapData: {
      gates: [{ q: 0, r: 0 }, { q: 5, r: 5 }]
    }
  },
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
    it('displays inventory button with loot count', () => {
      const props = createDefaultProps()
      props.currentRunState.collectedLoot = [{ id: 1 }, { id: 2 }]

      render(<TacticalMapHUD {...props} />)

      expect(screen.getByText('Inventory (2)')).toBeInTheDocument()
    })

    it('displays inventory button with zero count when no loot', () => {
      const props = createDefaultProps()
      props.currentRunState.collectedLoot = []

      render(<TacticalMapHUD {...props} />)

      expect(screen.getByText('Inventory (0)')).toBeInTheDocument()
    })

    it('displays abandon run button when not at extraction gate', () => {
      const props = createDefaultProps()

      render(<TacticalMapHUD {...props} />)

      expect(screen.getByText('Abandon Run')).toBeInTheDocument()
    })
  })

})
