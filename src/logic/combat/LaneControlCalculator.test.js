// ========================================
// LANE CONTROL CALCULATOR TESTS
// ========================================
// Tests for the Lane Control Calculator
// Following TDD - these tests are written BEFORE implementation

import { LaneControlCalculator } from './LaneControlCalculator.js';

describe('LaneControlCalculator', () => {
  describe('calculateLaneControl', () => {
    it('should return player1 control when player1 has more drones in lane1', () => {
      const p1State = { dronesOnBoard: { lane1: [{}, {}], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [{}], lane2: [], lane3: [] } };

      const result = LaneControlCalculator.calculateLaneControl(p1State, p2State);

      expect(result.lane1).toBe('player1');
      expect(result.lane2).toBe(null);
      expect(result.lane3).toBe(null);
    });

    it('should return null control on tie (equal drone count)', () => {
      const p1State = { dronesOnBoard: { lane1: [{}], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [{}], lane2: [], lane3: [] } };

      const result = LaneControlCalculator.calculateLaneControl(p1State, p2State);

      expect(result.lane1).toBe(null);
      expect(result.lane2).toBe(null);
      expect(result.lane3).toBe(null);
    });

    it('should return player2 control when player2 has more drones', () => {
      const p1State = { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [{}, {}], lane2: [], lane3: [] } };

      const result = LaneControlCalculator.calculateLaneControl(p1State, p2State);

      expect(result.lane1).toBe('player2');
      expect(result.lane2).toBe(null);
      expect(result.lane3).toBe(null);
    });

    it('should calculate control independently for each lane', () => {
      const p1State = {
        dronesOnBoard: {
          lane1: [{}, {}],      // player1 controls (2 vs 1)
          lane2: [{}],          // tie (1 vs 1)
          lane3: []             // player2 controls (0 vs 2)
        }
      };
      const p2State = {
        dronesOnBoard: {
          lane1: [{}],
          lane2: [{}],
          lane3: [{}, {}]
        }
      };

      const result = LaneControlCalculator.calculateLaneControl(p1State, p2State);

      expect(result.lane1).toBe('player1');
      expect(result.lane2).toBe(null);  // tie
      expect(result.lane3).toBe('player2');
    });

    it('should handle empty lanes correctly (no control)', () => {
      const p1State = { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } };

      const result = LaneControlCalculator.calculateLaneControl(p1State, p2State);

      expect(result.lane1).toBe(null);
      expect(result.lane2).toBe(null);
      expect(result.lane3).toBe(null);
    });

    it('should handle undefined dronesOnBoard arrays gracefully', () => {
      const p1State = { dronesOnBoard: { lane1: undefined, lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [], lane2: undefined, lane3: [] } };

      const result = LaneControlCalculator.calculateLaneControl(p1State, p2State);

      expect(result.lane1).toBe(null);
      expect(result.lane2).toBe(null);
      expect(result.lane3).toBe(null);
    });
  });

  describe('checkLaneControl', () => {
    it('should return true when ALL required lanes controlled (operator: ALL)', () => {
      const laneControl = { lane1: 'player1', lane2: null, lane3: 'player1' };

      const result = LaneControlCalculator.checkLaneControl(
        'player1',
        ['lane1', 'lane3'],
        laneControl,
        'ALL'
      );

      expect(result).toBe(true);
    });

    it('should return false when not ALL required lanes controlled', () => {
      const laneControl = { lane1: 'player1', lane2: 'player2', lane3: 'player1' };

      const result = LaneControlCalculator.checkLaneControl(
        'player1',
        ['lane1', 'lane2', 'lane3'],
        laneControl,
        'ALL'
      );

      expect(result).toBe(false);
    });

    it('should return false when no required lanes controlled', () => {
      const laneControl = { lane1: 'player2', lane2: 'player2', lane3: 'player2' };

      const result = LaneControlCalculator.checkLaneControl(
        'player1',
        ['lane1', 'lane2'],
        laneControl,
        'ALL'
      );

      expect(result).toBe(false);
    });

    it('should return true when ANY required lane controlled (operator: ANY)', () => {
      const laneControl = { lane1: 'player1', lane2: 'player2', lane3: null };

      const result = LaneControlCalculator.checkLaneControl(
        'player1',
        ['lane1', 'lane2', 'lane3'],
        laneControl,
        'ANY'
      );

      expect(result).toBe(true);
    });

    it('should return false when no lanes controlled (operator: ANY)', () => {
      const laneControl = { lane1: 'player2', lane2: null, lane3: 'player2' };

      const result = LaneControlCalculator.checkLaneControl(
        'player1',
        ['lane1', 'lane2', 'lane3'],
        laneControl,
        'ANY'
      );

      expect(result).toBe(false);
    });

    it('should default to ALL operator if not specified', () => {
      const laneControl = { lane1: 'player1', lane2: 'player1', lane3: null };

      const result = LaneControlCalculator.checkLaneControl(
        'player1',
        ['lane1', 'lane2'],
        laneControl
      );

      expect(result).toBe(true);
    });
  });

  describe('checkLaneControlEmpty', () => {
    it('should return true when lane controlled AND no enemy drones present', () => {
      const p1State = { dronesOnBoard: { lane1: [{}, {}], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } };
      const laneControl = { lane1: 'player1', lane2: null, lane3: null };

      const result = LaneControlCalculator.checkLaneControlEmpty(
        'player1',
        'lane1',
        p1State,
        p2State,
        laneControl
      );

      expect(result).toBe(true);
    });

    it('should return false when lane controlled but enemy drones present', () => {
      const p1State = { dronesOnBoard: { lane1: [{}, {}], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [{}], lane2: [], lane3: [] } };
      const laneControl = { lane1: 'player1', lane2: null, lane3: null };

      const result = LaneControlCalculator.checkLaneControlEmpty(
        'player1',
        'lane1',
        p1State,
        p2State,
        laneControl
      );

      expect(result).toBe(false);
    });

    it('should return false when lane not controlled (even if no enemy drones)', () => {
      const p1State = { dronesOnBoard: { lane1: [{}], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [{}, {}], lane2: [], lane3: [] } };
      const laneControl = { lane1: 'player2', lane2: null, lane3: null };

      const result = LaneControlCalculator.checkLaneControlEmpty(
        'player1',
        'lane1',
        p1State,
        p2State,
        laneControl
      );

      expect(result).toBe(false);
    });

    it('should return false when lane is tied (no control)', () => {
      const p1State = { dronesOnBoard: { lane1: [{}], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } };
      const laneControl = { lane1: null, lane2: null, lane3: null };

      const result = LaneControlCalculator.checkLaneControlEmpty(
        'player1',
        'lane1',
        p1State,
        p2State,
        laneControl
      );

      expect(result).toBe(false);
    });

    it('should work correctly for player2 as well', () => {
      const p1State = { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: [{}, {}], lane2: [], lane3: [] } };
      const laneControl = { lane1: 'player2', lane2: null, lane3: null };

      const result = LaneControlCalculator.checkLaneControlEmpty(
        'player2',
        'lane1',
        p1State,
        p2State,
        laneControl
      );

      expect(result).toBe(true);
    });

    it('should handle undefined drone arrays gracefully', () => {
      const p1State = { dronesOnBoard: { lane1: [{}, {}], lane2: [], lane3: [] } };
      const p2State = { dronesOnBoard: { lane1: undefined, lane2: [], lane3: [] } };
      const laneControl = { lane1: 'player1', lane2: null, lane3: null };

      const result = LaneControlCalculator.checkLaneControlEmpty(
        'player1',
        'lane1',
        p1State,
        p2State,
        laneControl
      );

      expect(result).toBe(true);
    });
  });
});
