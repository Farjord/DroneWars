// Event-driven animation system - animations triggered by gameEngine events
// Card visuals play before damage feedback for proper sequencing
// Migrated from hardcoded sequences on 2025-01-XX

class AnimationManager {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.isBlocking = false;
    this.visualHandlers = new Map();

    this.animations = {
      // Attack animations
      DRONE_ATTACK_START: {
        duration: 500,  // Laser effect duration
        type: 'DRONE_FLY',
        config: { trail: true, easing: 'easeInOut', isReturn: false }
      },
      DRONE_RETURN: {
        duration: 0,  // No visual, instant
        type: 'DRONE_FLY',
        config: { trail: false, easing: 'easeOut', isReturn: true }
      },

      // Card visuals
      CARD_VISUAL: {
        duration: 5000,  // Very long for testing visibility
        type: 'CARD_VISUAL_EFFECT',
        config: { }
      },

      // Deployment animations
      TELEPORT_IN: {
        duration: 600,
        type: 'TELEPORT_EFFECT',
        config: { }
      },

      // Damage feedback
      SHIELD_DAMAGE: {
        duration: 2000,
        type: 'FLASH_EFFECT',
        config: { color: '#00bcd4', intensity: 0.6 }
      },
      HULL_DAMAGE: {
        duration: 2000,
        type: 'EXPLOSION_EFFECT',
        config: { size: 'small' }
      },
      DRONE_DESTROYED: {
        duration: 2000,
        type: 'EXPLOSION_EFFECT',
        config: { size: 'large' }
      },
      SECTION_DESTROYED: {
        duration: 2000,
        type: 'EXPLOSION_EFFECT',
        config: { size: 'large' }
      },
      SECTION_DAMAGED: {
        duration: 2000,
        type: 'SHAKE_EFFECT',
        config: { intensity: 10 }
      }
    };
  }

  registerVisualHandler(type, handler) {
    this.visualHandlers.set(type, handler);
  }

  async executeAnimations(effects) {
    console.log('[ANIMATION EVENTS] AnimationManager executing:', effects);

    effects.forEach((effect, index) => {
      console.log(`[ANIMATION EVENTS] Animation ${index + 1}:`, {
        name: effect.animationName,
        type: this.animations[effect.animationName]?.type,
        duration: this.animations[effect.animationName]?.duration,
        payload: effect.payload
      });
    });

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
      // Group animations by type for proper sequencing
      const damageEffects = ['SHIELD_DAMAGE', 'HULL_DAMAGE', 'DRONE_DESTROYED', 'SECTION_DESTROYED', 'SECTION_DAMAGED'];

      let i = 0;
      while (i < effects.length) {
        const effect = effects[i];

        // Check if this is a damage effect that should be grouped
        if (damageEffects.includes(effect.animationName)) {
          // Collect all consecutive damage effects
          const damageGroup = [];
          while (i < effects.length && damageEffects.includes(effects[i].animationName)) {
            damageGroup.push(effects[i]);
            i++;
          }

          console.log('🎬 [ANIMATION DEBUG] Playing damage effects in parallel:', damageGroup.map(e => e.animationName));

          // Play all damage effects in parallel
          await Promise.all(damageGroup.map(async (dmgEffect) => {
            const animDef = this.animations[dmgEffect.animationName];
            if (!animDef) {
              console.warn(`❌ [ANIMATION DEBUG] Unknown animation: ${dmgEffect.animationName}`);
              return;
            }

            const handler = this.visualHandlers.get(animDef.type);
            if (!handler) {
              console.warn(`❌ [ANIMATION DEBUG] No visual handler for: ${animDef.type}`);
              return;
            }

            return new Promise(resolve => {
              handler({
                ...dmgEffect.payload,
                config: animDef.config,
                onComplete: resolve
              });
              setTimeout(resolve, animDef.duration);
            });
          }));

          console.log('🎬 [ANIMATION DEBUG] All damage effects completed');
        } else {
          // Sequential animation (DRONE_ATTACK_START, DRONE_RETURN, CARD_VISUAL, etc.)
          console.log('🎬 [ANIMATION DEBUG] Processing sequential effect:', effect.animationName);

          const animDef = this.animations[effect.animationName];
          if (!animDef) {
            console.warn(`❌ [ANIMATION DEBUG] Unknown animation: ${effect.animationName}`);
            i++;
            continue;
          }

          const handler = this.visualHandlers.get(animDef.type);
          if (!handler) {
            console.warn(`❌ [ANIMATION DEBUG] No visual handler for: ${animDef.type}`);
            i++;
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

          console.log('🎬 [ANIMATION DEBUG] Animation completed:', effect.animationName);
          i++;
        }
      }
    } finally {
      // Add a short delay after all animations complete
      await new Promise(resolve => setTimeout(resolve, 200));

      this.setBlocking(false);
      console.log('🎬 [AI ANIMATION DEBUG] All animations completed, blocking released');
    }
  }

  setBlocking(blocking) {
    console.log(`🔒 [ANIMATION BLOCKING] Setting blocking to: ${blocking}`);
    this.isBlocking = blocking;
    this.gameStateManager.emit('animationStateChange', { blocking });
  }
}

export default AnimationManager;