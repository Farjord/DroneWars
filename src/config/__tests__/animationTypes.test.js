import { describe, it, expect } from 'vitest';
import AnimationManager from '../../managers/AnimationManager.js';
import * as AnimTypes from '../animationTypes.js';

describe('animationTypes constants', () => {
  it('every AnimationManager registry key has a matching constant', () => {
    const gsm = { getLocalPlayerId: () => 'p1', emit: () => {}, subscribe: () => () => {} };
    const am = new AnimationManager(gsm);
    const registryKeys = Object.keys(am.animations);
    const exportedValues = new Set(Object.values(AnimTypes));

    for (const key of registryKeys) {
      expect(exportedValues.has(key)).toBe(true);
    }
  });

  it('every constant value equals its export name', () => {
    // Exception: DRONE_ATTACK_ANNOUNCEMENT and DRONE_MOVE_ANNOUNCEMENT have values
    // without the DRONE_ prefix because that's what CombatActionStrategy emits
    const exceptions = new Set(['DRONE_ATTACK_ANNOUNCEMENT', 'DRONE_MOVE_ANNOUNCEMENT']);
    for (const [name, value] of Object.entries(AnimTypes)) {
      if (exceptions.has(name)) {
        continue;
      }
      expect(value).toBe(name);
    }
  });

  it('announcement constants have correct emit names', () => {
    expect(AnimTypes.DRONE_ATTACK_ANNOUNCEMENT).toBe('ATTACK_ANNOUNCEMENT');
    expect(AnimTypes.DRONE_MOVE_ANNOUNCEMENT).toBe('MOVE_ANNOUNCEMENT');
  });
});
