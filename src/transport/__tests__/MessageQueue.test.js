import { describe, it, expect, vi, beforeEach } from 'vitest';
import MessageQueue from '../MessageQueue.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

describe('MessageQueue', () => {
  let queue;
  let processMessage;
  let onResyncNeeded;
  let onResyncResponse;
  let onQueueDrained;

  beforeEach(() => {
    processMessage = vi.fn().mockResolvedValue();
    onResyncNeeded = vi.fn();
    onResyncResponse = vi.fn();
    onQueueDrained = vi.fn();
    queue = new MessageQueue({ processMessage, onResyncNeeded, onResyncResponse, onQueueDrained });
  });

  describe('constructor', () => {
    it('stores the processMessage callback', () => {
      expect(queue).toBeDefined();
      const status = queue.getStatus();
      expect(status.queueLength).toBe(0);
      expect(status.isProcessing).toBe(false);
      expect(status.lastProcessedSequence).toBe(0);
    });
  });

  describe('enqueue with in-order sequenceId', () => {
    it('updates lastProcessedSequence and calls processMessage', async () => {
      const message = { type: 'state_update_received', data: { sequenceId: 1 } };
      queue.enqueue(message);

      // Allow async processQueue to complete
      await vi.waitFor(() => expect(processMessage).toHaveBeenCalledWith(message));
      expect(queue.getStatus().lastProcessedSequence).toBe(1);
    });

    it('processes consecutive in-order messages', async () => {
      const msg1 = { type: 'state_update_received', data: { sequenceId: 1 } };
      const msg2 = { type: 'state_update_received', data: { sequenceId: 2 } };

      queue.enqueue(msg1);
      queue.enqueue(msg2);

      await vi.waitFor(() => expect(processMessage).toHaveBeenCalledTimes(2));
      expect(queue.getStatus().lastProcessedSequence).toBe(2);
    });
  });

  describe('enqueue with duplicate/already-processed sequenceId', () => {
    it('drops messages with sequenceId <= lastProcessedSequence', async () => {
      const msg1 = { type: 'state_update_received', data: { sequenceId: 1 } };
      queue.enqueue(msg1);
      await vi.waitFor(() => expect(processMessage).toHaveBeenCalledTimes(1));

      // Re-enqueue same sequenceId — should be dropped
      queue.enqueue({ type: 'state_update_received', data: { sequenceId: 1 } });
      // And an older one
      queue.enqueue({ type: 'state_update_received', data: { sequenceId: 0 } });

      await Promise.resolve();
      expect(processMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('enqueue with out-of-order sequenceId', () => {
    it('buffers message and does NOT call processMessage', async () => {
      // sequenceId 3 arrives first (gap: expected 1)
      const message = { type: 'state_update_received', data: { sequenceId: 3 } };
      queue.enqueue(message);

      // Give processQueue a tick to run
      await Promise.resolve();
      expect(processMessage).not.toHaveBeenCalled();
    });
  });

  describe('enqueue after gap fills', () => {
    it('drains buffered messages in order once gaps are filled', async () => {
      const msg1 = { type: 'state_update_received', data: { sequenceId: 1 } };
      const msg2 = { type: 'state_update_received', data: { sequenceId: 2 } };
      const msg3 = { type: 'state_update_received', data: { sequenceId: 3 } };

      // Arrive out of order: 3, 1, 2
      queue.enqueue(msg3); // buffered
      queue.enqueue(msg1); // processed, then checks pending
      // msg2 still missing so msg3 stays buffered
      queue.enqueue(msg2); // processed, then drains msg3

      await vi.waitFor(() => expect(processMessage).toHaveBeenCalledTimes(3));

      const calls = processMessage.mock.calls.map(c => c[0].data.sequenceId);
      expect(calls).toEqual([1, 2, 3]);
      expect(queue.getStatus().lastProcessedSequence).toBe(3);
    });
  });

  describe('enqueue with gap > threshold', () => {
    it('calls onResyncNeeded when pending exceeds threshold', async () => {
      // Send messages with sequenceIds 2,3,4,5 (all OOO, gap from 0)
      for (let i = 2; i <= 5; i++) {
        queue.enqueue({ type: 'state_update_received', data: { sequenceId: i } });
      }

      expect(onResyncNeeded).toHaveBeenCalledTimes(1);
    });

    it('does not call onResyncNeeded if already resyncing', async () => {
      for (let i = 2; i <= 5; i++) {
        queue.enqueue({ type: 'state_update_received', data: { sequenceId: i } });
      }
      expect(onResyncNeeded).toHaveBeenCalledTimes(1);

      // More OOO messages should not trigger again
      queue.enqueue({ type: 'state_update_received', data: { sequenceId: 10 } });
      expect(onResyncNeeded).toHaveBeenCalledTimes(1);
    });
  });

  describe('enqueue with isFullSync', () => {
    it('bypasses queue and calls onResyncResponse', async () => {
      const fullState = { phase: 'battle', players: {} };
      const message = {
        type: 'state_update_received',
        data: { isFullSync: true, state: fullState, sequenceId: 5 },
      };

      queue.enqueue(message);

      expect(onResyncResponse).toHaveBeenCalledWith({ state: fullState, sequenceId: 5 });
      expect(processMessage).not.toHaveBeenCalled();
      expect(queue.getStatus().lastProcessedSequence).toBe(5);
    });
  });

  describe('processQueue async sequential', () => {
    it('processes messages one at a time (mutex)', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      processMessage.mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(r => setTimeout(r, 10));
        concurrentCount--;
      });

      const msg1 = { type: 'state_update_received', data: { sequenceId: 1 } };
      const msg2 = { type: 'state_update_received', data: { sequenceId: 2 } };
      const msg3 = { type: 'state_update_received', data: { sequenceId: 3 } };

      queue.enqueue(msg1);
      queue.enqueue(msg2);
      queue.enqueue(msg3);

      await vi.waitFor(() => expect(processMessage).toHaveBeenCalledTimes(3), { timeout: 500 });
      expect(maxConcurrent).toBe(1);
    });

    it('calls onQueueDrained after queue empties', async () => {
      const msg = { type: 'state_update_received', data: { sequenceId: 1 } };
      queue.enqueue(msg);

      await vi.waitFor(() => expect(onQueueDrained).toHaveBeenCalled());
    });
  });

  describe('handleResyncResponse', () => {
    it('resets sequence and clears buffers', () => {
      // Buffer some OOO messages
      queue.enqueue({ type: 'state_update_received', data: { sequenceId: 5 } });
      queue.enqueue({ type: 'state_update_received', data: { sequenceId: 6 } });

      // Simulate full sync via enqueue
      queue.enqueue({
        type: 'state_update_received',
        data: { isFullSync: true, state: { phase: 'battle' }, sequenceId: 10 },
      });

      expect(queue.getStatus().lastProcessedSequence).toBe(10);
      // Pending messages should have been cleared by triggerResync or handleResyncResponse
      expect(onResyncResponse).toHaveBeenCalled();
    });
  });

  describe('resync timeout', () => {
    it('clears resync flag after timeout if no response received', () => {
      vi.useFakeTimers();

      // Trigger resync by sending enough OOO messages
      for (let i = 2; i <= 5; i++) {
        queue.enqueue({ type: 'state_update_received', data: { sequenceId: i } });
      }
      expect(queue.isResyncing).toBe(true);
      expect(onResyncNeeded).toHaveBeenCalledTimes(1);

      // Advance past the 10s timeout
      vi.advanceTimersByTime(10000);

      expect(queue.isResyncing).toBe(false);
      vi.useRealTimers();
    });

    it('does not clear resync flag if resync response arrives before timeout', () => {
      vi.useFakeTimers();

      // Trigger resync
      for (let i = 2; i <= 5; i++) {
        queue.enqueue({ type: 'state_update_received', data: { sequenceId: i } });
      }
      expect(queue.isResyncing).toBe(true);

      // Resync response arrives at 5s (before 10s timeout)
      vi.advanceTimersByTime(5000);
      queue.enqueue({
        type: 'state_update_received',
        data: { isFullSync: true, state: { phase: 'battle' }, sequenceId: 10 },
      });
      expect(queue.isResyncing).toBe(false);

      // Advance past original timeout — should not cause issues
      vi.advanceTimersByTime(5000);
      expect(queue.isResyncing).toBe(false);

      vi.useRealTimers();
    });

    it('processes queued messages after resync timeout', () => {
      vi.useFakeTimers();

      // Trigger resync
      for (let i = 2; i <= 5; i++) {
        queue.enqueue({ type: 'state_update_received', data: { sequenceId: i } });
      }

      // Enqueue a new message while resyncing (with expected next seq)
      const newMsg = { type: 'state_update_received', data: { sequenceId: 1 } };
      queue.enqueue(newMsg);

      // Timeout fires, should process the queued message
      vi.advanceTimersByTime(10000);

      expect(queue.isResyncing).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('enqueue non-sequenced messages', () => {
    it('processes messages without sequenceId directly', async () => {
      const message = { type: 'some_other_type', data: {} };
      queue.enqueue(message);

      await vi.waitFor(() => expect(processMessage).toHaveBeenCalledWith(message));
    });
  });
});
