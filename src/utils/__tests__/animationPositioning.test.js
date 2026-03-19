import { describe, it, expect, vi } from 'vitest';
import { isLocalPlayer, parseLaneIndex, getTopCenterPosition } from '../animationPositioning.js';

describe('parseLaneIndex', () => {
  it('returns 0 for lane1', () => {
    expect(parseLaneIndex('lane1')).toBe(0);
  });

  it('returns 1 for lane2', () => {
    expect(parseLaneIndex('lane2')).toBe(1);
  });

  it('returns 2 for lane3', () => {
    expect(parseLaneIndex('lane3')).toBe(2);
  });

  it('returns -1 for null', () => {
    expect(parseLaneIndex(null)).toBe(-1);
  });

  it('returns -1 for undefined', () => {
    expect(parseLaneIndex(undefined)).toBe(-1);
  });
});

describe('isLocalPlayer', () => {
  const mockGameStateManager = {
    getLocalPlayerId: vi.fn()
  };

  it('returns true when player ID matches local player', () => {
    mockGameStateManager.getLocalPlayerId.mockReturnValue('player-1');
    expect(isLocalPlayer(mockGameStateManager, 'player-1')).toBe(true);
  });

  it('returns false when player ID does not match local player', () => {
    mockGameStateManager.getLocalPlayerId.mockReturnValue('player-1');
    expect(isLocalPlayer(mockGameStateManager, 'player-2')).toBe(false);
  });
});

describe('getTopCenterPosition', () => {
  it('returns { x: center, y: top } from element bounding rect', () => {
    const mockElement = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        width: 80,
        height: 60
      })
    };
    expect(getTopCenterPosition(mockElement)).toEqual({ x: 140, y: 200 });
  });

  it('returns null for null input', () => {
    expect(getTopCenterPosition(null)).toBeNull();
  });
});
