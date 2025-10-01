class AnimationManager {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.isBlocking = false;
    this.visualHandlers = new Map();

    this.animations = {
      DRONE_FLY_TO_TARGET: { 
        duration: 800, 
        type: 'DRONE_FLY',
        config: { trail: true, easing: 'easeInOut' }
      },
      EXPLOSION: { 
        duration: 600, 
        type: 'EXPLOSION_EFFECT'
      },
      TARGET_SHAKE: {
        duration: 500,
        type: 'SHAKE_EFFECT',
        config: { intensity: 10 }
      },
      DRONE_RETURN: {
        duration: 400,
        type: 'DRONE_FLY',
        config: { trail: false, easing: 'easeOut', isReturn: true }
      }
    };
  }

  registerVisualHandler(type, handler) {
    this.visualHandlers.set(type, handler);
  }

  async executeAnimations(effects) {
    console.log('🎬 [AI ANIMATION DEBUG] AnimationManager.executeAnimations() called:', {
      effectCount: effects?.length || 0,
      effects: effects?.map(e => e.animationName)
    });

    if (!effects || effects.length === 0) {
      console.log('🎬 [AI ANIMATION DEBUG] No effects to execute, returning early');
      return;
    }
    this.setBlocking(true);

    try {
      for (const effect of effects) {
        console.log('🎬 [AI ANIMATION DEBUG] Processing effect:', {
          animationName: effect.animationName,
          payload: effect.payload
        });

        const animDef = this.animations[effect.animationName];
        if (!animDef) {
          console.warn(`❌ [AI ANIMATION DEBUG] Unknown animation: ${effect.animationName}`);
          continue;
        }

        console.log('🎬 [AI ANIMATION DEBUG] Found animation definition:', {
          type: animDef.type,
          duration: animDef.duration
        });

        const handler = this.visualHandlers.get(animDef.type);
        if (!handler) {
          console.warn(`❌ [AI ANIMATION DEBUG] No visual handler for: ${animDef.type}`);
          continue;
        }

        console.log('🎬 [AI ANIMATION DEBUG] Calling visual handler with payload:', {
          ...effect.payload,
          config: animDef.config
        });

        await new Promise(resolve => {
          handler({
            ...effect.payload,
            config: animDef.config,
            onComplete: resolve
          });
          setTimeout(resolve, animDef.duration);
        });

        console.log('🎬 [AI ANIMATION DEBUG] Animation completed:', effect.animationName);
      }
    } finally {
      this.setBlocking(false);
      console.log('🎬 [AI ANIMATION DEBUG] All animations completed, blocking released');
    }
  }

  setBlocking(blocking) {
    this.isBlocking = blocking;
    this.gameStateManager.emit('animationStateChange', { blocking });
  }
}

export default AnimationManager;