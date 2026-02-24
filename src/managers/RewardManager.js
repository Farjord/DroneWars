/**
 * RewardManager
 * Centralized reward generation with deterministic seeding
 *
 * Replaces LootGenerator with:
 * - Master seed increment (deterministic randomness)
 * - Blueprint exhaustion (on-the-fly calculation)
 * - Centralized reward finalization
 * - Reward history tracking
 *
 * All randomness uses incrementing master seed from GameStateManager.
 *
 * ## Reward Generation Architecture
 *
 * Different reward scenarios have INTENTIONALLY different implementations:
 *
 * | Method                  | Card Source | Card Count    | Why Different                              |
 * |-------------------------|-------------|---------------|--------------------------------------------|
 * | generateShopPack        | Card pool   | Fixed max     | Player paid credits, guaranteed value      |
 * | generateSalvageSlots    | Card pool   | Zone-weighted | Exploration risk/reward, mixed with salvage|
 * | generateCombatRewards   | Enemy deck  | 1-3 from deck | Thematic: salvaging enemy equipment        |
 * | generateBlueprintReward | Drone pool  | N/A           | Separate progression system, class-based   |
 * | generatePOIRewards      | Card pool   | Zone-weighted | Direct POI loot, used by reputation system |
 *
 * ## Shared Card Selection Logic
 *
 * Pool-based methods (Shop, Salvage, POI) share the same card selection pipeline:
 * - rollCardType() - Guaranteed first card + weighted additional cards
 * - rollRarity() - Tier-based rarity weights from cardPackData.js
 * - selectCard() - Multi-fallback card selection with rarity/type filtering
 *
 * This ensures consistent card distribution while allowing different
 * slot/count mechanics per scenario.
 *
 * ## Why Combat Is Different
 *
 * Combat rewards pull from the ENEMY DECK, not the card pool. This is thematic:
 * defeating an AI lets you salvage what THEY were using. No type/rarity filtering.
 *
 * ## Why Blueprints Are Different
 *
 * Blueprints use a completely separate data model (drones, not cards) with:
 * - Class bands (0-4) instead of card types
 * - Exhaustion tracking (no duplicate unlocks)
 * - Fallback salvage when pool is exhausted
 */

import packTypes from '../data/cardPackData.js';
import fullDroneCollection from '../data/droneData.js';
import { starterPoolDroneNames } from '../data/saveGameSchema.js';
import { calculateAICoresDrop } from '../data/aiCoresData.js';
import { generateSalvageItemFromValue, SALVAGE_ITEMS } from '../data/salvageItemData.js';
import { debugLog } from '../utils/debugLogger.js';
import { CLASS_BAND_WEIGHTS, RARITY_WEIGHTS } from '../logic/loot/blueprintDropCalculator.js';
import { createRNG, shuffleArray } from '../logic/loot/SeededRNG.js';
import {
  STARTER_CARD_IDS,
  transformCardForLoot,
  weightedRoll,
  rollRarity,
  rollCardType,
  selectCard,
  rollWeightedCardCount
} from '../logic/loot/CardSelectionPipeline.js';
import gameStateManager from './GameStateManager.js';
import metaGameStateManager from './MetaGameStateManager.js';

class RewardManager {
  constructor() {
    this.state = {
      rewardHistory: [],
      pendingRewards: null
    };
    this.subscribers = [];
  }

  /**
   * Get next seed and increment master seed
   * @private
   * @returns {number} - Current seed value
   */
  getNextSeed() {
    const gameState = gameStateManager.getState();
    const seed = gameState.masterSeed || Date.now();

    // Increment master seed for next use
    gameStateManager.setState({
      masterSeed: seed + 1
    });

    return seed;
  }

  /**
   * Roll salvage slot count using weighted distribution from tier config
   * @private
   * @param {string} zone - Zone name (perimeter/mid/core)
   * @param {Object} tierConfig - Tier configuration with salvageSlotCountWeights
   * @param {SeededRandom} rng - Random number generator
   * @returns {number} Number of slots (1-5)
   */
  rollSlotCount(zone, tierConfig, rng) {
    // Default weights if config missing (from LootGenerator fallback)
    const defaultWeights = {
      perimeter: { 1: 50, 2: 30, 3: 15, 4: 5, 5: 0 },
      mid:       { 1: 10, 2: 30, 3: 35, 4: 20, 5: 5 },
      core:      { 1: 0, 2: 10, 3: 25, 4: 40, 5: 25 }
    };

    // Get weights for this zone (from config or defaults)
    const zoneWeights = tierConfig?.salvageSlotCountWeights?.[zone]
      || defaultWeights[zone]
      || defaultWeights.mid;

    // Roll weighted slot count (weightedRoll returns string, parse to number)
    return parseInt(weightedRoll(zoneWeights, rng), 10);
  }

  /**
   * Roll card count using weighted distribution from tier config
   * Determines how many cards (vs salvage items) will be in the POI slots
   * @private
   * @param {string} zone - Zone name (perimeter/mid/core)
   * @param {Object} tierConfig - Tier configuration with zoneRewardWeights.cardCountWeights
   * @param {SeededRandom} rng - Random number generator
   * @returns {number} Number of cards (1-3)
   */
  rollCardCount(zone, tierConfig, rng) {
    // Default weights based on mapData.js zoneRewardWeights
    const defaultWeights = {
      perimeter: { 1: 80, 2: 15, 3: 5 },    // 80% chance of 1 card
      mid:       { 1: 35, 2: 50, 3: 15 },   // 50% chance of 2 cards
      core:      { 1: 15, 2: 40, 3: 45 }    // 45% chance of 3 cards
    };

    // Get weights for this zone (from config or defaults)
    const zoneWeights = tierConfig?.zoneRewardWeights?.[zone]?.cardCountWeights
      || defaultWeights[zone]
      || defaultWeights.mid;

    // Roll weighted card count (weightedRoll returns string, parse to number)
    return parseInt(weightedRoll(zoneWeights, rng), 10);
  }

  /**
   * Generate POI loot rewards (direct, non-slot-based)
   * Replaces LootGenerator.openPack()
   *
   * DESIGN NOTES:
   * - Used by reputation system (generateReputationReward wraps this)
   * - Variable card count from zone weights OR config range (exploration risk/reward)
   * - Includes one salvage item (50-100 credits base value)
   * - Returns simple object format (no slot/reveal mechanics)
   * - Uses card pool with pack config (guaranteedTypes, additionalCardWeights, rarityWeights)
   *
   * @param {Object} poiContext - {poiData: {rewardType}, outcome: string, tier: number, zone: string, tierConfig: Object}
   * @returns {Object} - {cards: Array, salvageItem: Object, credits: number, seed: number}
   *
   * @see generateSalvageSlots for slot-based POI salvage with reveal mechanics
   */
  generatePOIRewards(poiContext) {
    const { poiData, tier = 1, zone = null, tierConfig = null } = poiContext;
    const packType = poiData.rewardType;

    const seed = this.getNextSeed();

    // Normalize CREDITS to CREDITS_PACK
    const normalizedPackType = packType === 'CREDITS' ? 'CREDITS_PACK' : packType;

    const config = packTypes[normalizedPackType];
    if (!config) {
      debugLog('REWARD_MANAGER', `⚠️ Unknown pack type: ${packType}`);
      return { cards: [], credits: 0, seed };
    }

    const rng = createRNG(seed);
    const tierKey = `tier${tier}`;

    // Get rarity weights and allowed rarities
    const rarityWeights = config.rarityWeights[tierKey] || config.rarityWeights.tier1;
    const allowedRarities = Object.keys(rarityWeights).filter(r => rarityWeights[r] > 0);

    // Get zone-based reward weights
    const zoneWeights = zone && tierConfig?.zoneRewardWeights?.[zone];

    // Determine card count
    let cardCount;
    if (config.cardCount.useZoneWeights && zoneWeights) {
      cardCount = rollWeightedCardCount(
        config.cardCount.min,
        config.cardCount.max,
        zoneWeights.cardCountWeights,
        rng
      );
    } else {
      cardCount = Math.floor(rng.random() * (config.cardCount.max - config.cardCount.min + 1))
        + config.cardCount.min;
    }

    // Generate cards
    const cards = [];
    for (let i = 0; i < cardCount; i++) {
      // First card uses guaranteed type, others use weighted roll
      const cardType = rollCardType(config, i === 0, rng);
      const rolledRarity = rollRarity(rarityWeights, rng);
      const card = selectCard(cardType, rolledRarity, allowedRarities, rng);

      if (card) {
        cards.push(card);  // Already transformed by selectCard()
      }
    }

    // Generate salvage item (50-100 credits base value)
    const salvageValue = Math.floor(rng.random() * 51) + 50;
    const salvageItem = generateSalvageItemFromValue(salvageValue, rng);

    debugLog('REWARD_MANAGER', `Generated POI rewards (seed: ${seed})`, {
      packType: normalizedPackType,
      cardCount: cards.length,
      salvageValue
    });

    // Track in history
    this.state.rewardHistory.push({
      timestamp: Date.now(),
      type: 'poi_rewards',
      source: packType,
      seed,
      content: { cardCount: cards.length, salvageValue }
    });

    return {
      cards,
      salvageItem,
      credits: 0,
      seed
    };
  }

  /**
   * Generate combat rewards (victory loot from defeated AI)
   * Replaces LootGenerator.generateCombatSalvage()
   *
   * DESIGN NOTES:
   * - Cards come from ENEMY DECK (not card pool) - thematic "salvaging enemy equipment"
   * - No type/rarity weighting - you get what the enemy was using
   * - Includes AI cores (combat-specific currency with difficulty-based drop rates)
   * - Different from pool-based methods which filter by pack type
   * - Excludes starter cards from enemy deck (player already has infinite copies)
   *
   * @param {Object} combatContext - {enemyDeck: Array, tier: number, aiDifficulty: string, aiId: string}
   * @returns {Object} - {cards: Array, salvageItem: Object, aiCores: number, blueprint: null, reputation: number, seed: number}
   *
   * @see generateSalvageSlots for POI exploration which uses card pool with pack config
   */
  generateCombatRewards(combatContext) {
    const { enemyDeck, tier = 1, aiDifficulty = null } = combatContext;

    const seed = this.getNextSeed();
    const rng = createRNG(seed);

    // Filter enemy deck (remove starter cards by ID or rarity, and AI-only cards)
    const filteredDeck = enemyDeck.filter(card =>
      !STARTER_CARD_IDS.has(card.id) && card.rarity !== 'Starter' && !card.aiOnly
    );

    // Select 1-3 cards from enemy deck
    const cardCount = Math.min(3, filteredDeck.length);
    const selectedCards = [];

    for (let i = 0; i < cardCount && filteredDeck.length > 0; i++) {
      const index = Math.floor(rng.random() * filteredDeck.length);
      // Transform to collectedLoot format (cardId, cardName) for UI consistency
      selectedCards.push(transformCardForLoot(filteredDeck[index]));
      filteredDeck.splice(index, 1);
    }

    // Generate salvage item (50-100 credits)
    const salvageValue = Math.floor(rng.random() * 51) + 50;
    const salvageItem = generateSalvageItemFromValue(salvageValue, rng);

    // Calculate AI cores drop
    const aiCores = calculateAICoresDrop(tier, aiDifficulty, rng);

    debugLog('REWARD_MANAGER', `Generated combat rewards (seed: ${seed})`, {
      cardCount: selectedCards.length,
      salvageValue,
      aiCores
    });

    // Track in history
    this.state.rewardHistory.push({
      timestamp: Date.now(),
      type: 'combat_rewards',
      seed,
      content: { cardCount: selectedCards.length, aiCores }
    });

    return {
      cards: selectedCards,
      salvageItem,
      aiCores,
      blueprint: null,  // Blueprints generated separately
      reputation: 0,    // See FUTURE_IMPROVEMENTS #35 — reputation integration pending
      seed
    };
  }

  /**
   * Generate drone blueprint reward
   * Replaces LootGenerator.generateDroneBlueprint()
   *
   * DESIGN NOTES:
   * - Separate progression system (drones, not cards) - completely different data model
   * - Uses CLASS BANDS (0-4) instead of card types (Ordnance, Support, etc.)
   * - Class bands are POI-specific: Light POI → classes 0-1, Heavy POI → classes 2-4
   * - Tracks unlocked status (tier-up, no duplicate unlocks within a run)
   * - Exhaustion fallback: returns higher-tier salvage when all blueprints in pool unlocked
   * - Up to 10 reroll attempts to find available drone before exhaustion
   * - Different from card-based rewards entirely
   *
   * @param {string} packType - Blueprint pack type (e.g., 'DRONE_BLUEPRINT_LIGHT', 'DRONE_BLUEPRINT_HEAVY')
   * @param {number} tier - Map tier (1-3) for rarity weight selection
   * @returns {Object|null} - Blueprint object or { type: 'blueprint_exhausted', fallbackSalvage }
   *
   * @see generateCombatRewards for post-combat card drops (different system)
   */
  generateBlueprintReward(packType, tier = 1) {
    const seed = this.getNextSeed();

    const classBandWeights = CLASS_BAND_WEIGHTS[packType];
    if (!classBandWeights) {
      debugLog('REWARD_MANAGER', `⚠️ Unknown drone blueprint reward type: ${packType}`);
      return null;
    }

    const weights = RARITY_WEIGHTS[`tier${tier}`] || RARITY_WEIGHTS.tier1;
    const rng = createRNG(seed);

    // Get unlocked blueprints from player profile
    const profile = metaGameStateManager.getState().singlePlayerProfile;
    const unlockedBlueprints = profile?.unlockedBlueprints || [];

    // Reroll up to 10 times to find available drone
    const MAX_REROLL_ATTEMPTS = 10;
    let selectedDrone = null;
    let rolledRarity = null;

    for (let attempt = 0; attempt < MAX_REROLL_ATTEMPTS; attempt++) {
      // Roll a class based on POI weights
      const rolledClass = parseInt(weightedRoll(classBandWeights, rng));

      // Roll rarity based on tier weights
      rolledRarity = rollRarity(weights, rng);

      // Filter drones by class, rarity, and exclusions
      const availableDrones = fullDroneCollection.filter(d => {
        // Exclude starters
        if (starterPoolDroneNames.includes(d.name)) return false;

        // Exclude already unlocked
        if (unlockedBlueprints.includes(d.name)) return false;

        // Exclude non-selectable
        if (d.selectable === false) return false;

        // Match rolled class
        if (d.class !== rolledClass) return false;

        // Match rolled rarity
        if ((d.rarity || 'Common') !== rolledRarity) return false;

        return true;
      });

      // If pool has drones, select one
      if (availableDrones.length > 0) {
        selectedDrone = availableDrones[Math.floor(rng.random() * availableDrones.length)];
        break;
      }
    }

    // Check if all classes exhausted
    if (!selectedDrone) {
      // Generate fallback salvage (higher tier)
      const fallbackSalvage = this.generateBlueprintFallbackSalvage(rolledRarity || 'Common', rng);

      debugLog('REWARD_MANAGER', `Blueprint pack exhausted (seed: ${seed})`, {
        packType,
        tier,
        fallbackSalvage: fallbackSalvage.id
      });

      return {
        type: 'blueprint_exhausted',
        poiType: packType,
        tier: tier,
        fallbackSalvage
      };
    }

    debugLog('REWARD_MANAGER', `Generated blueprint (seed: ${seed})`, {
      blueprintId: selectedDrone.name,
      rarity: selectedDrone.rarity || 'Common'
    });

    // Track in history
    this.state.rewardHistory.push({
      timestamp: Date.now(),
      type: 'blueprint',
      seed,
      content: { blueprintId: selectedDrone.name }
    });

    // Return blueprint
    return {
      type: 'blueprint',
      blueprintId: selectedDrone.name,
      blueprintType: 'drone',
      rarity: selectedDrone.rarity || 'Common',
      droneData: selectedDrone,
      source: 'drone_blueprint_poi'
    };
  }

  /**
   * Generate fallback salvage for exhausted blueprints
   * @private
   */
  generateBlueprintFallbackSalvage(rolledRarity, rng) {
    // Map blueprint rarity to one tier higher salvage rarity
    const RARITY_TIER_UP = {
      'Common': 'Uncommon',
      'Uncommon': 'Rare',
      'Rare': 'Mythic',
      'Mythic': 'Mythic'
    };

    const targetSalvageRarity = RARITY_TIER_UP[rolledRarity] || 'Uncommon';

    // Filter salvage items by rarity
    const eligibleSalvage = SALVAGE_ITEMS.filter(item => item.rarity === targetSalvageRarity);

    if (eligibleSalvage.length === 0) {
      debugLog('REWARD_MANAGER', `⚠️ No salvage items found for rarity ${targetSalvageRarity}`);
      return generateSalvageItemFromValue(100, rng);
    }

    // Select random item from eligible pool
    const selectedItem = eligibleSalvage[Math.floor(rng.random() * eligibleSalvage.length)];

    return {
      id: selectedItem.id,
      name: selectedItem.name,
      description: selectedItem.description || '',
      rarity: selectedItem.rarity,
      value: selectedItem.value
    };
  }

  /**
   * Generate salvage slots for POI exploration
   * Uses two-roll system: first roll slot count, then roll card count
   *
   * DESIGN NOTES:
   * - Two-roll system: slot count (from salvageSlotCountWeights) + card count (from cardCountWeights)
   * - Mixed loot: cards AND salvage items in same slots (exploration risk/reward)
   * - Shuffled presentation (player doesn't know which slot contains what until revealed)
   * - Returns slot array with reveal state for progressive UI (SalvageController)
   * - Zone affects both slot count and card count distributions (core = more slots/cards)
   * - All slots yield loot (no empty slots) - cardCount capped to slotCount
   * - Uses card pool with pack config (guaranteedTypes, additionalCardWeights, rarityWeights)
   *
   * @param {string} packType - Pack type (e.g., 'ORDNANCE_PACK') for card type/rarity selection
   * @param {number} tier - Map tier (1-3) for rarity weight selection
   * @param {string} zone - Map zone (perimeter/mid/core) for slot and card count weights
   * @param {Object} tierConfig - Tier configuration with salvageSlotCountWeights and zoneRewardWeights
   * @returns {Array} - Array of slot objects: { type: 'card'|'salvageItem', content: Object, revealed: boolean }
   *
   * @see generateShopPack for fixed-count card-only purchases
   * @see generateCombatRewards for enemy deck-based loot (not card pool)
   */
  generateSalvageSlots(packType, tier = 1, zone = null, tierConfig = null) {
    const seed = this.getNextSeed();
    const rng = createRNG(seed);
    const actualZone = zone || 'mid';

    // Step 1: Roll total slot count from salvageSlotCountWeights
    const slotCount = this.rollSlotCount(actualZone, tierConfig, rng);

    // =====================================================
    // SPECIAL CASE: TOKEN_REWARD (Contraband Cache)
    // Guaranteed token + optional card + salvage items
    // =====================================================
    if (packType === 'TOKEN_REWARD') {
      const config = packTypes['TOKEN_REWARD'];
      const slots = [];

      // Guaranteed token (from config)
      if (config?.guaranteedToken) {
        slots.push({
          type: 'token',
          content: { ...config.guaranteedToken },
          revealed: false
        });
      }

      // Card chance roll (from config, default 25%)
      const cardChance = config?.cardChance ?? 0.25;
      if (rng.random() < cardChance) {
        const rarityWeights = config?.cardRarityWeights || { Common: 70, Uncommon: 25, Rare: 5 };
        const rolledRarity = rollRarity(rarityWeights, rng);
        const card = selectCard(null, rolledRarity, Object.keys(rarityWeights), rng);
        if (card) {
          slots.push({ type: 'card', content: card, revealed: false });
        }
      }

      // Fill remaining slots with salvage items (from config range)
      const salvageMin = config?.salvageRange?.min ?? 50;
      const salvageMax = config?.salvageRange?.max ?? 100;
      while (slots.length < slotCount) {
        const salvageValue = Math.floor(rng.random() * (salvageMax - salvageMin + 1)) + salvageMin;
        slots.push({
          type: 'salvageItem',
          content: generateSalvageItemFromValue(salvageValue, rng),
          revealed: false
        });
      }

      shuffleArray(slots, rng);
      slots.seed = seed;

      debugLog('REWARD_MANAGER', `Generated TOKEN_REWARD slots (seed: ${seed})`, {
        slotCount: slots.length,
        hasToken: slots.some(s => s.type === 'token'),
        hasCard: slots.some(s => s.type === 'card'),
        zone: actualZone
      });

      return slots;
    }

    // =====================================================
    // SPECIAL CASE: CREDITS_PACK (Credit Cache)
    // Higher value salvage items only, no cards
    // =====================================================
    if (packType === 'CREDITS_PACK' || packType === 'CREDITS') {
      const config = packTypes['CREDITS_PACK'];
      const slots = [];

      // Use creditsRange from config (default 100-300)
      const baseMin = config?.creditsRange?.min ?? 100;
      const baseMax = config?.creditsRange?.max ?? 300;

      // Apply zone multiplier if enabled in config
      const useZoneMultiplier = config?.useZoneMultiplier ?? true;
      const zoneMultiplier = useZoneMultiplier
        ? (tierConfig?.zoneRewardWeights?.[actualZone]?.creditsMultiplier ?? 1.0)
        : 1.0;
      const adjustedMin = Math.floor(baseMin * zoneMultiplier);
      const adjustedMax = Math.floor(baseMax * zoneMultiplier);

      // All slots are high-value salvage items
      for (let i = 0; i < slotCount; i++) {
        const salvageValue = Math.floor(rng.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin;
        slots.push({
          type: 'salvageItem',
          content: generateSalvageItemFromValue(salvageValue, rng),
          revealed: false
        });
      }

      shuffleArray(slots, rng);
      slots.seed = seed;

      debugLog('REWARD_MANAGER', `Generated CREDITS_PACK slots (seed: ${seed})`, {
        slotCount: slots.length,
        creditRange: `${adjustedMin}-${adjustedMax}`,
        zoneMultiplier,
        zone: actualZone
      });

      return slots;
    }

    // =====================================================
    // STANDARD PACK TYPES (card + salvage mix)
    // =====================================================

    // Step 2: Roll card count from zoneRewardWeights.cardCountWeights
    let cardCount = this.rollCardCount(actualZone, tierConfig, rng);

    // Step 3: Ensure cardCount doesn't exceed slotCount
    cardCount = Math.min(cardCount, slotCount);

    // Step 4: Calculate salvage count (remaining slots)
    const salvageCount = slotCount - cardCount;

    const slots = [];

    // Step 5: Generate cards using pack configuration (like generateShopPack)
    const config = packTypes[packType];
    const tierKey = `tier${tier}`;
    const rarityWeights = config?.rarityWeights?.[tierKey] || { Common: 100 };
    const allowedRarities = Object.keys(rarityWeights).filter(r => rarityWeights[r] > 0);

    for (let i = 0; i < cardCount; i++) {
      // First card uses guaranteed type, others use additionalCardWeights
      const cardType = config ? rollCardType(config, i === 0, rng) : null;
      const rolledRarity = rollRarity(rarityWeights, rng);
      const card = selectCard(cardType, rolledRarity, allowedRarities, rng);

      if (card) {
        slots.push({
          type: 'card',
          content: card,  // Already transformed by selectCard()
          revealed: false
        });
      }
    }

    // Step 6: Generate salvage items for remaining slots
    for (let i = 0; i < salvageCount; i++) {
      const salvageValue = Math.floor(rng.random() * 51) + 50;
      slots.push({
        type: 'salvageItem',
        content: generateSalvageItemFromValue(salvageValue, rng),
        revealed: false
      });
    }

    // Step 7: Shuffle slots so player doesn't know card vs salvage order
    shuffleArray(slots, rng);

    slots.seed = seed;  // Attach seed to array for debugging

    debugLog('REWARD_MANAGER', `Generated salvage slots (seed: ${seed})`, {
      slotCount,
      zone
    });

    return slots;
  }

  /**
   * Generate shop pack (player purchase)
   * Replaces LootGenerator.openShopPack()
   *
   * DESIGN NOTES:
   * - Always returns config.cardCount.max cards (player paid credits, guaranteed value)
   * - No salvage items included (pure card purchase)
   * - Returns simple {cards, seed} format (no reveal mechanics needed)
   * - Supports customSeed for pre-determined shop inventory display
   * - Uses card pool with pack config (guaranteedTypes, additionalCardWeights, rarityWeights)
   *
   * @param {string} packType - Shop pack type (e.g., 'ORDNANCE_PACK', 'SUPPORT_PACK')
   * @param {number} tier - Pack tier (1-3) for rarity weight selection
   * @param {number} customSeed - Optional custom seed for pre-determined packs (shop inventory)
   * @returns {Object} - {cards: Array, seed: number}
   *
   * @see generateSalvageSlots for exploration-based rewards with variable counts and salvage
   */
  generateShopPack(packType, tier = 1, customSeed = null) {
    const seed = customSeed !== null ? customSeed : this.getNextSeed();

    const config = packTypes[packType];
    if (!config) {
      debugLog('REWARD_MANAGER', `⚠️ Unknown shop pack type: ${packType}`);
      return { cards: [], seed };
    }

    const rng = createRNG(seed);
    const tierKey = `tier${tier}`;

    const rarityWeights = config.rarityWeights[tierKey] || config.rarityWeights.tier1;
    const allowedRarities = Object.keys(rarityWeights).filter(r => rarityWeights[r] > 0);

    // Shop packs always give max card count
    const cardCount = config.cardCount.max;

    const cards = [];
    for (let i = 0; i < cardCount; i++) {
      // First card uses guaranteed type, others use weighted roll
      const cardType = rollCardType(config, i === 0, rng);
      const rolledRarity = rollRarity(rarityWeights, rng);
      const card = selectCard(cardType, rolledRarity, allowedRarities, rng);

      if (card) {
        cards.push(card);  // Already transformed by selectCard()
      }
    }

    debugLog('REWARD_MANAGER', `Generated shop pack (seed: ${seed})`, {
      packType,
      cardCount: cards.length
    });

    return { cards, seed };
  }

  /**
   * Generate reputation level reward
   *
   * @param {Object} rewardConfig - {packType, tier, level}
   * @returns {Object} - {cards, salvageItem}
   */
  generateReputationReward(rewardConfig) {
    const { packType, tier, level } = rewardConfig;

    // Use POI rewards logic
    return this.generatePOIRewards({
      poiData: { rewardType: packType },
      outcome: 'reputation',
      tier: tier || 1
    });
  }

  /**
   * Generate boss reward
   *
   * DESIGN NOTES:
   * - Boss rewards are special: fixed amounts from boss config in aiData.js
   * - No card generation (credits + aiCores + reputation only)
   * - Seed tracked for replay consistency
   * - Differentiates first-time vs repeat victory (first-time is larger)
   * - Falls back to BOSS_REWARD defaults in cardPackData.js when config missing
   *
   * @param {Object} bossConfig - Boss configuration with firstTimeReward/repeatReward from aiData.js
   * @param {boolean} isFirstVictory - Whether this is the first time defeating this boss
   * @returns {Object} - { credits, aiCores, reputation, seed, isBossReward }
   */
  generateBossReward(bossConfig, isFirstVictory) {
    const seed = this.getNextSeed();

    // Get rewards from config (with fallbacks from cardPackData)
    const defaults = packTypes['BOSS_REWARD'];
    const configReward = isFirstVictory
      ? bossConfig?.firstTimeReward
      : bossConfig?.repeatReward;

    const fallbackReward = isFirstVictory
      ? defaults?.firstTimeDefaults
      : defaults?.repeatDefaults;

    const rewards = {
      credits: configReward?.credits ?? fallbackReward?.credits ?? 0,
      aiCores: configReward?.aiCores ?? fallbackReward?.aiCores ?? 0,
      reputation: configReward?.reputation ?? fallbackReward?.reputation ?? 0,
      seed,
      isBossReward: true
    };

    // Track in history
    this.state.rewardHistory.push({
      timestamp: Date.now(),
      type: 'boss_reward',
      seed,
      content: { ...rewards, isFirstVictory }
    });

    debugLog('REWARD_MANAGER', `Generated boss reward (seed: ${seed})`, {
      isFirstVictory,
      ...rewards
    });

    return rewards;
  }

  /**
   * Add blueprint to unlocked blueprints
   *
   * @param {Object} blueprint - Blueprint object
   */
  unlockBlueprint(blueprint) {
    const profile = metaGameStateManager.getState().singlePlayerProfile;
    const unlockedBlueprints = profile?.unlockedBlueprints || [];

    if (!unlockedBlueprints.includes(blueprint.blueprintId)) {
      metaGameStateManager.setState({
        singlePlayerProfile: {
          ...profile,
          unlockedBlueprints: [...unlockedBlueprints, blueprint.blueprintId]
        }
      });

      debugLog('REWARD_MANAGER', 'Unlocked blueprint', {
        blueprintId: blueprint.blueprintId
      });
    }
  }

  /**
   * Finalize rewards (add to inventory/profile)
   *
   * @param {Object} rewards - Reward object
   * @param {Object} context - {source, timestamp}
   */
  finalizeRewards(rewards, context) {
    // Add cards to inventory
    // Cards have cardId (not id) after transformCardForLoot() transformation
    if (rewards.cards && rewards.cards.length > 0) {
      rewards.cards.forEach(card => {
        metaGameStateManager.addCard(card.cardId, 1);
      });
    }

    // Add credits
    if (rewards.credits) {
      metaGameStateManager.addCredits(rewards.credits, 'reward_finalization');
    }

    debugLog('REWARD_MANAGER', 'Finalized rewards', {
      source: context.source,
      cardCount: rewards.cards?.length || 0,
      credits: rewards.credits || 0
    });
  }

  /**
   * Get current state
   * @returns {Object} - Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset manager (clear history)
   */
  reset() {
    this.state = {
      rewardHistory: [],
      pendingRewards: null
    };
    this.notifySubscribers();

    debugLog('REWARD_MANAGER', 'Reset state');
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback
   * @returns {Function} - Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify subscribers of state change
   * @private
   */
  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.state));
  }
}

// Export singleton instance
const rewardManager = new RewardManager();
export default rewardManager;
