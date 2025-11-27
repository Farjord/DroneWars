/**
 * RepairService.js
 * Handles ship component and drone repair operations
 * Uses CreditManager for transactions, economyData for costs
 */

import gameStateManager from '../../managers/GameStateManager.js';
import creditManager from './CreditManager.js';
import { ECONOMY } from '../../data/economyData.js';
import fullDroneCollection from '../../data/droneData.js';
import { debugLog } from '../../utils/debugLogger.js';

class RepairService {
  // ========================================
  // HULL REPAIR (Ship Components)
  // ========================================

  /**
   * Calculate hull repair cost for a ship component instance
   * @param {Object} instance - Ship component instance with currentHull/maxHull
   * @returns {number} Cost in credits
   */
  getHullRepairCost(instance) {
    if (!instance || instance.currentHull >= instance.maxHull) {
      return 0;
    }
    const hullToRepair = instance.maxHull - instance.currentHull;
    return hullToRepair * ECONOMY.HULL_REPAIR_COST_PER_HP;
  }

  /**
   * Get all damaged ship component instances
   * @returns {Array} Damaged component instances
   */
  getDamagedComponents() {
    const instances = gameStateManager.getState().singlePlayerShipComponentInstances || [];
    return instances.filter(inst => inst.currentHull < inst.maxHull);
  }

  /**
   * Calculate total repair cost for all damaged components
   * @returns {number} Total cost in credits
   */
  getTotalRepairCost() {
    const damaged = this.getDamagedComponents();
    return damaged.reduce((sum, inst) => sum + this.getHullRepairCost(inst), 0);
  }

  /**
   * Repair a single ship component
   * @param {string} instanceId - The instance ID to repair
   * @returns {{ success: boolean, error?: string, cost?: number }}
   */
  repairComponent(instanceId) {
    const instances = gameStateManager.getState().singlePlayerShipComponentInstances || [];
    const instance = instances.find(i => i.instanceId === instanceId);

    if (!instance) {
      return { success: false, error: 'Component not found' };
    }

    if (instance.currentHull >= instance.maxHull) {
      return { success: false, error: 'Component is not damaged' };
    }

    const repairCost = this.getHullRepairCost(instance);

    // Deduct credits via CreditManager
    const deductResult = creditManager.deduct(repairCost, `Hull repair: ${instance.componentId}`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Repair the component
    gameStateManager.updateShipComponentHull(instanceId, instance.maxHull);

    debugLog('REPAIR', `Repaired ${instance.componentId} for ${repairCost} credits`);

    return { success: true, cost: repairCost };
  }

  /**
   * Repair all damaged ship components
   * @returns {{ success: boolean, error?: string, cost?: number, count?: number }}
   */
  repairAllComponents() {
    const damaged = this.getDamagedComponents();

    if (damaged.length === 0) {
      return { success: false, error: 'No damaged components' };
    }

    const totalCost = this.getTotalRepairCost();

    // Deduct credits via CreditManager
    const deductResult = creditManager.deduct(totalCost, `Repair all components (${damaged.length})`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Repair all components
    damaged.forEach(inst => {
      gameStateManager.updateShipComponentHull(inst.instanceId, inst.maxHull);
    });

    debugLog('REPAIR', `Repaired ${damaged.length} components for ${totalCost} credits`);

    return { success: true, cost: totalCost, count: damaged.length };
  }

  // ========================================
  // DRONE REPAIR
  // ========================================

  /**
   * Get drone repair cost based on rarity
   * @param {string} droneName - Name of the drone
   * @returns {number} Cost in credits
   */
  getDroneRepairCost(droneName) {
    const droneData = fullDroneCollection.find(d => d.name === droneName);
    if (!droneData) {
      debugLog('REPAIR', `Drone not found: ${droneName}, using Common cost`);
      return ECONOMY.DRONE_REPAIR_COSTS.Common;
    }

    const rarity = droneData.rarity || 'Common';
    return ECONOMY.DRONE_REPAIR_COSTS[rarity] || ECONOMY.DRONE_REPAIR_COSTS.Common;
  }

  /**
   * Get all damaged drones across all ship slots
   * @returns {Array} Array of { shipSlotId, droneIndex, drone, repairCost }
   */
  getDamagedDrones() {
    const slots = gameStateManager.getState().singlePlayerShipSlots || [];
    const damaged = [];

    slots.forEach(slot => {
      if (slot.status !== 'active' || !slot.drones) return;

      slot.drones.forEach((drone, index) => {
        if (drone.isDamaged) {
          damaged.push({
            shipSlotId: slot.id,
            droneIndex: index,
            drone,
            repairCost: this.getDroneRepairCost(drone.name)
          });
        }
      });
    });

    return damaged;
  }

  /**
   * Repair a single drone in a ship slot
   * @param {number} shipSlotId - Ship slot ID
   * @param {number} droneIndex - Index of drone in slot's drones array
   * @returns {{ success: boolean, error?: string, cost?: number }}
   */
  repairDrone(shipSlotId, droneIndex) {
    const state = gameStateManager.getState();
    const slot = state.singlePlayerShipSlots?.find(s => s.id === shipSlotId);

    if (!slot) {
      return { success: false, error: 'Ship slot not found' };
    }

    if (slot.status !== 'active') {
      return { success: false, error: 'Ship slot is not active' };
    }

    const drone = slot.drones?.[droneIndex];
    if (!drone) {
      return { success: false, error: 'Drone not found' };
    }

    if (!drone.isDamaged) {
      return { success: false, error: 'Drone is not damaged' };
    }

    const repairCost = this.getDroneRepairCost(drone.name);

    // Deduct credits via CreditManager
    const deductResult = creditManager.deduct(repairCost, `Drone repair: ${drone.name}`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Repair the drone
    drone.isDamaged = false;

    // Update state
    gameStateManager.setState({
      singlePlayerShipSlots: [...state.singlePlayerShipSlots]
    });

    debugLog('REPAIR', `Repaired drone ${drone.name} in slot ${shipSlotId} for ${repairCost} credits`);

    return { success: true, cost: repairCost };
  }

  /**
   * Repair all damaged drones in a ship slot
   * @param {number} shipSlotId - Ship slot ID
   * @returns {{ success: boolean, error?: string, cost?: number, count?: number }}
   */
  repairAllDronesInSlot(shipSlotId) {
    const state = gameStateManager.getState();
    const slot = state.singlePlayerShipSlots?.find(s => s.id === shipSlotId);

    if (!slot || slot.status !== 'active' || !slot.drones) {
      return { success: false, error: 'Invalid ship slot' };
    }

    const damagedDrones = slot.drones
      .map((drone, index) => ({ drone, index }))
      .filter(({ drone }) => drone.isDamaged);

    if (damagedDrones.length === 0) {
      return { success: false, error: 'No damaged drones in this slot' };
    }

    const totalCost = damagedDrones.reduce(
      (sum, { drone }) => sum + this.getDroneRepairCost(drone.name),
      0
    );

    // Deduct credits via CreditManager
    const deductResult = creditManager.deduct(totalCost, `Repair all drones in slot ${shipSlotId}`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Repair all drones
    damagedDrones.forEach(({ index }) => {
      slot.drones[index].isDamaged = false;
    });

    // Update state
    gameStateManager.setState({
      singlePlayerShipSlots: [...state.singlePlayerShipSlots]
    });

    debugLog('REPAIR', `Repaired ${damagedDrones.length} drones in slot ${shipSlotId} for ${totalCost} credits`);

    return { success: true, cost: totalCost, count: damagedDrones.length };
  }
}

export default new RepairService();
