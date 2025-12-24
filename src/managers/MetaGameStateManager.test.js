/**
 * MetaGameStateManager Tests
 * TDD tests for the meta-game state manager
 *
 * This manager handles persistent player data:
 * - Player profile (credits, AI cores)
 * - Card inventory
 * - Drone instances with damage tracking
 * - Ship component instances with hull tracking
 * - Ship slots (6 slots)
 * - Quick deployments
 * - Reputation and missions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaGameStateManager } from './MetaGameStateManager.js';

describe('MetaGameStateManager', () => {
  let manager;

  beforeEach(() => {
    manager = new MetaGameStateManager();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = manager.getState();
      expect(state).not.toBeNull();
      expect(state.credits).toBe(0);
      expect(state.aiCores).toBe(0);
    });

    it('should have empty inventory initially', () => {
      const state = manager.getState();
      expect(state.cardInventory).toEqual({});
      expect(state.droneInstances).toEqual([]);
      expect(state.shipComponentInstances).toEqual([]);
    });

    it('should have 6 ship slots initialized', () => {
      const state = manager.getState();
      expect(state.shipSlots).toHaveLength(6);
    });

    it('should have slot 0 as starter deck slot', () => {
      const state = manager.getState();
      expect(state.shipSlots[0].id).toBe(0);
      expect(state.shipSlots[0].isStarterDeck).toBe(true);
    });
  });

  describe('loadFromSave', () => {
    it('should load state from save game data', () => {
      const saveData = {
        credits: 1000,
        aiCores: 50,
        cardInventory: { laser_mk1: 3, shield_mk2: 2 },
        droneInstances: [{ id: 'drone1', damage: 0 }],
        shipComponentInstances: [{ id: 'comp1', hull: 10 }],
        shipSlots: Array(6).fill(null).map((_, i) => ({
          id: i,
          isStarterDeck: i === 0,
          deck: []
        })),
        quickDeployments: [],
        factionReputation: { pirates: 10 },
        activeMissions: [],
        completedMissions: [],
        discoveredCards: []
      };

      manager.loadFromSave(saveData);

      const state = manager.getState();
      expect(state.credits).toBe(1000);
      expect(state.aiCores).toBe(50);
      expect(state.cardInventory.laser_mk1).toBe(3);
    });

    it('should notify subscribers when loading from save', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.loadFromSave({
        credits: 500,
        aiCores: 25,
        cardInventory: {},
        droneInstances: [],
        shipComponentInstances: [],
        shipSlots: Array(6).fill(null).map((_, i) => ({ id: i, isStarterDeck: i === 0, deck: [] })),
        quickDeployments: [],
        factionReputation: {},
        activeMissions: [],
        completedMissions: [],
        discoveredCards: []
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('setState', () => {
    it('should update state with partial updates', () => {
      manager.setState({ credits: 500 });
      expect(manager.getState().credits).toBe(500);
    });

    it('should not overwrite other fields when updating', () => {
      manager.setState({ credits: 500 });
      manager.setState({ aiCores: 100 });

      const state = manager.getState();
      expect(state.credits).toBe(500);
      expect(state.aiCores).toBe(100);
    });

    it('should notify subscribers on state change', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.setState({ credits: 250 });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      manager.setState({ credits: 100 });
      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();
      unsubscribe();

      manager.setState({ credits: 200 });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('credits management', () => {
    it('should add credits', () => {
      manager.addCredits(500);
      expect(manager.getState().credits).toBe(500);

      manager.addCredits(250);
      expect(manager.getState().credits).toBe(750);
    });

    it('should spend credits when sufficient', () => {
      manager.addCredits(1000);
      const success = manager.spendCredits(400);

      expect(success).toBe(true);
      expect(manager.getState().credits).toBe(600);
    });

    it('should not spend credits when insufficient', () => {
      manager.addCredits(100);
      const success = manager.spendCredits(500);

      expect(success).toBe(false);
      expect(manager.getState().credits).toBe(100);
    });

    it('should return false for negative credit amounts', () => {
      const success = manager.addCredits(-100);
      expect(success).toBe(false);
    });
  });

  describe('AI cores management', () => {
    it('should add AI cores', () => {
      manager.addAICores(10);
      expect(manager.getState().aiCores).toBe(10);

      manager.addAICores(5);
      expect(manager.getState().aiCores).toBe(15);
    });

    it('should spend AI cores when sufficient', () => {
      manager.addAICores(20);
      const success = manager.spendAICores(8);

      expect(success).toBe(true);
      expect(manager.getState().aiCores).toBe(12);
    });

    it('should not spend AI cores when insufficient', () => {
      manager.addAICores(5);
      const success = manager.spendAICores(10);

      expect(success).toBe(false);
      expect(manager.getState().aiCores).toBe(5);
    });
  });

  describe('card inventory', () => {
    it('should add cards to inventory', () => {
      manager.addCard('laser_mk1');
      manager.addCard('laser_mk1');
      manager.addCard('shield_mk2');

      const inventory = manager.getState().cardInventory;
      expect(inventory.laser_mk1).toBe(2);
      expect(inventory.shield_mk2).toBe(1);
    });

    it('should add multiple cards at once', () => {
      manager.addCards(['laser_mk1', 'laser_mk1', 'repair_drone']);

      const inventory = manager.getState().cardInventory;
      expect(inventory.laser_mk1).toBe(2);
      expect(inventory.repair_drone).toBe(1);
    });

    it('should remove cards from inventory', () => {
      manager.addCard('laser_mk1');
      manager.addCard('laser_mk1');

      manager.removeCard('laser_mk1');

      expect(manager.getState().cardInventory.laser_mk1).toBe(1);
    });

    it('should not go below 0 when removing cards', () => {
      manager.addCard('laser_mk1');
      manager.removeCard('laser_mk1');
      manager.removeCard('laser_mk1'); // Try to remove again

      const count = manager.getState().cardInventory.laser_mk1;
      expect(count).toBe(0);
    });

    it('should return card count', () => {
      manager.addCard('laser_mk1');
      manager.addCard('laser_mk1');

      expect(manager.getCardCount('laser_mk1')).toBe(2);
      expect(manager.getCardCount('nonexistent_card')).toBe(0);
    });
  });

  describe('ship slots', () => {
    it('should get ship slot by ID', () => {
      const slot = manager.getShipSlot(0);
      expect(slot).not.toBeNull();
      expect(slot.id).toBe(0);
    });

    it('should update ship slot deck', () => {
      manager.updateShipSlot(1, { deck: ['card1', 'card2'] });

      const slot = manager.getShipSlot(1);
      expect(slot.deck).toEqual(['card1', 'card2']);
    });

    it('should not update non-existent slot', () => {
      const success = manager.updateShipSlot(99, { deck: ['card1'] });
      expect(success).toBe(false);
    });
  });

  describe('quick deployments', () => {
    it('should add quick deployment', () => {
      manager.addQuickDeployment({
        id: 'qd1',
        name: 'Aggressive Start',
        cards: ['laser_mk1', 'assault_drone']
      });

      const deployments = manager.getState().quickDeployments;
      expect(deployments).toHaveLength(1);
      expect(deployments[0].name).toBe('Aggressive Start');
    });

    it('should limit quick deployments to 5', () => {
      for (let i = 0; i < 7; i++) {
        manager.addQuickDeployment({ id: `qd${i}`, name: `Deploy ${i}`, cards: [] });
      }

      expect(manager.getState().quickDeployments).toHaveLength(5);
    });

    it('should remove quick deployment', () => {
      manager.addQuickDeployment({ id: 'qd1', name: 'Deploy 1', cards: [] });
      manager.addQuickDeployment({ id: 'qd2', name: 'Deploy 2', cards: [] });

      manager.removeQuickDeployment('qd1');

      const deployments = manager.getState().quickDeployments;
      expect(deployments).toHaveLength(1);
      expect(deployments[0].id).toBe('qd2');
    });
  });

  describe('drone instances', () => {
    it('should add drone instance', () => {
      manager.addDroneInstance({
        id: 'drone_scout_1',
        droneId: 'scout_drone',
        currentHealth: 5,
        maxHealth: 5,
        damage: 0
      });

      const instances = manager.getState().droneInstances;
      expect(instances).toHaveLength(1);
      expect(instances[0].droneId).toBe('scout_drone');
    });

    it('should update drone instance damage', () => {
      manager.addDroneInstance({
        id: 'drone_scout_1',
        droneId: 'scout_drone',
        currentHealth: 5,
        maxHealth: 5,
        damage: 0
      });

      manager.updateDroneInstance('drone_scout_1', { damage: 2, currentHealth: 3 });

      const instance = manager.getState().droneInstances.find(d => d.id === 'drone_scout_1');
      expect(instance.damage).toBe(2);
      expect(instance.currentHealth).toBe(3);
    });
  });

  describe('ship component instances', () => {
    it('should add ship component instance', () => {
      manager.addShipComponentInstance({
        id: 'bridge_1',
        componentId: 'bridge_mk1',
        currentHull: 10,
        maxHull: 10
      });

      const instances = manager.getState().shipComponentInstances;
      expect(instances).toHaveLength(1);
      expect(instances[0].componentId).toBe('bridge_mk1');
    });

    it('should update ship component hull', () => {
      manager.addShipComponentInstance({
        id: 'bridge_1',
        componentId: 'bridge_mk1',
        currentHull: 10,
        maxHull: 10
      });

      manager.updateShipComponentInstance('bridge_1', { currentHull: 7 });

      const instance = manager.getState().shipComponentInstances.find(c => c.id === 'bridge_1');
      expect(instance.currentHull).toBe(7);
    });
  });

  describe('reputation', () => {
    it('should update faction reputation', () => {
      manager.updateReputation('pirates', 10);
      expect(manager.getState().factionReputation.pirates).toBe(10);

      manager.updateReputation('pirates', 5);
      expect(manager.getState().factionReputation.pirates).toBe(15);
    });

    it('should get faction reputation', () => {
      manager.updateReputation('traders', 25);
      expect(manager.getReputation('traders')).toBe(25);
      expect(manager.getReputation('unknown_faction')).toBe(0);
    });
  });

  describe('getSaveData', () => {
    it('should return data suitable for saving', () => {
      manager.addCredits(1000);
      manager.addAICores(50);
      manager.addCard('laser_mk1');

      const saveData = manager.getSaveData();

      expect(saveData.credits).toBe(1000);
      expect(saveData.aiCores).toBe(50);
      expect(saveData.cardInventory.laser_mk1).toBe(1);
      expect(saveData.shipSlots).toHaveLength(6);
    });
  });

  describe('reset', () => {
    it('should reset to default state', () => {
      manager.addCredits(1000);
      manager.addAICores(50);
      manager.addCard('laser_mk1');

      manager.reset();

      const state = manager.getState();
      expect(state.credits).toBe(0);
      expect(state.aiCores).toBe(0);
      expect(state.cardInventory).toEqual({});
    });

    it('should notify subscribers on reset', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      listener.mockClear();

      manager.reset();

      expect(listener).toHaveBeenCalled();
    });
  });
});
