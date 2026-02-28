import { useEffect } from 'react';
import AnimationManager from '../managers/AnimationManager.js';
import { registerProjectileAnimations } from './animationSetup/useProjectileAnimations.js';
import { registerStatusAnimations } from './animationSetup/useStatusAnimations.js';
import { registerCardAnimations } from './animationSetup/useCardAnimations.js';
import { registerNotificationAnimations } from './animationSetup/useNotificationAnimations.js';

export function useAnimationSetup(gameStateManager, droneRefs, sectionRefs, getLocalPlayerState, getOpponentPlayerState, triggerExplosion, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking, setFlashEffects, setHealEffects, setCardVisuals, setCardReveals, setShipAbilityReveals, setPhaseAnnouncements, setLaserEffects, setTeleportEffects, setPassNotifications, setGoAgainNotifications, setTriggerFiredNotifications, setOverflowProjectiles, setSplashEffects, setBarrageImpacts, setRailgunTurrets, setRailgunBeams, setStatusConsumptions) {
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

    // Shared dependencies for all handler groups
    const sharedDeps = {
      gameStateManager,
      droneRefs,
      sectionRefs,
      getElementFromLogicalPosition,
      getElementCenter,
      gameAreaRef
    };

    // Register all animation handler groups
    registerProjectileAnimations(animationManager, {
      ...sharedDeps,
      setLaserEffects,
      setOverflowProjectiles,
      setSplashEffects,
      setBarrageImpacts,
      setRailgunTurrets,
      setRailgunBeams
    });

    registerStatusAnimations(animationManager, {
      ...sharedDeps,
      triggerExplosion,
      setFlashEffects,
      setHealEffects
    });

    registerCardAnimations(animationManager, {
      ...sharedDeps,
      setCardVisuals,
      setCardReveals,
      setStatusConsumptions
    });

    registerNotificationAnimations(animationManager, {
      ...sharedDeps,
      setShipAbilityReveals,
      setPhaseAnnouncements,
      setTeleportEffects,
      setPassNotifications,
      setGoAgainNotifications,
      setTriggerFiredNotifications
    });

    const unsubscribe = gameStateManager.subscribe((event) => {
      if (event.type === 'animationStateChange') {
        setAnimationBlocking(event.payload.blocking);
      }
    });

    gameStateManager.actionProcessor.setAnimationManager(animationManager);

    return unsubscribe;
}, [getLocalPlayerState, getOpponentPlayerState, gameStateManager, triggerExplosion, droneRefs, sectionRefs, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking, setFlashEffects, setHealEffects, setCardVisuals, setCardReveals, setPhaseAnnouncements, setLaserEffects, setTeleportEffects, setPassNotifications, setOverflowProjectiles, setSplashEffects, setBarrageImpacts, setRailgunTurrets, setRailgunBeams]);
}
