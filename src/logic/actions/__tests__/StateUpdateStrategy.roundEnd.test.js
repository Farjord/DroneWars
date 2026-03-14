// ========================================
// STATE UPDATE STRATEGY - ROUND END TRIGGERS TESTS
// ========================================
// Tests that processRoundEndTriggers maps and captures animation events

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processRoundEndTriggers } from '../StateUpdateStrategy.js';

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

describe('StateUpdateStrategy - processRoundEndTriggers', () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      setState: vi.fn(),
      mapAnimationEvents: vi.fn((events) =>
        events.map(e => ({ ...e, mapped: true }))
      ),
      captureAnimations: vi.fn(),
    };
  });

  it('maps and captures animation events when present', async () => {
    const animationEvents = [
      { type: 'effect', name: 'heal' },
      { type: 'effect', name: 'shield' }
    ];
    const payload = {
      player1: { hand: [] },
      player2: { hand: [] },
      animationEvents
    };

    await processRoundEndTriggers(payload, ctx);

    expect(ctx.mapAnimationEvents).toHaveBeenCalledWith(animationEvents);
    expect(ctx.captureAnimations).toHaveBeenCalledWith([
      { type: 'effect', name: 'heal', mapped: true },
      { type: 'effect', name: 'shield', mapped: true }
    ]);
  });

  it('sets state with player1 and player2', async () => {
    const payload = {
      player1: { hand: ['a'] },
      player2: { hand: ['b'] },
      animationEvents: [{ type: 'effect' }]
    };

    await processRoundEndTriggers(payload, ctx);

    expect(ctx.setState).toHaveBeenCalledWith(
      { player1: { hand: ['a'] }, player2: { hand: ['b'] } },
      'ROUND_END_TRIGGERS'
    );
  });

  it('works without animationEvents in payload (backward compat)', async () => {
    const payload = {
      player1: { hand: [] },
      player2: { hand: [] }
    };

    await processRoundEndTriggers(payload, ctx);

    expect(ctx.setState).toHaveBeenCalled();
    expect(ctx.mapAnimationEvents).not.toHaveBeenCalled();
    expect(ctx.captureAnimations).not.toHaveBeenCalled();
  });
});
