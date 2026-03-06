import { describe, it, expect, vi } from 'vitest';
import GameServerFactory from '../GameServerFactory.js';
import GameClient from '../../client/GameClient.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

describe('GameServerFactory', () => {
  const mockGSM = { processAction: () => {}, getState: () => {}, getLocalPlayerId: () => 'player1', subscribe: () => () => {} };
  const mockAP = { queueAction: () => {}, broadcastService: { broadcastIfNeeded: () => {} } };
  const mockGFM = {};
  const mockClientStateStore = {
    getState: () => ({ turnPhase: 'action' }),
    subscribe: () => () => {},
    applyUpdate: () => {},
  };
  const mockP2P = {
    sendActionToHost: () => {},
    requestFullSync: () => {},
    subscribe: () => () => {},
  };
  const mockPAQ = { queueAnimation: () => {} };

  describe('local mode', () => {
    it('creates a GameClient', () => {
      const server = GameServerFactory.create('local', {
        gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM,
        clientStateStore: mockClientStateStore,
      });
      expect(server).toBeInstanceOf(GameClient);
    });

    it('player2 is AI in local mode', () => {
      const server = GameServerFactory.create('local', {
        gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM,
        clientStateStore: mockClientStateStore,
      });
      expect(server.isPlayerAI('player2')).toBe(true);
      expect(server.isPlayerAI('player1')).toBe(false);
    });

    it('is not multiplayer', () => {
      const server = GameServerFactory.create('local', {
        gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM,
        clientStateStore: mockClientStateStore,
      });
      expect(server.isMultiplayer()).toBe(false);
    });

    it('playerId is player1', () => {
      const server = GameServerFactory.create('local', {
        gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM,
        clientStateStore: mockClientStateStore,
      });
      expect(server.getLocalPlayerId()).toBe('player1');
    });
  });

  describe('host mode', () => {
    it('creates a GameClient with isMultiplayer=true', () => {
      const server = GameServerFactory.create('host', {
        gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM,
        clientStateStore: mockClientStateStore, p2pManager: mockP2P, phaseAnimationQueue: mockPAQ,
      });
      expect(server).toBeInstanceOf(GameClient);
      expect(server.isMultiplayer()).toBe(true);
    });

    it('no players are AI in host mode', () => {
      const server = GameServerFactory.create('host', {
        gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM,
        clientStateStore: mockClientStateStore, p2pManager: mockP2P, phaseAnimationQueue: mockPAQ,
      });
      expect(server.isPlayerAI('player1')).toBe(false);
      expect(server.isPlayerAI('player2')).toBe(false);
    });
  });

  describe('guest mode', () => {
    it('creates a GameClient with P2PTransport', () => {
      const server = GameServerFactory.create('guest', {
        gameStateManager: mockGSM, p2pManager: mockP2P,
        clientStateStore: mockClientStateStore, phaseAnimationQueue: mockPAQ,
      });
      expect(server).toBeInstanceOf(GameClient);
    });

    it('playerId is player2', () => {
      const server = GameServerFactory.create('guest', {
        gameStateManager: mockGSM, p2pManager: mockP2P,
        clientStateStore: mockClientStateStore, phaseAnimationQueue: mockPAQ,
      });
      expect(server.getLocalPlayerId()).toBe('player2');
    });

    it('is multiplayer', () => {
      const server = GameServerFactory.create('guest', {
        gameStateManager: mockGSM, p2pManager: mockP2P,
        clientStateStore: mockClientStateStore, phaseAnimationQueue: mockPAQ,
      });
      expect(server.isMultiplayer()).toBe(true);
    });
  });

  describe('unknown mode', () => {
    it('throws for unknown game mode', () => {
      expect(() => GameServerFactory.create('spectator', {
        gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM,
      })).toThrow('GameServerFactory: unknown game mode "spectator"');
    });
  });
});
