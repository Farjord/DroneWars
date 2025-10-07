import { useEffect } from 'react';
import AnimationManager from '../state/AnimationManager.js';
import FlashEffect from '../components/animations/FlashEffect.jsx';
import CardVisualEffect from '../components/animations/CardVisualEffect.jsx';
import { debugLog } from '../utils/debugLogger.js';

export function useAnimationSetup(gameStateManager, droneRefs, sectionRefs, getLocalPlayerState, getOpponentPlayerState, triggerExplosion, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking, setFlashEffects, setCardVisuals, setCardReveals, setShipAbilityReveals, setPhaseAnnouncements, setLaserEffects, setTeleportEffects, setPassNotifications) {
  useEffect(() => {
    const localPlayerState = getLocalPlayerState();
    const opponentPlayerState = getOpponentPlayerState();
    const animationManager = new AnimationManager(gameStateManager);
    const droneOriginalPositions = new Map();

    /**
     * Maps logical game position (player, lane, entity) to DOM element
     * Handles perspective transformation: local player vs opponent player
     * @param {string} playerId - 'player1' or 'player2'
     * @param {string} laneOrSection - 'lane1', 'lane2', 'lane3', or section name
     * @param {string} entityId - Drone ID or section name
     * @param {string} entityType - 'drone' or 'section'
     * @returns {HTMLElement|null} - DOM element or null if not found
     */
    const getElementFromLogicalPosition = (playerId, laneOrSection, entityId, entityType) => {
      // For drones, always use droneRefs (they're keyed by ID, not perspective)
      if (entityType === 'drone') {
        return droneRefs.current[entityId] || null;
      }

      // For ship sections, determine prefix based on player perspective
      if (entityType === 'section') {
        const localPlayerId = gameStateManager.getLocalPlayerId();
        const prefix = playerId === localPlayerId ? 'local' : 'opponent';
        return sectionRefs.current[`${prefix}-${entityId}`] || null;
      }

      return null;
    };
    
    animationManager.registerVisualHandler('DRONE_FLY', (payload) => {
      const { droneId, sourcePlayer, sourceLane, targetId, targetPlayer, targetLane, targetType, config, attackValue, onComplete } = payload;

      // Skip return animations - no visual needed
      if (config.isReturn) {
        onComplete?.();
        return;
      }

      debugLog('ANIMATIONS', '🔫 [LASER DEBUG] DRONE_FLY handler called:', {
        droneId,
        sourcePlayer,
        sourceLane,
        targetId,
        targetPlayer,
        targetType,
        attackValue,
        config
      });

      // Use logical position mapper to get DOM elements
      const droneEl = getElementFromLogicalPosition(sourcePlayer, sourceLane, droneId, 'drone');
      const targetEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, targetType);

      if (!droneEl || !targetEl) {
        console.warn('⚠️ [LASER DEBUG] Missing DOM elements, skipping laser', {
          hasDrone: !!droneEl,
          hasTarget: !!targetEl,
          sourcePlayer,
          sourceLane,
          targetPlayer,
          targetType,
          targetId
        });
        onComplete?.();
        return;
      }

      debugLog('ANIMATIONS', '✅ [LASER DEBUG] Creating laser effect with attack:', attackValue);

      const startPos = getElementCenter(droneEl, gameAreaRef.current);
      const endPos = getElementCenter(targetEl, gameAreaRef.current);

      const laserId = `laser-${droneId}-${Date.now()}`;

      setLaserEffects(prev => [...prev, {
        id: laserId,
        startPos,
        endPos,
        attackValue: attackValue || 1,
        duration: 500,
        onComplete: () => {
          setLaserEffects(prev => prev.filter(l => l.id !== laserId));
          onComplete?.();
        }
      }]);
    });
    
    animationManager.registerVisualHandler('EXPLOSION_EFFECT', (payload) => {
      const { targetId, targetPlayer, targetLane, targetType, config, onComplete } = payload;

      // Use logical position mapper to get DOM element
      const targetEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, targetType);

      if (targetEl) {
        const pos = getElementCenter(targetEl, gameAreaRef.current);
        // Pass size from config
        triggerExplosion(targetId, pos, config?.size || 'large');
      } else {
        console.warn('⚠️ [EXPLOSION DEBUG] Target element not found:', {
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
        console.warn('⚠️ [FLASH DEBUG] Target element not found:', {
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
      const flashId = `flash-${targetId}-${Date.now()}`;

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

    animationManager.registerVisualHandler('CARD_VISUAL_EFFECT', (payload) => {
      const { visualType, sourcePlayer, targetId, targetPlayer, targetLane, targetType, duration, onComplete } = payload;

      // Calculate source position (player hand area)
      const gameAreaRect = gameAreaRef.current?.getBoundingClientRect();
      if (!gameAreaRect) {
        onComplete?.();
        return;
      }

      // Determine source Y based on local player perspective
      const localPlayerId = gameStateManager.getLocalPlayerId();
      const sourceY = sourcePlayer === localPlayerId
        ? gameAreaRect.bottom - 100  // Local player's hand at bottom
        : gameAreaRect.top + 100;     // Opponent's hand at top
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
              const droneRect = droneEl.getBoundingClientRect();
              targetCenter = {
                x: droneRect.left + droneRect.width / 2,
                y: droneRect.top + droneRect.height / 2
              };
            } else {
              // Fallback to game area center
              targetCenter = {
                x: gameAreaRect.left + (gameAreaRect.width / 2),
                y: gameAreaRect.top + (gameAreaRect.height / 2)
              };
            }
          } else {
            // Empty lane - use lane center position (approximate)
            const laneIndex = targetLane === 'lane1' ? 0 : targetLane === 'lane2' ? 1 : 2;
            const laneY = perspectivePlayer === localPlayerId
              ? gameAreaRect.bottom - 200  // Local player's lanes at bottom
              : gameAreaRect.top + 200;     // Opponent's lanes at top
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
          console.warn('⚠️ [CARD VISUAL DEBUG] Target element not found:', {
            targetId,
            targetPlayer,
            targetLane,
            targetType
          });
          onComplete?.();
          return;
        }

        const targetRect = targetEl.getBoundingClientRect();
        targetCenter = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2
        };
      }

      const visualId = `cardvisual-${Date.now()}`;

      setCardVisuals(prev => [...prev, {
        id: visualId,
        visualType: visualType || 'LASER_BLAST',
        startPos: { x: sourceX, y: sourceY },
        endPos: targetCenter,
        duration: duration || 800,
        onComplete: () => {
          setCardVisuals(prev => prev.filter(v => v.id !== visualId));
          onComplete?.();
        }
      }]);
    });

    animationManager.registerVisualHandler('CARD_REVEAL_EFFECT', (payload) => {
      const { cardData, actingPlayerId, onComplete } = payload;

      debugLog('ANIMATIONS', '🃏 [CARD REVEAL DEBUG] CARD_REVEAL_EFFECT handler called:', {
        cardName: cardData?.name,
        actingPlayerId
      });

      // Determine if this is the local player or opponent
      const localPlayerId = gameStateManager.getLocalPlayerId();
      const isLocalPlayer = actingPlayerId === localPlayerId;

      const revealId = `cardreveal-${Date.now()}`;

      setCardReveals(prev => [...prev, {
        id: revealId,
        card: cardData,
        label: isLocalPlayer ? 'You Played' : 'Opponent Played',
        onComplete: () => {
          setCardReveals(prev => prev.filter(r => r.id !== revealId));
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
        const revealId = `shipability-${Date.now()}`;

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

    animationManager.registerVisualHandler('PHASE_ANNOUNCEMENT_EFFECT', async (payload) => {
      const { phaseText, phaseName, firstPlayerId, onComplete } = payload;

      // Add brief delay to provide visual breathing room between overlay clearing and announcement
      // Waiting overlays now clear immediately via 'bothPlayersComplete' event
      await new Promise(resolve => setTimeout(resolve, 300));

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

      const announcementId = `phaseannouncement-${Date.now()}`;

      setPhaseAnnouncements(prev => [...prev, {
        id: announcementId,
        phaseText: phaseText,
        subtitle: subtitle,
        onComplete: () => {
          setPhaseAnnouncements(prev => prev.filter(a => a.id !== announcementId));
          onComplete?.();
        }
      }]);
    });

    animationManager.registerVisualHandler('PASS_NOTIFICATION_EFFECT', (payload) => {
      const { passingPlayerId, onComplete } = payload;

      debugLog('ANIMATIONS', '⏸️ [PASS NOTIFICATION DEBUG] PASS_NOTIFICATION_EFFECT handler called:', {
        passingPlayerId
      });

      // Determine if this is the local player or opponent
      const localPlayerId = gameStateManager.getLocalPlayerId();
      const isLocalPlayer = passingPlayerId === localPlayerId;

      const notificationId = `passnotif-${Date.now()}`;

      setPassNotifications(prev => [...prev, {
        id: notificationId,
        label: isLocalPlayer ? 'You Passed' : 'Opponent Passed',
        onComplete: () => {
          setPassNotifications(prev => prev.filter(n => n.id !== notificationId));
          onComplete?.();
        }
      }]);
    });

    animationManager.registerVisualHandler('SHAKE_EFFECT', (payload) => {
      const { targetId, config, onComplete } = payload;
      const targetEl = droneRefs.current[targetId];

      if (targetEl) {
        targetEl.classList.add('animate-shake-damage');
        setTimeout(() => {
          targetEl.classList.remove('animate-shake-damage');
          onComplete?.();
        }, config?.duration || 500);
      } else {
        onComplete?.();
      }
    });

    animationManager.registerVisualHandler('TELEPORT_EFFECT', (payload) => {
      const { targetId, laneId, playerId, onComplete } = payload;

      debugLog('ANIMATIONS', '✨ [TELEPORT DEBUG] TELEPORT_EFFECT handler called:', { targetId, laneId, playerId });

      // The drone should now exist as an invisible placeholder - get its exact position
      const droneEl = droneRefs.current[targetId];

      if (!droneEl) {
        console.warn('⚠️ [TELEPORT DEBUG] Drone element not found - placeholder may not have rendered yet:', targetId);
        onComplete?.();
        return;
      }

      // Get the exact center position of the invisible placeholder drone
      const referencePos = getElementCenter(droneEl, gameAreaRef.current);
      debugLog('ANIMATIONS', '✨ [TELEPORT DEBUG] Using exact drone placeholder position:', referencePos);

      // Determine color based on local player perspective
      const localPlayerId = gameStateManager.getLocalPlayerId();
      const isLocalPlayer = playerId === localPlayerId;
      const teleportColor = isLocalPlayer ? '#00ffff' : '#ec4899'; // Cyan for player, pink for opponent

      const teleportId = `teleport-${targetId}-${Date.now()}`;

      setTeleportEffects(prev => [...prev, {
        id: teleportId,
        top: referencePos.y,
        left: referencePos.x,
        color: teleportColor,
        duration: 600,
        onComplete: () => {
          setTeleportEffects(prev => prev.filter(t => t.id !== teleportId));
          onComplete?.();
        }
      }]);
    });

    const unsubscribe = gameStateManager.subscribe((event) => {
      if (event.type === 'animationStateChange') {
        setAnimationBlocking(event.payload.blocking);
      }
    });
    
    gameStateManager.actionProcessor.setAnimationManager(animationManager);
    
    return unsubscribe;
}, [getLocalPlayerState, getOpponentPlayerState, gameStateManager, triggerExplosion, droneRefs, sectionRefs, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking, setFlashEffects, setCardVisuals, setCardReveals, setPhaseAnnouncements, setLaserEffects, setTeleportEffects, setPassNotifications]);
}