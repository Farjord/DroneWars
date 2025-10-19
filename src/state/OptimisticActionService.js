// ========================================
// OPTIMISTIC ACTION SERVICE
// ========================================
// Tracks animations played optimistically by guest
// Filters duplicate animations from host responses
// Ensures only unique animations are played

import { debugLog } from '../utils/debugLogger.js';

/**
 * Deep comparison of animation payloads to determine if they're duplicates
 * Note: Ignores timestamp field which differs between guest/host creation times
 */
function animationsMatch(anim1, anim2) {
  debugLog('OPTIMISTIC', '🔍 [MATCH] Comparing animations:', {
    anim1_name: anim1.animationName,
    anim2_name: anim2.animationName,
    anim1_payload: anim1.payload,
    anim2_payload: anim2.payload
  });

  // Must be same animation type
  if (anim1.animationName !== anim2.animationName) {
    debugLog('OPTIMISTIC', '❌ [MATCH] Animation names differ:', {
      anim1: anim1.animationName,
      anim2: anim2.animationName
    });
    return false;
  }

  const p1 = anim1.payload || {};
  const p2 = anim2.payload || {};

  // Log payload keys for comparison
  const keys1 = Object.keys(p1).filter(k => k !== 'timestamp');
  const keys2 = Object.keys(p2).filter(k => k !== 'timestamp');
  debugLog('OPTIMISTIC', '🔍 [MATCH] Payload keys:', {
    anim1_keys: keys1,
    anim2_keys: keys2,
    keys1_length: keys1.length,
    keys2_length: keys2.length
  });

  // Match by target entity
  if (p1.targetId !== p2.targetId) {
    debugLog('OPTIMISTIC', '❌ [MATCH] targetId differs:', { p1: p1.targetId, p2: p2.targetId });
    return false;
  }
  if (p1.targetLane !== p2.targetLane) {
    debugLog('OPTIMISTIC', '❌ [MATCH] targetLane differs:', { p1: p1.targetLane, p2: p2.targetLane });
    return false;
  }
  if (p1.targetPlayer !== p2.targetPlayer) {
    debugLog('OPTIMISTIC', '❌ [MATCH] targetPlayer differs:', { p1: p1.targetPlayer, p2: p2.targetPlayer });
    return false;
  }

  // Match by source (for attacks, card plays, abilities)
  if (p1.attackerId !== p2.attackerId) {
    debugLog('OPTIMISTIC', '❌ [MATCH] attackerId differs:', { p1: p1.attackerId, p2: p2.attackerId });
    return false;
  }
  if (p1.sourceCardInstanceId !== p2.sourceCardInstanceId) {
    debugLog('OPTIMISTIC', '❌ [MATCH] sourceCardInstanceId differs:', { p1: p1.sourceCardInstanceId, p2: p2.sourceCardInstanceId });
    return false;
  }
  if (p1.abilityId !== p2.abilityId) {
    debugLog('OPTIMISTIC', '❌ [MATCH] abilityId differs:', { p1: p1.abilityId, p2: p2.abilityId });
    return false;
  }

  // For teleport animations, also check type (in vs out)
  if (p1.teleportType !== p2.teleportType) {
    debugLog('OPTIMISTIC', '❌ [MATCH] teleportType differs:', { p1: p1.teleportType, p2: p2.teleportType });
    return false;
  }

  // Special handling for ANIMATION_SEQUENCE - compare nested animations
  if (anim1.animationName === 'ANIMATION_SEQUENCE') {
    const anims1 = p1.animations || [];
    const anims2 = p2.animations || [];

    debugLog('OPTIMISTIC', '🔍 [MATCH] Comparing ANIMATION_SEQUENCE:', {
      anims1_length: anims1.length,
      anims2_length: anims2.length,
      anims1: anims1,
      anims2: anims2
    });

    // Must have same number of animations
    if (anims1.length !== anims2.length) {
      debugLog('OPTIMISTIC', '❌ [MATCH] ANIMATION_SEQUENCE length differs');
      return false;
    }

    // Compare each nested animation by type and timing
    for (let i = 0; i < anims1.length; i++) {
      if (anims1[i].type !== anims2[i].type) {
        debugLog('OPTIMISTIC', `❌ [MATCH] Nested animation ${i} type differs:`, {
          anim1_type: anims1[i].type,
          anim2_type: anims2[i].type
        });
        return false;
      }
      if (anims1[i].startAt !== anims2[i].startAt) {
        debugLog('OPTIMISTIC', `❌ [MATCH] Nested animation ${i} startAt differs:`, {
          anim1_startAt: anims1[i].startAt,
          anim2_startAt: anims2[i].startAt
        });
        return false;
      }
    }
  }

  debugLog('OPTIMISTIC', '✅ [MATCH] Animations match!');
  return true;
}

class OptimisticActionService {
  constructor() {
    this.trackedAnimations = {
      actionAnimations: [],
      systemAnimations: []
    };
  }

  /**
   * Track animations from an optimistic action
   * @param {Object} animations - {actionAnimations: [], systemAnimations: []}
   */
  trackAction(animations) {
    const actionCount = animations.actionAnimations?.length || 0;
    const systemCount = animations.systemAnimations?.length || 0;

    debugLog('OPTIMISTIC', '🔮 [TRACK] Tracking optimistic animations:', {
      actionCount,
      systemCount,
      totalTracked: this.trackedAnimations.actionAnimations.length + actionCount
    });

    // Log each animation being tracked with full payload
    (animations.actionAnimations || []).forEach((anim, index) => {
      debugLog('OPTIMISTIC', `🔮 [TRACK] Action animation ${index + 1}/${actionCount}:`, {
        animationName: anim.animationName,
        payload: anim.payload,
        timing: anim.timing
      });
    });

    // Store animations
    // Note: Tracked animations are removed naturally during filtering via splice()
    // No timeout needed - list empties as matches are found
    this.trackedAnimations.actionAnimations.push(...(animations.actionAnimations || []));
    this.trackedAnimations.systemAnimations.push(...(animations.systemAnimations || []));
  }

  /**
   * Filter incoming animations to remove duplicates
   * @param {Array} incomingActionAnimations - Action animations from host
   * @param {Array} incomingSystemAnimations - System animations from host
   * @returns {Object} - {actionAnimations: [], systemAnimations: []}
   */
  filterAnimations(incomingActionAnimations = [], incomingSystemAnimations = []) {
    const hasTracked = this.trackedAnimations.actionAnimations.length > 0 ||
                       this.trackedAnimations.systemAnimations.length > 0;

    debugLog('OPTIMISTIC', '🔍 [FILTER] Starting animation filtering:', {
      incomingActionCount: incomingActionAnimations.length,
      incomingSystemCount: incomingSystemAnimations.length,
      trackedActionCount: this.trackedAnimations.actionAnimations.length,
      trackedSystemCount: this.trackedAnimations.systemAnimations.length
    });

    // Log incoming animations with full payloads
    incomingActionAnimations.forEach((anim, index) => {
      debugLog('OPTIMISTIC', `🔍 [FILTER] Incoming animation ${index + 1}/${incomingActionAnimations.length}:`, {
        animationName: anim.animationName,
        payload: anim.payload,
        timing: anim.timing
      });
    });

    // Log tracked animations for comparison
    this.trackedAnimations.actionAnimations.forEach((anim, index) => {
      debugLog('OPTIMISTIC', `🔍 [FILTER] Tracked animation ${index + 1}/${this.trackedAnimations.actionAnimations.length}:`, {
        animationName: anim.animationName,
        payload: anim.payload,
        timing: anim.timing
      });
    });

    if (!hasTracked) {
      debugLog('OPTIMISTIC', '🔍 [FILTER] No tracked animations - returning all incoming');
      // Nothing tracked - return all animations
      return {
        actionAnimations: incomingActionAnimations,
        systemAnimations: incomingSystemAnimations
      };
    }

    // Filter action animations - remove each matched animation from tracking
    const filteredActionAnimations = incomingActionAnimations.filter((incoming, incomingIndex) => {
      debugLog('OPTIMISTIC', `🔍 [FILTER] Checking incoming animation ${incomingIndex + 1} against all tracked animations`);

      const matchIndex = this.trackedAnimations.actionAnimations.findIndex(tracked =>
        animationsMatch(incoming, tracked)
      );

      if (matchIndex !== -1) {
        // Found a match - remove this specific tracked animation
        this.trackedAnimations.actionAnimations.splice(matchIndex, 1);

        debugLog('OPTIMISTIC', '⏭️ [FILTER] MATCH FOUND - Skipping duplicate animation:', {
          animationName: incoming.animationName,
          targetId: incoming.payload?.targetId,
          matchedWithTrackedIndex: matchIndex
        });

        return false; // Filter out (don't play)
      }

      debugLog('OPTIMISTIC', '➕ [FILTER] NO MATCH - Keeping animation:', {
        animationName: incoming.animationName,
        targetId: incoming.payload?.targetId
      });

      return true; // Keep (play)
    });

    // System animations always play (phase announcements, etc.)
    const filteredSystemAnimations = incomingSystemAnimations;

    debugLog('OPTIMISTIC', '🔍 [FILTER] Animation filtering complete:', {
      incomingAction: incomingActionAnimations.length,
      incomingSystem: incomingSystemAnimations.length,
      filteredAction: filteredActionAnimations.length,
      filteredSystem: filteredSystemAnimations.length,
      skippedCount: incomingActionAnimations.length - filteredActionAnimations.length,
      remainingTracked: this.trackedAnimations.actionAnimations.length
    });

    return {
      actionAnimations: filteredActionAnimations,
      systemAnimations: filteredSystemAnimations
    };
  }

  /**
   * Clear all tracked animations
   */
  clearTrackedAnimations() {
    const hadTracked = this.trackedAnimations.actionAnimations.length > 0 ||
                       this.trackedAnimations.systemAnimations.length > 0;

    if (hadTracked) {
      debugLog('OPTIMISTIC', '🧹 [CLEAR] clearTrackedAnimations() called');
      debugLog('OPTIMISTIC', '🧹 [CLEAR] Tracked counts before clear:', {
        actionCount: this.trackedAnimations.actionAnimations.length,
        systemCount: this.trackedAnimations.systemAnimations.length
      });

      // Capture stack trace to identify caller
      const stack = new Error().stack;
      debugLog('OPTIMISTIC', '🧹 [CLEAR] Stack trace:', stack);
    }

    this.trackedAnimations = {
      actionAnimations: [],
      systemAnimations: []
    };
  }

  /**
   * Get current tracking status for debugging
   */
  getStatus() {
    return {
      actionAnimationsTracked: this.trackedAnimations.actionAnimations.length,
      systemAnimationsTracked: this.trackedAnimations.systemAnimations.length
    };
  }
}

export default OptimisticActionService;
