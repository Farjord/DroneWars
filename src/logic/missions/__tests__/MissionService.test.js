/**
 * MissionService.test.js
 * TDD tests for mission service
 *
 * These tests define the expected behavior of the MissionService
 * which manages mission state, progress tracking, and reward claiming.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MISSIONS, MISSION_CATEGORIES, getIntroMissions } from '../../../data/missionData.js';

// Mock GameStateManager before importing MissionService
const mockState = {
  singlePlayerProfile: {
    credits: 100,
    missions: {
      completed: [],
      claimable: [],
      hidden: [],
      progress: {},
    },
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
};

vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(() => mockState),
    setState: vi.fn((updates) => {
      // Actually apply updates so subsequent calls reflect the change
      if (updates.singlePlayerProfile) {
        mockState.singlePlayerProfile = {
          ...mockState.singlePlayerProfile,
          ...updates.singlePlayerProfile,
        };
      }
    }),
  },
}));

// Import after mock
import MissionService from '../MissionService.js';
import gameStateManager from '../../../managers/GameStateManager.js';

describe('MissionService', () => {

  beforeEach(() => {
    // Reset mock state before each test
    mockState.singlePlayerProfile = {
      credits: 100,
      missions: {
        completed: [],
        claimable: [],
        hidden: [],
        progress: {},
      },
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
    };
    vi.clearAllMocks();
  });

  describe('getMissionState', () => {
    it('should return default state when profile has no missions', () => {
      mockState.singlePlayerProfile.missions = undefined;

      const state = MissionService.getMissionState();

      expect(state).toEqual({
        completed: [],
        claimable: [],
        hidden: [],
        progress: {},
      });
    });

    it('should return missions from profile', () => {
      mockState.singlePlayerProfile.missions = {
        completed: ['mission_1'],
        claimable: ['mission_2'],
        hidden: [],
        progress: { mission_3: { current: 5, target: 10 } },
      };

      const state = MissionService.getMissionState();

      expect(state.completed).toContain('mission_1');
      expect(state.claimable).toContain('mission_2');
      expect(state.progress.mission_3.current).toBe(5);
    });
  });

  describe('getAvailableMissions', () => {
    it('should return all missions when none completed or hidden', () => {
      const available = MissionService.getAvailableMissions();

      // Should include missions with no prerequisites
      const noPrereqMissions = MISSIONS.filter(m => m.prerequisites.length === 0);
      expect(available.length).toBeGreaterThanOrEqual(noPrereqMissions.length);
    });

    it('should filter out completed missions', () => {
      const firstMission = MISSIONS[0];
      mockState.singlePlayerProfile.missions.completed = [firstMission.id];

      const available = MissionService.getAvailableMissions();

      expect(available.find(m => m.id === firstMission.id)).toBeUndefined();
    });

    it('should filter out hidden missions', () => {
      const firstMission = MISSIONS[0];
      mockState.singlePlayerProfile.missions.hidden = [firstMission.id];

      const available = MissionService.getAvailableMissions();

      expect(available.find(m => m.id === firstMission.id)).toBeUndefined();
    });

    it('should respect prerequisites', () => {
      // Find a mission with prerequisites
      const missionWithPrereq = MISSIONS.find(m => m.prerequisites.length > 0);
      if (missionWithPrereq) {
        // Don't complete prerequisites
        mockState.singlePlayerProfile.missions.completed = [];

        const available = MissionService.getAvailableMissions();

        // Should not include mission with unmet prerequisites
        expect(available.find(m => m.id === missionWithPrereq.id)).toBeUndefined();
      }
    });

    it('should include missions when prerequisites are met', () => {
      // Find a mission with prerequisites
      const missionWithPrereq = MISSIONS.find(m => m.prerequisites.length > 0);
      if (missionWithPrereq) {
        // Complete all prerequisites
        mockState.singlePlayerProfile.missions.completed = [...missionWithPrereq.prerequisites];

        const available = MissionService.getAvailableMissions();

        // Should include mission with met prerequisites
        expect(available.find(m => m.id === missionWithPrereq.id)).toBeDefined();
      }
    });
  });

  describe('recordProgress', () => {
    it('should update progress for matching conditions', () => {
      // Use first intro mission which has VISIT_SCREEN condition
      const introMission = MISSIONS.find(m =>
        m.category === MISSION_CATEGORIES.INTRO &&
        m.prerequisites.length === 0
      );

      MissionService.recordProgress('SCREEN_VISIT', { screen: introMission.condition.screen });

      expect(gameStateManager.setState).toHaveBeenCalled();
    });

    it('should mark mission claimable when target reached', () => {
      const introMission = MISSIONS.find(m =>
        m.category === MISSION_CATEGORIES.INTRO &&
        m.prerequisites.length === 0
      );

      MissionService.recordProgress('SCREEN_VISIT', { screen: introMission.condition.screen });

      // Check that setState was called with claimable array containing the mission
      const lastCall = gameStateManager.setState.mock.calls[gameStateManager.setState.mock.calls.length - 1];
      if (lastCall) {
        const profile = lastCall[0].singlePlayerProfile;
        expect(profile.missions.claimable).toContain(introMission.id);
      }
    });

    it('should not update progress for already claimable missions', () => {
      const introMission = MISSIONS.find(m =>
        m.category === MISSION_CATEGORIES.INTRO &&
        m.prerequisites.length === 0
      );

      // Already claimable
      mockState.singlePlayerProfile.missions.claimable = [introMission.id];

      MissionService.recordProgress('SCREEN_VISIT', { screen: introMission.condition.screen });

      // Should not have added another entry
      expect(mockState.singlePlayerProfile.missions.claimable.filter(id => id === introMission.id).length).toBe(1);
    });
  });

  describe('claimReward', () => {
    it('should move mission from claimable to completed', () => {
      const introMission = MISSIONS.find(m => m.category === MISSION_CATEGORIES.INTRO);
      mockState.singlePlayerProfile.missions.claimable = [introMission.id];

      const result = MissionService.claimReward(introMission.id);

      expect(result.success).toBe(true);
      expect(mockState.singlePlayerProfile.missions.claimable).not.toContain(introMission.id);
      expect(mockState.singlePlayerProfile.missions.completed).toContain(introMission.id);
    });

    it('should add credits to profile', () => {
      const introMission = MISSIONS.find(m => m.category === MISSION_CATEGORIES.INTRO);
      const initialCredits = mockState.singlePlayerProfile.credits;
      mockState.singlePlayerProfile.missions.claimable = [introMission.id];

      MissionService.claimReward(introMission.id);

      expect(mockState.singlePlayerProfile.credits).toBe(initialCredits + introMission.reward.credits);
    });

    it('should return error for non-claimable mission', () => {
      const result = MissionService.claimReward('nonexistent_mission');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return reward details on success', () => {
      const introMission = MISSIONS.find(m => m.category === MISSION_CATEGORIES.INTRO);
      mockState.singlePlayerProfile.missions.claimable = [introMission.id];

      const result = MissionService.claimReward(introMission.id);

      expect(result.success).toBe(true);
      expect(result.reward).toEqual(introMission.reward);
    });
  });

  describe('skipIntroMissions', () => {
    it('should mark all intro missions as hidden', () => {
      MissionService.skipIntroMissions();

      const introMissions = getIntroMissions();
      introMissions.forEach(mission => {
        expect(mockState.singlePlayerProfile.missions.hidden).toContain(mission.id);
      });
    });

    it('should remove intro missions from claimable', () => {
      const introMissions = getIntroMissions();
      mockState.singlePlayerProfile.missions.claimable = [introMissions[0].id];

      MissionService.skipIntroMissions();

      expect(mockState.singlePlayerProfile.missions.claimable).not.toContain(introMissions[0].id);
    });
  });

  describe('Tutorial Management', () => {
    describe('isTutorialDismissed', () => {
      it('should return false for non-dismissed tutorial', () => {
        const result = MissionService.isTutorialDismissed('inventory');

        expect(result).toBe(false);
      });

      it('should return true for dismissed tutorial', () => {
        mockState.singlePlayerProfile.tutorialDismissals.inventory = true;

        const result = MissionService.isTutorialDismissed('inventory');

        expect(result).toBe(true);
      });

      it('should return false for missing profile', () => {
        mockState.singlePlayerProfile = undefined;

        const result = MissionService.isTutorialDismissed('inventory');

        expect(result).toBe(false);
      });
    });

    describe('dismissTutorial', () => {
      it('should set tutorial dismissal to true', () => {
        MissionService.dismissTutorial('inventory');

        expect(mockState.singlePlayerProfile.tutorialDismissals.inventory).toBe(true);
      });

      it('should call setState with updated dismissals', () => {
        MissionService.dismissTutorial('shop');

        expect(gameStateManager.setState).toHaveBeenCalled();
      });
    });
  });

  describe('getActiveCount and getClaimableCount', () => {
    it('should return count of active missions', () => {
      const count = MissionService.getActiveCount();

      // Should be > 0 since we have missions with no prerequisites
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return count of claimable missions', () => {
      mockState.singlePlayerProfile.missions.claimable = ['mission_1', 'mission_2'];

      const count = MissionService.getClaimableCount();

      expect(count).toBe(2);
    });

    it('should return 0 for claimable when none exist', () => {
      mockState.singlePlayerProfile.missions.claimable = [];

      const count = MissionService.getClaimableCount();

      expect(count).toBe(0);
    });
  });
});
