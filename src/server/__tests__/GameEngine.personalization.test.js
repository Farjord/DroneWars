import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/debugLogger.js', () => ({ debugLog: vi.fn() }));
vi.mock('../../utils/flowVerification.js', () => ({ flowCheckpoint: vi.fn(), resetFlowSeq: vi.fn() }));

import GameEngine from '../GameEngine.js';

function makeEngine() {
  return new GameEngine(null, null, null);
}

function makeClientAnimations(actionAnimations = [], systemAnimations = []) {
  return { actionAnimations, systemAnimations };
}

describe('GameEngine._personalizeAnnouncements', () => {
  const PLAYER = 'player1';
  const OPPONENT = 'player2';

  it('PASS_ANNOUNCEMENT becomes "YOU PASSED" for the passer', () => {
    const engine = makeEngine();
    const anim = { animationName: 'PASS_ANNOUNCEMENT', payload: { passedPlayerId: PLAYER } };
    const client = makeClientAnimations([anim]);

    engine._personalizeAnnouncements(client, PLAYER, {});

    expect(anim.payload.text).toBe('YOU PASSED');
  });

  it('PASS_ANNOUNCEMENT becomes "OPPONENT PASSED" for the other player', () => {
    const engine = makeEngine();
    const anim = { animationName: 'PASS_ANNOUNCEMENT', payload: { passedPlayerId: OPPONENT } };
    const client = makeClientAnimations([anim]);

    engine._personalizeAnnouncements(client, PLAYER, {});

    expect(anim.payload.text).toBe('OPPONENT PASSED');
  });

  it('PASS_ANNOUNCEMENT adds phase="playerPass" to payload', () => {
    const engine = makeEngine();
    const anim = { animationName: 'PASS_ANNOUNCEMENT', payload: { passedPlayerId: PLAYER } };
    const client = makeClientAnimations([anim]);

    engine._personalizeAnnouncements(client, PLAYER, {});

    expect(anim.payload.phase).toBe('playerPass');
  });

  it('PHASE_ANNOUNCEMENT deployment: "You Go First" when player is firstPlayerOfRound', () => {
    const engine = makeEngine();
    const anim = { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'deployment' } };
    const client = makeClientAnimations([], [anim]);

    engine._personalizeAnnouncements(client, PLAYER, { firstPlayerOfRound: PLAYER });

    expect(anim.payload.subtitle).toBe('You Go First');
  });

  it('PHASE_ANNOUNCEMENT deployment: "Opponent Goes First" when player is not first', () => {
    const engine = makeEngine();
    const anim = { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'deployment' } };
    const client = makeClientAnimations([], [anim]);

    engine._personalizeAnnouncements(client, PLAYER, { firstPlayerOfRound: OPPONENT });

    expect(anim.payload.subtitle).toBe('Opponent Goes First');
  });

  it('PHASE_ANNOUNCEMENT action: subtitle follows same firstPlayer logic', () => {
    const engine = makeEngine();
    const first = { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'action' } };
    const second = { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'action' } };
    const client1 = makeClientAnimations([first]);
    const client2 = makeClientAnimations([second]);

    engine._personalizeAnnouncements(client1, PLAYER, { firstPlayerOfRound: PLAYER });
    engine._personalizeAnnouncements(client2, OPPONENT, { firstPlayerOfRound: PLAYER });

    expect(first.payload.subtitle).toBe('You Go First');
    expect(second.payload.subtitle).toBe('Opponent Goes First');
  });

  it('PHASE_ANNOUNCEMENT roundAnnouncement: text becomes "ROUND N"', () => {
    const engine = makeEngine();
    const anim = { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'roundAnnouncement' } };
    const client = makeClientAnimations([anim]);

    engine._personalizeAnnouncements(client, PLAYER, { roundNumber: 3 });

    expect(anim.payload.text).toBe('ROUND 3');
  });

  it('PHASE_ANNOUNCEMENT roundAnnouncement: defaults to round 1 when roundNumber missing', () => {
    const engine = makeEngine();
    const anim = { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'roundAnnouncement' } };
    const client = makeClientAnimations([anim]);

    engine._personalizeAnnouncements(client, PLAYER, {});

    expect(anim.payload.text).toBe('ROUND 1');
  });

  it('non-announcement animations pass through unchanged', () => {
    const engine = makeEngine();
    const original = { animationName: 'LASER_FIRE', payload: { damage: 5 } };
    const client = makeClientAnimations([original]);

    engine._personalizeAnnouncements(client, PLAYER, {});

    expect(original).toEqual({ animationName: 'LASER_FIRE', payload: { damage: 5 } });
  });
});
