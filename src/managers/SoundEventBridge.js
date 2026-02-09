// ========================================
// SOUND EVENT BRIDGE
// ========================================
// Passive listener that maps existing game events to sound triggers
// Zero changes to game logic - subscribes to existing pub/sub events

import SoundManager from './SoundManager.js';
import MusicManager from './MusicManager.js';
import { getSoundForEvent } from '../config/soundConfig.js';
import { debugLog } from '../utils/debugLogger.js';

class SoundEventBridge {
  constructor() {
    this.unsubscribers = [];
    this.soundManager = SoundManager.getInstance();
  }

  /**
   * Connect to game managers and start listening for events
   * @param {Object} managers - Manager references
   * @param {Object} managers.phaseAnimationQueue - PhaseAnimationQueue instance
   * @param {Object} managers.actionProcessor - ActionProcessor instance
   * @param {Object} managers.combatStateManager - CombatStateManager instance (optional)
   */
  connect({ phaseAnimationQueue, actionProcessor, combatStateManager, gameStateManager }) {
    debugLog('SOUND', '🔌 SoundEventBridge connecting...');

    // PhaseAnimationQueue - phase announcements and pass notifications
    if (phaseAnimationQueue) {
      const unsub = phaseAnimationQueue.on('animationStarted', (animation) => {
        const soundId = getSoundForEvent('phaseAnimation', animation.phaseName);
        if (soundId) {
          this.soundManager.play(soundId);
        }
      });
      this.unsubscribers.push(unsub);
    }

    // ActionProcessor - card plays, deployments
    if (actionProcessor) {
      this.actionProcessor = actionProcessor;
      this.actionListener = (event) => {
        if (event.type === 'action_completed') {
          const soundId = getSoundForEvent('actionCompleted', event.actionType);
          if (soundId) {
            this.soundManager.play(soundId);
          }
        }
      };
      this.subscribeToActionProcessor();
    }

    // CombatStateManager - combat lifecycle
    if (combatStateManager) {
      const unsub = combatStateManager.subscribe((event) => {
        const soundId = getSoundForEvent('stateChange', event.type);
        if (soundId) {
          this.soundManager.play(soundId);
        }
      });
      this.unsubscribers.push(unsub);
    }

    // GameStateManager - detect resets and animation-start sound cues
    if (gameStateManager) {
      const unsub = gameStateManager.subscribe((event) => {
        if (event.type === 'GAME_STARTED') {
          this.subscribeToActionProcessor();
        }
        if (event.type === 'CURRENT_PLAYER_CHANGED' || event.type === 'TURN_SWITCH') {
          if (gameStateManager.isMyTurn()) {
            const soundId = getSoundForEvent('turnChange', 'myTurn');
            if (soundId) {
              this.soundManager.play(soundId);
            }
          }
        }
        if (event.type === 'ANIMATION_STARTED') {
          const soundId = getSoundForEvent('animationStarted', event.payload?.animationType);
          if (soundId) {
            this.soundManager.play(soundId);
          }
        }
        // Detect failed run screen for defeat music override
        if (event.payload?.updates?.showFailedRunScreen !== undefined) {
          const musicManager = MusicManager.getInstance();
          if (event.payload.updates.showFailedRunScreen) {
            musicManager.setOverride('defeat');
          } else {
            musicManager.clearOverride();
          }
        }
      });
      this.unsubscribers.push(unsub);
    }

    debugLog('SOUND', '✅ SoundEventBridge connected', {
      subscriptions: this.unsubscribers.length
    });
  }

  /**
   * Re-subscribe to ActionProcessor (called after clearQueue wipes listeners)
   */
  subscribeToActionProcessor() {
    if (!this.actionProcessor || !this.actionListener) return;
    // No need to track unsub — clearQueue() already wipes it
    this.actionProcessor.subscribe(this.actionListener);
    debugLog('SOUND', '🔄 Re-subscribed to ActionProcessor');
  }

  /**
   * Disconnect all event subscriptions
   */
  disconnect() {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) { /* already cleaned up */ }
    });
    this.unsubscribers = [];
    this.actionProcessor = null;
    this.actionListener = null;
    debugLog('SOUND', '🔌 SoundEventBridge disconnected');
  }
}

export default SoundEventBridge;
