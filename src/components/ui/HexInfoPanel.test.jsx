import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ========================================
// HEX INFO PANEL TESTS
// ========================================
// Tests for blockade risk display below detection meter

// Mock DetectionManager
vi.mock('../../logic/detection/DetectionManager.js', () => ({
  default: {
    getCurrentDetection: vi.fn(),
    getHexDetectionCost: vi.fn(() => 5)
  }
}))

// Mock MovementController
vi.mock('../../logic/map/MovementController.js', () => ({
  default: {
    getMovementPreview: vi.fn(() => ({
      valid: true,
      distance: 3,
      newDetection: 45,
      path: []
    })),
    getHexEncounterChance: vi.fn(() => 15),
    calculateEncounterRisk: vi.fn(() => 10)
  }
}))

// Import after mocks
import HexInfoPanel from './HexInfoPanel.jsx'
import DetectionManager from '../../logic/detection/DetectionManager.js'

// Default props for testing
const createDefaultProps = () => ({
  waypoints: [],
  currentDetection: 25,
  playerPosition: { q: 0, r: 0 },
  mapData: {
    tier: 1,
    hexes: {},
    gates: [{ q: 5, r: 0 }]
  },
  inspectedHex: null,
  onWaypointClick: vi.fn(),
  onCommence: vi.fn(),
  onClearAll: vi.fn(),
  onBackToJourney: vi.fn(),
  onToggleWaypoint: vi.fn(),
  isWaypointFn: vi.fn(() => false),
  isMoving: false,
  isPaused: false,
  onTogglePause: vi.fn(),
  onCancel: vi.fn(),
  currentWaypointIndex: 0,
  currentHexIndex: 0,
  totalWaypoints: 0,
  tierConfig: {
    detectionTriggers: { looting: 10 }
  },
  mapRadius: 5,
  lootedPOIs: []
})

describe('HexInfoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    DetectionManager.getCurrentDetection.mockReturnValue(25)
  })

  // ========================================
  // BLOCKADE RISK DISPLAY TESTS
  // ========================================

  describe('blockade risk display', () => {
    it('displays blockade risk label in waypoint list view', () => {
      // EXPLANATION: Blockade risk should always be visible in the panel
      // below the detection meter

      const props = createDefaultProps()
      props.currentDetection = 30

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('Extraction Blockade Chance')).toBeInTheDocument()
    })

    it('displays blockade percentage matching detection level', () => {
      // EXPLANATION: Blockade chance equals detection level exactly

      const props = createDefaultProps()
      props.currentDetection = 45

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('45%')).toBeInTheDocument()
    })

    it('displays rounded blockade percentage for decimal detection', () => {
      // EXPLANATION: Detection can be decimal but display should be rounded

      const props = createDefaultProps()
      props.currentDetection = 33.7

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('34%')).toBeInTheDocument()
    })

    it('displays 0% blockade when detection is 0', () => {
      // EXPLANATION: At start of run, detection is 0 so blockade is 0%

      const props = createDefaultProps()
      props.currentDetection = 0

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('shows warning styling when detection is at or above 50%', () => {
      // EXPLANATION: At 50%+ detection, blockade should show warning color

      const props = createDefaultProps()
      props.currentDetection = 55

      render(<HexInfoPanel {...props} />)

      const blockadeValue = screen.getByTestId('blockade-risk-value')
      expect(blockadeValue).toHaveClass('blockade-warning')
    })

    it('shows critical styling when detection is at or above 80%', () => {
      // EXPLANATION: At 80%+ detection, blockade should show critical/danger color

      const props = createDefaultProps()
      props.currentDetection = 85

      render(<HexInfoPanel {...props} />)

      const blockadeValue = screen.getByTestId('blockade-risk-value')
      expect(blockadeValue).toHaveClass('blockade-critical')
    })

    it('shows no warning styling when detection is below 50%', () => {
      // EXPLANATION: Below 50%, should not have warning or critical class

      const props = createDefaultProps()
      props.currentDetection = 45

      render(<HexInfoPanel {...props} />)

      const blockadeValue = screen.getByTestId('blockade-risk-value')
      expect(blockadeValue).not.toHaveClass('blockade-warning')
      expect(blockadeValue).not.toHaveClass('blockade-critical')
    })

    it('displays blockade risk in hex info view when inspecting hex', () => {
      // EXPLANATION: Blockade should be visible in hex info view too

      const props = createDefaultProps()
      props.currentDetection = 40
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('Extraction Blockade Chance')).toBeInTheDocument()
      expect(screen.getByText('40%')).toBeInTheDocument()
    })

    it('displays blockade risk during movement', () => {
      // EXPLANATION: Blockade should be visible while moving too

      const props = createDefaultProps()
      props.currentDetection = 50
      props.isMoving = true
      props.waypoints = [{ hex: { q: 3, r: 0 }, pathFromPrev: [] }]
      props.totalWaypoints = 1

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('Extraction Blockade Chance')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('blockade risk updates with detection changes', () => {
      // EXPLANATION: When detection changes, blockade display should update

      const props = createDefaultProps()
      props.currentDetection = 30

      const { rerender } = render(<HexInfoPanel {...props} />)
      expect(screen.getByText('30%')).toBeInTheDocument()

      props.currentDetection = 60
      rerender(<HexInfoPanel {...props} />)
      expect(screen.getByText('60%')).toBeInTheDocument()
    })
  })

  // ========================================
  // EXISTING FUNCTIONALITY SANITY CHECKS
  // ========================================

  describe('existing panel elements', () => {
    it('displays detection meter', () => {
      // EXPLANATION: Detection meter should still be present

      const props = createDefaultProps()

      render(<HexInfoPanel {...props} />)

      // Detection meter has the detection value
      expect(screen.getByText('Waypoints')).toBeInTheDocument()
    })

    it('displays empty state when no waypoints', () => {
      // EXPLANATION: Panel should show empty state guidance

      const props = createDefaultProps()

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('No waypoints planned')).toBeInTheDocument()
    })

    it('shows back button in hex info view', () => {
      // EXPLANATION: When inspecting hex, back button should appear

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('← Back')).toBeInTheDocument()
    })
  })

  // ========================================
  // STAT INFO TOOLTIP TESTS
  // ========================================

  describe('stat info tooltips', () => {
    it('renders info icon next to Extraction Blockade Chance label', () => {
      // EXPLANATION: Info icons should appear next to stat labels
      // to help players understand game mechanics

      const props = createDefaultProps()
      render(<HexInfoPanel {...props} />)

      // Find the stat-info-icon within the panel
      const infoIcons = document.querySelectorAll('.stat-info-icon')
      expect(infoIcons.length).toBeGreaterThan(0)
    })

    it('shows tooltip on hover for Extraction Blockade Chance', () => {
      // EXPLANATION: Tooltip appears when hovering over info icon

      const props = createDefaultProps()
      render(<HexInfoPanel {...props} />)

      // Find the blockade risk section and hover over its info wrapper
      const blockadeSection = document.querySelector('.blockade-risk-display')
      const wrapper = blockadeSection.querySelector('.stat-info-wrapper')
      fireEvent.mouseEnter(wrapper)

      const tooltip = screen.getByText(/Chance enemies intercept you when extracting/i)
      expect(tooltip).toBeInTheDocument()
      expect(tooltip).toHaveClass('stat-tooltip')
    })

    it('shows Movement Encounter Chance tooltip on hover for empty hexes', () => {
      // EXPLANATION: Empty hexes show movement encounter chance, not salvage risk

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      render(<HexInfoPanel {...props} />)

      // Find all info wrappers and hover over each to find the right tooltip
      const wrappers = document.querySelectorAll('.stat-info-wrapper')
      wrappers.forEach(wrapper => fireEvent.mouseEnter(wrapper))

      expect(screen.getByText(/Chance of a random encounter when moving through this hex/i)).toBeInTheDocument()
    })

    it('shows Base Salvage Risk tooltip on hover for PoI hexes', () => {
      // EXPLANATION: PoI hexes show salvage risk, not movement encounter chance

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'poi', poiData: { name: 'Test POI' } }
      render(<HexInfoPanel {...props} />)

      // Hover over all wrappers to show tooltips
      const wrappers = document.querySelectorAll('.stat-info-wrapper')
      wrappers.forEach(wrapper => fireEvent.mouseEnter(wrapper))

      expect(screen.getByText(/Starting encounter chance for the first salvage slot/i)).toBeInTheDocument()
    })

    it('shows Salvage Threat tooltip on hover for PoI hexes', () => {
      // EXPLANATION: Salvage Threat only appears for PoIs

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'poi', poiData: { name: 'Test POI' } }
      render(<HexInfoPanel {...props} />)

      // Hover over all wrappers to show tooltips
      const wrappers = document.querySelectorAll('.stat-info-wrapper')
      wrappers.forEach(wrapper => fireEvent.mouseEnter(wrapper))

      expect(screen.getByText(/Detection added when you leave after salvaging/i)).toBeInTheDocument()
    })

    it('does not show Salvage Threat stat for empty hexes', () => {
      // EXPLANATION: Empty hexes don't have salvage mechanic - no Salvage Threat stat at all

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      render(<HexInfoPanel {...props} />)

      // Hover over all wrappers
      const wrappers = document.querySelectorAll('.stat-info-wrapper')
      wrappers.forEach(wrapper => fireEvent.mouseEnter(wrapper))

      expect(screen.queryByText(/Detection added when you leave after salvaging/i)).not.toBeInTheDocument()
    })

    it('tooltip appears on hover and disappears on mouse leave', () => {
      // EXPLANATION: Tooltip visibility controlled by hover state

      const props = createDefaultProps()
      render(<HexInfoPanel {...props} />)

      const wrapper = document.querySelector('.stat-info-wrapper')

      // No tooltip initially
      expect(document.querySelector('.stat-tooltip')).not.toBeInTheDocument()

      // Tooltip appears on hover
      fireEvent.mouseEnter(wrapper)
      expect(document.querySelector('.stat-tooltip')).toBeInTheDocument()

      // Tooltip disappears on mouse leave
      fireEvent.mouseLeave(wrapper)
      expect(document.querySelector('.stat-tooltip')).not.toBeInTheDocument()
    })

    it('info wrapper has correct CSS class for hover functionality', () => {
      // EXPLANATION: The wrapper element needs stat-info-wrapper class

      const props = createDefaultProps()
      render(<HexInfoPanel {...props} />)

      const wrapper = document.querySelector('.stat-info-wrapper')
      expect(wrapper).toBeInTheDocument()
    })
  })

  // ========================================
  // BASE SALVAGE RISK FOR POIs
  // ========================================

  describe('Base Salvage Risk for PoIs', () => {
    it('displays correct Base Salvage Risk from POI encounterChance', () => {
      // EXPLANATION: Base Salvage Risk should come from poiData.encounterChance, not 0

      const props = createDefaultProps()
      props.inspectedHex = {
        q: 2, r: 2,
        type: 'poi',
        poiData: {
          name: 'Test POI',
          encounterChance: 20  // Should display 20%, not 0%
        }
      }

      render(<HexInfoPanel {...props} />)

      // Should show 20% for Base Salvage Risk
      expect(screen.getByText('20%')).toBeInTheDocument()
    })

    it('displays default 15% Base Salvage Risk when POI has no encounterChance', () => {
      // EXPLANATION: Default to 15% if POI doesn't specify encounterChance

      const props = createDefaultProps()
      props.inspectedHex = {
        q: 2, r: 2,
        type: 'poi',
        poiData: { name: 'Test POI' }  // No encounterChance
      }

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('15%')).toBeInTheDocument()
    })
  })
})
