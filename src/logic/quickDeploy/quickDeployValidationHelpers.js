/**
 * quickDeployValidationHelpers.js
 * Pure business logic for validating quick deployments against ship slots
 *
 * Extracted from QuickDeployManager.jsx — builds mock player states
 * and validates deployments without any React dependencies.
 */

import { shipComponentCollection } from '../../data/shipSectionData.js';
import { getAllShips } from '../../data/shipData.js';
import { calculateSectionBaseStats } from '../statsCalculator.js';
import { calculateTotalCost, validateAgainstDeck } from './QuickDeployValidator.js';

/**
 * Validate a single quick deployment against all active ship slots
 * @param {Object} deployment - Quick deployment template
 * @param {Array} shipSlots - Array of ship slot objects
 * @returns {{validFor: string[], invalidFor: Array<{name: string, reasons: string[]}>, cost: number}}
 */
export const validateDeploymentAgainstSlots = (deployment, shipSlots) => {
  const validFor = [];
  const invalidFor = [];

  shipSlots.forEach(slot => {
    if (slot.status !== 'active' || !slot.droneSlots || slot.droneSlots.filter(s => s.assignedDrone).length === 0) return;

    // Get ship card for stats calculation
    const shipCard = getAllShips().find(s => s.id === slot.shipId);
    if (!shipCard) return;

    // Convert shipComponents { sectionId: lane } to ordered array [left, middle, right]
    const shipComponentsObj = slot.shipComponents || {};
    const laneOrder = { 'l': 0, 'm': 1, 'r': 2 };
    const placedSections = Object.entries(shipComponentsObj)
      .sort((a, b) => laneOrder[a[1]] - laneOrder[b[1]])
      .map(([sectionId]) => sectionId);

    // Build proper ship sections with hull/thresholds
    const shipSections = {};
    for (const sectionId of placedSections) {
      const sectionTemplate = shipComponentCollection.find(c => c.id === sectionId);
      if (sectionTemplate) {
        const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
        shipSections[sectionId] = {
          ...JSON.parse(JSON.stringify(sectionTemplate)),
          hull: baseStats.hull,
          maxHull: baseStats.maxHull,
          thresholds: baseStats.thresholds,
        };
      }
    }

    const mockPlayerState = { shipSections };
    const result = validateAgainstDeck(deployment, slot, mockPlayerState, placedSections);

    if (result.valid) {
      validFor.push(slot.name || `Slot ${slot.id}`);
    } else {
      invalidFor.push({
        name: slot.name || `Slot ${slot.id}`,
        reasons: result.reasons,
      });
    }
  });

  return {
    validFor,
    invalidFor,
    cost: calculateTotalCost(deployment.placements),
  };
};

/**
 * Validate all quick deployments against all active ship slots
 * @param {Array} quickDeployments - Array of quick deployment templates
 * @param {Array} shipSlots - Array of ship slot objects
 * @returns {Array} Deployments enriched with validFor, invalidFor, and cost
 */
export const validateAllDeployments = (quickDeployments, shipSlots) => {
  return quickDeployments.map(qd => ({
    ...qd,
    ...validateDeploymentAgainstSlots(qd, shipSlots),
  }));
};
