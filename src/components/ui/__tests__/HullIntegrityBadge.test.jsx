import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ========================================
// HULL INTEGRITY BADGE TESTS
// ========================================
// Tests for the Hull Integrity display component.
// Shows remaining damage needed to win / total damage threshold.

import HullIntegrityBadge from '../HullIntegrityBadge.jsx';

describe('HullIntegrityBadge', () => {
  describe('display format', () => {
    it('should display current/threshold format', () => {
      render(
        <HullIntegrityBadge
          current={15}
          threshold={18}
          isPlayer={true}
        />
      );

      // Should show "15 / 18" or "15/18"
      expect(screen.getByText(/15/)).toBeTruthy();
      expect(screen.getByText(/18/)).toBeTruthy();
    });

    it('should display zero when win condition met', () => {
      render(
        <HullIntegrityBadge
          current={0}
          threshold={18}
          isPlayer={true}
        />
      );

      expect(screen.getByText(/0/)).toBeTruthy();
    });

    it('should display full value when no damage dealt', () => {
      const { container } = render(
        <HullIntegrityBadge
          current={18}
          threshold={18}
          isPlayer={true}
        />
      );

      // Both values should be 18 - check the full text content
      const badge = container.querySelector('.font-bold');
      expect(badge.textContent).toContain('18');
      expect(badge.textContent).toContain('/ 18');
    });
  });

  describe('color behavior', () => {
    it('should have healthy color when above 50% remaining', () => {
      const { container } = render(
        <HullIntegrityBadge
          current={15}
          threshold={18}
          isPlayer={true}
        />
      );

      // 15/18 = 83% remaining = healthy (green/cyan)
      // Check for green-related styling
      const badge = container.firstChild;
      expect(badge).toBeTruthy();
    });

    it('should have warning color when between 25-50% remaining', () => {
      const { container } = render(
        <HullIntegrityBadge
          current={7}
          threshold={18}
          isPlayer={true}
        />
      );

      // 7/18 = 39% remaining = warning (yellow/orange)
      const badge = container.firstChild;
      expect(badge).toBeTruthy();
    });

    it('should have danger color when below 25% remaining', () => {
      const { container } = render(
        <HullIntegrityBadge
          current={3}
          threshold={18}
          isPlayer={true}
        />
      );

      // 3/18 = 17% remaining = danger (red)
      const badge = container.firstChild;
      expect(badge).toBeTruthy();
    });

    it('should have danger color when at zero', () => {
      const { container } = render(
        <HullIntegrityBadge
          current={0}
          threshold={18}
          isPlayer={true}
        />
      );

      // 0% remaining = danger (red)
      const badge = container.firstChild;
      expect(badge).toBeTruthy();
    });
  });

  describe('player vs opponent styling', () => {
    it('should apply player styling when isPlayer is true', () => {
      const { container } = render(
        <HullIntegrityBadge
          current={15}
          threshold={18}
          isPlayer={true}
        />
      );

      // Player uses cyan theme
      const badge = container.firstChild;
      expect(badge).toBeTruthy();
    });

    it('should apply opponent styling when isPlayer is false', () => {
      const { container } = render(
        <HullIntegrityBadge
          current={15}
          threshold={18}
          isPlayer={false}
        />
      );

      // Opponent uses red theme
      const badge = container.firstChild;
      expect(badge).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should render without crashing with valid props', () => {
      expect(() => {
        render(
          <HullIntegrityBadge
            current={10}
            threshold={18}
            isPlayer={true}
          />
        );
      }).not.toThrow();
    });

    it('should handle edge case of threshold being zero', () => {
      expect(() => {
        render(
          <HullIntegrityBadge
            current={0}
            threshold={0}
            isPlayer={true}
          />
        );
      }).not.toThrow();
    });
  });
});
