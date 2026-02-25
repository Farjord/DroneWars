import { describe, it, expect } from 'vitest';
import fullCardCollection from '../cardData';

const VALID_RARITIES = ['Common', 'Uncommon', 'Rare', 'Mythic'];
const VALID_TYPES = ['Ordnance', 'Support', 'Tactic', 'Upgrade'];
const REQUIRED_FIELDS = ['id', 'baseCardId', 'name', 'maxInDeck', 'rarity', 'type', 'cost', 'image', 'description', 'effects'];

describe('fullCardCollection', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(fullCardCollection)).toBe(true);
    expect(fullCardCollection.length).toBeGreaterThan(0);
  });

  it('every card has a unique id', () => {
    const ids = fullCardCollection.map((c) => c.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });

  it('every card has all required fields', () => {
    const failures = [];
    for (const card of fullCardCollection) {
      for (const field of REQUIRED_FIELDS) {
        if (!(field in card)) failures.push(`${card.id} missing ${field}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('every card has a valid rarity', () => {
    const failures = fullCardCollection
      .filter((c) => !VALID_RARITIES.includes(c.rarity))
      .map((c) => `${c.id}: ${c.rarity}`);
    expect(failures).toEqual([]);
  });

  it('every card has a valid type', () => {
    const failures = fullCardCollection
      .filter((c) => !VALID_TYPES.includes(c.type))
      .map((c) => `${c.id}: ${c.type}`);
    expect(failures).toEqual([]);
  });

  it('base cards have self-referential baseCardId', () => {
    const baseCards = fullCardCollection.filter((c) => !c.id.toUpperCase().endsWith('_ENHANCED'));
    const failures = baseCards
      .filter((c) => c.baseCardId !== c.id)
      .map((c) => `${c.id}: baseCardId=${c.baseCardId}`);
    expect(failures).toEqual([]);
  });

  it('enhanced cards reference existing base cards', () => {
    const allIds = new Set(fullCardCollection.map((c) => c.id));
    const enhancedCards = fullCardCollection.filter((c) => c.id.toUpperCase().endsWith('_ENHANCED'));
    const failures = [];
    for (const card of enhancedCards) {
      if (!allIds.has(card.baseCardId)) failures.push(`${card.id}: baseCardId=${card.baseCardId} not found`);
      if (!card.id.endsWith('_ENHANCED')) failures.push(`${card.id}: suffix casing wrong`);
    }
    expect(failures).toEqual([]);
  });

  it('every card image follows /DroneWars/cards/ pattern', () => {
    const failures = fullCardCollection
      .filter((c) => !/^\/DroneWars\/cards\/.+\.png$/.test(c.image))
      .map((c) => `${c.id}: ${c.image}`);
    expect(failures).toEqual([]);
  });
});
