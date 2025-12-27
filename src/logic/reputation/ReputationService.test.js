/**
 * ReputationService.test.js
 * Tests for ReputationService MIA penalty functionality
 *
 * TDD Test: Verifies that REPUTATION.MIA_MULTIPLIER is correctly imported
 * and applied when awarding reputation on failed extractions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReputationService from './ReputationService.js';
import gameStateManager from '../../managers/GameStateManager.js';
import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import { shipCollection } from '../../data/shipData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { starterPoolCards, starterPoolDroneNames, starterPoolShipIds } from '../../data/saveGameSchema.js';

// Mock gameStateManager
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
  }
}));

describe('ReputationService - MIA Penalty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply MIA penalty (25%) to combat reputation on failed extraction', () => {
    // Find actual non-starter items from collections
    const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));
    const nonStarterDrone = fullDroneCollection.find(d => !starterPoolDroneNames.includes(d.name));
    const nonStarterShip = shipCollection.find(s => !starterPoolShipIds.includes(s.id));
    const nonStarterComponents = shipComponentCollection.filter(c => !starterPoolCards.includes(c.id)).slice(0, 3);

    // Setup: Create a ship slot with non-starter loadout
    const shipSlot = {
      id: 1,
      decklist: nonStarterCard ? [{ id: nonStarterCard.id, quantity: 2 }] : [],
      drones: nonStarterDrone ? [{ name: nonStarterDrone.name }] : [],
      shipId: nonStarterShip ? nonStarterShip.id : '',
      shipComponents: {
        left: nonStarterComponents[0]?.id,
        middle: nonStarterComponents[1]?.id,
        right: nonStarterComponents[2]?.id,
      }
    };

    // Mock game state with initial reputation
    const mockState = {
      singlePlayerProfile: {
        reputation: {
          current: 1000,
          level: 1,
          unclaimedRewards: []
        }
      }
    };

    gameStateManager.getState.mockReturnValue(mockState);

    // Award reputation with MIA (success = false) and combat reputation
    const result = ReputationService.awardReputation(
      shipSlot,
      1,           // tier 1
      false,       // success = false (MIA)
      2000         // combatReputation earned during run
    );

    // Assert: Combat rep should be reduced to 25% (2000 × 0.25 = 500)
    expect(result.combatRepGained).toBe(500);
    expect(result.success).toBe(true); // Operation succeeded
    expect(result.repGained).toBeGreaterThan(0); // Total includes loadout + reduced combat rep
    expect(result.loadoutRepGained).toBeGreaterThan(0); // Loadout rep also reduced by 25%

    // Verify state was updated
    expect(gameStateManager.setState).toHaveBeenCalled();
  });

  it('should NOT apply MIA penalty on successful extraction', () => {
    // Find actual non-starter items from collections
    const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));
    const nonStarterDrone = fullDroneCollection.find(d => !starterPoolDroneNames.includes(d.name));
    const nonStarterShip = shipCollection.find(s => !starterPoolShipIds.includes(s.id));
    const nonStarterComponents = shipComponentCollection.filter(c => !starterPoolCards.includes(c.id)).slice(0, 3);

    // Setup: Create a ship slot with non-starter loadout
    const shipSlot = {
      id: 1,
      decklist: nonStarterCard ? [{ id: nonStarterCard.id, quantity: 2 }] : [],
      drones: nonStarterDrone ? [{ name: nonStarterDrone.name }] : [],
      shipId: nonStarterShip ? nonStarterShip.id : '',
      shipComponents: {
        left: nonStarterComponents[0]?.id,
        middle: nonStarterComponents[1]?.id,
        right: nonStarterComponents[2]?.id,
      }
    };

    // Mock game state
    const mockState = {
      singlePlayerProfile: {
        reputation: {
          current: 1000,
          level: 1,
          unclaimedRewards: []
        }
      }
    };

    gameStateManager.getState.mockReturnValue(mockState);

    // Award reputation with success
    const result = ReputationService.awardReputation(
      shipSlot,
      1,           // tier 1
      true,        // success = true
      2000         // combatReputation
    );

    // Assert: Full combat rep awarded (no penalty)
    expect(result.combatRepGained).toBe(2000);
    expect(result.success).toBe(true);
    expect(result.repGained).toBeGreaterThan(0);

    // Verify state was updated
    expect(gameStateManager.setState).toHaveBeenCalled();
  });

  it('should handle zero combat reputation correctly', () => {
    // Find actual non-starter card
    const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));

    const shipSlot = {
      id: 1,
      decklist: nonStarterCard ? [{ id: nonStarterCard.id, quantity: 1 }] : [],
      drones: [],
      shipId: '',
      shipComponents: {}
    };

    const mockState = {
      singlePlayerProfile: {
        reputation: {
          current: 500,
          level: 1,
          unclaimedRewards: []
        }
      }
    };

    gameStateManager.getState.mockReturnValue(mockState);

    // Award with MIA and zero combat rep
    const result = ReputationService.awardReputation(
      shipSlot,
      1,
      false,       // MIA
      0            // No combat rep
    );

    // Assert: Combat rep should be 0
    expect(result.combatRepGained).toBe(0);
    expect(result.success).toBe(true);

    // Should still award loadout rep (reduced by 25%)
    expect(result.loadoutRepGained).toBeGreaterThan(0);
  });

  it('should not award reputation for starter deck (slot 0)', () => {
    const starterSlot = {
      id: 0,
      isImmutable: true,
      decklist: [],
      drones: [],
      shipId: 'SHIP_STARTER',
      shipComponents: {}
    };

    const mockState = {
      singlePlayerProfile: {
        reputation: {
          current: 1000,
          level: 1,
          unclaimedRewards: []
        }
      }
    };

    gameStateManager.getState.mockReturnValue(mockState);

    // Award with combat rep (should be ignored for starter deck)
    const result = ReputationService.awardReputation(
      starterSlot,
      1,
      true,        // Even on success
      2000         // Combat rep should be ignored
    );

    // Assert: No rep awarded for starter deck
    expect(result.isStarterDeck).toBe(true);
    expect(result.repGained).toBe(0);
    expect(result.combatRepGained).toBe(0);
    expect(result.loadoutRepGained).toBe(0);
  });
});
