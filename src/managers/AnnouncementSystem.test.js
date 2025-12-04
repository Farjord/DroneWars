import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PhaseAnimationQueue from './PhaseAnimationQueue.js';

// Mock debug logger
vi.mock('../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now())
}));

/**
 * AnnouncementSystem.test.js - Comprehensive Announcement System Tests
 *
 * Tests for timing, deduplication, and multi-source triggering issues.
 * Covers 80 edge cases across 8 categories to catch announcement bugs.
 *
 * Problem areas:
 * - 10 different startPlayback() call sites
 * - Complex guest pattern detection
 * - Race conditions between queueing and playback
 */

// Helper to create mock GameStateManager
function createMockGameStateManager(initialState = {}) {
  const state = {
    roundNumber: 1,
    turnPhase: 'action',
    gameMode: 'local',
    firstPlayerOfRound: 'player1',
    passInfo: {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    },
    ...initialState
  };

  return {
    getState: vi.fn(() => ({ ...state })),
    getLocalPlayerId: vi.fn(() => 'player1'),
    get: vi.fn((key) => state[key]),
    _setState: (newState) => Object.assign(state, newState),
    _getInternalState: () => state
  };
}

// ========================================
// CATEGORY 1: DEDUPLICATION EDGE CASES
// ========================================

describe('Category 1: Deduplication Edge Cases', () => {
  let queue;

  beforeEach(() => {
    queue = new PhaseAnimationQueue();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ANN-D1: Same phaseName queued from ActionProcessor + GuestMessageQueueService should dedup', () => {
    // Simulates both sources queueing the same phase
    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null); // From ActionProcessor
    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null); // From GuestMessageQueueService

    expect(queue.getQueueLength()).toBe(1);
  });

  it('ANN-D2: playerPass queued from multiple detection paths should dedup', () => {
    // GameFlowManager:164 (state change detection)
    queue.queueAnimation('playerPass', 'OPPONENT PASSED', null);
    // GameFlowManager:256 (handleActionCompletion)
    queue.queueAnimation('playerPass', 'OPPONENT PASSED', null);
    // ActionProcessor:2716
    queue.queueAnimation('playerPass', 'OPPONENT PASSED', null);

    expect(queue.getQueueLength()).toBe(1);
  });

  it('ANN-D3: roundAnnouncement queued twice with different round numbers updates text', () => {
    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);
    queue.queueAnimation('roundAnnouncement', 'ROUND 2', null); // Should update, not add

    expect(queue.getQueueLength()).toBe(1);

    // Verify the text was updated to the latest
    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim));
    queue.startPlayback();

    expect(animations[0].phaseText).toBe('ROUND 2');
  });

  it('ANN-D4: Dedup should update phaseText when same phaseName re-queued', () => {
    queue.queueAnimation('deployment', 'DEPLOYMENT', null);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null); // Updated text

    expect(queue.getQueueLength()).toBe(1);

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim));
    queue.startPlayback();

    expect(animations[0].phaseText).toBe('DEPLOYMENT PHASE');
  });

  it('ANN-D5: Dedup should preserve subtitle if new queue has null subtitle', () => {
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', 'You Go First');
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null); // null subtitle should NOT overwrite

    expect(queue.getQueueLength()).toBe(1);

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim));
    queue.startPlayback();

    expect(animations[0].subtitle).toBe('You Go First');
  });

  it('ANN-D6: Different phaseNames should NOT dedup (roundAnnouncement vs action)', () => {
    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);
    queue.queueAnimation('action', 'ACTION PHASE', null);

    expect(queue.getQueueLength()).toBe(2);
  });

  it('ANN-D7: Queue same phase after it played should work (not dedup against played)', async () => {
    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);
    queue.startPlayback();

    // Wait for first animation to complete
    await vi.advanceTimersByTimeAsync(2000);

    expect(queue.getQueueLength()).toBe(0);

    // Queue same phase again - should be allowed
    queue.queueAnimation('roundAnnouncement', 'ROUND 2', null);
    expect(queue.getQueueLength()).toBe(1);
  });

  it('ANN-D8: Rapid-fire same phase 10x should result in queue length 1', () => {
    for (let i = 0; i < 10; i++) {
      queue.queueAnimation('action', `ACTION ${i}`, null);
    }

    expect(queue.getQueueLength()).toBe(1);
  });

  it('ANN-D9: Dedup during active playback (queue while playing same phase)', async () => {
    // BUG TEST: Same phase queued while already playing should NOT add to queue
    // This prevents the same announcement from playing twice in a row
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
    queue.startPlayback();

    // During playback, queue same phase
    await vi.advanceTimersByTimeAsync(500);
    queue.queueAnimation('deployment', 'DEPLOYMENT UPDATED', null);

    // Should NOT add to queue - dedup must check against currentAnimation too
    expect(queue.getQueueLength()).toBe(0);
  });

  it('ANN-D10: Dedup with different subtitles preserves non-null subtitle', () => {
    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.queueAnimation('action', 'ACTION PHASE', 'Opponent Goes First');

    expect(queue.getQueueLength()).toBe(1);

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim));
    queue.startPlayback();

    expect(animations[0].subtitle).toBe('Opponent Goes First');
  });
});

// ========================================
// CATEGORY 2: MULTIPLE startPlayback() RACE CONDITIONS
// ========================================

describe('Category 2: Multiple startPlayback() Race Conditions', () => {
  let queue;

  beforeEach(() => {
    queue = new PhaseAnimationQueue();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ANN-S1: startPlayback() called 10x in same tick - only first should execute', () => {
    let playbackStartCount = 0;
    queue.on('playbackStateChanged', (isPlaying) => {
      if (isPlaying) playbackStartCount++;
    });

    queue.queueAnimation('action', 'ACTION PHASE', null);

    // Call startPlayback 10 times synchronously
    for (let i = 0; i < 10; i++) {
      queue.startPlayback();
    }

    // Should only start playback once
    expect(playbackStartCount).toBe(1);
  });

  it('ANN-S2: startPlayback() from different sources within 50ms window', async () => {
    let playbackStartCount = 0;
    queue.on('playbackStateChanged', (isPlaying) => {
      if (isPlaying) playbackStartCount++;
    });

    queue.queueAnimation('action', 'ACTION PHASE', null);

    // Simulate calls from different sources with slight delays
    queue.startPlayback(); // GameFlowManager immediate
    await vi.advanceTimersByTimeAsync(25);
    queue.startPlayback(); // Another source at 25ms
    await vi.advanceTimersByTimeAsync(25);
    queue.startPlayback(); // GuestMessageQueueService at 50ms

    expect(playbackStartCount).toBe(1);
  });

  it('ANN-S3: startPlayback() after 50ms delay vs immediate call', async () => {
    const playedAnimations = [];
    queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

    queue.queueAnimation('action', 'ACTION PHASE', null);

    // Immediate call
    queue.startPlayback();

    // Delayed call (like GuestMessageQueueService does)
    setTimeout(() => queue.startPlayback(), 50);
    await vi.advanceTimersByTimeAsync(50);

    // Should still only play once
    await vi.advanceTimersByTimeAsync(2000);
    expect(playedAnimations).toEqual(['action']);
  });

  it('ANN-S4: startPlayback() during animation playback (isPlaying guard)', async () => {
    let startCalls = 0;
    const originalStartPlayback = queue.startPlayback.bind(queue);
    queue.startPlayback = function() {
      startCalls++;
      return originalStartPlayback();
    };

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    // Call again while playing
    await vi.advanceTimersByTimeAsync(500);
    queue.startPlayback();
    queue.startPlayback();

    // All calls go through, but isPlaying guard prevents re-entry
    expect(startCalls).toBe(3);
    expect(queue.isPlaying()).toBe(true);
  });

  it('ANN-S5: startPlayback() when queue empty should no-op', () => {
    let playbackStarted = false;
    queue.on('playbackStateChanged', () => { playbackStarted = true; });

    queue.startPlayback();

    expect(playbackStarted).toBe(false);
    expect(queue.isPlaying()).toBe(false);
  });

  it('ANN-S6: startPlayback() after clear() should no-op', () => {
    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.clear();

    let playbackStarted = false;
    queue.on('playbackStateChanged', () => { playbackStarted = true; });

    queue.startPlayback();

    expect(playbackStarted).toBe(false);
  });

  it('ANN-S7: startPlayback() interleaved with queueAnimation', async () => {
    const playedAnimations = [];
    queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
    queue.startPlayback(); // Should be no-op due to isPlaying

    await vi.advanceTimersByTimeAsync(4000);

    expect(playedAnimations).toEqual(['action', 'deployment']);
  });

  it('ANN-S8: Multiple modules calling startPlayback() simultaneously', () => {
    let playbackEvents = 0;
    queue.on('playbackStateChanged', (isPlaying) => {
      if (isPlaying) playbackEvents++;
    });

    queue.queueAnimation('action', 'ACTION PHASE', null);

    // Simulate simultaneous calls from different modules
    const gameFlowManager = () => queue.startPlayback();
    const guestMessageQueue = () => queue.startPlayback();
    const actionProcessor = () => queue.startPlayback();

    gameFlowManager();
    guestMessageQueue();
    actionProcessor();

    expect(playbackEvents).toBe(1);
  });

  it('ANN-S9: startPlayback() from GameFlowManager vs GuestMessageQueueService timing', async () => {
    const playedAnimations = [];
    queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    // GameFlowManager calls immediately (line 599)
    queue.startPlayback();

    // GuestMessageQueueService calls after 50ms delay (line 603-605)
    setTimeout(() => {
      queue.queueAnimation('action', 'ACTION PHASE', null);
      queue.startPlayback();
    }, 50);

    await vi.advanceTimersByTimeAsync(4000);

    // Both should play in order
    expect(playedAnimations).toEqual(['deployment', 'action']);
  });

  it('ANN-S10: startPlayback() timing relative to React render cycle', async () => {
    // Simulates the 50ms delay meant to wait for React render
    const playedAnimations = [];
    queue.on('animationStarted', (anim) => playedAnimations.push(anim.phaseName));

    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);

    // Simulate delayed startPlayback (as in GuestMessageQueueService)
    setTimeout(() => {
      queue.startPlayback();
    }, 50);

    // Before 50ms - not playing yet
    await vi.advanceTimersByTimeAsync(25);
    expect(queue.isPlaying()).toBe(false);

    // After 50ms - should be playing
    await vi.advanceTimersByTimeAsync(30);
    expect(queue.isPlaying()).toBe(true);

    await vi.advanceTimersByTimeAsync(2000);
    expect(playedAnimations).toEqual(['roundAnnouncement']);
  });
});

// ========================================
// CATEGORY 3: GUEST PATTERN DETECTION
// ========================================

describe('Category 3: Guest Pattern Detection', () => {
  let queue;
  let mockGameStateManager;

  beforeEach(() => {
    mockGameStateManager = createMockGameStateManager({
      gameMode: 'guest',
      turnPhase: 'action'
    });
    queue = new PhaseAnimationQueue(mockGameStateManager);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to simulate guest pattern detection logic
  function simulateGuestPatternDetection(guestPhase, hostPhase, passInfo = {}) {
    const phaseTextMap = {
      roundAnnouncement: 'ROUND',
      roundInitialization: 'UPKEEP',
      mandatoryDiscard: 'MANDATORY DISCARD PHASE',
      optionalDiscard: 'OPTIONAL DISCARD PHASE',
      allocateShields: 'ALLOCATE SHIELDS',
      mandatoryDroneRemoval: 'REMOVE EXCESS DRONES',
      deployment: 'DEPLOYMENT PHASE',
      deploymentComplete: 'DEPLOYMENT COMPLETE',
      action: 'ACTION PHASE',
      actionComplete: 'ACTION PHASE COMPLETE'
    };

    const localPlayerId = 'player2'; // Guest is player2
    const localPassKey = `${localPlayerId}Passed`;

    if (guestPhase !== hostPhase) {
      // PATTERN 1: action → roundInitialization
      if (guestPhase === 'action' && hostPhase === 'roundInitialization') {
        if (passInfo[localPassKey] && passInfo.firstPasser === localPlayerId) {
          queue.queueAnimation('playerPass', 'OPPONENT PASSED', null);
        }
        queue.queueAnimation('actionComplete', 'ACTION PHASE COMPLETE', 'Transitioning to Next Round');
        queue.queueAnimation('roundAnnouncement', 'ROUND', null);
      }
      // PATTERN 2: placement → roundInitialization
      else if (guestPhase === 'placement' && hostPhase === 'roundInitialization') {
        queue.queueAnimation('roundAnnouncement', 'ROUND', null);
      }
      // PATTERN 2.5: deployment → action
      else if (guestPhase === 'deployment' && hostPhase === 'action') {
        if (passInfo[localPassKey] && passInfo.firstPasser === localPlayerId) {
          queue.queueAnimation('playerPass', 'OPPONENT PASSED', null);
        }
        queue.queueAnimation('deploymentComplete', 'DEPLOYMENT COMPLETE', null);
      }

      // PATTERN 3: Queue actual phase
      if (phaseTextMap[hostPhase]) {
        const subtitle = hostPhase === 'roundInitialization'
          ? 'Drawing Cards, Gaining Energy, Resetting Drones...'
          : null;
        queue.queueAnimation(hostPhase, phaseTextMap[hostPhase], subtitle);
      }
    }
  }

  it('ANN-G1: PATTERN 1 - action→roundInit queues correct sequence', () => {
    simulateGuestPatternDetection('action', 'roundInitialization', {
      player2Passed: true,
      firstPasser: 'player1' // Opponent passed first, so no OPPONENT PASSED
    });

    // Should queue: actionComplete, roundAnnouncement, roundInitialization
    expect(queue.getQueueLength()).toBe(3);
  });

  it('ANN-G2: PATTERN 1 - firstPasser logic for OPPONENT PASSED', () => {
    simulateGuestPatternDetection('action', 'roundInitialization', {
      player2Passed: true,
      firstPasser: 'player2' // Guest passed first, so queue OPPONENT PASSED
    });

    // Should queue: playerPass, actionComplete, roundAnnouncement, roundInitialization
    expect(queue.getQueueLength()).toBe(4);

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    queue.startPlayback();

    expect(animations[0]).toBe('playerPass');
  });

  it('ANN-G3: PATTERN 1 - skip OPPONENT PASSED if opponent passed first', () => {
    simulateGuestPatternDetection('action', 'roundInitialization', {
      player2Passed: true,
      firstPasser: 'player1' // Opponent (host) passed first
    });

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    queue.startPlayback();

    // First animation should NOT be playerPass
    expect(animations[0]).not.toBe('playerPass');
  });

  it('ANN-G4: PATTERN 2 - placement→roundInit queues ROUND only', () => {
    simulateGuestPatternDetection('placement', 'roundInitialization', {});

    // Should queue: roundAnnouncement, roundInitialization
    expect(queue.getQueueLength()).toBe(2);

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    queue.startPlayback();

    expect(animations[0]).toBe('roundAnnouncement');
  });

  it('ANN-G5: PATTERN 2.5 - deployment→action queues deploymentComplete', () => {
    simulateGuestPatternDetection('deployment', 'action', {
      player2Passed: true,
      firstPasser: 'player1'
    });

    // Should queue: deploymentComplete, action
    expect(queue.getQueueLength()).toBe(2);

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    queue.startPlayback();

    expect(animations[0]).toBe('deploymentComplete');
  });

  it('ANN-G6: PATTERN 2.5 - deployment→action with firstPasser check', () => {
    simulateGuestPatternDetection('deployment', 'action', {
      player2Passed: true,
      firstPasser: 'player2' // Guest passed first
    });

    // Should queue: playerPass, deploymentComplete, action
    expect(queue.getQueueLength()).toBe(3);

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    queue.startPlayback();

    expect(animations[0]).toBe('playerPass');
  });

  it('ANN-G7: PATTERN 3 - generic phase queues correct announcement', () => {
    simulateGuestPatternDetection('mandatoryDiscard', 'optionalDiscard', {});

    // Should queue: optionalDiscard
    expect(queue.getQueueLength()).toBe(1);

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseText));
    queue.startPlayback();

    expect(animations[0]).toBe('OPTIONAL DISCARD PHASE');
  });

  it('ANN-G8: Pattern overlap - action→roundInit should not double-queue roundInit', () => {
    simulateGuestPatternDetection('action', 'roundInitialization', {});

    // Check roundInitialization appears only once despite PATTERN 1 + PATTERN 3
    const queuedPhases = [];
    while (queue.getQueueLength() > 0) {
      const anim = queue.queue[0];
      queuedPhases.push(anim.phaseName);
      queue.queue.shift();
    }

    const roundInitCount = queuedPhases.filter(p => p === 'roundInitialization').length;
    expect(roundInitCount).toBe(1);
  });

  it('ANN-G9: Pattern with stale passInfo state', () => {
    // Simulate stale state where passInfo hasn't updated yet
    simulateGuestPatternDetection('action', 'roundInitialization', {
      player2Passed: false, // Stale - hasn't updated yet
      firstPasser: null
    });

    // Should NOT queue OPPONENT PASSED
    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    queue.startPlayback();

    expect(animations).not.toContain('playerPass');
  });

  it('ANN-G10: Pattern detection when guestPhase === hostPhase (no queue)', () => {
    // Same phase - should not queue anything
    const initialLength = queue.getQueueLength();
    simulateGuestPatternDetection('action', 'action', {});

    expect(queue.getQueueLength()).toBe(initialLength);
  });

  it('ANN-G11: Pattern detection with undefined hostPhase', () => {
    // Should not crash with undefined hostPhase
    expect(() => {
      simulateGuestPatternDetection('action', undefined, {});
    }).not.toThrow();
  });

  it('ANN-G12: Pattern detection with unknown phase (not in phaseTextMap)', () => {
    simulateGuestPatternDetection('action', 'unknownPhase', {});

    // Should not queue unknown phase
    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    if (queue.getQueueLength() > 0) {
      queue.startPlayback();
    }

    expect(animations).not.toContain('unknownPhase');
  });

  it('ANN-G13: Pattern detection order - pseudo-phases before actual phase', async () => {
    simulateGuestPatternDetection('action', 'roundInitialization', {
      player2Passed: true,
      firstPasser: 'player2'
    });

    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    queue.startPlayback();

    // Must await all animations (4 animations × 1800ms each)
    await vi.advanceTimersByTimeAsync(8000);

    // Order should be: playerPass, actionComplete, roundAnnouncement, roundInitialization
    expect(animations[0]).toBe('playerPass');
    expect(animations[1]).toBe('actionComplete');
    expect(animations[2]).toBe('roundAnnouncement');
    expect(animations[3]).toBe('roundInitialization');
  });

  it('ANN-G14: Guest receives rapid state updates (3 phases in 100ms)', async () => {
    // Simulate rapid state updates
    simulateGuestPatternDetection('action', 'roundInitialization', {});
    await vi.advanceTimersByTimeAsync(33);

    // Clear and simulate next transition (dedup should prevent issues)
    simulateGuestPatternDetection('roundInitialization', 'mandatoryDiscard', {});
    await vi.advanceTimersByTimeAsync(33);

    simulateGuestPatternDetection('mandatoryDiscard', 'optionalDiscard', {});
    await vi.advanceTimersByTimeAsync(34);

    // All phases should be queued (with dedup preventing duplicates)
    expect(queue.getQueueLength()).toBeGreaterThan(0);
  });

  it('ANN-G15: Guest state out of sync with host (guestPhase !== expected)', () => {
    // Guest thinks it's in action, but host says deployment
    // This is a desync scenario
    simulateGuestPatternDetection('action', 'deployment', {});

    // Should still queue deployment (PATTERN 3)
    const animations = [];
    queue.on('animationStarted', (anim) => animations.push(anim.phaseName));
    queue.startPlayback();

    expect(animations).toContain('deployment');
  });
});

// ========================================
// CATEGORY 4: HOST/GUEST PARITY
// ========================================

describe('Category 4: Host/Guest Parity', () => {
  let hostQueue;
  let guestQueue;
  let hostGSM;
  let guestGSM;

  beforeEach(() => {
    hostGSM = createMockGameStateManager({ gameMode: 'host' });
    guestGSM = createMockGameStateManager({ gameMode: 'guest' });
    guestGSM.getLocalPlayerId = vi.fn(() => 'player2');

    hostQueue = new PhaseAnimationQueue(hostGSM);
    guestQueue = new PhaseAnimationQueue(guestGSM);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to simulate host announcement (ActionProcessor style)
  function hostQueuePhase(phase, subtitle = null) {
    const phaseTextMap = {
      roundAnnouncement: 'ROUND',
      roundInitialization: 'UPKEEP',
      deployment: 'DEPLOYMENT PHASE',
      action: 'ACTION PHASE',
      actionComplete: 'ACTION PHASE COMPLETE'
    };
    hostQueue.queueAnimation(phase, phaseTextMap[phase] || phase, subtitle);
  }

  // Helper to simulate guest pattern detection
  function guestQueueFromPattern(guestPhase, hostPhase, passInfo = {}) {
    const phaseTextMap = {
      roundAnnouncement: 'ROUND',
      roundInitialization: 'UPKEEP',
      deployment: 'DEPLOYMENT PHASE',
      action: 'ACTION PHASE',
      actionComplete: 'ACTION PHASE COMPLETE'
    };

    if (guestPhase === 'action' && hostPhase === 'roundInitialization') {
      guestQueue.queueAnimation('actionComplete', 'ACTION PHASE COMPLETE', 'Transitioning to Next Round');
      guestQueue.queueAnimation('roundAnnouncement', 'ROUND', null);
    }
    if (phaseTextMap[hostPhase]) {
      guestQueue.queueAnimation(hostPhase, phaseTextMap[hostPhase], null);
    }
  }

  it('ANN-P1: Round transition announcements match between host and guest', async () => {
    // Host queues
    hostQueuePhase('actionComplete');
    hostQueuePhase('roundAnnouncement');
    hostQueuePhase('roundInitialization');

    // Guest detects pattern
    guestQueueFromPattern('action', 'roundInitialization');

    // Compare queue contents
    expect(hostQueue.getQueueLength()).toBe(guestQueue.getQueueLength());
  });

  it('ANN-P2: Deployment→action sequence identical', async () => {
    const hostAnimations = [];
    const guestAnimations = [];

    hostQueue.on('animationStarted', (a) => hostAnimations.push(a.phaseName));
    guestQueue.on('animationStarted', (a) => guestAnimations.push(a.phaseName));

    // Host
    hostQueue.queueAnimation('deploymentComplete', 'DEPLOYMENT COMPLETE', null);
    hostQueue.queueAnimation('action', 'ACTION PHASE', null);

    // Guest (PATTERN 2.5)
    guestQueue.queueAnimation('deploymentComplete', 'DEPLOYMENT COMPLETE', null);
    guestQueue.queueAnimation('action', 'ACTION PHASE', null);

    hostQueue.startPlayback();
    guestQueue.startPlayback();

    await vi.advanceTimersByTimeAsync(5000);

    expect(hostAnimations).toEqual(guestAnimations);
  });

  it('ANN-P3: Pass announcements show for correct player', async () => {
    // Host sees "YOU PASSED"
    hostQueue.queueAnimation('playerPass', 'YOU PASSED', null);

    // Guest sees "OPPONENT PASSED"
    guestQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null);

    const hostAnim = [];
    const guestAnim = [];
    hostQueue.on('animationStarted', (a) => hostAnim.push(a.phaseText));
    guestQueue.on('animationStarted', (a) => guestAnim.push(a.phaseText));

    hostQueue.startPlayback();
    guestQueue.startPlayback();

    await vi.advanceTimersByTimeAsync(2000);

    expect(hostAnim[0]).toBe('YOU PASSED');
    expect(guestAnim[0]).toBe('OPPONENT PASSED');
  });

  it('ANN-P4: Simultaneous phase announcements identical', () => {
    const phases = ['mandatoryDiscard', 'optionalDiscard', 'allocateShields'];

    phases.forEach(phase => {
      hostQueue.queueAnimation(phase, phase.toUpperCase(), null);
      guestQueue.queueAnimation(phase, phase.toUpperCase(), null);
    });

    expect(hostQueue.getQueueLength()).toBe(guestQueue.getQueueLength());
  });

  it('ANN-P5: Sequential phase announcements identical', () => {
    hostQueue.queueAnimation('deployment', 'DEPLOYMENT PHASE', 'You Go First');
    guestQueue.queueAnimation('deployment', 'DEPLOYMENT PHASE', 'Opponent Goes First');

    expect(hostQueue.getQueueLength()).toBe(guestQueue.getQueueLength());
  });

  it('ANN-P6: Round number calculation matches', async () => {
    hostGSM._setState({ roundNumber: 3 });
    guestGSM._setState({ roundNumber: 3 });

    hostQueue.queueAnimation('roundAnnouncement', 'ROUND', null);
    guestQueue.queueAnimation('roundAnnouncement', 'ROUND', null);

    let hostRound, guestRound;
    hostQueue.on('animationStarted', (a) => { hostRound = a.phaseText; });
    guestQueue.on('animationStarted', (a) => { guestRound = a.phaseText; });

    hostQueue.startPlayback();
    guestQueue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(hostRound).toBe('ROUND 3');
    expect(guestRound).toBe('ROUND 3');
  });

  it('ANN-P7: "You Go First" vs "Opponent Goes First" correct for each player', async () => {
    hostGSM._setState({ firstPlayerOfRound: 'player1' });
    guestGSM._setState({ firstPlayerOfRound: 'player1' });

    hostQueue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
    guestQueue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    let hostSub, guestSub;
    hostQueue.on('animationStarted', (a) => { hostSub = a.subtitle; });
    guestQueue.on('animationStarted', (a) => { guestSub = a.subtitle; });

    hostQueue.startPlayback();
    guestQueue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    // Host is player1, firstPlayer is player1 → "You Go First"
    expect(hostSub).toBe('You Go First');
    // Guest is player2, firstPlayer is player1 → "Opponent Goes First"
    expect(guestSub).toBe('Opponent Goes First');
  });

  it('ANN-P8: actionComplete + roundAnnouncement order matches', async () => {
    const hostOrder = [];
    const guestOrder = [];

    hostQueue.on('animationStarted', (a) => hostOrder.push(a.phaseName));
    guestQueue.on('animationStarted', (a) => guestOrder.push(a.phaseName));

    // Both queue in same order
    hostQueue.queueAnimation('actionComplete', 'ACTION PHASE COMPLETE', null);
    hostQueue.queueAnimation('roundAnnouncement', 'ROUND', null);

    guestQueue.queueAnimation('actionComplete', 'ACTION PHASE COMPLETE', null);
    guestQueue.queueAnimation('roundAnnouncement', 'ROUND', null);

    hostQueue.startPlayback();
    guestQueue.startPlayback();

    await vi.advanceTimersByTimeAsync(5000);

    expect(hostOrder).toEqual(guestOrder);
  });

  it('ANN-P9: UPKEEP subtitle matches', async () => {
    const expectedSubtitle = 'Drawing Cards, Gaining Energy, Resetting Drones...';

    hostQueue.queueAnimation('roundInitialization', 'UPKEEP', expectedSubtitle);
    guestQueue.queueAnimation('roundInitialization', 'UPKEEP', expectedSubtitle);

    let hostSub, guestSub;
    hostQueue.on('animationStarted', (a) => { hostSub = a.subtitle; });
    guestQueue.on('animationStarted', (a) => { guestSub = a.subtitle; });

    hostQueue.startPlayback();
    guestQueue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(hostSub).toBe(guestSub);
    expect(hostSub).toBe(expectedSubtitle);
  });

  it('ANN-P10: No extra announcements on guest vs host', () => {
    // Queue same sequence on both
    const phases = ['roundAnnouncement', 'roundInitialization', 'mandatoryDiscard', 'deployment'];

    phases.forEach(phase => {
      hostQueue.queueAnimation(phase, phase, null);
      guestQueue.queueAnimation(phase, phase, null);
    });

    expect(hostQueue.getQueueLength()).toBe(guestQueue.getQueueLength());
    expect(hostQueue.getQueueLength()).toBe(phases.length);
  });
});

// ========================================
// CATEGORY 5: DYNAMIC CONTENT TIMING
// ========================================

describe('Category 5: Dynamic Content Timing', () => {
  let queue;
  let mockGSM;

  beforeEach(() => {
    mockGSM = createMockGameStateManager();
    queue = new PhaseAnimationQueue(mockGSM);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ANN-T1: Round number calculated at playback, not queue time', async () => {
    mockGSM._setState({ roundNumber: 1 });
    queue.queueAnimation('roundAnnouncement', 'ROUND', null);

    // Change round number before playback
    mockGSM._setState({ roundNumber: 5 });

    let displayedText;
    queue.on('animationStarted', (a) => { displayedText = a.phaseText; });
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(displayedText).toBe('ROUND 5');
  });

  it('ANN-T2: Subtitle calculated at playback for deployment phase', async () => {
    mockGSM._setState({ firstPlayerOfRound: 'player2' });
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    // Change first player before playback
    mockGSM._setState({ firstPlayerOfRound: 'player1' });

    let subtitle;
    queue.on('animationStarted', (a) => { subtitle = a.subtitle; });
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(subtitle).toBe('You Go First'); // player1 is local player
  });

  it('ANN-T3: Subtitle calculated at playback for action phase', async () => {
    mockGSM._setState({ firstPlayerOfRound: 'player1' });
    queue.queueAnimation('action', 'ACTION PHASE', null);

    let subtitle;
    queue.on('animationStarted', (a) => { subtitle = a.subtitle; });
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(subtitle).toBe('You Go First');
  });

  it('ANN-T4: State changes between queue and playback affect subtitle', async () => {
    mockGSM._setState({ firstPlayerOfRound: 'player1' });
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    // Queue another animation
    queue.queueAnimation('action', 'ACTION PHASE', null);

    // Change state
    mockGSM._setState({ firstPlayerOfRound: 'player2' });

    const subtitles = [];
    queue.on('animationStarted', (a) => { subtitles.push(a.subtitle); });
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(4000);

    // Both should use the updated state (player2 first = opponent goes first)
    expect(subtitles[0]).toBe('Opponent Goes First');
    expect(subtitles[1]).toBe('Opponent Goes First');
  });

  it('ANN-T5: firstPlayerOfRound changes before playback', async () => {
    mockGSM._setState({ firstPlayerOfRound: null });
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    // Set first player after queueing
    mockGSM._setState({ firstPlayerOfRound: 'player1' });

    let subtitle;
    queue.on('animationStarted', (a) => { subtitle = a.subtitle; });
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(subtitle).toBe('You Go First');
  });

  it('ANN-T6: localPlayerId detection for "You Go First"', async () => {
    mockGSM._setState({ firstPlayerOfRound: 'player1' });
    mockGSM.getLocalPlayerId = vi.fn(() => 'player1');

    queue.queueAnimation('action', 'ACTION PHASE', null);

    let subtitle;
    queue.on('animationStarted', (a) => { subtitle = a.subtitle; });
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(subtitle).toBe('You Go First');
  });

  it('ANN-T7: gameMode detection for subtitle logic', async () => {
    mockGSM._setState({
      gameMode: 'guest',
      firstPlayerOfRound: 'player1'
    });
    mockGSM.getLocalPlayerId = vi.fn(() => 'player2'); // Guest is player2

    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    let subtitle;
    queue.on('animationStarted', (a) => { subtitle = a.subtitle; });
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(subtitle).toBe('Opponent Goes First');
  });

  it('ANN-T8: No gameStateManager = no dynamic calculation', async () => {
    const queueWithoutGSM = new PhaseAnimationQueue(null);
    queueWithoutGSM.queueAnimation('roundAnnouncement', 'ROUND', null);

    let displayedText;
    queueWithoutGSM.on('animationStarted', (a) => { displayedText = a.phaseText; });
    queueWithoutGSM.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    // Should NOT modify to "ROUND X" without GSM
    expect(displayedText).toBe('ROUND');
  });
});

// ========================================
// CATEGORY 6: CLEAR AND ABORT
// ========================================

describe('Category 6: Clear and Abort', () => {
  let queue;

  beforeEach(() => {
    queue = new PhaseAnimationQueue();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ANN-C1: clear() during playback stops further animations', async () => {
    // Fixed: playNext() now checks if currentAnimation is null after await
    // and aborts gracefully if clear() was called during playback
    const playedAnimations = [];
    queue.on('animationStarted', (a) => playedAnimations.push(a.phaseName));

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
    queue.queueAnimation('roundAnnouncement', 'ROUND', null);

    queue.startPlayback();

    // First animation starts
    await vi.advanceTimersByTimeAsync(100);
    expect(playedAnimations).toEqual(['action']);

    // Clear mid-playback - now handled gracefully
    queue.clear();

    // Let timers complete
    await vi.advanceTimersByTimeAsync(5000);

    // Only first animation should have played
    expect(playedAnimations).toEqual(['action']);
  });

  it('ANN-C2: clear() resets isPlayingAnimations flag', async () => {
    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);
    expect(queue.isPlaying()).toBe(true);

    queue.clear();
    expect(queue.isPlaying()).toBe(false);
  });

  it('ANN-C3: clear() emits playbackStateChanged(false)', async () => {
    const stateChanges = [];
    queue.on('playbackStateChanged', (state) => stateChanges.push(state));

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);
    queue.clear();

    expect(stateChanges).toContain(false);
  });

  it('ANN-C4: Animations queued after clear() during playback work normally', async () => {
    // Test the real scenario: clear() called DURING playback, then new animations queued
    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
    queue.startPlayback();

    // Clear DURING playback (this is now safe due to null check fix in playNext)
    await vi.advanceTimersByTimeAsync(100);
    queue.clear();

    // Queue new animations after clear
    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);
    expect(queue.getQueueLength()).toBe(1);

    const animations = [];
    queue.on('animationStarted', (a) => animations.push(a.phaseName));
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(2000);
    expect(animations).toEqual(['roundAnnouncement']);
  });

  it('ANN-C5: startPlayback() after clear() plays new queue', async () => {
    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.clear();

    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);

    const animations = [];
    queue.on('animationStarted', (a) => animations.push(a.phaseName));
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(2000);
    expect(animations).toEqual(['roundAnnouncement']);
  });

  it('ANN-C6: clear() mid-animation does not crash playNext()', async () => {
    // Fixed: playNext() now has null check after await to handle clear() during playback
    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    queue.startPlayback();

    // Clear exactly at the 1800ms boundary
    await vi.advanceTimersByTimeAsync(1800);

    expect(() => {
      queue.clear();
    }).not.toThrow();

    // Continue advancing timers - should not crash (null check in playNext)
    await vi.advanceTimersByTimeAsync(2000);

    expect(queue.isPlaying()).toBe(false);
  });

  it('ANN-C7: Concurrent clear() and queueAnimation()', () => {
    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    // Simulate concurrent operations
    queue.clear();
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    expect(queue.getQueueLength()).toBe(1);
    expect(queue.isPlaying()).toBe(false);
  });
});

// ========================================
// CATEGORY 7: EVENT EMISSION
// ========================================

describe('Category 7: Event Emission', () => {
  let queue;

  beforeEach(() => {
    queue = new PhaseAnimationQueue();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ANN-E1: animationStarted fires with correct data', async () => {
    let receivedData;
    queue.on('animationStarted', (data) => { receivedData = data; });

    queue.queueAnimation('action', 'ACTION PHASE', 'You Go First');
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(receivedData.phaseName).toBe('action');
    expect(receivedData.phaseText).toBe('ACTION PHASE');
    expect(receivedData.subtitle).toBe('You Go First');
    expect(receivedData.id).toBeDefined();
  });

  it('ANN-E2: animationEnded fires after 1800ms', async () => {
    let endedAt = null;
    const startTime = Date.now();

    queue.on('animationEnded', () => { endedAt = Date.now(); });

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(1800);

    expect(endedAt).not.toBeNull();
    expect(endedAt - startTime).toBe(1800);
  });

  it('ANN-E3: playbackStateChanged fires true then false', async () => {
    const states = [];
    queue.on('playbackStateChanged', (state) => states.push(state));

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(2000);

    expect(states).toEqual([true, false]);
  });

  it('ANN-E4: complete fires when queue exhausted', async () => {
    let completeFired = false;
    queue.onComplete(() => { completeFired = true; });

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    expect(completeFired).toBe(false);

    await vi.advanceTimersByTimeAsync(2000);

    expect(completeFired).toBe(true);
  });

  it('ANN-E5: Multiple listeners all receive events', async () => {
    const listener1 = [];
    const listener2 = [];
    const listener3 = [];

    queue.on('animationStarted', (a) => listener1.push(a.phaseName));
    queue.on('animationStarted', (a) => listener2.push(a.phaseName));
    queue.on('animationStarted', (a) => listener3.push(a.phaseName));

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);

    expect(listener1).toEqual(['action']);
    expect(listener2).toEqual(['action']);
    expect(listener3).toEqual(['action']);
  });

  it('ANN-E6: Unsubscribe works correctly', async () => {
    const events = [];
    const unsubscribe = queue.on('animationStarted', (a) => events.push(a.phaseName));

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(100);
    expect(events).toEqual(['action']);

    unsubscribe();

    await vi.advanceTimersByTimeAsync(2000);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(2000);

    // Should not receive second event
    expect(events).toEqual(['action']);
  });

  it('ANN-E7: Events fire in correct order for sequence', async () => {
    const eventLog = [];

    queue.on('playbackStateChanged', (state) => eventLog.push(`state:${state}`));
    queue.on('animationStarted', (a) => eventLog.push(`started:${a.phaseName}`));
    queue.on('animationEnded', (a) => eventLog.push(`ended:${a.phaseName}`));
    queue.onComplete(() => eventLog.push('complete'));

    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(2000);

    expect(eventLog).toEqual([
      'state:true',
      'started:action',
      'ended:action',
      'state:false',
      'complete'
    ]);
  });

  it('ANN-E8: No events fire on empty queue startPlayback()', () => {
    const events = [];
    queue.on('playbackStateChanged', () => events.push('stateChanged'));
    queue.on('animationStarted', () => events.push('started'));
    queue.on('animationEnded', () => events.push('ended'));

    queue.startPlayback();

    expect(events).toEqual([]);
  });
});

// ========================================
// CATEGORY 8: INTEGRATION SCENARIOS
// ========================================

describe('Category 8: Integration Scenarios', () => {
  let queue;
  let mockGSM;

  beforeEach(() => {
    mockGSM = createMockGameStateManager();
    queue = new PhaseAnimationQueue(mockGSM);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ANN-I1: Full round transition: action→roundInit→mandatory→optional→allocate→deployment', async () => {
    const phases = [
      'actionComplete',
      'roundAnnouncement',
      'roundInitialization',
      'mandatoryDiscard',
      'optionalDiscard',
      'allocateShields',
      'deployment'
    ];

    phases.forEach(phase => {
      queue.queueAnimation(phase, phase.toUpperCase(), null);
    });

    const playedPhases = [];
    queue.on('animationStarted', (a) => playedPhases.push(a.phaseName));
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(15000);

    expect(playedPhases).toEqual(phases);
  });

  it('ANN-I2: Both players pass in action phase - correct sequence', async () => {
    // Simulate: Player 1 passes, then Player 2 passes
    queue.queueAnimation('playerPass', 'YOU PASSED', null);

    // After some time, opponent passes
    await vi.advanceTimersByTimeAsync(500);
    queue.queueAnimation('playerPass', 'OPPONENT PASSED', null); // Should dedup!

    // Only one pass announcement due to dedup
    expect(queue.getQueueLength()).toBe(1);
  });

  it('ANN-I3: Both players pass in deployment phase - correct sequence', async () => {
    const played = [];
    queue.on('animationStarted', (a) => played.push(a.phaseName));

    queue.queueAnimation('playerPass', 'YOU PASSED', null);
    queue.queueAnimation('deploymentComplete', 'DEPLOYMENT COMPLETE', null);
    queue.queueAnimation('action', 'ACTION PHASE', null);

    queue.startPlayback();
    await vi.advanceTimersByTimeAsync(6000);

    expect(played).toEqual(['playerPass', 'deploymentComplete', 'action']);
  });

  it('ANN-I4: Opponent passes first, then local passes - announcements correct', async () => {
    const played = [];
    queue.on('animationStarted', (a) => played.push(a.phaseText));

    // Opponent passes first
    queue.queueAnimation('playerPass', 'OPPONENT PASSED', null);

    // Then local passes
    await vi.advanceTimersByTimeAsync(1000);
    queue.queueAnimation('playerPass', 'YOU PASSED', null); // Should dedup and update text

    queue.startPlayback();
    await vi.advanceTimersByTimeAsync(2000);

    // Due to dedup, only one pass announcement (updated to latest text)
    expect(played).toHaveLength(1);
    expect(played[0]).toBe('YOU PASSED');
  });

  it('ANN-I5: Local passes first, then opponent passes - announcements correct', async () => {
    const played = [];
    queue.on('animationStarted', (a) => played.push(a.phaseText));

    queue.queueAnimation('playerPass', 'YOU PASSED', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(2000);

    // Opponent passes after local animation played
    queue.queueAnimation('playerPass', 'OPPONENT PASSED', null);
    queue.startPlayback();

    await vi.advanceTimersByTimeAsync(2000);

    expect(played).toEqual(['YOU PASSED', 'OPPONENT PASSED']);
  });

  it('ANN-I6: Quick Deploy skips optionalDiscard - announcements reflect', async () => {
    const played = [];
    queue.on('animationStarted', (a) => played.push(a.phaseName));

    // Quick Deploy sequence (no optionalDiscard)
    queue.queueAnimation('roundAnnouncement', 'ROUND', null);
    queue.queueAnimation('roundInitialization', 'UPKEEP', null);
    queue.queueAnimation('mandatoryDiscard', 'MANDATORY DISCARD', null);
    // optionalDiscard skipped
    queue.queueAnimation('allocateShields', 'ALLOCATE SHIELDS', null);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    queue.startPlayback();
    await vi.advanceTimersByTimeAsync(10000);

    expect(played).not.toContain('optionalDiscard');
    expect(played).toContain('deployment');
  });

  it('ANN-I7: No mandatory discard needed - phase skipped in announcements', async () => {
    const played = [];
    queue.on('animationStarted', (a) => played.push(a.phaseName));

    // Sequence without mandatoryDiscard
    queue.queueAnimation('roundAnnouncement', 'ROUND', null);
    queue.queueAnimation('roundInitialization', 'UPKEEP', null);
    queue.queueAnimation('optionalDiscard', 'OPTIONAL DISCARD', null);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    queue.startPlayback();
    await vi.advanceTimersByTimeAsync(8000);

    expect(played).not.toContain('mandatoryDiscard');
  });

  it('ANN-I8: Game start: deckSelection→droneSelection→placement→roundInit→Round 1', async () => {
    mockGSM._setState({ roundNumber: 1 });

    const played = [];
    queue.on('animationStarted', (a) => played.push(a.phaseName));

    queue.queueAnimation('deckSelection', 'SELECT YOUR DECK', null);
    queue.queueAnimation('droneSelection', 'SELECT YOUR DRONES', null);
    queue.queueAnimation('placement', 'PLACEMENT PHASE', null);
    queue.queueAnimation('roundAnnouncement', 'ROUND', null);

    queue.startPlayback();
    await vi.advanceTimersByTimeAsync(8000);

    expect(played[3]).toBe('roundAnnouncement');
  });

  it('ANN-I9: Multiplayer: Host and Guest both see identical announcement sequence', async () => {
    const hostQueue = new PhaseAnimationQueue(createMockGameStateManager({ gameMode: 'host' }));
    const guestQueue = new PhaseAnimationQueue(createMockGameStateManager({ gameMode: 'guest' }));

    const hostPlayed = [];
    const guestPlayed = [];

    hostQueue.on('animationStarted', (a) => hostPlayed.push(a.phaseName));
    guestQueue.on('animationStarted', (a) => guestPlayed.push(a.phaseName));

    const sequence = ['roundAnnouncement', 'roundInitialization', 'deployment', 'action'];

    sequence.forEach(phase => {
      hostQueue.queueAnimation(phase, phase, null);
      guestQueue.queueAnimation(phase, phase, null);
    });

    hostQueue.startPlayback();
    guestQueue.startPlayback();

    await vi.advanceTimersByTimeAsync(10000);

    expect(hostPlayed).toEqual(guestPlayed);
  });

  it('ANN-I10: Single player (local mode) announcement sequence', async () => {
    mockGSM._setState({ gameMode: 'local' });

    const played = [];
    queue.on('animationStarted', (a) => played.push(a.phaseName));

    queue.queueAnimation('roundAnnouncement', 'ROUND 1', null);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);
    queue.queueAnimation('action', 'ACTION PHASE', null);

    queue.startPlayback();
    await vi.advanceTimersByTimeAsync(6000);

    expect(played).toEqual(['roundAnnouncement', 'deployment', 'action']);
  });

  it('ANN-I11: AI opponent pass detection and announcement', async () => {
    const played = [];
    queue.on('animationStarted', (a) => played.push(a.phaseText));

    // AI passes
    queue.queueAnimation('playerPass', 'AI PASSED', null);
    queue.queueAnimation('deploymentComplete', 'DEPLOYMENT COMPLETE', null);

    queue.startPlayback();
    await vi.advanceTimersByTimeAsync(4000);

    expect(played[0]).toBe('AI PASSED');
  });

  it('ANN-I12: Reconnection scenario - queue state preserved', () => {
    queue.queueAnimation('action', 'ACTION PHASE', null);
    queue.queueAnimation('deployment', 'DEPLOYMENT PHASE', null);

    // Simulate storing queue state
    const queueState = {
      length: queue.getQueueLength(),
      isPlaying: queue.isPlaying()
    };

    expect(queueState.length).toBe(2);
    expect(queueState.isPlaying).toBe(false);

    // After "reconnection", queue should be intact
    expect(queue.getQueueLength()).toBe(2);
  });
});
