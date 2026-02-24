import React, { useState, useRef } from 'react';
import { Info } from 'lucide-react';
import { getDroneDropInfo } from '../../logic/loot/blueprintDropCalculator.js';
import './BlueprintDropInfo.css';

const POI_NAMES = {
  'DRONE_BLUEPRINT_LIGHT': 'Light',
  'DRONE_BLUEPRINT_MEDIUM': 'Medium',
  'DRONE_BLUEPRINT_HEAVY': 'Heavy'
};

/**
 * BlueprintDropInfo Component
 * Displays an info icon with hover tooltip showing drop source information
 * Icon is positioned absolutely in top right corner of blueprint card (via parent)
 */
const BlueprintDropInfo = ({ drone }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const wrapperRef = useRef(null);

  const dropInfo = getDroneDropInfo(drone);

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const tooltipWidth = 240; // Wider for multiple POI types and tiers
      const padding = 8;

      // Smart positioning - handles viewport edge overflow
      let left = rect.left + rect.width / 2;
      if (left + tooltipWidth / 2 > window.innerWidth - padding) {
        left = window.innerWidth - padding - tooltipWidth / 2;
      }
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

  // Format tooltip content
  const formatDropSources = () => {
    if (dropInfo.sources.length === 0) {
      return <span className="no-sources">No longer available from POIs</span>;
    }

    // Group by POI type
    const groupedByPOI = dropInfo.sources.reduce((acc, source) => {
      if (!acc[source.poiType]) acc[source.poiType] = [];
      acc[source.poiType].push(source);
      return acc;
    }, {});

    return (
      <>
        {Object.entries(groupedByPOI).map(([poiType, sources], idx) => (
          <div key={poiType} className="tooltip-poi-group">
            <strong>{POI_NAMES[poiType]} POIs:</strong>
            <br />
            {sources.map(s => (
              <span key={s.tier}>
                  Tier {s.tier}: {(s.probability * 100).toFixed(1)}%
                <br />
              </span>
            ))}
            {idx < Object.entries(groupedByPOI).length - 1 && <br />}
          </div>
        ))}
        <div className="tooltip-pool-context">
          Pool: {dropInfo.poolSize} class {drone.class} {drone.rarity || 'Common'}s
        </div>
      </>
    );
  };

  return (
    <span
      ref={wrapperRef}
      className="blueprint-drop-info-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Info size={16} className="blueprint-drop-info-icon" />
      {showTooltip && (
        <div className="blueprint-drop-tooltip" style={tooltipStyle}>
          {formatDropSources()}
        </div>
      )}
    </span>
  );
};

export default BlueprintDropInfo;
