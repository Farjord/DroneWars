import { useEffect } from 'react';
import AnimationManager from '../state/AnimationManager.js';

export function useAnimationSetup(gameStateManager, droneRefs, getLocalPlayerState, getOpponentPlayerState, triggerExplosion, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking) {
  useEffect(() => {
    const localPlayerState = getLocalPlayerState();
    const opponentPlayerState = getOpponentPlayerState();
    const animationManager = new AnimationManager(gameStateManager);
    const droneOriginalPositions = new Map();
    
    animationManager.registerVisualHandler('DRONE_FLY', (payload) => {
      const { droneId, targetId, config, onComplete } = payload;

      console.log('🎬 [AI ANIMATION DEBUG] DRONE_FLY handler called:', {
        droneId,
        targetId,
        config,
        hasDroneRefs: !!droneRefs.current,
        droneRefsKeys: Object.keys(droneRefs.current || {}).length
      });

      const droneEl = droneRefs.current[droneId];
      const targetEl = droneRefs.current[targetId];

      console.log('🎬 [AI ANIMATION DEBUG] DOM element lookup:', {
        droneId,
        hasDroneEl: !!droneEl,
        targetId,
        hasTargetEl: !!targetEl,
        availableRefs: Object.keys(droneRefs.current || {})
      });

      if (!droneEl || !targetEl) {
        console.warn('⚠️ [AI ANIMATION DEBUG] Missing DOM elements, skipping animation');
        onComplete?.();
        return;
      }

      console.log('✅ [AI ANIMATION DEBUG] DOM elements found, creating flying drone animation');
      
      const droneRect = droneEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      
      if (!config.isReturn) {
        droneOriginalPositions.set(droneId, { x: droneRect.left, y: droneRect.top });
      }
      
      let droneData = null;
      let owner = null;
      
      [localPlayerState, opponentPlayerState].forEach((state, idx) => {
        if (state?.dronesOnBoard) {
          Object.values(state.dronesOnBoard).forEach(lane => {
            const found = lane.find(d => d.id === droneId);
            if (found) {
              droneData = found;
              owner = idx === 0 ? 'player1' : 'player2';
            }
          });
        }
      });
      
      if (!droneData) {
        onComplete?.();
        return;
      }
      
      droneData.owner = owner;
      
      const startPos = config.isReturn 
        ? { x: targetRect.left, y: targetRect.top }
        : { x: droneRect.left, y: droneRect.top };
        
      const endPos = config.isReturn
        ? droneOriginalPositions.get(droneId) || { x: droneRect.left, y: droneRect.top }
        : { x: targetRect.left, y: targetRect.top };
      
      const flyingId = `${droneId}-${Date.now()}`;
      
      setFlyingDrones(prev => [...prev, {
        id: flyingId,
        droneData,
        startPos,
        endPos,
        config: { ...config, duration: config.isReturn ? 400 : 800 },
        onComplete: () => {
          setFlyingDrones(prev => prev.filter(fd => fd.id !== flyingId));
          if (config.isReturn) {
            droneOriginalPositions.delete(droneId);
          }
          onComplete?.();
        }
      }]);
    });
    
    animationManager.registerVisualHandler('EXPLOSION_EFFECT', (payload) => {
      const targetEl = droneRefs.current[payload.targetId];
      if (targetEl) {
        const pos = getElementCenter(targetEl, gameAreaRef.current);
        triggerExplosion(payload.targetId, pos);
      }
      payload.onComplete?.();
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
    
    const unsubscribe = gameStateManager.subscribe((event) => {
      if (event.type === 'animationStateChange') {
        setAnimationBlocking(event.blocking);
      }
    });
    
    gameStateManager.actionProcessor.setAnimationManager(animationManager);
    
    return unsubscribe;
}, [getLocalPlayerState, getOpponentPlayerState, gameStateManager, triggerExplosion, droneRefs, getElementCenter, gameAreaRef, setFlyingDrones, setAnimationBlocking]);
}