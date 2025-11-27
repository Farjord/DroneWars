/**
 * LootGenerator.js
 * Handles pack-based loot generation for POI encounters
 * Uses cardPackData.js for pack configurations
 */

import packTypes from '../../data/cardPackData.js';
import fullCardCollection from '../../data/cardData.js';
import { starterDeck } from '../../data/playerDeckData.js';

// Starter card IDs to exclude (players have infinite copies)
const STARTER_CARD_IDS = new Set(starterDeck.decklist.map(entry => entry.id));

class LootGenerator {
  /**
   * Open a loot pack and generate cards + credits
   * @param {string} packType - Pack type (ORDNANCE_PACK, SUPPORT_PACK, etc.)
   * @param {number} tier - Map tier (1, 2, or 3) affects rarity weights
   * @param {number} seed - Random seed for deterministic results
   * @returns {Object} { cards: [...], credits: number }
   */
  openPack(packType, tier = 1, seed = Date.now()) {
    const config = packTypes[packType];
    if (!config) {
      console.warn(`Unknown pack type: ${packType}`);
      return { cards: [], credits: 0 };
    }

    const rng = this.createRNG(seed);
    const tierKey = `tier${tier}`;

    // Get rarity weights and allowed rarities for this tier
    const rarityWeights = config.rarityWeights[tierKey] || config.rarityWeights.tier1;
    const allowedRarities = Object.keys(rarityWeights).filter(r => rarityWeights[r] > 0);

    // Roll card count (from config min/max)
    const { min, max } = config.cardCount;
    const cardCount = min + Math.floor(rng.random() * (max - min + 1));

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

    // Sort by rarity: Common → Uncommon → Rare → Mythic (best last)
    const rarityOrder = { Common: 0, Uncommon: 1, Rare: 2, Mythic: 3 };
    cards.sort((a, b) => (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0));

    // Roll credits (from config range)
    const { min: cMin, max: cMax } = config.creditsRange;
    const credits = cMin + Math.floor(rng.random() * (cMax - cMin + 1));

    return { cards, credits };
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
   * @returns {Object} { cards: [...], credits: number }
   */
  generateCombatSalvage(enemyDeck) {
    const cards = [];
    const numCards = 1 + Math.floor(Math.random() * 3); // 1-3 cards

    if (enemyDeck && enemyDeck.length > 0) {
      // Filter out starter cards, then shuffle and take random cards
      const eligibleCards = enemyDeck.filter(c => !STARTER_CARD_IDS.has(c.id));
      const shuffled = [...eligibleCards].sort(() => 0.5 - Math.random());

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
        const randomCard = commonCards[Math.floor(Math.random() * commonCards.length)];
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

    // Credits from combat: 50-100
    const credits = 50 + Math.floor(Math.random() * 51);

    // 1% chance for blueprint (rare drop)
    let blueprint = null;
    if (Math.random() < 0.01) {
      const blueprints = ['BLUEPRINT_GUNSHIP', 'BLUEPRINT_SCOUT', 'BLUEPRINT_FRIGATE'];
      blueprint = {
        type: 'blueprint',
        blueprintId: blueprints[Math.floor(Math.random() * blueprints.length)],
        source: 'combat_salvage_rare'
      };
    }

    return { cards, credits, blueprint };
  }
}

export default new LootGenerator();
