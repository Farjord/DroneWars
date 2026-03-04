/**
 * Asset Manifest Tests - Ship Section Images
 * TDD: Tests written first to verify ship section images are preloaded
 */

import { describe, it, expect } from 'vitest';
import { assetManifest, getAllAssetPaths } from '../assetManifest.js';

describe('assetManifest - Ship Section Images', () => {
  describe('shipSectionImages category', () => {
    it('should exist in the manifest', () => {
      expect(assetManifest.shipSectionImages).toBeDefined();
      expect(Array.isArray(assetManifest.shipSectionImages)).toBe(true);
    });

    it('should include Player and Opponent images for Corvette', () => {
      const corvettePaths = assetManifest.shipSectionImages.filter(p =>
        p.includes('/Ships/Corvette/')
      );
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Player/Bridge.png');
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Player/Power_Cell.png');
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Player/Drone_Control_Hub.png');
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Opponent/Bridge.png');
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Opponent/Power_Cell.png');
      expect(corvettePaths).toContain('/DroneWars/Ships/Corvette/Opponent/Drone_Control_Hub.png');
    });

    it('should include Player and Opponent images for Carrier', () => {
      const carrierPaths = assetManifest.shipSectionImages.filter(p =>
        p.includes('/Ships/Carrier/')
      );
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Player/Bridge.png');
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Player/Power_Cell.png');
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Player/Drone_Control_Hub.png');
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Opponent/Bridge.png');
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Opponent/Power_Cell.png');
      expect(carrierPaths).toContain('/DroneWars/Ships/Carrier/Opponent/Drone_Control_Hub.png');
    });

    it('should include Player and Opponent images for Scout', () => {
      const scoutPaths = assetManifest.shipSectionImages.filter(p =>
        p.includes('/Ships/Scout/')
      );
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Player/Bridge.png');
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Player/Power_Cell.png');
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Player/Drone_Control_Hub.png');
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Opponent/Bridge.png');
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Opponent/Power_Cell.png');
      expect(scoutPaths).toContain('/DroneWars/Ships/Scout/Opponent/Drone_Control_Hub.png');
    });

    it('should include fallback images', () => {
      expect(assetManifest.shipSectionImages).toContain('/DroneWars/img/Bridge.png');
      expect(assetManifest.shipSectionImages).toContain('/DroneWars/img/Power_Cell.png');
      expect(assetManifest.shipSectionImages).toContain('/DroneWars/img/Drone_Control_Hub.png');
    });

    it('should have correct total count (3 ships × 2 perspectives × 3 sections + 3 fallbacks = 21)', () => {
      expect(assetManifest.shipSectionImages.length).toBe(21);
    });
  });

  describe('getAllAssetPaths', () => {
    it('should include ship section images in full asset list', () => {
      const allPaths = getAllAssetPaths();
      expect(allPaths).toContain('/DroneWars/Ships/Corvette/Player/Bridge.png');
      expect(allPaths).toContain('/DroneWars/Ships/Corvette/Opponent/Bridge.png');
      expect(allPaths).toContain('/DroneWars/img/Bridge.png');
    });
  });
});
