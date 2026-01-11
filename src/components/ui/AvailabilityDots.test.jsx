/**
 * AvailabilityDots.test.jsx
 * TDD tests for the AvailabilityDots component
 *
 * Tests the new model where dots show deployment availability:
 * - Deployable: Solid green pip (ready AND under in-play limit)
 * - Blocked: Green outline (ready BUT at deployment limit)
 * - Rebuilding: Grey segmented circle with progress
 * - Inactive: Grey outline (slot not producing)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AvailabilityDots from './AvailabilityDots.jsx';

describe('AvailabilityDots', () => {
  // ========================================
  // DEPLOYABLE PIPS TESTS
  // ========================================
  describe('Deployable Pips (solid green)', () => {
    it('should show all pips as deployable when all ready and none in play', () => {
      const availability = {
        copyLimit: 3,
        readyCount: 3,
        inPlayCount: 0,
        rebuildingCount: 0,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      // All 3 should be deployable (solid green)
      const deployableDots = container.querySelectorAll('[data-dot-type="deployable"]');
      expect(deployableDots.length).toBe(3);
    });

    it('should show limited deployable pips when some in play', () => {
      const availability = {
        copyLimit: 3,
        readyCount: 2,
        inPlayCount: 1,
        rebuildingCount: 1,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      // Only 2 can be deployed (limit 3 - inPlay 1 = 2 available slots)
      // And we have 2 ready, so 2 deployable
      const deployableDots = container.querySelectorAll('[data-dot-type="deployable"]');
      expect(deployableDots.length).toBe(2);
    });

    it('should show zero deployable pips when at deployment limit', () => {
      const availability = {
        copyLimit: 3,
        readyCount: 3,
        inPlayCount: 3, // At limit
        rebuildingCount: 0,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      // Can't deploy any more (inPlay = limit)
      const deployableDots = container.querySelectorAll('[data-dot-type="deployable"]');
      expect(deployableDots.length).toBe(0);
    });
  });

  // ========================================
  // BLOCKED PIPS TESTS
  // ========================================
  describe('Blocked Pips (green outline)', () => {
    it('should show blocked pips when ready exceeds available slots', () => {
      const availability = {
        copyLimit: 3,
        readyCount: 3, // All ready
        inPlayCount: 2, // But 2 in play
        rebuildingCount: 0,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      // Only 1 can be deployed (limit 3 - inPlay 2 = 1 slot)
      // So 1 deployable, 2 blocked
      const deployableDots = container.querySelectorAll('[data-dot-type="deployable"]');
      const blockedDots = container.querySelectorAll('[data-dot-type="blocked"]');
      expect(deployableDots.length).toBe(1);
      expect(blockedDots.length).toBe(2);
    });

    it('should show all as blocked when at deployment limit', () => {
      const availability = {
        copyLimit: 2,
        readyCount: 2,
        inPlayCount: 2,
        rebuildingCount: 0,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={2} droneName="Test" />
      );

      // All ready but can't deploy any (at limit)
      const blockedDots = container.querySelectorAll('[data-dot-type="blocked"]');
      expect(blockedDots.length).toBe(2);
    });
  });

  // ========================================
  // REBUILDING DOTS TESTS
  // ========================================
  describe('Rebuilding Dots (green with segments)', () => {
    // Helper to get all rebuilding dots (both deployable and blocked)
    const getAllRebuildingDots = (container) => {
      const deployable = container.querySelectorAll('[data-dot-type="rebuilding-deployable"]');
      const blocked = container.querySelectorAll('[data-dot-type="rebuilding-blocked"]');
      return [...deployable, ...blocked];
    };

    it('should limit rebuilding dots to rebuildRate (Firefly scenario)', () => {
      // Firefly: limit 4, rate 1.0, all deployed
      const availability = {
        copyLimit: 4,
        readyCount: 0,
        inPlayCount: 4,
        rebuildingCount: 4,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={4} droneName="Firefly" />
      );

      // Only 1 should be rebuilding (limited by rebuildRate)
      // Other 3 should be inactive (queued)
      const rebuildingDots = getAllRebuildingDots(container);
      const inactiveDots = container.querySelectorAll('[data-dot-type="inactive"]');
      expect(rebuildingDots.length).toBe(1);
      expect(inactiveDots.length).toBe(3);
    });

    it('should show rebuilding dots up to Math.ceil(rebuildRate)', () => {
      const availability = {
        copyLimit: 3,
        readyCount: 1,
        inPlayCount: 1,
        rebuildingCount: 2,
        rebuildProgress: 0.5,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      // With rate 1.0, only 1 can rebuild at a time
      // So 1 rebuilding, 1 inactive (queued)
      const rebuildingDots = getAllRebuildingDots(container);
      const inactiveDots = container.querySelectorAll('[data-dot-type="inactive"]');
      expect(rebuildingDots.length).toBe(1);
      expect(inactiveDots.length).toBe(1);
    });

    it('should calculate 2 segments for rate 0.5', () => {
      const availability = {
        copyLimit: 1,
        readyCount: 0,
        inPlayCount: 1,
        rebuildingCount: 1,
        rebuildProgress: 0.25,
        rebuildRate: 0.5
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={1} droneName="Test" />
      );

      // Will be blocked since inPlayCount = limit
      const rebuildingDot = container.querySelector('[data-dot-type="rebuilding-blocked"]');
      expect(rebuildingDot).toHaveAttribute('data-segment-count', '2');
    });

    it('should calculate 3 segments for rate 0.33', () => {
      const availability = {
        copyLimit: 1,
        readyCount: 0,
        inPlayCount: 1,
        rebuildingCount: 1,
        rebuildProgress: 0.33,
        rebuildRate: 0.34
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={1} droneName="Test" />
      );

      // Will be blocked since inPlayCount = limit
      const rebuildingDot = container.querySelector('[data-dot-type="rebuilding-blocked"]');
      expect(rebuildingDot).toHaveAttribute('data-segment-count', '3');
    });

    it('should calculate 1 segment for rate 1.0 or higher', () => {
      const availability = {
        copyLimit: 1,
        readyCount: 0,
        inPlayCount: 1,
        rebuildingCount: 1,
        rebuildProgress: 0.5,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={1} droneName="Test" />
      );

      // Will be blocked since inPlayCount = limit
      const rebuildingDot = container.querySelector('[data-dot-type="rebuilding-blocked"]');
      expect(rebuildingDot).toHaveAttribute('data-segment-count', '1');
    });

    it('should show correct filled segment count based on progress', () => {
      const availability = {
        copyLimit: 1,
        readyCount: 0,
        inPlayCount: 1,
        rebuildingCount: 1,
        rebuildProgress: 0.5, // Half way through
        rebuildRate: 0.5 // 2 segments total
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={1} droneName="Test" />
      );

      // Will be blocked since inPlayCount = limit
      const rebuildingDot = container.querySelector('[data-dot-type="rebuilding-blocked"]');
      // Progress 0.5 with rate 0.5 means 1 segment filled (0.5/0.5 = 1)
      expect(rebuildingDot).toHaveAttribute('data-filled-segments', '1');
    });
  });

  // ========================================
  // INACTIVE DOTS TESTS
  // ========================================
  describe('Inactive Dots (grey outline)', () => {
    it('should show inactive dots for empty slots', () => {
      // This scenario shouldn't normally happen in new model
      // as ready + rebuilding = copyLimit
      // But we should handle edge cases gracefully
      const availability = {
        copyLimit: 3,
        readyCount: 1,
        inPlayCount: 0,
        rebuildingCount: 1, // ready + rebuilding < limit = 1 inactive
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      const inactiveDots = container.querySelectorAll('[data-dot-type="inactive"]');
      expect(inactiveDots.length).toBe(1);
    });
  });

  // ========================================
  // TOTAL DOTS COUNT TESTS
  // ========================================
  describe('Total Dots Count', () => {
    it('should render correct total number of dots matching copyLimit', () => {
      const availability = {
        copyLimit: 4,
        readyCount: 2,
        inPlayCount: 1,
        rebuildingCount: 2,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={4} droneName="Test" />
      );

      const allDots = container.querySelectorAll('[data-dot-type]');
      expect(allDots.length).toBe(4);
    });

    it('should cap total dots at copyLimit even when readyCount + rebuildingCount exceeds limit (Locust bug)', () => {
      // Reproduces the Locust bug: limit 3, ready 3, inPlay 1, rebuilding 1
      // readyCount + rebuildingCount = 4 > limit of 3
      const availability = {
        copyLimit: 3,
        readyCount: 3,
        inPlayCount: 1,
        rebuildingCount: 1,
        rebuildProgress: 0,
        rebuildRate: 2.0  // Locust has rebuildRate 2.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Locust" />
      );

      // MUST be exactly 3 dots, not 4
      const allDots = container.querySelectorAll('[data-dot-type]');
      expect(allDots.length).toBe(3);
    });
  });

  // ========================================
  // HIGH REBUILD RATE TESTS (1.5, 2.0)
  // ========================================
  describe('High Rebuild Rates', () => {
    // Helper to get all rebuilding dots (both deployable and blocked)
    const getAllRebuildingDots = (container) => {
      const deployable = container.querySelectorAll('[data-dot-type="rebuilding-deployable"]');
      const blocked = container.querySelectorAll('[data-dot-type="rebuilding-blocked"]');
      return [...deployable, ...blocked];
    };

    it('should show 2 rebuilding with rate 1.5 (ceil)', () => {
      const availability = {
        copyLimit: 3,
        readyCount: 0,
        inPlayCount: 3,
        rebuildingCount: 3,
        rebuildProgress: 0.5,
        rebuildRate: 1.5
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      // Math.ceil(1.5) = 2, so 2 rebuilding, 1 inactive
      const rebuildingDots = getAllRebuildingDots(container);
      const inactiveDots = container.querySelectorAll('[data-dot-type="inactive"]');
      expect(rebuildingDots.length).toBe(2);
      expect(inactiveDots.length).toBe(1);
      rebuildingDots.forEach(dot => {
        expect(dot).toHaveAttribute('data-segment-count', '1');
      });
    });

    it('should show 2 rebuilding with rate 2.0', () => {
      const availability = {
        copyLimit: 3,
        readyCount: 0,
        inPlayCount: 3,
        rebuildingCount: 3,
        rebuildProgress: 0,
        rebuildRate: 2.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      // Math.ceil(2.0) = 2, so 2 rebuilding, 1 inactive
      const rebuildingDots = getAllRebuildingDots(container);
      const inactiveDots = container.querySelectorAll('[data-dot-type="inactive"]');
      expect(rebuildingDots.length).toBe(2);
      expect(inactiveDots.length).toBe(1);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('Edge Cases', () => {
    it('should handle undefined availability gracefully', () => {
      const { container } = render(
        <AvailabilityDots availability={undefined} copyLimit={3} droneName="Test" />
      );

      // Should default to all ready (pre-combat state)
      const deployableDots = container.querySelectorAll('[data-dot-type="deployable"]');
      expect(deployableDots.length).toBe(3);
    });

    it('should handle zero copyLimit', () => {
      const { container } = render(
        <AvailabilityDots availability={undefined} copyLimit={0} droneName="Test" />
      );

      const allDots = container.querySelectorAll('[data-dot-type]');
      expect(allDots.length).toBe(0);
    });

    it('should use availability.copyLimit if explicit copyLimit not provided', () => {
      const availability = {
        copyLimit: 2,
        readyCount: 2,
        inPlayCount: 0,
        rebuildingCount: 0,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} droneName="Test" />
      );

      const allDots = container.querySelectorAll('[data-dot-type]');
      expect(allDots.length).toBe(2);
    });
  });

  // ========================================
  // TOOLTIP TESTS
  // ========================================
  describe('Tooltips', () => {
    it('should have title showing availability info', () => {
      const availability = {
        copyLimit: 3,
        readyCount: 2,
        inPlayCount: 1,
        rebuildingCount: 1,
        rebuildProgress: 0.5,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveAttribute('title');
      expect(wrapper.getAttribute('title')).toContain('Ready');
    });
  });

  // ========================================
  // N/A DISPLAY TESTS (limit === 999)
  // ========================================
  describe('N/A Display', () => {
    it('should show N/A text when limit is 999', () => {
      const availability = {
        copyLimit: 999,
        readyCount: 999,
        inPlayCount: 0,
        rebuildingCount: 0,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={999} droneName="Jammer" />
      );

      expect(container.textContent).toContain('N/A');
      // Should NOT render any dots
      const allDots = container.querySelectorAll('[data-dot-type]');
      expect(allDots.length).toBe(0);
    });

    it('should show N/A when explicit copyLimit is 999 even without availability', () => {
      const { container } = render(
        <AvailabilityDots availability={undefined} copyLimit={999} droneName="Jammer" />
      );

      expect(container.textContent).toContain('N/A');
    });
  });

  // ========================================
  // REBUILDING DEPLOYMENT PREDICTION TESTS
  // ========================================
  describe('Rebuilding Deployment Prediction', () => {
    it('should show rebuilding-deployable when slot will be available after rebuild', () => {
      // limit: 3, inPlayCount: 1, readyCount: 0, rebuildingCount: 1
      // futureAvailable = 3-1 = 2 slots, readyCount = 0
      // So rebuilding drone (index 0) will be deployable: 0 + 0 < 2 ✓
      const availability = {
        copyLimit: 3,
        readyCount: 0,
        inPlayCount: 1,
        rebuildingCount: 1,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      const deployableDot = container.querySelector('[data-dot-type="rebuilding-deployable"]');
      expect(deployableDot).toBeTruthy();
    });

    it('should show rebuilding-blocked when slot will be blocked after rebuild', () => {
      // limit: 2, inPlayCount: 2, readyCount: 0, rebuildingCount: 1
      // futureAvailable = 2-2 = 0 slots
      // So rebuilding drone will be blocked: 0 + 0 < 0 is false
      const availability = {
        copyLimit: 2,
        readyCount: 0,
        inPlayCount: 2,
        rebuildingCount: 1,
        rebuildProgress: 0,
        rebuildRate: 1.0
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={2} droneName="Test" />
      );

      const blockedDot = container.querySelector('[data-dot-type="rebuilding-blocked"]');
      expect(blockedDot).toBeTruthy();
    });

    it('should show mixed rebuilding states when some will be deployable and some blocked', () => {
      // limit: 3, inPlayCount: 1, readyCount: 1, rebuildingCount: 2
      // futureAvailable = 3-1 = 2 slots
      // readyCount = 1 will claim 1 slot
      // rebuilding[0]: 1 + 0 = 1 < 2 → deployable
      // rebuilding[1]: 1 + 1 = 2 < 2 is false → blocked
      const availability = {
        copyLimit: 3,
        readyCount: 1,
        inPlayCount: 1,
        rebuildingCount: 2,
        rebuildProgress: 0,
        rebuildRate: 2.0  // allows 2 to rebuild simultaneously
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={3} droneName="Test" />
      );

      const deployableDots = container.querySelectorAll('[data-dot-type="rebuilding-deployable"]');
      const blockedDots = container.querySelectorAll('[data-dot-type="rebuilding-blocked"]');
      expect(deployableDots.length).toBe(1);
      expect(blockedDots.length).toBe(1);
    });

    it('should show segmented rebuilding-blocked with correct segment count for 0.5 rate', () => {
      // limit: 2, inPlayCount: 2, rebuildRate: 0.5
      // Will be blocked, should have 2 segments
      const availability = {
        copyLimit: 2,
        readyCount: 0,
        inPlayCount: 2,
        rebuildingCount: 1,
        rebuildProgress: 0.5,
        rebuildRate: 0.5
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={2} droneName="Test" />
      );

      const dot = container.querySelector('[data-dot-type="rebuilding-blocked"]');
      expect(dot).toBeTruthy();
      expect(dot).toHaveAttribute('data-segment-count', '2');
      expect(dot).toHaveAttribute('data-filled-segments', '1');
    });

    it('should show segmented rebuilding-deployable with correct segment count for 0.33 rate', () => {
      // limit: 2, inPlayCount: 0, rebuildRate: 0.34 (rounds to 3 segments)
      // Will be deployable, should have 3 segments
      const availability = {
        copyLimit: 2,
        readyCount: 0,
        inPlayCount: 0,
        rebuildingCount: 1,
        rebuildProgress: 0.66,
        rebuildRate: 0.34
      };

      const { container } = render(
        <AvailabilityDots availability={availability} copyLimit={2} droneName="Test" />
      );

      const dot = container.querySelector('[data-dot-type="rebuilding-deployable"]');
      expect(dot).toBeTruthy();
      expect(dot).toHaveAttribute('data-segment-count', '3');
      expect(dot).toHaveAttribute('data-filled-segments', '1'); // floor(0.66 * 3) = 1
    });
  });
});
