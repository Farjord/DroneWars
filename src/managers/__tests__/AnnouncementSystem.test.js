import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../utils/debugLogger.js', () => ({ debugLog: vi.fn(), timingLog: vi.fn(() => Date.now()) }));
vi.mock('../../utils/flowVerification.js', () => ({ flowCheckpoint: vi.fn(), resetFlowSeq: vi.fn() }));

import AnnouncementQueue from '../AnnouncementQueue.js';

const PHASE_DISPLAY_DURATION = 1800;

function makeAnnouncement(phaseName, phaseText, subtitle = null) {
  return { id: `test-${crypto.randomUUID()}`, phaseName, phaseText, subtitle };
}

/**
 * Simulates a GameClient-style consumer that tracks announcements
 * and exposes the current display state for assertions.
 */
function createMockConsumer(queue) {
  const consumer = {
    currentDisplay: null,
    history: [],
    isShowingAnnouncement: false,
  };
  queue.on('animationStarted', (a) => {
    consumer.currentDisplay = { phaseName: a.phaseName, phaseText: a.phaseText, subtitle: a.subtitle };
    consumer.isShowingAnnouncement = true;
  });
  queue.on('animationEnded', () => {
    consumer.currentDisplay = null;
  });
  queue.on('playbackStateChanged', (playing) => {
    consumer.isShowingAnnouncement = playing;
  });
  queue.on('complete', () => {
    consumer.history.push('[playback-complete]');
  });
  return consumer;
}

describe('AnnouncementSystem (integration with mock consumer)', () => {
  let queue;
  let consumer;

  beforeEach(() => {
    vi.useFakeTimers();
    queue = new AnnouncementQueue();
    queue.release(); // Tests expect auto-play unless explicitly testing hold/release
    consumer = createMockConsumer(queue);
  });

  afterEach(() => {
    queue.clear();
    vi.useRealTimers();
  });

  // =========================================
  // 1. Basic queueing and playback
  // =========================================
  describe('basic queueing and playback', () => {
    it('auto-plays immediately on enqueue and consumer sees it', () => {
      queue.enqueue(makeAnnouncement('ACTION', 'Action Phase'));

      expect(consumer.isShowingAnnouncement).toBe(true);
      expect(consumer.currentDisplay.phaseName).toBe('ACTION');
    });

    it('plays items in FIFO order through the consumer', async () => {
      const order = [];
      queue.on('animationStarted', (a) => order.push(a.phaseName));

      queue.enqueueAll([
        makeAnnouncement('ACTION', 'Action Phase'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase'),
        makeAnnouncement('DEPLOYMENT', 'Deployment Phase'),
      ]);

      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION * 3);

      expect(order).toEqual(['ACTION', 'UPKEEP', 'DEPLOYMENT']);
    });

    it('consumer sees idle state after last item finishes', async () => {
      queue.enqueue(makeAnnouncement('ACTION', 'Action Phase'));
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);

      expect(consumer.isShowingAnnouncement).toBe(false);
      expect(consumer.currentDisplay).toBeNull();
    });
  });

  // =========================================
  // 2. Mid-playback enqueue
  // =========================================
  describe('mid-playback enqueue', () => {
    it('new items wait for current, then play through consumer', async () => {
      const order = [];
      queue.on('animationStarted', (a) => order.push(a.phaseName));

      queue.enqueue(makeAnnouncement('ACTION', 'Action Phase'));

      // Halfway through first animation, enqueue another
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION / 2);
      queue.enqueue(makeAnnouncement('UPKEEP', 'Upkeep Phase'));
      expect(order).toEqual(['ACTION']); // second hasn't started yet

      // Finish both
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION * 2);

      expect(order).toEqual(['ACTION', 'UPKEEP']);
      expect(consumer.isShowingAnnouncement).toBe(false);
    });
  });

  // =========================================
  // 3. Clear during playback
  // =========================================
  describe('clear during playback', () => {
    it('aborts gracefully — no animationEnded after clear', async () => {
      const ended = vi.fn();
      queue.on('animationEnded', ended);

      queue.enqueueAll([
        makeAnnouncement('ACTION', 'Action Phase'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase'),
      ]);

      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION / 2);
      queue.clear();

      expect(consumer.isShowingAnnouncement).toBe(false);

      // Let pending setTimeout resolve — should NOT fire animationEnded
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
      expect(ended).not.toHaveBeenCalled();
    });

    it('allows fresh playback after clear', async () => {
      queue.enqueue(makeAnnouncement('ACTION', 'Action Phase'));
      queue.clear();
      queue.release(); // clear() re-holds; release to resume auto-play

      queue.enqueue(makeAnnouncement('UPKEEP', 'Upkeep Phase'));
      expect(consumer.currentDisplay.phaseName).toBe('UPKEEP');

      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
      expect(consumer.isShowingAnnouncement).toBe(false);
    });
  });

  // =========================================
  // 4. Batch enqueue (enqueueAll)
  // =========================================
  describe('batch enqueue', () => {
    it('plays all items and fires complete once', async () => {
      queue.enqueueAll([
        makeAnnouncement('ROUND', 'Round 2'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase'),
        makeAnnouncement('DEPLOYMENT', 'Deployment Phase'),
      ]);

      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION * 3);

      expect(consumer.history).toEqual(['[playback-complete]']);
      expect(consumer.isShowingAnnouncement).toBe(false);
    });

    it('handles empty array without error', () => {
      queue.enqueueAll([]);
      expect(queue.isPlaying()).toBe(false);
      expect(consumer.isShowingAnnouncement).toBe(false);
    });
  });

  // =========================================
  // 5. Event emission
  // =========================================
  describe('event emission', () => {
    it('emits full lifecycle for each announcement', async () => {
      const events = [];
      queue.on('animationStarted', (a) => events.push(`start:${a.phaseName}`));
      queue.on('animationEnded', (a) => events.push(`end:${a.phaseName}`));
      queue.on('playbackStateChanged', (v) => events.push(`playing:${v}`));
      queue.on('complete', () => events.push('complete'));

      queue.enqueueAll([
        makeAnnouncement('ACTION', 'Action Phase'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase'),
      ]);

      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION * 2);

      expect(events).toEqual([
        'playing:true',
        'start:ACTION',
        'end:ACTION',
        'start:UPKEEP',
        'end:UPKEEP',
        'playing:false',
        'complete',
      ]);
    });

    it('unsubscribe stops further callbacks', async () => {
      const cb = vi.fn();
      const unsub = queue.on('animationStarted', cb);

      queue.enqueue(makeAnnouncement('ACTION', 'Action Phase'));
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
      unsub();

      queue.enqueue(makeAnnouncement('UPKEEP', 'Upkeep Phase'));
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);

      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================
  // 6. End-to-end: full round transition
  // =========================================
  describe('end-to-end round transition', () => {
    it('plays actionComplete -> round -> upkeep -> deployment in sequence', async () => {
      const order = [];
      queue.on('animationStarted', (a) => order.push(a.phaseName));

      // Simulate server sending a batch of round-transition announcements
      queue.enqueueAll([
        makeAnnouncement('ACTION_COMPLETE', 'All Actions Resolved'),
        makeAnnouncement('ROUND', 'Round 3', 'You go first'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase', 'Cards drawn, energy restored'),
        makeAnnouncement('DEPLOYMENT', 'Deployment Phase'),
      ]);

      // Consumer sees first announcement immediately
      expect(consumer.currentDisplay.phaseName).toBe('ACTION_COMPLETE');

      // Subtitle passes through for personalized announcements
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
      expect(consumer.currentDisplay.subtitle).toBe('You go first');

      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION * 3);

      expect(order).toEqual(['ACTION_COMPLETE', 'ROUND', 'UPKEEP', 'DEPLOYMENT']);
      expect(consumer.history).toEqual(['[playback-complete]']);
      expect(consumer.isShowingAnnouncement).toBe(false);
    });
  });
});
