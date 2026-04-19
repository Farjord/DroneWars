import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now()),
}));
vi.mock('../../utils/flowVerification.js', () => ({
  flowCheckpoint: vi.fn(),
  resetFlowSeq: vi.fn(),
}));

import AnnouncementQueue from '../AnnouncementQueue.js';
import { PHASE_DISPLAY_DURATION, computeCompoundDuration } from '../../config/announcementTiming.js';

function mkAnnouncement(id, phaseName = 'action') {
  return { id, phaseName, phaseText: phaseName.toUpperCase() + ' PHASE', subtitle: null };
}

describe('AnnouncementQueue', () => {
  let queue;

  beforeEach(() => {
    vi.useFakeTimers();
    queue = new AnnouncementQueue();
    queue.release(); // Tests expect auto-play unless explicitly testing hold/release
  });

  afterEach(() => {
    queue.clear();
    vi.useRealTimers();
  });

  // --- FIFO ordering ---

  it('enqueueAll with 3 items merges into single compound preserving FIFO stage order', async () => {
    const started = [];
    queue.on('animationStarted', (a) => started.push(a));

    queue.enqueueAll([mkAnnouncement('a'), mkAnnouncement('b'), mkAnnouncement('c')]);

    expect(started).toHaveLength(1);
    expect(started[0].compound).toBe(true);
    expect(started[0].stages.map(s => s.phaseText)).toEqual([
      'ACTION PHASE', 'ACTION PHASE', 'ACTION PHASE',
    ]);
  });

  // --- Auto-play on enqueue (single) ---

  it('enqueue single item auto-plays without external start', async () => {
    const started = vi.fn();
    queue.on('animationStarted', started);

    queue.enqueue(mkAnnouncement('solo'));

    // Should already be playing
    expect(queue.isPlaying()).toBe(true);
    expect(started).toHaveBeenCalledWith(expect.objectContaining({ id: 'solo' }));
  });

  // --- Auto-play on enqueueAll ---

  it('enqueueAll batch auto-plays as compound', async () => {
    queue.enqueueAll([mkAnnouncement('x'), mkAnnouncement('y')]);

    expect(queue.isPlaying()).toBe(true);
    expect(queue.getCurrentAnimation().compound).toBe(true);
    expect(queue.getCurrentAnimation().stages).toHaveLength(2);
  });

  // --- Mid-playback enqueue safety ---

  it('items enqueued during playback wait for current to finish', async () => {
    const played = [];
    queue.on('animationStarted', (a) => played.push(a.id));

    queue.enqueue(mkAnnouncement('first'));

    // Mid-playback: add another
    await vi.advanceTimersByTimeAsync(500);
    queue.enqueue(mkAnnouncement('second'));

    // first still playing — second should not have started
    expect(played).toEqual(['first']);

    // Finish first
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION - 500);
    // Now second should start
    expect(played).toEqual(['first', 'second']);

    // Finish second
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    expect(queue.isPlaying()).toBe(false);
  });

  // --- Clear during playback ---

  it('clear() during playback aborts gracefully', async () => {
    const ended = vi.fn();
    const complete = vi.fn();
    queue.on('animationEnded', ended);
    queue.on('complete', complete);

    queue.enqueueAll([mkAnnouncement('a'), mkAnnouncement('b')]);

    await vi.advanceTimersByTimeAsync(500);
    queue.clear();

    expect(queue.isPlaying()).toBe(false);
    expect(queue.getCurrentAnimation()).toBeNull();
    expect(queue.getQueueLength()).toBe(0);

    // Let the pending setTimeout resolve — should not emit animationEnded
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    expect(ended).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  // --- Event emissions ---

  it('emits animationStarted, animationEnded, playbackStateChanged, complete', async () => {
    const events = [];
    queue.on('animationStarted', (a) => events.push(`started:${a.id}`));
    queue.on('animationEnded', (a) => events.push(`ended:${a.id}`));
    queue.on('playbackStateChanged', (v) => events.push(`playing:${v}`));
    queue.on('complete', () => events.push('complete'));

    queue.enqueue(mkAnnouncement('only'));
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);

    expect(events).toEqual([
      'playing:true',
      'started:only',
      'ended:only',
      'playing:false',
      'complete',
    ]);
  });

  // --- Listeners persist across clear ---

  it('listeners survive clear()', async () => {
    const started = vi.fn();
    queue.on('animationStarted', started);

    queue.enqueue(mkAnnouncement('before'));
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    queue.clear();
    queue.release(); // clear() re-holds; release to resume auto-play

    queue.enqueue(mkAnnouncement('after'));
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);

    expect(started).toHaveBeenCalledTimes(2);
    expect(started).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'after' }));
  });

  // --- Hold / Release ---

  it('starts held — enqueue does not auto-play', () => {
    const freshQueue = new AnnouncementQueue();
    const started = vi.fn();
    freshQueue.on('animationStarted', started);

    freshQueue.enqueue(mkAnnouncement('held'));

    expect(freshQueue.isPlaying()).toBe(false);
    expect(started).not.toHaveBeenCalled();
    expect(freshQueue.getQueueLength()).toBe(1);
    freshQueue.clear();
  });

  it('release() starts playback of queued items (merged into compound)', async () => {
    const freshQueue = new AnnouncementQueue();
    const started = [];
    freshQueue.on('animationStarted', (a) => started.push(a));

    freshQueue.enqueueAll([mkAnnouncement('a'), mkAnnouncement('b')]);
    expect(started).toEqual([]);

    freshQueue.release();
    // Both items merged into one compound
    expect(started).toHaveLength(1);
    expect(started[0].compound).toBe(true);
    expect(started[0].stages).toHaveLength(2);

    // 2-stage compound
    await vi.advanceTimersByTimeAsync(computeCompoundDuration(2));
    expect(freshQueue.isPlaying()).toBe(false);
    freshQueue.clear();
  });

  it('hold() prevents future auto-play after release', async () => {
    const freshQueue = new AnnouncementQueue();
    freshQueue.release();

    freshQueue.enqueue(mkAnnouncement('plays'));
    expect(freshQueue.isPlaying()).toBe(true);
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);

    freshQueue.hold();
    const started = vi.fn();
    freshQueue.on('animationStarted', started);

    freshQueue.enqueue(mkAnnouncement('blocked'));
    expect(freshQueue.isPlaying()).toBe(false);
    expect(started).not.toHaveBeenCalled();
    freshQueue.clear();
  });

  it('clear() re-holds the queue', async () => {
    const freshQueue = new AnnouncementQueue();
    freshQueue.release();

    freshQueue.enqueue(mkAnnouncement('x'));
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);

    freshQueue.clear();

    const started = vi.fn();
    freshQueue.on('animationStarted', started);
    freshQueue.enqueue(mkAnnouncement('after-clear'));

    expect(freshQueue.isPlaying()).toBe(false);
    expect(started).not.toHaveBeenCalled();
    freshQueue.clear();
  });

  it('release() is idempotent when already released', async () => {
    const freshQueue = new AnnouncementQueue();
    freshQueue.release();
    freshQueue.release(); // second call should be harmless

    freshQueue.enqueue(mkAnnouncement('ok'));
    expect(freshQueue.isPlaying()).toBe(true);
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    freshQueue.clear();
  });

  // --- onComplete callback ---

  it('onComplete registers a complete listener and returns unsubscribe', async () => {
    const cb = vi.fn();
    const unsub = queue.onComplete(cb);

    queue.enqueue(mkAnnouncement('z'));
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();
    queue.enqueue(mkAnnouncement('z2'));
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  // --- Compound announcement duration ---

  it('compound items use computed duration instead of standard 1800ms', async () => {
    const events = [];
    queue.on('animationStarted', (a) => events.push(`started:${a.id}`));
    queue.on('animationEnded', (a) => events.push(`ended:${a.id}`));

    const compoundItem = {
      id: 'compound-1',
      phaseName: 'compoundDeployToAction',
      compound: true,
      stages: [
        { phaseText: 'YOU PASSED', subtitle: 'Deployment Complete' },
        { phaseText: 'ACTION PHASE', subtitle: 'You Go First' },
      ],
    };

    queue.enqueue(compoundItem);

    // After standard duration (1800ms), compound should still be playing
    await vi.advanceTimersByTimeAsync(1800);
    expect(queue.isPlaying()).toBe(true);
    expect(events).toEqual(['started:compound-1']);

    // After compound duration (3300ms total for 2 stages), should be complete
    await vi.advanceTimersByTimeAsync(computeCompoundDuration(2) - 1800);
    expect(events).toEqual(['started:compound-1', 'ended:compound-1']);
    expect(queue.isPlaying()).toBe(false);
  });

  it('uses announcement duration override when provided', async () => {
    vi.useFakeTimers();
    const queue = new AnnouncementQueue();
    queue.release();

    const endedItems = [];
    queue.on('animationEnded', (item) => endedItems.push(item));

    queue.enqueue({
      id: 'test-1',
      phaseName: 'droneAttack',
      duration: 2800,
      data: {},
    });

    // Should NOT have ended after default 1800ms
    await vi.advanceTimersByTimeAsync(1800);
    expect(endedItems).toHaveLength(0);

    // Should have ended after 2800ms
    await vi.advanceTimersByTimeAsync(1000);
    expect(endedItems).toHaveLength(1);

    vi.useRealTimers();
  });

  it('non-compound items still use standard 1800ms duration', async () => {
    const ended = vi.fn();
    queue.on('animationEnded', ended);

    queue.enqueue(mkAnnouncement('std'));
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);

    expect(ended).toHaveBeenCalledTimes(1);
  });

  // --- waitUntilIdle ---

  describe('waitUntilIdle', () => {
    it('resolves immediately when queue is empty and not playing', async () => {
      await expect(queue.waitUntilIdle()).resolves.toBeUndefined();
    });

    it('waits for current playback to complete', async () => {
      queue.enqueue(mkAnnouncement('a'));

      let resolved = false;
      queue.waitUntilIdle().then(() => { resolved = true; });

      await vi.advanceTimersByTimeAsync(500);
      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION - 500);
      expect(resolved).toBe(true);
    });

    it('waits for compound to complete (multiple items merged)', async () => {
      queue.enqueueAll([mkAnnouncement('a'), mkAnnouncement('b'), mkAnnouncement('c')]);

      let resolved = false;
      queue.waitUntilIdle().then(() => { resolved = true; });

      // 3-stage compound = 4800ms
      await vi.advanceTimersByTimeAsync(3300);
      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(1500); // 4800ms total
      expect(resolved).toBe(true);
    });

    it('resolves immediately when queue is held (even with items)', async () => {
      const freshQueue = new AnnouncementQueue();
      // freshQueue starts held by default — do NOT release

      freshQueue.enqueueAll([mkAnnouncement('a'), mkAnnouncement('b')]);
      expect(freshQueue.getQueueLength()).toBe(2);
      expect(freshQueue.isPlaying()).toBe(false);

      // waitUntilIdle should resolve immediately — nothing can play while held
      await expect(freshQueue.waitUntilIdle()).resolves.toBeUndefined();

      // After release, queued items play as compound
      const started = [];
      freshQueue.on('animationStarted', (a) => started.push(a));
      freshQueue.release();

      // 2-stage compound
      await vi.advanceTimersByTimeAsync(computeCompoundDuration(2));
      expect(started).toHaveLength(1);
      expect(started[0].compound).toBe(true);
      freshQueue.clear();
    });

    it('resolves when clear() is called during wait (deadlock prevention)', async () => {
      queue.enqueue(mkAnnouncement('a'));

      let resolved = false;
      queue.waitUntilIdle().then(() => { resolved = true; });

      await vi.advanceTimersByTimeAsync(500);
      expect(resolved).toBe(false);

      queue.clear();
      await vi.advanceTimersByTimeAsync(0);
      expect(resolved).toBe(true);
    });
  });

  // --- Auto-merge: consecutive items become compound ---

  describe('auto-merge', () => {
    it('merges 2+ queued items into a single compound announcement', async () => {
      const started = [];
      queue.on('animationStarted', (a) => started.push(a));

      queue.enqueueAll([
        mkAnnouncement('a', 'deployment'),
        mkAnnouncement('b', 'action'),
      ]);

      // Should emit one animationStarted with a compound
      expect(started).toHaveLength(1);
      expect(started[0].compound).toBe(true);
      expect(started[0].stages).toHaveLength(2);
      expect(started[0].stages[0].phaseText).toBe('DEPLOYMENT PHASE');
      expect(started[0].stages[1].phaseText).toBe('ACTION PHASE');
    });

    it('single item plays as standard (no compound wrapping)', async () => {
      const started = [];
      queue.on('animationStarted', (a) => started.push(a));

      queue.enqueue(mkAnnouncement('solo', 'action'));

      expect(started).toHaveLength(1);
      expect(started[0].compound).toBeFalsy();
      expect(started[0].phaseText).toBe('ACTION PHASE');
    });

    it('compound duration scales with stage count', async () => {
      const ended = vi.fn();
      queue.on('animationEnded', ended);

      queue.enqueueAll([
        mkAnnouncement('a', 'deployment'),
        mkAnnouncement('b', 'action'),
        mkAnnouncement('c', 'roundEnd'),
      ]);

      // 3-stage compound: 4800ms — at 3300ms (2-stage duration) it should still play
      await vi.advanceTimersByTimeAsync(3300);
      expect(ended).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1500); // 4800ms total
      expect(ended).toHaveBeenCalledTimes(1);
    });

    it('preserves subtitles in compound stages', async () => {
      const started = [];
      queue.on('animationStarted', (a) => started.push(a));

      const withSub = { id: 'ws', phaseName: 'action', phaseText: 'ACTION', subtitle: 'You Go First' };
      const noSub = { id: 'ns', phaseName: 'roundEnd', phaseText: 'END', subtitle: null };

      queue.enqueueAll([withSub, noSub]);

      expect(started[0].stages[0].subtitle).toBe('You Go First');
      expect(started[0].stages[1].subtitle).toBeNull();
    });

    it('preserves phaseName in compound stages', async () => {
      const started = [];
      queue.on('animationStarted', (a) => started.push(a));

      queue.enqueueAll([
        mkAnnouncement('a', 'deployment'),
        mkAnnouncement('b', 'action'),
      ]);

      expect(started[0].stages[0].phaseName).toBe('deployment');
      expect(started[0].stages[1].phaseName).toBe('action');
    });

    it('preserves variant and subtitleVariant in compound stages', async () => {
      const started = [];
      queue.on('animationStarted', (a) => started.push(a));

      const playerPass = { id: 'pp', phaseName: 'playerPass', phaseText: 'YOU PASSED', subtitle: null, variant: 'player', subtitleVariant: null };
      const action = { id: 'ap', phaseName: 'action', phaseText: 'ACTION PHASE', subtitle: 'You Go First', variant: null, subtitleVariant: 'player' };

      queue.enqueueAll([playerPass, action]);

      expect(started[0].stages[0].variant).toBe('player');
      expect(started[0].stages[0].subtitleVariant).toBeNull();
      expect(started[0].stages[1].variant).toBeNull();
      expect(started[0].stages[1].subtitleVariant).toBe('player');
    });

    it('items arriving mid-playback play as new chain after current finishes', async () => {
      const started = [];
      queue.on('animationStarted', (a) => started.push(a));

      queue.enqueue(mkAnnouncement('first', 'deployment'));

      // Mid-playback: add two more
      await vi.advanceTimersByTimeAsync(500);
      queue.enqueueAll([mkAnnouncement('second', 'action'), mkAnnouncement('third', 'roundEnd')]);

      // first still playing solo
      expect(started).toHaveLength(1);
      expect(started[0].compound).toBeFalsy();

      // Finish first (1800ms total)
      await vi.advanceTimersByTimeAsync(1300);

      // second+third should merge into compound
      expect(started).toHaveLength(2);
      expect(started[1].compound).toBe(true);
      expect(started[1].stages).toHaveLength(2);
    });
  });

  // --- Mixed-queue: drone + phase items must not be merged ---

  describe('drone item isolation (no phaseText)', () => {
    function mkDroneAnnouncement(id, phaseName = 'droneAttack') {
      // Mirrors what extractAnnouncements produces for ATTACK_ANNOUNCEMENT / MOVE_ANNOUNCEMENT:
      // no phaseText field, has a duration and data payload.
      return { id, phaseName, duration: 2800, data: {} };
    }

    it('drone item alone plays as a standalone (not wrapped in compound)', () => {
      const started = [];
      queue.on('animationStarted', a => started.push(a));

      queue.enqueue(mkDroneAnnouncement('d1'));

      expect(started).toHaveLength(1);
      expect(started[0].compound).toBeUndefined();
      expect(started[0].id).toBe('d1');
    });

    it('drone item + phase item are NOT merged — each plays standalone in order', async () => {
      const started = [];
      queue.on('animationStarted', a => started.push(a));

      queue.enqueueAll([mkDroneAnnouncement('d1'), mkAnnouncement('p1')]);

      // First item should be the drone item, playing standalone
      expect(started).toHaveLength(1);
      expect(started[0].compound).toBeUndefined();
      expect(started[0].id).toBe('d1');

      // After drone item completes, phase item plays
      await vi.advanceTimersByTimeAsync(2800);
      expect(started).toHaveLength(2);
      expect(started[1].compound).toBeUndefined();
      expect(started[1].id).toBe('p1');
    });

    it('phase item + drone item are NOT merged — each plays standalone in order', async () => {
      const started = [];
      queue.on('animationStarted', a => started.push(a));

      queue.enqueueAll([mkAnnouncement('p1'), mkDroneAnnouncement('d1')]);

      // Mixed queue: first item is phase but not all are mergeable, so plays standalone
      expect(started).toHaveLength(1);
      expect(started[0].compound).toBeUndefined();
      expect(started[0].id).toBe('p1');

      // After phase item completes, drone item plays
      await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
      expect(started).toHaveLength(2);
      expect(started[1].compound).toBeUndefined();
      expect(started[1].id).toBe('d1');
    });

    it('two drone items queued together each play standalone in order', async () => {
      const started = [];
      queue.on('animationStarted', a => started.push(a));

      queue.enqueueAll([mkDroneAnnouncement('d1', 'droneAttack'), mkDroneAnnouncement('d2', 'droneMove')]);

      expect(started).toHaveLength(1);
      expect(started[0].compound).toBeUndefined();
      expect(started[0].id).toBe('d1');

      await vi.advanceTimersByTimeAsync(2800);
      expect(started).toHaveLength(2);
      expect(started[1].compound).toBeUndefined();
      expect(started[1].id).toBe('d2');
    });

    it('two phase items still merge into a compound when no drone items present', () => {
      const started = [];
      queue.on('animationStarted', a => started.push(a));

      queue.enqueueAll([mkAnnouncement('p1'), mkAnnouncement('p2')]);

      expect(started).toHaveLength(1);
      expect(started[0].compound).toBe(true);
      expect(started[0].stages).toHaveLength(2);
    });
  });

  // --- Accessor correctness ---

  it('isPlaying, getCurrentAnimation, getQueueLength return correct values', async () => {
    expect(queue.isPlaying()).toBe(false);
    expect(queue.getCurrentAnimation()).toBeNull();
    expect(queue.getQueueLength()).toBe(0);

    // Single item — plays as standard
    queue.enqueue(mkAnnouncement('a'));

    expect(queue.isPlaying()).toBe(true);
    expect(queue.getCurrentAnimation().id).toBe('a');
    expect(queue.getQueueLength()).toBe(0);

    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    expect(queue.isPlaying()).toBe(false);
    expect(queue.getCurrentAnimation()).toBeNull();
  });
});
