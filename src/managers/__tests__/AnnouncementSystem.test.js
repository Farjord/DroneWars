import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../utils/debugLogger.js', () => ({ debugLog: vi.fn(), timingLog: vi.fn(() => Date.now()) }));
vi.mock('../../utils/flowVerification.js', () => ({ flowCheckpoint: vi.fn(), resetFlowSeq: vi.fn() }));

import AnnouncementQueue from '../AnnouncementQueue.js';
import { computeCompoundDuration, PHASE_DISPLAY_DURATION } from '../../config/announcementTiming.js';

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
    // Handle both standard and compound announcements
    if (a.compound && a.stages) {
      consumer.currentDisplay = {
        phaseName: a.phaseName,
        compound: true,
        stages: a.stages,
      };
    } else {
      consumer.currentDisplay = { phaseName: a.phaseName, phaseText: a.phaseText, subtitle: a.subtitle };
    }
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
    queue.release();
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

    it('merges multiple enqueued items into compound with stages in FIFO order', async () => {
      queue.enqueueAll([
        makeAnnouncement('ACTION', 'Action Phase'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase'),
        makeAnnouncement('DEPLOYMENT', 'Deployment Phase'),
      ]);

      expect(consumer.currentDisplay.compound).toBe(true);
      expect(consumer.currentDisplay.stages).toHaveLength(3);
      expect(consumer.currentDisplay.stages[0].phaseText).toBe('Action Phase');
      expect(consumer.currentDisplay.stages[1].phaseText).toBe('Upkeep Phase');
      expect(consumer.currentDisplay.stages[2].phaseText).toBe('Deployment Phase');

      // 3-stage compound completes
      await vi.advanceTimersByTimeAsync(computeCompoundDuration(3));
      expect(consumer.isShowingAnnouncement).toBe(false);
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
      const started = [];
      queue.on('animationStarted', (a) => started.push(a));

      queue.enqueue(makeAnnouncement('ACTION', 'Action Phase'));

      // Halfway through first animation, enqueue another
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION / 2);
      queue.enqueue(makeAnnouncement('UPKEEP', 'Upkeep Phase'));
      expect(started).toHaveLength(1); // second hasn't started yet

      // Finish first
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION / 2);
      // Now second should start as standard (solo item)
      expect(started).toHaveLength(2);
      expect(started[1].phaseName).toBe('UPKEEP');

      // Finish second
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
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
  // 4. Batch enqueue (enqueueAll) — auto-merge
  // =========================================
  describe('batch enqueue', () => {
    it('plays batch as compound and fires complete once', async () => {
      queue.enqueueAll([
        makeAnnouncement('ROUND', 'Round 2'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase'),
        makeAnnouncement('DEPLOYMENT', 'Deployment Phase'),
      ]);

      // 3-stage compound duration
      await vi.advanceTimersByTimeAsync(computeCompoundDuration(3));

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
    it('emits full lifecycle for compound announcement', async () => {
      const events = [];
      queue.on('animationStarted', (a) => events.push(`start:${a.compound ? 'compound' : a.phaseName}`));
      queue.on('animationEnded', (a) => events.push(`end:${a.compound ? 'compound' : a.phaseName}`));
      queue.on('playbackStateChanged', (v) => events.push(`playing:${v}`));
      queue.on('complete', () => events.push('complete'));

      queue.enqueueAll([
        makeAnnouncement('ACTION', 'Action Phase'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase'),
      ]);

      // 2-stage compound
      await vi.advanceTimersByTimeAsync(computeCompoundDuration(2));

      expect(events).toEqual([
        'playing:true',
        'start:compound',
        'end:compound',
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
    it('merges round transition batch into compound with all stages', async () => {
      queue.enqueueAll([
        makeAnnouncement('END_OF_ROUND', 'END OF ROUND', 'Action End of Round Triggers'),
        makeAnnouncement('ROUND_TRANSITION', 'TRANSITIONING TO ROUND 3'),
        makeAnnouncement('UPKEEP', 'Upkeep Phase', 'Cards drawn, energy restored'),
        makeAnnouncement('DEPLOYMENT', 'Deployment Phase'),
      ]);

      // Consumer sees compound immediately
      expect(consumer.currentDisplay.compound).toBe(true);
      expect(consumer.currentDisplay.stages).toHaveLength(4);
      expect(consumer.currentDisplay.stages[0].phaseText).toBe('END OF ROUND');
      expect(consumer.currentDisplay.stages[0].subtitle).toBe('Action End of Round Triggers');
      expect(consumer.currentDisplay.stages[1].phaseText).toBe('TRANSITIONING TO ROUND 3');

      // 4-stage compound completes
      await vi.advanceTimersByTimeAsync(computeCompoundDuration(4));

      expect(consumer.history).toEqual(['[playback-complete]']);
      expect(consumer.isShowingAnnouncement).toBe(false);
    });
  });
});
