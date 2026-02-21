/**
 * Save Game Validator
 * Validates save file structure and data integrity
 */

import { SAVE_VERSION } from '../../data/saveGameSchema.js';

/**
 * Validate save file structure
 * @param {Object} saveData - Save data to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateSaveFile(saveData) {
  const errors = [];

  // Check required fields
  if (!saveData.saveVersion) errors.push('Missing saveVersion');
  if (!saveData.playerProfile) errors.push('Missing playerProfile');
  if (!saveData.inventory) errors.push('Missing inventory');
  if (!saveData.droneInstances) errors.push('Missing droneInstances');
  if (!saveData.shipComponentInstances) errors.push('Missing shipComponentInstances');
  if (!saveData.discoveredCards) errors.push('Missing discoveredCards');
  if (!saveData.shipSlots) errors.push('Missing shipSlots');

  // Check version compatibility
  if (saveData.saveVersion !== SAVE_VERSION) {
    errors.push(`Incompatible version: ${saveData.saveVersion} (expected ${SAVE_VERSION})`);
  }

  // Check player profile fields
  if (saveData.playerProfile) {
    if (typeof saveData.playerProfile.gameSeed !== 'number') {
      errors.push('playerProfile.gameSeed must be a number');
    }
    // Validate highestUnlockedSlot if present
    if (saveData.playerProfile.highestUnlockedSlot !== undefined) {
      if (typeof saveData.playerProfile.highestUnlockedSlot !== 'number' ||
          saveData.playerProfile.highestUnlockedSlot < 0 ||
          saveData.playerProfile.highestUnlockedSlot > 5) {
        errors.push('playerProfile.highestUnlockedSlot must be 0-5');
      }
    }
  }

  // Check ship slots
  if (saveData.shipSlots) {
    if (saveData.shipSlots.length !== 6) {
      errors.push('Invalid ship slot count (expected 6)');
    }

    // Check slot 0 is immutable
    if (saveData.shipSlots[0] && !saveData.shipSlots[0].isImmutable) {
      errors.push('Slot 0 must be immutable');
    }
  }

  // Check drone instances structure
  if (saveData.droneInstances && !Array.isArray(saveData.droneInstances)) {
    errors.push('droneInstances must be an array');
  }

  // Check ship component instances structure
  if (saveData.shipComponentInstances && !Array.isArray(saveData.shipComponentInstances)) {
    errors.push('shipComponentInstances must be an array');
  }

  // Check discovered cards structure
  if (saveData.discoveredCards) {
    if (!Array.isArray(saveData.discoveredCards)) {
      errors.push('discoveredCards must be an array');
    } else {
      // Validate each entry has required fields
      for (const entry of saveData.discoveredCards) {
        if (!entry.cardId) {
          errors.push('discoveredCards entry missing cardId');
          break;
        }
        if (!['owned', 'discovered', 'undiscovered'].includes(entry.state)) {
          errors.push(`Invalid discoveredCards state: ${entry.state}`);
          break;
        }
      }
    }
  }

  // Check quick deployments structure (optional - may not exist in older saves)
  if (saveData.quickDeployments !== undefined) {
    if (!Array.isArray(saveData.quickDeployments)) {
      errors.push('quickDeployments must be an array');
    } else if (saveData.quickDeployments.length > 5) {
      errors.push('quickDeployments cannot exceed 5 entries');
    } else {
      // Validate each quick deployment has required fields
      for (const qd of saveData.quickDeployments) {
        if (!qd.id || typeof qd.id !== 'string') {
          errors.push('quickDeployment entry missing or invalid id');
          break;
        }
        if (!qd.name || typeof qd.name !== 'string') {
          errors.push('quickDeployment entry missing or invalid name');
          break;
        }
        if (!Array.isArray(qd.droneRoster) || qd.droneRoster.length !== 5) {
          errors.push('quickDeployment droneRoster must be array of 5 drones');
          break;
        }
        if (!Array.isArray(qd.placements)) {
          errors.push('quickDeployment placements must be an array');
          break;
        }
        // Validate placements
        for (const p of qd.placements) {
          if (!p.droneName || typeof p.lane !== 'number' || p.lane < 0 || p.lane > 2) {
            errors.push('quickDeployment placement invalid (needs droneName and lane 0-2)');
            break;
          }
        }
      }
    }
  }

  // Check boss progress structure (optional - may not exist in older saves)
  if (saveData.playerProfile?.bossProgress !== undefined) {
    const bp = saveData.playerProfile.bossProgress;
    if (!Array.isArray(bp.defeatedBosses)) {
      errors.push('bossProgress.defeatedBosses must be an array');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
