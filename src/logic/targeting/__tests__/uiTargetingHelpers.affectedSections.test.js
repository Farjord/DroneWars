import { describe, it, expect } from 'vitest';
import { calculateAffectedSections } from '../uiTargetingHelpers.js';

describe('calculateAffectedSections', () => {
  const opponentPlacedSections = ['weaponsBay', 'bridge', 'droneControlHub'];

  it('returns flank sections (indices 0 and 2) for FLANK_SECTIONS target (Crossfire Pattern)', () => {
    const card = {
      effects: [{
        type: 'CONDITIONAL_SECTION_DAMAGE',
        targets: 'FLANK_SECTIONS',
        targeting: { type: 'NONE' },
      }],
    };
    expect(calculateAffectedSections(card, opponentPlacedSections)).toEqual(['weaponsBay', 'droneControlHub']);
  });

  it('returns all 3 sections for ALL_SECTIONS target (Encirclement)', () => {
    const card = {
      effects: [{
        type: 'CONDITIONAL_SECTION_DAMAGE',
        targets: 'ALL_SECTIONS',
        targeting: { type: 'NONE' },
      }],
    };
    expect(calculateAffectedSections(card, opponentPlacedSections)).toEqual(['weaponsBay', 'bridge', 'droneControlHub']);
  });

  it('returns middle section (index 1) for MIDDLE_SECTION target (Breach the Line)', () => {
    const card = {
      effects: [{
        type: 'CONDITIONAL_SECTION_DAMAGE',
        targets: 'MIDDLE_SECTION',
        targeting: { type: 'NONE' },
      }],
    };
    expect(calculateAffectedSections(card, opponentPlacedSections)).toEqual(['bridge']);
  });

  it('returns null for CORRESPONDING_SECTION target (Overrun — needs target selection)', () => {
    const card = {
      effects: [{
        type: 'CONDITIONAL_SECTION_DAMAGE',
        targets: 'CORRESPONDING_SECTION',
        targeting: { type: 'SHIP_SECTION', affinity: 'ENEMY' },
      }],
    };
    expect(calculateAffectedSections(card, opponentPlacedSections)).toBeNull();
  });

  it('returns null for non-CONDITIONAL_SECTION_DAMAGE card', () => {
    const card = {
      effects: [{
        type: 'DAMAGE',
        targeting: { type: 'DRONE', affinity: 'ENEMY' },
      }],
    };
    expect(calculateAffectedSections(card, opponentPlacedSections)).toBeNull();
  });

  it('returns null for null card', () => {
    expect(calculateAffectedSections(null, opponentPlacedSections)).toBeNull();
  });

  it('returns null for undefined card', () => {
    expect(calculateAffectedSections(undefined, opponentPlacedSections)).toBeNull();
  });

  it('returns null when opponentPlacedSections is null', () => {
    const card = {
      effects: [{
        type: 'CONDITIONAL_SECTION_DAMAGE',
        targets: 'ALL_SECTIONS',
        targeting: { type: 'NONE' },
      }],
    };
    expect(calculateAffectedSections(card, null)).toBeNull();
  });

  it('filters out undefined entries when placed sections has gaps', () => {
    const card = {
      effects: [{
        type: 'CONDITIONAL_SECTION_DAMAGE',
        targets: 'FLANK_SECTIONS',
        targeting: { type: 'NONE' },
      }],
    };
    const partialSections = ['weaponsBay', 'bridge']; // Only 2 sections placed
    expect(calculateAffectedSections(card, partialSections)).toEqual(['weaponsBay']);
  });
});
