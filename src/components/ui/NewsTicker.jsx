/**
 * NewsTicker Component
 * Displays a scrolling news-style ticker with sector intel messages
 */

import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { tickerMessageService } from '../../logic/ticker/TickerMessageService';
import { TICKER_CONFIG } from '../../logic/ticker/tickerConfig';
import { debugLog } from '../../utils/debugLogger.js';
import '../../styles/news-ticker.css';

/**
 * NewsTicker - Scrolling intel feed component
 * Used in Hangar (with maps) and Tactical Map (with direct messages)
 *
 * @param {Object} props
 * @param {Array} props.maps - Array of generated map objects to analyze (for Hangar)
 * @param {Array} props.messages - Direct message array to display (for Tactical)
 * @param {number} props.scrollDuration - Optional override for scroll duration in seconds
 * @param {string} props.label - Optional label text (default: "INTEL")
 */
const NewsTicker = ({ maps = [], messages: propMessages = null, scrollDuration, label = 'INTEL' }) => {
  const [messages, setMessages] = useState([]);
  const [calculatedDuration, setCalculatedDuration] = useState(null);
  const [scrollDistance, setScrollDistance] = useState(null);
  const contentRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Log mount
  useEffect(() => {
    debugLog('TICKER', 'NewsTicker MOUNTED');
    return () => debugLog('TICKER', 'NewsTicker UNMOUNTED');
  }, []);

  // Generate messages when maps change OR use provided messages directly
  useEffect(() => {
    if (propMessages !== null) {
      // Direct messages provided (tactical map mode)
      debugLog('TICKER', 'Using provided messages', { count: propMessages.length });
      setMessages(propMessages);
    } else {
      // Generate from maps (hangar mode)
      debugLog('TICKER', 'Maps prop changed, generating messages', { mapCount: maps.length });
      const generatedMessages = tickerMessageService.generateMessages(maps);
      debugLog('TICKER', 'Setting messages state', { count: generatedMessages.length });
      setMessages(generatedMessages);
    }
  }, [maps, propMessages]);

  // Calculate duration dynamically based on content width
  // This ensures all messages scroll through before the animation loops
  useLayoutEffect(() => {
    if (contentRef.current && scrollContainerRef.current && messages.length > 0) {
      const contentWidth = contentRef.current.scrollWidth;
      const containerWidth = scrollContainerRef.current.clientWidth;

      // Scroll speed in pixels per second - comfortable reading pace
      const SCROLL_SPEED = 100;
      const halfWidth = contentWidth / 2;
      const newDuration = halfWidth / SCROLL_SPEED; // duration scales with content

      setCalculatedDuration(newDuration);
      setScrollDistance(halfWidth); // Store for CSS variable

      debugLog('TICKER', 'Calculated duration', {
        contentWidth,
        halfWidth,
        containerWidth,
        scrollSpeed: SCROLL_SPEED,
        duration: newDuration,
        messageCount: messages.length
      });
    }
  }, [messages]);

  // Use calculated duration, with fallbacks
  const duration = scrollDuration || calculatedDuration || TICKER_CONFIG.scrollDuration;

  // Animation state is tracked after isReady is determined
  const isReady = calculatedDuration !== null && scrollDistance !== null;

  // Diagnostic logging - track actual animation position and speed (dev only)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!contentRef.current || !isReady) return;

    let lastTranslateX = null;
    let lastTime = Date.now();

    const logInterval = setInterval(() => {
      const el = contentRef.current;
      if (!el) return;

      const computedStyle = window.getComputedStyle(el);
      const transform = computedStyle.transform;
      const animationName = computedStyle.animationName;
      const animationDuration = computedStyle.animationDuration;
      const animationPlayState = computedStyle.animationPlayState;

      // Parse the transform matrix to get actual X position
      let translateX = 0;
      if (transform && transform !== 'none') {
        const matrix = transform.match(/matrix.*\((.+)\)/);
        if (matrix) {
          const values = matrix[1].split(', ');
          translateX = parseFloat(values[4]) || 0;
        }
      }

      // Calculate actual speed
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      let actualSpeed = 0;
      if (lastTranslateX !== null && elapsed > 0) {
        actualSpeed = Math.abs(translateX - lastTranslateX) / elapsed;
      }
      lastTranslateX = translateX;
      lastTime = now;

      debugLog('TICKER', 'Animation state', {
        translateX: Math.round(translateX),
        actualSpeed: Math.round(actualSpeed),
        animationName,
        animationDuration,
        animationPlayState,
        contentWidth: el.scrollWidth,
        expectedEndX: Math.round(-(el.scrollWidth / 2))
      });
    }, 1000); // Log every second

    return () => clearInterval(logInterval);
  }, [isReady]);

  // Duplicate messages for seamless infinite scroll
  const displayMessages = useMemo(() => {
    if (messages.length === 0) return [];
    // Double the messages for seamless loop
    return [...messages, ...messages];
  }, [messages]);

  // Get CSS class for message type
  const getMessageClass = (type) => {
    return `news-ticker__message news-ticker__message--${type || 'info'}`;
  };

  // Get prefix for message type
  const getMessagePrefix = (type) => {
    const config = TICKER_CONFIG.messageTypes[type];
    return config?.prefix || '';
  };

  // Don't render if no messages
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="news-ticker">
      <div className="news-ticker__label">
        {label}
      </div>
      <div ref={scrollContainerRef} className="news-ticker__scroll-container">
        <div
          ref={contentRef}
          className="news-ticker__content"
          style={{
            '--ticker-duration': `${duration}s`,
            '--scroll-distance': scrollDistance ? `-${scrollDistance}px` : '-50%',
            animationPlayState: isReady ? 'running' : 'paused'
          }}
        >
          {displayMessages.map((message, index) => (
            <React.Fragment key={`${message.id}-${index}`}>
              <span className={getMessageClass(message.type)}>
                {getMessagePrefix(message.type) && (
                  <span className="news-ticker__message-prefix">
                    {getMessagePrefix(message.type)}
                  </span>
                )}
                {message.text}
              </span>
              <span className="news-ticker__divider">
                {TICKER_CONFIG.divider}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
