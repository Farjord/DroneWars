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
   * @returns {Array} Array of { shipSlotId, droneIndex, droneSlot, repairCost }
   */
  getDamagedDrones() {
    const slots = gameStateManager.getState().singlePlayerShipSlots || [];
    const damaged = [];

    slots.forEach(slot => {
      if (slot.status !== 'active' || !slot.droneSlots) return;

      slot.droneSlots.forEach((droneSlot, index) => {
        if (droneSlot.slotDamaged && droneSlot.assignedDrone) {
          damaged.push({
            shipSlotId: slot.id,
            droneIndex: index,
            droneSlot,
            repairCost: this.getDroneRepairCost(droneSlot.assignedDrone)
          });
        }
      });
    });

    return damaged;
  }

  /**
   * Repair a single drone slot in a ship slot
   * @param {number} shipSlotId - Ship slot ID
   * @param {number} droneIndex - Index of drone in slot's droneSlots array
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

    const droneSlot = slot.droneSlots?.[droneIndex];
    if (!droneSlot) {
      return { success: false, error: 'Drone slot not found' };
    }

    if (!droneSlot.slotDamaged) {
      return { success: false, error: 'Drone slot is not damaged' };
    }

    const droneName = droneSlot.assignedDrone || 'Unknown';
    const repairCost = this.getDroneRepairCost(droneName);

    // Deduct credits via CreditManager
    const deductResult = creditManager.deduct(repairCost, `Drone slot repair: ${droneName}`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Repair the drone slot
    droneSlot.slotDamaged = false;

    // Update state
    gameStateManager.setState({
      singlePlayerShipSlots: [...state.singlePlayerShipSlots]
    });

    debugLog('REPAIR', `Repaired drone slot ${droneIndex} (${droneName}) in ship slot ${shipSlotId} for ${repairCost} credits`);

    return { success: true, cost: repairCost };
  }

  /**
   * Repair all damaged drone slots in a ship slot
   * @param {number} shipSlotId - Ship slot ID
   * @returns {{ success: boolean, error?: string, cost?: number, count?: number }}
   */
  repairAllDronesInSlot(shipSlotId) {
    const state = gameStateManager.getState();
    const slot = state.singlePlayerShipSlots?.find(s => s.id === shipSlotId);

    if (!slot || slot.status !== 'active' || !slot.droneSlots) {
      return { success: false, error: 'Invalid ship slot' };
    }

    const damagedSlots = slot.droneSlots
      .map((droneSlot, index) => ({ droneSlot, index }))
      .filter(({ droneSlot }) => droneSlot.slotDamaged);

    if (damagedSlots.length === 0) {
      return { success: false, error: 'No damaged drone slots in this ship' };
    }

    const totalCost = damagedSlots.reduce(
      (sum, { droneSlot }) => sum + this.getDroneRepairCost(droneSlot.assignedDrone || 'Unknown'),
      0
    );

    // Deduct credits via CreditManager
    const deductResult = creditManager.deduct(totalCost, `Repair all drone slots in ship ${shipSlotId}`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Repair all drone slots
    damagedSlots.forEach(({ index }) => {
      slot.droneSlots[index].slotDamaged = false;
    });

    // Update state
    gameStateManager.setState({
      singlePlayerShipSlots: [...state.singlePlayerShipSlots]
    });

    debugLog('REPAIR', `Repaired ${damagedSlots.length} drone slots in ship ${shipSlotId} for ${totalCost} credits`);

    return { success: true, cost: totalCost, count: damagedSlots.length };
  }
}

export default new RepairService();
