import { useEffect } from 'react';
import AnimationManager from '../state/AnimationManager.js';
import FlashEffect from '../components/animations/FlashEffect.jsx';
import CardVisualEffect from '../components/animations/CardVisualEffect.jsx';
import { debugLog } from '../utils/debugLogger.js';

export function useAnimationSetup(gameStateManager, droneRefs, sectionRefs, getLocalPlayerState, getOpponentPlayerState, triggerExplosion, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking, setFlashEffects, setHealEffects, setCardVisuals, setCardReveals, setShipAbilityReveals, setPhaseAnnouncements, setLaserEffects, setTeleportEffects, setPassNotifications, setOverflowProjectiles, setSplashEffects, setRailgunTurrets, setRailgunBeams) {
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
        console.warn('⚠️ [HEAL DEBUG] Target element not found:', {
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
      const healId = `heal-${targetId}-${Date.now()}`;

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

      // Use requestAnimationFrame to ensure React has finished rendering the drone element
      requestAnimationFrame(() => {
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
    });

    animationManager.registerVisualHandler('OVERFLOW_PROJECTILE', (payload) => {
      const { sourcePlayer, targetId, targetLane, targetPlayer, hasOverflow, isPiercing, onComplete } = payload;

      debugLog('ANIMATIONS', '⚡ [OVERFLOW] OVERFLOW_PROJECTILE handler called:', {
        sourcePlayer,
        targetId,
        targetLane,
        targetPlayer,
        hasOverflow,
        isPiercing
      });

      // Calculate source position based on attacker's perspective
      const gameAreaRect = gameAreaRef.current?.getBoundingClientRect();
      if (!gameAreaRect) {
        onComplete?.();
        return;
      }

      const localPlayerId = gameStateManager.getLocalPlayerId();
      const isAttackerLocal = sourcePlayer === localPlayerId;

      const sourcePos = {
        x: gameAreaRect.left + gameAreaRect.width / 2,
        y: isAttackerLocal
          ? gameAreaRect.bottom - 50  // Local player (attacker): bottom
          : gameAreaRect.top + 50      // Opponent (attacker): top
      };

      // Get drone position
      const droneEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, 'drone');
      if (!droneEl) {
        console.warn('⚠️ [OVERFLOW DEBUG] Drone element not found:', targetId);
        onComplete?.();
        return;
      }

      const dronePos = getElementCenter(droneEl, gameAreaRef.current);

      // Get ship section position (if overflow occurred)
      let shipPos = null;

      if (hasOverflow) {
        const gameState = gameStateManager.getState();
        const localPlayerId = gameStateManager.getLocalPlayerId();

        // Use perspective-relative lookup: local vs opponent
        const placedSections = targetPlayer === localPlayerId
          ? gameState.placedSections
          : gameState.opponentPlacedSections;

        // Convert lane name to array index (lane1 = 0, lane2 = 1, lane3 = 2)
        const laneIndex = parseInt(targetLane.replace('lane', '')) - 1;
        const sectionKey = placedSections?.[laneIndex];

        if (sectionKey) {
          const sectionEl = getElementFromLogicalPosition(targetPlayer, targetLane, sectionKey, 'section');
          if (sectionEl) {
            shipPos = getElementCenter(sectionEl, gameAreaRef.current);
            debugLog('ANIMATIONS', '✅ [OVERFLOW] Got ship position for overflow:', { sectionKey, shipPos });
          }
        }
      }

      const projectileId = `overflow-${targetId}-${Date.now()}`;

      // DEBUG: Log projectile timing calculation
      const calculatedPhaseDuration = hasOverflow ? 1200 / 3 : 1200 / 2;
      debugLog('ANIMATIONS', '⏱️ [OVERFLOW TIMING] Creating projectile with:', {
        hasOverflow,
        duration: 1200,
        calculatedPhaseDuration,
        expectedImpactTime: calculatedPhaseDuration
      });

      setOverflowProjectiles(prev => [...prev, {
        id: projectileId,
        startPos: sourcePos,
        dronePos: dronePos,
        shipPos: shipPos,
        hasOverflow: hasOverflow,
        isPiercing: isPiercing,
        duration: 1200,
        onComplete: () => {
          setOverflowProjectiles(prev => prev.filter(p => p.id !== projectileId));
          onComplete?.();
        }
      }]);
    });

    animationManager.registerVisualHandler('SPLASH_EFFECT', (payload) => {
      const { primaryTargetId, targetLane, targetPlayer, onComplete } = payload;

      debugLog('ANIMATIONS', '💥 [SPLASH DEBUG] SPLASH_EFFECT handler called:', {
        primaryTargetId,
        targetLane,
        targetPlayer
      });

      // Get primary target position
      const droneEl = getElementFromLogicalPosition(targetPlayer, targetLane, primaryTargetId, 'drone');
      if (!droneEl) {
        console.warn('⚠️ [SPLASH DEBUG] Primary target element not found:', primaryTargetId);
        onComplete?.();
        return;
      }

      const centerPos = getElementCenter(droneEl, gameAreaRef.current);
      const splashId = `splash-${primaryTargetId}-${Date.now()}`;

      setSplashEffects(prev => [...prev, {
        id: splashId,
        centerPos: centerPos,
        duration: 1000,
        onComplete: () => {
          setSplashEffects(prev => prev.filter(s => s.id !== splashId));
          onComplete?.();
        }
      }]);
    });

    animationManager.registerVisualHandler('RAILGUN_TURRET', (payload) => {
      const { sourcePlayer, sourceLane, targetId, targetPlayer, targetLane, onComplete } = payload;

      debugLog('ANIMATIONS', '🔫 [RAILGUN] RAILGUN_TURRET handler called:', {
        sourcePlayer,
        sourceLane,
        targetPlayer,
        targetLane
      });

      // Get ship section position in the source lane
      const gameState = gameStateManager.getState();
      const localPlayerId = gameStateManager.getLocalPlayerId();
      const placedSections = sourcePlayer === localPlayerId
        ? gameState.placedSections
        : gameState.opponentPlacedSections;

      const laneIndex = parseInt(sourceLane.replace('lane', '')) - 1;
      const sectionKey = placedSections?.[laneIndex];

      if (!sectionKey) {
        onComplete?.();
        return;
      }

      const sectionEl = getElementFromLogicalPosition(sourcePlayer, sourceLane, sectionKey, 'section');
      if (!sectionEl) {
        onComplete?.();
        return;
      }

      const sectionRect = sectionEl.getBoundingClientRect();
      const turretPos = {
        x: sectionRect.left + sectionRect.width / 2,
        y: sectionRect.top
      };

      // Calculate rotation angle towards target drone
      let rotation = -90; // Default: pointing up

      // Get target drone position to calculate angle
      const droneEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, 'drone');
      if (droneEl) {
        const droneCenter = getElementCenter(droneEl, gameAreaRef.current);
        const dx = droneCenter.x - turretPos.x;
        const dy = droneCenter.y - turretPos.y;
        // atan2 gives angle from east, subtract 90 to adjust for turret pointing up by default
        rotation = Math.atan2(dy, dx) * (180 / Math.PI) - 90;

        debugLog('ANIMATIONS', '🔫 [RAILGUN] Calculated turret rotation:', {
          turretPos,
          droneCenter,
          rotation
        });
      }

      const turretId = `railgun-turret-${Date.now()}`;

      setRailgunTurrets(prev => [...prev, {
        id: turretId,
        position: turretPos,
        rotation: rotation,
        onComplete: () => {
          setRailgunTurrets(prev => prev.filter(t => t.id !== turretId));
          onComplete?.();
        }
      }]);
    });

    animationManager.registerVisualHandler('RAILGUN_BEAM', (payload) => {
      const { sourcePlayer, sourceLane, targetId, targetPlayer, targetLane, hasOverflow, attackValue, onComplete } = payload;

      debugLog('ANIMATIONS', '⚡ [RAILGUN] RAILGUN_BEAM handler called:', {
        sourcePlayer,
        sourceLane,
        targetId,
        targetPlayer,
        hasOverflow,
        attackValue
      });

      // Get turret position (top-center of ship section)
      const gameState = gameStateManager.getState();
      const localPlayerId = gameStateManager.getLocalPlayerId();
      const sourcePlacedSections = sourcePlayer === localPlayerId
        ? gameState.placedSections
        : gameState.opponentPlacedSections;

      const sourceLaneIndex = parseInt(sourceLane.replace('lane', '')) - 1;
      const sourceSectionKey = sourcePlacedSections?.[sourceLaneIndex];

      let turretPos = null;
      if (sourceSectionKey) {
        const sourceSectionEl = getElementFromLogicalPosition(sourcePlayer, sourceLane, sourceSectionKey, 'section');
        if (sourceSectionEl) {
          turretPos = getElementCenter(sourceSectionEl, gameAreaRef.current);
        }
      }

      // Get drone center position
      const droneEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, 'drone');
      let droneCenter = null;
      if (droneEl) {
        droneCenter = getElementCenter(droneEl, gameAreaRef.current);
      }

      if (!turretPos || !droneCenter) {
        debugLog('ANIMATIONS', '❌ [RAILGUN] Missing turret or drone position, aborting beam');
        onComplete?.();
        return;
      }

      // Calculate gun tip position (gun extends ~25px from turret center towards target)
      const dx = droneCenter.x - turretPos.x;
      const dy = droneCenter.y - turretPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const gunLength = 25; // Approximate half of scaled gun height (50px / 2)

      // Offset turret position towards drone by gun length to get gun tip
      const gunTipPos = {
        x: turretPos.x + (dx / distance) * gunLength,
        y: turretPos.y + (dy / distance) * gunLength
      };

      debugLog('ANIMATIONS', '🔫 [RAILGUN] Gun tip offset calculated:', {
        turretCenter: turretPos,
        gunTip: gunTipPos,
        offset: gunLength
      });

      // Calculate end position
      let endPos = droneCenter;

      if (hasOverflow) {
        // Extend the beam further in the same direction (reuse dx, dy, distance from gun tip calculation)
        const extensionDistance = 200; // Extend by 200px beyond drone

        endPos = {
          x: gunTipPos.x + (dx / distance) * (distance + extensionDistance),
          y: gunTipPos.y + (dy / distance) * (distance + extensionDistance)
        };

        debugLog('ANIMATIONS', '⚡ [RAILGUN] Overflow detected, extending beam:', {
          droneCenter,
          endPos,
          extensionDistance
        });
      }

      const beamId = `railgun-beam-${Date.now()}`;

      setRailgunBeams(prev => [...prev, {
        id: beamId,
        startPos: gunTipPos,
        endPos: endPos,
        attackValue: attackValue || 8,
        duration: 1000,
        onComplete: () => {
          setRailgunBeams(prev => prev.filter(b => b.id !== beamId));
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
}, [getLocalPlayerState, getOpponentPlayerState, gameStateManager, triggerExplosion, droneRefs, sectionRefs, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking, setFlashEffects, setHealEffects, setCardVisuals, setCardReveals, setPhaseAnnouncements, setLaserEffects, setTeleportEffects, setPassNotifications, setOverflowProjectiles, setSplashEffects, setRailgunTurrets, setRailgunBeams]);
}