/**
 * QuickDeployService Tests - Deployment Order Feature
 * TDD: Tests written first to verify version and deploymentOrder functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuickDeployService from './QuickDeployService.js';

describe('QuickDeployService - Deployment Order', () => {
  let mockGameStateManager;
  let service;

  const validDroneRoster = ['Scout Drone', 'Standard Fighter', 'Support Drone', 'Heavy Drone', 'Stealth Drone'];
  const validPlacements = [
    { droneName: 'Scout Drone', lane: 0 },
    { droneName: 'Standard Fighter', lane: 2 },
    { droneName: 'Scout Drone', lane: 0 }  // Duplicate - same drone, same lane
  ];

  beforeEach(() => {
    mockGameStateManager = {
      getState: vi.fn(() => ({ quickDeployments: [] })),
      setState: vi.fn()
    };
    service = new QuickDeployService(mockGameStateManager);
  });

  describe('create()', () => {
    it('should add version: 2 to new deployments', () => {
      const result = service.create('Test Deploy', validDroneRoster, validPlacements);

      expect(result.version).toBe(2);
    });

    it('should initialize deploymentOrder as [0, 1, 2, ...] matching placements indices', () => {
      const result = service.create('Test Deploy', validDroneRoster, validPlacements);

      expect(result.deploymentOrder).toEqual([0, 1, 2]);
    });

    it('should initialize empty deploymentOrder for empty placements', () => {
      const result = service.create('Test Deploy', validDroneRoster, []);

      expect(result.deploymentOrder).toEqual([]);
    });

    it('should preserve placements array order', () => {
      const result = service.create('Test Deploy', validDroneRoster, validPlacements);

      expect(result.placements).toEqual(validPlacements);
      expect(result.placements[0].droneName).toBe('Scout Drone');
      expect(result.placements[0].lane).toBe(0);
      expect(result.placements[1].droneName).toBe('Standard Fighter');
      expect(result.placements[2].droneName).toBe('Scout Drone');
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      // Set up an existing deployment
      mockGameStateManager.getState.mockReturnValue({
        quickDeployments: [{
          id: 'qd_existing',
          name: 'Existing Deploy',
          createdAt: 1700000000000,
          version: 2,
          droneRoster: validDroneRoster,
          placements: validPlacements,
          deploymentOrder: [0, 1, 2]
        }]
      });
    });

    it('should preserve version field when updating', () => {
      const result = service.update('qd_existing', { name: 'Updated Name' });

      expect(result.version).toBe(2);
    });

    it('should preserve deploymentOrder when only updating name', () => {
      const result = service.update('qd_existing', { name: 'Updated Name' });

      expect(result.deploymentOrder).toEqual([0, 1, 2]);
    });

    it('should rebuild deploymentOrder when placements change and no order provided', () => {
      const newPlacements = [
        { droneName: 'Heavy Drone', lane: 1 },
        { droneName: 'Support Drone', lane: 0 }
      ];

      const result = service.update('qd_existing', { placements: newPlacements });

      // Should be reset to [0, 1] for the new placements
      expect(result.deploymentOrder).toEqual([0, 1]);
    });

    it('should allow updating deploymentOrder explicitly', () => {
      const result = service.update('qd_existing', { deploymentOrder: [2, 0, 1] });

      expect(result.deploymentOrder).toEqual([2, 0, 1]);
    });
  });

  describe('reorderDeployments()', () => {
    beforeEach(() => {
      mockGameStateManager.getState.mockReturnValue({
        quickDeployments: [{
          id: 'qd_existing',
          name: 'Existing Deploy',
          createdAt: 1700000000000,
          version: 2,
          droneRoster: validDroneRoster,
          placements: validPlacements,
          deploymentOrder: [0, 1, 2]
        }]
      });
    });

    it('should update the deploymentOrder array', () => {
      const result = service.reorderDeployments('qd_existing', [2, 0, 1]);

      expect(result.deploymentOrder).toEqual([2, 0, 1]);
    });

    it('should throw error if newOrder length does not match placements length', () => {
      expect(() => {
        service.reorderDeployments('qd_existing', [0, 1]); // Only 2 elements, should be 3
      }).toThrow('Deployment order must have same length as placements');
    });

    it('should throw error if newOrder contains invalid indices', () => {
      expect(() => {
        service.reorderDeployments('qd_existing', [0, 1, 5]); // Index 5 doesn't exist
      }).toThrow('Invalid placement index');
    });

    it('should throw error if newOrder contains duplicate indices', () => {
      expect(() => {
        service.reorderDeployments('qd_existing', [0, 1, 1]); // Duplicate index 1
      }).toThrow('Duplicate placement index');
    });

    it('should throw error if deployment not found', () => {
      expect(() => {
        service.reorderDeployments('qd_nonexistent', [0, 1, 2]);
      }).toThrow('Quick deployment not found');
    });
  });
});
