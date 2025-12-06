/**
 * Asset Manifest Tests - Ship Section Images
 * TDD: Tests written first to verify ship section images are preloaded
 */

import { describe, it, expect } from 'vitest';
import { assetManifest, getAllAssetPaths } from './assetManifest.js';

describe('assetManifest - Ship Section Images', () => {
  describe('shipSectionImages category', () => {
    it('should exist in the manifest', () => {
      expect(assetManifest.shipSectionImages).toBeDefined();
      expect(Array.isArray(assetManifest.shipSectionImages)).toBe(true);
    });

    it('should include ship-specific images for Corvette', () => {
      const corvettePaths = assetManifest.shipSectionImages.filter(p =>
        p.includes('/Ships/Corvette/')
      );
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Bridge.png');
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Power_Cell.png');
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Drone_Control_Hub.png');
    });

    it('should include ship-specific images for Carrier', () => {
      const carrierPaths = assetManifest.shipSectionImages.filter(p =>
        p.includes('/Ships/Carrier/')
      );
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Bridge.png');
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Power_Cell.png');
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Drone_Control_Hub.png');
    });

    it('should include ship-specific images for Scout', () => {
      const scoutPaths = assetManifest.shipSectionImages.filter(p =>
        p.includes('/Ships/Scout/')
      );
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Bridge.png');
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Power_Cell.png');
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Drone_Control_Hub.png');
    });

    it('should include fallback images', () => {
      expect(assetManifest.shipSectionImages).toContain('/DroneWars/img/Bridge.png');
      expect(assetManifest.shipSectionImages).toContain('/DroneWars/img/Power_Cell.png');
      expect(assetManifest.shipSectionImages).toContain('/DroneWars/img/Drone_Control_Hub.png');
    });

    it('should have correct total count (3 ships × 3 sections + 3 fallbacks = 12)', () => {
      expect(assetManifest.shipSectionImages.length).toBe(12);
    });
  });

  describe('getAllAssetPaths', () => {
    it('should include ship section images in full asset list', () => {
      const allPaths = getAllAssetPaths();
      expect(allPaths).toContain('/DroneWars/Ships/Corvette/Bridge.png');
      expect(allPaths).toContain('/DroneWars/img/Bridge.png');
    });
  });
});
