// --- AnimationLayer ---
// Renders all in-game animations and visual effects as an overlay.
// Pure render component — no state or effects.
// Uses ANIMATION_REGISTRY for automatic rendering of all animation channels.

import React from 'react';
import { ANIMATION_REGISTRY } from '../../config/animationRegistry.js';
import ExplosionEffect from '../animations/ExplosionEffect.jsx';
import CardWarningOverlay from '../animations/CardWarningOverlay.jsx';

const AnimationLayer = ({
  animationState,
  explosions,
  cardPlayWarning,
  animationBlocking,
}) => (
  <>
    {/* Explosions: separate lifecycle via useExplosions hook (fire-and-forget, no onComplete) */}
    {explosions.map(exp => <ExplosionEffect key={exp.id} top={exp.top} left={exp.left} size={exp.size} />)}

    {/* Registry-driven render: all 20 animation channels */}
    {Object.entries(ANIMATION_REGISTRY).map(([channel, Component]) => {
      const items = animationState[channel];
      if (!items?.length) return null;
      return items.map(item => <Component key={item.id} {...item} />);
    })}

    {/* Card play warning: not from AnimationManager, set by card play validation UI */}
    {cardPlayWarning && (
      <CardWarningOverlay
        key={cardPlayWarning.id}
        reasons={cardPlayWarning.reasons}
      />
    )}

    {/* Animation blocking overlay: UI interaction gate, not an animation type */}
    {animationBlocking && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          cursor: 'not-allowed',
          pointerEvents: 'all',
          backgroundColor: 'transparent'
        }}
      />
    )}
  </>
);

export default AnimationLayer;
