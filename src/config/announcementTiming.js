// ========================================
// ANNOUNCEMENT TIMING CONSTANTS
// ========================================
// Shared timing values for the announcement system.
// Used by AnnouncementQueue (total duration) and PhaseAnnouncementOverlay (stage scheduling).
//
// Uniform Hold model: every stage gets the same rhythm.
// Each stage = SCRAMBLE_DURATION_MS (text resolves) + STAGE_HOLD_MS (readable time).
// Total = N * (SCRAMBLE + HOLD) + FADE_OUT.

// Per-stage timing
export const SCRAMBLE_DURATION_MS = 500;
export const STAGE_HOLD_MS = 1000;
export const FADE_OUT_MS = 300;

// Derived: single-announcement total (1 stage)
export const PHASE_DISPLAY_DURATION = SCRAMBLE_DURATION_MS + STAGE_HOLD_MS + FADE_OUT_MS; // 1800ms

/**
 * Compute total display duration for an N-stage announcement.
 * Works for both single (N=1) and compound (N>=2) announcements.
 * @param {number} stageCount - Number of stages
 * @returns {number} Total duration in milliseconds
 */
export function computeCompoundDuration(stageCount) {
  if (stageCount < 1) return PHASE_DISPLAY_DURATION;
  return stageCount * (SCRAMBLE_DURATION_MS + STAGE_HOLD_MS) + FADE_OUT_MS;
}
