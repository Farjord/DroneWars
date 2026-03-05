import { describe, it, expect, vi, beforeEach } from 'vitest';
import OptimisticAnimationTracker from '../OptimisticAnimationTracker.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

describe('OptimisticAnimationTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new OptimisticAnimationTracker();
  });

  describe('trackAction', () => {
    it('stores action and system animations', () => {
      const animations = {
        actionAnimations: [
          { animationName: 'ATTACK', payload: { targetId: 'card1' } },
          { animationName: 'HEAL', payload: { targetId: 'card2' } },
        ],
        systemAnimations: [
          { animationName: 'PHASE_CHANGE', payload: {} },
        ],
      };

      tracker.trackAction(animations);

      const status = tracker.getStatus();
      expect(status.actionAnimationsTracked).toBe(2);
      expect(status.systemAnimationsTracked).toBe(1);
    });

    it('handles missing animation arrays gracefully', () => {
      tracker.trackAction({});

      const status = tracker.getStatus();
      expect(status.actionAnimationsTracked).toBe(0);
      expect(status.systemAnimationsTracked).toBe(0);
    });

    it('accumulates across multiple trackAction calls', () => {
      tracker.trackAction({ actionAnimations: [{ animationName: 'A', payload: {} }] });
      tracker.trackAction({ actionAnimations: [{ animationName: 'B', payload: {} }] });

      expect(tracker.getStatus().actionAnimationsTracked).toBe(2);
    });
  });

  describe('filterAnimations', () => {
    it('matches by animationName and payload fields', () => {
      const tracked = {
        animationName: 'ATTACK',
        payload: { targetId: 't1', targetLane: 'mid', attackerId: 'a1' },
      };
      tracker.trackAction({ actionAnimations: [tracked] });

      const incoming = [
        { animationName: 'ATTACK', payload: { targetId: 't1', targetLane: 'mid', attackerId: 'a1' } },
      ];

      const result = tracker.filterAnimations(incoming, []);
      expect(result.actionAnimations).toHaveLength(0);
    });

    it('does not filter when animationName differs', () => {
      tracker.trackAction({
        actionAnimations: [{ animationName: 'ATTACK', payload: { targetId: 't1' } }],
      });

      const incoming = [{ animationName: 'HEAL', payload: { targetId: 't1' } }];
      const result = tracker.filterAnimations(incoming, []);
      expect(result.actionAnimations).toHaveLength(1);
    });

    it('does not filter when payload fields differ', () => {
      tracker.trackAction({
        actionAnimations: [{ animationName: 'ATTACK', payload: { targetId: 't1', targetLane: 'left' } }],
      });

      const incoming = [{ animationName: 'ATTACK', payload: { targetId: 't1', targetLane: 'right' } }];
      const result = tracker.filterAnimations(incoming, []);
      expect(result.actionAnimations).toHaveLength(1);
    });

    it('matches all relevant payload fields', () => {
      const payload = {
        targetId: 't1',
        targetLane: 'mid',
        targetPlayer: 'p1',
        attackerId: 'a1',
        sourceCardInstanceId: 'sc1',
        abilityId: 'ab1',
        teleportType: 'blink',
      };

      tracker.trackAction({
        actionAnimations: [{ animationName: 'ABILITY', payload }],
      });

      const incoming = [{ animationName: 'ABILITY', payload: { ...payload, timestamp: 999 } }];
      const result = tracker.filterAnimations(incoming, []);
      expect(result.actionAnimations).toHaveLength(0);
    });

    it('consumes matched entries via splice (one-to-one matching)', () => {
      const anim = { animationName: 'ATTACK', payload: { targetId: 't1' } };
      tracker.trackAction({ actionAnimations: [anim] });

      // First filter consumes the tracked entry
      tracker.filterAnimations(
        [{ animationName: 'ATTACK', payload: { targetId: 't1' } }],
        [],
      );
      expect(tracker.getStatus().actionAnimationsTracked).toBe(0);

      // Second identical incoming passes through since tracked was consumed
      const result = tracker.filterAnimations(
        [{ animationName: 'ATTACK', payload: { targetId: 't1' } }],
        [],
      );
      expect(result.actionAnimations).toHaveLength(1);
    });

    it('passes system animations through unfiltered', () => {
      tracker.trackAction({
        actionAnimations: [{ animationName: 'ATTACK', payload: { targetId: 't1' } }],
        systemAnimations: [{ animationName: 'PHASE_CHANGE', payload: {} }],
      });

      const incomingSystem = [
        { animationName: 'PHASE_CHANGE', payload: {} },
        { animationName: 'TURN_START', payload: {} },
      ];

      const result = tracker.filterAnimations([], incomingSystem);
      expect(result.systemAnimations).toHaveLength(2);
      expect(result.systemAnimations).toBe(incomingSystem);
    });

    it('returns all animations when nothing is tracked', () => {
      const incoming = [{ animationName: 'ATTACK', payload: { targetId: 't1' } }];
      const incomingSystem = [{ animationName: 'SYS', payload: {} }];

      const result = tracker.filterAnimations(incoming, incomingSystem);
      expect(result.actionAnimations).toBe(incoming);
      expect(result.systemAnimations).toBe(incomingSystem);
    });
  });

  describe('ANIMATION_SEQUENCE matching', () => {
    it('compares nested animations by type and startAt', () => {
      const seqPayload = {
        targetId: 't1',
        animations: [
          { type: 'MOVE', startAt: 0 },
          { type: 'ATTACK', startAt: 300 },
        ],
      };

      tracker.trackAction({
        actionAnimations: [{ animationName: 'ANIMATION_SEQUENCE', payload: seqPayload }],
      });

      const incoming = [{
        animationName: 'ANIMATION_SEQUENCE',
        payload: {
          targetId: 't1',
          animations: [
            { type: 'MOVE', startAt: 0, otherField: 'ignored' },
            { type: 'ATTACK', startAt: 300 },
          ],
        },
      }];

      const result = tracker.filterAnimations(incoming, []);
      expect(result.actionAnimations).toHaveLength(0);
    });

    it('does not match when nested animation types differ', () => {
      tracker.trackAction({
        actionAnimations: [{
          animationName: 'ANIMATION_SEQUENCE',
          payload: {
            targetId: 't1',
            animations: [{ type: 'MOVE', startAt: 0 }],
          },
        }],
      });

      const incoming = [{
        animationName: 'ANIMATION_SEQUENCE',
        payload: {
          targetId: 't1',
          animations: [{ type: 'ATTACK', startAt: 0 }],
        },
      }];

      const result = tracker.filterAnimations(incoming, []);
      expect(result.actionAnimations).toHaveLength(1);
    });

    it('does not match when nested animation counts differ', () => {
      tracker.trackAction({
        actionAnimations: [{
          animationName: 'ANIMATION_SEQUENCE',
          payload: {
            targetId: 't1',
            animations: [{ type: 'MOVE', startAt: 0 }, { type: 'ATTACK', startAt: 100 }],
          },
        }],
      });

      const incoming = [{
        animationName: 'ANIMATION_SEQUENCE',
        payload: {
          targetId: 't1',
          animations: [{ type: 'MOVE', startAt: 0 }],
        },
      }];

      const result = tracker.filterAnimations(incoming, []);
      expect(result.actionAnimations).toHaveLength(1);
    });
  });

  describe('clearTrackedAnimations', () => {
    it('resets both arrays', () => {
      tracker.trackAction({
        actionAnimations: [{ animationName: 'A', payload: {} }],
        systemAnimations: [{ animationName: 'S', payload: {} }],
      });

      tracker.clearTrackedAnimations();

      const status = tracker.getStatus();
      expect(status.actionAnimationsTracked).toBe(0);
      expect(status.systemAnimationsTracked).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('returns counts of tracked animations', () => {
      tracker.trackAction({
        actionAnimations: [
          { animationName: 'A1', payload: {} },
          { animationName: 'A2', payload: {} },
        ],
        systemAnimations: [
          { animationName: 'S1', payload: {} },
        ],
      });

      expect(tracker.getStatus()).toEqual({
        actionAnimationsTracked: 2,
        systemAnimationsTracked: 1,
      });
    });
  });
});
