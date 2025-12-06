// ========================================
// ENCOUNTER CONTROLLER
// ========================================
// Manages POI encounter logic for Exploring the Eremos mode
// Handles ambush rolls, threat selection, and encounter outcomes

import gameStateManager from '../../managers/GameStateManager.js';
import DetectionManager from '../detection/DetectionManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';

/**
 * EncounterController - Singleton manager for POI encounters
 *
 * Encounter flow:
 * 1. Player arrives at POI hex
 * 2. Security check: roll < (baseSecurity + detection) = ambush
 * 3. If ambush: select AI from threat table based on detection
 * 4. Return encounter result for modal display
 *
 * Ambush formula:
 * - Random roll 0-100
 * - Threshold = POI baseSecurity + current detection
 * - Roll < threshold = combat, else = safe loot
 */
class EncounterController {
  constructor() {
    // Singleton instance
    if (EncounterController.instance) {
      return EncounterController.instance;
    }
    EncounterController.instance = this;
  }

  /**
   * Check if POI encounter results in ambush or safe looting
   * @param {Object} poi - POI hex object with poiData
   * @param {number} detection - Current detection (0-100)
   * @returns {'combat' | 'loot'} Encounter outcome
   */
  checkPOIEncounter(poi, detection) {
    const gameState = gameStateManager.getState();
    const rng = SeededRandom.fromGameState(gameState || {});
    const roll = rng.random() * 100;
    const baseSecurity = poi.poiData?.baseSecurity || 15;
    const threshold = baseSecurity + detection;

    debugLog('ENCOUNTER', 'POI security check', {
      roll: roll.toFixed(2),
      threshold: threshold.toFixed(2),
      baseSecurity,
      detection: detection.toFixed(2)
    });

    const outcome = roll < threshold ? 'combat' : 'loot';
    debugLog('ENCOUNTER', `POI outcome: ${outcome.toUpperCase()}`);

    return outcome;
  }

  /**
   * Get AI opponent based on current threat level
   * @param {Object} tierConfig - Tier configuration with threatTables
   * @param {number} detection - Current detection (0-100)
   * @returns {string} AI ID from threat table
   */
  getAIForThreat(tierConfig, detection) {
    // Determine threat level
    let level = 'low';
    if (detection >= 80) level = 'high';
    else if (detection >= 50) level = 'medium';

    // Get threat table for level
    const table = tierConfig.threatTables?.[level] || ['AI_SCOUT_1'];

    // Random selection from table using seeded RNG
    const gameState = gameStateManager.getState();
    const rng = SeededRandom.fromGameState(gameState || {});
    const aiId = rng.select(table);

    debugLog('ENCOUNTER', 'AI selection', { level, detection: detection.toFixed(2), aiId });

    return aiId;
  }

  /**
   * Calculate reward for encounter (stub implementation)
   * Combat encounters give more credits as compensation
   * @param {Object} poi - POI hex object
   * @param {'combat' | 'loot'} outcome - Encounter outcome
   * @returns {Object} Reward object with credits
   */
  calculateReward(poi, outcome) {
    // Base credits depend on outcome
    const baseCredits = outcome === 'combat' ? 100 : 50;

    // Add random bonus (0-49) using seeded RNG
    const gameState = gameStateManager.getState();
    const rng = SeededRandom.fromGameState(gameState || {});
    const bonusCredits = rng.randomInt(0, 50);

    const reward = {
      credits: baseCredits + bonusCredits,
      rewardType: poi.poiData?.rewardType || 'CREDITS',
      poiName: poi.poiData?.name || 'Unknown Location'
    };

    debugLog('ENCOUNTER', 'Reward calculated', reward);

    return reward;
  }

  /**
   * Main entry point - handle POI arrival and return encounter result
   * @param {Object} poi - POI hex object with poiData
   * @param {Object} tierConfig - Tier configuration
   * @returns {Object} Encounter result for modal display
   */
  handlePOIArrival(poi, tierConfig) {
    const detection = DetectionManager.getCurrentDetection();

    debugLog('ENCOUNTER', 'POI arrival', { name: poi.poiData?.name || 'Unknown', detection: detection.toFixed(2) });

    // Track POI visit for run summary
    const gameState = gameStateManager.getState();
    const currentRunState = gameState.currentRunState;
    if (currentRunState && poi.type === 'poi') {
      const poisVisited = currentRunState.poisVisited || [];
      const alreadyVisited = poisVisited.some(p => p.q === poi.q && p.r === poi.r);
      if (!alreadyVisited) {
        gameStateManager.setState({
          currentRunState: {
            ...currentRunState,
            poisVisited: [...poisVisited, { q: poi.q, r: poi.r, name: poi.poiData?.name }]
          }
        });
        debugLog('ENCOUNTER', 'POI tracked for summary', { q: poi.q, r: poi.r, name: poi.poiData?.name });
      }
    }

    // For drone blueprint PoIs with pre-determined guardian, always combat
    if (poi.poiData?.guardianAI) {
      debugLog('ENCOUNTER', 'Drone blueprint POI - guaranteed combat with guardian', {
        guardian: poi.poiData.guardianAI.name
      });

      const reward = this.calculateReward(poi, 'combat');

      return {
        poi,
        outcome: 'combat',
        aiId: poi.poiData.guardianAI.id,  // Use pre-determined guardian
        reward,
        detection,
        threatLevel: DetectionManager.getThreshold(),
        isGuaranteedCombat: true  // Flag for UI
      };
    }

    // Roll for ambush
    const outcome = this.checkPOIEncounter(poi, detection);

    // Get AI if combat
    const aiId = outcome === 'combat'
      ? this.getAIForThreat(tierConfig, detection)
      : null;

    // Calculate reward
    const reward = this.calculateReward(poi, outcome);

    // Build encounter result
    const encounter = {
      poi,
      outcome,           // 'combat' or 'loot'
      aiId,              // AI opponent if combat, null if loot
      reward,            // Credits and reward info
      detection,         // Detection at time of encounter
      threatLevel: DetectionManager.getThreshold()  // 'low', 'medium', 'high'
    };

    debugLog('ENCOUNTER', 'Encounter result', encounter);

    return encounter;
  }

  /**
   * Complete encounter and apply rewards/detection
   * Called when player dismisses encounter modal
   * @param {Object} encounter - Encounter result from handlePOIArrival
   */
  completeEncounter(encounter) {
    const { outcome, reward, poi } = encounter;

    debugLog('ENCOUNTER', 'Completing encounter', { outcome, poiName: poi?.poiData?.name });

    // Add looting threat (POI-specific or fallback)
    const threatIncrease = poi?.poiData?.threatIncrease || 10;
    if (poi?.type === 'poi') {
      DetectionManager.addDetection(threatIncrease, `Looting ${poi.poiData?.name || 'PoI'}`);
    }

    // Combat encounters are handled separately via SinglePlayerCombatInitializer
    // This method should only be called for non-combat outcomes
    if (outcome === 'combat') {
      console.warn(`[Encounter] completeEncounter called with combat outcome - this should not happen`);
      return;
    }

    // Award credits
    const gameState = gameStateManager.getState();
    const currentRunState = gameState.currentRunState;

    if (currentRunState) {
      const newCredits = (currentRunState.creditsEarned || 0) + reward.credits;
      gameStateManager.setState({
        currentRunState: {
          ...currentRunState,
          creditsEarned: newCredits
        }
      });

      debugLog('ENCOUNTER', 'Credits awarded', { awarded: reward.credits, total: newCredits });
    }

    // Mark POI as looted (prevent re-looting)
    // TODO: Track looted POIs in currentRunState

    debugLog('ENCOUNTER', 'Encounter complete');
  }

  /**
   * Check extraction encounter at gate (for future use)
   * @param {number} detection - Current detection
   * @returns {'blockade' | 'safe'} Extraction outcome
   */
  checkExtractionEncounter(detection) {
    const gameState = gameStateManager.getState();
    const rng = SeededRandom.fromGameState(gameState || {});
    const roll = rng.random() * 100;
    const outcome = roll < detection ? 'blockade' : 'safe';

    debugLog('ENCOUNTER', 'Extraction check', {
      roll: roll.toFixed(2),
      detection: detection.toFixed(2),
      outcome
    });

    return outcome;
  }

  /**
   * Get encounter chance for a hex based on type and zone
   * Uses map's pre-calculated zone encounter rates for variance
   * @param {Object} hex - Hex object
   * @param {Object} tierConfig - Tier configuration
   * @param {Object} mapData - Map data with encounterByZone (optional)
   * @returns {number} Encounter chance percentage (0-100)
   */
  getEncounterChance(hex, tierConfig, mapData = null) {
    if (hex.type === 'poi') {
      return hex.poiData?.encounterChance || 15;
    }
    if (hex.type === 'gate') {
      return tierConfig.encounterChance?.gate || 0;
    }

    // Empty hex: use zone-based encounter chance from map data if available
    if (mapData?.encounterByZone && hex.zone) {
      return mapData.encounterByZone[hex.zone] || 5;
    }

    // Fallback to tier config (backwards compatibility)
    const emptyChance = tierConfig.encounterChance?.empty;
    return typeof emptyChance === 'number' ? emptyChance : 5;
  }

  /**
   * Check for random encounter during movement (per-hex check)
   * Encounter chance varies by zone based on map's pre-rolled values
   * Threat level affects severity only, not encounter chance
   *
   * @param {Object} hex - Current hex object
   * @param {Object} tierConfig - Tier configuration
   * @returns {Object|null} Encounter result or null if no encounter
   */
  checkMovementEncounter(hex, tierConfig) {
    const detection = DetectionManager.getCurrentDetection();

    // Get map data from current run state for zone-based encounter chance
    const gameState = gameStateManager.getState();
    const mapData = gameState.currentRunState?.mapData;

    // Get encounter chance based on hex type and zone
    const encounterChance = this.getEncounterChance(hex, tierConfig, mapData);
    const rng = SeededRandom.fromGameState(gameState || {});
    const roll = rng.random() * 100;

    debugLog('ENCOUNTER', 'Movement encounter check', {
      hexType: hex.type,
      roll: roll.toFixed(2),
      encounterChance,
      detection: detection.toFixed(2),
      triggered: roll < encounterChance
    });

    if (roll < encounterChance) {
      debugLog('ENCOUNTER', '⚠️ INTERCEPT! Encounter triggered');

      // Get AI based on threat level (severity determined by threat, not chance)
      const aiId = this.getAIForThreat(tierConfig, detection);

      // Create encounter result
      const encounter = {
        poi: {
          type: hex.type,
          q: hex.q,
          r: hex.r,
          poiData: hex.type === 'poi' ? hex.poiData : {
            name: 'Intercept!',
            description: 'Enemy patrol detected your movement',
            flavourText: 'Warning! Hostile signatures emerging from sensor shadow!',
            color: '#ef4444'
          }
        },
        outcome: 'combat',
        aiId,
        reward: {
          credits: 50 + rng.randomInt(0, 51), // 50-100 credits for combat victory
          rewardType: hex.type === 'poi' ? hex.poiData?.rewardType : 'CREDITS',
          poiName: hex.type === 'poi' ? hex.poiData?.name : 'Intercept'
        },
        detection,
        threatLevel: DetectionManager.getThreshold(),
        isAmbush: hex.type !== 'poi'  // Flag for UI - true if ambush on empty hex
      };

      return encounter;
    }

    return null;
  }
}

// Export singleton instance
export default new EncounterController();
