# Phase 8: Loot & Rewards

## Overview

Implements pack opening, loot generation, and reward display with tier-based rarity limits.

**Duration:** 1 day | **Dependencies:** Phase 7

---

## Files Created

1. `src/logic/loot/LootGenerator.js` - Pack opening and salvage generation
2. `src/components/modals/LootRevealModal.jsx` - Card flip reveal UI
3. `src/components/modals/LootRevealModal.css` - Reveal animation styles
4. `src/components/modals/RunInventoryModal.jsx` - View collected loot during run
5. `src/components/modals/RunInventoryModal.css` - Inventory modal styles

---

## Key Implementations

### LootGenerator.js

```javascript
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
   * Select a random card matching type and rarity
   * All fallbacks respect tier rarity limits and exclude starter cards
   */
  selectCard(cardType, rarity, allowedRarities, rng) {
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
   * Generate salvage loot from combat (uses enemy deck)
   * Different from pack opening - takes random cards from defeated enemy
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
    }

    // Sort by rarity
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

  // ... seeded RNG and helper methods
}

export default new LootGenerator();
```

### LootRevealModal.jsx

Card flip reveal with full-size ActionCard display:

```jsx
import { useState, useEffect } from 'react';
import { RARITY_COLORS } from '../../data/cardPackData.js';
import fullCardCollection from '../../data/cardData.js';
import ActionCard from '../ui/ActionCard.jsx';
import './LootRevealModal.css';

function LootRevealModal({ loot, onCollect, show }) {
  const [revealedCards, setRevealedCards] = useState(new Set());

  // Reset revealed cards when loot changes
  useEffect(() => {
    if (show) setRevealedCards(new Set());
  }, [show, loot]);

  if (!show || !loot) return null;

  const { cards = [], credits = 0, blueprint } = loot;
  const allRevealed = revealedCards.size >= cards.length;

  const handleCardClick = (index) => {
    if (revealedCards.has(index)) return;
    setRevealedCards(prev => new Set([...prev, index]));
  };

  return (
    <div className="loot-reveal-overlay">
      <div className="loot-reveal-modal">
        <h2 className="loot-reveal-title">SALVAGE ACQUIRED</h2>
        <p className="loot-reveal-subtitle">Click cards to reveal your rewards</p>

        <div className="loot-card-grid">
          {cards.map((item, i) => {
            const isRevealed = revealedCards.has(i);
            const card = fullCardCollection.find(c => c.id === item.cardId);
            const rarityColor = RARITY_COLORS[item.rarity];

            return (
              <div
                key={i}
                className={`loot-card-container ${isRevealed ? 'revealed' : ''}`}
                onClick={() => handleCardClick(i)}
                style={{ '--rarity-color': rarityColor }}
              >
                <div className="loot-card-flipper">
                  {/* Card Back (face-down) */}
                  <div className="loot-card-back" style={{ backgroundColor: rarityColor }}>
                    <div className="card-back-pattern">
                      <span className="card-back-icon">?</span>
                    </div>
                    <span className="card-back-rarity">{item.rarity}</span>
                  </div>

                  {/* Card Front (revealed) - Full ActionCard (225x275px) */}
                  <div className="loot-card-front">
                    {card ? (
                      <ActionCard card={card} />
                    ) : (
                      <div className="card-info-fallback">
                        <p>{item.cardName || 'Unknown Card'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {credits > 0 && (
          <div className="loot-credits">
            <span className="credits-amount">+{credits} Credits</span>
          </div>
        )}

        {blueprint && (
          <div className="loot-blueprint">
            <span className="blueprint-text">BLUEPRINT ACQUIRED!</span>
            <span className="blueprint-name">{blueprint.blueprintId}</span>
          </div>
        )}

        <div className="loot-actions">
          {!allRevealed && (
            <button className="loot-btn loot-btn-secondary" onClick={() => setRevealedCards(new Set(cards.map((_, i) => i)))}>
              Reveal All
            </button>
          )}
          <button
            className={`loot-btn loot-btn-primary ${!allRevealed ? 'disabled' : ''}`}
            onClick={() => onCollect(loot)}
            disabled={!allRevealed}
          >
            {allRevealed ? 'Continue' : 'Reveal cards to continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LootRevealModal;
```

---

## Loot Flow

### PoI Loot (Direct)
```
PoI Encounter (Loot outcome)
  ↓
lootGenerator.openPack(poi.poiData.rewardType, tier)
  ↓
LootRevealModal displays cards (click to flip)
  ↓
User reveals all cards → clicks "Continue"
  ↓
Add to currentRunState.collectedLoot
Add credits to currentRunState.creditsEarned
  ↓
DetectionManager.addDetection(threatIncrease, 'Looting')
  ↓
Return to tactical map
```

### Combat Salvage
```
Combat Victory
  ↓
LootGenerator.generateCombatSalvage(enemyDeck)
  ↓
Select 1-3 random cards (excluding starter deck)
Roll 1% for blueprint
  ↓
LootRevealModal displays salvage
  ↓
Add to collected loot
Return to tactical map
```

---

## Key Design Decisions

### Tier-Based Rarity Limits
- **Tier 1**: Common (90%), Uncommon (10%) - NO Rare/Mythic
- **Tier 2**: Common (70%), Uncommon (20%), Rare (10%)
- **Tier 3**: Common (50%), Uncommon (30%), Rare (15%), Mythic (5%)

All fallback logic respects these limits - a Tier 1 map will NEVER drop Rare or Mythic cards.

### Starter Deck Exclusion
Cards in the starter deck are excluded from all loot pools. Players already have infinite copies of starter cards, so dropping them as loot would be pointless.

### Full-Size Card Display
Cards in LootRevealModal and RunInventoryModal are displayed at full ActionCard size (225x275px) with no scaling, for maximum readability.

---

## Pack Types & Rewards

| Pack Type | Guaranteed Type | Tier 1 Weights |
|-----------|-----------------|----------------|
| ORDNANCE_PACK | Ordnance | Common: 90%, Uncommon: 10% |
| SUPPORT_PACK | Support | Common: 90%, Uncommon: 10% |
| TACTICAL_PACK | Tactic | Common: 90%, Uncommon: 10% |
| UPGRADE_PACK | Upgrade | Common: 90%, Uncommon: 10% |

**Credits per pack:** 10-100 (random from config)
**Combat salvage credits:** 50-100

---

## Validation Checklist

- [x] Pack opening generates cards based on config
- [x] Rarity rolls match tier weights
- [x] Fallbacks respect tier rarity limits (no Mythic on Tier 1)
- [x] Starter deck cards excluded from all pools
- [x] Cards match pack filter (type)
- [x] Credits awarded (configurable range)
- [x] LootRevealModal displays cards face-down
- [x] Click-to-reveal flip animation works
- [x] Full-size ActionCard shown when revealed
- [x] Blueprint drops show special UI
- [x] "Reveal All" button works
- [x] "Continue" button requires all cards revealed
- [x] Collect adds loot to currentRunState
- [x] RunInventoryModal shows collected loot

---

**Phase Status:** ✅ Implemented
