// ========================================
// SHIP SECTION TARGETING PROCESSOR TESTS
// ========================================
// Tests for lane-control-based ship section targeting filtering

import { describe, it, expect, beforeEach } from 'vitest';
import ShipSectionTargetingProcessor from '../ShipSectionTargetingProcessor.js';

// Helper to build a targeting context with ship sections that have lane properties
function buildContext({ actingPlayerId = 'player1', targeting, effects, player1Drones = {}, player2Drones = {}, player2Sections = null } = {}) {
  const defaultSections = {
    bridge: { hull: 10, maxHull: 10, allocatedShields: 2, lane: 'l' },
    powerCell: { hull: 10, maxHull: 10, allocatedShields: 2, lane: 'm' },
    droneControlHub: { hull: 10, maxHull: 10, allocatedShields: 2, lane: 'r' },
  };

  return {
    actingPlayerId,
    player1: {
      shipSections: defaultSections,
      dronesOnBoard: { lane1: [], lane2: [], lane3: [], ...player1Drones },
    },
    player2: {
      shipSections: player2Sections || { ...defaultSections },
      dronesOnBoard: { lane1: [], lane2: [], lane3: [], ...player2Drones },
    },
    definition: {
      targeting,
      effects,
    },
  };
}

describe('ShipSectionTargetingProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new ShipSectionTargetingProcessor();
  });

  describe('No lane-control restrictions', () => {
    it('should return all enemy sections unfiltered when no restrictions', () => {
      const context = buildContext({
        targeting: { type: 'SHIP_SECTION', affinity: 'ENEMY' },
      });

      const targets = processor.process(context);

      expect(targets).toHaveLength(3);
      expect(targets.map(t => t.id)).toEqual(['bridge', 'powerCell', 'droneControlHub']);
      expect(targets.every(t => t.owner === 'player2')).toBe(true);
    });
  });

  describe('Breach the Line — validSections filter', () => {
    it('should return middle section when player controls lane2 and validSections includes middle', () => {
      const context = buildContext({
        targeting: {
          type: 'SHIP_SECTION',
          affinity: 'ENEMY',
          restrictions: ['REQUIRES_LANE_CONTROL'],
          validSections: ['middle'],
        },
        player1Drones: { lane2: [{ id: 'd1' }, { id: 'd2' }] },
        player2Drones: { lane2: [{ id: 'd3' }] },
      });

      const targets = processor.process(context);

      // Should return only the section whose lane maps to 'middle' position
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('powerCell');
      expect(targets[0].lane).toBe('m');
    });

    it('should return both flank sections for validSections [left, right]', () => {
      const context = buildContext({
        targeting: {
          type: 'SHIP_SECTION',
          affinity: 'ENEMY',
          restrictions: ['REQUIRES_LANE_CONTROL'],
          validSections: ['left', 'right'],
        },
        player1Drones: { lane1: [{ id: 'd1' }], lane3: [{ id: 'd2' }] },
      });

      const targets = processor.process(context);

      expect(targets).toHaveLength(2);
      const ids = targets.map(t => t.id);
      expect(ids).toContain('bridge');
      expect(ids).toContain('droneControlHub');
    });
  });

  describe('Overrun — CONTROL_LANE_EMPTY filter', () => {
    it('should return left-position section when player controls lane1 with no enemy drones', () => {
      const context = buildContext({
        targeting: {
          type: 'SHIP_SECTION',
          affinity: 'ENEMY',
          restrictions: ['REQUIRES_LANE_CONTROL'],
        },
        effects: [{
          type: 'CONDITIONAL_SECTION_DAMAGE',
          condition: { type: 'CONTROL_LANE_EMPTY', lane: 'TARGET' },
        }],
        player1Drones: { lane1: [{ id: 'd1' }, { id: 'd2' }] },
        player2Drones: { lane1: [] }, // no enemy drones in lane1
      });

      const targets = processor.process(context);

      // Only bridge (lane 'l' -> lane1) should be valid since lane1 is controlled and empty of enemies
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('bridge');
    });

    it('should return empty when no lanes are controlled-and-empty', () => {
      const context = buildContext({
        targeting: {
          type: 'SHIP_SECTION',
          affinity: 'ENEMY',
          restrictions: ['REQUIRES_LANE_CONTROL'],
        },
        effects: [{
          type: 'CONDITIONAL_SECTION_DAMAGE',
          condition: { type: 'CONTROL_LANE_EMPTY', lane: 'TARGET' },
        }],
        // Player1 has no drones anywhere — no lane control
        player1Drones: {},
        player2Drones: { lane1: [{ id: 'd1' }] },
      });

      const targets = processor.process(context);
      expect(targets).toHaveLength(0);
    });

    it('should return multiple sections when player controls multiple empty lanes', () => {
      const context = buildContext({
        targeting: {
          type: 'SHIP_SECTION',
          affinity: 'ENEMY',
          restrictions: ['REQUIRES_LANE_CONTROL'],
        },
        effects: [{
          type: 'CONDITIONAL_SECTION_DAMAGE',
          condition: { type: 'CONTROL_LANE_EMPTY', lane: 'TARGET' },
        }],
        player1Drones: {
          lane1: [{ id: 'd1' }, { id: 'd2' }],
          lane3: [{ id: 'd3' }],
        },
        // No enemy drones in lane1 or lane3
        player2Drones: {},
      });

      const targets = processor.process(context);

      expect(targets).toHaveLength(2);
      const ids = targets.map(t => t.id);
      expect(ids).toContain('bridge');        // lane 'l' -> lane1
      expect(ids).toContain('droneControlHub'); // lane 'r' -> lane3
    });
  });
});
