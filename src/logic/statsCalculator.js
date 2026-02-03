// ========================================
// STATS CALCULATION MODULE
// ========================================
// Pure calculation functions for drone and ship stats
// Extracted from gameLogic.js to eliminate circular dependencies
// NO dependencies on GameDataService - these are pure functions

// --- IMPORTS ---
import fullDroneCollection from '../data/droneData.js';
import { LaneControlCalculator } from './combat/LaneControlCalculator.js';

// ========================================
// SHIP STATUS UTILITY
// ========================================

/**
 * Get the status of a ship section based on hull thresholds
 * @param {Object} section - Ship section object
 * @returns {string} Status: 'healthy', 'damaged', or 'critical'
 */
export const getShipStatus = (section) => {
    if (section.hull <= section.thresholds.critical) {
      return 'critical';
    }
    if (section.hull <= section.thresholds.damaged) {
      return 'damaged';
    }
    return 'healthy';
};

// ========================================
// SHIP SECTION BASE STATS CALCULATION
// ========================================

/**
 * Calculate the effective base stats for a ship section
 * Combines Ship Card baselines with Section modifiers
 *
 * @param {Object} shipCard - Ship card with baseHull, baseShields, baseThresholds
 * @param {Object} sectionTemplate - Section template with modifiers
 * @returns {Object} Computed stats { hull, maxHull, shields, thresholds }
 */
export const calculateSectionBaseStats = (shipCard, sectionTemplate) => {
  // Handle legacy sections without modifiers (default to 0)
  const hullMod = sectionTemplate.hullModifier ?? 0;
  const shieldsMod = sectionTemplate.shieldsModifier ?? 0;
  const thresholdMods = sectionTemplate.thresholdModifiers ?? { damaged: 0, critical: 0 };

  // Calculate final values, ensuring minimums
  const finalHull = Math.max(1, shipCard.baseHull + hullMod);
  const finalShields = Math.max(0, shipCard.baseShields + shieldsMod);
  const finalThresholds = {
    damaged: Math.max(0, shipCard.baseThresholds.damaged + thresholdMods.damaged),
    critical: Math.max(0, shipCard.baseThresholds.critical + thresholdMods.critical)
  };

  return {
    hull: finalHull,
    maxHull: finalHull,
    shields: finalShields,
    allocatedShields: finalShields,
    thresholds: finalThresholds
  };
};

// ========================================
// SHIP STATS CALCULATION
// ========================================

/**
 * Calculate effective ship stats including middle lane bonuses
 * @param {Object} playerState - Player state object
 * @param {Array} placedSections - Array of placed section names in lane order
 * @returns {Object} Effective ship stats with totals and bySection breakdown
 */
export const calculateEffectiveShipStats = (playerState, placedSections = []) => {
    const defaultReturn = {
      totals: { handLimit: 0, discardLimit: 0, energyPerTurn: 0, maxEnergy: 0, shieldsPerTurn: 0, initialDeployment: 0, deploymentBudget: 0, cpuLimit: 0 },
      bySection: {}
    };

    if (!playerState || !playerState.shipSections) {
        return defaultReturn;
    }

    const sectionStats = {};
    // ONLY process ship sections that are in placedSections array
    for (const sectionName of placedSections) {
      // Skip null/empty entries
      if (!sectionName) continue;

      const section = playerState.shipSections[sectionName];
      if (!section) continue; // Skip if section not found

      const status = getShipStatus(section);
      const currentStats = { ...section.stats[status] };
      const laneIndex = placedSections.indexOf(sectionName);

      // Apply middle lane bonus (lane 1, which is index 1 in 0-indexed array)
      if (laneIndex === 1 && section.middleLaneBonus) {
        for (const statKey in section.middleLaneBonus) {
          if (currentStats.hasOwnProperty(statKey)) {
            currentStats[statKey] += section.middleLaneBonus[statKey];
          }
        }
      }
      sectionStats[sectionName] = currentStats;
    }

    const totals = {
        handLimit: 0, discardLimit: 0, energyPerTurn: 0, maxEnergy: 0,
        shieldsPerTurn: 0, initialDeployment: 0, deploymentBudget: 0, cpuLimit: 0
    };

    for (const stats of Object.values(sectionStats)) {
        totals.handLimit += stats['Draw'] || 0;
        totals.discardLimit += stats['Discard'] || 0;
        totals.energyPerTurn += stats['Energy Per Turn'] || 0;
        totals.maxEnergy += stats['Max Energy'] || 0;
        totals.shieldsPerTurn += stats['Shields Per Turn'] || 0;
        totals.initialDeployment += stats['Initial Deployment'] || 0;
        totals.deploymentBudget += stats['Deployment Budget'] || 0;
        totals.cpuLimit += stats['CPU Control Value'] || 0;
    }

    return {
      totals: totals,
      bySection: sectionStats
    };
};

// ========================================
// DRONE STATS CALCULATION
// ========================================

/**
 * Calculate effective drone stats including all modifiers and abilities
 * @param {Object} drone - Drone object
 * @param {string} lane - Lane identifier (lane1, lane2, lane3)
 * @param {Object} playerState - Player state object
 * @param {Object} opponentState - Opponent state object
 * @param {Object} allPlacedSections - Placed sections for both players
 * @returns {Object} Effective drone stats
 */
export const calculateEffectiveStats = (drone, lane, playerState, opponentState, allPlacedSections, gameContext = {}) => {
    if (!drone || !lane || !playerState || !opponentState || !allPlacedSections) {
        return { attack: 0, speed: 0, hull: 0, maxShields: 0, cost: 0, baseAttack: 0, baseSpeed: 0, baseCost: 0, keywords: new Set() };
    }

    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
    if (!baseDrone) return { ...drone, baseAttack: drone.attack, baseSpeed: drone.speed, baseCost: drone.class || 0, cost: drone.class || 0, maxShields: 0, keywords: new Set() };

    const upgrades = playerState.appliedUpgrades[drone.name] || [];
    let baseAttack = baseDrone.attack;
    let baseSpeed = baseDrone.speed;
    let baseShields = baseDrone.shields;
    let baseCost = baseDrone.class;

    upgrades.forEach(upgrade => {
        if (upgrade.mod.stat === 'attack') baseAttack += upgrade.mod.value;
        if (upgrade.mod.stat === 'speed') baseSpeed += upgrade.mod.value;
        if (upgrade.mod.stat === 'shields') baseShields += upgrade.mod.value;
        if (upgrade.mod.stat === 'cost') baseCost += upgrade.mod.value;
    });

    // Ensure cost never goes below 0
    baseCost = Math.max(0, baseCost);

    let effectiveStats = {
      ...drone,
      attack: baseAttack,
      speed: baseSpeed,
      maxShields: baseShields,
      cost: baseCost,
      baseAttack: baseDrone.attack,
      baseSpeed: baseDrone.speed,
      baseCost: baseDrone.class,
      keywords: new Set()
    };

    drone.statMods?.forEach(mod => {
      if (mod.stat === 'attack') effectiveStats.attack += mod.value;
      if (mod.stat === 'speed') effectiveStats.speed += mod.value;
      if (mod.stat === 'cost') effectiveStats.cost = Math.max(0, effectiveStats.cost + mod.value);
    });

    baseDrone.abilities?.forEach(ability => {
      if (ability.type !== 'PASSIVE') return;

      if (ability.effect.type === 'GRANT_KEYWORD') {
        effectiveStats.keywords.add(ability.effect.keyword);
      }

      if (ability.effect.type === 'CONDITIONAL_MODIFY_STAT') {
        const { condition, mod } = ability.effect;
        let conditionMet = false;

        if (condition.type === 'SHIP_SECTION_HULL_DAMAGED' && condition.location === 'SAME_LANE') {
          const laneIndex = parseInt(lane.slice(-1)) - 1;

          const sectionsForPlayer = playerState.name === 'Player 1' ? allPlacedSections.player1 : allPlacedSections.player2;
          const sectionName = sectionsForPlayer[laneIndex];

          if (sectionName) {
            const shipSection = playerState.shipSections[sectionName];
            const status = getShipStatus(shipSection);
            if (status === 'damaged' || status === 'critical') {
              conditionMet = true;
            }
          }
        }

        if (condition.type === 'NOT_FIRST_ACTION') {
          const actionsTaken = gameContext.actionsTakenThisTurn ?? 0;
          conditionMet = actionsTaken >= 1;
        }

        if (condition.type === 'IN_CONTROLLED_LANE') {
          // Calculate lane control to check if player controls the drone's lane
          const laneControl = LaneControlCalculator.calculateLaneControl(
            playerState.name === 'Player 1' ? playerState : opponentState,
            playerState.name === 'Player 1' ? opponentState : playerState
          );
          const playerId = playerState.name === 'Player 1' ? 'player1' : 'player2';
          conditionMet = laneControl[lane] === playerId;
        }

        if (conditionMet) {
          if (mod.stat === 'attack') effectiveStats.attack += mod.value;
          if (mod.stat === 'speed') effectiveStats.speed += mod.value;
        }
      }

      if (ability.effect.type === 'CONDITIONAL_MODIFY_STAT_SCALING') {
        const { condition, mod } = ability.effect;
        let scaleFactor = 0;

        if (condition.type === 'OWN_DAMAGED_SECTIONS') {
          for (const sectionName in playerState.shipSections) {
            const shipSection = playerState.shipSections[sectionName];
            const status = getShipStatus(shipSection);
            if (status === 'damaged' || status === 'critical') {
              scaleFactor++;
            }
          }
        }

        if (scaleFactor > 0) {
          if (mod.stat === 'attack') effectiveStats.attack += (mod.value * scaleFactor);
          if (mod.stat === 'speed') effectiveStats.speed += (mod.value * scaleFactor);
        }
      }

      if (ability.effect.type === 'BONUS_DAMAGE_VS_SHIP') {
        effectiveStats.potentialShipDamage = (effectiveStats.potentialShipDamage || 0) + ability.effect.value;
      }

      if (ability.effect.type === 'FLANKING_BONUS') {
        if (lane === 'lane1' || lane === 'lane3') {
          ability.effect.mods.forEach(mod => {
            if (mod.stat === 'attack') effectiveStats.attack += mod.value;
            if (mod.stat === 'speed') effectiveStats.speed += mod.value;
          });
        }
      }
    });

    playerState.dronesOnBoard[lane]?.forEach(otherDrone => {
      if (otherDrone.id === drone.id) return;
      const otherBaseDrone = fullDroneCollection.find(d => d.name === otherDrone.name);
      otherBaseDrone?.abilities?.forEach(ability => {
        if (ability.type === 'PASSIVE' && ability.scope === 'FRIENDLY_IN_LANE' && ability.effect.type === 'MODIFY_STAT') {
          const { stat, value } = ability.effect;
          if (stat === 'shields') {
            effectiveStats.maxShields += value;
          } else if (stat === 'attack') {
            effectiveStats.attack += value;
          } else if (stat === 'speed') {
            effectiveStats.speed += value;
          }
        }
      });
    });

    // Process abilities granted by upgrades
    upgrades.forEach(upgrade => {
        if (upgrade.grantedAbilities) {
            upgrade.grantedAbilities.forEach(ability => {
                if (ability.type !== 'PASSIVE') return;

                if (ability.effect.type === 'GRANT_KEYWORD') {
                    effectiveStats.keywords.add(ability.effect.keyword);
                }

                // Add support for other ability types as needed
                if (ability.effect.type === 'MODIFY_STAT') {
                    const { stat, value } = ability.effect;
                    if (stat === 'attack') effectiveStats.attack += value;
                    if (stat === 'speed') effectiveStats.speed += value;
                    if (stat === 'shields') effectiveStats.maxShields += value;
                }
            });
        }
    });

    return effectiveStats;
};