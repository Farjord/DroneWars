import { describe, it, expect } from 'vitest';
import { buildAnimationSequence } from '../AnimationSequenceBuilder.js';

describe('buildAnimationSequence', () => {
  describe('single-step', () => {
    it('returns only action events when no triggers exist', () => {
      const steps = [{
        actionEvents: [{ type: 'DRONE_MOVEMENT', droneId: 'd1' }],
        triggerEvents: [],
      }];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([{ type: 'DRONE_MOVEMENT', droneId: 'd1' }]);
    });

    it('emits STATE_SNAPSHOT when intermediateState is provided, even without triggers', () => {
      const intermediateState = { player1: {}, player2: {} };
      const steps = [{
        actionEvents: [{ type: 'DRONE_ATTACK' }],
        triggerEvents: [],
        intermediateState,
      }];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'DRONE_ATTACK' },
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: intermediateState },
      ]);
      expect(result.find(e => e.type === 'TRIGGER_CHAIN_PAUSE')).toBeUndefined();
    });

    it('inserts STATE_SNAPSHOT + TRIGGER_CHAIN_PAUSE between action and trigger events', () => {
      const intermediateState = { player1: { hp: 10 }, player2: { hp: 20 } };
      const steps = [{
        actionEvents: [{ type: 'DRONE_MOVEMENT', droneId: 'd1' }],
        triggerEvents: [{ type: 'TRIGGER_FIRED', abilityName: 'Heal' }],
        intermediateState,
      }];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'DRONE_MOVEMENT', droneId: 'd1' },
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: intermediateState },
        { type: 'TRIGGER_CHAIN_PAUSE', duration: 400 },
        { type: 'TRIGGER_FIRED', abilityName: 'Heal' },
      ]);
    });

    it('inserts TRIGGER_CHAIN_PAUSE without STATE_SNAPSHOT when no intermediateState provided', () => {
      const steps = [{
        actionEvents: [{ type: 'DRONE_ATTACK' }],
        triggerEvents: [{ type: 'TRIGGER_FIRED' }],
      }];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'DRONE_ATTACK' },
        { type: 'TRIGGER_CHAIN_PAUSE', duration: 400 },
        { type: 'TRIGGER_FIRED' },
      ]);
    });
  });

  describe('postSnapshotEvents', () => {
    it('inserts postSnapshotEvents after STATE_SNAPSHOT but before TRIGGER_CHAIN_PAUSE', () => {
      const intermediateState = { player1: {}, player2: {} };
      const steps = [{
        actionEvents: [{ type: 'CARD_REVEAL' }],
        triggerEvents: [{ type: 'TRIGGER_FIRED' }],
        intermediateState,
        postSnapshotEvents: [{ type: 'TELEPORT_IN', droneId: 'd2' }],
      }];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'CARD_REVEAL' },
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: intermediateState },
        { type: 'TELEPORT_IN', droneId: 'd2' },
        { type: 'TRIGGER_CHAIN_PAUSE', duration: 400 },
        { type: 'TRIGGER_FIRED' },
      ]);
    });

    it('inserts STATE_SNAPSHOT for postSnapshotEvents even without triggers', () => {
      const intermediateState = { player1: {}, player2: {} };
      const steps = [{
        actionEvents: [],
        triggerEvents: [],
        intermediateState,
        postSnapshotEvents: [{ type: 'TELEPORT_IN', droneId: 'd2' }],
      }];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: intermediateState },
        { type: 'TELEPORT_IN', droneId: 'd2' },
      ]);
    });
  });

  describe('multi-step (per-effect interleaving)', () => {
    it('interleaves action and trigger events per step', () => {
      const state1 = { player1: { step: 1 }, player2: {} };
      const state2 = { player1: { step: 2 }, player2: {} };
      const steps = [
        {
          actionEvents: [{ type: 'EFFECT_1' }],
          triggerEvents: [{ type: 'TRIGGER_FIRED', source: 'effect1' }],
          intermediateState: state1,
        },
        {
          actionEvents: [{ type: 'EFFECT_2' }],
          triggerEvents: [{ type: 'TRIGGER_FIRED', source: 'effect2' }],
          intermediateState: state2,
        },
      ];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'EFFECT_1' },
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: state1 },
        { type: 'TRIGGER_CHAIN_PAUSE', duration: 400 },
        { type: 'TRIGGER_FIRED', source: 'effect1' },
        { type: 'EFFECT_2' },
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: state2 },
        { type: 'TRIGGER_CHAIN_PAUSE', duration: 400 },
        { type: 'TRIGGER_FIRED', source: 'effect2' },
      ]);
    });

    it('emits STATE_SNAPSHOT after step 0 action events when intermediateState is provided, even without triggers', () => {
      const state1 = { player1: {}, player2: {} };
      const steps = [
        {
          actionEvents: [{ type: 'EFFECT_1' }],
          triggerEvents: [],
          intermediateState: state1,
        },
        {
          actionEvents: [{ type: 'EFFECT_2' }],
          triggerEvents: [{ type: 'TRIGGER_FIRED' }],
          intermediateState: state1,
        },
      ];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'EFFECT_1' },
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: state1 },
        { type: 'EFFECT_2' },
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: state1 },
        { type: 'TRIGGER_CHAIN_PAUSE', duration: 400 },
        { type: 'TRIGGER_FIRED' },
      ]);
    });

    it('handles ON_CARD_PLAY final step with empty actionEvents', () => {
      const state1 = { player1: {}, player2: {} };
      const steps = [
        {
          actionEvents: [{ type: 'DAMAGE_EFFECT' }],
          triggerEvents: [],
          intermediateState: state1,
        },
        {
          actionEvents: [],
          triggerEvents: [{ type: 'TRIGGER_FIRED', source: 'ON_CARD_PLAY' }],
          intermediateState: null,
        },
      ];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'DAMAGE_EFFECT' },
        { type: 'STATE_SNAPSHOT', snapshotPlayerStates: state1 },
        { type: 'TRIGGER_CHAIN_PAUSE', duration: 400 },
        { type: 'TRIGGER_FIRED', source: 'ON_CARD_PLAY' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty steps', () => {
      expect(buildAnimationSequence([])).toEqual([]);
    });

    it('handles step with only triggerEvents (no actionEvents)', () => {
      const steps = [{
        actionEvents: [],
        triggerEvents: [{ type: 'TRIGGER_FIRED' }],
      }];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([
        { type: 'TRIGGER_CHAIN_PAUSE', duration: 400 },
        { type: 'TRIGGER_FIRED' },
      ]);
    });

    it('handles step with defaults (missing optional fields)', () => {
      const steps = [{}];
      const result = buildAnimationSequence(steps);
      expect(result).toEqual([]);
    });
  });
});
