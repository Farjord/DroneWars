import { describe, it, expect } from 'vitest';
import { ANIMATION_REGISTRY } from '../animationRegistry';
import { INITIAL_ANIMATION_STATE } from '../../hooks/useAnimationState';

// Note: explosions, cardPlayWarning, animationBlocking are NOT in INITIAL_ANIMATION_STATE
// (they use separate useState/useExplosions), so no special-case set is needed here.

describe('animationRegistry', () => {
  it('every registry channel has a matching key in INITIAL_ANIMATION_STATE', () => {
    for (const channel of Object.keys(ANIMATION_REGISTRY)) {
      expect(INITIAL_ANIMATION_STATE).toHaveProperty(channel);
    }
  });

  it('every initial state channel has a matching registry entry', () => {
    for (const channel of Object.keys(INITIAL_ANIMATION_STATE)) {
      expect(ANIMATION_REGISTRY).toHaveProperty(channel);
    }
  });

  it('every registry value is a function (React component)', () => {
    for (const [channel, Component] of Object.entries(ANIMATION_REGISTRY)) {
      expect(typeof Component).toBe('function');
    }
  });

  it('registry has no duplicate component references', () => {
    const components = Object.values(ANIMATION_REGISTRY);
    const unique = new Set(components);
    expect(unique.size).toBe(components.length);
  });
});
