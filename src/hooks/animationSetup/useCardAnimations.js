import { debugLog } from '../../utils/debugLogger.js';
import { getViewportCenter } from '../../utils/gameUtils.js';
import { isLocalPlayer, parseLaneIndex } from '../../utils/animationPositioning.js';

// Animation sizes and offsets (px)
const HAND_AREA_OFFSET = 100;
const LANE_AREA_OFFSET = 200;

/**
 * Registers card-related animation handlers on the AnimationManager.
 * Handlers: CARD_VISUAL_EFFECT, CARD_REVEAL_EFFECT, STATUS_CONSUMPTION_EFFECT
 */
export function registerCardAnimations(animationManager, {
  gameStateManager,
  droneRefs,
  getElementFromLogicalPosition,
  gameAreaRef,
  animationDispatch
}) {
  animationManager.registerVisualHandler('CARD_VISUAL_EFFECT', (payload) => {
    const { visualType, sourcePlayer, targetId, targetPlayer, targetLane, targetType, onComplete } = payload;

    // Calculate source position (player hand area)
    const gameAreaRect = gameAreaRef.current?.getBoundingClientRect();
    if (!gameAreaRect) {
      onComplete?.();
      return;
    }

    // Determine source Y based on local player perspective
    const localPlayerId = gameStateManager.getLocalPlayerId();
    const sourceY = sourcePlayer === localPlayerId
      ? gameAreaRect.bottom - HAND_AREA_OFFSET  // Local player's hand at bottom
      : gameAreaRect.top + HAND_AREA_OFFSET;     // Opponent's hand at top
    const sourceX = gameAreaRect.left + (gameAreaRect.width / 2);

    let targetCenter;

    // Handle lane-targeted effects
    if (targetType === 'lane') {
      // For 'center' target (multi-player effects like Nuke), use game area center
      if (targetPlayer === 'center') {
        targetCenter = {
          x: gameAreaRect.left + (gameAreaRect.width / 2),
          y: gameAreaRect.top + (gameAreaRect.height / 2)
        };
      } else {
        // For single-player lane targets (like Sidewinder Missiles)
        // Apply perspective: show as opponent's lane for caster, own lane for receiver
        const perspectivePlayer = sourcePlayer === localPlayerId ? targetPlayer : (targetPlayer === localPlayerId ? localPlayerId : targetPlayer);

        // Get first drone in lane or use lane center if empty
        const gameState = gameStateManager.getState();
        const playerState = gameState[perspectivePlayer];
        const lanesOnBoard = playerState?.dronesOnBoard || {};
        const dronesInLane = lanesOnBoard[targetLane] || [];

        if (dronesInLane.length > 0) {
          // Use first drone as reference point
          const firstDrone = dronesInLane[0];
          const droneEl = droneRefs.current[firstDrone.id];
          if (droneEl) {
            targetCenter = getViewportCenter(droneEl);
          } else {
            // Fallback to game area center
            targetCenter = {
              x: gameAreaRect.left + (gameAreaRect.width / 2),
              y: gameAreaRect.top + (gameAreaRect.height / 2)
            };
          }
        } else {
          // Empty lane - use lane center position (approximate)
          const laneIndex = parseLaneIndex(targetLane);
          const laneY = perspectivePlayer === localPlayerId
            ? gameAreaRect.bottom - LANE_AREA_OFFSET  // Local player's lanes at bottom
            : gameAreaRect.top + LANE_AREA_OFFSET;     // Opponent's lanes at top
          targetCenter = {
            x: gameAreaRect.left + (gameAreaRect.width / 4) * (laneIndex + 1),
            y: laneY
          };
        }
      }
    } else {
      // Use logical position mapper to get target element (drone or section)
      const targetEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, targetType);

      if (!targetEl) {
        debugLog('ANIMATIONS', '⚠️ [CARD VISUAL DEBUG] Target element not found:', {
          targetId,
          targetPlayer,
          targetLane,
          targetType
        });
        onComplete?.();
        return;
      }

      targetCenter = getViewportCenter(targetEl);
    }

    const visualId = `cardvisual-${crypto.randomUUID()}`;

    animationDispatch.add('cardVisuals', {
      id: visualId,
      visualType: visualType || 'LASER_BLAST',
      startPos: { x: sourceX, y: sourceY },
      endPos: targetCenter,
      onComplete: () => {
        animationDispatch.remove('cardVisuals', visualId);
        onComplete?.();
      }
    });
  });

  animationManager.registerVisualHandler('CARD_REVEAL_EFFECT', (payload) => {
    const { cardData, targetPlayer, onComplete } = payload;

    debugLog('ANIMATIONS', '🃏 [CARD REVEAL DEBUG] CARD_REVEAL_EFFECT handler called:', {
      cardName: cardData?.name,
      targetPlayer
    });

    const isLocal = isLocalPlayer(gameStateManager, targetPlayer);

    const revealId = `cardreveal-${crypto.randomUUID()}`;

    animationDispatch.add('cardReveals', {
      id: revealId,
      card: cardData,
      label: isLocal ? 'You Played' : 'Opponent Played',
      onComplete: () => {
        animationDispatch.remove('cardReveals', revealId);
        onComplete?.();
      }
    });
  });

  animationManager.registerVisualHandler('STATUS_CONSUMPTION_EFFECT', (payload) => {
    const { droneName, laneNumber, statusType, targetPlayer, onComplete } = payload;

    const isLocal = isLocalPlayer(gameStateManager, targetPlayer);

    const statusLabel = statusType === 'snared' ? 'Snare' : 'Suppressed';
    const label = isLocal
      ? `You Removed ${statusLabel} Effect From ${droneName} in Lane ${laneNumber}`
      : `Opponent Removed ${statusLabel} Effect From ${droneName} in Lane ${laneNumber}`;

    const consumptionId = `statusconsumption-${crypto.randomUUID()}`;

    animationDispatch.add('statusConsumptions', {
      id: consumptionId,
      label,
      droneName,
      statusType,
      onComplete: () => {
        animationDispatch.remove('statusConsumptions', consumptionId);
        onComplete?.();
      }
    });
  });
}
