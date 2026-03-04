import { describe, it, expect } from 'vitest';
import initializer, { startingDecklist } from '../StateInitializer.js';

describe('StateInitializer — deterministic seeding', () => {
  it('different gameSeed values produce different shuffle orders', () => {
    const deckA = initializer.buildDeckFromList(startingDecklist, 'player1', 111);
    const deckB = initializer.buildDeckFromList(startingDecklist, 'player1', 222);

    // Same size
    expect(deckA.length).toBe(deckB.length);
    expect(deckA.length).toBeGreaterThan(0);

    // Card names should differ in order (comparing first 5 is sufficient)
    const namesA = deckA.slice(0, 5).map(c => c.name);
    const namesB = deckB.slice(0, 5).map(c => c.name);
    expect(namesA).not.toEqual(namesB);
  });

  it('same gameSeed produces identical shuffle order', () => {
    const deckA = initializer.buildDeckFromList(startingDecklist, 'player1', 42);
    const deckB = initializer.buildDeckFromList(startingDecklist, 'player1', 42);

    const namesA = deckA.map(c => c.name);
    const namesB = deckB.map(c => c.name);
    expect(namesA).toEqual(namesB);
  });

  it('gameSeed 0 does not fall back to default seed', () => {
    const deckZero = initializer.buildDeckFromList(startingDecklist, 'player1', 0);
    const deckDefault = initializer.buildDeckFromList(startingDecklist, 'player1', 12345);

    const namesZero = deckZero.slice(0, 5).map(c => c.name);
    const namesDefault = deckDefault.slice(0, 5).map(c => c.name);
    expect(namesZero).not.toEqual(namesDefault);
  });
});
