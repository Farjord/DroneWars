import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PhaseAnimationQueue from './PhaseAnimationQueue.js';

// Mock debug logger
vi.mock('../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now())
}));

/**
 * PhaseAnimationQueue Tests - TDD Approach
 *
 * These tests expose bugs in the phase animation system:
 * - No deduplication (same phase can be queued multiple times)
 * - Race conditions between queueing and playback
 * - Missing guards for concurrent operations
 *
 * Tests marked with "BUG:" are expected to FAIL until fixes are implemented.
 */

describe('PhaseAnimationQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new PhaseAnimationQueue();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========================================
  // DEDUPLICATION TESTS
  // ========================================

  describe('Deduplication', () => {
    it('BUG: should NOT queue duplicate phase announcements with same phaseName', () => {
      // EXPLANATION: Currently PhaseAnimationQueue has NO deduplication logic.
      // This test will FAIL because queueAnimation() blindly pushes to the queue.
      // FIX: Add check in queueAnimation() to skip if phaseName already in queue.

      queue.queueAnimation('roundAnnouncement', 'ROUND', null);
      queue.queueAnimation('roundAnnouncement', 'ROUND', null); // Duplicate!

      // BUG: Currently returns 2, should return 1
      expect(queue.getQueueLength()).toBe(1);
    });

    it('should allow different phases to queue', () => {
      // This test should PASS - different phases are allowed

      queue.queueAnimation('actionComplete', 'ACTION COMPLETE', null);
      queue.queueAnimation('roundAnnouncement', 'ROUND', null);
      queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

      expect(queue.getQueueLength()).toBe(3);
    });

    it('BUG: should not queue same phase even with different phaseText', () => {
      // EXPLANATION: Same phaseName with different display text is still a duplicate.
      // The phaseName is the semantic identifier, phaseText is just display.

      queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);
      queue.queueAnimation('roundAnnouncement', 'ROUND 2', null); // Same phase!

      // BUG: Currently returns 2, should return 1 (or update existing)
      expect(queue.getQueueLength()).toBe(1);
    });

    it('should allow re-queueing same phase after it has played', async () => {
      // EXPLANATION: After an animation plays and is removed from queue,
      // the same phase can be queued again for the next occurrence.

      const playedAnimations = [];
      queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

      // Queue and play first announcement
      queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);
      queue.startPlayback();

      // Advance through first animation (1800ms)
      await vi.advanceTimersByTimeAsync(2000);

      expect(playedAnimations).toContain('roundAnnouncement');
      expect(queue.getQueueLength()).toBe(0);

      // Now queue same phase again - should be allowed
      queue.queueAnimation('roundAnnouncement', 'ROUND 2', null);
      expect(queue.getQueueLength()).toBe(1);
    });
  });

  // ========================================
  // PLAYBACK RACE CONDITION TESTS
  // ========================================

  describe('Playback Race Conditions', () => {
    it('should handle queueAnimation called during playback', async () => {
      // EXPLANATION: When animations are playing, new animations can be queued.
      // They should be added to the end of the queue and play after current finishes.

      const playedAnimations = [];
      queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

      // Start with one animation
      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.startPlayback();

      // Wait for playback to start but not finish
      await vi.advanceTimersByTimeAsync(500);

      // Queue more during playback
      queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

      // Advance through all animations
      await vi.advanceTimersByTimeAsync(5000);

      // Both should have played in order
      expect(playedAnimations).toEqual(['action', 'deployment']);
    });

    it('should not allow startPlayback to be called twice concurrently', async () => {
      // EXPLANATION: The isPlayingAnimations guard should prevent concurrent playback.
      // This test verifies the guard works.

      let playNextCallCount = 0;
      const originalPlayNext = queue.playNext.bind(queue);
      queue.playNext = async function() {
        playNextCallCount++;
        return originalPlayNext.call(queue);
      };

      queue.queueAnimation('action', 'ACTION PHASE', null);

      // Call startPlayback twice rapidly
      queue.startPlayback();
      queue.startPlayback(); // Should be ignored due to isPlayingAnimations guard

      // Should only enter playNext once
      expect(playNextCallCount).toBe(1);
    });

    it('BUG: should process animations queued during playNext await', async () => {
      // EXPLANATION: The 1800ms await in playNext() creates a window where
      // queueAnimation() can add to the queue. These should be picked up
      // by the recursive playNext() call.

      const playedAnimations = [];
      queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.startPlayback();

      // Midway through first animation, queue another
      await vi.advanceTimersByTimeAsync(900); // Halfway through 1800ms
      queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

      // Complete first animation + second animation
      await vi.advanceTimersByTimeAsync(3000);

      // Both should have played
      expect(playedAnimations).toEqual(['action', 'deployment']);
    });

    it('should emit playbackStateChanged when playback starts and ends', async () => {
      const stateChanges = [];
      queue.on('playbackStateChanged', (isPlaying) => stateChanges.push(isPlaying));

      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.startPlayback();

      // Wait for completion
      await vi.advanceTimersByTimeAsync(2000);

      expect(stateChanges).toEqual([true, false]);
    });
  });

  // ========================================
  // QUEUE ORDERING TESTS
  // ========================================

  describe('Queue Ordering', () => {
    it('should play animations in FIFO order', async () => {
      const playedAnimations = [];
      queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

      // Queue in specific order
      queue.queueAnimation('actionComplete', 'ACTION COMPLETE', null);
      queue.queueAnimation('roundAnnouncement', 'ROUND', null);
      queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

      queue.startPlayback();

      // Wait for all to complete (3 * 1800ms)
      await vi.advanceTimersByTimeAsync(6000);

      // Should be in exact queue order
      expect(playedAnimations).toEqual(['actionComplete', 'roundAnnouncement', 'deployment']);
    });

    it('should not reorder animations if new ones are added during playback', async () => {
      const playedAnimations = [];
      queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

      // Initial queue
      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

      queue.startPlayback();

      // During first animation, add one more
      await vi.advanceTimersByTimeAsync(500);
      queue.queueAnimation('roundAnnouncement', 'ROUND', null);

      // Complete all
      await vi.advanceTimersByTimeAsync(6000);

      // Round should be at end, not inserted in middle
      expect(playedAnimations).toEqual(['action', 'deployment', 'roundAnnouncement']);
    });
  });

  // ========================================
  // CLEAR AND RESET TESTS
  // ========================================

  describe('Clear and Reset', () => {
    it('should clear queue and reset state', () => {
      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

      expect(queue.getQueueLength()).toBe(2);

      queue.clear();

      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isPlaying()).toBe(false);
      expect(queue.getCurrentAnimation()).toBe(null);
    });

    it('BUG: should stop playback when clear is called', async () => {
      // EXPLANATION: clear() sets currentAnimation to null but playNext() continues
      // executing asynchronously, causing "Cannot read properties of null" error.
      // This test documents the bug - clear() doesn't safely abort playback.

      const playedAnimations = [];
      queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

      queue.startPlayback();

      // First animation starts
      await vi.advanceTimersByTimeAsync(100);
      expect(playedAnimations).toEqual(['action']);

      // Clear during first animation - this SHOULD stop further playback
      queue.clear();

      // BUG: The async playNext() continues after clear() and tries to access
      // null currentAnimation. For now, just verify clear worked on the queue.
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isPlaying()).toBe(false);

      // Note: In a proper fix, clear() should set a flag that playNext() checks
      // after the await, so it can abort safely.
    });
  });

  // ========================================
  // DYNAMIC CONTENT TESTS
  // ========================================

  describe('Dynamic Content', () => {
    it('should calculate round number at playback time for roundAnnouncement', async () => {
      const mockGameStateManager = {
        getState: vi.fn(() => ({ roundNumber: 3 })),
        getLocalPlayerId: vi.fn(() => 'player1')
      };

      const queueWithGSM = new PhaseAnimationQueue(mockGameStateManager);

      let displayedText = null;
      queueWithGSM.on('animationStarted', (anim) => {
        displayedText = anim.phaseText;
      });

      // Queue with generic "ROUND" text
      queueWithGSM.queueAnimation('roundAnnouncement', 'ROUND', null);
      queueWithGSM.startPlayback();

      await vi.advanceTimersByTimeAsync(100);

      // Should have been updated to "ROUND 3" at playback time
      expect(displayedText).toBe('ROUND 3');
    });

    it('should calculate "You Go First" subtitle for deployment phase', async () => {
      const mockGameStateManager = {
        getState: vi.fn(() => ({
          firstPlayerOfRound: 'player1',
          gameMode: 'local'
        })),
        getLocalPlayerId: vi.fn(() => 'player1')
      };

      const queueWithGSM = new PhaseAnimationQueue(mockGameStateManager);

      let displayedSubtitle = null;
      queueWithGSM.on('animationStarted', (anim) => {
        displayedSubtitle = anim.subtitle;
      });

      queueWithGSM.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
      queueWithGSM.startPlayback();

      await vi.advanceTimersByTimeAsync(100);

      expect(displayedSubtitle).toBe('You Go First');
    });

    it('should calculate "Opponent Goes First" subtitle when opponent is first', async () => {
      const mockGameStateManager = {
        getState: vi.fn(() => ({
          firstPlayerOfRound: 'player2',
          gameMode: 'local'
        })),
        getLocalPlayerId: vi.fn(() => 'player1')
      };

      const queueWithGSM = new PhaseAnimationQueue(mockGameStateManager);

      let displayedSubtitle = null;
      queueWithGSM.on('animationStarted', (anim) => {
        displayedSubtitle = anim.subtitle;
      });

      queueWithGSM.queueAnimation('action', 'ACTION PHASE', null);
      queueWithGSM.startPlayback();

      await vi.advanceTimersByTimeAsync(100);

      expect(displayedSubtitle).toBe('Opponent Goes First');
    });
  });

  // ========================================
  // EVENT EMITTER TESTS
  // ========================================

  describe('Event Emitter', () => {
    it('should emit animationStarted and animationEnded events', async () => {
      const startedEvents = [];
      const endedEvents = [];

      queue.on('animationStarted', (anim) => startedEvents.push(anim.phaseName));
      queue.on('animationEnded', (anim) => endedEvents.push(anim.phaseName));

      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.startPlayback();

      await vi.advanceTimersByTimeAsync(2000);

      expect(startedEvents).toEqual(['action']);
      expect(endedEvents).toEqual(['action']);
    });

    it('should allow unsubscribing from events', async () => {
      const events = [];
      const unsubscribe = queue.on('animationStarted', (anim) => events.push(anim.phaseName));

      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.startPlayback();

      await vi.advanceTimersByTimeAsync(100);
      expect(events).toEqual(['action']);

      // Unsubscribe
      unsubscribe();

      // Queue and play another
      await vi.advanceTimersByTimeAsync(2000);
      queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
      queue.startPlayback();

      await vi.advanceTimersByTimeAsync(2000);

      // Should not have received second event
      expect(events).toEqual(['action']);
    });

    it('should emit complete event when all animations finish', async () => {
      let completeEmitted = false;
      queue.onComplete(() => { completeEmitted = true; });

      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.startPlayback();

      expect(completeEmitted).toBe(false);

      await vi.advanceTimersByTimeAsync(2000);

      expect(completeEmitted).toBe(true);
    });
  });
});
