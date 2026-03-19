// ========================================
// PHASE ANNOUNCEMENT OVERLAY
// ========================================
// Displays a full-screen phase announcement when transitioning between game phases
// Shows phase name with Drone Wars gradient styling and shine effect
// All text scrambles in from empty on mount; compound announcements chain-morph between N stages
// Auto-dismisses after display duration (1.8s standard, dynamic for compounds)

import React, { useState, useEffect, useRef } from 'react';
import './PhaseAnnouncementOverlay.css';
import { debugLog, timingLog, getTimestamp } from '../../utils/debugLogger.js';
import useTextScramble from '../../hooks/useTextScramble.js';
import {
  SCRAMBLE_DURATION_MS,
  STAGE_HOLD_MS,
  FADE_OUT_MS,
} from '../../config/announcementTiming.js';

const playerGradientStyle = {
  background: 'linear-gradient(90deg, #06b6d4, #22d3ee, #ffffff, #22d3ee, #06b6d4)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  textShadow: '0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(34, 211, 238, 0.3)',
};

const opponentGradientStyle = {
  background: 'linear-gradient(90deg, #ef4444, #f87171, #ffffff, #f87171, #ef4444)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  textShadow: '0 0 30px rgba(239, 68, 68, 0.5), 0 0 60px rgba(248, 113, 113, 0.3)',
};

/**
 * PhaseAnnouncementOverlay - Shows phase name during phase transitions
 * @param {string} phaseText - The text to display (standard mode)
 * @param {string} subtitle - Optional subtitle text (standard mode)
 * @param {string} variant - 'player' or 'opponent' for heading color (standard mode)
 * @param {string} subtitleVariant - 'player' or 'opponent' for subtitle color (standard mode)
 * @param {boolean} compound - Whether this is a compound scramble-morph announcement
 * @param {Array} stages - Array of {phaseText, subtitle, variant, subtitleVariant} for compound mode
 * @param {Function} onComplete - Callback when animation completes
 */
const PhaseAnnouncementOverlay = ({ phaseText, subtitle, variant, subtitleVariant, compound, stages, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const containerRef = useRef(null);
  const headingRef = useRef(null);
  const mountTimeRef = useRef(null);
  const lastLoggedRef = useRef({ stageIndex: -1, isVisible: false });

  // Compute scramble targets and variants based on current stage
  const currentStage = (compound && stages) ? stages[stageIndex] : null;
  const headingTarget = currentStage ? currentStage.phaseText : (phaseText || '');
  const subtitleTarget = currentStage ? (currentStage.subtitle || '') : (subtitle || '');
  const headingVariant = currentStage ? currentStage.variant : variant;
  const currentSubtitleVariant = currentStage ? currentStage.subtitleVariant : subtitleVariant;

  // Both hooks start from empty (initialSource: '') and are always active for scramble-in
  // When stageIndex changes, targetText changes -> hook re-scrambles from previous settled text
  const isActive = true;
  const displayHeading = useTextScramble(headingTarget, {
    isActive,
    duration: SCRAMBLE_DURATION_MS,
    initialSource: '',
  });
  const displaySubtitle = useTextScramble(subtitleTarget, {
    isActive,
    duration: SCRAMBLE_DURATION_MS,
    initialSource: '',
  });

  // Select gradient style based on variant
  const headingGradient = headingVariant === 'opponent' ? opponentGradientStyle : playerGradientStyle;
  const subtitleColorClass = currentSubtitleVariant === 'opponent'
    ? 'text-red-400/80'
    : 'text-cyan-300/80';

  // Create unique performance mark ID for this instance
  const markId = useRef(`phase-announcement-${crypto.randomUUID()}`).current;

  // Detect browser state on mount
  if (!mountTimeRef.current) {
    mountTimeRef.current = getTimestamp();
    if (import.meta.env.DEV) {
      performance.mark(`${markId}-component-mount`);
    }
  }

  // Only log on meaningful state changes, not every 60fps scramble frame
  if (stageIndex !== lastLoggedRef.current.stageIndex || isVisible !== lastLoggedRef.current.isVisible) {
    lastLoggedRef.current = { stageIndex, isVisible };
    debugLog('ANNOUNCE_TRACE', '🎨 OVERLAY RENDER', {
      stageIndex,
      headingTarget,
      subtitleTarget,
      displayHeading,
      displaySubtitle,
      headingVariant,
      currentSubtitleVariant,
      isVisible,
      compound: compound || false,
      gradientIs: headingGradient === opponentGradientStyle ? 'opponent' : 'player',
    });
  }

  if (import.meta.env.DEV) {
    timingLog('[MODAL COMPONENT] PhaseAnnouncementOverlay rendered', {
      phaseText: headingTarget,
      subtitle: subtitleTarget,
      compound: compound || false,
      stageIndex,
      isVisible,
      blockingReason: 'component_function_executing'
    });
  }

  useEffect(() => {
    if (import.meta.env.DEV) {
      performance.mark(`${markId}-useEffect-start`);
      timingLog('[MODAL COMPONENT] useEffect triggered', {
        phaseText: headingTarget,
        compound: compound || false,
        blockingReason: 'requesting_animation_frame'
      });
    }

    // Trigger background/decoration fade-in (text scrambles in independently)
    requestAnimationFrame(() => {
      if (import.meta.env.DEV) {
        performance.mark(`${markId}-raf-callback`);
      }
      setIsVisible(true);
    });

    const timers = [];
    const stageInterval = SCRAMBLE_DURATION_MS + STAGE_HOLD_MS;
    const mountTime = Date.now();

    debugLog('ANNOUNCE_TRACE', '⏱️ OVERLAY EFFECT: scheduling', {
      mountTime,
      stageInterval,
      compound: compound || false,
      stageCount: stages?.length || 1,
      headingTarget,
    });

    if (compound && stages && stages.length >= 2) {
      // Compound: uniform stage transitions — each stage gets the same rhythm
      for (let i = 1; i < stages.length; i++) {
        const morphAt = i * stageInterval;
        debugLog('ANNOUNCE_TRACE', `⏱️ OVERLAY: morph ${i} scheduled at +${morphAt}ms`, {
          phaseText: stages[i].phaseText, variant: stages[i].variant,
        });
        const targetIndex = i;
        timers.push(setTimeout(() => {
          debugLog('ANNOUNCE_TRACE', `⏱️ OVERLAY: morph ${targetIndex} FIRED +${Date.now() - mountTime}ms (expected +${morphAt}ms)`, {
            phaseText: stages[targetIndex].phaseText,
          });
          setStageIndex(targetIndex);
        }, morphAt));
      }

      // Fade out after last stage completes its hold
      const fadeAt = stages.length * stageInterval;
      debugLog('ANNOUNCE_TRACE', `⏱️ OVERLAY: fade at +${fadeAt}ms, total=${fadeAt + FADE_OUT_MS}ms`);
      timers.push(setTimeout(() => {
        debugLog('ANNOUNCE_TRACE', `⏱️ OVERLAY: fade FIRED +${Date.now() - mountTime}ms (expected +${fadeAt}ms)`);
        setIsVisible(false);
        timers.push(setTimeout(() => {
          debugLog('ANNOUNCE_TRACE', `⏱️ OVERLAY: onComplete FIRED +${Date.now() - mountTime}ms (expected +${fadeAt + FADE_OUT_MS}ms)`);
          onComplete?.();
        }, FADE_OUT_MS));
      }, fadeAt));
    } else {
      // Standard: scramble in, hold, fade out
      debugLog('ANNOUNCE_TRACE', `⏱️ OVERLAY: fade at +${stageInterval}ms, total=${stageInterval + FADE_OUT_MS}ms`);
      timers.push(setTimeout(() => {
        debugLog('ANNOUNCE_TRACE', `⏱️ OVERLAY: fade FIRED +${Date.now() - mountTime}ms (expected +${stageInterval}ms)`);
        setIsVisible(false);
        timers.push(setTimeout(() => {
          debugLog('ANNOUNCE_TRACE', `⏱️ OVERLAY: onComplete FIRED +${Date.now() - mountTime}ms (expected +${stageInterval + FADE_OUT_MS}ms)`);
          onComplete?.();
        }, FADE_OUT_MS));
      }, stageInterval));
    }

    return () => timers.forEach(clearTimeout);
    // headingTarget intentionally excluded — it changes when stageIndex changes (driven by
    // timers inside this effect). Including it would cancel and re-schedule all timers on
    // every morph, causing later stages to barely display before the queue unmounts the overlay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete, markId, compound, stages]);

  // Log when isVisible actually changes
  useEffect(() => {
    if (isVisible && import.meta.env.DEV) {
      performance.mark(`${markId}-visible-true`);
      try {
        performance.measure(
          `${markId}-mount-to-visible`,
          `${markId}-component-mount`,
          `${markId}-visible-true`
        );
        const measure = performance.getEntriesByName(`${markId}-mount-to-visible`)[0];
        timingLog('[MODAL COMPONENT] Modal NOW VISIBLE', {
          phaseText: headingTarget,
          mountToVisibleMs: measure?.duration?.toFixed(2),
          blockingReason: 'none_modal_visible_on_screen'
        });
      } catch (e) {
        timingLog('[MODAL COMPONENT] Modal NOW VISIBLE', {
          phaseText: headingTarget,
          measureError: e.message,
          blockingReason: 'none_modal_visible_on_screen'
        });
      }
    }
  }, [isVisible, headingTarget, markId]);

  // DOM inspection after stage transitions — diagnose backgroundClip: text compositor bug
  useEffect(() => {
    if (!headingRef.current) return;
    const el = headingRef.current;
    const timer = setTimeout(() => {
      const cs = getComputedStyle(el);
      debugLog('ANNOUNCE_TRACE', '🔍 H1 DOM INSPECTION', {
        stageIndex,
        textContent: el.textContent,
        backgroundClip: cs.backgroundClip,
        webkitTextFillColor: cs.webkitTextFillColor,
        background: cs.background?.substring(0, 80),
        variant: headingVariant,
        gradientIs: headingGradient === opponentGradientStyle ? 'opponent' : 'player',
        dimensions: `${el.offsetWidth}x${el.offsetHeight}`,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [stageIndex, headingVariant, headingGradient]);

  // Ref callback to detect when DOM element is actually created
  const handleContainerRef = (element) => {
    if (element && !containerRef.current) {
      containerRef.current = element;
      if (import.meta.env.DEV) {
        performance.mark(`${markId}-dom-element-created`);
      }
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
        {/* Background hex decorations */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
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

        {/* Text content — unified scramble rendering */}
        <div className="flex flex-col items-center">
          <h1
            key={headingVariant || 'player'}
            ref={headingRef}
            className="text-6xl font-orbitron font-black uppercase tracking-widest text-center"
            style={{ ...headingGradient, fontVariantNumeric: 'tabular-nums' }}
          >
            {displayHeading}
          </h1>

          {displaySubtitle && (
            <p className={`text-2xl font-orbitron font-medium uppercase tracking-wider text-center ${subtitleColorClass} mt-4`}>
              {displaySubtitle}
            </p>
          )}
        </div>

        {/* Decorative line beneath text */}
        <div
          className={`
            mt-8 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent
            transition-all duration-500
            ${isVisible ? 'w-96 opacity-100' : 'w-0 opacity-0'}
          `}
        />

        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
