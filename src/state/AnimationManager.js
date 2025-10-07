// Event-driven animation system - animations triggered by gameEngine events
// Card visuals play before damage feedback for proper sequencing
// Migrated from hardcoded sequences on 2025-01-XX

import { debugLog } from '../utils/debugLogger.js';

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
      CARD_REVEAL: {
        duration: 1000,  // 1 second card reveal
        type: 'CARD_REVEAL_EFFECT',
        config: { }
      },
      SHIP_ABILITY_REVEAL: {
        duration: 1000,  // 1 second reveal
        type: 'SHIP_ABILITY_REVEAL_EFFECT',
        config: { }
      },
      CARD_VISUAL: {
        duration: 5000,  // Very long for testing visibility
        type: 'CARD_VISUAL_EFFECT',
        config: { }
      },

      // Player notifications
      PASS_NOTIFICATION: {
        duration: 1000,  // 1 second notification
        type: 'PASS_NOTIFICATION_EFFECT',
        config: { }
      },

      // Phase announcements
      PHASE_ANNOUNCEMENT: {
        duration: 1500,  // 1.5 second phase announcement
        type: 'PHASE_ANNOUNCEMENT_EFFECT',
        config: { }
      },

      // Deployment animations
      TELEPORT_IN: {
        duration: 600,
        type: 'TELEPORT_EFFECT',
        config: { revealAt: 0.7 } // Reveal drone at 70% of animation for smooth overlap
      },
      TELEPORT_OUT: {
        duration: 600,
        type: 'TELEPORT_EFFECT',
        config: { } // Recall animation - drone disappears after effect
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

  async executeAnimations(effects, source = 'unknown') {
    const gameMode = this.gameStateManager?.getState()?.gameMode;

    debugLog('ANIMATIONS', '🎬 [EXECUTE] AnimationManager.executeAnimations() START:', {
      source,
      gameMode,
      effectCount: effects?.length || 0,
      effects: effects?.map(e => e.animationName)
    });

    effects.forEach((effect, index) => {
      debugLog('ANIMATIONS', `  🎬 [EXECUTE] Animation ${index + 1}/${effects.length}: ${effect.animationName}`, {
        type: this.animations[effect.animationName]?.type,
        duration: this.animations[effect.animationName]?.duration
      });
    });

    if (!effects || effects.length === 0) {
      debugLog('ANIMATIONS', '⏭️ [EXECUTE] No effects to execute, returning early');
      return;
    }

    debugLog('ANIMATIONS', `🚨 [EXECUTE] PLAYING ${effects.length} ANIMATION(S) - Source: ${source} - Mode: ${gameMode}`);
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

          debugLog('ANIMATIONS', '🎬 [ANIMATION DEBUG] Playing damage effects in parallel:', damageGroup.map(e => e.animationName));

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

          debugLog('ANIMATIONS', '🎬 [ANIMATION DEBUG] All damage effects completed');
        } else {
          // Sequential animation (DRONE_ATTACK_START, DRONE_RETURN, CARD_VISUAL, etc.)
          debugLog('ANIMATIONS', '🎬 [ANIMATION DEBUG] Processing sequential effect:', effect.animationName);

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

          debugLog('ANIMATIONS', '🎬 [ANIMATION DEBUG] Animation completed:', effect.animationName);
          i++;
        }
      }
    } finally {
      // Add a short delay after all animations complete
      await new Promise(resolve => setTimeout(resolve, 200));

      this.setBlocking(false);
      debugLog('ANIMATIONS', '🎬 [AI ANIMATION DEBUG] All animations completed, blocking released');
    }
  }

  setBlocking(blocking) {
    debugLog('ANIMATIONS', `🔒 [ANIMATION BLOCKING] Setting blocking to: ${blocking}`);
    this.isBlocking = blocking;
    this.gameStateManager.emit('animationStateChange', { blocking });
  }
}

export default AnimationManager;