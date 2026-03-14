import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

vi.mock('../../config/soundConfig.js', () => ({
  getSoundForEvent: vi.fn(),
}));

vi.mock('../SoundManager.js', () => ({
  default: {
    getInstance: vi.fn(),
  },
}));

vi.mock('../MusicManager.js', () => ({
  default: {
    getInstance: vi.fn(() => ({
      setOverride: vi.fn(),
      clearOverride: vi.fn(),
    })),
  },
}));

import SoundEventBridge from '../SoundEventBridge.js';
import SoundManager from '../SoundManager.js';
import { getSoundForEvent } from '../../config/soundConfig.js';

/** Minimal event emitter matching AnnouncementQueue's on/emit interface */
function createMockQueue() {
  const listeners = new Map();
  return {
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(cb);
      return () => {
        const cbs = listeners.get(event);
        const idx = cbs.indexOf(cb);
        if (idx !== -1) cbs.splice(idx, 1);
      };
    },
    emit(event, data) {
      (listeners.get(event) || []).forEach(cb => cb(data));
    },
  };
}

describe('SoundEventBridge — phaseAnimation sounds', () => {
  let bridge;
  let mockQueue;
  let mockPlay;

  beforeEach(() => {
    mockPlay = vi.fn();
    SoundManager.getInstance.mockReturnValue({ play: mockPlay });
    getSoundForEvent.mockReset();
    mockQueue = createMockQueue();
    bridge = new SoundEventBridge();
  });

  afterEach(() => {
    bridge.disconnect();
  });

  it('plays sound for single (non-compound) animation', () => {
    getSoundForEvent.mockImplementation((source, key) => {
      if (source === 'phaseAnimation' && key === 'deployment') return 'phase_deployment';
      return null;
    });

    bridge.connect({ phaseAnimationQueue: mockQueue });
    mockQueue.emit('animationStarted', { phaseName: 'deployment' });

    expect(getSoundForEvent).toHaveBeenCalledWith('phaseAnimation', 'deployment');
    expect(mockPlay).toHaveBeenCalledWith('phase_deployment');
  });

  it('plays first stage sound for compound animation', () => {
    getSoundForEvent.mockImplementation((source, key) => {
      if (source === 'phaseAnimation' && key === 'roundAnnouncement') return 'round_start';
      return null;
    });

    bridge.connect({ phaseAnimationQueue: mockQueue });
    mockQueue.emit('animationStarted', {
      compound: true,
      phaseName: 'roundAnnouncement+deployment',
      stages: [
        { phaseName: 'roundAnnouncement', phaseText: 'ROUND 2' },
        { phaseName: 'deployment', phaseText: 'DEPLOYMENT PHASE' },
      ],
    });

    expect(getSoundForEvent).toHaveBeenCalledWith('phaseAnimation', 'roundAnnouncement');
    expect(mockPlay).toHaveBeenCalledWith('round_start');
  });

  it('does not crash when compound has no matching sound', () => {
    getSoundForEvent.mockReturnValue(null);

    bridge.connect({ phaseAnimationQueue: mockQueue });
    mockQueue.emit('animationStarted', {
      compound: true,
      phaseName: 'unknown+other',
      stages: [
        { phaseName: 'unknown', phaseText: 'UNKNOWN' },
        { phaseName: 'other', phaseText: 'OTHER' },
      ],
    });

    expect(mockPlay).not.toHaveBeenCalled();
  });
});
