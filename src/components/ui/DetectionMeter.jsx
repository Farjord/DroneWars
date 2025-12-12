// ========================================
// DETECTION METER
// ========================================
// Visual meter showing detection 0-100% for Exploring the Eremos mode
// Color-coded by threshold: Green (0-49%), Yellow (50-79%), Red (80-100%)

import React, { useState, useRef } from 'react';
import { Info } from 'lucide-react';
import { HEX_INFO_HELP_TEXT } from '../../data/hexInfoHelpText.js';
import './DetectionMeter.css';

// ========================================
// SVG ICON COMPONENTS
// ========================================

// Checkmark icon for low risk
const IconCheck = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Warning triangle icon
const IconWarning = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 3L22 21H2L12 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </svg>
);

// ========================================
// STAT LABEL WITH TOOLTIP
// ========================================

/**
 * StatLabel - Label with info icon and hover tooltip
 * Uses fixed positioning to escape overflow clipping
 */
const StatLabel = ({ text, helpKey }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const wrapperRef = useRef(null);
  const helpContent = helpKey ? HEX_INFO_HELP_TEXT[helpKey] : null;

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const tooltipWidth = 200;
      const padding = 8;

      let left = rect.left + rect.width / 2;

      // Check right edge overflow
      if (left + tooltipWidth / 2 > window.innerWidth - padding) {
        left = window.innerWidth - padding - tooltipWidth / 2;
      }

      // Check left edge overflow
      if (left - tooltipWidth / 2 < padding) {
        left = padding + tooltipWidth / 2;
      }

      setTooltipStyle({
        left,
        top: rect.bottom + 8,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <span className="meter-label">
      {text}
      {helpContent && (
        <span
          ref={wrapperRef}
          className="stat-info-wrapper"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Info size={12} className="stat-info-icon" />
          {showTooltip && (
            <span className="stat-tooltip" style={tooltipStyle}>
              {helpContent.description}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

/**
 * DetectionMeter - Displays detection level with color-coded meter
 *
 * Thresholds:
 * - 0-49%: Low Risk (Green)
 * - 50-79%: Medium Risk (Yellow)
 * - 80-100%: CRITICAL (Red)
 *
 * @param {number} detection - Current detection (0-100)
 */
function DetectionMeter({ detection }) {
  /**
   * Get color class based on threshold
   * @returns {string} CSS class name
   */
  const getColorClass = () => {
    if (detection < 50) return 'meter-low'; // Green
    if (detection < 80) return 'meter-medium'; // Yellow
    return 'meter-high'; // Red
  };

  /**
   * Get threshold label for display
   * @returns {string} Human-readable label
   */
  const getThresholdLabel = () => {
    if (detection < 50) return 'Low Risk';
    if (detection < 80) return 'Medium Risk';
    return 'CRITICAL';
  };

  /**
   * Get warning icon based on threshold
   * @returns {JSX.Element} Icon component
   */
  const getWarningIcon = () => {
    if (detection < 50) return <IconCheck size={14} className="icon-safe" />;
    return <IconWarning size={14} className={detection < 80 ? 'icon-warning' : 'icon-critical'} />;
  };

  return (
    <div className="detection-meter">
      {/* Header with label and value */}
      <div className="meter-header">
        <StatLabel text="Threat Level" helpKey="threatLevel" />
        <span className={`meter-value ${getColorClass()}`}>
          {getThresholdLabel()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="meter-bar-container">
        <div
          className={`meter-bar-fill ${getColorClass()}`}
          style={{ width: `${Math.min(100, detection)}%` }}
        />

        {/* Threshold markers */}
        <div className="meter-threshold-marker" style={{ left: '50%' }} />
        <div className="meter-threshold-marker" style={{ left: '80%' }} />
      </div>

      {/* Warning message for critical threshold */}
      {detection >= 80 && (
        <div className="meter-warning">
          <IconWarning size={14} className="icon-critical" />
          <span>WARNING: Approaching MIA threshold</span>
        </div>
      )}
    </div>
  );
}

export default DetectionMeter;
