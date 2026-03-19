import { useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import AnimationManager from '../managers/AnimationManager.js';
import { registerProjectileAnimations } from './animationSetup/useProjectileAnimations.js';
import { registerStatusAnimations } from './animationSetup/useStatusAnimations.js';
import { registerCardAnimations } from './animationSetup/useCardAnimations.js';
import { registerNotificationAnimations } from './animationSetup/useNotificationAnimations.js';
import { registerMovementAnimations } from './animationSetup/useMovementAnimations.js';

export function useAnimationSetup(gameStateManager, droneRefs, sectionRefs, getLocalPlayerState, getOpponentPlayerState, triggerExplosion, getElementCenter, gameAreaRef, animationDispatch, setAnimationBlocking, gameServerRef) {
  useEffect(() => {
    const localPlayerState = getLocalPlayerState();
    const opponentPlayerState = getOpponentPlayerState();
    const animationManager = new AnimationManager(gameStateManager);

    /**
     * Maps logical game position (player, lane, entity) to DOM element
     * Handles perspective transformation: local player vs opponent player
     * @param {string} playerId - 'player1' or 'player2'
     * @param {string} laneOrSection - 'lane1', 'lane2', 'lane3', or section name
     * @param {string} entityId - Drone ID or section name
     * @param {string} entityType - 'drone', 'section', 'tech', or 'entity'
     *   Use 'entity' when the caller has an ID but doesn't know whether it's a drone or tech slot.
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

      // For tech slots, use data-drone-id attribute (not in droneRefs)
      if (entityType === 'tech') {
        return document.querySelector(`[data-drone-id="${entityId}"]`) || null;
      }

      // Generic entity lookup: try droneRefs first, then data-drone-id for tech slots
      if (entityType === 'entity') {
        return droneRefs.current[entityId]
          || document.querySelector(`[data-drone-id="${entityId}"]`)
          || null;
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
      animationDispatch
    });

    registerStatusAnimations(animationManager, {
      ...sharedDeps,
      triggerExplosion,
      animationDispatch
    });

    registerCardAnimations(animationManager, {
      ...sharedDeps,
      animationDispatch
    });

    registerNotificationAnimations(animationManager, {
      ...sharedDeps,
      animationDispatch
    });

    registerMovementAnimations(animationManager, {
      ...sharedDeps,
      animationDispatch
    });

    const unsubscribe = gameStateManager.subscribe((event) => {
      if (event.type === 'animationStateChange') {
        setAnimationBlocking(event.payload.blocking);
      }
    });

    if (gameServerRef?.current) {
      gameServerRef.current.animationManager = animationManager;
    }
    // ActionProcessor needs AnimationManager for AI/system actions (bypasses GameClient)
    gameStateManager.actionProcessor.setAnimationManager(animationManager);

    debugLog('INIT_TRACE', '[8/8] AnimationManager created + wired to GameClient + ActionProcessor', {
      handlerGroupsRegistered: 5,
      wiredToGameServer: !!gameServerRef?.current,
      wiredToActionProcessor: !!gameStateManager.actionProcessor,
    });

    return () => {
      unsubscribe();
      if (gameServerRef?.current) {
        gameServerRef.current.animationManager = null;
      }
      gameStateManager.actionProcessor.setAnimationManager(null);
    };
  }, [gameStateManager, triggerExplosion, droneRefs, sectionRefs, getElementCenter, gameAreaRef, animationDispatch, setAnimationBlocking, gameServerRef]);
}
