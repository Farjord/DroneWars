import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShipSlotManager from '../ShipSlotManager.js';

// --- Mocks ---

vi.mock('../../data/economyData.js', () => ({
  ECONOMY: {
    DECK_SLOT_UNLOCK_COSTS: { 2: 500, 3: 1000, 4: 2000, 5: 5000 },
    SECTION_DAMAGE_REPAIR_COST: 10,
  }
}));

vi.mock('../../data/saveGameSchema.js', () => ({
  starterPoolCards: ['starter_card_1'],
  starterPoolDroneNames: ['Starter Drone'],
}));

vi.mock('../../logic/migration/saveGameMigrations.js', () => ({
  convertComponentsToSectionSlots: vi.fn(() => ({
    l: { componentId: null, damageDealt: 0 },
    m: { componentId: null, damageDealt: 0 },
    r: { componentId: null, damageDealt: 0 },
  })),
}));

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

// --- Mock GSM Factory ---

function createMockGSM(stateOverrides = {}) {
  const state = {
    singlePlayerProfile: { highestUnlockedSlot: 1, credits: 1000, defaultShipSlotId: 0 },
    singlePlayerShipSlots: [
      {
        id: 0, status: 'active', decklist: [], droneSlots: [
          { slotIndex: 0, slotDamaged: false, assignedDrone: null },
        ], sectionSlots: {
          l: { componentId: 'comp1', damageDealt: 0 },
          m: { componentId: 'comp2', damageDealt: 0 },
          r: { componentId: 'comp3', damageDealt: 0 },
        }
      },
      {
        id: 1, status: 'active', decklist: [{ id: 'card1', quantity: 2 }], droneSlots: [
          { slotIndex: 0, slotDamaged: true, assignedDrone: 'TestDrone' },
          { slotIndex: 1, slotDamaged: false, assignedDrone: null },
        ], sectionSlots: {
          l: { componentId: 'comp1', damageDealt: 3 },
          m: { componentId: 'comp2', damageDealt: 0 },
          r: { componentId: 'comp3', damageDealt: 5 },
        }
      },
      { id: 2, status: 'locked', decklist: [], droneSlots: [], sectionSlots: {} },
    ],
    singlePlayerInventory: {},
    ...stateOverrides,
  };
  return {
    state,
    setState: vi.fn((updates) => Object.assign(state, updates)),
  };
}

// --- Tests ---

describe('ShipSlotManager', () => {
  let gsm, manager;

  beforeEach(() => {
    gsm = createMockGSM();
    manager = new ShipSlotManager(gsm);
  });

  // --- Slot Unlocking ---

  describe('slot unlocking', () => {
    it('unlockNextDeckSlot deducts credits and increments highestUnlockedSlot', () => {
      const result = manager.unlockNextDeckSlot();
      expect(result).toEqual({ success: true, slotId: 2 });
      expect(gsm.state.singlePlayerProfile.credits).toBe(500); // 1000 - 500
      expect(gsm.state.singlePlayerProfile.highestUnlockedSlot).toBe(2);
    });

    it('unlockNextDeckSlot fails on insufficient credits', () => {
      gsm.state.singlePlayerProfile.credits = 10;
      const result = manager.unlockNextDeckSlot();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Insufficient credits/);
    });

    it('unlockNextDeckSlot fails when all slots unlocked', () => {
      gsm.state.singlePlayerProfile.highestUnlockedSlot = 5;
      const result = manager.unlockNextDeckSlot();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already unlocked/);
    });

    it('isSlotUnlocked respects highestUnlockedSlot boundary', () => {
      expect(manager.isSlotUnlocked(0)).toBe(true);
      expect(manager.isSlotUnlocked(1)).toBe(true);
      expect(manager.isSlotUnlocked(2)).toBe(false);
    });

    it('getNextUnlockableSlot returns correct slot and cost, or null when all unlocked', () => {
      expect(manager.getNextUnlockableSlot()).toEqual({ slotId: 2, cost: 500 });
      gsm.state.singlePlayerProfile.highestUnlockedSlot = 5;
      expect(manager.getNextUnlockableSlot()).toBeNull();
    });
  });

  // --- Ship Assignment ---

  describe('assignShipToSlot', () => {
    it('consumes ship from inventory and assigns to empty slot', () => {
      gsm.state.singlePlayerInventory = { SHIP_002: 2 };
      // Slot 1 needs to be empty for assignment
      gsm.state.singlePlayerShipSlots[1] = {
        ...gsm.state.singlePlayerShipSlots[1],
        status: 'empty',
        shipId: null,
      };

      const result = manager.assignShipToSlot(1, 'SHIP_002');
      expect(result).toEqual({ success: true });
      expect(gsm.state.singlePlayerInventory.SHIP_002).toBe(1);
      expect(gsm.state.singlePlayerShipSlots.find(s => s.id === 1).shipId).toBe('SHIP_002');
      expect(gsm.state.singlePlayerShipSlots.find(s => s.id === 1).status).toBe('active');
    });

    it('removes inventory key when count reaches 0', () => {
      gsm.state.singlePlayerInventory = { SHIP_002: 1 };
      gsm.state.singlePlayerShipSlots[1] = {
        ...gsm.state.singlePlayerShipSlots[1],
        status: 'empty',
        shipId: null,
      };

      manager.assignShipToSlot(1, 'SHIP_002');
      expect(gsm.state.singlePlayerInventory.SHIP_002).toBeUndefined();
    });

    it('fails if ship not in inventory', () => {
      gsm.state.singlePlayerShipSlots[1] = {
        ...gsm.state.singlePlayerShipSlots[1],
        status: 'empty',
        shipId: null,
      };

      const result = manager.assignShipToSlot(1, 'SHIP_999');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No SHIP_999 available/);
    });

    it('fails on slot 0', () => {
      const result = manager.assignShipToSlot(0, 'SHIP_002');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Slot 0/);
    });

    it('fails if slot already has a ship (active)', () => {
      // Slot 1 is active by default in mock
      const result = manager.assignShipToSlot(1, 'SHIP_002');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already has a ship/);
    });

    it('fails if slot is locked', () => {
      const result = manager.assignShipToSlot(2, 'SHIP_002');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/locked/);
    });
  });

  // --- Slot CRUD ---

  describe('slot CRUD', () => {
    it('saveShipSlotDeck saves deck data and sets status to active', () => {
      const deckData = {
        name: 'My Deck',
        decklist: [{ id: 'card1', quantity: 3 }],
        droneSlots: [{ slotIndex: 0, slotDamaged: false, assignedDrone: 'DroneA' }],
        drones: ['DroneA'],
        shipComponents: { comp1: 'l' },
      };
      manager.saveShipSlotDeck(1, deckData);
      const savedSlot = gsm.state.singlePlayerShipSlots.find(s => s.id === 1);
      expect(savedSlot.status).toBe('active');
      expect(savedSlot.name).toBe('My Deck');
      expect(savedSlot.decklist).toEqual(deckData.decklist);
    });

    it('deleteShipSlotDeck resets slot and returns ship to inventory', () => {
      // Set up slot with a ship
      gsm.state.singlePlayerShipSlots[1].shipId = 'SHIP_TEST';
      gsm.state.singlePlayerInventory = {};

      manager.deleteShipSlotDeck(1);
      const slot = gsm.state.singlePlayerShipSlots.find(s => s.id === 1);
      expect(slot.status).toBe('empty');
      expect(slot.decklist).toEqual([]);
      // Ship should be returned to inventory
      expect(gsm.state.singlePlayerInventory.SHIP_TEST).toBe(1);
    });

    it('deleteShipSlotDeck does not modify inventory when slot has no ship', () => {
      gsm.state.singlePlayerShipSlots[1].shipId = null;
      gsm.state.singlePlayerInventory = {};

      manager.deleteShipSlotDeck(1);
      expect(gsm.state.singlePlayerInventory).toEqual({});
    });

    it('deleteShipSlotDeck resets defaultShipSlotId to 0 when deleting the default slot', () => {
      gsm.state.singlePlayerProfile.defaultShipSlotId = 1;
      manager.deleteShipSlotDeck(1);
      expect(gsm.state.singlePlayerProfile.defaultShipSlotId).toBe(0);
    });

    it('saveShipSlotDeck and deleteShipSlotDeck both throw on slot 0', () => {
      expect(() => manager.saveShipSlotDeck(0, {})).toThrow(/Slot 0/);
      expect(() => manager.deleteShipSlotDeck(0)).toThrow(/Slot 0/);
    });
  });

  // --- Repair Operations ---

  describe('repair operations', () => {
    it('repairSectionSlot full repair sets damageDealt to 0 and deducts correct cost', () => {
      const result = manager.repairSectionSlot(1, 'l');
      expect(result.success).toBe(true);
      // 3 damage * 10 credits = 30
      expect(gsm.state.singlePlayerProfile.credits).toBe(970);
      const slot = gsm.state.singlePlayerShipSlots.find(s => s.id === 1);
      expect(slot.sectionSlots.l.damageDealt).toBe(0);
    });

    it('repairSectionSlotPartial caps repair at actual damage and returns remaining', () => {
      const result = manager.repairSectionSlotPartial(1, 'l', 10);
      expect(result.success).toBe(true);
      expect(result.repairedHP).toBe(3);
      expect(result.remainingDamage).toBe(0);
      expect(result.cost).toBe(30);
    });

    it('repairSectionSlotPartial repairs partial amount when requested less than damage', () => {
      const result = manager.repairSectionSlotPartial(1, 'r', 2);
      expect(result.success).toBe(true);
      expect(result.repairedHP).toBe(2);
      expect(result.remainingDamage).toBe(3);
    });

    it('all repair methods refuse slot 0', () => {
      const methods = [
        () => manager.repairSectionSlot(0, 'l'),
        () => manager.repairSectionSlotPartial(0, 'l', 1),
      ];
      for (const method of methods) {
        const result = method();
        expect(result.success).toBe(false);
        expect(result.reason).toMatch(/Slot 0/);
      }
    });

    it('repair methods fail on undamaged targets', () => {
      const results = [
        manager.repairSectionSlot(1, 'm'),
      ];
      for (const result of results) {
        expect(result.success).toBe(false);
        expect(result.reason).toMatch(/not damaged/);
      }
    });
  });

  // --- Edge Cases ---

  describe('edge cases', () => {
    it('setDefaultShipSlot throws on invalid or inactive slot', () => {
      expect(() => manager.setDefaultShipSlot(-1)).toThrow(/Invalid slot ID/);
      expect(() => manager.setDefaultShipSlot(6)).toThrow(/Invalid slot ID/);
      expect(() => manager.setDefaultShipSlot(2)).toThrow(/not active/);
    });

    it('setDefaultShipSlot updates profile for valid active slot', () => {
      manager.setDefaultShipSlot(1);
      expect(gsm.state.singlePlayerProfile.defaultShipSlotId).toBe(1);
    });
  });
});
