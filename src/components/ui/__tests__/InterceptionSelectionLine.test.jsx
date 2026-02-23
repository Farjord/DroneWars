import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

// ========================================
// INTERCEPTION SELECTION LINE TESTS
// ========================================
// Tests for the blue dotted line showing interceptor -> attacker selection

// Mock getElementCenter utility
vi.mock('../../../utils/gameUtils.js', () => ({
  getElementCenter: vi.fn((element, container) => {
    if (!element) return null;
    // Return mock positions based on test data attributes
    const mockPositions = {
      'interceptor-1': { x: 100, y: 200 },
      'attacker-1': { x: 300, y: 200 }
    };
    return mockPositions[element.dataset.testid] || null;
  })
}))

import InterceptionSelectionLine from '../InterceptionSelectionLine.jsx'
import { getElementCenter } from '../../../utils/gameUtils.js'

describe('InterceptionSelectionLine', () => {
  let mockGameAreaRef;
  let mockDroneRefs;

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock DOM structure
    const interceptorEl = document.createElement('div');
    interceptorEl.dataset.testid = 'interceptor-1';

    const attackerEl = document.createElement('div');
    attackerEl.dataset.testid = 'attacker-1';

    mockDroneRefs = {
      current: {
        'interceptor-1': interceptorEl,
        'attacker-1': attackerEl
      }
    };

    mockGameAreaRef = {
      current: document.createElement('div')
    };
  })

  afterEach(() => {
    cleanup()
  })

  describe('visibility', () => {
    it('should not render when visible is false', () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={false}
          interceptor={{ id: 'interceptor-1' }}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      expect(container.querySelector('svg')).toBeNull()
    })

    it('should not render when interceptor is null', () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={null}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      expect(container.querySelector('svg')).toBeNull()
    })

    it('should not render when attacker is null', () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={{ id: 'interceptor-1' }}
          attacker={null}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      expect(container.querySelector('svg')).toBeNull()
    })

    it('should render SVG when visible and both drones provided', async () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={{ id: 'interceptor-1' }}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      // Wait for useEffect and RAF to complete
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeTruthy()
      }, { timeout: 500 })
    })
  })

  describe('rendering style', () => {
    it('should use blue color (#00aaff) for the line', async () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={{ id: 'interceptor-1' }}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      await waitFor(() => {
        const paths = container.querySelectorAll('path')
        // At least one path should have blue stroke
        const hasBlueStroke = Array.from(paths).some(
          path => path.getAttribute('stroke') === '#00aaff'
        )
        expect(hasBlueStroke).toBe(true)
      }, { timeout: 500 })
    })

    it('should render as dotted line (strokeDasharray)', async () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={{ id: 'interceptor-1' }}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      await waitFor(() => {
        const paths = container.querySelectorAll('path')
        const hasDashedStroke = Array.from(paths).some(
          path => path.getAttribute('stroke-dasharray')
        )
        expect(hasDashedStroke).toBe(true)
      }, { timeout: 500 })
    })

    it('should render pulsing endpoint circles', async () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={{ id: 'interceptor-1' }}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      await waitFor(() => {
        const circles = container.querySelectorAll('circle')
        // Should have circles for both endpoints (4 total: 2 outer + 2 inner)
        expect(circles.length).toBeGreaterThanOrEqual(2)
      }, { timeout: 500 })
    })

    it('should have pointer-events none (non-interactive)', async () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={{ id: 'interceptor-1' }}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      await waitFor(() => {
        const svg = container.querySelector('svg')
        expect(svg.classList.contains('pointer-events-none')).toBe(true)
      }, { timeout: 500 })
    })
  })

  describe('position calculation', () => {
    it('should call getElementCenter for interceptor and attacker', async () => {
      render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={{ id: 'interceptor-1' }}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      await waitFor(() => {
        // Should be called for both interceptor and attacker
        expect(getElementCenter).toHaveBeenCalled()
      }, { timeout: 500 })
    })
  })

  describe('z-index layering', () => {
    it('should have appropriate z-index for layering above target line', async () => {
      const { container } = render(
        <InterceptionSelectionLine
          visible={true}
          interceptor={{ id: 'interceptor-1' }}
          attacker={{ id: 'attacker-1' }}
          droneRefs={mockDroneRefs}
          gameAreaRef={mockGameAreaRef}
        />
      )

      await waitFor(() => {
        const svg = container.querySelector('svg')
        const zIndex = parseInt(svg.style.zIndex)
        // Should be at least 46 to be above InterceptionTargetLine (45)
        expect(zIndex).toBeGreaterThanOrEqual(46)
      }, { timeout: 500 })
    })
  })
})
