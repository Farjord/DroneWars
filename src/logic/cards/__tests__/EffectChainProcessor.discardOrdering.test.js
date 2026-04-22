import { describe, it, expect, vi } from 'vitest';

// Mock modules to break circular dependencies (same pattern as other EffectChainProcessor tests)
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    fireTrigger() {
      return { triggered: false, newPlayerStates: null, animationEvents: [], goAgain: false };
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_CARD_PLAY: 'ON_CARD_PLAY' }
}));
vi.mock('../../gameLogic.js', () => ({
  gameEngine: { updateAuras: vi.fn() },
}));
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  flowCheckpoint: vi.fn(),
}));

import EffectChainProcessor from '../EffectChainProcessor.js';
import { CARD_DISCARD } from '../../../config/animationTypes.js';

describe('EffectChainProcessor — CARD_DISCARD ordering', () => {
  it('CARD_DISCARD event precedes STAT_BUFF in animationEvents for discard+buff chain (Sacrifice for Power pattern)', () => {
    const processor = new EffectChainProcessor();

    const card = {
      id: 'SACRIFICE_FOR_POWER',
      name: 'Sacrifice for Power',
      cost: 0,
      effects: [
        { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' } },
        { type: 'MODIFY_STAT', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' }, mod: { stat: 'attack', value: { ref: 0, field: 'cardCost' }, type: 'temporary' } },
      ],
    };

    const cardToDiscard = { id: 'c1', name: 'Cheap Card', cost: 2, instanceId: 'i1' };
    const targetDrone = { id: 'd1', instanceId: 'di1', name: 'Scout', attack: 1, health: 3, owner: 'player1' };

    const playerStates = {
      player1: {
        hand: [cardToDiscard],
        discardPile: [],
        dronesOnBoard: { left: [targetDrone] },
        energy: 5,
      },
      player2: { hand: [], discardPile: [], dronesOnBoard: {}, energy: 5 },
    };

    const selections = [
      { effectIndex: 0, target: cardToDiscard },
      { effectIndex: 1, target: targetDrone, lane: 'left' },
    ];

    const ctx = {
      playerStates,
      placedSections: {},
      callbacks: {},
      localPlayerId: 'player1',
      gameSeed: 0,
      roundNumber: 1,
    };

    const result = processor.processEffectChain(card, selections, 'player1', ctx);

    const eventTypes = result.animationEvents.map(e => e.type);
    const discardIdx = eventTypes.indexOf(CARD_DISCARD);
    const statBuffIdx = eventTypes.findIndex(t => t === 'STAT_BUFF' || t === 'STAT_DEBUFF');

    expect(discardIdx).toBeGreaterThanOrEqual(0); // CARD_DISCARD event present
    expect(statBuffIdx).toBeGreaterThanOrEqual(0); // STAT_BUFF event present
    expect(discardIdx).toBeLessThan(statBuffIdx);  // discard overlay plays before buff animation

    const discardEvent = result.animationEvents[discardIdx];
    expect(discardEvent.cards).toHaveLength(1);
    expect(discardEvent.cards[0].id).toBe('c1');
    expect(discardEvent.discardingPlayerId).toBe('player1');
  });
});
