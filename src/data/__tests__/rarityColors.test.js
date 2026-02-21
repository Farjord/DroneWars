import { describe, it, expect } from 'vitest';
import { RARITY_COLORS } from '../rarityColors';

describe('RARITY_COLORS', () => {
  it('contains all four rarity keys', () => {
    expect(Object.keys(RARITY_COLORS).sort()).toEqual(
      ['Common', 'Mythic', 'Rare', 'Uncommon']
    );
  });

  it('all values are valid hex color strings', () => {
    for (const color of Object.values(RARITY_COLORS)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
