import { describe, it, expect, beforeEach } from 'vitest';
import ConditionEvaluator from '../ConditionEvaluator.js';

describe('ConditionEvaluator - SECTION_EXPOSED', () => {
  let evaluator;
  let mockContext;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();

    mockContext = {
      actingPlayerId: 'player1',
      playerStates: {
        player1: {
          shipSections: {
            bridge: { allocatedShields: 2, hull: 5, maxHull: 5 },
            droneControlHub: { allocatedShields: 1, hull: 5, maxHull: 5 },
            powerCell: { allocatedShields: 0, hull: 5, maxHull: 5 }
          }
        },
        player2: {
          shipSections: {
            bridge: { allocatedShields: 0, hull: 5, maxHull: 5 },
            droneControlHub: { allocatedShields: 3, hull: 5, maxHull: 5 },
            powerCell: { allocatedShields: 1, hull: 5, maxHull: 5 }
          }
        }
      }
    };
  });

  it('returns true when opponent section has 0 allocated shields', () => {
    // player1 is acting, so opponent is player2 — bridge has 0 shields
    const condition = { type: 'SECTION_EXPOSED', section: 'bridge' };
    expect(evaluator.evaluate(condition, mockContext)).toBe(true);
  });

  it('returns false when opponent section has shields allocated', () => {
    const condition = { type: 'SECTION_EXPOSED', section: 'droneControlHub' };
    expect(evaluator.evaluate(condition, mockContext)).toBe(false);
  });

  it('checks the correct opponent based on actingPlayerId', () => {
    // When player2 is acting, opponent is player1
    mockContext.actingPlayerId = 'player2';

    // player1's bridge has shields (2) — not exposed
    const bridgeCondition = { type: 'SECTION_EXPOSED', section: 'bridge' };
    expect(evaluator.evaluate(bridgeCondition, mockContext)).toBe(false);

    // player1's powerCell has 0 shields — exposed
    const powerCellCondition = { type: 'SECTION_EXPOSED', section: 'powerCell' };
    expect(evaluator.evaluate(powerCellCondition, mockContext)).toBe(true);
  });

  it('returns false when section does not exist on opponent', () => {
    const condition = { type: 'SECTION_EXPOSED', section: 'nonExistentSection' };
    expect(evaluator.evaluate(condition, mockContext)).toBe(false);
  });

  it('returns false when opponent has no shipSections', () => {
    mockContext.playerStates.player2.shipSections = {};
    const condition = { type: 'SECTION_EXPOSED', section: 'bridge' };
    expect(evaluator.evaluate(condition, mockContext)).toBe(false);
  });
});
