import { describe, it, expect } from 'vitest';
import GameServerFactory from '../GameServerFactory.js';
import LocalGameServer from '../LocalGameServer.js';
import RemoteGameServer from '../RemoteGameServer.js';

describe('GameServerFactory', () => {
  const mockGSM = { processAction: () => {}, getState: () => {}, getLocalPlayerId: () => 'player1', subscribe: () => {} };
  const mockP2P = { sendActionToHost: () => {} };

  it('creates LocalGameServer for local mode', () => {
    const server = GameServerFactory.create('local', { gameStateManager: mockGSM });
    expect(server).toBeInstanceOf(LocalGameServer);
  });

  it('creates LocalGameServer for host mode', () => {
    const server = GameServerFactory.create('host', { gameStateManager: mockGSM });
    expect(server).toBeInstanceOf(LocalGameServer);
  });

  it('creates RemoteGameServer for guest mode', () => {
    const server = GameServerFactory.create('guest', { gameStateManager: mockGSM, p2pManager: mockP2P });
    expect(server).toBeInstanceOf(RemoteGameServer);
  });
});
