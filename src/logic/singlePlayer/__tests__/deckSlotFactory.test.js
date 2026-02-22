import { describe, it, expect, vi } from 'vitest';
import { createCopyStarterDeckSlot, createEmptyDeckSlot } from '../deckSlotFactory.js';

vi.mock('../../../data/economyData.js', () => ({
  ECONOMY: { STARTER_DECK_COPY_COST: 0 }
}));

vi.mock('../../../data/playerDeckData.js', () => ({
  starterDeck: {
    decklist: [
      { id: 'CARD_A', quantity: 2 },
      { id: 'CARD_B', quantity: 1 }
    ],
    droneSlots: [
      { assignedDrone: 'Scout' },
      { assignedDrone: null }
    ],
    shipComponents: { COMP_BRIDGE: true },
    shipId: 'SHIP_STARTER'
  }
}));

const baseProfile = { credits: 100, stats: {} };

describe('createCopyStarterDeckSlot', () => {
  it('returns deck data with starter cards copied', () => {
    const result = createCopyStarterDeckSlot(1, baseProfile, {}, [], []);
    expect(result).not.toBeNull();
    expect(result.deckData.decklist).toEqual([
      { id: 'CARD_A', quantity: 2 },
      { id: 'CARD_B', quantity: 1 }
    ]);
    expect(result.deckData.shipId).toBe('SHIP_STARTER');
    expect(result.deckData.name).toBe('Ship 1');
  });

  it('adds cards and ship to inventory', () => {
    const result = createCopyStarterDeckSlot(1, baseProfile, { CARD_A: 3 }, [], []);
    expect(result.inventoryUpdate.CARD_A).toBe(5); // 3 existing + 2 from starter
    expect(result.inventoryUpdate.CARD_B).toBe(1);
    expect(result.inventoryUpdate.SHIP_STARTER).toBe(1);
  });

  it('creates drone instances for assigned slots only', () => {
    const result = createCopyStarterDeckSlot(2, baseProfile, {}, [], []);
    expect(result.droneInstances).toHaveLength(1);
    expect(result.droneInstances[0].droneName).toBe('Scout');
    expect(result.droneInstances[0].shipSlotId).toBe(2);
  });

  it('creates component instances', () => {
    const result = createCopyStarterDeckSlot(1, baseProfile, {}, [], []);
    expect(result.componentInstances).toHaveLength(1);
    expect(result.componentInstances[0].componentId).toBe('COMP_BRIDGE');
    expect(result.componentInstances[0].shipSlotId).toBe(1);
  });

  it('returns null when credits insufficient (non-zero cost)', async () => {
    // Re-mock with non-zero cost
    const { ECONOMY } = await import('../../../data/economyData.js');
    const originalCost = ECONOMY.STARTER_DECK_COPY_COST;
    ECONOMY.STARTER_DECK_COPY_COST = 500;

    const result = createCopyStarterDeckSlot(1, { credits: 100 }, {}, [], []);
    expect(result).toBeNull();

    ECONOMY.STARTER_DECK_COPY_COST = originalCost;
  });
});

describe('createEmptyDeckSlot', () => {
  it('returns empty deck data', () => {
    const result = createEmptyDeckSlot(3, baseProfile);
    expect(result).not.toBeNull();
    expect(result.deckData.decklist).toEqual([]);
    expect(result.deckData.shipId).toBeNull();
    expect(result.deckData.name).toBe('Ship 3');
  });

  it('preserves credits when cost is 0', () => {
    const result = createEmptyDeckSlot(1, baseProfile);
    expect(result.profileUpdate.credits).toBe(100);
  });

  it('returns null when credits insufficient (non-zero cost)', async () => {
    const { ECONOMY } = await import('../../../data/economyData.js');
    const originalCost = ECONOMY.STARTER_DECK_COPY_COST;
    ECONOMY.STARTER_DECK_COPY_COST = 500;

    const result = createEmptyDeckSlot(1, { credits: 100 });
    expect(result).toBeNull();

    ECONOMY.STARTER_DECK_COPY_COST = originalCost;
  });
});
