/**
 * LootGenerator.js
 * Handles pack-based loot generation for POI encounters
 * Uses cardPackData.js for pack configurations
 */

import packTypes from '../../data/cardPackData.js';
import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import { starterDeck } from '../../data/playerDeckData.js';
import { starterPoolDroneNames } from '../../data/saveGameSchema.js';
import { calculateAICoresDrop } from '../../data/aiCoresData.js';
import { generateSalvageItemFromValue, SALVAGE_ITEMS } from '../../data/salvageItemData.js';
import { debugLog } from '../../utils/debugLogger.js';

// Starter card IDs to exclude (players have infinite copies)
const STARTER_CARD_IDS = new Set(starterDeck.decklist.map(entry => entry.id));

class LootGenerator {
  /**
   * Open a loot pack and generate cards + credits
   * @param {string} packType - Pack type (ORDNANCE_PACK, SUPPORT_PACK, etc.)
   * @param {number} tier - Map tier (1, 2, or 3) affects rarity weights
   * @param {string} zone - Map zone (core, mid, perimeter) affects card count weights
   * @param {Object} tierConfig - Tier configuration with zoneRewardWeights
   * @param {number} seed - Random seed for deterministic results
   * @returns {Object} { cards: [...], credits: number }
   */
  openPack(packType, tier = 1, zone = null, tierConfig = null, seed = Date.now()) {
    // Normalize CREDITS to CREDITS_PACK for backwards compatibility
    // EncounterController may use 'CREDITS' as fallback for ambush encounters
    const normalizedPackType = packType === 'CREDITS' ? 'CREDITS_PACK' : packType;

    const config = packTypes[normalizedPackType];
    if (!config) {
      console.warn(`Unknown pack type: ${packType}`);
      return { cards: [], credits: 0 };
    }

    const rng = this.createRNG(seed);
    const tierKey = `tier${tier}`;

    // Get rarity weights and allowed rarities for this tier
    const rarityWeights = config.rarityWeights[tierKey] || config.rarityWeights.tier1;
    const allowedRarities = Object.keys(rarityWeights).filter(r => rarityWeights[r] > 0);

    // Get zone-based reward weights (if available)
    const zoneWeights = zone && tierConfig?.zoneRewardWeights?.[zone];

    // Roll card count - use zone-weighted if available, otherwise uniform
    const { min, max } = config.cardCount;
    const cardCount = this._rollWeightedCardCount(min, max, zoneWeights?.cardCountWeights, rng);

    const cards = [];
    for (let i = 0; i < cardCount; i++) {
      // First card uses guaranteed type, others use weighted roll
      const cardType = this.rollCardType(config, i === 0, rng);
      const rarity = this.rollRarity(rarityWeights, rng);
      const card = this.selectCard(cardType, rarity, allowedRarities, rng);

      if (card) {
        cards.push({
          type: 'card',
          cardId: card.id,
          cardName: card.name,
          rarity: card.rarity || 'Common',
          cardType: card.type,
          source: 'pack_' + packType
        });
      }
    }

    // Shuffle cards using seeded RNG for deterministic randomization
    const shuffledCards = this._shuffleArray(cards, rng);

    // Roll credits (from config range) and apply zone multiplier
    const { min: cMin, max: cMax } = config.creditsRange;
    const baseCredits = cMin + Math.floor(rng.random() * (cMax - cMin + 1));
    const creditsMultiplier = zoneWeights?.creditsMultiplier || 1.0;
    const creditValue = Math.round(baseCredits * creditsMultiplier);

    // Generate salvage item instead of flat credits
    const salvageItem = generateSalvageItemFromValue(creditValue, rng);

    return { cards: shuffledCards, salvageItem };
  }

  /**
   * Roll card count with zone-based weighting
   * @param {number} min - Minimum card count
   * @param {number} max - Maximum card count
   * @param {Object} weights - { 1: 80, 2: 15, 3: 5 } weights for each count
   * @param {Object} rng - Random number generator
   * @returns {number} Card count
   */
  _rollWeightedCardCount(min, max, weights, rng) {
    // If no weights provided, use uniform distribution
    if (!weights) {
      return min + Math.floor(rng.random() * (max - min + 1));
    }

    // Build weighted options for valid card counts
    const roll = rng.random() * 100;
    let cumulative = 0;

    for (let count = min; count <= max; count++) {
      cumulative += (weights[count] || 0);
      if (roll < cumulative) {
        return count;
      }
    }

    // Fallback to max if weights don't sum to 100
    return max;
  }

  /**
   * Roll card type based on pack configuration
   * @param {Object} config - Pack configuration
   * @param {boolean} isGuaranteed - Whether this is the guaranteed slot
   * @param {Object} rng - Random number generator
   * @returns {string} Card type (Ordnance, Support, Tactic, Upgrade)
   */
  rollCardType(config, isGuaranteed, rng) {
    if (isGuaranteed && config.guaranteedTypes && config.guaranteedTypes.length > 0) {
      // First card is guaranteed to be the pack's primary type
      return config.guaranteedTypes[0];
    }
    // Additional cards use weighted distribution
    return this.weightedRoll(config.additionalCardWeights, rng);
  }

  /**
   * Roll rarity based on tier weights
   * @param {Object} weights - { Common: 90, Uncommon: 10, ... }
   * @param {Object} rng - Random number generator
   * @returns {string} Rarity (Common, Uncommon, Rare, Mythic)
   */
  rollRarity(weights, rng) {
    return this.weightedRoll(weights, rng) || 'Common';
  }

  /**
   * Select a random card matching type and rarity
   * @param {string} cardType - Card type to filter by
   * @param {string} rarity - Rarity to filter by
   * @param {Array} allowedRarities - Rarities allowed for this tier
   * @param {Object} rng - Random number generator
   * @returns {Object|null} Card template or null
   */
  selectCard(cardType, rarity, allowedRarities, rng) {
    // Helper filters
    const isAllowedRarity = (c) => allowedRarities.includes(c.rarity || 'Common');
    const notStarter = (c) => !STARTER_CARD_IDS.has(c.id);

    // Primary: exact type + rarity
    let pool = fullCardCollection.filter(c =>
      c.type === cardType &&
      (c.rarity || 'Common') === rarity &&
      notStarter(c)
    );

    // Fallback 1: same type, any allowed rarity
    if (pool.length === 0) {
      pool = fullCardCollection.filter(c =>
        c.type === cardType &&
        isAllowedRarity(c) &&
        notStarter(c)
      );
    }

    // Fallback 2: any type, same rarity
    if (pool.length === 0) {
      pool = fullCardCollection.filter(c =>
        (c.rarity || 'Common') === rarity &&
        notStarter(c)
      );
    }

    // Fallback 3: any allowed rarity card
    if (pool.length === 0) {
      pool = fullCardCollection.filter(c =>
        isAllowedRarity(c) &&
        notStarter(c)
      );
    }

    if (pool.length === 0) return null;

    const index = Math.floor(rng.random() * pool.length);
    return pool[index];
  }

  /**
   * Perform weighted random selection
   * @param {Object} weights - { option1: weight1, option2: weight2, ... }
   * @param {Object} rng - Random number generator
   * @returns {string} Selected option key
   */
  weightedRoll(weights, rng) {
    const entries = Object.entries(weights).filter(([_, w]) => w > 0);
    const totalWeight = entries.reduce((sum, [_, w]) => sum + w, 0);

    if (totalWeight === 0) return entries[0]?.[0] || null;

    const roll = rng.random() * totalWeight;
    let cumulative = 0;

    for (const [key, weight] of entries) {
      cumulative += weight;
      if (roll <= cumulative) {
        return key;
      }
    }

    return entries[entries.length - 1]?.[0] || null;
  }

  /**
   * Create seeded random number generator
   * @param {number} seed - Initial seed value
   * @returns {Object} RNG with random() method
   */
  createRNG(seed) {
    let s = typeof seed === 'number' ? seed : Date.now();
    return {
      random: () => {
        // Linear congruential generator
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      }
    };
  }

  /**
   * Generate salvage loot from combat (uses enemy deck)
   * Different from pack opening - takes random cards from defeated enemy
   * @param {Array} enemyDeck - Enemy's deck (card instances)
   * @param {number} tier - Map tier (1, 2, or 3) for AI Cores drop calculation
   * @param {string} aiDifficulty - AI difficulty ('Easy', 'Normal', 'Medium', 'Hard') for drop chance
   * @param {number} seed - Random seed for deterministic results (defaults to Date.now())
   * @returns {Object} { cards: [...], credits: number, aiCores: number }
   */
  generateCombatSalvage(enemyDeck, tier = 1, aiDifficulty = null, seed = Date.now()) {
    const rng = this.createRNG(seed);
    const cards = [];
    const numCards = 1 + Math.floor(rng.random() * 3); // 1-3 cards

    if (enemyDeck && enemyDeck.length > 0) {
      // Filter out starter cards, then shuffle and take random cards
      const eligibleCards = enemyDeck.filter(c => !STARTER_CARD_IDS.has(c.id));
      const shuffled = [...eligibleCards].sort(() => 0.5 - rng.random());

      for (let i = 0; i < numCards && i < shuffled.length; i++) {
        const card = shuffled[i];
        // Look up full card data for rarity
        const cardData = fullCardCollection.find(c => c.id === card.id) || card;

        cards.push({
          type: 'card',
          cardId: card.id,
          cardName: card.name,
          rarity: cardData.rarity || 'Common',
          cardType: cardData.type || 'Unknown',
          source: 'combat_salvage'
        });
      }
    } else {
      // Fallback: random common cards if enemy deck empty (excluding starter cards)
      const commonCards = fullCardCollection.filter(c =>
        (c.rarity === 'Common' || !c.rarity) &&
        !STARTER_CARD_IDS.has(c.id)
      );

      for (let i = 0; i < numCards && commonCards.length > 0; i++) {
        const randomCard = commonCards[Math.floor(rng.random() * commonCards.length)];
        cards.push({
          type: 'card',
          cardId: randomCard.id,
          cardName: randomCard.name,
          rarity: 'Common',
          cardType: randomCard.type || 'Unknown',
          source: 'combat_salvage'
        });
      }
    }

    // Sort by rarity: Common → Mythic (best last)
    const rarityOrder = { Common: 0, Uncommon: 1, Rare: 2, Mythic: 3 };
    cards.sort((a, b) => (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0));

    // Credits from combat: 50-100, converted to salvage item
    const creditValue = 50 + Math.floor(rng.random() * 51);
    const salvageItem = generateSalvageItemFromValue(creditValue, rng);

    // AI Cores from combat: probabilistic drops based on AI difficulty (uses seeded RNG)
    const aiCores = calculateAICoresDrop(tier, aiDifficulty, rng);

    // 1% chance for blueprint (rare drop)
    let blueprint = null;
    if (rng.random() < 0.01) {
      const blueprints = ['BLUEPRINT_GUNSHIP', 'BLUEPRINT_SCOUT', 'BLUEPRINT_FRIGATE'];
      blueprint = {
        type: 'blueprint',
        blueprintId: blueprints[Math.floor(rng.random() * blueprints.length)],
        source: 'combat_salvage_rare'
      };
    }

    return { cards, salvageItem, aiCores, blueprint };
  }

  /**
   * Generate a drone blueprint based on reward type and tier
   * Uses weighted class selection with rarity filtering
   * Filters out starter drones and already-unlocked blueprints
   * @param {string} rewardType - DRONE_BLUEPRINT_LIGHT/MEDIUM/HEAVY
   * @param {number} tier - Map tier (1, 2, or 3)
   * @param {Array<string>} unlockedBlueprints - Array of drone names already unlocked
   * @returns {Object} Blueprint object or { type: 'blueprint_exhausted' } if all exhausted
   */
  generateDroneBlueprint(rewardType, tier = 1, unlockedBlueprints = []) {
    // POI type → class band weights
    const CLASS_BAND_WEIGHTS = {
      'DRONE_BLUEPRINT_LIGHT': { 0: 60, 1: 40, 2: 0 },
      'DRONE_BLUEPRINT_MEDIUM': { 1: 60, 2: 30, 3: 10 },
      'DRONE_BLUEPRINT_HEAVY': { 2: 60, 3: 30, 4: 10 }
    };

    const classBandWeights = CLASS_BAND_WEIGHTS[rewardType];
    if (!classBandWeights) {
      console.warn(`Unknown drone blueprint reward type: ${rewardType}`);
      return null;
    }

    // Tier-based rarity weights
    const rarityWeights = {
      tier1: { Common: 90, Uncommon: 10, Rare: 0 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 15 }
    };

    const weights = rarityWeights[`tier${tier}`] || rarityWeights.tier1;
    const rng = this.createRNG(Date.now());

    // Reroll up to MAX_REROLL_ATTEMPTS times to find an available drone
    const MAX_REROLL_ATTEMPTS = 10;
    let selectedDrone = null;

    for (let attempt = 0; attempt < MAX_REROLL_ATTEMPTS; attempt++) {
      // Roll a class based on POI weights
      const rolledClass = parseInt(this.weightedRoll(classBandWeights, rng));

      // Roll rarity based on tier weights
      const targetRarity = this.rollRarity(weights, rng);

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
        if ((d.rarity || 'Common') !== targetRarity) return false;

        return true;
      });

      // If pool has drones, select one
      if (availableDrones.length > 0) {
        selectedDrone = availableDrones[Math.floor(rng.random() * availableDrones.length)];
        break;
      }

      // Otherwise, reroll class and rarity
    }

    // Check if all classes exhausted
    if (!selectedDrone) {
      // All classes in this POI band have zero unowned drones
      return {
        type: 'blueprint_exhausted',
        poiType: rewardType,
        tier: tier
      };
    }

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
   * Generate higher-tier salvage as fallback for exhausted blueprints
   * @param {string} rolledRarity - The rarity that would have been rolled
   * @param {Object} rng - Random number generator
   * @returns {Object} Salvage item one tier higher
   */
  generateBlueprintFallbackSalvage(rolledRarity, rng) {
    // Map blueprint rarity to one tier higher salvage rarity
    const RARITY_TIER_UP = {
      'Common': 'Uncommon',      // Systems tier salvage
      'Uncommon': 'Rare',         // Artifacts tier salvage
      'Rare': 'Mythic',           // Premium tier salvage
      'Mythic': 'Mythic'          // Capped at Mythic (Premium tier)
    };

    const targetSalvageRarity = RARITY_TIER_UP[rolledRarity] || 'Uncommon';

    // Filter salvage items by rarity
    const eligibleSalvage = SALVAGE_ITEMS.filter(item => item.rarity === targetSalvageRarity);

    if (eligibleSalvage.length === 0) {
      // Fallback to any salvage if somehow no items match
      console.warn(`No salvage items found for rarity ${targetSalvageRarity}`);
      return this.generateSalvageItemFromValue(100, rng);
    }

    // Select random item from eligible pool
    const selectedItem = eligibleSalvage[Math.floor(rng.random() * eligibleSalvage.length)];

    // Roll credit value within item's range
    const creditValue = selectedItem.creditRange.min +
      Math.floor(rng.random() * (selectedItem.creditRange.max - selectedItem.creditRange.min + 1));

    return {
      type: 'salvageItem',
      itemId: selectedItem.id,
      name: selectedItem.name,
      rarity: selectedItem.rarity,
      creditValue: creditValue,
      image: selectedItem.image,
      description: selectedItem.description
    };
  }

  /**
   * Generate salvage slots for a POI (1-5 based on zone)
   * @param {string} packType - Pack type from POI
   * @param {number} tier - Map tier (1, 2, or 3)
   * @param {string} zone - Map zone (perimeter, mid, core)
   * @param {Object} tierConfig - Tier configuration with salvageSlotCountWeights
   * @param {number} seed - Random seed for deterministic results
   * @returns {Array} Array of slot objects: { type, content, revealed }
   */
  generateSalvageSlots(packType, tier = 1, zone = null, tierConfig = null, seed = Date.now()) {
    const config = packTypes[packType];
    const rng = this.createRNG(seed);

    debugLog('SALVAGE_LOOT', '=== Generating Salvage Slots ===');
    debugLog('SALVAGE_LOOT', 'Pack type:', packType);
    debugLog('SALVAGE_LOOT', 'Tier:', tier);
    debugLog('SALVAGE_LOOT', 'Zone:', zone);

    // 1. Roll slot count from zone's salvageSlotCountWeights (1-5)
    const slotCount = this._rollSlotCount(zone, tierConfig, rng);
    debugLog('SALVAGE_LOOT', 'Total slots rolled:', slotCount);

    // Handle TOKEN_REWARD specially - 1 guaranteed token + optional card + salvage items
    if (packType === 'TOKEN_REWARD') {
      const slots = [];

      // Token slot (guaranteed)
      slots.push({
        type: 'token',
        content: {
          tokenType: 'security',
          amount: 1,
          source: 'contraband_cache'
        },
        revealed: false
      });

      // 25% chance for a random card (any type, tier-appropriate rarity)
      const cardChance = 0.25;
      if (rng.random() < cardChance) {
        const tierKey = `tier${tier}`;
        // Use ORDNANCE_PACK rarity weights as reference (same across pack types)
        const rarityWeights = packTypes.ORDNANCE_PACK.rarityWeights[tierKey] || packTypes.ORDNANCE_PACK.rarityWeights.tier1;
        const allowedRarities = Object.keys(rarityWeights).filter(r => rarityWeights[r] > 0);

        // Random card type
        const cardTypes = ['Ordnance', 'Support', 'Tactic', 'Upgrade'];
        const cardType = cardTypes[Math.floor(rng.random() * cardTypes.length)];

        const rarity = this.rollRarity(rarityWeights, rng);
        const card = this.selectCard(cardType, rarity, allowedRarities, rng);

        if (card) {
          slots.push({
            type: 'card',
            content: {
              cardId: card.id,
              cardName: card.name,
              rarity: card.rarity || 'Common',
              cardType: card.type
            },
            revealed: false
          });
        }
      }

      // Remaining slots are salvage items (50-100 credits)
      while (slots.length < slotCount) {
        const creditValue = 50 + Math.floor(rng.random() * 51);
        const salvageItem = generateSalvageItemFromValue(creditValue, rng);
        slots.push({
          type: 'salvageItem',
          content: {
            itemId: salvageItem.itemId,
            name: salvageItem.name,
            creditValue: salvageItem.creditValue,
            image: salvageItem.image,
            description: salvageItem.description
          },
          revealed: false
        });
      }

      debugLog('SALVAGE_LOOT', 'TOKEN_REWARD slots:', slots.map(s => ({ type: s.type, content: s.type === 'token' ? 'security token' : s.content.name || s.content.cardName })));
      return this._shuffleArray(slots, rng);
    }

    // Handle unknown pack type
    if (!config) {
      console.warn(`Unknown pack type: ${packType}`);
      return this._generateDefaultSlots(slotCount, tierConfig, zone, rng);
    }

    // 2. Roll card count using existing zone cardCountWeights (capped at slot count)
    const { min, max } = config.cardCount;
    const zoneWeights = zone && tierConfig?.zoneRewardWeights?.[zone];
    let cardCount = this._rollWeightedCardCount(min, max, zoneWeights?.cardCountWeights, rng);
    debugLog('SALVAGE_LOOT', `Card count rolled: ${cardCount} (range: ${min}-${max})`);

    // Cap card count at slot count
    cardCount = Math.min(cardCount, slotCount);

    // Ensure minimum 1 card for card packs (packs with min >= 1)
    if (min >= 1 && cardCount < 1) {
      cardCount = 1;
      debugLog('SALVAGE_LOOT', 'Enforced minimum 1 card for card pack');
    }

    // 3. Generate cards using existing logic
    const tierKey = `tier${tier}`;
    const rarityWeights = config.rarityWeights[tierKey] || config.rarityWeights.tier1;
    const allowedRarities = Object.keys(rarityWeights).filter(r => rarityWeights[r] > 0);

    const slots = [];

    for (let i = 0; i < cardCount; i++) {
      const cardType = this.rollCardType(config, i === 0, rng);
      const rarity = this.rollRarity(rarityWeights, rng);
      const card = this.selectCard(cardType, rarity, allowedRarities, rng);

      if (card) {
        slots.push({
          type: 'card',
          content: {
            cardId: card.id,
            cardName: card.name,
            rarity: card.rarity || 'Common',
            cardType: card.type
          },
          revealed: false
        });
      }
    }

    // Log cards generated
    const cardSlots = slots.filter(s => s.type === 'card');
    debugLog('SALVAGE_LOOT', `Cards generated (${cardSlots.length}):`, cardSlots.map(s => ({
      cardId: s.content.cardId,
      rarity: s.content.rarity
    })));

    // 4. Generate salvage item slots for remaining slots (replaces flat credits)
    const salvageSlotCount = slotCount - slots.length;
    const { min: cMin, max: cMax } = config.creditsRange;
    const creditsMultiplier = zoneWeights?.creditsMultiplier || 1.0;

    for (let i = 0; i < salvageSlotCount; i++) {
      const baseCredits = cMin + Math.floor(rng.random() * (cMax - cMin + 1));
      const creditValue = Math.round(baseCredits * creditsMultiplier);

      // Generate a salvage item with the rolled credit value
      const salvageItem = generateSalvageItemFromValue(creditValue, rng);

      slots.push({
        type: 'salvageItem',
        content: {
          itemId: salvageItem.itemId,
          name: salvageItem.name,
          creditValue: salvageItem.creditValue,
          image: salvageItem.image,
          description: salvageItem.description
        },
        revealed: false
      });
    }

    // 5. Shuffle slot positions
    const shuffledSlots = this._shuffleArray(slots, rng);

    // Log final slot distribution
    debugLog('SALVAGE_LOOT', 'Final slot distribution:', shuffledSlots.map((s, i) => ({
      slot: i,
      type: s.type,
      name: s.content.cardName || s.content.name
    })));

    return shuffledSlots;
  }

  /**
   * Roll slot count based on zone weighting
   * @param {string} zone - Map zone
   * @param {Object} tierConfig - Tier configuration
   * @param {Object} rng - Random number generator
   * @returns {number} Slot count (1-5)
   */
  _rollSlotCount(zone, tierConfig, rng) {
    const weights = tierConfig?.salvageSlotCountWeights?.[zone];

    if (!weights) {
      // Default: 2-4 slots
      return 2 + Math.floor(rng.random() * 3);
    }

    const roll = rng.random() * 100;
    let cumulative = 0;

    for (let count = 1; count <= 5; count++) {
      cumulative += (weights[count] || 0);
      if (roll < cumulative) {
        return count;
      }
    }

    // Fallback
    return 3;
  }

  /**
   * Generate default salvage item slots for unknown pack types
   * @param {number} slotCount - Number of slots
   * @param {Object} tierConfig - Tier configuration
   * @param {string} zone - Map zone
   * @param {Object} rng - Random number generator
   * @returns {Array} Array of salvage item slots
   */
  _generateDefaultSlots(slotCount, tierConfig, zone, rng) {
    const zoneWeights = zone && tierConfig?.zoneRewardWeights?.[zone];
    const creditsMultiplier = zoneWeights?.creditsMultiplier || 1.0;
    const slots = [];

    for (let i = 0; i < slotCount; i++) {
      const baseCredits = 20 + Math.floor(rng.random() * 31); // 20-50
      const creditValue = Math.round(baseCredits * creditsMultiplier);

      // Generate a salvage item with the rolled credit value
      const salvageItem = generateSalvageItemFromValue(creditValue, rng);

      slots.push({
        type: 'salvageItem',
        content: {
          itemId: salvageItem.itemId,
          name: salvageItem.name,
          creditValue: salvageItem.creditValue,
          image: salvageItem.image,
          description: salvageItem.description
        },
        revealed: false
      });
    }

    return slots;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @param {Object} rng - Random number generator
   * @returns {Array} Shuffled array
   */
  _shuffleArray(array, rng) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Open a pack purchased from shop (max cards, no salvage)
   * Uses seeded RNG for deterministic results
   * @param {string} packType - Pack type (ORDNANCE_PACK, SUPPORT_PACK, etc.)
   * @param {number} tier - Tier (1, 2, or 3) affects rarity weights
   * @param {number} seed - Random seed (required for determinism)
   * @returns {Object} { cards: Array } - NO salvageItem/credits
   */
  openShopPack(packType, tier = 1, seed = Date.now()) {
    const config = packTypes[packType];
    if (!config) return { cards: [] };

    // Use seeded RNG for deterministic generation
    const rng = this.createRNG(seed);

    // Handle tier edge cases - default to tier1 for 0 or less, tier3 for 4+
    const normalizedTier = Math.max(1, Math.min(3, tier || 1));
    const tierKey = `tier${normalizedTier}`;
    const rarityWeights = config.rarityWeights[tierKey] || config.rarityWeights.tier1;
    const allowedRarities = Object.keys(rarityWeights).filter(r => rarityWeights[r] > 0);

    // Shop packs ALWAYS use max card count (never random)
    const cardCount = config.cardCount.max;

    const cards = [];
    for (let i = 0; i < cardCount; i++) {
      const cardType = this.rollCardType(config, i === 0, rng);
      const rarity = this.rollRarity(rarityWeights, rng);
      const card = this.selectCard(cardType, rarity, allowedRarities, rng);

      if (card) {
        cards.push({
          type: 'card',
          cardId: card.id,
          cardName: card.name,
          rarity: card.rarity || 'Common',
          cardType: card.type,
          source: 'shop_pack'
        });
      }
    }

    // Shuffle cards using seeded RNG for deterministic randomization
    const shuffledCards = this._shuffleArray(cards, rng);

    // NO salvage/credits for shop packs - only return cards
    return { cards: shuffledCards };
  }
}

export default new LootGenerator();
