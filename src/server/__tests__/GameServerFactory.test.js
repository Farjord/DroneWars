import { describe, it, expect } from 'vitest';
import GameServerFactory from '../GameServerFactory.js';
import LocalGameServer from '../LocalGameServer.js';

describe('GameServerFactory', () => {
  const mockGSM = { processAction: () => {}, getState: () => {}, getLocalPlayerId: () => 'player1', subscribe: () => {} };

  it('creates LocalGameServer for local mode', () => {
    const server = GameServerFactory.create('local', { gameStateManager: mockGSM });
    expect(server).toBeInstanceOf(LocalGameServer);
  });

  it('returns null for host mode (Phase 2)', () => {
    expect(GameServerFactory.create('host', { gameStateManager: mockGSM })).toBeNull();
  });

  it('returns null for guest mode (Phase 3)', () => {
    expect(GameServerFactory.create('guest', { gameStateManager: mockGSM })).toBeNull();
  });
});
