/**
 * buildActionCardTooltipItems.test.js
 * TDD tests for the pure buildActionCardTooltipItems utility function.
 * Tests that action card state is correctly mapped to tooltip item arrays.
 */

import { describe, it, expect } from 'vitest';
import { buildActionCardTooltipItems } from '../ActionCardTooltipPanel.jsx';

// --- Helpers ---

/** Minimal action card with no special properties */
const baseCard = () => ({
  id: 'card_1',
  instanceId: 'card_1_inst',
  name: 'Test Card',
  cost: 2,
  effects: [{}],
});

/** Assert that an item has the required shape */
const assertItemShape = (item) => {
  expect(item).toHaveProperty('key');
  expect(item).toHaveProperty('icon');
  expect(item).toHaveProperty('label');
  expect(item).toHaveProperty('description');
  expect(item).toHaveProperty('accentColor');
};

// --- Tests ---

describe('buildActionCardTooltipItems', () => {
  it('returns empty array for playable card with no special properties', () => {
    const card = baseCard();
    const result = buildActionCardTooltipItems(card, [], {});
    expect(result).toEqual([]);
  });

  it('returns warning items when given unplayable reasons array', () => {
    const card = baseCard();
    const reasons = ['Not enough energy (need 5, have 2)'];
    const result = buildActionCardTooltipItems(card, reasons, {});
    expect(result.length).toBeGreaterThan(0);
    result.forEach(assertItemShape);
  });

  it.each([
    ['Not enough energy (need 5, have 2)', 'not-enough-energy'],
    ['Not enough momentum (need 1, have 0)', 'not-enough-momentum'],
    ['No valid targets', 'no-valid-targets'],
    ['Lane control requirement not met', 'lane-control-not-met'],
    ['Play condition not met', 'play-condition-not-met'],
    ['Not your turn', 'not-your-turn'],
    ['You have passed', 'player-passed'],
    ['Not in the Action Phase', 'wrong-phase'],
  ])('maps reason "%s" to warning key "%s" with correct shape', (reason, expectedKey) => {
    const result = buildActionCardTooltipItems(baseCard(), [reason], {});
    const warning = result.find(i => i.key === expectedKey);
    expect(warning).toBeDefined();
    assertItemShape(warning);
    expect(warning.accentColor).toMatch(/amber/);
  });

  it('returns go-again item when card has effect.goAgain', () => {
    const card = { ...baseCard(), effects: [{ goAgain: true }] };
    const result = buildActionCardTooltipItems(card, [], {});
    const item = result.find(i => i.key === 'go-again');
    expect(item).toBeDefined();
    assertItemShape(item);
  });

  it('returns momentum-cost item when card has momentumCost', () => {
    const card = { ...baseCard(), momentumCost: 1 };
    const result = buildActionCardTooltipItems(card, [], {});
    const item = result.find(i => i.key === 'momentum-cost');
    expect(item).toBeDefined();
    assertItemShape(item);
  });

  it('returns lanes-controlled item when card has LANES_CONTROLLED repeat condition', () => {
    const card = {
      ...baseCard(),
      effects: [{ repeat: { type: 'LANES_CONTROLLED' } }],
    };
    const result = buildActionCardTooltipItems(card, [], {});
    const item = result.find(i => i.key === 'lanes-controlled');
    expect(item).toBeDefined();
    assertItemShape(item);
  });

  it('returns momentum-bonus item when card has momentum bonus and actionsTakenThisTurn >= 1', () => {
    const card = {
      ...baseCard(),
      effects: [{
        conditionals: [{ condition: { type: 'NOT_FIRST_ACTION' } }],
      }],
    };
    const result = buildActionCardTooltipItems(card, [], { actionsTakenThisTurn: 1 });
    const item = result.find(i => i.key === 'momentum-bonus');
    expect(item).toBeDefined();
    assertItemShape(item);
  });

  it('does not return momentum-bonus when actionsTakenThisTurn is 0', () => {
    const card = {
      ...baseCard(),
      effects: [{
        conditionals: [{ condition: { type: 'NOT_FIRST_ACTION' } }],
      }],
    };
    const result = buildActionCardTooltipItems(card, [], { actionsTakenThisTurn: 0 });
    const item = result.find(i => i.key === 'momentum-bonus');
    expect(item).toBeUndefined();
  });

  it('warning items always appear before property items in output', () => {
    const card = {
      ...baseCard(),
      effects: [{ goAgain: true }],
    };
    const reasons = ['Not enough energy (need 5, have 2)'];
    const result = buildActionCardTooltipItems(card, reasons, {});

    const warningIndex = result.findIndex(i => i.key === 'not-enough-energy');
    const propertyIndex = result.findIndex(i => i.key === 'go-again');
    expect(warningIndex).toBeLessThan(propertyIndex);
  });

  it('does not include warning items when reasons array is empty', () => {
    const card = { ...baseCard(), effects: [{ goAgain: true }] };
    const result = buildActionCardTooltipItems(card, [], {});

    const warningKeys = [
      'not-enough-energy', 'not-enough-momentum', 'no-valid-targets',
      'lane-control-not-met', 'play-condition-not-met', 'not-your-turn',
      'player-passed', 'wrong-phase',
    ];
    const warnings = result.filter(i => warningKeys.includes(i.key));
    expect(warnings).toHaveLength(0);
  });
});
