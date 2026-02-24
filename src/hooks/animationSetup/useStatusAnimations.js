import { debugLog } from '../../utils/debugLogger.js';

// Animation durations (ms)
const SHAKE_DURATION = 500;

/**
 * Registers status-related animation handlers on the AnimationManager.
 * Handlers: FLASH_EFFECT, HEAL_EFFECT, EXPLOSION_EFFECT, SHAKE_EFFECT
 */
export function registerStatusAnimations(animationManager, {
  droneRefs,
  sectionRefs,
  getElementFromLogicalPosition,
  getElementCenter,
  gameAreaRef,
  triggerExplosion,
  setFlashEffects,
  setHealEffects
}) {
  animationManager.registerVisualHandler('EXPLOSION_EFFECT', (payload) => {
    const { targetId, targetPlayer, targetLane, targetType, config, onComplete } = payload;

    // Use logical position mapper to get DOM element
    const targetEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, targetType);

    if (targetEl) {
      const pos = getElementCenter(targetEl, gameAreaRef.current);
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

    setFlashEffects(prev => [...prev, {
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
        setFlashEffects(prev => prev.filter(f => f.id !== flashId));
        onComplete?.();
      }
    }]);
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

    setHealEffects(prev => [...prev, {
      id: healId,
      position: {
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height
      },
      healAmount: healAmount,
      onComplete: () => {
        setHealEffects(prev => prev.filter(h => h.id !== healId));
        onComplete?.();
      }
    }]);

    debugLog('ANIMATIONS', '✅ [HEAL DEBUG] Heal effect created:', healId);
  });

  animationManager.registerVisualHandler('SHAKE_EFFECT', (payload) => {
    const { targetId, config, onComplete } = payload;
    const targetEl = droneRefs.current[targetId];

    if (targetEl) {
      targetEl.classList.add('animate-shake-damage');
      setTimeout(() => {
        targetEl.classList.remove('animate-shake-damage');
        onComplete?.();
      }, config?.duration || SHAKE_DURATION);
    } else {
      onComplete?.();
    }
  });
}
