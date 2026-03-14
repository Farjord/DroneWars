// ========================================
// PHASE ANNOUNCEMENT OVERLAY
// ========================================
// Displays a full-screen phase announcement when transitioning between game phases
// Shows phase name with Drone Wars gradient styling and shine effect
// Supports compound announcements with cross-fade between two stages
// Auto-dismisses after display duration (1.5s standard, 2.6s compound)

import React, { useState, useEffect, useRef } from 'react';
import { timingLog, getTimestamp } from '../../utils/debugLogger.js';

const gradientStyle = {
  background: 'linear-gradient(90deg, #06b6d4, #22d3ee, #ffffff, #22d3ee, #06b6d4)',
  backgroundSize: '300% auto',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  textShadow: '0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(34, 211, 238, 0.3)',
  filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.4))'
};

/**
 * Renders the phase text heading and optional subtitle for a single stage.
 * Used both for standard announcements and as layers within compound announcements.
 */
function StageContent({ phaseText, subtitle, isVisible, className = '' }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <h1
        className={`
          text-6xl font-orbitron font-black uppercase tracking-widest text-center
          phase-announcement-text
          ${isVisible ? 'phase-announcement-shine' : ''}
        `}
        style={gradientStyle}
      >
        {phaseText}
      </h1>

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
    </div>
  );
}

/**
 * PhaseAnnouncementOverlay - Shows phase name during phase transitions
 * @param {string} phaseText - The text to display (standard mode)
 * @param {string} subtitle - Optional subtitle text (standard mode)
 * @param {boolean} compound - Whether this is a compound cross-fade announcement
 * @param {Array} stages - Array of {phaseText, subtitle} for compound mode
 * @param {Function} onComplete - Callback when animation completes
 */
const PhaseAnnouncementOverlay = ({ phaseText, subtitle, compound, stages, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const containerRef = useRef(null);
  const mountTimeRef = useRef(null);

  // Create unique performance mark ID for this instance
  const markId = useRef(`phase-announcement-${Date.now()}`).current;

  // Detect browser state on mount
  if (!mountTimeRef.current) {
    mountTimeRef.current = getTimestamp();
    if (import.meta.env.DEV) {
      performance.mark(`${markId}-component-mount`);
    }
  }

  if (import.meta.env.DEV) {
    const browserState = {
      hasFocus: document.hasFocus(),
      visibilityState: document.visibilityState,
      hidden: document.hidden
    };

    timingLog('[MODAL COMPONENT] PhaseAnnouncementOverlay rendered', {
      phaseText,
      subtitle,
      compound: compound || false,
      isVisible,
      browserState,
      blockingReason: 'component_function_executing'
    });
  }

  useEffect(() => {
    if (import.meta.env.DEV) {
      performance.mark(`${markId}-useEffect-start`);

      timingLog('[MODAL COMPONENT] useEffect triggered', {
        phaseText,
        compound: compound || false,
        browserState: {
          hasFocus: document.hasFocus(),
          visibilityState: document.visibilityState,
          hidden: document.hidden
        },
        blockingReason: 'requesting_animation_frame'
      });
    }

    // Trigger fade-in immediately
    requestAnimationFrame(() => {
      if (import.meta.env.DEV) {
        performance.mark(`${markId}-raf-callback`);

        timingLog('[MODAL COMPONENT] requestAnimationFrame callback', {
          phaseText,
          blockingReason: 'setting_isVisible_true'
        });
      }

      setIsVisible(true);

      // Schedule another rAF to detect when browser has actually painted
      requestAnimationFrame(() => {
        if (import.meta.env.DEV) {
          performance.mark(`${markId}-second-raf`);

          timingLog('[MODAL COMPONENT] Second rAF (post-paint)', {
            phaseText,
            blockingReason: 'browser_should_have_painted'
          });
        }
      });
    });

    if (compound && stages) {
      // Compound: cross-fade between stages, then fade out
      // 1000ms stage 1 → 300ms cross-fade → 1000ms stage 2 → 300ms fade out = 2600ms total
      const crossFadeTimer = setTimeout(() => {
        setStageIndex(1);
      }, 1000);

      const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
        // Wait for fade-out animation to complete before cleanup
        setTimeout(() => onComplete?.(), 300);
      }, 2300); // 1000 + 300 cross-fade + 1000 stage 2

      return () => {
        clearTimeout(crossFadeTimer);
        clearTimeout(fadeOutTimer);
      };
    }

    // Standard: display for 1.5s then fade out
    const displayTimer = setTimeout(() => {
      setIsVisible(false);

      // Wait for fade-out animation to complete before cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, 300); // Match CSS transition duration

      return () => clearTimeout(cleanupTimer);
    }, 1500);

    return () => clearTimeout(displayTimer);
  }, [onComplete, markId, phaseText, compound, stages]);

  // Log when isVisible actually changes (React has applied the state update)
  useEffect(() => {
    if (isVisible && import.meta.env.DEV) {
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
        {/* Background hex decorations - positioned behind text */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Upper-left hex - larger */}
          <svg
            className={`absolute -translate-x-28 -translate-y-10 transition-all duration-500 ${isVisible ? 'opacity-20' : 'opacity-0'}`}
            width="100" height="115" viewBox="0 0 80 92"
          >
            <polygon
              points="40,0 80,23 80,69 40,92 0,69 0,23"
              fill="rgba(6, 182, 212, 0.08)"
              stroke="#06b6d4"
              strokeWidth="1"
            />
          </svg>
          {/* Lower-right hex - medium */}
          <svg
            className={`absolute translate-x-24 translate-y-8 transition-all duration-500 ${isVisible ? 'opacity-15' : 'opacity-0'}`}
            width="80" height="92" viewBox="0 0 80 92"
          >
            <polygon
              points="40,0 80,23 80,69 40,92 0,69 0,23"
              fill="rgba(6, 182, 212, 0.06)"
              stroke="#22d3ee"
              strokeWidth="0.8"
            />
          </svg>
          {/* Center-right small hex */}
          <svg
            className={`absolute translate-x-44 -translate-y-2 transition-all duration-500 ${isVisible ? 'opacity-10' : 'opacity-0'}`}
            width="50" height="58" viewBox="0 0 80 92"
          >
            <polygon
              points="40,0 80,23 80,69 40,92 0,69 0,23"
              fill="rgba(6, 182, 212, 0.05)"
              stroke="#67e8f9"
              strokeWidth="0.5"
            />
          </svg>
          {/* Upper-right tiny hex */}
          <svg
            className={`absolute translate-x-16 -translate-y-14 transition-all duration-500 ${isVisible ? 'opacity-12' : 'opacity-0'}`}
            width="40" height="46" viewBox="0 0 80 92"
          >
            <polygon
              points="40,0 80,23 80,69 40,92 0,69 0,23"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.6"
            />
          </svg>
        </div>

        {/* Text content — compound cross-fade or standard */}
        {compound && stages ? (
          <div className="relative">
            {stages.map((stage, idx) => (
              <div
                key={idx}
                className={`transition-opacity duration-300 ${idx > 0 ? 'absolute inset-0' : ''}`}
                style={{ opacity: stageIndex === idx ? 1 : 0 }}
              >
                <StageContent
                  phaseText={stage.phaseText}
                  subtitle={stage.subtitle}
                  isVisible={isVisible}
                />
              </div>
            ))}
          </div>
        ) : (
          <StageContent
            phaseText={phaseText}
            subtitle={subtitle}
            isVisible={isVisible}
          />
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
