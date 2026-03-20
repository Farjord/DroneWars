import { describe, it, expect } from 'vitest';
import { selectCard } from '../CardSelectionPipeline';
import fullCardCollection from '../../../data/cardData';

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
