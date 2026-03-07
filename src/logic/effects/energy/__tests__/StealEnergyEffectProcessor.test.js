import { describe, it, expect, beforeEach } from 'vitest';
import StealEnergyEffectProcessor from '../StealEnergyEffectProcessor.js';

describe('StealEnergyEffectProcessor', () => {
  let processor;
  let mockContext;

  beforeEach(() => {
    processor = new StealEnergyEffectProcessor();

    mockContext = {
      actingPlayerId: 'player1',
      playerStates: {
        player1: { energy: 5 },
        player2: { energy: 8 }
      },
      placedSections: {
        player1: ['powerCell'],
        player2: ['powerCell']
      }
    };
  });

  it('steals energy from opponent and gains for self', () => {
    const effect = { type: 'STEAL_ENERGY', amount: 2, targetPlayer: 'opponent' };
    const result = processor.process(effect, mockContext);

    expect(result.newPlayerStates.player2.energy).toBe(6); // 8 - 2
    expect(result.newPlayerStates.player1.energy).toBe(7); // 5 + 2
  });

  it('clamps drain to opponent available energy', () => {
    mockContext.playerStates.player2.energy = 1;

    const effect = { type: 'STEAL_ENERGY', amount: 3, targetPlayer: 'opponent' };
    const result = processor.process(effect, mockContext);

    expect(result.newPlayerStates.player2.energy).toBe(0); // 1 - 1 (clamped)
    expect(result.newPlayerStates.player1.energy).toBe(6); // 5 + 1 (actual drained)
  });

  it('handles stealing when opponent has 0 energy', () => {
    mockContext.playerStates.player2.energy = 0;

    const effect = { type: 'STEAL_ENERGY', amount: 3, targetPlayer: 'opponent' };
    const result = processor.process(effect, mockContext);

    expect(result.newPlayerStates.player2.energy).toBe(0);
    expect(result.newPlayerStates.player1.energy).toBe(5); // unchanged
  });

  it('works when player2 is acting', () => {
    mockContext.actingPlayerId = 'player2';

    const effect = { type: 'STEAL_ENERGY', amount: 2, targetPlayer: 'opponent' };
    const result = processor.process(effect, mockContext);

    expect(result.newPlayerStates.player1.energy).toBe(3); // 5 - 2
    expect(result.newPlayerStates.player2.energy).toBe(10); // 8 + 2
  });

  it('treats negative amount as 0', () => {
    const effect = { type: 'STEAL_ENERGY', amount: -5, targetPlayer: 'opponent' };
    const result = processor.process(effect, mockContext);

    expect(result.newPlayerStates.player2.energy).toBe(8);
    expect(result.newPlayerStates.player1.energy).toBe(5);
  });
});
