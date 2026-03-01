// Event-driven animation system - animations triggered by gameEngine events
// Card visuals play before damage feedback for proper sequencing
// Migrated from hardcoded sequences on 2025-01-XX

import { debugLog, timingLog, getTimestamp } from '../utils/debugLogger.js';

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

      // Movement animations
      DRONE_MOVEMENT: {
        duration: 800,
        type: 'DRONE_MOVEMENT_EFFECT',
        timing: 'pre-state',
        config: {}
      },

      // Status consumption
      STATUS_CONSUMPTION: {
        duration: 1000,
        type: 'STATUS_CONSUMPTION_EFFECT',
        timing: 'independent',
        config: {}
      },

      // Player notifications
      PASS_NOTIFICATION: {
        duration: 1000,  // 1 second notification
        type: 'PASS_NOTIFICATION_EFFECT',
        timing: 'independent',  // Doesn't need specific entities
        config: { }
      },

      GO_AGAIN_NOTIFICATION: {
        duration: 800,
        type: 'GO_AGAIN_NOTIFICATION_EFFECT',
        timing: 'independent',
        config: { }
      },

      STATE_SNAPSHOT: {
        duration: 0,
        type: 'STATE_SNAPSHOT',
        timing: 'pre-state',
        config: {}
      },

      TRIGGER_FIRED: {
        duration: 1200,
        type: 'TRIGGER_FIRED_EFFECT',
        timing: 'pre-state',
        config: {}
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

  /**
   * Execute animations with state update at the correct timing
   * Orchestrates: pre-state animations → state update → post-state animations
   * @param {Array} animations - Animations to execute
   * @param {Object} executor - Object with applyPendingStateUpdate() and getAnimationSource() methods
   */
  async executeWithStateUpdate(animations, executor) {
    const executionStart = timingLog('[ANIM MGR] Execution started', {
      totalCount: animations?.length || 0,
      animNames: animations?.map(a => a.animationName).join(', ') || 'none',
      source: executor.getAnimationSource?.() || 'unknown'
    });

    debugLog('ANIMATIONS', '🎬 [ORCHESTRATE] executeWithStateUpdate() START:', {
      animationCount: animations?.length || 0,
      executorType: executor.constructor.name
    });

    if (!animations || animations.length === 0) {
      debugLog('ANIMATIONS', '⏭️ [ORCHESTRATE] No animations, applying state update only');
      executor.applyPendingStateUpdate();
      timingLog('[ANIM MGR] Execution complete (no animations)', {}, executionStart);
      return;
    }

    // Split animations by timing requirements
    const { preState, postState, independent } = this.splitByTiming(animations);

    debugLog('ANIMATIONS', '🔍 [ORCHESTRATE] Animation timing split:', {
      preStateCount: preState.length,
      postStateCount: postState.length,
      independentCount: independent.length,
      total: animations.length
    });

    // 1. Play animations that need OLD state (entities still exist in DOM)
    const preAnimations = [...independent, ...preState];
    if (preAnimations.length > 0) {
      const preStart = timingLog('[ANIM MGR] Pre-state animations', {
        count: preAnimations.length,
        names: preAnimations.map(a => a.animationName).join(', ')
      });

      debugLog('ANIMATIONS', '🎬 [ORCHESTRATE] Playing pre-state + independent animations...');
      await this.executeAnimations(preAnimations, executor.getAnimationSource(), executor);
      debugLog('ANIMATIONS', '✅ [ORCHESTRATE] Pre-state + independent animations complete');

      timingLog('[ANIM MGR] Pre-state complete', {
        count: preAnimations.length
      }, preStart);
    }

    // 2. Apply state update (executor updates GameStateManager)
    const stateStart = timingLog('[ANIM MGR] State application', {
      source: executor.getAnimationSource?.() || 'unknown'
    });

    debugLog('ANIMATIONS', '📝 [ORCHESTRATE] Applying state update via executor...');
    executor.applyPendingStateUpdate();
    debugLog('ANIMATIONS', '✅ [ORCHESTRATE] State update complete');

    timingLog('[ANIM MGR] State applied', {}, stateStart);

    // 3. Wait for React to render new state (critical for post-state animations)
    if (postState.length > 0) {
      const renderStart = timingLog('[ANIM MGR] React render wait', {});

      debugLog('ANIMATIONS', '⏳ [ORCHESTRATE] Waiting for React to render new state...');
      await this.waitForReactRender();
      debugLog('ANIMATIONS', '✅ [ORCHESTRATE] React render complete');

      timingLog('[ANIM MGR] React render complete', {}, renderStart);
    }

    // 4. Separate TELEPORT_IN from other post-state animations (needs special handling)
    const teleportAnimations = postState.filter(a => a.animationName === 'TELEPORT_IN');
    const otherPostState = postState.filter(a => a.animationName !== 'TELEPORT_IN');

    debugLog('ANIMATIONS', '🔍 [ORCHESTRATE] Post-state animation split:', {
      teleportCount: teleportAnimations.length,
      otherPostCount: otherPostState.length
    });

    // 5. Play non-teleport post-state animations normally
    if (otherPostState.length > 0) {
      const postStart = timingLog('[ANIM MGR] Post-state animations', {
        count: otherPostState.length,
        names: otherPostState.map(a => a.animationName).join(', ')
      });

      debugLog('ANIMATIONS', '🎬 [ORCHESTRATE] Playing non-teleport post-state animations...');
      await this.executeAnimations(otherPostState, executor.getAnimationSource(), executor);
      debugLog('ANIMATIONS', '✅ [ORCHESTRATE] Non-teleport post-state animations complete');

      timingLog('[ANIM MGR] Post-state complete', {
        count: otherPostState.length
      }, postStart);
    }

    // 6. Handle TELEPORT_IN with mid-animation reveal timing
    if (teleportAnimations.length > 0) {
      const teleportStart = timingLog('[ANIM MGR] Teleport animations', {
        count: teleportAnimations.length
      });

      debugLog('ANIMATIONS', '✨ [ORCHESTRATE] Handling TELEPORT_IN animations with reveal timing...');
      await this.executeTeleportAnimations(teleportAnimations, executor);
      debugLog('ANIMATIONS', '✅ [ORCHESTRATE] TELEPORT_IN animations complete');

      timingLog('[ANIM MGR] Teleport complete', {
        count: teleportAnimations.length
      }, teleportStart);
    }

    debugLog('ANIMATIONS', '🎬 [ORCHESTRATE] executeWithStateUpdate() COMPLETE');

    timingLog('[ANIM MGR] Execution complete', {
      totalCount: animations?.length || 0
    }, executionStart);
  }

  /**
   * Wait for React to render (double requestAnimationFrame for safety)
   * @returns {Promise} Resolves after React has rendered
   */
  waitForReactRender() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  /**
   * Execute TELEPORT_IN animations with mid-animation reveal
   * Drones start invisible (isTeleporting: true) and are revealed at 70% of animation
   * @param {Array} animations - TELEPORT_IN animations to execute
   * @param {Object} executor - Executor with revealTeleportedDrones method
   */
  async executeTeleportAnimations(animations, executor) {
    debugLog('ANIMATIONS', '✨ [TELEPORT] Starting TELEPORT_IN animations:', {
      count: animations.length,
      droneIds: animations.map(a => a.payload?.targetId)
    });

    // Emit sound cue at animation start (before executeAnimations)
    this.gameStateManager.emit('ANIMATION_STARTED', { animationType: 'TELEPORT_IN' });

    // Start animations (non-blocking)
    const animationPromise = this.executeAnimations(animations, executor.getAnimationSource());

    // Schedule mid-animation reveal at configured percentage (default 70%)
    const config = this.animations.TELEPORT_IN;
    const revealDelay = config.duration * (config.config?.revealAt || 0.7);

    debugLog('ANIMATIONS', `✨ [TELEPORT] Scheduling drone reveal at ${revealDelay}ms (${(config.config?.revealAt || 0.7) * 100}% of ${config.duration}ms)`);

    setTimeout(() => {
      debugLog('ANIMATIONS', '✨ [TELEPORT] Revealing teleported drones...');
      if (executor.revealTeleportedDrones) {
        executor.revealTeleportedDrones(animations);
      } else {
        debugLog('ANIMATIONS', '⚠️ [TELEPORT] Executor does not support revealTeleportedDrones()');
      }
    }, revealDelay);

    // Wait for animations to complete
    await animationPromise;
    debugLog('ANIMATIONS', '✨ [TELEPORT] All TELEPORT_IN animations completed');
  }

  /**
   * Split animations by timing requirements (private helper)
   * @param {Array} animations - Animations to split
   * @returns {Object} { preState, postState, independent }
   */
  splitByTiming(animations) {
    const preState = [];
    const postState = [];
    const independent = [];

    animations.forEach(anim => {
      const timing = anim.timing || 'pre-state'; // Default to pre-state for safety

      if (timing === 'post-state') {
        postState.push(anim);
      } else if (timing === 'independent') {
        independent.push(anim);
      } else {
        preState.push(anim);
      }
    });

    debugLog('TRIGGERS', 'Timing split:', {
      pre: preState.map(a => a.animationName),
      post: postState.map(a => a.animationName),
      ind: independent.map(a => a.animationName)
    });

    return { preState, postState, independent };
  }

  async executeAnimations(effects, source = 'unknown', executor = null) {
    const gameMode = this.gameStateManager?.getState()?.gameMode;

    timingLog('[ANIM MGR] executeAnimations called', {
      source,
      gameMode,
      effectCount: effects?.length || 0,
      effects: effects?.map(e => e.animationName).join(', '),
      blockingReason: 'preparing_to_execute'
    });

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

    timingLog('[ANIM MGR] Setting blocking mode', {
      blockingReason: 'preventing_other_animations'
    });

    this.setBlocking(true);

    try {
      // Group animations by type for proper sequencing
      const damageEffects = ['SHIELD_DAMAGE', 'HULL_DAMAGE', 'DRONE_DESTROYED', 'SECTION_DESTROYED', 'SECTION_DAMAGED', 'HEAL_EFFECT'];

      let i = 0;
      while (i < effects.length) {
        const effect = effects[i];

        // Handle STATE_SNAPSHOT: apply intermediate state and continue
        if (effect.animationName === 'STATE_SNAPSHOT') {
          if (executor?.applyIntermediateState) {
            executor.applyIntermediateState(effect.payload.snapshotPlayerStates);
            await this.waitForReactRender();
          }
          i++;
          continue;
        }

        // Handle TRIGGER_CHAIN_PAUSE: wait for specified duration between trigger chain steps
        if (effect.animationName === 'TRIGGER_CHAIN_PAUSE') {
          await new Promise(resolve => setTimeout(resolve, effect.payload.duration));
          i++;
          continue;
        }

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
                  debugLog('ANIMATIONS', `⚠️ [SEQUENCE] Unknown animation type: ${seqAnim.type}`);
                  resolve();
                  return;
                }

                const handler = this.visualHandlers.get(animDef.type);
                if (!handler) {
                  debugLog('ANIMATIONS', `⚠️ [SEQUENCE] No visual handler for: ${animDef.type}`);
                  resolve();
                  return;
                }

                debugLog('ANIMATIONS', `🎬 [SEQUENCE] Starting animation at T+${seqAnim.startAt}ms:`, seqAnim.type);

                // Emit sound cue for sequence child animation
                this.gameStateManager.emit('ANIMATION_STARTED', { animationType: seqAnim.type });

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
              debugLog('ANIMATIONS', `⚠️ [ANIMATION DEBUG] Unknown animation: ${dmgEffect.animationName}`);
              return;
            }

            const handler = this.visualHandlers.get(animDef.type);
            if (!handler) {
              debugLog('ANIMATIONS', `⚠️ [ANIMATION DEBUG] No visual handler for: ${animDef.type}`);
              return;
            }

            // Emit sound cue for damage animation
            this.gameStateManager.emit('ANIMATION_STARTED', { animationType: dmgEffect.animationName });

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
            debugLog('ANIMATIONS', `⚠️ [ANIMATION DEBUG] Unknown animation: ${effect.animationName}`);
            i++;
            continue;
          }

          const handler = this.visualHandlers.get(animDef.type);
          if (!handler) {
            debugLog('ANIMATIONS', `⚠️ [ANIMATION DEBUG] No visual handler for: ${animDef.type}`);
            i++;
            continue;
          }

          timingLog('[ANIM EXEC] Calling visual handler', {
            name: effect.animationName,
            type: animDef.type,
            duration: animDef.duration,
            blockingReason: 'triggering_react_component'
          });

          // Emit sound cue for sequential animation
          this.gameStateManager.emit('ANIMATION_STARTED', { animationType: effect.animationName });

          await new Promise(resolve => {
            handler({
              ...effect.payload,
              config: animDef.config,
              onComplete: resolve
            });
            setTimeout(resolve, animDef.duration);
          });

          timingLog('[ANIM EXEC] Animation complete', {
            name: effect.animationName,
            blockingReason: 'animation_finished'
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

  /**
   * Execute structured action steps sequentially.
   * Each step is self-contained: apply state, wait for render, play animations, pause.
   *
   * @param {Array} steps - Array of { type, animations, stateAfter, ... }
   * @param {Object} executor - Object with applyIntermediateState() and getAnimationSource()
   */
  async executeActionSteps(steps, executor) {
    if (!steps || steps.length === 0) return;

    debugLog('ANIMATIONS', `[ACTION STEPS] Processing ${steps.length} step(s)`);
    this.setBlocking(true);

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const source = executor.getAnimationSource?.() || 'ACTION_STEPS';

        // Diagnostic: log drone positions in this step's stateAfter
        if (step.stateAfter) {
          const drones = {};
          for (const pid of ['player1', 'player2']) {
            const board = step.stateAfter[pid]?.dronesOnBoard || {};
            for (const lane of ['lane1', 'lane2', 'lane3']) {
              for (const d of (board[lane] || [])) {
                drones[d.id] = `${pid}/${lane}`;
              }
            }
          }
          debugLog('MOVEMENT_EFFECT', `[DIAG] executeActionSteps step ${i}`, {
            type: step.type,
            animationCount: step.animations?.length ?? 0,
            animationTypes: step.animations?.map(a => a.type),
            stateAfterDrones: drones,
          });
        }

        // 1. Map animations and split by timing
        let preAnimations = [];
        let postAnimations = [];
        if (step.animations && step.animations.length > 0) {
          const mapped = step.animations.map(event => {
            const animDef = this.animations[event.type];
            return {
              animationName: event.type,
              timing: animDef?.timing || 'pre-state',
              payload: { ...event, droneId: event.sourceId || event.targetId }
            };
          });
          const { preState, postState, independent } = this.splitByTiming(mapped);
          preAnimations = [...independent, ...preState];
          postAnimations = postState;
        }

        // 2. Play pre-state + independent animations (drones still in DOM)
        if (preAnimations.length > 0) {
          debugLog('ANIMATIONS', `[ACTION STEPS] Step ${i}: playing ${preAnimations.length} pre-state animation(s)`);
          await this.executeAnimations(preAnimations, source, executor);
        }

        // 3. Apply step state → React re-renders
        if (step.stateAfter && executor.applyIntermediateState) {
          executor.applyIntermediateState(step.stateAfter);
          await this.waitForReactRender();
        }

        // 4. Play post-state animations (e.g. TELEPORT_IN after drone appears)
        if (postAnimations.length > 0) {
          debugLog('ANIMATIONS', `[ACTION STEPS] Step ${i}: playing ${postAnimations.length} post-state animation(s)`);
          await this.executeAnimations(postAnimations, source, executor);
        }

        // 5. Pause between steps (not after last)
        if (i < steps.length - 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } finally {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.setBlocking(false);
    }

    debugLog('ANIMATIONS', '[ACTION STEPS] All steps complete');
  }

  setBlocking(blocking) {
    debugLog('ANIMATIONS', `🔒 [ANIMATION BLOCKING] Setting blocking to: ${blocking}`);
    this.isBlocking = blocking;
    this.gameStateManager.emit('animationStateChange', { blocking });
  }
}

export default AnimationManager;