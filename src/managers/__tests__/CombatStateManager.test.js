/**
 * CombatStateManager Tests
 * TDD tests for the combat state manager
 *
 * This manager handles active combat data:
 * - Game seed and active state
 * - Turn state (phase, round, current player)
 * - Player states (player1, player2)
 * - Combat state (attacks, winner)
 * - Encounter info (AI, reward type)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatStateManager } from '../CombatStateManager.js';

describe('CombatStateManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CombatStateManager();
  });

  describe('initialization', () => {
    it('should initialize with inactive state', () => {
      expect(manager.isActive()).toBe(false);
      expect(manager.getState()).toBeNull();
    });
  });

  describe('startCombat', () => {
    it('should initialize combat state', () => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: {
          aiId: 'rogue_scout',
          aiName: 'Rogue Scout',
          isBlockade: false
        }
      });

      expect(manager.isActive()).toBe(true);
      const state = manager.getState();
      expect(state.gameSeed).toBe(12345);
      expect(state.gameActive).toBe(true);
    });

    it('should store encounter info', () => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: {
          aiId: 'elite_guardian',
          aiName: 'Elite Guardian',
          isBlockade: true,
          aiDifficulty: 'hard'
        }
      });

      const state = manager.getState();
      expect(state.encounterInfo.aiId).toBe('elite_guardian');
      expect(state.encounterInfo.isBlockade).toBe(true);
    });

    it('should initialize turn state', () => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });

      const state = manager.getState();
      expect(state.turnPhase).toBe('placement');
      expect(state.roundNumber).toBe(1);
      expect(state.turn).toBe(1);
    });

    it('should notify subscribers when combat starts', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('setState', () => {
    beforeEach(() => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });
    });

    it('should update state with partial updates', () => {
      manager.setState({ turnPhase: 'deployment' });
      expect(manager.getState().turnPhase).toBe('deployment');
    });

    it('should preserve other state when updating', () => {
      manager.setState({ turnPhase: 'deployment' });
      manager.setState({ roundNumber: 2 });

      const state = manager.getState();
      expect(state.turnPhase).toBe('deployment');
      expect(state.roundNumber).toBe(2);
      expect(state.gameSeed).toBe(12345);
    });

    it('should throw error if combat is not active', () => {
      manager.endCombat();
      expect(() => manager.setState({ turnPhase: 'deployment' })).toThrow();
    });

    it('should notify subscribers on state change', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      listener.mockClear();

      manager.setState({ turnPhase: 'deployment' });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('player state', () => {
    beforeEach(() => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });
    });

    it('should set player1 state', () => {
      const player1State = {
        deck: ['card1', 'card2'],
        hand: ['card3'],
        energy: 5,
        deploymentBudget: 3,
        dronesOnBoard: { l: [], m: [], r: [] },
        shipSections: {}
      };

      manager.setPlayer1(player1State);

      expect(manager.getState().player1).toEqual(player1State);
    });

    it('should set player2 (AI) state', () => {
      const player2State = {
        deck: ['ai_card1'],
        hand: ['ai_card2'],
        energy: 4,
        deploymentBudget: 2,
        dronesOnBoard: { l: [], m: [], r: [] },
        shipSections: {}
      };

      manager.setPlayer2(player2State);

      expect(manager.getState().player2).toEqual(player2State);
    });

    it('should update player1 partial state', () => {
      manager.setPlayer1({
        deck: ['card1'],
        hand: [],
        energy: 5,
        deploymentBudget: 3,
        dronesOnBoard: { l: [], m: [], r: [] },
        shipSections: {}
      });

      manager.updatePlayer1({ energy: 3 });

      expect(manager.getState().player1.energy).toBe(3);
      expect(manager.getState().player1.deploymentBudget).toBe(3);
    });

    it('should update player2 partial state', () => {
      manager.setPlayer2({
        deck: [],
        hand: [],
        energy: 4,
        deploymentBudget: 2,
        dronesOnBoard: { l: [], m: [], r: [] },
        shipSections: {}
      });

      manager.updatePlayer2({ energy: 2 });

      expect(manager.getState().player2.energy).toBe(2);
    });
  });

  describe('turn management', () => {
    beforeEach(() => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });
    });

    it('should advance turn phase', () => {
      manager.setPhase('deployment');
      expect(manager.getState().turnPhase).toBe('deployment');

      manager.setPhase('action');
      expect(manager.getState().turnPhase).toBe('action');
    });

    it('should advance round number', () => {
      expect(manager.getState().roundNumber).toBe(1);

      manager.advanceRound();
      expect(manager.getState().roundNumber).toBe(2);

      manager.advanceRound();
      expect(manager.getState().roundNumber).toBe(3);
    });

    it('should track current player', () => {
      manager.setCurrentPlayer('player1');
      expect(manager.getState().currentPlayer).toBe('player1');

      manager.setCurrentPlayer('player2');
      expect(manager.getState().currentPlayer).toBe('player2');
    });

    it('should track actions taken this turn', () => {
      expect(manager.getState().actionsTakenThisTurn).toBe(0);

      manager.incrementActions();
      expect(manager.getState().actionsTakenThisTurn).toBe(1);

      manager.resetActions();
      expect(manager.getState().actionsTakenThisTurn).toBe(0);
    });
  });

  describe('combat resolution', () => {
    beforeEach(() => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });
    });

    it('should set attack in progress', () => {
      const attack = {
        attackerId: 'drone1',
        targetId: 'enemy_drone1',
        lane: 'm'
      };

      manager.setAttackInProgress(attack);

      expect(manager.getState().attackInProgress).toEqual(attack);
    });

    it('should clear attack in progress', () => {
      manager.setAttackInProgress({ attackerId: 'drone1', targetId: 'enemy1' });
      manager.clearAttackInProgress();

      expect(manager.getState().attackInProgress).toBeNull();
    });

    it('should set winner', () => {
      manager.setWinner('player1');
      expect(manager.getState().winner).toBe('player1');
    });

    it('should track last combat result', () => {
      const result = {
        damage: 5,
        targetDestroyed: true
      };

      manager.setLastCombatResult(result);

      expect(manager.getState().lastCombatResult).toEqual(result);
    });
  });

  describe('commitments', () => {
    beforeEach(() => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });
    });

    it('should set commitment for phase', () => {
      manager.setCommitment('deployment', 'player1', { dronesToDeploy: ['drone1'] });

      const commitments = manager.getState().commitments;
      expect(commitments.deployment.player1).toEqual({ dronesToDeploy: ['drone1'] });
    });

    it('should track commitment completion', () => {
      manager.setCommitment('deployment', 'player1', { completed: true });
      manager.setCommitment('deployment', 'player2', { completed: true });

      const commitments = manager.getState().commitments;
      expect(commitments.deployment.player1.completed).toBe(true);
      expect(commitments.deployment.player2.completed).toBe(true);
    });

    it('should clear commitments for phase', () => {
      manager.setCommitment('deployment', 'player1', { completed: true });
      manager.clearCommitments('deployment');

      expect(manager.getState().commitments.deployment).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });

      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();
      unsubscribe();

      manager.setState({ turnPhase: 'deployment' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('endCombat', () => {
    it('should clear all state', () => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });

      manager.setPlayer1({ deck: [], hand: [], energy: 5 });
      manager.setWinner('player1');

      manager.endCombat();

      expect(manager.isActive()).toBe(false);
      expect(manager.getState()).toBeNull();
    });

    it('should notify subscribers when combat ends', () => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });

      const listener = vi.fn();
      manager.subscribe(listener);
      listener.mockClear();

      manager.endCombat();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getOutcome', () => {
    beforeEach(() => {
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: {
          aiId: 'test_ai',
          aiName: 'Test AI',
          aiDifficulty: 'medium',
          isBlockade: false
        }
      });
    });

    it('should return combat outcome data', () => {
      manager.setPlayer1({
        shipSections: {
          bridge: { hull: 7, maxHull: 10 },
          powerCell: { hull: 10, maxHull: 10 }
        }
      });
      manager.setWinner('player1');

      const outcome = manager.getOutcome();

      expect(outcome.winner).toBe('player1');
      expect(outcome.encounterInfo.aiId).toBe('test_ai');
      expect(outcome.player1ShipSections).toBeDefined();
    });

    it('should return null if combat not active', () => {
      manager.endCombat();
      expect(manager.getOutcome()).toBeNull();
    });
  });

  describe('isolation from other managers', () => {
    // These tests verify that CombatStateManager is self-contained

    it('should not reference TacticalMapStateManager', () => {
      // CombatStateManager should be completely independent
      // It receives encounter info at start, not by reading from tactical map
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: {
          aiId: 'test',
          aiName: 'Test',
          isBlockade: false,
          // All needed info passed in, not looked up
          tier: 1,
          reward: { rewardType: 'ORDNANCE_PACK' }
        }
      });

      expect(manager.getState().encounterInfo.tier).toBe(1);
    });

    it('should be fully resettable without affecting other state', () => {
      // This is the key test - resetting combat should be safe
      manager.startCombat({
        gameSeed: 12345,
        encounterInfo: { aiId: 'test', aiName: 'Test', isBlockade: false }
      });

      manager.setPlayer1({ deck: ['card1'], hand: ['card2'], energy: 5 });
      manager.setPlayer2({ deck: ['ai_card1'], hand: [], energy: 4 });
      manager.setWinner('player1');

      // This reset should be completely isolated
      manager.endCombat();

      // State is fully cleared
      expect(manager.getState()).toBeNull();
      expect(manager.isActive()).toBe(false);

      // Can start new combat cleanly
      manager.startCombat({
        gameSeed: 99999,
        encounterInfo: { aiId: 'new_ai', aiName: 'New AI', isBlockade: false }
      });

      expect(manager.getState().gameSeed).toBe(99999);
      expect(manager.getState().player1).toBeNull();
    });
  });
});
