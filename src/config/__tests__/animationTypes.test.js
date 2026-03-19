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
    for (const [name, value] of Object.entries(AnimTypes)) {
      expect(value).toBe(name);
    }
  });
});
