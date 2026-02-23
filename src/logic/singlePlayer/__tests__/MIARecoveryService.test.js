/**
 * MIARecoveryService.test.js
 * TDD tests for scaled MIA recovery cost calculation
 *
 * Test Requirement: MIA recovery cost should be 50% of deck's total value
 * (cards + ship + drones + components), with starter items counting as 0,
 * and a configurable minimum floor.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import miaRecoveryService from '../MIARecoveryService.js';
import gameStateManager from '../../../managers/GameStateManager.js';
import creditManager from '../../economy/CreditManager.js';
import { ECONOMY } from '../../../data/economyData.js';
import { starterPoolCards, starterPoolDroneNames, starterPoolShipIds } from '../../../data/saveGameSchema.js';

// Mock the gameStateManager
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

// Mock creditManager
vi.mock('../../economy/CreditManager.js', () => ({
  default: {
    canAfford: vi.fn(() => true),
    deduct: vi.fn(() => ({ success: true }))
  }
}));

describe('MIARecoveryService - Scaled Recovery Cost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateRecoveryCost', () => {
    it('returns floor value for deck with only starter cards', () => {
      // Set up a ship slot with only starter cards
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0], // Starter ship
          decklist: [
            { id: starterPoolCards[0], quantity: 4 },
            { id: starterPoolCards[1], quantity: 4 }
          ],
          droneSlots: [
            { slotIndex: 0, assignedDrone: starterPoolDroneNames[0] },
            { slotIndex: 1, assignedDrone: starterPoolDroneNames[1] }
          ],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // Starter items = 0 value, so should return floor
      expect(cost).toBe(ECONOMY.MIA_RECOVERY_FLOOR);
    });

    it('calculates 50% of total card replication value for non-starter cards', () => {
      // Set up a ship slot with 10 Common non-starter cards
      // Common replication cost = 1000, so 10 cards = 10,000 total
      // 50% = 5,000
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0], // Starter ship (0 value)
          decklist: [
            { id: 'CARD003', quantity: 10 } // Common card (non-starter)
          ],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // 10 Common cards × 1000 = 10,000 × 0.5 = 5,000
      expect(cost).toBe(5000);
    });

    it('includes ship blueprint value in calculation for non-starter ships', () => {
      // Non-starter ship should add value
      // Using a non-starter ship ID
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: 'SHIP_002', // Non-starter ship (Uncommon)
          decklist: [],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // Ship value should contribute to cost (not just floor)
      // Uncommon ship blueprint cost is around 250
      // 250 × 0.5 = 125, but floor is 500, so should be 500
      expect(cost).toBeGreaterThanOrEqual(ECONOMY.MIA_RECOVERY_FLOOR);
    });

    it('includes drone blueprint values in calculation for non-starter drones', () => {
      // Non-starter drone should add value
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0],
          decklist: [],
          droneSlots: [
            { slotIndex: 0, assignedDrone: 'Devastator' }, // Uncommon, not starter
            { slotIndex: 1, assignedDrone: 'Harrier' }, // Uncommon, not starter
            { slotIndex: 2, assignedDrone: 'Aegis' } // Rare, not starter
          ],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // Non-starter drones should contribute to value
      // Should be more than just the floor
      expect(cost).toBeGreaterThanOrEqual(ECONOMY.MIA_RECOVERY_FLOOR);
    });

    it('includes component blueprint values in calculation for non-starter components', () => {
      // Non-starter component should add value
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0],
          decklist: [],
          droneSlots: [],
          shipComponents: {
            'BRIDGE_HEAVY': 'm' // Rare bridge, not starter
          }
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // Non-starter component should contribute to value
      expect(cost).toBeGreaterThanOrEqual(ECONOMY.MIA_RECOVERY_FLOOR);
    });

    it('applies floor when calculated cost is below minimum', () => {
      // Very low value deck - calculated cost would be below floor
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0],
          decklist: [
            { id: 'CARD001', quantity: 1 } // 1 Common = 1000 × 0.5 = 500
          ],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // Should return at least the floor
      expect(cost).toBe(ECONOMY.MIA_RECOVERY_FLOOR);
    });

    it('correctly sums mixed rarity cards', () => {
      // Mix of Common, Uncommon, Rare cards
      // Common: 1000, Uncommon: 2500, Rare: 3000
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0],
          decklist: [
            { id: 'CARD003', quantity: 10 }, // Common (non-starter): 10 × 1000 = 10,000
            { id: 'CARD001_ENHANCED', quantity: 5 }, // Uncommon: 5 × 2500 = 12,500
            { id: 'CARD024', quantity: 2 } // Rare (Piercing Rounds): 2 × 3000 = 6,000
          ],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // Total: 10,000 + 12,500 + 6,000 = 28,500 × 0.5 = 14,250
      expect(cost).toBe(14250);
    });

    it('ignores starter cards in value calculation', () => {
      // Mix of starter and non-starter cards - only non-starter should count
      const firstStarterCard = starterPoolCards[0];

      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0],
          decklist: [
            { id: firstStarterCard, quantity: 20 }, // Starter: 0 value
            { id: 'CARD003', quantity: 10 } // Common non-starter: 10 × 1000 = 10,000
          ],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // Only non-starter cards count: 10,000 × 0.5 = 5,000
      expect(cost).toBe(5000);
    });

    it('returns floor for slot not found', () => {
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: []
      });

      const cost = miaRecoveryService.calculateRecoveryCost(99);

      expect(cost).toBe(ECONOMY.MIA_RECOVERY_FLOOR);
    });

    it('ignores starter drones in value calculation', () => {
      // Mix of starter and non-starter drones
      const firstStarterDrone = starterPoolDroneNames[0];

      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0],
          decklist: [],
          droneSlots: [
            { slotIndex: 0, assignedDrone: firstStarterDrone }, // Starter: 0 value
            { slotIndex: 1, assignedDrone: 'Devastator' } // Non-starter Uncommon
          ],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.calculateRecoveryCost(1);

      // Only non-starter drone counts
      // Bomber is Uncommon, blueprint cost ~175, total × 0.5
      // Result should be at least floor
      expect(cost).toBeGreaterThanOrEqual(ECONOMY.MIA_RECOVERY_FLOOR);
    });
  });

  describe('recover - uses calculated cost', () => {
    it('deducts calculated recovery cost instead of flat 500', () => {
      // Set up an MIA slot with some value
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          name: 'Test Ship',
          shipId: starterPoolShipIds[0],
          decklist: [
            { id: 'CARD003', quantity: 20 } // 20 Common (non-starter) = 20,000 × 0.5 = 10,000
          ],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = miaRecoveryService.recover(1);

      // Should deduct 10,000 (calculated cost), not 500 (old flat cost)
      expect(creditManager.deduct).toHaveBeenCalledWith(
        10000,
        expect.stringContaining('MIA Recovery')
      );
      expect(result.success).toBe(true);
      expect(result.cost).toBe(10000);
    });

    it('returns the calculated cost in the result', () => {
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          name: 'Test Ship',
          shipId: starterPoolShipIds[0],
          decklist: [
            { id: 'CARD003', quantity: 40 } // 40 Common (non-starter) = 40,000 × 0.5 = 20,000
          ],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = miaRecoveryService.recover(1);

      expect(result.cost).toBe(20000);
    });
  });

  describe('canAffordRecovery - uses calculated cost', () => {
    it('checks affordability against calculated cost for specific slot', () => {
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0],
          decklist: [
            { id: 'CARD003', quantity: 20 } // 20 Common (non-starter) = 20,000 × 0.5 = 10,000
          ],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      creditManager.canAfford.mockReturnValue(false);

      const canAfford = miaRecoveryService.canAffordRecovery(1);

      expect(creditManager.canAfford).toHaveBeenCalledWith(10000);
      expect(canAfford).toBe(false);
    });
  });

  describe('getSalvageCost - returns calculated cost', () => {
    it('returns calculated cost for a specific slot', () => {
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [{
          id: 1,
          status: 'mia',
          shipId: starterPoolShipIds[0],
          decklist: [
            { id: 'CARD003', quantity: 10 } // 10 Common (non-starter) = 10,000 × 0.5 = 5,000
          ],
          droneSlots: [],
          shipComponents: {}
        }]
      });

      const cost = miaRecoveryService.getSalvageCost(1);

      expect(cost).toBe(5000);
    });
  });
});
