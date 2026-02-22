import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShipSlotManager from '../ShipSlotManager.js';

// --- Mocks ---

vi.mock('../../data/economyData.js', () => ({
  ECONOMY: {
    DECK_SLOT_UNLOCK_COSTS: { 2: 500, 3: 1000, 4: 2000, 5: 5000 },
    DRONE_SLOT_REPAIR_COST: 50,
    SECTION_DAMAGE_REPAIR_COST: 10,
  }
}));

vi.mock('../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    { id: 'comp1', name: 'Test Bridge', type: 'Bridge', hull: 8, maxHull: 8 },
  ]
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
    singlePlayerDroneInstances: [],
    singlePlayerShipComponentInstances: [],
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

  // --- Slot CRUD ---

  describe('slot CRUD', () => {
    it('saveShipSlotDeck saves deck data and sets status to active', () => {
      const deckData = {
        name: 'My Deck',
        decklist: [{ id: 'card1', quantity: 3 }],
        droneSlots: [{ slotIndex: 0, slotDamaged: false, assignedDrone: 'DroneA' }],
        drones: ['DroneA'],
        shipComponents: { comp1: 'l' },
        shipId: 'ship_1',
      };
      manager.saveShipSlotDeck(1, deckData);
      const savedSlot = gsm.state.singlePlayerShipSlots.find(s => s.id === 1);
      expect(savedSlot.status).toBe('active');
      expect(savedSlot.name).toBe('My Deck');
      expect(savedSlot.decklist).toEqual(deckData.decklist);
    });

    it('deleteShipSlotDeck returns non-starter cards to inventory and resets slot', () => {
      manager.deleteShipSlotDeck(1);
      const slot = gsm.state.singlePlayerShipSlots.find(s => s.id === 1);
      expect(slot.status).toBe('empty');
      expect(slot.decklist).toEqual([]);
      // card1 is not a starter card, so 2 copies should return to inventory
      expect(gsm.state.singlePlayerInventory.card1).toBe(2);
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
    it('repairDroneSlot deducts credits and clears damage on a damaged slot', () => {
      const result = manager.repairDroneSlot(1, 0);
      expect(result.success).toBe(true);
      expect(gsm.state.singlePlayerProfile.credits).toBe(950); // 1000 - 50
      const repairedSlot = gsm.state.singlePlayerShipSlots.find(s => s.id === 1);
      expect(repairedSlot.droneSlots[0].slotDamaged).toBe(false);
    });

    it('repairSectionSlot full repair sets damageDealt to 0 and deducts correct cost', () => {
      const result = manager.repairSectionSlot(1, 'l');
      expect(result.success).toBe(true);
      // 3 damage * 10 credits = 30
      expect(gsm.state.singlePlayerProfile.credits).toBe(970);
      const slot = gsm.state.singlePlayerShipSlots.find(s => s.id === 1);
      expect(slot.sectionSlots.l.damageDealt).toBe(0);
    });

    it('repairSectionSlotPartial caps repair at actual damage and returns remaining', () => {
      // Lane 'l' has 3 damage, request 10 HP repair — should cap at 3
      const result = manager.repairSectionSlotPartial(1, 'l', 10);
      expect(result.success).toBe(true);
      expect(result.repairedHP).toBe(3);
      expect(result.remainingDamage).toBe(0);
      expect(result.cost).toBe(30); // 3 * 10
    });

    it('repairSectionSlotPartial repairs partial amount when requested less than damage', () => {
      // Lane 'r' has 5 damage, repair only 2
      const result = manager.repairSectionSlotPartial(1, 'r', 2);
      expect(result.success).toBe(true);
      expect(result.repairedHP).toBe(2);
      expect(result.remainingDamage).toBe(3);
    });

    it('all repair methods refuse slot 0', () => {
      const methods = [
        () => manager.repairDroneSlot(0, 0),
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
        manager.repairDroneSlot(1, 1),       // slot 1, position 1 is not damaged
        manager.repairSectionSlot(1, 'm'),    // lane 'm' has 0 damage
      ];
      for (const result of results) {
        expect(result.success).toBe(false);
        expect(result.reason).toMatch(/not damaged/);
      }
    });
  });

  // --- Instance Management ---

  describe('instance management', () => {
    it('createDroneInstance returns instanceId for non-starter drones, null for starter', () => {
      const id = manager.createDroneInstance('CustomDrone', 1);
      expect(id).toMatch(/^DRONE_/);
      expect(gsm.state.singlePlayerDroneInstances).toHaveLength(1);

      const starterId = manager.createDroneInstance('Starter Drone', 1);
      expect(starterId).toBeNull();
    });

    it('getDroneDamageStateForSlot returns {} for slot 0, damage map for others', () => {
      expect(manager.getDroneDamageStateForSlot(0)).toEqual({});

      // Add a drone instance for slot 1
      gsm.state.singlePlayerDroneInstances = [
        { instanceId: 'DRONE_1', droneName: 'Alpha', shipSlotId: 1, isDamaged: true },
        { instanceId: 'DRONE_2', droneName: 'Beta', shipSlotId: 1, isDamaged: false },
        { instanceId: 'DRONE_3', droneName: 'Gamma', shipSlotId: 2, isDamaged: true },
      ];
      const state = manager.getDroneDamageStateForSlot(1);
      expect(state).toEqual({ Alpha: true, Beta: false });
    });

    it('createComponentInstance returns instanceId for non-starter, throws for unknown', () => {
      const id = manager.createComponentInstance('comp1', 1);
      expect(id).toMatch(/^COMP_/);
      expect(gsm.state.singlePlayerShipComponentInstances).toHaveLength(1);

      const starterId = manager.createComponentInstance('starter_card_1', 1);
      expect(starterId).toBeNull();

      expect(() => manager.createComponentInstance('nonexistent', 1)).toThrow(/not found/);
    });

    it('updateDroneInstance updates damage state for existing instance', () => {
      gsm.state.singlePlayerDroneInstances = [
        { instanceId: 'DRONE_1', droneName: 'Alpha', shipSlotId: 1, isDamaged: false },
      ];
      manager.updateDroneInstance('DRONE_1', true);
      expect(gsm.state.singlePlayerDroneInstances[0].isDamaged).toBe(true);
    });

    it('findDroneInstance returns matching instance or null', () => {
      gsm.state.singlePlayerDroneInstances = [
        { instanceId: 'DRONE_1', droneName: 'Alpha', shipSlotId: 1, isDamaged: false },
      ];
      expect(manager.findDroneInstance(1, 'Alpha')).toBeTruthy();
      expect(manager.findDroneInstance(1, 'Beta')).toBeNull();
      expect(manager.findDroneInstance(2, 'Alpha')).toBeNull();
    });
  });

  // --- Edge Cases ---

  describe('edge cases', () => {
    it('setDefaultShipSlot throws on invalid or inactive slot', () => {
      expect(() => manager.setDefaultShipSlot(-1)).toThrow(/Invalid slot ID/);
      expect(() => manager.setDefaultShipSlot(6)).toThrow(/Invalid slot ID/);
      expect(() => manager.setDefaultShipSlot(2)).toThrow(/not active/); // status: 'locked'
    });

    it('setDefaultShipSlot updates profile for valid active slot', () => {
      manager.setDefaultShipSlot(1);
      expect(gsm.state.singlePlayerProfile.defaultShipSlotId).toBe(1);
    });

    it('clearSlotInstances removes only instances for the target slot', () => {
      gsm.state.singlePlayerDroneInstances = [
        { instanceId: 'D1', shipSlotId: 1 },
        { instanceId: 'D2', shipSlotId: 2 },
      ];
      gsm.state.singlePlayerShipComponentInstances = [
        { instanceId: 'C1', shipSlotId: 1 },
        { instanceId: 'C2', shipSlotId: 2 },
      ];
      manager.clearSlotInstances(1);
      expect(gsm.state.singlePlayerDroneInstances).toEqual([{ instanceId: 'D2', shipSlotId: 2 }]);
      expect(gsm.state.singlePlayerShipComponentInstances).toEqual([{ instanceId: 'C2', shipSlotId: 2 }]);
    });
  });
});
