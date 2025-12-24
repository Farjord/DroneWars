/**
 * mapGenerator.test.js
 * Tests for map generation, focusing on gate placement randomization
 */

import { describe, it, expect } from 'vitest';
import { generateMapData } from './mapGenerator.js';
import { axialDistance } from './hexGrid.js';

describe('mapGenerator', () => {
  describe('gate placement', () => {
    it('should place gates on the outer edge of the map (at radius distance from center)', () => {
      const map = generateMapData(12345, 1);
      const radius = map.radius;

      for (const gate of map.gates) {
        const distanceFromCenter = axialDistance(0, 0, gate.q, gate.r);
        // Gates must be at the perimeter (radius distance from center)
        expect(distanceFromCenter).toBe(radius);
      }
    });

    it('should place gates at different positions with different seeds', () => {
      // Generate multiple maps with different seeds
      const maps = [];
      for (let seed = 1; seed <= 10; seed++) {
        maps.push(generateMapData(seed * 1000, 1));
      }

      // Collect all gate positions (as strings for easy comparison)
      const gatePositionSets = maps.map(map =>
        map.gates.map(g => `${g.q},${g.r}`).sort().join('|')
      );

      // With 10 different seeds, we should see at least 2 different gate configurations
      // (statistically, with random starting angles, it's extremely unlikely all 10 are identical)
      const uniqueConfigurations = new Set(gatePositionSets);
      expect(uniqueConfigurations.size).toBeGreaterThan(1);
    });

    it('should maintain roughly equidistant spacing between gates regardless of starting position', () => {
      const map = generateMapData(42, 1);
      const gates = map.gates;

      if (gates.length < 2) return; // Need at least 2 gates to check spacing

      // Calculate distances between consecutive gates
      const distances = [];
      for (let i = 0; i < gates.length; i++) {
        const next = (i + 1) % gates.length;
        const dist = axialDistance(gates[i].q, gates[i].r, gates[next].q, gates[next].r);
        distances.push(dist);
      }

      // All inter-gate distances should be approximately equal
      // Allow tolerance of 2 hexes due to snapping to hex grid positions
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      for (const dist of distances) {
        expect(Math.abs(dist - avgDistance)).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('gate count for tier 1', () => {
    it('should generate between 3 and 4 gates for tier 1 maps', () => {
      // Test with multiple seeds to verify the range
      const gateCounts = new Set();

      for (let seed = 1; seed <= 50; seed++) {
        const map = generateMapData(seed * 100, 1);
        gateCounts.add(map.gates.length);

        // Each map should have 3 or 4 gates
        expect(map.gates.length).toBeGreaterThanOrEqual(3);
        expect(map.gates.length).toBeLessThanOrEqual(4);
      }

      // Over 50 maps, we should see both 3 and 4 gate counts (unless RNG is broken)
      expect(gateCounts.has(3)).toBe(true);
      expect(gateCounts.has(4)).toBe(true);
    });

    it('should report correct gateCount in map metadata', () => {
      const map = generateMapData(12345, 1);
      expect(map.gateCount).toBe(map.gates.length);
    });
  });

  describe('deterministic generation', () => {
    it('should generate identical maps with the same seed', () => {
      const map1 = generateMapData(99999, 1);
      const map2 = generateMapData(99999, 1);

      // Gate positions should be identical
      expect(map1.gates.length).toBe(map2.gates.length);
      for (let i = 0; i < map1.gates.length; i++) {
        expect(map1.gates[i].q).toBe(map2.gates[i].q);
        expect(map1.gates[i].r).toBe(map2.gates[i].r);
      }

      // POI positions should be identical
      expect(map1.pois.length).toBe(map2.pois.length);
    });
  });

  describe('background persistence', () => {
    it('should include backgroundIndex in map data for tactical map persistence', () => {
      const map = generateMapData(12345, 1);

      // backgroundIndex should be present
      expect(map.backgroundIndex).toBeDefined();

      // backgroundIndex should be a valid index (0-4 for 5 backgrounds)
      expect(map.backgroundIndex).toBeGreaterThanOrEqual(0);
      expect(map.backgroundIndex).toBeLessThan(5);
    });

    it('should generate same backgroundIndex with same seed (deterministic)', () => {
      const map1 = generateMapData(99999, 1);
      const map2 = generateMapData(99999, 1);

      expect(map1.backgroundIndex).toBe(map2.backgroundIndex);
    });

    it('should generate different backgroundIndex with different seeds', () => {
      // Generate maps with different seeds
      const backgroundIndices = new Set();
      for (let seed = 1; seed <= 20; seed++) {
        const map = generateMapData(seed * 1000, 1);
        backgroundIndices.add(map.backgroundIndex);
      }

      // With 20 different seeds, we should see more than 1 unique background
      expect(backgroundIndices.size).toBeGreaterThan(1);
    });
  });
});
