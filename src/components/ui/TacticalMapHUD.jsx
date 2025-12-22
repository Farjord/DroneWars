// ========================================
// TACTICAL MAP HUD
// ========================================
// Overlay HUD for tactical map - bottom action buttons only
// Stats have been moved to the header bar in TacticalMapScreen

import React from 'react';
import './TacticalMapHUD.css';

// ========================================
// SVG ICON COMPONENTS
// ========================================

// Diamond/Cube icon for Inventory
const IconInventory = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M12 6L18 12L12 18L6 12L12 6Z" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
  </svg>
);

// Hexagon portal icon for Extract
const IconExtract = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.8" />
  </svg>
);

// Warning/Abandon icon
const IconAbandon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 9V13M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.29 3.86L1.82 18C1.64 18.3 1.55 18.65 1.55 19C1.55 19.35 1.64 19.7 1.82 20C2 20.3 2.26 20.56 2.58 20.74C2.9 20.92 3.26 21.01 3.64 21H20.36C20.74 21.01 21.1 20.92 21.42 20.74C21.74 20.56 22 20.3 22.18 20C22.36 19.7 22.45 19.35 22.45 19C22.45 18.65 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.27 3.32 12.95 3.15C12.63 2.98 12.27 2.89 11.9 2.89C11.53 2.89 11.17 2.98 10.85 3.15C10.53 3.32 10.27 3.56 10.09 3.86L10.29 3.86Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

/**
 * TacticalMapHUD - Bottom action buttons for tactical map screen
 *
 * Note: Stats display has been moved to the header bar in TacticalMapScreen.jsx
 * This component now only handles the bottom action buttons.
 *
 * @param {Object} currentRunState - Current run state
 * @param {Function} onExtractClick - Extract button callback (at gate)
 * @param {Function} onAbandonClick - Abandon button callback (not at gate)
 * @param {Function} onInventoryClick - Inventory button callback
 */
function TacticalMapHUD({
  currentRunState,
  onExtractClick,
  onAbandonClick,
  onInventoryClick
}) {
  const { collectedLoot, playerPosition, insertionGate, mapData } = currentRunState;

  // Check if player is at insertion gate
  const isAtInsertionGate = insertionGate &&
    playerPosition?.q === insertionGate.q &&
    playerPosition?.r === insertionGate.r;

  // Check if player is at ANY gate by matching coordinates against mapData.gates
  const isAtAnyGate = mapData?.gates?.some(gate =>
    gate.q === playerPosition?.q && gate.r === playerPosition?.r
  );

  // Extraction gate = at a gate BUT not the insertion gate
  const atExtractionGate = isAtAnyGate && !isAtInsertionGate;

  return (
    <div className="tactical-map-hud">
      {/* Bottom bar - Actions */}
      <div className="hud-bottom">
        <div className="hud-actions-group">
          {/* Inventory button */}
          <button
            onClick={onInventoryClick}
            className="dw-btn dw-btn-confirm flex items-center gap-2"
            title="View collected loot"
          >
            <IconInventory size={18} className="icon-inventory" />
            <span>Inventory ({collectedLoot.length})</span>
          </button>

          {/* Dynamic button: Extract at extraction gate, Abandon elsewhere */}
          {atExtractionGate ? (
            <button
              onClick={onExtractClick}
              className="dw-btn dw-btn-success flex items-center gap-2"
              title="Extract from the Eremos"
            >
              <IconExtract size={18} className="icon-extract" />
              <span>Extract</span>
            </button>
          ) : (
            <button
              onClick={onAbandonClick}
              className="dw-btn dw-btn-danger flex items-center gap-2"
              title="Abandon run (MIA)"
            >
              <IconAbandon size={18} className="icon-abandon" />
              <span>Abandon Run</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TacticalMapHUD;
