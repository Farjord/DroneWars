import { describe, it, expect } from 'vitest';
import fullCardCollection from '../cardData';
import { RARITY_COLORS } from '../rarityColors';

const VALID_RARITIES = ['Common', 'Uncommon', 'Rare', 'Mythic'];
const VALID_TYPES = ['Ordnance', 'Support', 'Tactic', 'Upgrade'];
const REQUIRED_FIELDS = ['id', 'baseCardId', 'name', 'maxInDeck', 'rarity', 'type', 'cost', 'image', 'description', 'effect'];

describe('fullCardCollection', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(fullCardCollection)).toBe(true);
    expect(fullCardCollection.length).toBeGreaterThan(0);
  });

  describe('required fields', () => {
    fullCardCollection.forEach((card) => {
      it(`${card.id} has all required fields`, () => {
        for (const field of REQUIRED_FIELDS) {
          expect(card).toHaveProperty(field);
        }
      });
    });
  });

  describe('unique IDs', () => {
    it('every card has a unique id', () => {
      const ids = fullCardCollection.map((c) => c.id);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(duplicates).toEqual([]);
    });
  });

  describe('valid rarity values', () => {
    fullCardCollection.forEach((card) => {
      it(`${card.id} has a valid rarity`, () => {
        expect(VALID_RARITIES).toContain(card.rarity);
      });
    });
  });

  describe('valid type values', () => {
    fullCardCollection.forEach((card) => {
      it(`${card.id} has a valid type`, () => {
        expect(VALID_TYPES).toContain(card.type);
      });
    });
  });

  describe('enhanced card baseCardId matching', () => {
    const enhancedCards = fullCardCollection.filter((c) => c.id.toUpperCase().endsWith('_ENHANCED'));
    const baseIds = new Set(fullCardCollection.map((c) => c.id));

    enhancedCards.forEach((card) => {
      it(`${card.id} references an existing base card via baseCardId`, () => {
        expect(baseIds).toContain(card.baseCardId);
      });

      it(`${card.id} has _ENHANCED suffix in correct casing`, () => {
        expect(card.id).toMatch(/_ENHANCED$/);
      });
    });
  });

  describe('image paths', () => {
    fullCardCollection.forEach((card) => {
      it(`${card.id} image path follows /DroneWars/cards/ pattern`, () => {
        expect(card.image).toMatch(/^\/DroneWars\/cards\/.+\.png$/);
      });
    });
  });
});

describe('RARITY_COLORS', () => {
  it('has keys matching all valid rarities', () => {
    expect(Object.keys(RARITY_COLORS).sort()).toEqual([...VALID_RARITIES].sort());
  });

  it('all values are valid hex color strings', () => {
    for (const color of Object.values(RARITY_COLORS)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
