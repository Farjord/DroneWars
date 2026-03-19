// ========================================
// ANNOUNCEMENT UTILITIES
// ========================================
// Shared personalization and extraction logic for phase/pass announcements.
// Used by GameEngine (multiplayer broadcast) and SinglePlayerCombatInitializer (local).

/**
 * Personalize announcement animations for a specific player.
 * Mutates animations in-place — caller should clone if immutability is needed.
 * - roundAnnouncement: bakes in round number -> "ROUND 3"
 * - roundTransition: bakes in round number -> "TRANSITIONING TO ROUND 3"
 * - deployment/action: sets subtitle -> "You Go First" / "Opponent Goes First"
 *   and subtitleVariant -> 'player' / 'opponent'
 * - PASS_ANNOUNCEMENT: sets text -> "YOU PASSED" / "OPPONENT PASSED"
 *   and variant -> 'player' / 'opponent'
 */
export function personalizeAnnouncements(animations, playerId, state) {
  const personalizeAnim = (anim) => {
    if (anim.animationName === 'PHASE_ANNOUNCEMENT') {
      const { phase } = anim.payload;

      if (phase === 'roundAnnouncement') {
        anim.payload = { ...anim.payload, text: `ROUND ${state.roundNumber || 1}` };
      } else if (phase === 'roundTransition') {
        anim.payload = { ...anim.payload, text: `TRANSITIONING TO ROUND ${state.roundNumber || 1}` };
      } else if (phase === 'deployment' || phase === 'action') {
        const isFirst = state.firstPlayerOfRound === playerId;
        const subtitle = state.firstPlayerOfRound
          ? (isFirst ? 'You Go First' : 'Opponent Goes First')
          : null;
        const subtitleVariant = state.firstPlayerOfRound
          ? (isFirst ? 'player' : 'opponent')
          : null;
        anim.payload = { ...anim.payload, subtitle, subtitleVariant };
      }
    } else if (anim.animationName === 'PASS_ANNOUNCEMENT') {
      const { passedPlayerId } = anim.payload;
      const isLocal = passedPlayerId === playerId;
      const text = isLocal ? 'YOU PASSED' : 'OPPONENT PASSED';
      const variant = isLocal ? 'player' : 'opponent';
      anim.payload = { ...anim.payload, text, phase: 'playerPass', variant };
    }
  };

  animations.actionAnimations.forEach(personalizeAnim);
  animations.systemAnimations.forEach(personalizeAnim);
}

/**
 * Extract PHASE_ANNOUNCEMENT and PASS_ANNOUNCEMENT from a flat animation array.
 * Returns announcement queue items and remaining visual animations.
 * Mirrors GameClient._extractAndQueueAnnouncements but as a pure function.
 */
export function extractAnnouncements(allAnimations) {
  const announcementTypes = new Set(['PHASE_ANNOUNCEMENT', 'PASS_ANNOUNCEMENT', 'INTERCEPTION_ANNOUNCEMENT']);
  const visualAnimations = [];
  const announcements = [];

  for (const anim of allAnimations) {
    if (announcementTypes.has(anim.animationName)) {
      announcements.push({
        id: `phase-anim-${crypto.randomUUID()}`,
        phaseName: anim.payload.phase || 'playerPass',
        phaseText: anim.payload.text,
        subtitle: anim.payload.subtitle || null,
        variant: anim.payload.variant || null,
        subtitleVariant: anim.payload.subtitleVariant || null,
      });
    } else {
      visualAnimations.push(anim);
    }
  }

  return { announcements, visualAnimations };
}
