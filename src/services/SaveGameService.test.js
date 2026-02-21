/**
 * SaveGameService Tests - Quick Deployments
 * TDD: Tests written first to verify quickDeployments serialize/deserialize
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import SaveGameService from './SaveGameService.js';

// Mock validateSaveFile to always pass for test simplicity
vi.mock('../logic/save/saveGameValidator.js', () => ({
  validateSaveFile: vi.fn(() => ({ valid: true, errors: [] })),
}));
vi.mock('../data/saveGameSchema.js', () => ({
  SAVE_VERSION: '1.0'
}));

describe('SaveGameService - Quick Deployments', () => {
  const mockQuickDeployments = [
    {
      id: 'qd_test_1',
      name: 'Test Deployment 1',
      createdAt: 1700000000000,
      version: 2,
      droneRoster: ['Scout', 'Fighter', 'Support', 'Heavy', 'Stealth'],
      placements: [{ droneName: 'Scout', lane: 0 }],
      deploymentOrder: [0]
    },
    {
      id: 'qd_test_2',
      name: 'Test Deployment 2',
      createdAt: 1700000001000,
      version: 2,
      droneRoster: ['Scout', 'Fighter', 'Support', 'Heavy', 'Stealth'],
      placements: [],
      deploymentOrder: []
    }
  ];

  const mockPlayerProfile = { credits: 100, gameSeed: 12345 };
  const mockInventory = {};
  const mockDroneInstances = [];
  const mockShipComponentInstances = [];
  const mockDiscoveredCards = [];
  const mockShipSlots = [];

  describe('serialize', () => {
    it('should include quickDeployments in serialized save data', () => {
      const result = SaveGameService.serialize(
        mockPlayerProfile,
        mockInventory,
        mockDroneInstances,
        mockShipComponentInstances,
        mockDiscoveredCards,
        mockShipSlots,
        null,
        mockQuickDeployments
      );

      expect(result.quickDeployments).toBeDefined();
      expect(result.quickDeployments).toEqual(mockQuickDeployments);
    });

    it('should default to empty array if quickDeployments not provided', () => {
      const result = SaveGameService.serialize(
        mockPlayerProfile,
        mockInventory,
        mockDroneInstances,
        mockShipComponentInstances,
        mockDiscoveredCards,
        mockShipSlots
      );

      expect(result.quickDeployments).toEqual([]);
    });

    it('should deep copy quickDeployments to prevent mutation', () => {
      const result = SaveGameService.serialize(
        mockPlayerProfile,
        mockInventory,
        mockDroneInstances,
        mockShipComponentInstances,
        mockDiscoveredCards,
        mockShipSlots,
        null,
        mockQuickDeployments
      );

      // Verify it's a deep copy, not the same reference
      expect(result.quickDeployments).not.toBe(mockQuickDeployments);
      expect(result.quickDeployments[0]).not.toBe(mockQuickDeployments[0]);
    });
  });

  describe('deserialize', () => {
    it('should return quickDeployments from save data', () => {
      const saveData = {
        saveVersion: '1.0',
        playerProfile: mockPlayerProfile,
        inventory: mockInventory,
        droneInstances: mockDroneInstances,
        shipComponentInstances: mockShipComponentInstances,
        discoveredCards: mockDiscoveredCards,
        shipSlots: mockShipSlots,
        currentRunState: null,
        quickDeployments: mockQuickDeployments
      };

      const result = SaveGameService.deserialize(saveData);

      expect(result.quickDeployments).toBeDefined();
      expect(result.quickDeployments).toEqual(mockQuickDeployments);
    });

    it('should default to empty array if quickDeployments missing (backwards compat)', () => {
      const saveData = {
        saveVersion: '1.0',
        playerProfile: mockPlayerProfile,
        inventory: mockInventory,
        droneInstances: mockDroneInstances,
        shipComponentInstances: mockShipComponentInstances,
        discoveredCards: mockDiscoveredCards,
        shipSlots: mockShipSlots,
        currentRunState: null
        // No quickDeployments - simulates older save file
      };

      const result = SaveGameService.deserialize(saveData);

      expect(result.quickDeployments).toEqual([]);
    });
  });

  describe('round-trip', () => {
    it('should preserve quickDeployments through serialize/deserialize cycle', () => {
      // Serialize
      const serialized = SaveGameService.serialize(
        mockPlayerProfile,
        mockInventory,
        mockDroneInstances,
        mockShipComponentInstances,
        mockDiscoveredCards,
        mockShipSlots,
        null,
        mockQuickDeployments
      );

      // Deserialize
      const deserialized = SaveGameService.deserialize(serialized);

      // Verify round-trip preserves data
      expect(deserialized.quickDeployments).toEqual(mockQuickDeployments);
    });
  });

  describe('deployment order migration', () => {
    const v2Deployment = {
      id: 'qd_v2',
      name: 'V2 Deployment',
      createdAt: 1700000000000,
      version: 2,
      droneRoster: ['Scout', 'Fighter', 'Support', 'Heavy', 'Stealth'],
      placements: [{ droneName: 'Scout', lane: 0 }, { droneName: 'Fighter', lane: 1 }],
      deploymentOrder: [1, 0]  // Explicit order: Fighter first, Scout second
    };

    const v1DeploymentNoVersion = {
      id: 'qd_v1_no_version',
      name: 'Old Deployment (no version)',
      createdAt: 1700000000000,
      droneRoster: ['Scout', 'Fighter', 'Support', 'Heavy', 'Stealth'],
      placements: [{ droneName: 'Scout', lane: 0 }]
      // No version field - old format
    };

    it('should filter out old deployments without version field during deserialize', () => {
      const saveData = {
        saveVersion: '1.0',
        playerProfile: mockPlayerProfile,
        inventory: mockInventory,
        droneInstances: mockDroneInstances,
        shipComponentInstances: mockShipComponentInstances,
        discoveredCards: mockDiscoveredCards,
        shipSlots: mockShipSlots,
        currentRunState: null,
        quickDeployments: [v1DeploymentNoVersion, v2Deployment]
      };

      const result = SaveGameService.deserialize(saveData);

      // Only v2 deployment should remain
      expect(result.quickDeployments.length).toBe(1);
      expect(result.quickDeployments[0].id).toBe('qd_v2');
    });

    it('should preserve v2 deployments unchanged during deserialize', () => {
      const saveData = {
        saveVersion: '1.0',
        playerProfile: mockPlayerProfile,
        inventory: mockInventory,
        droneInstances: mockDroneInstances,
        shipComponentInstances: mockShipComponentInstances,
        discoveredCards: mockDiscoveredCards,
        shipSlots: mockShipSlots,
        currentRunState: null,
        quickDeployments: [v2Deployment]
      };

      const result = SaveGameService.deserialize(saveData);

      expect(result.quickDeployments[0]).toEqual(v2Deployment);
      expect(result.quickDeployments[0].deploymentOrder).toEqual([1, 0]);
    });

    it('should add default deploymentOrder to v2 deployments missing it', () => {
      const v2WithoutOrder = {
        id: 'qd_v2_no_order',
        name: 'V2 Without Order',
        createdAt: 1700000000000,
        version: 2,
        droneRoster: ['Scout', 'Fighter', 'Support', 'Heavy', 'Stealth'],
        placements: [{ droneName: 'Scout', lane: 0 }, { droneName: 'Fighter', lane: 1 }, { droneName: 'Support', lane: 2 }]
        // No deploymentOrder - edge case
      };

      const saveData = {
        saveVersion: '1.0',
        playerProfile: mockPlayerProfile,
        inventory: mockInventory,
        droneInstances: mockDroneInstances,
        shipComponentInstances: mockShipComponentInstances,
        discoveredCards: mockDiscoveredCards,
        shipSlots: mockShipSlots,
        currentRunState: null,
        quickDeployments: [v2WithoutOrder]
      };

      const result = SaveGameService.deserialize(saveData);

      // Should add default deploymentOrder [0, 1, 2]
      expect(result.quickDeployments[0].deploymentOrder).toEqual([0, 1, 2]);
    });
  });
});
