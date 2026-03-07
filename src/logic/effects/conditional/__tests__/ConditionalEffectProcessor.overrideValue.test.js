import { describe, it, expect, beforeEach } from 'vitest';
import ConditionalEffectProcessor from '../ConditionalEffectProcessor.js';

describe('ConditionalEffectProcessor - OVERRIDE_VALUE', () => {
  let processor;
  let mockContext;

  beforeEach(() => {
    processor = new ConditionalEffectProcessor();

    mockContext = {
      actingPlayerId: 'player1',
      playerStates: {
        player1: {
          shipSections: {
            bridge: { allocatedShields: 2, hull: 5, maxHull: 5 }
          }
        },
        player2: {
          shipSections: {
            bridge: { allocatedShields: 0, hull: 5, maxHull: 5 },
            powerCell: { allocatedShields: 0, hull: 5, maxHull: 5 }
          }
        }
      }
    };
  });

  it('overrides count property when condition is met', () => {
    const conditionals = [{
      id: 'test-override',
      timing: 'PRE',
      condition: { type: 'SECTION_EXPOSED', section: 'bridge' },
      grantedEffect: { type: 'OVERRIDE_VALUE', property: 'count', value: 3 }
    }];

    const primaryEffect = { type: 'DISCARD', count: 1, targetPlayer: 'opponent' };

    const result = processor.processPreConditionals(conditionals, primaryEffect, mockContext);

    expect(result.modifiedEffect.count).toBe(3);
  });

  it('overrides amount property when condition is met', () => {
    const conditionals = [{
      id: 'test-override-amount',
      timing: 'PRE',
      condition: { type: 'SECTION_EXPOSED', section: 'powerCell' },
      grantedEffect: { type: 'OVERRIDE_VALUE', property: 'amount', value: 3 }
    }];

    const primaryEffect = { type: 'STEAL_ENERGY', amount: 1, targetPlayer: 'opponent' };

    const result = processor.processPreConditionals(conditionals, primaryEffect, mockContext);

    expect(result.modifiedEffect.amount).toBe(3);
  });

  it('does not override when condition is not met', () => {
    // droneControlHub on player2 has shields (3) — not exposed
    mockContext.playerStates.player2.shipSections.droneControlHub = { allocatedShields: 3, hull: 5, maxHull: 5 };

    const conditionals = [{
      id: 'test-no-override',
      timing: 'PRE',
      condition: { type: 'SECTION_EXPOSED', section: 'droneControlHub' },
      grantedEffect: { type: 'OVERRIDE_VALUE', property: 'count', value: 3 }
    }];

    const primaryEffect = { type: 'DISCARD', count: 1, targetPlayer: 'opponent' };

    const result = processor.processPreConditionals(conditionals, primaryEffect, mockContext);

    expect(result.modifiedEffect.count).toBe(1);
  });

  it('does not override when primaryEffect is null', () => {
    const conditionals = [{
      id: 'test-null-effect',
      timing: 'PRE',
      condition: { type: 'SECTION_EXPOSED', section: 'bridge' },
      grantedEffect: { type: 'OVERRIDE_VALUE', property: 'count', value: 3 }
    }];

    const result = processor.processPreConditionals(conditionals, null, mockContext);

    expect(result.modifiedEffect).toBeNull();
  });
});
