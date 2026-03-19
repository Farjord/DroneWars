import { debugLog, timingLog } from '../../utils/debugLogger.js';
import { getViewportCenter } from '../../utils/gameUtils.js';
import { isLocalPlayer, getTopCenterPosition } from '../../utils/animationPositioning.js';

// Animation durations (ms)
const TELEPORT_DURATION = 600;

/**
 * Registers notification-related animation handlers on the AnimationManager.
 * Handlers: PASS_NOTIFICATION_EFFECT, GO_AGAIN_NOTIFICATION_EFFECT,
 *           SHIP_ABILITY_REVEAL_EFFECT, TELEPORT_EFFECT
 *
 * Note: PHASE_ANNOUNCEMENT_EFFECT removed — announcements now route through
 * AnnouncementQueue (auto-play FIFO), not AnimationManager.
 */
export function registerNotificationAnimations(animationManager, {
  gameStateManager,
  getElementFromLogicalPosition,
  animationDispatch
}) {
  animationManager.registerVisualHandler('PASS_NOTIFICATION_EFFECT', (payload) => {
    const { passingPlayerId, onComplete } = payload;

    debugLog('ANIMATIONS', '⏸️ [PASS NOTIFICATION DEBUG] PASS_NOTIFICATION_EFFECT handler called:', {
      passingPlayerId
    });

    const isLocal = isLocalPlayer(gameStateManager, passingPlayerId);

    const notificationId = `passnotif-${crypto.randomUUID()}`;

    animationDispatch.add('passNotifications', {
      id: notificationId,
      label: isLocal ? 'You Passed' : 'Opponent Passed',
      onComplete: () => {
        animationDispatch.remove('passNotifications', notificationId);
        onComplete?.();
      }
    });
  });

  animationManager.registerVisualHandler('GO_AGAIN_NOTIFICATION_EFFECT', (payload) => {
    const { actingPlayerId, onComplete } = payload;

    const isLocal = isLocalPlayer(gameStateManager, actingPlayerId);

    const notificationId = `goagain-${crypto.randomUUID()}`;

    animationDispatch.add('goAgainNotifications', {
      id: notificationId,
      label: isLocal ? 'Go Again' : 'Opponent Goes Again',
      isLocalPlayer: isLocal,
      onComplete: () => {
        animationDispatch.remove('goAgainNotifications', notificationId);
        onComplete?.();
      }
    });
  });

  animationManager.registerVisualHandler('TRIGGER_FIRED_EFFECT', (payload) => {
    const { abilityName, targetId, onComplete } = payload;

    // Find drone/tech element for positioning centered on the triggering entity
    const droneEl = getElementFromLogicalPosition(null, null, targetId, 'entity');
    const position = getViewportCenter(droneEl);

    const notificationId = `triggerfired-${crypto.randomUUID()}`;

    animationDispatch.add('triggerFiredNotifications', {
      id: notificationId,
      abilityName: abilityName || 'Triggered',
      position,
      onComplete: () => {
        animationDispatch.remove('triggerFiredNotifications', notificationId);
        onComplete?.();
      }
    });
  });

  animationManager.registerVisualHandler('MOVEMENT_BLOCKED_EFFECT', (payload) => {
    const { droneName, targetId, onComplete } = payload;

    const droneEl = getElementFromLogicalPosition(null, null, targetId, 'entity');
    const position = getTopCenterPosition(droneEl);

    const notificationId = `moveblocked-${crypto.randomUUID()}`;

    animationDispatch.add('movementBlockedNotifications', {
      id: notificationId,
      droneName: droneName || 'Unknown',
      message: 'Movement Blocked',
      position,
      onComplete: () => {
        animationDispatch.remove('movementBlockedNotifications', notificationId);
        onComplete?.();
      }
    });
  });

  animationManager.registerVisualHandler('SHIP_ABILITY_REVEAL_EFFECT', (payload) => {
    const { abilityName, actingPlayerId, onComplete } = payload;

    debugLog('ANIMATIONS', '🚀 [SHIP ABILITY REVEAL DEBUG] SHIP_ABILITY_REVEAL_EFFECT handler called:', {
      abilityName,
      actingPlayerId
    });

    // Only show to opponent
    if (!isLocalPlayer(gameStateManager, actingPlayerId)) {
      const revealId = `shipability-${crypto.randomUUID()}`;

      animationDispatch.add('shipAbilityReveals', {
        id: revealId,
        abilityName: abilityName,
        label: 'Opponent Used',
        onComplete: () => {
          animationDispatch.remove('shipAbilityReveals', revealId);
          onComplete?.();
        }
      });
    } else {
      // Local player doesn't see overlay, just complete immediately
      onComplete?.();
    }
  });

  animationManager.registerVisualHandler('TELEPORT_EFFECT', (payload) => {
    const { targetId, targetLane, targetPlayer, onComplete } = payload;

    debugLog('ANIMATIONS', '✨ [TELEPORT DEBUG] TELEPORT_EFFECT handler called:', { targetId, targetLane, targetPlayer });

    // Double rAF ensures React commit is complete (matches waitForReactRender pattern)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // The drone should now exist as an invisible placeholder - get its exact position
        const droneEl = getElementFromLogicalPosition(null, null, targetId, 'entity');

        if (!droneEl) {
          debugLog('ANIMATIONS', '⚠️ [TELEPORT DEBUG] Drone element not found - placeholder may not have rendered yet:', targetId);
          onComplete?.();
          return;
        }

        // Get the exact center position of the invisible placeholder drone
        const referencePos = getViewportCenter(droneEl);
        debugLog('ANIMATIONS', '✨ [TELEPORT DEBUG] Using exact drone placeholder position:', referencePos);

        // Determine color based on local player perspective
        const isLocal = isLocalPlayer(gameStateManager, targetPlayer);
        const teleportColor = isLocal ? '#00ffff' : '#ef4444'; // Cyan for player, red for opponent

        const teleportId = `teleport-${targetId}-${crypto.randomUUID()}`;

        animationDispatch.add('teleportEffects', {
          id: teleportId,
          top: referencePos.y,
          left: referencePos.x,
          color: teleportColor,
          duration: TELEPORT_DURATION,
          onComplete: () => {
            animationDispatch.remove('teleportEffects', teleportId);
            onComplete?.();
          }
        });
      });
    });
  });
}
