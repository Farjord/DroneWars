import { describe, it, expect } from 'vitest';
import GameServerFactory from '../GameServerFactory.js';
import LocalGameServer from '../LocalGameServer.js';
import RemoteGameServer from '../RemoteGameServer.js';
import GameEngine from '../GameEngine.js';

describe('GameServerFactory', () => {
  const mockGSM = { processAction: () => {}, getState: () => {}, getLocalPlayerId: () => 'player1', subscribe: () => {} };
  const mockAP = { queueAction: () => {} };
  const mockGFM = {};
  const mockP2P = { sendActionToHost: () => {} };

  it('creates LocalGameServer for local mode (player2 is AI)', () => {
    const server = GameServerFactory.create('local', { gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM });
    expect(server).toBeInstanceOf(LocalGameServer);
    expect(server.isPlayerAI('player2')).toBe(true);
    expect(server.isPlayerAI('player1')).toBe(false);
  });

  it('creates LocalGameServer with GameEngine for local mode', () => {
    const server = GameServerFactory.create('local', { gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM });
    expect(server.gameEngine).toBeInstanceOf(GameEngine);
  });

  it('creates LocalGameServer for host mode (no AI players)', () => {
    const server = GameServerFactory.create('host', { gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM });
    expect(server).toBeInstanceOf(LocalGameServer);
    expect(server.isPlayerAI('player2')).toBe(false);
    expect(server.isPlayerAI('player1')).toBe(false);
  });

  it('creates LocalGameServer with GameEngine for host mode', () => {
    const server = GameServerFactory.create('host', { gameStateManager: mockGSM, actionProcessor: mockAP, gameFlowManager: mockGFM });
    expect(server.gameEngine).toBeInstanceOf(GameEngine);
  });

  it('creates RemoteGameServer for guest mode', () => {
    const server = GameServerFactory.create('guest', { gameStateManager: mockGSM, p2pManager: mockP2P });
    expect(server).toBeInstanceOf(RemoteGameServer);
  });
});
