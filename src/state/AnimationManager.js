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
    if (!effects || effects.length === 0) return;
    this.setBlocking(true);

    try {
      for (const effect of effects) {
        const animDef = this.animations[effect.animationName];
        if (!animDef) {
          console.warn(`Unknown animation: ${effect.animationName}`);
          continue;
        }

        const handler = this.visualHandlers.get(animDef.type);
        if (!handler) {
          console.warn(`No visual handler for: ${animDef.type}`);
          continue;
        }

        await new Promise(resolve => {
          handler({
            ...effect.payload,
            config: animDef.config,
            onComplete: resolve
          });
          setTimeout(resolve, animDef.duration);
        });
      }
    } finally {
      this.setBlocking(false);
    }
  }

  setBlocking(blocking) {
    this.isBlocking = blocking;
    this.gameStateManager.emit('animationStateChange', { blocking });
  }
}

export default AnimationManager;