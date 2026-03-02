import { describe, it, expect, vi } from 'vitest';
import { evaluateSingleMoveCard } from '../cardEvaluators/movementCards.js';
import { INVALID_SCORE } from '../aiConstants.js';

// Mock the laneScoring module
vi.mock('../scoring/laneScoring.js', () => ({
  calculateLaneScore: vi.fn().mockReturnValue(0),
}));

describe('AI lane capacity - movement card evaluation', () => {
  const makeDrones = (count, prefix = 'drone') =>
    Array.from({ length: count }, (_, i) => ({
      id: `${prefix}_${i}`, name: 'TestDrone', hull: 3, isExhausted: false, attack: 2,
    }));

  const createContext = (p2Lanes = {}) => ({
    player1: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {},
    },
    player2: {
      dronesOnBoard: {
        lane1: p2Lanes.lane1 || [],
        lane2: p2Lanes.lane2 || [],
        lane3: p2Lanes.lane3 || [],
      },
      hand: [],
    },
    gameDataService: {
      getEffectiveStats: vi.fn().mockReturnValue({ attack: 2, speed: 3, keywords: new Set() }),
    },
    allSections: { player1: [], player2: [] },
    getShipStatus: vi.fn().mockReturnValue('healthy'),
  });

  it('should return INVALID_SCORE when destination lane is full (friendly drone)', () => {
    const context = createContext({ lane2: makeDrones(5) });
    const card = { id: 'c1', name: 'Maneuver', cost: 1, effects: [{ type: 'SINGLE_MOVE', properties: [] }] };
    const moveData = { drone: { id: 'd1', name: 'TestDrone', class: 1 }, fromLane: 'lane1', toLane: 'lane2' };

    const result = evaluateSingleMoveCard(card, null, moveData, context);
    expect(result.score).toBe(INVALID_SCORE);
    expect(result.logic.some(l => l.toLowerCase().includes('full'))).toBe(true);
  });

  it('should allow move when destination has room', () => {
    const context = createContext({ lane2: makeDrones(4) });
    const card = { id: 'c1', name: 'Maneuver', cost: 1, effects: [{ type: 'SINGLE_MOVE', properties: [] }] };
    const moveData = { drone: { id: 'd1', name: 'TestDrone', class: 1 }, fromLane: 'lane1', toLane: 'lane2' };

    const result = evaluateSingleMoveCard(card, null, moveData, context);
    expect(result.score).not.toBe(INVALID_SCORE);
  });

  it('should return INVALID_SCORE when enemy destination lane is full (Tactical Repositioning)', () => {
    // Enemy drone in player1's lane1 being moved to player1's lane2 which is full
    const context = createContext();
    context.player1.dronesOnBoard.lane1 = [{ id: 'enemy1', name: 'EnemyDrone', hull: 3, isExhausted: false, attack: 2 }];
    context.player1.dronesOnBoard.lane2 = makeDrones(5, 'enemy');

    const card = { id: 'c1', name: 'Tactical Repositioning', cost: 2, effects: [{ type: 'SINGLE_MOVE', properties: [] }] };
    const moveData = { drone: { id: 'enemy1', name: 'EnemyDrone', class: 2 }, fromLane: 'lane1', toLane: 'lane2' };

    const result = evaluateSingleMoveCard(card, null, moveData, context);
    expect(result.score).toBe(INVALID_SCORE);
  });
});
