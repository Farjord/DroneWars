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

const PHASE_DISPLAY_DURATION = 1800;

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

  it('plays enqueueAll items in FIFO order', async () => {
    const played = [];
    queue.on('animationStarted', (a) => played.push(a.id));

    queue.enqueueAll([mkAnnouncement('a'), mkAnnouncement('b'), mkAnnouncement('c')]);

    // Advance through all three durations
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION * 3);

    expect(played).toEqual(['a', 'b', 'c']);
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

  it('enqueueAll batch auto-plays', async () => {
    queue.enqueueAll([mkAnnouncement('x'), mkAnnouncement('y')]);

    expect(queue.isPlaying()).toBe(true);
    expect(queue.getCurrentAnimation().id).toBe('x');
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

  it('release() starts playback of queued items', async () => {
    const freshQueue = new AnnouncementQueue();
    const played = [];
    freshQueue.on('animationStarted', (a) => played.push(a.id));

    freshQueue.enqueueAll([mkAnnouncement('a'), mkAnnouncement('b')]);
    expect(played).toEqual([]);

    freshQueue.release();
    expect(played).toEqual(['a']);

    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    expect(played).toEqual(['a', 'b']);

    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
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

  it('compound items use COMPOUND_DISPLAY_DURATION (3600ms) instead of standard 1800ms', async () => {
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

    // After compound duration (3600ms total), should be complete
    await vi.advanceTimersByTimeAsync(1800);
    expect(events).toEqual(['started:compound-1', 'ended:compound-1']);
    expect(queue.isPlaying()).toBe(false);
  });

  it('non-compound items still use standard 1800ms duration', async () => {
    const ended = vi.fn();
    queue.on('animationEnded', ended);

    queue.enqueue(mkAnnouncement('std'));
    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);

    expect(ended).toHaveBeenCalledTimes(1);
  });

  // --- Accessor correctness ---

  it('isPlaying, getCurrentAnimation, getQueueLength return correct values', async () => {
    expect(queue.isPlaying()).toBe(false);
    expect(queue.getCurrentAnimation()).toBeNull();
    expect(queue.getQueueLength()).toBe(0);

    queue.enqueueAll([mkAnnouncement('a'), mkAnnouncement('b')]);

    expect(queue.isPlaying()).toBe(true);
    expect(queue.getCurrentAnimation().id).toBe('a');
    expect(queue.getQueueLength()).toBe(1); // 'a' shifted out, 'b' waiting

    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    expect(queue.getCurrentAnimation().id).toBe('b');
    expect(queue.getQueueLength()).toBe(0);

    await vi.advanceTimersByTimeAsync(PHASE_DISPLAY_DURATION);
    expect(queue.isPlaying()).toBe(false);
    expect(queue.getCurrentAnimation()).toBeNull();
  });
});
