import { debugLog } from '../../utils/debugLogger.js';

// Animation durations (ms)
const LASER_DURATION = 500;
const OVERFLOW_PROJECTILE_DURATION = 1200;
const SPLASH_DURATION = 1000;
const RAILGUN_BEAM_DURATION = 1000;

// Animation sizes and offsets (px)
const OVERFLOW_SOURCE_OFFSET = 50;
const RAILGUN_GUN_LENGTH = 25;
const RAILGUN_OVERFLOW_EXTENSION = 200;

// Barrage impact settings
const BARRAGE_IMPACT_SIZE = 10;
const BARRAGE_IMPACT_DELAY = 50;
const BARRAGE_FLASH_DURATION = 250;

// Default fallback values
const DEFAULT_RAILGUN_ATTACK = 8;

/**
 * Registers projectile-related animation handlers on the AnimationManager.
 * Handlers: DRONE_FLY, OVERFLOW_PROJECTILE, SPLASH_EFFECT, BARRAGE_IMPACT, RAILGUN_TURRET, RAILGUN_BEAM
 */
export function registerProjectileAnimations(animationManager, {
  gameStateManager,
  droneRefs,
  getElementFromLogicalPosition,
  getElementCenter,
  gameAreaRef,
  setLaserEffects,
  setOverflowProjectiles,
  setSplashEffects,
  setBarrageImpacts,
  setRailgunTurrets,
  setRailgunBeams
}) {
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
      debugLog('ANIMATIONS', '⚠️ [LASER DEBUG] Missing DOM elements, skipping laser', {
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

    const laserId = `laser-${droneId}-${crypto.randomUUID()}`;

    setLaserEffects(prev => [...prev, {
      id: laserId,
      startPos,
      endPos,
      attackValue: attackValue || 1,
      duration: LASER_DURATION,
      onComplete: () => {
        setLaserEffects(prev => prev.filter(l => l.id !== laserId));
        onComplete?.();
      }
    }]);
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
        ? gameAreaRect.bottom - OVERFLOW_SOURCE_OFFSET  // Local player (attacker): bottom
        : gameAreaRect.top + OVERFLOW_SOURCE_OFFSET      // Opponent (attacker): top
    };

    // Get drone position
    const droneEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, 'drone');
    if (!droneEl) {
      debugLog('ANIMATIONS', '⚠️ [OVERFLOW DEBUG] Drone element not found:', targetId);
      onComplete?.();
      return;
    }

    const dronePos = getElementCenter(droneEl, gameAreaRef.current);

    // Get ship section position (if overflow occurred)
    let shipPos = null;

    if (hasOverflow) {
      const gameState = gameStateManager.getState();

      // Use perspective-relative lookup: local vs opponent (localPlayerId already in scope above)
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

    const projectileId = `overflow-${targetId}-${crypto.randomUUID()}`;

    // DEBUG: Log projectile timing calculation
    const calculatedPhaseDuration = hasOverflow ? OVERFLOW_PROJECTILE_DURATION / 3 : OVERFLOW_PROJECTILE_DURATION / 2;
    debugLog('ANIMATIONS', '⏱️ [OVERFLOW TIMING] Creating projectile with:', {
      hasOverflow,
      duration: OVERFLOW_PROJECTILE_DURATION,
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
      duration: OVERFLOW_PROJECTILE_DURATION,
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
      debugLog('ANIMATIONS', '⚠️ [SPLASH DEBUG] Primary target element not found:', primaryTargetId);
      onComplete?.();
      return;
    }

    const centerPos = getElementCenter(droneEl, gameAreaRef.current);
    const splashId = `splash-${primaryTargetId}-${crypto.randomUUID()}`;

    setSplashEffects(prev => [...prev, {
      id: splashId,
      centerPos: centerPos,
      duration: SPLASH_DURATION,
      onComplete: () => {
        setSplashEffects(prev => prev.filter(s => s.id !== splashId));
        onComplete?.();
      }
    }]);
  });

  animationManager.registerVisualHandler('BARRAGE_IMPACT', (payload) => {
    const { targetId, targetPlayer, targetLane, impactCount, onComplete } = payload;

    debugLog('ANIMATIONS', '🔫 [BARRAGE DEBUG] BARRAGE_IMPACT handler called:', {
      targetId,
      targetPlayer,
      targetLane,
      impactCount
    });

    // Get target drone position
    const droneEl = getElementFromLogicalPosition(targetPlayer, targetLane, targetId, 'drone');
    if (!droneEl) {
      debugLog('ANIMATIONS', '⚠️ [BARRAGE DEBUG] Target drone element not found:', targetId);
      onComplete?.();
      return;
    }

    const droneRect = droneEl.getBoundingClientRect();
    const gameAreaRect = gameAreaRef.current?.getBoundingClientRect();

    if (!gameAreaRect) {
      onComplete?.();
      return;
    }

    // Generate random impact positions over the drone
    const impacts = [];
    const impactSize = BARRAGE_IMPACT_SIZE;
    const impactDelay = BARRAGE_IMPACT_DELAY;

    for (let i = 0; i < impactCount; i++) {
      // Random position within drone bounds
      const randomX = Math.random() * (droneRect.width - impactSize);
      const randomY = Math.random() * (droneRect.height - impactSize);

      impacts.push({
        id: `barrage-${targetId}-${crypto.randomUUID()}`,
        position: {
          left: droneRect.left - gameAreaRect.left + randomX,
          top: droneRect.top - gameAreaRect.top + randomY
        },
        size: impactSize,
        delay: i * impactDelay
      });
    }

    // Add impacts to state
    setBarrageImpacts(prev => [...prev, ...impacts]);

    // Complete after all impacts finish
    const totalDuration = impactCount * impactDelay + BARRAGE_FLASH_DURATION;
    setTimeout(() => {
      setBarrageImpacts(prev => prev.filter(impact =>
        !impacts.find(i => i.id === impact.id)
      ));
      onComplete?.();
    }, totalDuration);
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

    const turretId = `railgun-turret-${crypto.randomUUID()}`;

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
    const gunLength = RAILGUN_GUN_LENGTH;

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
      const extensionDistance = RAILGUN_OVERFLOW_EXTENSION;

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

    const beamId = `railgun-beam-${crypto.randomUUID()}`;

    setRailgunBeams(prev => [...prev, {
      id: beamId,
      startPos: gunTipPos,
      endPos: endPos,
      attackValue: attackValue || DEFAULT_RAILGUN_ATTACK,
      duration: RAILGUN_BEAM_DURATION,
      onComplete: () => {
        setRailgunBeams(prev => prev.filter(b => b.id !== beamId));
        onComplete?.();
      }
    }]);
  });
}
