import { debugLog } from '../../utils/debugLogger.js';
import { getViewportCenter } from '../../utils/gameUtils.js';

// Animation durations (ms)
/**
 * Registers status-related animation handlers on the AnimationManager.
 * Handlers: FLASH_EFFECT, HEAL_EFFECT, EXPLOSION_EFFECT, STAT_CHANGE_EFFECT
 */
export function registerStatusAnimations(animationManager, {
  droneRefs,
  sectionRefs,
  getElementFromLogicalPosition,
  triggerExplosion,
  animationDispatch
}) {
  animationManager.registerVisualHandler('EXPLOSION_EFFECT', (payload) => {
    const { targetId, targetPlayer, targetLane, targetType, config, onComplete } = payload;

    // Use logical position mapper to get DOM element
    const targetEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, targetType);

    if (targetEl) {
      const pos = getViewportCenter(targetEl);
      // Pass size from config
      triggerExplosion(targetId, pos, config?.size || 'large');
    } else {
      debugLog('ANIMATIONS', '⚠️ [EXPLOSION DEBUG] Target element not found:', {
        targetId,
        targetPlayer,
        targetLane,
        targetType
      });
    }
    onComplete?.();
  });

  animationManager.registerVisualHandler('FLASH_EFFECT', (payload) => {
    const { targetId, targetPlayer, targetLane, targetType, config, onComplete } = payload;

    // Use logical position mapper to get DOM element
    const targetEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, targetType);

    if (!targetEl) {
      debugLog('ANIMATIONS', '⚠️ [FLASH DEBUG] Target element not found:', {
        targetId,
        targetPlayer,
        targetLane,
        targetType
      });
      onComplete?.();
      return;
    }

    // Calculate position from target element
    const targetRect = targetEl.getBoundingClientRect();
    const flashId = `flash-${targetId}-${crypto.randomUUID()}`;

    animationDispatch.add('flashEffects', {
      id: flashId,
      position: {
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height
      },
      color: config.color,
      intensity: config.intensity,
      onComplete: () => {
        animationDispatch.remove('flashEffects', flashId);
        onComplete?.();
      }
    });
  });

  animationManager.registerVisualHandler('HEAL_EFFECT', (payload) => {
    const { targetId, targetPlayer, targetLane, targetType, healAmount, onComplete } = payload;

    debugLog('ANIMATIONS', '💚 [HEAL DEBUG] HEAL_EFFECT handler called with payload:', {
      targetId,
      targetPlayer,
      targetLane,
      targetType,
      healAmount,
      rawPayload: payload  // Log full payload to verify structure
    });

    // Use logical position mapper to get DOM element
    const targetEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, targetType);

    if (!targetEl) {
      debugLog('ANIMATIONS', '⚠️ [HEAL DEBUG] Target element not found:', {
        targetId,
        targetPlayer,
        targetLane,
        targetType,
        droneRefsKeys: Object.keys(droneRefs.current),  // Log available drone refs
        sectionRefsKeys: Object.keys(sectionRefs.current)  // Log available section refs
      });
      onComplete?.();
      return;
    }

    // Calculate position from target element
    const targetRect = targetEl.getBoundingClientRect();
    const healId = `heal-${targetId}-${crypto.randomUUID()}`;

    animationDispatch.add('healEffects', {
      id: healId,
      position: {
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height
      },
      healAmount: healAmount,
      onComplete: () => {
        animationDispatch.remove('healEffects', healId);
        onComplete?.();
      }
    });

    debugLog('ANIMATIONS', '✅ [HEAL DEBUG] Heal effect created:', healId);
  });

  animationManager.registerVisualHandler('STAT_CHANGE_EFFECT', (payload) => {
    const { targetId, targetPlayer, targetLane, stat, config, onComplete } = payload;

    // Find the drone element via logical position mapper
    const droneEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, 'drone');

    if (!droneEl) {
      debugLog('ANIMATIONS', '⚠️ [STAT_CHANGE] Drone element not found:', { targetId, targetPlayer, targetLane });
      onComplete?.();
      return;
    }

    // Find the specific stat hex within the drone element
    const hexSelector = stat === 'attack' ? '.stat-hex-attack' : '.stat-hex-speed';
    const hexEl = droneEl.querySelector(hexSelector);

    if (!hexEl) {
      debugLog('ANIMATIONS', '⚠️ [STAT_CHANGE] Stat hex not found:', { targetId, stat, hexSelector });
      onComplete?.();
      return;
    }

    const hexRect = hexEl.getBoundingClientRect();
    const effectId = `stat-change-${targetId}-${stat}-${crypto.randomUUID()}`;

    animationDispatch.add('statChangeEffects', {
      id: effectId,
      position: {
        left: hexRect.left,
        top: hexRect.top,
        width: hexRect.width,
        height: hexRect.height
      },
      isBuff: config.isBuff,
      onComplete: () => {
        animationDispatch.remove('statChangeEffects', effectId);
        onComplete?.();
      }
    });
  });
}
