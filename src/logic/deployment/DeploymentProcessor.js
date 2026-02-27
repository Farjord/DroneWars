// ========================================
// DEPLOYMENT PROCESSOR
// ========================================
// Handles drone deployment to lanes
// Extracted from gameLogic.js Phase 9.4B

import { calculateEffectiveStats, calculateEffectiveShipStats } from '../statsCalculator.js';
import { updateAuras } from '../utils/auraManager.js';
import fullDroneCollection from '../../data/droneData.js';
import { debugLog } from '../../utils/debugLogger.js';
import { onDroneDeployed } from '../availability/DroneAvailabilityManager.js';
import TriggerProcessor from '../triggers/TriggerProcessor.js';
import { TRIGGER_TYPES } from '../triggers/triggerConstants.js';

/**
 * DeploymentProcessor
 * Handles drone deployment validation and execution
 *
 * Key features:
 * - Validates CPU limit, deployment limit, maxPerLane restrictions
 * - Calculates deployment costs (budget vs energy)
 * - Generates deterministic drone IDs
 * - Processes ON_DEPLOY triggers via TriggerProcessor
 * - Updates deployment counters
 * - Generates TELEPORT_IN animations
 *
 * IMPORTANT: Uses TriggerProcessor for ON_DEPLOY effects - NO imports from gameLogic.js!
 */
class DeploymentProcessor {
  /**
   * Count drones of specific type in a lane
   * Utility function for maxPerLane validation
   *
   * @param {Object} playerState - Player state object
   * @param {string} droneName - Name of drone type to count
   * @param {string} laneId - Lane ID (lane1, lane2, lane3)
   * @returns {number} Count of drones of this type in the lane
   */
  countDroneTypeInLane(playerState, droneName, laneId) {
    if (!playerState.dronesOnBoard[laneId]) {
      return 0;
    }
    return playerState.dronesOnBoard[laneId].filter(d => d.name === droneName).length;
  }

  /**
   * Validate deployment legality
   * Checks CPU limit, deployment limit, maxPerLane, and resource costs
   *
   * @param {Object} player - Player state object
   * @param {Object} drone - Drone to deploy
   * @param {number} turn - Current turn number
   * @param {number} totalPlayerDrones - Total drones on board
   * @param {Object} playerEffectiveStats - Effective stats including cpuLimit
   * @param {string} targetLane - Lane for deployment (optional for validation)
   * @returns {Object} Validation result with isValid, reason, message, budgetCost, energyCost
   */
  validateDeployment(player, drone, turn, totalPlayerDrones, playerEffectiveStats, targetLane = null) {
    debugLog('DEPLOYMENT', '🔍 validateDeployment: Entry params:', {
      droneName: drone?.name,
      droneType: typeof drone,
      droneKeys: drone ? Object.keys(drone) : 'null',
      fullDroneCollectionLength: fullDroneCollection.length
    });

    // AI_DEPLOYMENT logging for bug investigation
    debugLog('AI_DEPLOYMENT', `🔍 Validating deployment`, {
      droneName: drone?.name,
      targetLane,
      turn,
      totalPlayerDrones,
      cpuLimit: playerEffectiveStats?.totals?.cpuLimit,
      playerEnergy: player?.energy,
      playerBudget: turn === 1 ? player?.initialDeploymentBudget : player?.deploymentBudget,
      budgetType: turn === 1 ? 'initialDeploymentBudget' : 'deploymentBudget'
    });

    // Check CPU limit
    if (totalPlayerDrones >= playerEffectiveStats.totals.cpuLimit) {
      debugLog('AI_DEPLOYMENT', `⛔ Validation FAILED: CPU Limit Reached`, {
        droneName: drone?.name,
        totalPlayerDrones,
        cpuLimit: playerEffectiveStats.totals.cpuLimit
      });
      return {
        isValid: false,
        reason: "CPU Limit Reached",
        message: "You cannot deploy more drones than your CPU Control Value."
      };
    }

    // Find base drone info and check deployment limit
    debugLog('DEPLOYMENT', '🔍 validateDeployment: About to find baseDroneInfo for:', drone?.name);
    const baseDroneInfo = fullDroneCollection.find(d => d.name === drone.name);
    debugLog('DEPLOYMENT', '🔍 validateDeployment: Found baseDroneInfo:', {
      found: !!baseDroneInfo,
      droneInfo: baseDroneInfo
    });

    // Calculate effective limit - start with drone's effectiveLimit if available
    // (includes slot damage penalty from Extraction mode), otherwise fall back to base limit
    const upgrades = player.appliedUpgrades[drone.name] || [];
    let effectiveLimit = drone.effectiveLimit ?? baseDroneInfo.limit;
    upgrades.forEach(upgrade => {
      if (upgrade.mod.stat === 'limit') {
        effectiveLimit += upgrade.mod.value;
      }
    });

    if ((player.deployedDroneCounts[drone.name] || 0) >= effectiveLimit) {
      debugLog('AI_DEPLOYMENT', `⛔ Validation FAILED: Deployment Limit Reached`, {
        droneName: drone?.name,
        deployed: player.deployedDroneCounts[drone.name] || 0,
        effectiveLimit
      });
      return {
        isValid: false,
        reason: "Deployment Limit Reached",
        message: `The deployment limit for ${drone.name} is currently ${effectiveLimit}.`
      };
    }

    // Check drone availability (new availability system)
    // This checks if we have ready copies available to deploy
    if (player.droneAvailability) {
      const availability = player.droneAvailability[drone.name];
      if (availability && availability.readyCount <= 0) {
        debugLog('AI_DEPLOYMENT', `⛔ Validation FAILED: No Copies Available`, {
          droneName: drone?.name,
          readyCount: availability.readyCount,
          inPlayCount: availability.inPlayCount,
          rebuildingCount: availability.rebuildingCount
        });
        return {
          isValid: false,
          reason: "No Copies Available",
          message: `No ${drone.name} copies are ready. ${availability.rebuildingCount} rebuilding.`
        };
      }
    }

    // Check maxPerLane restriction if applicable
    if (baseDroneInfo.maxPerLane && targetLane) {
      const currentCountInLane = this.countDroneTypeInLane(player, drone.name, targetLane);
      if (currentCountInLane >= baseDroneInfo.maxPerLane) {
        debugLog('AI_DEPLOYMENT', `⛔ Validation FAILED: Max Per Lane Reached`, {
          droneName: drone?.name,
          targetLane,
          currentCountInLane,
          maxPerLane: baseDroneInfo.maxPerLane
        });
        return {
          isValid: false,
          reason: "Max Per Lane Reached",
          message: `Only ${baseDroneInfo.maxPerLane} ${drone.name}${baseDroneInfo.maxPerLane > 1 ? 's' : ''} allowed per lane.`
        };
      }
    }

    // Calculate deployment costs (budget vs energy)
    const droneCost = drone.class;
    let energyCost = 0;
    let budgetCost = 0;

    if (turn === 1) {
      budgetCost = Math.min(player.initialDeploymentBudget, droneCost);
      energyCost = droneCost - budgetCost;
    } else {
      budgetCost = Math.min(player.deploymentBudget, droneCost);
      energyCost = droneCost - budgetCost;
    }

    // Check energy availability
    if (player.energy < energyCost) {
      debugLog('AI_DEPLOYMENT', `⛔ Validation FAILED: Not Enough Energy`, {
        droneName: drone?.name,
        energyCost,
        playerEnergy: player.energy,
        budgetCost,
        droneCost: drone.class,
        turn,
        budgetUsed: turn === 1 ? player.initialDeploymentBudget : player.deploymentBudget
      });
      return {
        isValid: false,
        reason: "Not Enough Energy",
        message: `This action requires ${energyCost} energy, but you only have ${player.energy}.`
      };
    }

    debugLog('AI_DEPLOYMENT', `✅ Validation passed`, {
      droneName: drone?.name,
      targetLane,
      budgetCost,
      energyCost,
      turn
    });

    return { isValid: true, budgetCost, energyCost };
  }

  /**
   * Execute drone deployment to lane
   * Validates, creates drone with deterministic ID, pays costs, triggers ON_DEPLOY
   *
   * @param {Object} drone - Drone to deploy
   * @param {string} lane - Target lane (lane1, lane2, lane3)
   * @param {number} turn - Current turn number
   * @param {Object} playerState - Player state object
   * @param {Object} opponentState - Opponent state object
   * @param {Object} placedSections - Placed ship sections
   * @param {Function} logCallback - Logging callback
   * @param {string} playerId - Player ID (player1 or player2)
   * @returns {Object} Deployment result with success, newPlayerState, deployedDrone, animationEvents
   */
  executeDeployment(drone, lane, turn, playerState, opponentState, placedSections, logCallback, playerId) {
    // Validate deployment
    // Filter out token drones from CPU count - tokens don't count toward CPU limit
    const totalPlayerDrones = Object.values(playerState.dronesOnBoard)
      .flat()
      .filter(d => {
        const baseDrone = fullDroneCollection.find(bd => bd.name === d.name);
        return !baseDrone?.isToken;
      })
      .length;
    const playerEffectiveStats = calculateEffectiveShipStats(
      playerState,
      placedSections.player1 || placedSections
    );
    const validation = this.validateDeployment(
      playerState,
      drone,
      turn,
      totalPlayerDrones,
      playerEffectiveStats,
      lane
    );

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.reason,
        message: validation.message,
        newPlayerState: playerState
      };
    }

    const { budgetCost, energyCost } = validation;

    // Log the deployment
    if (logCallback) {
      logCallback({
        player: playerState.name,
        actionType: 'DEPLOY',
        source: drone.name,
        target: lane,
        outcome: `Deployed to ${lane}.`
      });
    }

    // Create new player state
    const newPlayerState = JSON.parse(JSON.stringify(playerState));

    // Calculate effective stats for the new drone
    const tempDronesOnBoard = {
      ...newPlayerState.dronesOnBoard,
      [lane]: [...newPlayerState.dronesOnBoard[lane], { ...drone, id: 0 }]
    };
    const tempPlayerState = { ...newPlayerState, dronesOnBoard: tempDronesOnBoard };
    const effectiveStats = calculateEffectiveStats(
      drone,
      lane,
      tempPlayerState,
      opponentState,
      placedSections
    );

    // Generate deterministic ID using deployment counter
    const deploymentNumber = (newPlayerState.totalDronesDeployed || 0) + 1;
    const droneId = `${playerId}_${drone.name}_${deploymentNumber.toString().padStart(4, '0')}`;

    // Create the new drone with proper stats
    const newDrone = {
      ...drone,
      id: droneId,  // Deterministic ID
      statMods: [],
      currentShields: effectiveStats.maxShields,
      currentMaxShields: effectiveStats.maxShields,
      hull: drone.hull,
      isExhausted: false,
      isMarked: false,
      // Initialize RAPID/ASSAULT ability usage flags
      rapidUsed: false,
      assaultUsed: false,
      // Initialize ability activation tracking for per-round limits
      abilityActivations: [],
    };

    // Update the player state
    newPlayerState.dronesOnBoard[lane].push(newDrone);
    newPlayerState.deployedDroneCounts = {
      ...newPlayerState.deployedDroneCounts,
      [drone.name]: (newPlayerState.deployedDroneCounts[drone.name] || 0) + 1
    };

    // Update droneAvailability (new availability system)
    // Decrements readyCount, increments inPlayCount
    if (newPlayerState.droneAvailability) {
      newPlayerState.droneAvailability = onDroneDeployed(newPlayerState.droneAvailability, drone.name);
    }

    // Increment total deployment counter for deterministic ID generation
    newPlayerState.totalDronesDeployed = deploymentNumber;

    // Pay costs
    if (turn === 1) {
      newPlayerState.initialDeploymentBudget -= budgetCost;
    } else {
      newPlayerState.deploymentBudget -= budgetCost;
    }
    newPlayerState.energy -= energyCost;

    // Update auras
    newPlayerState.dronesOnBoard = updateAuras(newPlayerState, opponentState, placedSections);

    // Process ON_DEPLOY triggers via TriggerProcessor
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';
    let finalPlayerState = newPlayerState;
    let finalOpponentState = opponentState;
    const allAnimationEvents = [];

    const triggerProcessor = new TriggerProcessor();
    const deployResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_DEPLOY, {
      lane,
      triggeringDrone: newDrone,
      triggeringPlayerId: playerId,
      actingPlayerId: playerId,
      playerStates: {
        [playerId]: finalPlayerState,
        [opponentId]: finalOpponentState
      },
      placedSections,
      logCallback
    });

    if (deployResult.triggered) {
      finalPlayerState = deployResult.newPlayerStates[playerId];
      finalOpponentState = deployResult.newPlayerStates[opponentId];

      if (deployResult.animationEvents.length > 0) {
        allAnimationEvents.push(...deployResult.animationEvents);
      }
    }

    // Process ON_LANE_DEPLOYMENT mine triggers (fires LAST, after ON_DEPLOY)
    const minePlayerStates = {
      [playerId]: finalPlayerState,
      [opponentId]: finalOpponentState
    };
    const mineTriggerProcessor = new TriggerProcessor();
    const mineResult = mineTriggerProcessor.fireTrigger(TRIGGER_TYPES.ON_LANE_DEPLOYMENT, {
      lane: lane,
      triggeringDrone: newDrone,
      triggeringPlayerId: playerId,
      actingPlayerId: playerId,
      playerStates: minePlayerStates,
      placedSections,
      logCallback
    });

    // Update states from mine processing (TriggerProcessor returns new states)
    if (mineResult.triggered) {
      finalPlayerState = mineResult.newPlayerStates[playerId];
      finalOpponentState = mineResult.newPlayerStates[opponentId];
    }

    if (mineResult.triggered && mineResult.animationEvents.length > 0) {
      allAnimationEvents.push(...mineResult.animationEvents);
    }

    // Create animation event for deployment
    const animationEvents = [{
      type: 'TELEPORT_IN',
      targetId: newDrone.id,
      targetLane: lane,
      targetPlayer: playerId,
      timestamp: Date.now()
    }, ...allAnimationEvents];

    debugLog('DEPLOYMENT', `✅ Deployment complete`, {
      droneId: newDrone.id,
      droneName: newDrone.name,
      lane,
      budgetCost,
      energyCost,
      animationCount: animationEvents.length
    });

    return {
      success: true,
      newPlayerState: finalPlayerState,
      deployedDrone: newDrone,
      animationEvents,
      opponentState: finalOpponentState // Return updated opponent state
    };
  }
}

export default DeploymentProcessor;
