import { useState, useEffect, useRef } from 'react';

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>';
const DEFAULT_DURATION_MS = 500;

/**
 * Animates text from its previous value to a new target via character-level scramble.
 * Each position cycles through random characters before locking left-to-right.
 * Spaces are never scrambled.
 *
 * @param {string} targetText - The text to display / scramble toward
 * @param {Object} options
 * @param {boolean} options.isActive - When true, begins scrambling from previous text to target
 * @param {number} [options.duration=500] - Scramble duration in milliseconds
 * @param {string} [options.initialSource] - Override initial source text (e.g. '' for scramble-in from empty)
 * @returns {string} The current display text (scrambled or settled)
 */
export default function useTextScramble(targetText, { isActive, duration = DEFAULT_DURATION_MS, initialSource }) {
  const [displayText, setDisplayText] = useState(initialSource ?? targetText);
  const sourceRef = useRef(initialSource ?? targetText);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      // Not scrambling — show target directly and capture it as next source
      sourceRef.current = targetText;
      setDisplayText(targetText);
      return;
    }

    // Scramble activated — animate from source to target
    const source = sourceRef.current;
    const maxLen = Math.max(source.length, targetText.length);
    startTimeRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;
      const chars = [];

      for (let i = 0; i < maxLen; i++) {
        const targetChar = i < targetText.length ? targetText[i] : '';
        const lockTime = (i / Math.max(maxLen - 1, 1)) * duration * 0.85;

        // Spaces lock immediately
        if (targetChar === ' ') {
          chars.push(' ');
          continue;
        }

        // Past target length — position drops off
        if (i >= targetText.length) {
          if (elapsed >= lockTime) {
            continue; // Drop this position
          }
          chars.push(SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]);
          continue;
        }

        if (elapsed >= lockTime) {
          chars.push(targetChar);
        } else {
          chars.push(SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]);
        }
      }

      const result = chars.join('');
      setDisplayText(result);

      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure final frame shows exact target
        setDisplayText(targetText);
        sourceRef.current = targetText;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    // Fallback: if rAF is throttled (background tab), force-complete after duration
    const fallbackTimer = setTimeout(() => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDisplayText(targetText);
      sourceRef.current = targetText;
    }, duration + 50);

    return () => {
      clearTimeout(fallbackTimer);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive, targetText, duration]);

  return displayText;
}
