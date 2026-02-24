// ========================================
// ENCOUNTER CONTROLLER
// ========================================
// Manages POI encounter logic for Exploring the Eremos mode
// Handles ambush rolls, threat selection, and encounter outcomes

import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import DetectionManager from '../detection/DetectionManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';
import { generateSalvageItemFromValue } from '../../data/salvageItemData.js';
import aiPersonalities from '../../data/aiData.js';
import { getShipById } from '../../data/shipData.js';

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
   * Calculate POI encounter threat bonus based on current detection level
   * Higher threat = higher bonus to encounter chance
   * - Low (0-49%): +0%
   * - Medium (50-79%): +8-15% (one tier)
   * - High (80-100%): +16-30% (two tiers stacked)
   *
   * @param {Object} poi - POI hex object with coordinates
   * @param {Object} tierConfig - Tier configuration with optional poiThreatBonus range
   * @param {string} threatLevel - 'low', 'medium', or 'high'
   * @returns {number} Bonus percentage to add to encounter threshold
   */
  _calculatePOIThreatBonus(poi, tierConfig, threatLevel) {
    // Default range: 8-15% per tier
    const defaultRange = { min: 8, max: 15 };
    const configRange = tierConfig?.poiThreatBonus || defaultRange;

    // No bonus at low threat
    if (threatLevel === 'low') return 0;

    // Use seeded RNG based on POI coordinates for determinism
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    const poiOffset = ((poi?.q || 0) * 1000) + ((poi?.r || 0) * 37) + 9999;
    const rng = new SeededRandom(baseRng.seed + poiOffset);

    // Medium: one tier of bonus (8-15%)
    const tierBonus = configRange.min + rng.random() * (configRange.max - configRange.min);

    if (threatLevel === 'medium') {
      debugLog('ENCOUNTER', 'POI threat bonus (medium)', {
        tierBonus: tierBonus.toFixed(1)
      });
      return tierBonus;
    }

    // High: two tiers of bonus (16-30%)
    const secondTierBonus = configRange.min + rng.random() * (configRange.max - configRange.min);
    const totalBonus = tierBonus + secondTierBonus;

    debugLog('ENCOUNTER', 'POI threat bonus (high)', {
      tier1: tierBonus.toFixed(1),
      tier2: secondTierBonus.toFixed(1),
      total: totalBonus.toFixed(1)
    });

    return totalBonus;
  }

  /**
   * Check if POI encounter results in ambush or safe looting
   * @param {Object} poi - POI hex object with poiData
   * @param {Object} tierConfig - Tier configuration for threat bonus calculation
   * @returns {'combat' | 'loot'} Encounter outcome
   */
  checkPOIEncounter(poi, tierConfig = {}) {
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    // Use POI coordinates for unique roll per POI location
    const poiOffset = ((poi.q || 0) * 1000) + ((poi.r || 0) * 37);
    const rng = new SeededRandom(baseRng.seed + poiOffset);
    const roll = rng.random() * 100;
    const baseSecurity = poi.poiData?.baseSecurity || 15;

    // Calculate threat bonus based on current detection level
    const threatLevel = DetectionManager.getThreshold();
    const threatBonus = this._calculatePOIThreatBonus(poi, tierConfig, threatLevel);
    const threshold = baseSecurity + threatBonus;

    debugLog('ENCOUNTER', 'POI security check with threat bonus', {
      roll: roll.toFixed(2),
      baseSecurity,
      threatLevel,
      threatBonus: threatBonus.toFixed(1),
      threshold: threshold.toFixed(1)
    });

    const outcome = roll < threshold ? 'combat' : 'loot';
    debugLog('ENCOUNTER', `POI outcome: ${outcome.toUpperCase()}`);

    return outcome;
  }

  /**
   * Get AI personality data by name
   * @param {string} aiName - AI name to look up
   * @returns {Object|null} AI personality object with ship data, or null
   */
  getAIData(aiName) {
    const ai = aiPersonalities.find(a => a.name === aiName);
    if (!ai) return null;

    const ship = getShipById(ai.shipId);
    return {
      name: ai.name,
      shipClass: ship?.name || 'Unknown',
      difficulty: ai.difficulty || 'Unknown',
      escapeDamage: ai.escapeDamage || { min: 2, max: 2 }
    };
  }

  /**
   * Get AI opponent based on current threat level
   * @param {Object} tierConfig - Tier configuration with threatTables
   * @param {number} detection - Current detection (0-100)
   * @param {Object} poi - Optional POI for location-based seeding
   * @returns {string} AI ID from threat table
   */
  getAIForThreat(tierConfig, detection, poi = null) {
    // Determine threat level
    let level = 'low';
    if (detection >= 80) level = 'high';
    else if (detection >= 50) level = 'medium';

    // Get threat table for level
    const table = tierConfig.threatTables?.[level] || ['AI_SCOUT_1'];

    // Random selection from table using seeded RNG
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    // Use POI coordinates + offset to differentiate from encounter roll
    const aiOffset = poi ? (((poi.q || 0) * 1000) + ((poi.r || 0) * 37) + 5003) : 5003;
    const rng = new SeededRandom(baseRng.seed + aiOffset);
    const aiId = rng.select(table);

    debugLog('ENCOUNTER', 'AI selection', { level, detection: detection.toFixed(2), aiId });

    return aiId;
  }

  /**
   * Calculate reward for encounter (generates salvage item instead of flat credits)
   * Combat encounters give more credits as compensation
   * @param {Object} poi - POI hex object
   * @param {'combat' | 'loot'} outcome - Encounter outcome
   * @returns {Object} Reward object with salvageItem
   */
  calculateReward(poi, outcome) {
    // Base credits depend on outcome
    const baseCredits = outcome === 'combat' ? 100 : 50;

    // Add random bonus (0-49) using seeded RNG
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    // Use POI coordinates + offset to differentiate from other POI rolls
    const rewardOffset = ((poi.q || 0) * 1000) + ((poi.r || 0) * 37) + 9001;
    const rng = new SeededRandom(baseRng.seed + rewardOffset);
    const bonusCredits = rng.randomInt(0, 50);
    const creditValue = baseCredits + bonusCredits;

    // Generate salvage item using seeded RNG for determinism
    const salvageRng = { random: () => rng.random() };
    const salvageItem = generateSalvageItemFromValue(creditValue, salvageRng);

    const reward = {
      salvageItem,
      rewardType: poi.poiData?.rewardType || 'CREDITS_PACK',
      poiName: poi.poiData?.name || 'Unknown Location'
    };

    debugLog('ENCOUNTER', 'Reward calculated', { ...reward, creditValue });

    return reward;
  }

  /**
   * Main entry point - handle POI arrival and return encounter result
   * @param {Object} poi - POI hex object with poiData
   * @param {Object} tierConfig - Tier configuration
   * @returns {Object} Encounter result for modal display
   */
  async handlePOIArrival(poi, tierConfig) {
    const detection = DetectionManager.getCurrentDetection();

    debugLog('ENCOUNTER', 'POI arrival', { name: poi.poiData?.name || 'Unknown', detection: detection.toFixed(2) });

    // Track POI visit for run summary
    // Blueprint PoIs with requiresEncounterConfirmation should NOT be marked visited
    // until player actually engages (allows declining and returning later)
    const runState = tacticalMapStateManager.getState();
    if (runState && poi.type === 'poi') {
      const shouldTrackImmediately = !poi.poiData?.requiresEncounterConfirmation;

      if (shouldTrackImmediately) {
        const poisVisited = runState.poisVisited || [];
        const alreadyVisited = poisVisited.some(p => p.q === poi.q && p.r === poi.r);
        if (!alreadyVisited) {
          tacticalMapStateManager.setState({
            poisVisited: [...poisVisited, { q: poi.q, r: poi.r, name: poi.poiData?.name }]
          });
          debugLog('ENCOUNTER', 'POI tracked for summary', { q: poi.q, r: poi.r, name: poi.poiData?.name });
        }
      } else {
        debugLog('ENCOUNTER', 'Blueprint PoI - delaying visit tracking until engagement decision');
      }
    }

    // For drone blueprint PoIs with pre-determined guardian
    if (poi.poiData?.guardianAI) {
      debugLog('ENCOUNTER', 'Drone blueprint POI - guaranteed combat with guardian', {
        guardian: poi.poiData.guardianAI.name,
        requiresConfirmation: poi.poiData.requiresEncounterConfirmation
      });

      const reward = this.calculateReward(poi, 'combat');
      const guardianName = poi.poiData.guardianAI.id;
      const aiData = this.getAIData(guardianName);

      // Calculate potential reputation for guardian combat
      let potentialReputation = null;
      const gameState = gameStateManager.getState();
      const shipSlot = gameState.singlePlayerShipSlots?.find(s => s.id === runState?.shipSlotId);

      if (shipSlot && runState) {
        const ReputationCalculator = await import('../reputation/ReputationCalculator.js');
        const { mapTiers } = await import('../../data/mapData.js');

        const loadoutValue = ReputationCalculator.calculateLoadoutValue(shipSlot);
        const mapTier = runState.mapTier || 1;
        const mapConfig = mapTiers.find(t => t.tier === mapTier);
        const tierCap = mapConfig?.maxReputationPerCombat || 5000;

        potentialReputation = ReputationCalculator.calculateCombatReputation(
          loadoutValue.totalValue,
          guardianName,
          tierCap
        );
      }

      // Check if this PoI requires confirmation modal before combat
      if (poi.poiData.requiresEncounterConfirmation) {
        return {
          poi,
          outcome: 'encounterPending',  // Pending user decision
          aiId: guardianName,
          aiData,
          reward,
          detection,
          threatLevel: DetectionManager.getThreshold(),
          isGuaranteedCombat: true,
          requiresConfirmation: true,  // Flag for UI to show modal
          potentialReputation
        };
      }

      // OLD BEHAVIOR: Auto-combat for non-confirmation guardians (backward compatibility)
      return {
        poi,
        outcome: 'combat',
        aiId: guardianName,  // Use pre-determined guardian
        aiData,  // Ship class, difficulty, escape damage
        reward,
        detection,
        threatLevel: DetectionManager.getThreshold(),
        isGuaranteedCombat: true,  // Flag for UI
        potentialReputation
      };
    }

    // Roll for ambush (with threat bonus based on detection level)
    const outcome = this.checkPOIEncounter(poi, tierConfig);

    // Get AI if combat (pass poi for location-based seeding)
    const aiId = outcome === 'combat'
      ? this.getAIForThreat(tierConfig, detection, poi)
      : null;

    // Get AI data for display (ship class, difficulty, escape damage)
    const aiData = aiId ? this.getAIData(aiId) : null;

    // Calculate reward
    const reward = this.calculateReward(poi, outcome);

    // Calculate potential combat reputation (only for combat encounters)
    let potentialReputation = null;
    if (aiId) {
      const gameState = gameStateManager.getState();
      const shipSlot = gameState.singlePlayerShipSlots?.find(s => s.id === runState?.shipSlotId);

      if (shipSlot && runState) {
        const ReputationCalculator = await import('../reputation/ReputationCalculator.js');
        const { mapTiers } = await import('../../data/mapData.js');

        const loadoutValue = ReputationCalculator.calculateLoadoutValue(shipSlot);
        const mapTier = runState.mapTier || 1;
        const mapConfig = mapTiers.find(t => t.tier === mapTier);
        const tierCap = mapConfig?.maxReputationPerCombat || 5000;

        potentialReputation = ReputationCalculator.calculateCombatReputation(
          loadoutValue.totalValue,
          aiId,
          tierCap
        );

        debugLog('ENCOUNTER', 'Potential combat reputation:', potentialReputation);
      }
    }

    // Build encounter result
    const encounter = {
      poi,
      outcome,           // 'combat' or 'loot'
      aiId,              // AI opponent if combat, null if loot
      aiData,            // Ship class, difficulty, escape damage (combat only)
      reward,            // Credits and reward info
      detection,         // Detection at time of encounter
      threatLevel: DetectionManager.getThreshold(),  // 'low', 'medium', 'high'
      potentialReputation
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
      debugLog('ENCOUNTER', `[Encounter] completeEncounter called with combat outcome - this should not happen`);
      return;
    }

    // Award salvage item (replaces flat credits)
    const runState = tacticalMapStateManager.getState();

    if (runState && reward.salvageItem) {
      const creditValue = reward.salvageItem.creditValue || 0;
      const newCredits = (runState.creditsEarned || 0) + creditValue;

      // Add salvage item to collected loot
      const existingLoot = runState.collectedLoot || [];
      const salvageLootItem = {
        type: 'salvageItem',
        itemId: reward.salvageItem.itemId,
        name: reward.salvageItem.name,
        creditValue: reward.salvageItem.creditValue,
        image: reward.salvageItem.image,
        description: reward.salvageItem.description,
        source: 'encounter_reward'
      };

      tacticalMapStateManager.setState({
        collectedLoot: [...existingLoot, salvageLootItem],
        creditsEarned: newCredits
      });

      debugLog('ENCOUNTER', 'Salvage item awarded', { item: reward.salvageItem.name, creditValue, total: newCredits });
    }

    // Mark POI as looted (prevent re-looting) — see FUTURE_IMPROVEMENTS #33

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
      const poiChance = hex.poiData?.encounterChance || 15;
      // Add zone-based bonus to match UI calculation in MovementController
      const zoneChance = (mapData?.encounterByZone && hex.zone)
        ? (mapData.encounterByZone[hex.zone] || 0)
        : 0;
      return poiChance + zoneChance;
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
   * Uses TWO-ROLL MECHANIC:
   * 1. First roll against Signal Lock (encounterDetectionChance) - progressive tracking
   * 2. If detected, second roll against hex's encounter chance
   * Threat level affects severity only, not encounter chance
   *
   * @param {Object} hex - Current hex object
   * @param {Object} tierConfig - Tier configuration
   * @returns {Object|null} Encounter result or null if no encounter
   */
  checkMovementEncounter(hex, tierConfig) {
    // POI hexes should NEVER have movement encounters
    // POIs use their own encounter system via salvage
    if (hex.type === 'poi') {
      return null;
    }

    const detection = DetectionManager.getCurrentDetection();

    // Get map data from TacticalMapStateManager for zone-based encounter chance
    const runState = tacticalMapStateManager.getState();
    const mapData = runState?.mapData;

    // ========================================
    // ROLL 1: Signal Lock (encounter detection)
    // ========================================
    // Check if the progressive encounter detection triggers
    const encounterDetectionChance = runState?.encounterDetectionChance || 0;

    // Create seed for detection roll (different offset than encounter roll)
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    const detectionOffset = (hex.q * 1000) + (hex.r * 37) + 7777;
    const detectionRng = new SeededRandom(baseRng.seed + detectionOffset);
    const detectionRoll = detectionRng.random() * 100;

    debugLog('ENCOUNTER', 'Signal Lock check (Roll 1)', {
      detectionRoll: detectionRoll.toFixed(2),
      encounterDetectionChance: encounterDetectionChance.toFixed(2),
      detected: detectionRoll < encounterDetectionChance
    });

    // If Signal Lock roll fails, no encounter is possible
    if (detectionRoll >= encounterDetectionChance) {
      debugLog('ENCOUNTER', 'Signal Lock roll failed - no encounter possible');
      return null;
    }

    debugLog('ENCOUNTER', '🎯 Signal Lock triggered - rolling for encounter');

    // ========================================
    // ROLL 2: Hex encounter chance
    // ========================================
    // Get encounter chance based on hex type and zone
    const encounterChance = this.getEncounterChance(hex, tierConfig, mapData);
    // Create seed that includes hex position for unique roll per hex (deterministic)
    const hexOffset = (hex.q * 1000) + (hex.r * 37);
    const rng = new SeededRandom(baseRng.seed + hexOffset);
    const roll = rng.random() * 100;

    debugLog('ENCOUNTER', 'Hex encounter check (Roll 2)', {
      hexType: hex.type,
      roll: roll.toFixed(2),
      encounterChance,
      detection: detection.toFixed(2),
      triggered: roll < encounterChance
    });

    if (roll < encounterChance) {
      debugLog('ENCOUNTER', '⚠️ INTERCEPT! Encounter triggered');

      // Get AI based on threat level (pass hex for location-based seeding)
      const aiId = this.getAIForThreat(tierConfig, detection, hex);

      // Get AI data for display (ship class, difficulty, escape damage)
      const aiData = this.getAIData(aiId);

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
        aiData,  // Ship class, difficulty, escape damage
        reward: {
          credits: 50 + rng.randomInt(0, 51), // 50-100 credits for combat victory
          rewardType: hex.type === 'poi' ? hex.poiData?.rewardType : null,  // Empty hex = no POI reward, only enemy salvage
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

  /**
   * Check for encounter during salvage operation
   * Uses provided encounter chance (escalates with each slot)
   * @param {number} encounterChance - Current encounter chance (0-100)
   * @param {number} slotIndex - Current slot index for deterministic offset
   * @returns {boolean} True if encounter triggered
   */
  checkSalvageEncounter(encounterChance, slotIndex = 0) {
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    // Use slot index as offset for unique roll per slot (deterministic)
    const slotOffset = slotIndex * 1337;
    const rng = new SeededRandom(baseRng.seed + slotOffset);
    const roll = rng.random() * 100;

    debugLog('ENCOUNTER', 'Salvage encounter check', {
      roll: roll.toFixed(2),
      encounterChance: encounterChance.toFixed(2),
      slotIndex,
      triggered: roll < encounterChance
    });

    return roll < encounterChance;
  }

  /**
   * Roll random encounter increase for salvage from tier's range
   * @param {Object} tierConfig - Tier configuration with salvageEncounterIncreaseRange
   * @param {number} slotIndex - Current slot index for deterministic offset
   * @returns {number} Encounter increase amount
   */
  rollSalvageEncounterIncrease(tierConfig, slotIndex = 0) {
    const range = tierConfig?.salvageEncounterIncreaseRange || { min: 5, max: 10 };
    const { min, max } = range;

    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    // Use slot index + offset to differentiate from encounter roll
    const increaseOffset = (slotIndex * 1337) + 7919;
    const rng = new SeededRandom(baseRng.seed + increaseOffset);

    const increase = min + rng.random() * (max - min);

    debugLog('ENCOUNTER', 'Salvage encounter increase', {
      min,
      max,
      slotIndex,
      increase: increase.toFixed(2)
    });

    return increase;
  }

  // ========================================
  // SIGNAL LOCK METHODS
  // ========================================
  // Progressive encounter detection system
  // First roll in the two-roll encounter mechanic

  /**
   * Get current encounter detection chance (Signal Lock percentage)
   * @returns {number} Current encounterDetectionChance (0-100)
   */
  getEncounterDetectionChance() {
    return tacticalMapStateManager.getState()?.encounterDetectionChance || 0;
  }

  /**
   * Increase encounter detection chance after a move
   * @param {Object} tierConfig - Tier configuration with encounterDetectionRate
   * @param {number} moveIndex - Move index for deterministic seeding
   */
  increaseEncounterDetection(tierConfig, moveIndex = 0) {
    if (!tacticalMapStateManager.isRunActive()) {
      return;
    }

    const runState = tacticalMapStateManager.getState();
    if (!runState) return;

    // Get detection rate range from tier config (default: 5-15%)
    const range = tierConfig?.encounterDetectionRate || { min: 5, max: 15 };
    const { min, max } = range;

    // Use seeded RNG for deterministic increase
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    const increaseOffset = moveIndex * 1337 + 8888;
    const rng = new SeededRandom(baseRng.seed + increaseOffset);

    const increase = min + rng.random() * (max - min);
    const current = runState.encounterDetectionChance || 0;
    const newValue = Math.min(100, current + increase); // Cap at 100%

    tacticalMapStateManager.setState({
      encounterDetectionChance: newValue
    });

    debugLog('ENCOUNTER', 'Signal Lock increased', {
      from: current.toFixed(1),
      to: newValue.toFixed(1),
      increase: increase.toFixed(1)
    });
  }

  /**
   * Reset encounter detection chance to 0 (called on combat victory only)
   */
  resetEncounterDetection() {
    if (!tacticalMapStateManager.isRunActive()) {
      return;
    }

    tacticalMapStateManager.setState({
      encounterDetectionChance: 0
    });

    debugLog('ENCOUNTER', 'Signal Lock reset to 0 (combat victory)');
  }
}

// Export singleton instance
export default new EncounterController();
