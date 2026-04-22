import { describe, it, expect } from 'vitest';
import DiscardEffectProcessor from '../DiscardEffectProcessor.js';

const processor = new DiscardEffectProcessor();

function makeContext(hand = []) {
  return {
    actingPlayerId: 'player1',
    playerStates: {
      player1: { hand: [{ id: 'c1', name: 'Test Card', cost: 2, instanceId: 'i1' }], discardPile: [] },
      player2: { hand, discardPile: [] },
    },
    gameSeed: 0,
    roundNumber: 1,
  };
}

describe('DiscardEffectProcessor — animation events', () => {
  it('emits CARD_DISCARD with discarded cards and discardingPlayerId when opponent discards', () => {
    const hand = [
      { id: 'a1', name: 'Alpha', cost: 1, instanceId: 'ia1' },
      { id: 'b1', name: 'Beta', cost: 2, instanceId: 'ib1' },
    ];
    const ctx = makeContext(hand);
    const result = processor.process({ type: 'DISCARD', count: 2 }, ctx);

    expect(result.animationEvents).toHaveLength(1);
    const event = result.animationEvents[0];
    expect(event.type).toBe('CARD_DISCARD');
    expect(event.discardingPlayerId).toBe('player2');
    expect(event.cards).toHaveLength(2);
    expect(event.cards.map(c => c.id)).toEqual(expect.arrayContaining(['a1', 'b1']));
  });

  it('emits CARD_DISCARD targeting self when effect.targetPlayer is "self"', () => {
    const hand = [{ id: 'x1', name: 'X', cost: 0, instanceId: 'ix1' }];
    const ctx = {
      actingPlayerId: 'player1',
      playerStates: {
        player1: { hand, discardPile: [] },
        player2: { hand: [], discardPile: [] },
      },
      gameSeed: 0,
      roundNumber: 1,
    };
    const result = processor.process({ type: 'DISCARD', count: 1, targetPlayer: 'self' }, ctx);

    expect(result.animationEvents).toHaveLength(1);
    expect(result.animationEvents[0].discardingPlayerId).toBe('player1');
    expect(result.animationEvents[0].cards).toHaveLength(1);
  });

  it('emits no animation event when hand is empty', () => {
    const ctx = makeContext([]);
    const result = processor.process({ type: 'DISCARD', count: 2 }, ctx);
    expect(result.animationEvents).toHaveLength(0);
  });
});
