// ========================================
// DESTROY TECH EFFECT PROCESSOR TESTS
// ========================================
// Tests for DESTROY_TECH effect — removes tech from techSlots, emits animation event

import { describe, it, expect, vi, beforeEach } from 'vitest';
import DestroyTechEffectProcessor from '../DestroyTechEffectProcessor.js';

const effect = { type: 'DESTROY_TECH' };

const makeTech = (id, name) => ({ id, name, hull: 1, isTech: true });

const makePlayerStates = () => ({
  player1: { techSlots: { lane1: [], lane2: [], lane3: [] } },
  player2: {
    techSlots: {
      lane1: [makeTech('tech_1', 'Proximity Mine')],
      lane2: [makeTech('tech_2', 'Jammer')],
      lane3: []
    }
  }
});

const makeContext = (overrides = {}) => ({
  actingPlayerId: 'player1',
  playerStates: makePlayerStates(),
  target: { id: 'tech_1', lane: 'lane1', owner: 'player2' },
  ...overrides
});

describe('DestroyTechEffectProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new DestroyTechEffectProcessor();
  });

  it('removes tech from correct lane techSlots', () => {
    const result = processor.process(effect, makeContext());
    const lane1Tech = result.newPlayerStates.player2.techSlots.lane1;
    expect(lane1Tech).toHaveLength(0);
  });

  it('returns TECH_DESTROY animation event with correct fields', () => {
    const result = processor.process(effect, makeContext());
    expect(result.animationEvents).toHaveLength(1);
    expect(result.animationEvents[0]).toMatchObject({
      type: 'TECH_DESTROY',
      targetId: 'tech_1',
      targetPlayer: 'player2',
      targetLane: 'lane1',
      targetType: 'tech'
    });
  });

  it('handles missing target gracefully', () => {
    const context = makeContext({ target: null });
    const result = processor.process(effect, context);
    expect(result.animationEvents).toHaveLength(0);
    expect(result.newPlayerStates.player2.techSlots.lane1).toHaveLength(1);
  });

  it('handles target not found in techSlots gracefully', () => {
    const context = makeContext({
      target: { id: 'nonexistent', lane: 'lane1', owner: 'player2' }
    });
    const result = processor.process(effect, context);
    expect(result.animationEvents).toHaveLength(0);
    expect(result.newPlayerStates.player2.techSlots.lane1).toHaveLength(1);
  });

  it('does not affect other tech in same lane', () => {
    const states = makePlayerStates();
    states.player2.techSlots.lane1.push(makeTech('tech_extra', 'Shield Gen'));

    const context = makeContext({ playerStates: states });
    const result = processor.process(effect, context);
    const lane1Tech = result.newPlayerStates.player2.techSlots.lane1;
    expect(lane1Tech).toHaveLength(1);
    expect(lane1Tech[0].id).toBe('tech_extra');
  });

  it('does not affect tech in other lanes', () => {
    const result = processor.process(effect, makeContext());
    expect(result.newPlayerStates.player2.techSlots.lane2).toHaveLength(1);
    expect(result.newPlayerStates.player2.techSlots.lane2[0].id).toBe('tech_2');
  });
});
