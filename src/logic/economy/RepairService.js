/**
 * RepairService.js
 * Handles ship section repair operations
 *
 * Section damage is tracked at the slot level (sectionSlots[lane].damageDealt)
 * and repaired via ShipSlotManager.repairSectionSlot() / repairSectionSlotPartial().
 * This service is a thin facade kept for backward compatibility.
 */

class RepairService {
  // Section repair is handled by ShipSlotManager.repairSectionSlot()
  // and ShipSlotManager.repairSectionSlotPartial() — no instance-level
  // hull repair is needed since Phase B removed component instances.
}

export default new RepairService();
