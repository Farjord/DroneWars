import { describe, it, expect, vi } from 'vitest';
import {
  buildPassAction,
  shouldPass,
  executeShieldAllocationTurn,
  executeMandatoryDiscardTurn,
  executeMandatoryDroneRemovalTurn
} from '../AISequentialTurnStrategy.js';

describe('AISequentialTurnStrategy', () => {
  describe('buildPassAction', () => {
    it('builds correct pass action structure', () => {
      const action = buildPassAction('deployment', { player1Passed: false, player2Passed: false });
      expect(action.type).toBe('playerPass');
      expect(action.payload.playerId).toBe('player2');
      expect(action.payload.playerName).toBe('AI Player');
      expect(action.payload.turnPhase).toBe('deployment');
      expect(action.payload.opponentPlayerId).toBe('player1');
    });

    it('uses the provided phase', () => {
      expect(buildPassAction('action', {}).payload.turnPhase).toBe('action');
    });
  });

  describe('shouldPass', () => {
    it('returns true when AI has already passed', () => {
      expect(shouldPass({ passInfo: { player2Passed: true } }, 'deployment')).toBe(true);
    });

    it('returns false when AI has not passed', () => {
      expect(shouldPass({ passInfo: { player2Passed: false } }, 'deployment')).toBe(false);
    });

    it('returns false when passInfo is null', () => {
      expect(shouldPass({ passInfo: null }, 'action')).toBe(false);
    });
  });

  describe('executeShieldAllocationTurn', () => {
    it('distributes shields evenly across sections', async () => {
      const calls = [];
      const mockAP = {
        processAddShield: vi.fn(async (payload) => calls.push(payload))
      };
      const gameState = {
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentShieldsToAllocate: 6
      };

      await executeShieldAllocationTurn(gameState, mockAP);

      expect(mockAP.processAddShield).toHaveBeenCalledTimes(6);
      // Round-robin: bridge, powerCell, droneControl, bridge, powerCell, droneControl
      expect(calls[0].sectionName).toBe('bridge');
      expect(calls[1].sectionName).toBe('powerCell');
      expect(calls[2].sectionName).toBe('droneControlHub');
      expect(calls[3].sectionName).toBe('bridge');
    });

    it('does nothing when no shields to allocate', async () => {
      const mockAP = { processAddShield: vi.fn() };
      await executeShieldAllocationTurn({ opponentPlacedSections: ['bridge'], opponentShieldsToAllocate: 0 }, mockAP);
      expect(mockAP.processAddShield).not.toHaveBeenCalled();
    });
  });

  describe('executeMandatoryDiscardTurn', () => {
    it('discards lowest-cost cards first', async () => {
      const mockGDS = {
        getEffectiveShipStats: () => ({ totals: { handLimit: 3 } })
      };
      const gameState = {
        gameSeed: 42,
        player2: {
          hand: [
            { name: 'Expensive', cost: 5 },
            { name: 'Cheap1', cost: 1 },
            { name: 'Medium', cost: 3 },
            { name: 'Cheap2', cost: 1 },
            { name: 'Another', cost: 4 }
          ]
        },
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub']
      };

      const result = await executeMandatoryDiscardTurn(gameState, mockGDS);
      expect(result.cardsToDiscard).toHaveLength(2); // 5 cards - 3 limit = 2 to discard
      // Both discarded cards should be cost 1 (lowest)
      result.cardsToDiscard.forEach(card => expect(card.cost).toBe(1));
    });

    it('returns empty when at/below limit', async () => {
      const mockGDS = {
        getEffectiveShipStats: () => ({ totals: { handLimit: 6 } })
      };
      const gameState = {
        player2: { hand: [{ name: 'Card', cost: 1 }] },
        opponentPlacedSections: ['bridge']
      };
      const result = await executeMandatoryDiscardTurn(gameState, mockGDS);
      expect(result.cardsToDiscard).toHaveLength(0);
    });
  });

  describe('executeMandatoryDroneRemovalTurn', () => {
    it('returns empty when at/below drone limit', async () => {
      const mockGDS = {
        getEffectiveShipStats: () => ({ totals: { cpuLimit: 10 } })
      };
      const gameState = {
        player2: {
          dronesOnBoard: {
            lane1: [{ id: 'd1', class: 1 }],
            lane2: [],
            lane3: []
          }
        },
        player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        opponentPlacedSections: ['bridge']
      };
      const result = await executeMandatoryDroneRemovalTurn(gameState, mockGDS);
      expect(result.dronesToRemove).toHaveLength(0);
    });

    it('removes cheapest drones from strongest lanes', async () => {
      const mockGDS = {
        getEffectiveShipStats: () => ({ totals: { cpuLimit: 1 } }),
        getEffectiveStats: (drone, lane) => ({ attack: drone.attack || 0, hull: drone.hull || 0 })
      };
      const gameState = {
        player2: {
          dronesOnBoard: {
            lane1: [{ id: 'd1', class: 1, attack: 1, hull: 1 }, { id: 'd2', class: 3, attack: 5, hull: 4 }],
            lane2: [{ id: 'd3', class: 2, attack: 3, hull: 2 }],
            lane3: []
          }
        },
        player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        opponentPlacedSections: ['bridge']
      };
      const result = await executeMandatoryDroneRemovalTurn(gameState, mockGDS);
      // Need to remove 2 drones (3 total - 1 limit)
      expect(result.dronesToRemove).toHaveLength(2);
      // Should prefer removing cheap drones from strong lanes
      expect(result.dronesToRemove[0].class).toBeLessThanOrEqual(result.dronesToRemove[1].class);
    });
  });
});
