import { debugLog } from '../../utils/debugLogger.js';

// Lane name to testid suffix mapping
const LANE_TESTID_SUFFIX = { lane1: 'left', lane2: 'middle', lane3: 'right' };

/**
 * Registers the DRONE_MOVEMENT_EFFECT visual handler on the AnimationManager.
 * Uses the FlyingDrone overlay (via setFlyingDrones) to slide a drone between lanes.
 */
export function registerMovementAnimations(animationManager, {
  gameStateManager,
  droneRefs,
  setFlyingDrones
}) {
  animationManager.registerVisualHandler('DRONE_MOVEMENT_EFFECT', (payload) => {
    const { droneId, sourcePlayer, sourceLane, targetLane, onComplete } = payload;

    debugLog('ANIMATIONS', '[MOVEMENT] DRONE_MOVEMENT_EFFECT handler called:', {
      droneId, sourcePlayer, sourceLane, targetLane
    });

    // 1. Get drone element in its current (old) lane
    const droneEl = droneRefs.current[droneId];
    if (!droneEl) {
      debugLog('ANIMATIONS', '[MOVEMENT] Drone element not found, skipping:', droneId);
      onComplete?.();
      return;
    }

    // 2. Start position: drone's current viewport position (FlyingDrone uses position: fixed)
    const droneRect = droneEl.getBoundingClientRect();
    const startPos = { x: droneRect.left, y: droneRect.top };

    // 3. Find target lane element on the correct board half.
    //    There are two lane-drop-zone elements per lane (local + opponent).
    //    Pick the one on the same board half as the drone (closest Y to drone).
    const suffix = LANE_TESTID_SUFFIX[targetLane];
    const targetLaneDivs = document.querySelectorAll(
      `[data-testid="lane-drop-zone-${suffix}"]`
    );

    if (targetLaneDivs.length === 0) {
      debugLog('ANIMATIONS', '[MOVEMENT] Target lane element not found:', targetLane);
      onComplete?.();
      return;
    }

    // Pick the lane div closest to the drone's Y position (same player half)
    let targetEl = targetLaneDivs[0];
    if (targetLaneDivs.length > 1) {
      let bestDist = Infinity;
      targetLaneDivs.forEach(el => {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - (droneRect.top + droneRect.height / 2));
        if (dist < bestDist) {
          bestDist = dist;
          targetEl = el;
        }
      });
    }

    const targetRect = targetEl.getBoundingClientRect();
    const endPos = {
      x: targetRect.left + targetRect.width / 2 - droneRect.width / 2,
      y: targetRect.top + targetRect.height / 2 - droneRect.height / 2
    };

    // 4. Get drone image from the DOM element for FlyingDrone overlay
    const droneImg = droneEl.querySelector('img');
    const droneData = {
      image: droneImg?.src || '',
      name: droneId,
      owner: sourcePlayer
    };

    // 5. Hide original drone and push flying drone overlay
    droneEl.style.opacity = '0';
    const id = `movement-${droneId}-${Date.now()}`;

    setFlyingDrones(prev => [...prev, {
      id,
      droneData,
      startPos,
      endPos,
      config: { duration: 800, trail: false, isReturn: false },
      onComplete: () => {
        droneEl.style.opacity = '';
        setFlyingDrones(prev => prev.filter(fd => fd.id !== id));
        onComplete?.();
      }
    }]);
  });
}
