import { describe, it, expect, vi, beforeEach } from 'vitest';
import LocalTransport from '../LocalTransport.js';

describe('LocalTransport', () => {
  let transport;
  let mockEngine;

  const mockState = {
    player1: { hand: [{ id: 'c1' }], deck: [{ id: 'c3' }], discardPile: [], hp: 10 },
    player2: { hand: [{ id: 'c2' }], deck: [], discardPile: [], hp: 10 },
  };

  const mockAnimations = {
    actionAnimations: [{ animationName: 'ATTACK' }],
    systemAnimations: [],
  };

  beforeEach(() => {
    // Mock GameEngine with registerClient/unregisterClient and processAction.
    // processAction triggers _emitToClients which calls the registered callback.
    const registeredClients = new Map();
    mockEngine = {
      registerClient: vi.fn((playerId, cb) => registeredClients.set(playerId, cb)),
      unregisterClient: vi.fn((playerId) => registeredClients.delete(playerId)),
      processAction: vi.fn(async () => {
        // Simulate GameEngine._emitToClients: call all registered callbacks with redacted state
        for (const [pid, cb] of registeredClients) {
          // Simplified redaction: give each player their own data, redact opponent
          const opponentId = pid === 'player1' ? 'player2' : 'player1';
          const opponentState = mockState[opponentId];
          const redactedOpponent = {
            ...opponentState,
            hand: [], deck: [], discardPile: [],
            handCount: opponentState.hand.length,
            deckCount: opponentState.deck.length,
            discardCount: opponentState.discardPile.length,
          };
          const redactedState = { ...mockState, [opponentId]: redactedOpponent };
          await cb({ state: redactedState, animations: mockAnimations });
        }
        return { state: mockState, animations: mockAnimations, result: { success: true } };
      }),
    };
    transport = new LocalTransport(mockEngine, { playerId: 'player1' });
  });

  describe('constructor', () => {
    it('registers as a client on GameEngine', () => {
      expect(mockEngine.registerClient).toHaveBeenCalledWith('player1', expect.any(Function));
    });
  });

  describe('sendAction', () => {
    it('delegates to gameEngine.processAction', async () => {
      transport.onResponse(() => {});
      await transport.sendAction('attack', { droneId: 'd1' });

      expect(mockEngine.processAction).toHaveBeenCalledWith('attack', { droneId: 'd1' });
    });

    it('delivers state via push callback (not return value)', async () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      await transport.sendAction('attack', { droneId: 'd1' });

      expect(callback).toHaveBeenCalledOnce();
      const response = callback.mock.calls[0][0];

      // Player1's own hand is preserved
      expect(response.state.player1.hand).toEqual([{ id: 'c1' }]);
      // Opponent's hand is redacted
      expect(response.state.player2.hand).toEqual([]);
      expect(response.state.player2.handCount).toBe(1);
    });

    it('delivers full animations (no longer strips them)', async () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      await transport.sendAction('move', {});

      const response = callback.mock.calls[0][0];
      expect(response.animations).toEqual(mockAnimations);
    });

    it('returns the result from gameEngine response', async () => {
      transport.onResponse(() => {});
      const result = await transport.sendAction('attack', { droneId: 'd1' });
      expect(result).toEqual({ success: true });
    });

    it('awaits the response callback before returning', async () => {
      const order = [];
      transport.onResponse(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        order.push('callback');
      });
      await transport.sendAction('attack', {});
      order.push('after');
      expect(order).toEqual(['callback', 'after']);
    });

    it('does not throw when no response callback is registered', async () => {
      // Response callback is null but the registered client callback handles it gracefully
      await expect(transport.sendAction('attack', {})).resolves.not.toThrow();
    });
  });

  describe('onResponse', () => {
    it('registers a callback that receives responses', async () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      await transport.sendAction('pass', {});

      expect(callback).toHaveBeenCalledOnce();
    });

    it('replaces the previous callback', async () => {
      const first = vi.fn();
      const second = vi.fn();

      transport.onResponse(first);
      transport.onResponse(second);

      await transport.sendAction('pass', {});

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledOnce();
    });
  });

  describe('onActionAck', () => {
    it('does not throw (no-op for local transport)', () => {
      expect(() => transport.onActionAck(() => {})).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('unregisters from GameEngine and clears the response callback', async () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      transport.dispose();

      expect(mockEngine.unregisterClient).toHaveBeenCalledWith('player1');

      // After dispose, the push callback no longer fires _responseCallback
      await transport.sendAction('pass', {});
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('state redaction for player2', () => {
    it('redacts player1 hand when playerId is player2', async () => {
      const p2Transport = new LocalTransport(mockEngine, { playerId: 'player2' });
      const callback = vi.fn();
      p2Transport.onResponse(callback);

      await p2Transport.sendAction('attack', {});

      const response = callback.mock.calls[0][0];
      // Player2's own hand is preserved
      expect(response.state.player2.hand).toEqual([{ id: 'c2' }]);
      // Player1's hand is redacted
      expect(response.state.player1.hand).toEqual([]);
      expect(response.state.player1.handCount).toBe(1);
      expect(response.state.player1.deckCount).toBe(1);
    });
  });
});
