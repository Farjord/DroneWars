import React from 'react';
import { describe, test, expect } from 'vitest';
import { diffDescriptions, getCardDiffs } from '../cardDiffUtils.jsx';

describe('diffDescriptions', () => {
  test('returns null when texts are identical', () => {
    const result = diffDescriptions(
      'Deal 2 damage to target drone.',
      'Deal 2 damage to target drone.'
    );
    expect(result).toBeNull();
  });

  test('highlights changed number word in orange', () => {
    const result = diffDescriptions(
      'Deal 4 damage to target exhausted enemy drone.',
      'Deal 5 damage to target exhausted enemy drone.'
    );
    expect(result).not.toBeNull();

    // Find the span wrapping "5" — it should have text-orange-400
    const orangeSpans = result.filter(
      el => el.props.className === 'text-orange-400'
    );
    expect(orangeSpans).toHaveLength(1);
    expect(orangeSpans[0].props.children).toBe('5');

    // Non-changed words should NOT have text-orange-400
    const plainSpans = result.filter(
      el => el.props.className !== 'text-orange-400'
    );
    expect(plainSpans.length).toBeGreaterThan(0);
  });

  test('highlights appended words at end in orange', () => {
    const base = 'Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash).';
    const enhanced = 'Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash). If you control 3 or more drones in target lane, deal 2 damage instead.';
    const result = diffDescriptions(base, enhanced);
    expect(result).not.toBeNull();

    const orangeSpans = result.filter(
      el => el.props.className === 'text-orange-400'
    );
    // All appended words (non-whitespace tokens) should be orange
    expect(orangeSpans.length).toBeGreaterThan(0);
    const orangeText = orangeSpans.map(s => s.props.children).join(' ');
    expect(orangeText).toContain('If');
    expect(orangeText).toContain('instead.');
  });

  test('highlights multiple changed words independently', () => {
    const result = diffDescriptions(
      'Deal 2 damage and draw 1 card.',
      'Deal 3 damage and draw 2 cards.'
    );
    expect(result).not.toBeNull();

    const orangeSpans = result.filter(
      el => el.props.className === 'text-orange-400'
    );
    const orangeWords = orangeSpans.map(s => s.props.children);
    expect(orangeWords).toContain('3');
    expect(orangeWords).toContain('2');
    expect(orangeWords).toContain('cards.');
  });

  test('handles empty base string gracefully', () => {
    const result = diffDescriptions('', 'Some new text.');
    expect(result).not.toBeNull();
    const orangeSpans = result.filter(
      el => el.props.className === 'text-orange-400'
    );
    expect(orangeSpans.length).toBeGreaterThan(0);
  });

  test('handles null/undefined strings gracefully', () => {
    expect(diffDescriptions(null, null)).toBeNull();
    expect(diffDescriptions(undefined, undefined)).toBeNull();
    expect(diffDescriptions(null, 'text')).not.toBeNull();
  });
});

describe('getCardDiffs', () => {
  test('cost is true when costs differ', () => {
    const diffs = getCardDiffs(
      { cost: 3, description: 'Same text' },
      { cost: 2, description: 'Same text' }
    );
    expect(diffs.cost).toBe(true);
  });

  test('cost is false when costs are the same', () => {
    const diffs = getCardDiffs(
      { cost: 2, description: 'Same text' },
      { cost: 2, description: 'Same text' }
    );
    expect(diffs.cost).toBe(false);
  });

  test('slots is true when slot costs differ', () => {
    const diffs = getCardDiffs(
      { cost: 3, description: 'Same', slots: 2 },
      { cost: 3, description: 'Same', slots: 1 }
    );
    expect(diffs.slots).toBe(true);
  });

  test('slots is false when slot costs are the same', () => {
    const diffs = getCardDiffs(
      { cost: 3, description: 'Same', slots: 2 },
      { cost: 3, description: 'Same', slots: 2 }
    );
    expect(diffs.slots).toBe(false);
  });

  test('slots is false when neither card has slots', () => {
    const diffs = getCardDiffs(
      { cost: 2, description: 'Same' },
      { cost: 2, description: 'Same' }
    );
    expect(diffs.slots).toBe(false);
  });

  test('descriptionNode is null when descriptions identical', () => {
    const diffs = getCardDiffs(
      { cost: 3, description: 'Deal 2 damage.' },
      { cost: 2, description: 'Deal 2 damage.' }
    );
    expect(diffs.descriptionNode).toBeNull();
  });

  test('descriptionNode is a React node array when descriptions differ', () => {
    const diffs = getCardDiffs(
      { cost: 2, description: 'Deal 4 damage.' },
      { cost: 2, description: 'Deal 5 damage.' }
    );
    expect(diffs.descriptionNode).not.toBeNull();
    expect(Array.isArray(diffs.descriptionNode)).toBe(true);
  });

  // Real card pairs
  test('CONVERGENCE_BEAM: cost-only change (3→2), description identical', () => {
    const diffs = getCardDiffs(
      { cost: 3, description: 'Deal 2 damage to target drone. If target is marked, deal 4 damage instead.' },
      { cost: 2, description: 'Deal 2 damage to target drone. If target is marked, deal 4 damage instead.' }
    );
    expect(diffs.cost).toBe(true);
    expect(diffs.descriptionNode).toBeNull();
  });

  test('FINISHING_VOLLEY: number swap in description (4→5)', () => {
    const diffs = getCardDiffs(
      { cost: 2, description: 'Deal 4 damage to target exhausted enemy drone.' },
      { cost: 2, description: 'Deal 5 damage to target exhausted enemy drone.' }
    );
    expect(diffs.cost).toBe(false);
    expect(diffs.descriptionNode).not.toBeNull();
    const orangeSpans = diffs.descriptionNode.filter(
      el => el.props.className === 'text-orange-400'
    );
    expect(orangeSpans).toHaveLength(1);
    expect(orangeSpans[0].props.children).toBe('5');
  });

  test('BARRAGE: cost change (2→3) + appended clause', () => {
    const diffs = getCardDiffs(
      { cost: 2, description: 'Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash).' },
      { cost: 3, description: 'Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash). If you control 3 or more drones in target lane, deal 2 damage instead.' }
    );
    expect(diffs.cost).toBe(true);
    expect(diffs.descriptionNode).not.toBeNull();
    const orangeSpans = diffs.descriptionNode.filter(
      el => el.props.className === 'text-orange-400'
    );
    expect(orangeSpans.length).toBeGreaterThan(0);
  });

  test('OVERCLOCKED_THRUSTERS: slots change (2→1), rest identical', () => {
    const diffs = getCardDiffs(
      { cost: 3, description: 'Permanently grant all drones of a target type +1 Speed.', slots: 2 },
      { cost: 3, description: 'Permanently grant all drones of a target type +1 Speed.', slots: 1 }
    );
    expect(diffs.cost).toBe(false);
    expect(diffs.slots).toBe(true);
    expect(diffs.descriptionNode).toBeNull();
  });

  test('COMBAT_ENHANCEMENT: slots change (2→1), rest identical', () => {
    const diffs = getCardDiffs(
      { cost: 5, description: 'Permanently increase the attack of all drones of a target type by 1.', slots: 2 },
      { cost: 5, description: 'Permanently increase the attack of all drones of a target type by 1.', slots: 1 }
    );
    expect(diffs.cost).toBe(false);
    expect(diffs.slots).toBe(true);
    expect(diffs.descriptionNode).toBeNull();
  });
});
