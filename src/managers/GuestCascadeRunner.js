// Guest optimistic cascade processor
// Extracted from GameFlowManager — handles non-authority automatic phase processing
import { debugLog } from '../utils/debugLogger.js';

class GuestCascadeRunner {
  constructor(gameFlowManager) {
    this.gfm = gameFlowManager;
    this.isInCheckpointCascade = false;
  }

  /**
   * Process automatic phases until reaching a checkpoint (Guest optimistic processing)
   * Used after placement completes to process: roundInitialization → first required round phase
   * Stops at first milestone phase (checkpoint) for validation with host
   *
   * @param {string} startPhase - Phase to start processing from (typically 'roundInitialization')
   */
  async processAutomaticPhasesUntilCheckpoint(startPhase) {
    debugLog('GUEST_CASCADE', `🚀 [GUEST OPTIMISTIC] Starting automatic processing from: ${startPhase}`);

    this.isInCheckpointCascade = true;

    try {
      await this.gfm.transitionToPhase(startPhase);

      let currentPhase = startPhase;
      const phasesProcessed = [];

      while (true) {
        const nextPhase = await this.gfm.processPhaseLogicOnly(currentPhase, null);
        phasesProcessed.push(currentPhase);

        debugLog('GUEST_CASCADE', `🔄 [GUEST OPTIMISTIC] Processed ${currentPhase}, next: ${nextPhase || 'none'}`);

        if (!nextPhase) {
          debugLog('GUEST_CASCADE', `🏁 [GUEST OPTIMISTIC] Complete - no more phases. Processed: ${phasesProcessed.join(' → ')}`);
          break;
        }

        if (this.gfm.gameStateManager.isMilestonePhase(nextPhase)) {
          await this.gfm.transitionToPhase(nextPhase);
          phasesProcessed.push(nextPhase);
          debugLog('GUEST_CASCADE', `🎯 [GUEST OPTIMISTIC] Reached checkpoint: ${nextPhase}. Processed: ${phasesProcessed.join(' → ')}`);
          break;
        }

        await this.gfm.transitionToPhase(nextPhase);
        currentPhase = nextPhase;
      }

      debugLog('GUEST_CASCADE', `✅ [GUEST OPTIMISTIC] Processing complete. Total phases: ${phasesProcessed.length}`);
    } finally {
      this.isInCheckpointCascade = false;

      if (this.gfm._tryStartPlayback('GFM:guest_cascade:987')) {
        debugLog('TIMING', `🎬 [GUEST] Starting animation playback after optimistic cascade`);
      }
    }
  }

  /**
   * Track optimistic animations from guest automatic phase processing.
   * Captures animations generated during non-authority phase processing
   * so they can be deduplicated when host broadcast arrives.
   * @param {string} phase - Phase that generated the animations
   */
  trackOptimisticAnimations(phase) {
    const actionAnims = this.gfm.actionProcessor.getAndClearPendingActionAnimations();
    const systemAnims = this.gfm.actionProcessor.getAndClearPendingSystemAnimations();

    if ((actionAnims && actionAnims.length > 0) || (systemAnims && systemAnims.length > 0)) {
      const animations = {
        actionAnimations: actionAnims || [],
        systemAnimations: systemAnims || []
      };

      debugLog('GUEST_CASCADE', `🎬 [ANIMATION SOURCE] Phase "${phase}" generated animations (OPTIMISTIC_CASCADE)`, {
        actionCount: animations.actionAnimations.length,
        systemCount: animations.systemAnimations.length,
        actionTypes: animations.actionAnimations.map(a => a.animationName),
        systemTypes: animations.systemAnimations.map(a => a.animationName)
      });
      this.gfm.gameStateManager.trackOptimisticAnimations(animations);
    }
  }

  reset() {
    this.isInCheckpointCascade = false;
  }
}

export default GuestCascadeRunner;
