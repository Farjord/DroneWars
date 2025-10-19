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
      // Animation sequence meta-type
      ANIMATION_SEQUENCE: {
        duration: 0,  // Duration determined by child animations
        type: 'ANIMATION_SEQUENCE',
        config: {}
      },

      // Attack animations
      DRONE_ATTACK_START: {
        duration: 500,  // Laser effect duration
        type: 'DRONE_FLY',
        timing: 'pre-state',  // Needs source drone to exist
        config: { trail: true, easing: 'easeInOut', isReturn: false }
      },
      DRONE_RETURN: {
        duration: 0,  // No visual, instant
        type: 'DRONE_FLY',
        timing: 'pre-state',  // Needs source drone to exist
        config: { trail: false, easing: 'easeOut', isReturn: true }
      },

      // Card visuals
      CARD_REVEAL: {
        duration: 1000,  // 1 second card reveal
        type: 'CARD_REVEAL_EFFECT',
        timing: 'independent',  // Doesn't need specific entities
        config: { }
      },
      SHIP_ABILITY_REVEAL: {
        duration: 1000,  // 1 second reveal
        type: 'SHIP_ABILITY_REVEAL_EFFECT',
        timing: 'independent',  // Doesn't need specific entities
        config: { }
      },
      CARD_VISUAL: {
        duration: 2000,  // 2 second card visual effect
        type: 'CARD_VISUAL_EFFECT',
        timing: 'independent',  // Doesn't need specific entities
        config: { }
      },

      // Player notifications
      PASS_NOTIFICATION: {
        duration: 1000,  // 1 second notification
        type: 'PASS_NOTIFICATION_EFFECT',
        timing: 'independent',  // Doesn't need specific entities
        config: { }
      },

      // Phase announcements
      PHASE_ANNOUNCEMENT: {
        duration: 1500,  // 1.5 second phase announcement
        type: 'PHASE_ANNOUNCEMENT_EFFECT',
        timing: 'independent',  // Doesn't need specific entities
        config: { }
      },

      // Deployment animations
      TELEPORT_IN: {
        duration: 600,
        type: 'TELEPORT_EFFECT',
        timing: 'post-state',  // Needs NEW drone to exist in DOM (created by state update)
        config: { revealAt: 0.7 } // Reveal drone at 70% of animation for smooth overlap
      },
      TELEPORT_OUT: {
        duration: 600,
        type: 'TELEPORT_EFFECT',
        timing: 'pre-state',  // Needs existing drone to teleport away
        config: { } // Recall animation - drone disappears after effect
      },

      // Damage feedback
      SHIELD_DAMAGE: {
        duration: 2000,
        type: 'FLASH_EFFECT',
        timing: 'pre-state',  // Needs existing target to flash
        config: { color: '#00bcd4', intensity: 0.6 }
      },
      HULL_DAMAGE: {
        duration: 2000,
        type: 'EXPLOSION_EFFECT',
        timing: 'pre-state',  // Needs existing target to explode
        config: { size: 'small' }
      },
      DRONE_DESTROYED: {
        duration: 2000,
        type: 'EXPLOSION_EFFECT',
        timing: 'pre-state',  // Needs existing drone to explode
        config: { size: 'large' }
      },
      SECTION_DESTROYED: {
        duration: 2000,
        type: 'EXPLOSION_EFFECT',
        timing: 'pre-state',  // Needs existing section to explode
        config: { size: 'large' }
      },
      SECTION_DAMAGED: {
        duration: 2000,
        type: 'EXPLOSION_EFFECT',
        timing: 'pre-state',  // Needs existing section to show damage
        config: { size: 'small' }
      },
      HEAL_EFFECT: {
        duration: 1400,
        type: 'HEAL_EFFECT',
        timing: 'pre-state',  // Needs existing target to heal
        config: {}
      },
      // Ordnance effect animations
      OVERFLOW_PROJECTILE: {
        duration: 1200,
        type: 'OVERFLOW_PROJECTILE',
        timing: 'independent',  // Visual effect, doesn't need specific entities
        config: {}
      },
      SPLASH_EFFECT: {
        duration: 1000,
        type: 'SPLASH_EFFECT',
        timing: 'independent',  // Visual effect, doesn't need specific entities
        config: {}
      },
      BARRAGE_IMPACT: {
        duration: 600,  // Total duration for all impacts to complete
        type: 'BARRAGE_IMPACT',
        timing: 'independent',  // Visual effect, doesn't need specific entities
        config: {
          impactSize: 10,  // 10px x 10px impact flashes
          impactDelay: 50  // 50ms between each impact (stagger)
        }
      },
      // Railgun animations
      RAILGUN_TURRET: {
        duration: 2700,  // Full turret cycle (deploy → build → charge → shoot → retract)
        timing: 'pre-state',  // Needs existing ship section
        type: 'RAILGUN_TURRET',
        config: {}
      },
      RAILGUN_BEAM: {
        duration: 1000,  // Beam fade duration
        type: 'RAILGUN_BEAM',
        timing: 'pre-state',  // Needs existing elements for beam endpoints
        config: {}
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
      const damageEffects = ['SHIELD_DAMAGE', 'HULL_DAMAGE', 'DRONE_DESTROYED', 'SECTION_DESTROYED', 'SECTION_DAMAGED', 'HEAL_EFFECT'];

      let i = 0;
      while (i < effects.length) {
        const effect = effects[i];

        // Check if this is an animation sequence with precise timing
        if (effect.animationName === 'ANIMATION_SEQUENCE') {
          // DEBUG: Log what we received
          debugLog('ANIMATIONS', '⏱️ [SEQUENCE DEBUG] Received effect object:', {
            hasPayload: !!effect.payload,
            payloadKeys: effect.payload ? Object.keys(effect.payload) : [],
            hasAnimations: !!effect.payload?.animations,
            animationsLength: effect.payload?.animations?.length || 0,
            fullPayload: effect.payload
          });

          debugLog('ANIMATIONS', '🎬 [SEQUENCE] Processing animation sequence', {
            animationCount: effect.payload?.animations?.length || 0,
            animations: effect.payload?.animations?.map(a => ({ type: a.type, startAt: a.startAt })) || []
          });

          const sequenceAnimations = effect.payload?.animations || [];

          // Execute all animations in the sequence with their specified timing
          await Promise.all(sequenceAnimations.map(async (seqAnim) => {
            return new Promise(resolve => {
              // Schedule animation to start at its specified time
              setTimeout(async () => {
                const animDef = this.animations[seqAnim.type];
                if (!animDef) {
                  console.warn(`❌ [SEQUENCE] Unknown animation type: ${seqAnim.type}`);
                  resolve();
                  return;
                }

                const handler = this.visualHandlers.get(animDef.type);
                if (!handler) {
                  console.warn(`❌ [SEQUENCE] No visual handler for: ${animDef.type}`);
                  resolve();
                  return;
                }

                debugLog('ANIMATIONS', `🎬 [SEQUENCE] Starting animation at T+${seqAnim.startAt}ms:`, seqAnim.type);

                // Execute the animation
                handler({
                  ...seqAnim.payload,
                  config: animDef.config,
                  onComplete: resolve
                });

                // Safety timeout in case onComplete never fires
                setTimeout(resolve, seqAnim.duration || animDef.duration);
              }, seqAnim.startAt || 0);
            });
          }));

          debugLog('ANIMATIONS', '🎬 [SEQUENCE] All sequence animations completed');
          i++;
        }
        // Check if this is a damage effect that should be grouped
        else if (damageEffects.includes(effect.animationName)) {
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