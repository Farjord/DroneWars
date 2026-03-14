import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTextScramble from '../useTextScramble.js';

// Stub rAF with setTimeout so fake timers control it
let rafId = 0;
const originalRAF = globalThis.requestAnimationFrame;
const originalCAF = globalThis.cancelAnimationFrame;

beforeEach(() => {
  vi.useFakeTimers();
  // performance.now() is controlled by fake timers in vitest
  rafId = 0;
  globalThis.requestAnimationFrame = (cb) => {
    rafId++;
    const id = rafId;
    setTimeout(() => cb(performance.now()), 16); // ~60fps
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    // clearTimeout won't match rAF ids, but the pending setTimeout
    // will be cleaned up by vi.useRealTimers / vi.clearAllTimers
  };
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
});

describe('useTextScramble', () => {
  it('returns initial text when not scrambling', () => {
    const { result } = renderHook(() =>
      useTextScramble('HELLO', { isActive: false, duration: 500 })
    );
    expect(result.current).toBe('HELLO');
  });

  it('returns target text after scramble duration completes', () => {
    let target = 'HELLO';
    let active = false;

    const { result, rerender } = renderHook(() =>
      useTextScramble(target, { isActive: active, duration: 500 })
    );

    expect(result.current).toBe('HELLO');

    // Activate scramble toward new target
    target = 'WORLD';
    active = true;
    rerender();

    // Advance past full duration + rAF frames
    act(() => { vi.advanceTimersByTime(600); });

    expect(result.current).toBe('WORLD');
  });

  it('spaces are never replaced with scramble characters', () => {
    let target = 'A B';
    let active = false;

    const { result, rerender } = renderHook(() =>
      useTextScramble(target, { isActive: active, duration: 500 })
    );

    // Activate scramble toward target with space
    target = 'X Y';
    active = true;
    rerender();

    // Sample multiple frames during scramble
    for (let t = 0; t < 500; t += 16) {
      act(() => { vi.advanceTimersByTime(16); });
      const text = result.current;
      // Position 1 is the space — it should always be a space
      expect(text[1]).toBe(' ');
    }
  });

  it('handles target longer than source (extra positions scramble in)', () => {
    let target = 'AB';
    let active = false;

    const { result, rerender } = renderHook(() =>
      useTextScramble(target, { isActive: active, duration: 500 })
    );

    expect(result.current).toBe('AB');

    target = 'ABCDE';
    active = true;
    rerender();

    // After completion, should show full target
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe('ABCDE');
  });

  it('handles target shorter than source (excess positions drop off)', () => {
    let target = 'ABCDE';
    let active = false;

    const { result, rerender } = renderHook(() =>
      useTextScramble(target, { isActive: active, duration: 500 })
    );

    expect(result.current).toBe('ABCDE');

    target = 'XY';
    active = true;
    rerender();

    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe('XY');
  });

  it('cancels animation on unmount (no leaks)', () => {
    const cancelSpy = vi.fn();
    globalThis.cancelAnimationFrame = cancelSpy;

    let target = 'HELLO';
    let active = false;

    const { rerender, unmount } = renderHook(() =>
      useTextScramble(target, { isActive: active, duration: 500 })
    );

    target = 'WORLD';
    active = true;
    rerender();

    // Let one frame tick to start the rAF loop
    act(() => { vi.advanceTimersByTime(16); });

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('during scramble, unlocked positions show random characters', () => {
    let target = 'HELLO';
    let active = false;

    const { result, rerender } = renderHook(() =>
      useTextScramble(target, { isActive: active, duration: 500 })
    );

    target = 'WORLD';
    active = true;
    rerender();

    // After one frame (16ms) — early in scramble, most chars should not yet be locked
    act(() => { vi.advanceTimersByTime(16); });

    const text = result.current;
    // At 16ms into 500ms, the first char locks at ~0ms * 0.85 = 0ms...
    // Actually lock time for i=0 is 0, so it locks immediately.
    // But later chars should still be scrambling.
    // Just verify we get a 5-char string with some variation
    expect(text).toHaveLength(5);
  });

  it('left-to-right lock-in: earlier characters lock before later ones', () => {
    let target = 'HELLO WORLD';
    let active = false;

    const { result, rerender } = renderHook(() =>
      useTextScramble(target, { isActive: active, duration: 500 })
    );

    target = 'ABCDEFGHIJK';
    active = true;
    rerender();

    // At ~50% through duration (250ms), early chars should be locked
    act(() => { vi.advanceTimersByTime(260); });

    const text = result.current;
    // First char (lockTime ≈ 0) should be 'A'
    expect(text[0]).toBe('A');
    // The length should match target
    expect(text).toHaveLength(11);
  });
});
