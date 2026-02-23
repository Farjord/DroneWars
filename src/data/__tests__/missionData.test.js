/**
 * missionData.test.js
 * TDD tests for mission data structure and helper functions
 *
 * These tests define the expected structure and behavior of the mission system
 * before implementation.
 */

import { describe, it, expect } from 'vitest';
import {
  MISSIONS,
  MISSION_CATEGORIES,
  MISSION_CONDITIONS,
  getMissionById,
  getIntroMissions,
  getMissionsByCategory,
} from '../missionData.js';

describe('Mission Data Structure', () => {

  describe('MISSION_CATEGORIES', () => {
    it('should define all required categories', () => {
      expect(MISSION_CATEGORIES.INTRO).toBe('intro');
      expect(MISSION_CATEGORIES.COMBAT).toBe('combat');
      expect(MISSION_CATEGORIES.EXTRACTION).toBe('extraction');
      expect(MISSION_CATEGORIES.COLLECTION).toBe('collection');
    });
  });

  describe('MISSION_CONDITIONS', () => {
    it('should define screen visit condition', () => {
      expect(MISSION_CONDITIONS.VISIT_SCREEN).toBe('VISIT_SCREEN');
    });

    it('should define combat conditions', () => {
      expect(MISSION_CONDITIONS.WIN_COMBATS).toBe('WIN_COMBATS');
      expect(MISSION_CONDITIONS.DESTROY_DRONES).toBe('DESTROY_DRONES');
    });

    it('should define extraction conditions', () => {
      expect(MISSION_CONDITIONS.COMPLETE_EXTRACTIONS).toBe('COMPLETE_EXTRACTIONS');
      expect(MISSION_CONDITIONS.VISIT_POI).toBe('VISIT_POI');
    });

    it('should define collection conditions', () => {
      expect(MISSION_CONDITIONS.COLLECT_CREDITS).toBe('COLLECT_CREDITS');
      expect(MISSION_CONDITIONS.CRAFT_ITEM).toBe('CRAFT_ITEM');
    });
  });

  describe('MISSIONS array', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(MISSIONS)).toBe(true);
      expect(MISSIONS.length).toBeGreaterThan(0);
    });

    it('should have all required fields for each mission', () => {
      const requiredFields = ['id', 'category', 'title', 'description', 'condition', 'reward', 'prerequisites', 'sortOrder'];

      MISSIONS.forEach(mission => {
        requiredFields.forEach(field => {
          expect(mission).toHaveProperty(field);
        });
      });
    });

    it('should have unique IDs for all missions', () => {
      const ids = MISSIONS.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories for all missions', () => {
      const validCategories = Object.values(MISSION_CATEGORIES);

      MISSIONS.forEach(mission => {
        expect(validCategories).toContain(mission.category);
      });
    });

    it('should have valid condition types for all missions', () => {
      const validConditions = Object.values(MISSION_CONDITIONS);

      MISSIONS.forEach(mission => {
        expect(validConditions).toContain(mission.condition.type);
      });
    });

    it('should have credit rewards for all missions', () => {
      MISSIONS.forEach(mission => {
        expect(mission.reward).toHaveProperty('credits');
        expect(typeof mission.reward.credits).toBe('number');
        expect(mission.reward.credits).toBeGreaterThan(0);
      });
    });

    it('should have prerequisites referencing valid mission IDs', () => {
      const allIds = MISSIONS.map(m => m.id);

      MISSIONS.forEach(mission => {
        expect(Array.isArray(mission.prerequisites)).toBe(true);
        mission.prerequisites.forEach(prereqId => {
          expect(allIds).toContain(prereqId);
        });
      });
    });

    it('should not have circular prerequisites', () => {
      // Build a dependency graph and check for cycles
      const checkCycle = (missionId, visited = new Set()) => {
        if (visited.has(missionId)) return true; // Cycle detected
        visited.add(missionId);

        const mission = MISSIONS.find(m => m.id === missionId);
        if (!mission) return false;

        for (const prereqId of mission.prerequisites) {
          if (checkCycle(prereqId, new Set(visited))) return true;
        }
        return false;
      };

      MISSIONS.forEach(mission => {
        expect(checkCycle(mission.id)).toBe(false);
      });
    });
  });

  describe('Intro Missions', () => {
    it('should have at least 6 intro missions (one per screen)', () => {
      const introMissions = MISSIONS.filter(m => m.category === MISSION_CATEGORIES.INTRO);
      expect(introMissions.length).toBeGreaterThanOrEqual(6);
    });

    it('should have isIntroMission flag set to true for intro missions', () => {
      const introMissions = MISSIONS.filter(m => m.category === MISSION_CATEGORIES.INTRO);
      introMissions.forEach(mission => {
        expect(mission.isIntroMission).toBe(true);
      });
    });

    it('should have VISIT_SCREEN conditions for intro missions', () => {
      const introMissions = MISSIONS.filter(m => m.category === MISSION_CATEGORIES.INTRO);
      introMissions.forEach(mission => {
        expect(mission.condition.type).toBe(MISSION_CONDITIONS.VISIT_SCREEN);
        expect(mission.condition.screen).toBeDefined();
      });
    });

    it('should cover all required screens in intro missions', () => {
      const introMissions = MISSIONS.filter(m => m.category === MISSION_CATEGORIES.INTRO);
      const screens = introMissions.map(m => m.condition.screen);

      const requiredScreens = ['inventory', 'blueprints', 'replicator', 'shop', 'repairBay', 'deckBuilder'];
      requiredScreens.forEach(screen => {
        expect(screens).toContain(screen);
      });
    });

    it('should have sequential sortOrder for intro missions', () => {
      const introMissions = MISSIONS
        .filter(m => m.category === MISSION_CATEGORIES.INTRO)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      for (let i = 1; i < introMissions.length; i++) {
        expect(introMissions[i].sortOrder).toBeGreaterThan(introMissions[i-1].sortOrder);
      }
    });
  });
});

describe('Mission Helper Functions', () => {

  describe('getMissionById', () => {
    it('should return correct mission for valid ID', () => {
      const firstMission = MISSIONS[0];
      const result = getMissionById(firstMission.id);
      expect(result).toEqual(firstMission);
    });

    it('should return undefined for invalid ID', () => {
      const result = getMissionById('nonexistent_mission_id');
      expect(result).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      expect(getMissionById(null)).toBeUndefined();
      expect(getMissionById(undefined)).toBeUndefined();
    });
  });

  describe('getIntroMissions', () => {
    it('should return only intro missions', () => {
      const introMissions = getIntroMissions();

      expect(Array.isArray(introMissions)).toBe(true);
      expect(introMissions.length).toBeGreaterThan(0);

      introMissions.forEach(mission => {
        expect(mission.isIntroMission).toBe(true);
        expect(mission.category).toBe(MISSION_CATEGORIES.INTRO);
      });
    });

    it('should return missions sorted by sortOrder', () => {
      const introMissions = getIntroMissions();

      for (let i = 1; i < introMissions.length; i++) {
        expect(introMissions[i].sortOrder).toBeGreaterThanOrEqual(introMissions[i-1].sortOrder);
      }
    });
  });

  describe('getMissionsByCategory', () => {
    it('should return missions filtered by category', () => {
      const combatMissions = getMissionsByCategory(MISSION_CATEGORIES.COMBAT);

      expect(Array.isArray(combatMissions)).toBe(true);
      combatMissions.forEach(mission => {
        expect(mission.category).toBe(MISSION_CATEGORIES.COMBAT);
      });
    });

    it('should return empty array for invalid category', () => {
      const result = getMissionsByCategory('invalid_category');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return all intro missions for INTRO category', () => {
      const introMissions = getMissionsByCategory(MISSION_CATEGORIES.INTRO);
      const allIntro = MISSIONS.filter(m => m.category === MISSION_CATEGORIES.INTRO);

      expect(introMissions.length).toBe(allIntro.length);
    });
  });
});
