// ========================================
// TARGETING ARROW COMPONENT TESTS
// ========================================
// Tests for the TargetingArrow component, including color prop and tapered polygon support

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TargetingArrow, { calculatePolygonPoints } from '../TargetingArrow';

describe('TargetingArrow', () => {
  describe('visibility', () => {
    it('should render nothing when visible is false', () => {
      const { container } = render(
        <TargetingArrow
          visible={false}
          start={{ x: 0, y: 0 }}
          end={{ x: 100, y: 100 }}
        />
      );
      expect(container.querySelector('svg')).toBeNull();
    });

    it('should render SVG when visible is true', () => {
      const { container } = render(
        <TargetingArrow
          visible={true}
          start={{ x: 0, y: 0 }}
          end={{ x: 100, y: 100 }}
        />
      );
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });

  describe('arrow positioning', () => {
    it('should render polygon elements for tapered body', () => {
      const { container } = render(
        <TargetingArrow
          visible={true}
          start={{ x: 50, y: 75 }}
          end={{ x: 200, y: 300 }}
        />
      );
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(2); // Glow polygon and core polygon
      // Both polygons should have points attribute
      expect(polygons[0]).toHaveAttribute('points');
      expect(polygons[1]).toHaveAttribute('points');
    });

    it('should render 7 points for integrated arrowhead shape', () => {
      const { container } = render(
        <TargetingArrow
          visible={true}
          start={{ x: 50, y: 75 }}
          end={{ x: 200, y: 300 }}
        />
      );
      const polygon = container.querySelector('polygon');
      const points = polygon.getAttribute('points');
      // Should be 7 coordinate pairs (body + arrowhead) separated by spaces
      expect(points.split(' ').length).toBe(7);
    });
  });

  describe('color prop', () => {
    it('should use default color #ff0055 when no color prop provided', () => {
      const { container } = render(
        <TargetingArrow
          visible={true}
          start={{ x: 0, y: 0 }}
          end={{ x: 100, y: 100 }}
        />
      );
      // Core polygon has the fill color
      const polygons = container.querySelectorAll('polygon');
      expect(polygons[1]).toHaveAttribute('fill', '#ff0055');
    });

    it('should use custom color when color prop is provided', () => {
      const { container } = render(
        <TargetingArrow
          visible={true}
          start={{ x: 0, y: 0 }}
          end={{ x: 100, y: 100 }}
          color="#22d3ee"
        />
      );
      const polygons = container.querySelectorAll('polygon');
      expect(polygons[1]).toHaveAttribute('fill', '#22d3ee');
    });

    it('should apply custom color to glow polygon', () => {
      const { container } = render(
        <TargetingArrow
          visible={true}
          start={{ x: 0, y: 0 }}
          end={{ x: 100, y: 100 }}
          color="#22d3ee"
        />
      );
      // Glow polygon (first one) should also have the custom color
      const polygons = container.querySelectorAll('polygon');
      expect(polygons[0]).toHaveAttribute('fill', '#22d3ee');
    });
  });

  describe('lineRef', () => {
    it('should attach lineRef to the core polygon element', () => {
      const lineRef = { current: null };
      const { container } = render(
        <TargetingArrow
          visible={true}
          start={{ x: 0, y: 0 }}
          end={{ x: 100, y: 100 }}
          lineRef={lineRef}
        />
      );
      // Ref is on the core polygon (second one, after glow polygon)
      const polygons = container.querySelectorAll('polygon');
      expect(lineRef.current).toBe(polygons[1]);
    });
  });

  describe('calculatePolygonPoints helper', () => {
    it('should export calculatePolygonPoints function', () => {
      expect(typeof calculatePolygonPoints).toBe('function');
    });

    it('should return a string of 7 coordinate pairs (body + arrowhead)', () => {
      const points = calculatePolygonPoints(
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      );
      // Should be 7 coordinate pairs separated by spaces
      const pairs = points.split(' ');
      expect(pairs.length).toBe(7);
    });

    it('should handle vertical arrows', () => {
      const points = calculatePolygonPoints(
        { x: 50, y: 0 },
        { x: 50, y: 100 }
      );
      // Should produce valid points string with 7 points
      expect(points).toBeTruthy();
      expect(points.split(' ').length).toBe(7);
    });

    it('should handle diagonal arrows', () => {
      const points = calculatePolygonPoints(
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );
      // Should produce valid points string with 7 points
      expect(points).toBeTruthy();
      expect(points.split(' ').length).toBe(7);
    });

    it('should handle zero-length arrows without crashing', () => {
      const points = calculatePolygonPoints(
        { x: 50, y: 50 },
        { x: 50, y: 50 }
      );
      // Should not throw and should return valid points
      expect(points).toBeTruthy();
    });
  });
});
