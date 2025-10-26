// ========================================
// PHASE ANNOUNCEMENT OVERLAY
// ========================================
// Displays a full-screen phase announcement when transitioning between game phases
// Shows phase name with Drone Wars gradient styling and shine effect
// Auto-dismisses after 1.5 seconds

import React, { useState, useEffect, useRef } from 'react';
import { timingLog, getTimestamp } from '../../utils/debugLogger.js';

/**
 * PhaseAnnouncementOverlay - Shows phase name during phase transitions
 * @param {string} phaseText - The text to display (e.g., "DEPLOYMENT PHASE")
 * @param {string} subtitle - Optional subtitle text (e.g., "You Go First")
 * @param {Function} onComplete - Callback when animation completes
 */
const PhaseAnnouncementOverlay = ({ phaseText, subtitle, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const mountTimeRef = useRef(null);

  // Create unique performance mark ID for this instance
  const markId = useRef(`phase-announcement-${Date.now()}`).current;

  // Detect browser state on mount
  if (!mountTimeRef.current) {
    mountTimeRef.current = getTimestamp();
    performance.mark(`${markId}-component-mount`);
  }

  const browserState = {
    hasFocus: document.hasFocus(),
    visibilityState: document.visibilityState,
    hidden: document.hidden
  };

  timingLog('[MODAL COMPONENT] PhaseAnnouncementOverlay rendered', {
    phaseText,
    subtitle,
    isVisible,
    browserState,
    blockingReason: 'component_function_executing'
  });

  useEffect(() => {
    performance.mark(`${markId}-useEffect-start`);

    timingLog('[MODAL COMPONENT] useEffect triggered', {
      phaseText,
      browserState: {
        hasFocus: document.hasFocus(),
        visibilityState: document.visibilityState,
        hidden: document.hidden
      },
      blockingReason: 'requesting_animation_frame'
    });

    // Trigger fade-in immediately
    requestAnimationFrame(() => {
      performance.mark(`${markId}-raf-callback`);

      timingLog('[MODAL COMPONENT] requestAnimationFrame callback', {
        phaseText,
        blockingReason: 'setting_isVisible_true'
      });

      setIsVisible(true);

      // Schedule another rAF to detect when browser has actually painted
      requestAnimationFrame(() => {
        performance.mark(`${markId}-second-raf`);

        timingLog('[MODAL COMPONENT] Second rAF (post-paint)', {
          phaseText,
          blockingReason: 'browser_should_have_painted'
        });
      });
    });

    // Auto-dismiss after 1.5 seconds
    const displayTimer = setTimeout(() => {
      setIsVisible(false);

      // Wait for fade-out animation to complete before cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, 300); // Match CSS transition duration

      return () => clearTimeout(cleanupTimer);
    }, 1500);

    return () => clearTimeout(displayTimer);
  }, [onComplete, markId, phaseText]);

  // Log when isVisible actually changes (React has applied the state update)
  useEffect(() => {
    if (isVisible) {
      performance.mark(`${markId}-visible-true`);

      // Measure timing from component mount to visible
      try {
        performance.measure(
          `${markId}-mount-to-visible`,
          `${markId}-component-mount`,
          `${markId}-visible-true`
        );

        const measure = performance.getEntriesByName(`${markId}-mount-to-visible`)[0];

        timingLog('[MODAL COMPONENT] Modal NOW VISIBLE', {
          phaseText,
          mountToVisibleMs: measure?.duration?.toFixed(2),
          browserState: {
            hasFocus: document.hasFocus(),
            visibilityState: document.visibilityState,
            hidden: document.hidden
          },
          blockingReason: 'none_modal_visible_on_screen'
        });
      } catch (e) {
        timingLog('[MODAL COMPONENT] Modal NOW VISIBLE', {
          phaseText,
          measureError: e.message,
          browserState: {
            hasFocus: document.hasFocus(),
            visibilityState: document.visibilityState,
            hidden: document.hidden
          },
          blockingReason: 'none_modal_visible_on_screen'
        });
      }
    }
  }, [isVisible, phaseText, markId]);

  // Ref callback to detect when DOM element is actually created
  const handleContainerRef = (element) => {
    if (element && !containerRef.current) {
      performance.mark(`${markId}-dom-element-created`);
      containerRef.current = element;

      timingLog('[MODAL COMPONENT] DOM element created', {
        phaseText,
        blockingReason: 'element_in_dom_awaiting_paint'
      });
    }
  };

  return (
    <div
      ref={handleContainerRef}
      className={`
        fixed inset-0 z-[10000] flex items-center justify-center
        transition-all duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Semi-transparent background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Content container */}
      <div
        className={`
          relative flex flex-col items-center
          transition-all duration-300 transform
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'}
        `}
      >
        {/* Phase text with gradient and glow */}
        <h1
          className={`
            text-6xl font-orbitron font-black uppercase tracking-widest text-center
            phase-announcement-text
            ${isVisible ? 'phase-announcement-shine' : ''}
          `}
          style={{
            background: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 136, 255, 0.3)',
            filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.4))'
          }}
        >
          {phaseText}
        </h1>

        {/* Optional subtitle (for deployment/action phases showing who goes first) */}
        {subtitle && (
          <p
            className={`
              text-2xl font-orbitron font-medium uppercase tracking-wider text-center
              text-cyan-300/80 mt-4
              transition-all duration-300
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
          >
            {subtitle}
          </p>
        )}

        {/* Decorative line beneath text */}
        <div
          className={`
            mt-8 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent
            transition-all duration-500
            ${isVisible ? 'w-96 opacity-100' : 'w-0 opacity-0'}
          `}
        />

        {/* Scan line effect */}
        <div
          className={`
            absolute inset-0 pointer-events-none overflow-hidden
          `}
        >
          <div
            className={`
              absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent
              phase-announcement-scanline
              ${isVisible ? 'phase-announcement-scanline-active' : ''}
            `}
          />
        </div>
      </div>
    </div>
  );
};

export default PhaseAnnouncementOverlay;
