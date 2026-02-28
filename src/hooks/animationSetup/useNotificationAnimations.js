import { debugLog, timingLog } from '../../utils/debugLogger.js';

// Animation durations (ms)
const TELEPORT_DURATION = 600;
const PHASE_BREATHING_ROOM_DELAY = 300;

/**
 * Registers notification-related animation handlers on the AnimationManager.
 * Handlers: PHASE_ANNOUNCEMENT_EFFECT, PASS_NOTIFICATION_EFFECT, GO_AGAIN_NOTIFICATION_EFFECT,
 *           SHIP_ABILITY_REVEAL_EFFECT, TELEPORT_EFFECT
 */
export function registerNotificationAnimations(animationManager, {
  gameStateManager,
  droneRefs,
  getElementCenter,
  gameAreaRef,
  setShipAbilityReveals,
  setPhaseAnnouncements,
  setTeleportEffects,
  setPassNotifications,
  setGoAgainNotifications,
  setTriggerFiredNotifications
}) {
  animationManager.registerVisualHandler('PHASE_ANNOUNCEMENT_EFFECT', async (payload) => {
    const { phaseText, phaseName, firstPlayerId, onComplete } = payload;

    timingLog('[VISUAL HANDLER] PHASE_ANNOUNCEMENT handler called', {
      phaseName,
      phaseText,
      blockingReason: 'waiting_for_breathing_room_delay'
    });

    // Add brief delay to provide visual breathing room between overlay clearing and announcement
    // Waiting overlays now clear immediately via 'bothPlayersComplete' event
    await new Promise(resolve => setTimeout(resolve, PHASE_BREATHING_ROOM_DELAY));

    timingLog('[VISUAL HANDLER] Breathing room complete', {
      phaseName,
      blockingReason: 'calculating_subtitle'
    });

    // Calculate subtitle from local player's perspective
    let subtitle = null;
    if (firstPlayerId) {
      const localPlayerId = gameStateManager.getLocalPlayerId();
      subtitle = firstPlayerId === localPlayerId ? 'You Go First' : 'Opponent Goes First';
    }

    debugLog('ANIMATIONS', '📢 [PHASE ANNOUNCEMENT DEBUG] PHASE_ANNOUNCEMENT_EFFECT handler called:', {
      phaseName,
      phaseText,
      firstPlayerId,
      localPlayerId: gameStateManager.getLocalPlayerId(),
      calculatedSubtitle: subtitle
    });

    const announcementId = `phaseannouncement-${crypto.randomUUID()}`;

    timingLog('[VISUAL HANDLER] Setting React state', {
      phaseName,
      announcementId,
      blockingReason: 'calling_setPhaseAnnouncements'
    });

    setPhaseAnnouncements(prev => [...prev, {
      id: announcementId,
      phaseText: phaseText,
      subtitle: subtitle,
      onComplete: () => {
        setPhaseAnnouncements(prev => prev.filter(a => a.id !== announcementId));
        onComplete?.();
      }
    }]);

    timingLog('[VISUAL HANDLER] React state set', {
      phaseName,
      blockingReason: 'waiting_for_react_render_then_animation_duration'
    });
  });

  animationManager.registerVisualHandler('PASS_NOTIFICATION_EFFECT', (payload) => {
    const { passingPlayerId, onComplete } = payload;

    debugLog('ANIMATIONS', '⏸️ [PASS NOTIFICATION DEBUG] PASS_NOTIFICATION_EFFECT handler called:', {
      passingPlayerId
    });

    // Determine if this is the local player or opponent
    const localPlayerId = gameStateManager.getLocalPlayerId();
    const isLocalPlayer = passingPlayerId === localPlayerId;

    const notificationId = `passnotif-${crypto.randomUUID()}`;

    setPassNotifications(prev => [...prev, {
      id: notificationId,
      label: isLocalPlayer ? 'You Passed' : 'Opponent Passed',
      onComplete: () => {
        setPassNotifications(prev => prev.filter(n => n.id !== notificationId));
        onComplete?.();
      }
    }]);
  });

  animationManager.registerVisualHandler('GO_AGAIN_NOTIFICATION_EFFECT', (payload) => {
    const { actingPlayerId, onComplete } = payload;

    const localPlayerId = gameStateManager.getLocalPlayerId();
    const isLocalPlayer = actingPlayerId === localPlayerId;

    const notificationId = `goagain-${crypto.randomUUID()}`;

    setGoAgainNotifications(prev => [...prev, {
      id: notificationId,
      label: isLocalPlayer ? 'Go Again' : 'Opponent Goes Again',
      isLocalPlayer,
      onComplete: () => {
        setGoAgainNotifications(prev => prev.filter(n => n.id !== notificationId));
        onComplete?.();
      }
    }]);
  });

  animationManager.registerVisualHandler('TRIGGER_FIRED_EFFECT', (payload) => {
    const { droneName, abilityName, targetId, onComplete } = payload;

    // Find drone element for positioning above the triggering drone
    const droneEl = droneRefs.current[targetId];
    let position = null;
    if (droneEl) {
      const rect = droneEl.getBoundingClientRect();
      position = {
        left: rect.left + rect.width / 2,
        top: rect.top
      };
    }

    const notificationId = `triggerfired-${crypto.randomUUID()}`;

    setTriggerFiredNotifications(prev => [...prev, {
      id: notificationId,
      droneName: droneName || 'Unknown',
      abilityName: abilityName || 'Triggered',
      position,
      onComplete: () => {
        setTriggerFiredNotifications(prev => prev.filter(n => n.id !== notificationId));
        onComplete?.();
      }
    }]);
  });

  animationManager.registerVisualHandler('SHIP_ABILITY_REVEAL_EFFECT', (payload) => {
    const { abilityName, actingPlayerId, onComplete } = payload;

    debugLog('ANIMATIONS', '🚀 [SHIP ABILITY REVEAL DEBUG] SHIP_ABILITY_REVEAL_EFFECT handler called:', {
      abilityName,
      actingPlayerId
    });

    // Determine if this is the local player or opponent
    const localPlayerId = gameStateManager.getLocalPlayerId();
    const isLocalPlayer = actingPlayerId === localPlayerId;

    // Only show to opponent
    if (!isLocalPlayer) {
      const revealId = `shipability-${crypto.randomUUID()}`;

      setShipAbilityReveals(prev => [...prev, {
        id: revealId,
        abilityName: abilityName,
        label: 'Opponent Used',
        onComplete: () => {
          setShipAbilityReveals(prev => prev.filter(r => r.id !== revealId));
          onComplete?.();
        }
      }]);
    } else {
      // Local player doesn't see overlay, just complete immediately
      onComplete?.();
    }
  });

  animationManager.registerVisualHandler('TELEPORT_EFFECT', (payload) => {
    const { targetId, targetLane, targetPlayer, onComplete } = payload;

    debugLog('ANIMATIONS', '✨ [TELEPORT DEBUG] TELEPORT_EFFECT handler called:', { targetId, targetLane, targetPlayer });

    // Use requestAnimationFrame to ensure React has finished rendering the drone element
    requestAnimationFrame(() => {
      // The drone should now exist as an invisible placeholder - get its exact position
      const droneEl = droneRefs.current[targetId];

      if (!droneEl) {
        debugLog('ANIMATIONS', '⚠️ [TELEPORT DEBUG] Drone element not found - placeholder may not have rendered yet:', targetId);
        onComplete?.();
        return;
      }

      // Get the exact center position of the invisible placeholder drone
      const referencePos = getElementCenter(droneEl, gameAreaRef.current);
      debugLog('ANIMATIONS', '✨ [TELEPORT DEBUG] Using exact drone placeholder position:', referencePos);

      // Determine color based on local player perspective
      const localPlayerId = gameStateManager.getLocalPlayerId();
      const isLocalPlayer = targetPlayer === localPlayerId;
      const teleportColor = isLocalPlayer ? '#00ffff' : '#ef4444'; // Cyan for player, red for opponent

      const teleportId = `teleport-${targetId}-${crypto.randomUUID()}`;

      setTeleportEffects(prev => [...prev, {
        id: teleportId,
        top: referencePos.y,
        left: referencePos.x,
        color: teleportColor,
        duration: TELEPORT_DURATION,
        onComplete: () => {
          setTeleportEffects(prev => prev.filter(t => t.id !== teleportId));
          onComplete?.();
        }
      }]);
    });
  });
}
