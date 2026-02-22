// Ship section builder — constructs section arrays with hull data for tactical map display
// Priority: run-state sections > persistent instances > base stats from ship card

import { shipComponentCollection } from '../../data/shipSectionData.js';
import { getAllShips, getDefaultShip } from '../../data/shipData.js';
import { calculateSectionBaseStats } from '../statsCalculator.js';

/**
 * Build ship sections array with hull data for each component
 * Priority order for hull values:
 * 1. currentRunState.shipSections (live run damage)
 * 2. singlePlayerShipComponentInstances (persistent slot damage)
 * 3. Base stats from ship card + section modifiers (fresh/default)
 *
 * Hull values are calculated using calculateSectionBaseStats() which combines:
 * - Ship's baseHull from shipData.js
 * - Section's hullModifier from shipSectionData.js
 * Thresholds also come from the ship's baseThresholds.
 */
export function buildShipSections(shipSlot, slotId, shipComponentInstances, runShipSections) {
  const sections = [];

  // If we have run-state ship sections, use those (contains live damage from combat)
  if (runShipSections && Object.keys(runShipSections).length > 0) {
    for (const [sectionType, sectionData] of Object.entries(runShipSections)) {
      sections.push({
        id: sectionData.id || sectionType,
        name: sectionData.name || sectionType,
        type: sectionData.type || sectionType,
        hull: sectionData.hull ?? 8,
        maxHull: sectionData.maxHull ?? 8,
        thresholds: sectionData.thresholds || { damaged: 4, critical: 0 },
        lane: sectionData.lane ?? 1
      });
    }
    return sections;
  }

  // Get ship card for proper hull/threshold calculation
  const shipCard = shipSlot?.shipId
    ? getAllShips().find(s => s.id === shipSlot.shipId)
    : getDefaultShip();

  // Fallback: build from ship slot components
  const componentEntries = Object.entries(shipSlot?.shipComponents || {});

  for (const [componentId, lane] of componentEntries) {
    const componentData = shipComponentCollection.find(c => c.id === componentId);
    if (!componentData) continue;

    const baseStats = calculateSectionBaseStats(shipCard, componentData);
    let currentHull = baseStats.hull;
    let maxHull = baseStats.maxHull;
    let thresholds = baseStats.thresholds;

    // For slots 1-5, check instances for persistent damage
    if (slotId !== 0) {
      const instance = shipComponentInstances?.find(
        i => i.id === componentId && i.assignedToSlot === slotId
      );
      if (instance) {
        currentHull = instance.currentHull;
        maxHull = instance.maxHull;
      }
    }

    sections.push({
      id: componentId,
      name: componentData.name,
      type: componentData.type,
      hull: currentHull,
      maxHull: maxHull,
      thresholds: thresholds,
      lane: lane
    });
  }

  return sections;
}
