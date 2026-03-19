/**
 * RepairService.js
 * Handles ship section repair operations
 * Uses CreditManager for transactions, economyData for costs
 */

import gameStateManager from '../../managers/GameStateManager.js';
import creditManager from './CreditManager.js';
import { ECONOMY } from '../../data/economyData.js';
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

}

export default new RepairService();
