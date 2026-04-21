// ========================================
// ANNOUNCEMENT UTILITIES
// ========================================
// Shared personalization and extraction logic for phase/pass announcements.
// Used by GameEngine (multiplayer broadcast) and SinglePlayerCombatInitializer (local).

import { ACTION_ANNOUNCEMENT_TOTAL_MS } from '../config/announcementTiming.js';
import { debugLog } from './debugLogger.js';

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
    } else if (anim.animationName === 'ATTACK_ANNOUNCEMENT') {
      const beforeKeys = Object.keys(anim.payload);
      const { attackerPlayerId, targetPlayerId } = anim.payload;
      anim.payload = {
        ...anim.payload,
        attackerIsPlayer: attackerPlayerId === playerId,
        targetIsPlayer: targetPlayerId === playerId,
      };
      debugLog('ANNOUNCE_TRACE', `🔄 PERSONALIZE ATTACK_ANNOUNCEMENT attackerLane=${anim.payload.attackerLane} targetLane=${anim.payload.targetLane} forPlayer=${playerId}`, {
        forPlayer: playerId,
        beforeKeys,
        afterKeys: Object.keys(anim.payload),
        attackerLane: anim.payload.attackerLane,
        targetLane: anim.payload.targetLane,
        attackerIsPlayer: anim.payload.attackerIsPlayer,
        targetIsPlayer: anim.payload.targetIsPlayer,
      });
    } else if (anim.animationName === 'MOVE_ANNOUNCEMENT') {
      const beforeKeys = Object.keys(anim.payload);
      const { dronePlayerId } = anim.payload;
      anim.payload = {
        ...anim.payload,
        droneIsPlayer: dronePlayerId === playerId,
      };
      debugLog('ANNOUNCE_TRACE', `🔄 PERSONALIZE MOVE_ANNOUNCEMENT sourceLane=${anim.payload.sourceLane} destinationLane=${anim.payload.destinationLane} forPlayer=${playerId}`, {
        forPlayer: playerId,
        beforeKeys,
        afterKeys: Object.keys(anim.payload),
        sourceLane: anim.payload.sourceLane,
        destinationLane: anim.payload.destinationLane,
        droneIsPlayer: anim.payload.droneIsPlayer,
      });
    } else if (anim.animationName === 'CARD_ANNOUNCEMENT') {
      const { playerId: cardPlayerId, targets = [] } = anim.payload;
      const personalizedTargets = targets.map(t => ({
        ...t,
        targetIsPlayer: t.ownerId != null ? t.ownerId === playerId : null,
      }));
      anim.payload = {
        ...anim.payload,
        cardIsPlayer: cardPlayerId === playerId,
        targets: personalizedTargets,
      };
      debugLog('ANNOUNCE_TRACE', `🔄 PERSONALIZE CARD_ANNOUNCEMENT card=${anim.payload.cardName} targetCount=${personalizedTargets.length} forPlayer=${playerId}`, {
        forPlayer: playerId,
        cardIsPlayer: anim.payload.cardIsPlayer,
        targetKinds: personalizedTargets.map(t => t.kind),
      });
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
  const announcementTypes = new Set([
    'PHASE_ANNOUNCEMENT', 'PASS_ANNOUNCEMENT', 'INTERCEPTION_ANNOUNCEMENT',
    'ATTACK_ANNOUNCEMENT', 'MOVE_ANNOUNCEMENT', 'CARD_ANNOUNCEMENT',
  ]);
  const visualAnimations = [];
  const announcements = [];

  for (const anim of allAnimations) {
    if (announcementTypes.has(anim.animationName)) {
      if (anim.animationName === 'ATTACK_ANNOUNCEMENT') {
        const built = {
          id: `drone-action-${crypto.randomUUID()}`,
          phaseName: 'droneAttack',
          duration: ACTION_ANNOUNCEMENT_TOTAL_MS,
          data: anim.payload,
        };
        debugLog('ANNOUNCE_TRACE', `📦 EXTRACT droneAttack attackerLane=${built.data?.attackerLane} targetLane=${built.data?.targetLane}`, {
          id: built.id,
          duration: built.duration,
          dataKeys: Object.keys(built.data || {}),
          attackerLane: built.data?.attackerLane,
          targetLane: built.data?.targetLane,
        });
        announcements.push(built);
      } else if (anim.animationName === 'MOVE_ANNOUNCEMENT') {
        const built = {
          id: `drone-action-${crypto.randomUUID()}`,
          phaseName: 'droneMove',
          duration: ACTION_ANNOUNCEMENT_TOTAL_MS,
          data: anim.payload,
        };
        debugLog('ANNOUNCE_TRACE', `📦 EXTRACT droneMove sourceLane=${built.data?.sourceLane} destinationLane=${built.data?.destinationLane}`, {
          id: built.id,
          duration: built.duration,
          dataKeys: Object.keys(built.data || {}),
          sourceLane: built.data?.sourceLane,
          destinationLane: built.data?.destinationLane,
        });
        announcements.push(built);
      } else if (anim.animationName === 'CARD_ANNOUNCEMENT') {
        const built = {
          id: `card-play-${crypto.randomUUID()}`,
          phaseName: 'cardPlay',
          duration: ACTION_ANNOUNCEMENT_TOTAL_MS,
          data: anim.payload,
        };
        debugLog('ANNOUNCE_TRACE', `📦 EXTRACT cardPlay card=${built.data?.cardName} targetCount=${built.data?.targets?.length || 0}`, {
          id: built.id,
          duration: built.duration,
          cardName: built.data?.cardName,
          targetKinds: (built.data?.targets || []).map(t => t.kind),
        });
        announcements.push(built);
      } else {
        announcements.push({
          id: `phase-anim-${crypto.randomUUID()}`,
          phaseName: anim.payload.phase || 'playerPass',
          phaseText: anim.payload.text,
          subtitle: anim.payload.subtitle || null,
          variant: anim.payload.variant || null,
          subtitleVariant: anim.payload.subtitleVariant || null,
        });
      }
    } else {
      visualAnimations.push(anim);
    }
  }

  return { announcements, visualAnimations };
}
