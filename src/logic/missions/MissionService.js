/**
 * MissionService.js
 * Centralized mission management service (singleton pattern)
 *
 * Manages mission state, progress tracking, reward claiming,
 * and tutorial dismissals. Uses GameStateManager for persistence.
 */

import gameStateManager from '../../managers/GameStateManager.js';
import { MISSIONS, getMissionById, getIntroMissions } from '../../data/missionData.js';
import MissionConditionEvaluator from './MissionConditionEvaluator.js';

class MissionService {
  constructor() {
    this.conditionEvaluator = new MissionConditionEvaluator();
  }

  // ========================================
  // STATE ACCESS
  // ========================================

  /**
   * Get current mission state from profile
   * @returns {Object} Mission state object
   */
  getMissionState() {
    const state = gameStateManager.getState();
    const profile = state?.singlePlayerProfile;

    if (!profile || !profile.missions) {
      return {
        completed: [],
        claimable: [],
        hidden: [],
        progress: {},
      };
    }

    return profile.missions;
  }

  /**
   * Get all available missions (not completed, not hidden, prerequisites met)
   * @returns {Array} Array of available mission objects
   */
  getAvailableMissions() {
    const missionState = this.getMissionState();

    return MISSIONS.filter(mission => {
      // Not already completed
      if (missionState.completed.includes(mission.id)) return false;

      // Not hidden (e.g., skipped intro missions)
      if (missionState.hidden.includes(mission.id)) return false;

      // Prerequisites must be met
      const prereqsMet = mission.prerequisites.every(
        prereqId => missionState.completed.includes(prereqId)
      );

      return prereqsMet;
    });
  }

  /**
   * Get active missions with progress information
   * @returns {Array} Array of mission objects with progress
   */
  getActiveMissions() {
    const available = this.getAvailableMissions();
    const missionState = this.getMissionState();

    return available.map(mission => ({
      ...mission,
      progress: missionState.progress[mission.id] || {
        current: 0,
        target: this.getTargetForMission(mission),
      },
      isClaimable: missionState.claimable.includes(mission.id),
    }));
  }

  /**
   * Get count of missions with claimable rewards
   * @returns {number} Count of claimable missions
   */
  getClaimableCount() {
    return this.getMissionState().claimable.length;
  }

  /**
   * Get count of active (available, non-claimable) missions
   * @returns {number} Count of active missions
   */
  getActiveCount() {
    const missionState = this.getMissionState();
    return this.getAvailableMissions().filter(
      m => !missionState.claimable.includes(m.id)
    ).length;
  }

  /**
   * Get target value for mission condition
   * @param {Object} mission - Mission object
   * @returns {number} Target count for completion
   */
  getTargetForMission(mission) {
    return mission.condition.count || 1;
  }

  // ========================================
  // PROGRESS TRACKING
  // ========================================

  /**
   * Record progress for a mission event
   * Called from various game events (combat win, extraction, screen visit, etc.)
   *
   * @param {string} eventType - Event type (e.g., 'SCREEN_VISIT', 'COMBAT_WIN')
   * @param {Object} eventData - Event-specific data
   */
  recordProgress(eventType, eventData = {}) {
    const state = gameStateManager.getState();
    const profile = state?.singlePlayerProfile;

    if (!profile) return;

    const missionState = profile.missions || {
      completed: [],
      claimable: [],
      hidden: [],
      progress: {},
    };

    const availableMissions = this.getAvailableMissions();
    let updated = false;

    for (const mission of availableMissions) {
      // Skip already claimable missions
      if (missionState.claimable.includes(mission.id)) continue;

      // Check if this event matches mission condition
      const progressDelta = this.conditionEvaluator.evaluateProgress(
        mission.condition,
        eventType,
        eventData
      );

      if (progressDelta > 0) {
        // Update progress
        const target = this.getTargetForMission(mission);
        const currentProgress = missionState.progress[mission.id] || {
          current: 0,
          target,
        };

        currentProgress.current = Math.min(
          currentProgress.current + progressDelta,
          target
        );
        currentProgress.target = target;
        missionState.progress[mission.id] = currentProgress;
        updated = true;

        // Check if mission is now complete
        if (currentProgress.current >= target) {
          if (!missionState.claimable.includes(mission.id)) {
            missionState.claimable.push(mission.id);
          }
        }
      }
    }

    if (updated) {
      gameStateManager.setState({
        singlePlayerProfile: {
          ...profile,
          missions: missionState,
        },
      });
    }
  }

  // ========================================
  // REWARD CLAIMING
  // ========================================

  /**
   * Claim reward for completed mission
   * @param {string} missionId - ID of mission to claim
   * @returns {Object} Result { success: boolean, reward?: object, error?: string }
   */
  claimReward(missionId) {
    const state = gameStateManager.getState();
    const profile = state?.singlePlayerProfile;

    if (!profile) {
      return { success: false, error: 'No profile' };
    }

    const missionState = profile.missions || {
      completed: [],
      claimable: [],
      hidden: [],
      progress: {},
    };

    // Check if mission is claimable
    if (!missionState.claimable.includes(missionId)) {
      return { success: false, error: 'Mission not claimable' };
    }

    // Get mission data
    const mission = getMissionById(missionId);
    if (!mission) {
      return { success: false, error: 'Mission not found' };
    }

    // Remove from claimable, add to completed
    missionState.claimable = missionState.claimable.filter(id => id !== missionId);
    if (!missionState.completed.includes(missionId)) {
      missionState.completed.push(missionId);
    }

    // Calculate new credits
    let newCredits = profile.credits || 0;
    if (mission.reward.credits) {
      newCredits += mission.reward.credits;
    }

    // Update state
    gameStateManager.setState({
      singlePlayerProfile: {
        ...profile,
        credits: newCredits,
        missions: missionState,
      },
    });

    return { success: true, reward: mission.reward };
  }

  /**
   * Claim all claimable rewards
   * @returns {Object} Result { success: boolean, rewards: array }
   */
  claimAllRewards() {
    const missionState = this.getMissionState();
    const results = [];

    for (const missionId of [...missionState.claimable]) {
      const result = this.claimReward(missionId);
      if (result.success) {
        results.push({ missionId, reward: result.reward });
      }
    }

    return { success: true, rewards: results };
  }

  // ========================================
  // INTRO MISSION SKIP
  // ========================================

  /**
   * Skip all intro missions (mark as hidden)
   */
  skipIntroMissions() {
    const state = gameStateManager.getState();
    const profile = state?.singlePlayerProfile;

    if (!profile) return;

    const missionState = profile.missions || {
      completed: [],
      claimable: [],
      hidden: [],
      progress: {},
    };

    const introMissions = getIntroMissions();

    for (const mission of introMissions) {
      // Add to hidden if not already
      if (!missionState.hidden.includes(mission.id)) {
        missionState.hidden.push(mission.id);
      }
      // Remove from claimable if present
      missionState.claimable = missionState.claimable.filter(id => id !== mission.id);
    }

    gameStateManager.setState({
      singlePlayerProfile: {
        ...profile,
        missions: missionState,
      },
    });
  }

  // ========================================
  // TUTORIAL MANAGEMENT
  // ========================================

  /**
   * Check if tutorial has been dismissed for a screen
   * @param {string} screenId - Screen identifier
   * @returns {boolean} True if dismissed
   */
  isTutorialDismissed(screenId) {
    const state = gameStateManager.getState();
    const profile = state?.singlePlayerProfile;

    if (!profile || !profile.tutorialDismissals) {
      return false;
    }

    return profile.tutorialDismissals[screenId] === true;
  }

  /**
   * Dismiss tutorial for a screen
   * @param {string} screenId - Screen identifier
   */
  dismissTutorial(screenId) {
    const state = gameStateManager.getState();
    const profile = state?.singlePlayerProfile;

    if (!profile) return;

    const dismissals = profile.tutorialDismissals || {};
    dismissals[screenId] = true;

    gameStateManager.setState({
      singlePlayerProfile: {
        ...profile,
        tutorialDismissals: dismissals,
      },
    });
  }

  /**
   * Reset all tutorial dismissals (for new game)
   */
  resetTutorials() {
    const state = gameStateManager.getState();
    const profile = state?.singlePlayerProfile;

    if (!profile) return;

    gameStateManager.setState({
      singlePlayerProfile: {
        ...profile,
        tutorialDismissals: {
          intro: false,
          inventory: false,
          replicator: false,
          blueprints: false,
          shop: false,
          repairBay: false,
          tacticalMapOverview: false,
          tacticalMap: false,
          deckBuilder: false,
        },
      },
    });
  }
}

// Export singleton instance
export default new MissionService();
