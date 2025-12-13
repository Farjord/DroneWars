/**
 * TacticalTicker Component
 * Wrapper for NewsTicker that shows scanning animation during movement
 * and tactical intelligence messages when stationary
 */

import React, { useState, useEffect, useRef } from 'react';
import NewsTicker from './NewsTicker.jsx';
import { generateAllTacticalMessages } from '../../logic/ticker/generators/tacticalGenerators.js';
import '../../styles/news-ticker.css';

/**
 * TacticalTicker - Tactical map intel feed with scanning mode
 *
 * @param {Object} props
 * @param {boolean} props.isMoving - Whether the player's ship is currently moving
 * @param {Object} props.currentRunState - Current run state for message generation
 */
const TacticalTicker = ({ isMoving, currentRunState }) => {
  const [messages, setMessages] = useState([]);
  const [showScanning, setShowScanning] = useState(false);
  const wasMovingRef = useRef(isMoving);

  // Track movement state and regenerate messages when movement stops
  useEffect(() => {
    if (isMoving) {
      // Start scanning mode
      setShowScanning(true);
    } else if (wasMovingRef.current && !isMoving) {
      // Movement just stopped - regenerate messages
      const newMessages = generateAllTacticalMessages(currentRunState);
      setMessages(newMessages);
      setShowScanning(false);
    } else if (!wasMovingRef.current && !isMoving && messages.length === 0) {
      // Initial load when not moving - generate messages
      const newMessages = generateAllTacticalMessages(currentRunState);
      setMessages(newMessages);
    }

    wasMovingRef.current = isMoving;
  }, [isMoving, currentRunState]);

  // Generate initial messages on mount
  useEffect(() => {
    if (!isMoving && currentRunState) {
      const initialMessages = generateAllTacticalMessages(currentRunState);
      setMessages(initialMessages);
    }
  }, []); // Only on mount

  // Render scanning mode
  if (showScanning) {
    return (
      <div className="news-ticker tactical-ticker--scanning">
        <div className="news-ticker__label">
          SCAN
        </div>
        <div className="tactical-ticker__scanning-content">
          <span className="tactical-ticker__scanning-text">
            SCANNING SECTOR
          </span>
          <span className="tactical-ticker__scanning-dots">...</span>
        </div>
      </div>
    );
  }

  // Render normal ticker with tactical messages
  return (
    <NewsTicker
      messages={messages}
      label="INTEL"
    />
  );
};

export default TacticalTicker;
