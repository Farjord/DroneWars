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
    getHexDetectionCost: vi.fn(() => 5),
    getThreshold: vi.fn(() => 'low')
  }
}))

// Mock SalvageController
vi.mock('../../logic/salvage/SalvageController.js', () => ({
  default: {
    _calculateThreatBonus: vi.fn(() => 0)
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
import SalvageController from '../../logic/salvage/SalvageController.js'

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
    detectionTriggers: { looting: 10 },
    salvageEncounterIncreaseRange: { min: 5, max: 15 },
    threatEncounterBonus: {
      low: { min: 0, max: 0 },
      medium: { min: 5, max: 10 },
      high: { min: 10, max: 20 }
    }
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

      expect(screen.getByTestId('blockade-risk-value')).toHaveTextContent('0%')
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
      // EXPLANATION: When inspecting hex, back button should appear in actions area

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('Back')).toBeInTheDocument()
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

    it('shows Salvage Risk tooltip on hover for PoI hexes', () => {
      // EXPLANATION: PoI hexes show salvage risk, not movement encounter chance

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'poi', poiData: { name: 'Test POI' } }
      render(<HexInfoPanel {...props} />)

      // Hover over all wrappers to show tooltips
      const wrappers = document.querySelectorAll('.stat-info-wrapper')
      wrappers.forEach(wrapper => fireEvent.mouseEnter(wrapper))

      expect(screen.getByText(/Starting encounter chance.*adjusted for current threat/i)).toBeInTheDocument()
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
  // SALVAGE RISK FOR POIs (with threat bonus)
  // ========================================

  describe('Salvage Risk for PoIs', () => {
    beforeEach(() => {
      // Reset mocks before each test
      SalvageController._calculateThreatBonus.mockReturnValue(0)
      DetectionManager.getThreshold.mockReturnValue('low')
    })

    it('displays "Salvage Risk" label instead of "Base Salvage Risk"', () => {
      // EXPLANATION: Label should be renamed to just "Salvage Risk"

      const props = createDefaultProps()
      props.inspectedHex = {
        q: 2, r: 2,
        type: 'poi',
        poiData: { name: 'Test POI', encounterChance: 20 }
      }

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('Salvage Risk')).toBeInTheDocument()
      expect(screen.queryByText('Base Salvage Risk')).not.toBeInTheDocument()
    })

    it('displays base salvage risk when threat level is low (no bonus)', () => {
      // EXPLANATION: At low threat, salvage risk equals the PoI base encounterChance

      SalvageController._calculateThreatBonus.mockReturnValue(0)

      const props = createDefaultProps()
      props.inspectedHex = {
        q: 2, r: 2,
        type: 'poi',
        poiData: { name: 'Test POI', encounterChance: 20 }
      }

      render(<HexInfoPanel {...props} />)

      // Should show 20% (base only, no threat bonus)
      expect(screen.getByText(/20%/)).toBeInTheDocument()
    })

    it('displays threat-adjusted salvage risk when threat bonus applies', () => {
      // EXPLANATION: At medium/high threat, salvage risk includes threat bonus

      SalvageController._calculateThreatBonus.mockReturnValue(8)
      DetectionManager.getThreshold.mockReturnValue('medium')

      const props = createDefaultProps()
      props.inspectedHex = {
        q: 2, r: 2,
        type: 'poi',
        poiData: { name: 'Test POI', encounterChance: 20 }
      }

      render(<HexInfoPanel {...props} />)

      // Should show 28% (20% base + 8% threat bonus)
      expect(screen.getByText(/28%/)).toBeInTheDocument()
    })

    it('displays per-slot increase range alongside salvage risk', () => {
      // EXPLANATION: Should show how much risk increases per salvage slot

      const props = createDefaultProps()
      props.inspectedHex = {
        q: 2, r: 2,
        type: 'poi',
        poiData: { name: 'Test POI', encounterChance: 20 }
      }

      render(<HexInfoPanel {...props} />)

      // Should show per-slot increase range from tierConfig
      expect(screen.getByText(/\+5% - 15%/)).toBeInTheDocument()
    })

    it('displays default 15% salvage risk when POI has no encounterChance', () => {
      // EXPLANATION: Default to 15% if POI doesn't specify encounterChance

      const props = createDefaultProps()
      props.inspectedHex = {
        q: 2, r: 2,
        type: 'poi',
        poiData: { name: 'Test POI' }  // No encounterChance
      }

      render(<HexInfoPanel {...props} />)

      // Check the stat-value span starts with 15%
      const statValue = screen.getByText((content, element) => {
        return element.classList.contains('stat-value') && content.startsWith('15%')
      })
      expect(statValue).toBeInTheDocument()
    })

    it('calls SalvageController._calculateThreatBonus with correct params', () => {
      // EXPLANATION: Should pass inspectedHex, tierConfig, and threatLevel to calculate bonus

      const props = createDefaultProps()
      props.inspectedHex = {
        q: 2, r: 2,
        type: 'poi',
        poiData: { name: 'Test POI', encounterChance: 20 }
      }

      render(<HexInfoPanel {...props} />)

      expect(SalvageController._calculateThreatBonus).toHaveBeenCalledWith(
        props.inspectedHex,
        props.tierConfig,
        'low'
      )
    })
  })

  // ========================================
  // MIA WARNING TESTS
  // ========================================

  describe('MIA warning display', () => {
    it('shows MIA warning when any waypoint cumulativeDetection >= 100', () => {
      // EXPLANATION: When a planned journey would cause MIA (100% threat),
      // a prominent warning should be displayed

      const props = createDefaultProps()
      props.waypoints = [
        { hex: { q: 1, r: 0 }, segmentCost: 50, cumulativeDetection: 60, cumulativeEncounterRisk: 5 },
        { hex: { q: 2, r: 0 }, segmentCost: 50, cumulativeDetection: 110, cumulativeEncounterRisk: 10 }
      ]

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText(/FATAL PATH/i)).toBeInTheDocument()
    })

    it('identifies correct waypoint number that causes MIA', () => {
      // EXPLANATION: The warning should indicate which specific waypoint
      // would trigger MIA so player knows where the problem is

      const props = createDefaultProps()
      props.waypoints = [
        { hex: { q: 1, r: 0 }, segmentCost: 30, cumulativeDetection: 40, cumulativeEncounterRisk: 5 },
        { hex: { q: 2, r: 0 }, segmentCost: 70, cumulativeDetection: 100, cumulativeEncounterRisk: 10 }
      ]

      render(<HexInfoPanel {...props} />)

      // Should mention waypoint 2 as the problem
      expect(screen.getByText(/waypoint 2/i)).toBeInTheDocument()
    })

    it('does not show MIA warning when journey is safe', () => {
      // EXPLANATION: No warning when all waypoints are below 100%

      const props = createDefaultProps()
      props.waypoints = [
        { hex: { q: 1, r: 0 }, segmentCost: 20, cumulativeDetection: 30, cumulativeEncounterRisk: 5 },
        { hex: { q: 2, r: 0 }, segmentCost: 20, cumulativeDetection: 50, cumulativeEncounterRisk: 10 }
      ]

      render(<HexInfoPanel {...props} />)

      expect(screen.queryByText(/FATAL PATH/i)).not.toBeInTheDocument()
    })
  })

  // ========================================
  // ESCAPE ROUTE DISPLAY TESTS
  // ========================================

  describe('escape route display', () => {
    it('displays gate coordinate instead of threat percentage', () => {
      // EXPLANATION: Shows nearest escape gate's coordinate, not threat cost
      // Gate at q=5, r=0 with radius 5 = column K (5+5=10, 10th letter), row 6 (0+5+1)

      const props = createDefaultProps()
      props.escapeRouteData = {
        fromCurrent: {
          threatCost: 5.5,
          wouldMIA: false,
          gate: { q: 5, r: 0 }  // K6 with radius 5
        },
        afterJourney: null,
        noPathExists: false
      }

      render(<HexInfoPanel {...props} />)

      // Should show gate coordinate, not percentage
      expect(screen.getByText(/escape route/i)).toBeInTheDocument()
      expect(screen.getByText('K6')).toBeInTheDocument()
      expect(screen.queryByText(/\+5\.5%/)).not.toBeInTheDocument()
    })

    it('displays afterJourney gate coordinate when waypoints exist', () => {
      // EXPLANATION: Shows gate coordinates for both current and after journey

      const props = createDefaultProps()
      props.waypoints = [
        { hex: { q: 1, r: 0 }, segmentCost: 20, cumulativeDetection: 45, cumulativeEncounterRisk: 5 }
      ]
      props.escapeRouteData = {
        fromCurrent: { threatCost: 5.5, wouldMIA: false, gate: { q: 5, r: 0 } },
        afterJourney: { threatCost: 3.0, wouldMIA: false, gate: { q: -5, r: 0 } },
        noPathExists: false
      }

      render(<HexInfoPanel {...props} />)

      // K6 for fromCurrent (q=5 -> col 10 -> K), A6 for afterJourney (q=-5 -> col 0 -> A)
      expect(screen.getByText('K6')).toBeInTheDocument()
      expect(screen.getByText('A6')).toBeInTheDocument()
    })

    it('shows "?" when gate data is missing', () => {
      // EXPLANATION: Graceful fallback when gate coordinates unavailable

      const props = createDefaultProps()
      props.escapeRouteData = {
        fromCurrent: { threatCost: 5.5, wouldMIA: false, gate: null },
        afterJourney: null,
        noPathExists: false
      }

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('color codes escape route as safe when wouldMIA is false', () => {
      // EXPLANATION: Green color when escape is safe

      const props = createDefaultProps()
      props.escapeRouteData = {
        fromCurrent: { threatCost: 5.5, wouldMIA: false, gate: { q: 5, r: 0 } },
        afterJourney: null,
        noPathExists: false
      }

      render(<HexInfoPanel {...props} />)

      const escapeSection = document.querySelector('.escape-route-display')
      expect(escapeSection).toBeInTheDocument()
      expect(escapeSection).not.toHaveClass('escape-critical')
    })

    it('color codes escape route as critical when wouldMIA is true', () => {
      // EXPLANATION: Red/critical color when escape would cause MIA

      const props = createDefaultProps()
      props.escapeRouteData = {
        fromCurrent: { threatCost: 15, wouldMIA: true, gate: { q: 5, r: 0 } },
        afterJourney: null,
        noPathExists: false
      }

      render(<HexInfoPanel {...props} />)

      const escapeItem = document.querySelector('.escape-route-item')
      expect(escapeItem).toHaveClass('escape-critical')
    })

    it('shows no escape route warning when noPathExists is true', () => {
      // EXPLANATION: When no path to any gate exists, show warning

      const props = createDefaultProps()
      props.escapeRouteData = {
        fromCurrent: null,
        afterJourney: null,
        noPathExists: true
      }

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText(/no escape route/i)).toBeInTheDocument()
    })

    it('displays "MIA" when wouldMIA is true', () => {
      // EXPLANATION: When escape would cause MIA, show MIA instead of gate coordinate

      const props = createDefaultProps()
      props.escapeRouteData = {
        fromCurrent: { threatCost: 50, wouldMIA: true, gate: { q: 5, r: 0 } },
        afterJourney: null,
        noPathExists: false
      }

      render(<HexInfoPanel {...props} />)

      // Should show MIA, not gate coordinate
      expect(screen.getByText('MIA')).toBeInTheDocument()
      expect(screen.queryByText('K6')).not.toBeInTheDocument()
    })

    it('displays gate when safe but MIA when afterJourney wouldMIA', () => {
      // EXPLANATION: Current shows gate, afterJourney shows MIA

      const props = createDefaultProps()
      props.waypoints = [{ hex: { q: 1, r: 0 }, segmentCost: 80, cumulativeDetection: 90, cumulativeEncounterRisk: 5 }]
      props.escapeRouteData = {
        fromCurrent: { threatCost: 5, wouldMIA: false, gate: { q: 5, r: 0 } },
        afterJourney: { threatCost: 20, wouldMIA: true, gate: { q: -5, r: 0 } },
        noPathExists: false
      }

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('K6')).toBeInTheDocument()  // fromCurrent safe
      expect(screen.getByText('MIA')).toBeInTheDocument() // afterJourney would MIA
    })
  })

  // ========================================
  // HEX INFO VIEW LAYOUT TESTS
  // ========================================

  describe('hex info view layout', () => {
    it('displays title header instead of back button in header area', () => {
      // EXPLANATION: Header should show "Hex Details" title, not back button
      // Back button moves to actions area

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }

      render(<HexInfoPanel {...props} />)

      // Should have a title in header
      expect(screen.getByText('Hex Details')).toBeInTheDocument()
    })

    it('displays Back and Add Waypoint buttons side by side in actions area', () => {
      // EXPLANATION: Both Back and Add Waypoint should be in actions area together

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      props.onBackToJourney = vi.fn()

      render(<HexInfoPanel {...props} />)

      const actionsArea = document.querySelector('.hex-info-actions')
      const backBtn = screen.getByText('Back')
      const addBtn = screen.getByText('Add Waypoint')

      // Both buttons should be in actions area
      expect(actionsArea).toContainElement(backBtn)
      expect(actionsArea).toContainElement(addBtn)
    })

    it('Add Waypoint button uses confirm (cyan) style', () => {
      // EXPLANATION: Add Waypoint should use dw-btn-confirm for cyan styling

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }

      render(<HexInfoPanel {...props} />)

      const addBtn = screen.getByText('Add Waypoint')
      expect(addBtn).toHaveClass('dw-btn-confirm')
    })

    it('Back button uses secondary (hollow) style', () => {
      // EXPLANATION: Back should use dw-btn-secondary for hollow styling

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      props.onBackToJourney = vi.fn()

      render(<HexInfoPanel {...props} />)

      const backBtn = screen.getByText('Back')
      expect(backBtn).toHaveClass('dw-btn-secondary')
    })

    it('actions area uses row layout for side-by-side buttons', () => {
      // EXPLANATION: Actions area should have flex row layout class

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }

      render(<HexInfoPanel {...props} />)

      const actionsArea = document.querySelector('.hex-info-actions')
      expect(actionsArea).toHaveClass('hex-info-actions-row')
    })
  })

  // ========================================
  // PATHFINDING MODE TOGGLE IN HEX PREVIEW
  // ========================================

  describe('pathfinding mode toggle in hex preview', () => {
    it('displays toggle when previewing a valid destination', () => {
      // EXPLANATION: Path mode toggle should appear when inspecting a hex
      // that can be added as a waypoint

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      props.pathMode = 'lowEncounter'
      props.onPathModeChange = vi.fn()

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('Low Encounter')).toBeInTheDocument()
      expect(screen.getByText('Low Threat')).toBeInTheDocument()
    })

    it('triggers onPathModeChange when mode changed in hex preview', () => {
      // EXPLANATION: Changing mode in hex preview should trigger callback

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      props.pathMode = 'lowEncounter'
      props.onPathModeChange = vi.fn()

      render(<HexInfoPanel {...props} />)

      fireEvent.click(screen.getByText('Low Threat'))
      expect(props.onPathModeChange).toHaveBeenCalledWith('lowThreat')
    })

    it('does not show toggle when hex is current position', () => {
      // EXPLANATION: No toggle needed when you're already there

      const props = createDefaultProps()
      props.playerPosition = { q: 2, r: 2 }
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      props.pathMode = 'lowEncounter'
      props.onPathModeChange = vi.fn()

      render(<HexInfoPanel {...props} />)

      // Toggle should not appear since it's current position
      const toggleSection = document.querySelector('.pathfinding-mode-toggle')
      expect(toggleSection).not.toBeInTheDocument()
    })

    it('does not show toggle when hex is already a waypoint', () => {
      // EXPLANATION: No toggle needed for existing waypoints

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      props.isWaypointFn = vi.fn(() => true)  // Already a waypoint
      props.pathMode = 'lowEncounter'
      props.onPathModeChange = vi.fn()

      render(<HexInfoPanel {...props} />)

      const toggleSection = document.querySelector('.pathfinding-mode-toggle')
      expect(toggleSection).not.toBeInTheDocument()
    })
  })

  // ========================================
  // PATHFINDING MODE TOGGLE TESTS (WAYPOINT LIST)
  // ========================================

  describe('pathfinding mode toggle', () => {
    it('displays toggle button with Low Encounter and Low Threat options', () => {
      // EXPLANATION: Toggle should show both pathfinding mode options

      const props = createDefaultProps()
      props.pathMode = 'lowEncounter'
      props.onPathModeChange = vi.fn()

      render(<HexInfoPanel {...props} />)

      expect(screen.getByText('Low Encounter')).toBeInTheDocument()
      expect(screen.getByText('Low Threat')).toBeInTheDocument()
    })

    it('shows active state on currently selected mode', () => {
      // EXPLANATION: The active mode button should be visually highlighted

      const props = createDefaultProps()
      props.pathMode = 'lowThreat'
      props.onPathModeChange = vi.fn()

      render(<HexInfoPanel {...props} />)

      const lowThreatBtn = screen.getByText('Low Threat')
      const lowEncounterBtn = screen.getByText('Low Encounter')

      expect(lowThreatBtn).toHaveClass('active')
      expect(lowEncounterBtn).not.toHaveClass('active')
    })

    it('triggers onPathModeChange callback when mode is changed', () => {
      // EXPLANATION: Clicking a mode button should call the callback

      const props = createDefaultProps()
      props.pathMode = 'lowEncounter'
      props.onPathModeChange = vi.fn()

      render(<HexInfoPanel {...props} />)

      fireEvent.click(screen.getByText('Low Threat'))

      expect(props.onPathModeChange).toHaveBeenCalledWith('lowThreat')
    })
  })

  // ========================================
  // PREVIEW PATH STATS CALCULATION TESTS
  // ========================================

  describe('previewPath stats calculation', () => {
    it('uses provided previewPath for distance calculation', () => {
      // EXPLANATION: When previewPath is provided, use its length for distance
      // instead of calculating via MovementController

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 2, type: 'empty' }
      // Provide a custom path with 5 hexes (4 moves)
      props.previewPath = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 1, r: 1 },
        { q: 2, r: 1 },
        { q: 2, r: 2 }
      ]

      render(<HexInfoPanel {...props} />)

      // Distance should be 4 (path length - 1)
      expect(screen.getByText('4 hexes')).toBeInTheDocument()
    })

    it('uses provided previewPath for threat calculation', () => {
      // EXPLANATION: Threat stats should be calculated from previewPath hexes

      const props = createDefaultProps()
      props.inspectedHex = { q: 2, r: 0, type: 'empty' }
      props.previewPath = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 }
      ]

      render(<HexInfoPanel {...props} />)

      // Should show threat increase stat (calculated from previewPath)
      expect(screen.getByText(/Threat Increase/i)).toBeInTheDocument()
    })

    it('falls back to MovementController when no previewPath provided', () => {
      // EXPLANATION: Without previewPath, should still work with basic A*

      const props = createDefaultProps()
      props.inspectedHex = { q: 1, r: 0, type: 'empty' }
      // No previewPath provided

      render(<HexInfoPanel {...props} />)

      // Should still show stats using MovementController fallback
      expect(screen.getByText(/Distance/i)).toBeInTheDocument()
    })
  })
})
