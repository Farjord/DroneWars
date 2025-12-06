/**
 * SaveGameService Tests - Quick Deployments
 * TDD: Tests written first to verify quickDeployments serialize/deserialize
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import SaveGameService from './SaveGameService.js';

// Mock validateSaveFile to always pass for test simplicity
vi.mock('../data/saveGameSchema.js', () => ({
  validateSaveFile: vi.fn(() => ({ valid: true, errors: [] })),
  SAVE_VERSION: '1.0'
}));

describe('SaveGameService - Quick Deployments', () => {
  const mockQuickDeployments = [
    {
      id: 'qd_test_1',
      name: 'Test Deployment 1',
      createdAt: 1700000000000,
      droneRoster: ['Scout', 'Fighter', 'Support', 'Heavy', 'Stealth'],
      placements: [{ droneName: 'Scout', lane: 0 }]
    },
    {
      id: 'qd_test_2',
      name: 'Test Deployment 2',
      createdAt: 1700000001000,
      droneRoster: ['Scout', 'Fighter', 'Support', 'Heavy', 'Stealth'],
      placements: []
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
});
