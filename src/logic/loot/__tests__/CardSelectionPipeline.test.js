import { describe, it, expect } from 'vitest';
import { selectCard } from '../CardSelectionPipeline';
import fullCardCollection from '../../../data/cardData';

// Precondition: verify faction cards exist in the collection
const markCards = fullCardCollection.filter(c => c.faction === 'MARK' && !c.id.endsWith('_ENHANCED'));
const movementCards = fullCardCollection.filter(c => c.faction === 'MOVEMENT' && !c.id.endsWith('_ENHANCED'));
const neutralCards = fullCardCollection.filter(c => c.faction === 'NEUTRAL_1' && !c.id.endsWith('_ENHANCED'));

// Deterministic RNG for reproducible tests
function createSeededRng(seed) {
  let s = seed;
  return {
    random() {
      s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
      return (s >>> 0) / 0xFFFFFFFF;
    }
  };
}

// Verify enhanced cards exist in the collection (test precondition)
const enhancedCards = fullCardCollection.filter(c => c.id.endsWith('_ENHANCED'));

describe('CardSelectionPipeline - enhanced card exclusion', () => {
  it('has _ENHANCED cards in the card collection (precondition)', () => {
    expect(enhancedCards.length).toBeGreaterThan(0);
  });

  it('selectCard() never returns an _ENHANCED card across many iterations', () => {
    const iterations = 500;
    const allowedRarities = ['Common', 'Uncommon', 'Rare', 'Mythic'];
    const types = ['Ordnance', 'Support', 'Tactic', 'Upgrade'];

    for (let i = 0; i < iterations; i++) {
      const rng = createSeededRng(i * 7 + 42);
      const type = types[i % types.length];
      const rarity = allowedRarities[i % allowedRarities.length];
      const card = selectCard(type, rarity, allowedRarities, rng);

      if (card) {
        expect(card.cardId).not.toMatch(/_ENHANCED$/);
      }
    }
  });

  it('fallback levels also exclude enhanced cards', () => {
    // Use a type/rarity combo unlikely to match — forces fallbacks
    const rng = createSeededRng(999);
    const card = selectCard('Ordnance', 'Mythic', ['Mythic'], rng);
    if (card) {
      expect(card.cardId).not.toMatch(/_ENHANCED$/);
    }
  });
});

describe('CardSelectionPipeline - faction filtering', () => {
  it('has faction cards in the collection (precondition)', () => {
    expect(markCards.length).toBeGreaterThan(0);
    expect(movementCards.length).toBeGreaterThan(0);
    expect(neutralCards.length).toBeGreaterThan(0);
  });

  it('returns only MARK and NEUTRAL_1 cards when accessibleFactions is [MARK, NEUTRAL_1]', () => {
    const allowedRarities = ['Common', 'Uncommon', 'Rare', 'Mythic'];
    const factions = ['MARK', 'NEUTRAL_1'];

    for (let i = 0; i < 100; i++) {
      const rng = createSeededRng(i * 13 + 7);
      const card = selectCard('Ordnance', 'Common', allowedRarities, rng, factions);
      if (card) {
        const fullCard = fullCardCollection.find(c => c.id === card.cardId);
        expect(['MARK', 'NEUTRAL_1']).toContain(fullCard.faction);
      }
    }
  });

  it('returns only NEUTRAL_1 cards when accessibleFactions is [NEUTRAL_1]', () => {
    const allowedRarities = ['Common', 'Uncommon', 'Rare', 'Mythic'];
    const factions = ['NEUTRAL_1'];

    for (let i = 0; i < 100; i++) {
      const rng = createSeededRng(i * 17 + 3);
      const card = selectCard(null, 'Common', allowedRarities, rng, factions);
      if (card) {
        const fullCard = fullCardCollection.find(c => c.id === card.cardId);
        expect(fullCard.faction).toBe('NEUTRAL_1');
      }
    }
  });

  it('returns any card when accessibleFactions is null (backwards compat)', () => {
    const allowedRarities = ['Common', 'Uncommon', 'Rare', 'Mythic'];
    const rng = createSeededRng(42);
    const card = selectCard('Ordnance', 'Common', allowedRarities, rng, null);
    expect(card).not.toBeNull();
  });

  it('falls through to full pool when faction pool is empty', () => {
    const allowedRarities = ['Common', 'Uncommon', 'Rare', 'Mythic'];
    // Use a faction with no cards assigned — should fall through
    const factions = ['NONEXISTENT_FACTION'];
    const rng = createSeededRng(99);
    const card = selectCard('Ordnance', 'Common', allowedRarities, rng, factions);
    expect(card).not.toBeNull();
  });

  it('fallback chain operates within faction-filtered pool', () => {
    const allowedRarities = ['Common', 'Uncommon'];
    const factions = ['MARK', 'NEUTRAL_1'];

    // Request Mythic rarity (not in allowedRarities) — should fallback within faction pool
    const rng = createSeededRng(55);
    const card = selectCard('Ordnance', 'Mythic', allowedRarities, rng, factions);
    if (card) {
      const fullCard = fullCardCollection.find(c => c.id === card.cardId);
      expect(['MARK', 'NEUTRAL_1']).toContain(fullCard.faction);
    }
  });
});
