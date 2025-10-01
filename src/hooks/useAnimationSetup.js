import { useEffect } from 'react';
import AnimationManager from '../state/AnimationManager.js';
import FlashEffect from '../components/animations/FlashEffect.jsx';
import CardVisualEffect from '../components/animations/CardVisualEffect.jsx';

export function useAnimationSetup(gameStateManager, droneRefs, sectionRefs, getLocalPlayerState, getOpponentPlayerState, triggerExplosion, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking, setFlashEffects, setCardVisuals, setLaserEffects, setTeleportEffects) {
  useEffect(() => {
    const localPlayerState = getLocalPlayerState();
    const opponentPlayerState = getOpponentPlayerState();
    const animationManager = new AnimationManager(gameStateManager);
    const droneOriginalPositions = new Map();
    
    animationManager.registerVisualHandler('DRONE_FLY', (payload) => {
      const { droneId, targetId, config, attackValue, onComplete } = payload;

      // Skip return animations - no visual needed
      if (config.isReturn) {
        onComplete?.();
        return;
      }

      console.log('🔫 [LASER DEBUG] DRONE_FLY handler called:', {
        droneId,
        targetId,
        attackValue,
        config
      });

      const droneEl = droneRefs.current[droneId];

      // Check if target is a drone first, then try sections with player prefixes
      let targetEl = droneRefs.current[targetId];
      if (!targetEl) {
        // Determine if attacking drone is local or opponent to figure out target section prefix
        const localPlayerId = gameStateManager.getLocalPlayerId();
        const localState = gameStateManager.getState()[localPlayerId];
        const opponentId = localPlayerId === 'player1' ? 'player2' : 'player1';

        // Check if drone belongs to local player
        const isLocalDrone = Object.values(localState.dronesOnBoard).flat().some(d => d.id === droneId);

        // If local drone attacking, target is opponent section; if opponent drone, target is local section
        const targetPrefix = isLocalDrone ? 'opponent' : 'local';
        targetEl = sectionRefs.current[`${targetPrefix}-${targetId}`];
      }

      if (!droneEl || !targetEl) {
        console.warn('⚠️ [LASER DEBUG] Missing DOM elements, skipping laser', {
          hasDrone: !!droneEl,
          hasTarget: !!targetEl,
          targetId,
          availableSections: Object.keys(sectionRefs.current || {})
        });
        onComplete?.();
        return;
      }

      console.log('✅ [LASER DEBUG] Creating laser effect with attack:', attackValue);

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
      // Check if target is a drone first
      let targetEl = droneRefs.current[payload.targetId];

      if (!targetEl && payload.targetPlayerId) {
        // For ship sections, use targetPlayerId to determine correct prefix
        const localPlayerId = gameStateManager.getLocalPlayerId();
        const prefix = payload.targetPlayerId === localPlayerId ? 'local' : 'opponent';
        targetEl = sectionRefs.current[`${prefix}-${payload.targetId}`];
      }

      if (targetEl) {
        const pos = getElementCenter(targetEl, gameAreaRef.current);
        // Pass size from config
        triggerExplosion(payload.targetId, pos, payload.config?.size || 'large');
      } else {
        console.warn('⚠️ [EXPLOSION DEBUG] Target element not found:', payload.targetId);
      }
      payload.onComplete?.();
    });

    animationManager.registerVisualHandler('FLASH_EFFECT', (payload) => {
      const { targetId, config, onComplete, targetPlayerId } = payload;

      // Check if target is a drone first
      let targetEl = droneRefs.current[targetId];

      if (!targetEl && targetPlayerId) {
        // For ship sections, use targetPlayerId to determine correct prefix
        const localPlayerId = gameStateManager.getLocalPlayerId();
        const prefix = targetPlayerId === localPlayerId ? 'local' : 'opponent';
        targetEl = sectionRefs.current[`${prefix}-${targetId}`];
      }

      if (!targetEl) {
        console.warn('⚠️ [FLASH DEBUG] Target element not found:', targetId);
        onComplete?.();
        return;
      }

      const flashId = `flash-${targetId}-${Date.now()}`;

      setFlashEffects(prev => [...prev, {
        id: flashId,
        targetId: targetId,
        color: config.color,
        intensity: config.intensity,
        onComplete: () => {
          setFlashEffects(prev => prev.filter(f => f.id !== flashId));
          onComplete?.();
        }
      }]);
    });

    animationManager.registerVisualHandler('CARD_VISUAL_EFFECT', (payload) => {
      const { visualType, sourceId, targetId, duration, onComplete } = payload;

      const visualId = `cardvisual-${Date.now()}`;

      setCardVisuals(prev => [...prev, {
        id: visualId,
        visualType: visualType || 'LASER_BLAST',
        sourceId: sourceId,
        targetId: targetId,
        duration: duration || 800,
        onComplete: () => {
          setCardVisuals(prev => prev.filter(v => v.id !== visualId));
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

      console.log('✨ [TELEPORT DEBUG] TELEPORT_EFFECT handler called:', { targetId, laneId, playerId });

      // The drone should now exist as an invisible placeholder - get its exact position
      const droneEl = droneRefs.current[targetId];

      if (!droneEl) {
        console.warn('⚠️ [TELEPORT DEBUG] Drone element not found - placeholder may not have rendered yet:', targetId);
        onComplete?.();
        return;
      }

      // Get the exact center position of the invisible placeholder drone
      const referencePos = getElementCenter(droneEl, gameAreaRef.current);
      console.log('✨ [TELEPORT DEBUG] Using exact drone placeholder position:', referencePos);

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
        setAnimationBlocking(event.blocking);
      }
    });
    
    gameStateManager.actionProcessor.setAnimationManager(animationManager);
    
    return unsubscribe;
}, [getLocalPlayerState, getOpponentPlayerState, gameStateManager, triggerExplosion, droneRefs, sectionRefs, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking, setFlashEffects, setCardVisuals, setLaserEffects, setTeleportEffects]);
}