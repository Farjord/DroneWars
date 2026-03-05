import { debugLog } from '../utils/debugLogger.js';

function animationsMatch(anim1, anim2) {
  debugLog('OPTIMISTIC', 'Comparing animations:', {
    anim1: anim1.animationName,
    anim2: anim2.animationName,
  });

  if (anim1.animationName !== anim2.animationName) {
    return false;
  }

  const p1 = anim1.payload || {};
  const p2 = anim2.payload || {};

  if (p1.targetId !== p2.targetId) return false;
  if (p1.targetLane !== p2.targetLane) return false;
  if (p1.targetPlayer !== p2.targetPlayer) return false;
  if (p1.attackerId !== p2.attackerId) return false;
  if (p1.sourceCardInstanceId !== p2.sourceCardInstanceId) return false;
  if (p1.abilityId !== p2.abilityId) return false;
  if (p1.teleportType !== p2.teleportType) return false;

  if (anim1.animationName === 'ANIMATION_SEQUENCE') {
    const anims1 = p1.animations || [];
    const anims2 = p2.animations || [];
    if (anims1.length !== anims2.length) return false;
    for (let i = 0; i < anims1.length; i++) {
      if (anims1[i].type !== anims2[i].type) return false;
      if (anims1[i].startAt !== anims2[i].startAt) return false;
    }
  }

  return true;
}

class OptimisticAnimationTracker {
  constructor() {
    this.trackedAnimations = { actionAnimations: [], systemAnimations: [] };
  }

  trackAction(animations) {
    const actionAnims = animations.actionAnimations || [];
    const systemAnims = animations.systemAnimations || [];

    debugLog('OPTIMISTIC', 'Tracking optimistic animations:', {
      actionCount: actionAnims.length,
      systemCount: systemAnims.length,
      totalTracked: this.trackedAnimations.actionAnimations.length + actionAnims.length,
    });

    this.trackedAnimations.actionAnimations.push(...actionAnims);
    this.trackedAnimations.systemAnimations.push(...systemAnims);
  }

  filterAnimations(incomingActionAnimations = [], incomingSystemAnimations = []) {
    const hasTracked =
      this.trackedAnimations.actionAnimations.length > 0 ||
      this.trackedAnimations.systemAnimations.length > 0;

    debugLog('OPTIMISTIC', 'Filtering animations:', {
      incomingAction: incomingActionAnimations.length,
      incomingSystem: incomingSystemAnimations.length,
      trackedAction: this.trackedAnimations.actionAnimations.length,
      trackedSystem: this.trackedAnimations.systemAnimations.length,
    });

    if (!hasTracked) {
      return {
        actionAnimations: incomingActionAnimations,
        systemAnimations: incomingSystemAnimations,
      };
    }

    const filteredActionAnimations = incomingActionAnimations.filter((incoming) => {
      const matchIndex = this.trackedAnimations.actionAnimations.findIndex(
        (tracked) => animationsMatch(incoming, tracked),
      );
      if (matchIndex !== -1) {
        this.trackedAnimations.actionAnimations.splice(matchIndex, 1);
        return false;
      }
      return true;
    });

    return {
      actionAnimations: filteredActionAnimations,
      systemAnimations: incomingSystemAnimations,
    };
  }

  clearTrackedAnimations() {
    this.trackedAnimations = { actionAnimations: [], systemAnimations: [] };
  }

  getStatus() {
    return {
      actionAnimationsTracked: this.trackedAnimations.actionAnimations.length,
      systemAnimationsTracked: this.trackedAnimations.systemAnimations.length,
    };
  }
}

export default OptimisticAnimationTracker;
