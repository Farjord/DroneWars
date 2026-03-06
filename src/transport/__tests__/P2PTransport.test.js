import { describe, it, expect, vi, beforeEach } from 'vitest';
import P2PTransport from '../P2PTransport.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

// Minimal mock P2PManager with subscribe/unsubscribe
function makeP2PManager() {
  let listener = null;
  return {
    sendActionToHost: vi.fn(),
    requestFullSync: vi.fn(),
    subscribe(cb) {
      listener = cb;
      return () => { listener = null; };
    },
    // Test helper to simulate P2P events
    _emit(event) { listener?.(event); },
    _getListener() { return listener; },
  };
}

describe('P2PTransport', () => {
  let transport;
  let p2p;

  beforeEach(() => {
    vi.clearAllMocks();
    p2p = makeP2PManager();
    transport = new P2PTransport(p2p);
  });

  // --- sendAction ---

  describe('sendAction', () => {
    it('delegates to p2pManager.sendActionToHost', async () => {
      await transport.sendAction('attack', { droneId: 'd1' });
      expect(p2p.sendActionToHost).toHaveBeenCalledWith('attack', { droneId: 'd1' });
    });
  });

  // --- onResponse ---

  describe('onResponse', () => {
    it('delivers state_update_received events to response callback', () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      p2p._emit({
        type: 'state_update_received',
        data: {
          state: { turnPhase: 'action' },
          actionAnimations: [{ animationName: 'ATTACK' }],
          systemAnimations: [],
          sequenceId: 1,
        },
      });

      // MessageQueue processes synchronously for in-order messages
      expect(callback).toHaveBeenCalledWith({
        state: { turnPhase: 'action' },
        animations: {
          actionAnimations: [{ animationName: 'ATTACK' }],
          systemAnimations: [],
        },
      });
    });

    it('does not deliver non-state-update events to response callback', () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      p2p._emit({ type: 'connected', data: { isHost: false } });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // --- onActionAck ---

  describe('onActionAck', () => {
    it('delivers action_ack_received events to ack callback', () => {
      const callback = vi.fn();
      transport.onActionAck(callback);

      p2p._emit({
        type: 'action_ack_received',
        data: { actionType: 'attack', success: true },
      });

      expect(callback).toHaveBeenCalledWith({ actionType: 'attack', success: true });
    });

    it('does not call response callback for ack events', () => {
      const responseCallback = vi.fn();
      const ackCallback = vi.fn();
      transport.onResponse(responseCallback);
      transport.onActionAck(ackCallback);

      p2p._emit({
        type: 'action_ack_received',
        data: { actionType: 'attack', success: true },
      });

      expect(responseCallback).not.toHaveBeenCalled();
      expect(ackCallback).toHaveBeenCalled();
    });
  });

  // --- MessageQueue integration ---

  describe('MessageQueue integration', () => {
    it('processes in-order messages immediately', () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      p2p._emit({
        type: 'state_update_received',
        data: { state: { round: 1 }, actionAnimations: [], systemAnimations: [], sequenceId: 1 },
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('buffers out-of-order messages', () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      // Send seq 3 before seq 2 — should be buffered
      p2p._emit({
        type: 'state_update_received',
        data: { state: { round: 3 }, actionAnimations: [], systemAnimations: [], sequenceId: 3 },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('delivers buffered messages when gap is filled', async () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      // Seq 2 arrives before seq 1
      p2p._emit({
        type: 'state_update_received',
        data: { state: { round: 2 }, actionAnimations: [], systemAnimations: [], sequenceId: 2 },
      });

      expect(callback).not.toHaveBeenCalled();

      // Seq 1 arrives — should process both (async queue needs microtask to drain)
      p2p._emit({
        type: 'state_update_received',
        data: { state: { round: 1 }, actionAnimations: [], systemAnimations: [], sequenceId: 1 },
      });

      // MessageQueue.processQueue is async — flush microtasks
      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(2);
      });
    });

    it('triggers resync on too many out-of-order messages', () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      // Send seq 2, 3, 4, 5 (all OOO, threshold is 3)
      for (let seq = 2; seq <= 5; seq++) {
        p2p._emit({
          type: 'state_update_received',
          data: { state: {}, actionAnimations: [], systemAnimations: [], sequenceId: seq },
        });
      }

      expect(p2p.requestFullSync).toHaveBeenCalled();
    });

    it('handles fullSync response from resync', () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      // Simulate a full sync message
      p2p._emit({
        type: 'state_update_received',
        data: { state: { round: 5 }, isFullSync: true, sequenceId: 5 },
      });

      // fullSync goes through resync handler, which applies state via _onResyncResponse
      // The response callback should receive the resynced state
      expect(callback).toHaveBeenCalledWith({
        state: { round: 5 },
        animations: { actionAnimations: [], systemAnimations: [] },
      });
    });
  });

  // --- dispose ---

  describe('dispose', () => {
    it('unsubscribes from p2pManager', () => {
      transport.dispose();
      expect(p2p._getListener()).toBeNull();
    });

    it('clears callbacks', () => {
      const callback = vi.fn();
      transport.onResponse(callback);

      transport.dispose();

      // Emit after dispose — should not deliver
      p2p._emit({
        type: 'state_update_received',
        data: { state: {}, actionAnimations: [], systemAnimations: [], sequenceId: 1 },
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
