import { describe, it, expect } from 'vitest';
import { animationReducer, INITIAL_ANIMATION_STATE, createAnimationDispatch } from '../useAnimationState';

describe('animationReducer', () => {
  describe('INITIAL_ANIMATION_STATE', () => {
    it('has exactly 20 channel keys', () => {
      expect(Object.keys(INITIAL_ANIMATION_STATE)).toHaveLength(20);
    });

    it('all channels initialize as empty arrays', () => {
      for (const [key, value] of Object.entries(INITIAL_ANIMATION_STATE)) {
        expect(value).toEqual([]);
      }
    });

    it('contains all expected channels', () => {
      const expectedChannels = [
        'flyingDrones', 'flashEffects', 'healEffects', 'statChangeEffects',
        'cardVisuals', 'cardReveals', 'shipAbilityReveals', 'phaseAnnouncements',
        'laserEffects', 'teleportEffects', 'overflowProjectiles', 'splashEffects',
        'barrageImpacts', 'railgunTurrets', 'railgunBeams', 'passNotifications',
        'goAgainNotifications', 'triggerFiredNotifications', 'movementBlockedNotifications',
        'statusConsumptions'
      ];
      for (const channel of expectedChannels) {
        expect(INITIAL_ANIMATION_STATE).toHaveProperty(channel);
      }
    });
  });

  describe('ADD action', () => {
    it('appends item to correct channel', () => {
      const item = { id: 'test-1', data: 'hello' };
      const result = animationReducer(INITIAL_ANIMATION_STATE, {
        type: 'ADD', channel: 'flashEffects', item
      });
      expect(result.flashEffects).toEqual([item]);
      // Other channels unchanged
      expect(result.healEffects).toEqual([]);
    });

    it('appends to existing items', () => {
      const state = { ...INITIAL_ANIMATION_STATE, flashEffects: [{ id: 'a' }] };
      const result = animationReducer(state, {
        type: 'ADD', channel: 'flashEffects', item: { id: 'b' }
      });
      expect(result.flashEffects).toEqual([{ id: 'a' }, { id: 'b' }]);
    });

    it('handles ADD to nonexistent channel safely', () => {
      expect(() => {
        animationReducer(INITIAL_ANIMATION_STATE, {
          type: 'ADD', channel: 'nonexistent', item: { id: 'x' }
        });
      }).not.toThrow();
    });
  });

  describe('ADD_BATCH action', () => {
    it('appends multiple items to channel', () => {
      const items = [{ id: 'a' }, { id: 'b' }];
      const result = animationReducer(INITIAL_ANIMATION_STATE, {
        type: 'ADD_BATCH', channel: 'barrageImpacts', items
      });
      expect(result.barrageImpacts).toEqual(items);
    });
  });

  describe('REMOVE action', () => {
    it('removes item by single id', () => {
      const state = { ...INITIAL_ANIMATION_STATE, flashEffects: [{ id: 'a' }, { id: 'b' }] };
      const result = animationReducer(state, {
        type: 'REMOVE', channel: 'flashEffects', id: 'a'
      });
      expect(result.flashEffects).toEqual([{ id: 'b' }]);
    });

    it('removes items by array of ids', () => {
      const state = {
        ...INITIAL_ANIMATION_STATE,
        barrageImpacts: [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
      };
      const result = animationReducer(state, {
        type: 'REMOVE', channel: 'barrageImpacts', id: ['a', 'c']
      });
      expect(result.barrageImpacts).toEqual([{ id: 'b' }]);
    });

    it('no-ops gracefully when id not found', () => {
      const state = { ...INITIAL_ANIMATION_STATE, flashEffects: [{ id: 'a' }] };
      const result = animationReducer(state, {
        type: 'REMOVE', channel: 'flashEffects', id: 'nonexistent'
      });
      expect(result.flashEffects).toEqual([{ id: 'a' }]);
    });
  });

  describe('SET action', () => {
    it('replaces entire channel array', () => {
      const newItems = [{ id: 'x' }, { id: 'y' }];
      const result = animationReducer(INITIAL_ANIMATION_STATE, {
        type: 'SET', channel: 'phaseAnnouncements', value: newItems
      });
      expect(result.phaseAnnouncements).toEqual(newItems);
    });

    it('no-ops for nonexistent channel', () => {
      const result = animationReducer(INITIAL_ANIMATION_STATE, {
        type: 'SET', channel: 'nonexistent', value: [{ id: 'x' }]
      });
      expect(result).toBe(INITIAL_ANIMATION_STATE);
    });
  });

  describe('CLEAR action', () => {
    it('empties channel array', () => {
      const state = { ...INITIAL_ANIMATION_STATE, phaseAnnouncements: [{ id: 'a' }] };
      const result = animationReducer(state, {
        type: 'CLEAR', channel: 'phaseAnnouncements'
      });
      expect(result.phaseAnnouncements).toEqual([]);
    });

    it('no-ops for nonexistent channel', () => {
      const result = animationReducer(INITIAL_ANIMATION_STATE, {
        type: 'CLEAR', channel: 'nonexistent'
      });
      expect(result).toBe(INITIAL_ANIMATION_STATE);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const result = animationReducer(INITIAL_ANIMATION_STATE, { type: 'UNKNOWN' });
      expect(result).toBe(INITIAL_ANIMATION_STATE);
    });
  });
});

describe('createAnimationDispatch', () => {
  it('add() dispatches ADD action', () => {
    const calls = [];
    const dispatch = (action) => calls.push(action);
    const ad = createAnimationDispatch(dispatch);

    ad.add('flashEffects', { id: 'test' });
    expect(calls).toEqual([{ type: 'ADD', channel: 'flashEffects', item: { id: 'test' } }]);
  });

  it('addBatch() dispatches ADD_BATCH action', () => {
    const calls = [];
    const dispatch = (action) => calls.push(action);
    const ad = createAnimationDispatch(dispatch);

    ad.addBatch('barrageImpacts', [{ id: 'a' }, { id: 'b' }]);
    expect(calls).toEqual([{ type: 'ADD_BATCH', channel: 'barrageImpacts', items: [{ id: 'a' }, { id: 'b' }] }]);
  });

  it('remove() dispatches REMOVE action', () => {
    const calls = [];
    const dispatch = (action) => calls.push(action);
    const ad = createAnimationDispatch(dispatch);

    ad.remove('flashEffects', 'abc');
    expect(calls).toEqual([{ type: 'REMOVE', channel: 'flashEffects', id: 'abc' }]);
  });

  it('remove() accepts array of ids', () => {
    const calls = [];
    const dispatch = (action) => calls.push(action);
    const ad = createAnimationDispatch(dispatch);

    ad.remove('barrageImpacts', ['a', 'b']);
    expect(calls).toEqual([{ type: 'REMOVE', channel: 'barrageImpacts', id: ['a', 'b'] }]);
  });

  it('set() dispatches SET action', () => {
    const calls = [];
    const dispatch = (action) => calls.push(action);
    const ad = createAnimationDispatch(dispatch);

    ad.set('phaseAnnouncements', [{ id: 'x' }]);
    expect(calls).toEqual([{ type: 'SET', channel: 'phaseAnnouncements', value: [{ id: 'x' }] }]);
  });

  it('clear() dispatches CLEAR action', () => {
    const calls = [];
    const dispatch = (action) => calls.push(action);
    const ad = createAnimationDispatch(dispatch);

    ad.clear('phaseAnnouncements');
    expect(calls).toEqual([{ type: 'CLEAR', channel: 'phaseAnnouncements' }]);
  });
});
