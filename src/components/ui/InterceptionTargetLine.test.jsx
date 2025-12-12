// ========================================
// INTERCEPTION TARGET LINE COMPONENT TESTS
// ========================================
// Tests for the InterceptionTargetLine component that shows a pulsing
// dotted red line between attacker and target during interception.

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InterceptionTargetLine from './InterceptionTargetLine';

// Mock getElementCenter utility
vi.mock('../../utils/gameUtils.js', () => ({
  getElementCenter: vi.fn((element, gameArea) => {
    if (!element || !gameArea) return null;
    // Return mock positions based on element id
    if (element.id === 'attacker') return { x: 100, y: 100 };
    if (element.id === 'target-drone') return { x: 300, y: 300 };
    if (element.id === 'target-section') return { x: 400, y: 200 };
    return null;
  })
}));

describe('InterceptionTargetLine', () => {
  let mockDroneRefs;
  let mockShipSectionRefs;
  let mockGameAreaRef;
  let mockAttackDetails;

  beforeEach(() => {
    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb();
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    // Setup mock refs
    mockDroneRefs = {
      current: {
        'attacker-1': { id: 'attacker' },
        'target-1': { id: 'target-drone' }
      }
    };

    mockShipSectionRefs = {
      current: {
        'player-bridge': { id: 'target-section' }
      }
    };

    mockGameAreaRef = {
      current: document.createElement('div')
    };

    mockAttackDetails = {
      attacker: { id: 'attacker-1' },
      target: { id: 'target-1' },
      targetType: 'drone',
      lane: 'lane1'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('visibility', () => {
    it('should render nothing when visible is false', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={false}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      expect(container.querySelector('svg')).toBeNull();
    });

    it('should render SVG when visible is true with valid positions', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      expect(container.querySelector('svg')).not.toBeNull();
    });

    it('should render nothing when attackDetails is null', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={null}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      expect(container.querySelector('svg')).toBeNull();
    });

    it('should render nothing when gameAreaRef is null', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={{ current: null }}
        />
      );
      expect(container.querySelector('svg')).toBeNull();
    });
  });

  describe('line rendering', () => {
    it('should render a path element for the dotted line', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should have stroke-dasharray for dotted line effect', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      const path = container.querySelector('path');
      expect(path).toHaveAttribute('stroke-dasharray');
    });

    it('should use red color for the line', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      const path = container.querySelector('path');
      expect(path.getAttribute('stroke')).toMatch(/#ef4444|red/i);
    });
  });

  describe('endpoint markers', () => {
    it('should render circle markers at both endpoints', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      const circles = container.querySelectorAll('circle');
      // Should have circles at start and end (pulsing + solid = 4 total)
      expect(circles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('animation', () => {
    it('should include animate elements for pulsing effect', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      const animates = container.querySelectorAll('animate');
      expect(animates.length).toBeGreaterThan(0);
    });
  });

  describe('target types', () => {
    it('should work with drone targets', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={{
            ...mockAttackDetails,
            targetType: 'drone'
          }}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      expect(container.querySelector('svg')).not.toBeNull();
    });

    it('should work with ship section targets', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={{
            attacker: { id: 'attacker-1' },
            target: { name: 'bridge' },
            targetType: 'section',
            lane: 'lane1'
          }}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });

  describe('z-index', () => {
    it('should have high z-index to appear above game elements', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      const svg = container.querySelector('svg');
      expect(svg.style.zIndex).toBeTruthy();
    });
  });

  describe('pointer events', () => {
    it('should have pointer-events: none to allow clicking through', () => {
      const { container } = render(
        <InterceptionTargetLine
          visible={true}
          attackDetails={mockAttackDetails}
          droneRefs={mockDroneRefs}
          shipSectionRefs={mockShipSectionRefs}
          gameAreaRef={mockGameAreaRef}
        />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('pointer-events-none');
    });
  });
});
