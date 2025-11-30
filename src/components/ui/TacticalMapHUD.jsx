// ========================================
// TACTICAL MAP HUD
// ========================================
// Overlay HUD for tactical map showing player stats and actions
// Provides quick access to inventory and extraction

import React from 'react';
import { ECONOMY } from '../../data/economyData.js';
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
 * TacticalMapHUD - Overlay HUD for tactical map screen
 *
 * Displays:
 * - Player ship hull per section (Bridge, Power Cell, Drone Control)
 * - Total ship hull
 * - Credits earned this run
 * - Loot collected
 * - (Detection meter moved to HexInfoPanel)
 * - Action buttons (inventory, extract/abandon)
 *
 * @param {Object} currentRunState - Current run state
 * @param {Array} shipSections - Ship sections array with hull data
 * @param {Function} onExtractClick - Extract button callback (at gate)
 * @param {Function} onAbandonClick - Abandon button callback (not at gate)
 * @param {Function} onInventoryClick - Inventory button callback
 */
function TacticalMapHUD({
  currentRunState,
  shipSections,
  onExtractClick,
  onAbandonClick,
  onInventoryClick
}) {
  const { creditsEarned, collectedLoot, playerPosition, insertionGate, mapData, shipSlotId } = currentRunState;

  // Extraction limit for Slot 0 (starter deck)
  const isStarterDeck = shipSlotId === 0;
  const extractionLimit = ECONOMY.STARTER_DECK_EXTRACTION_LIMIT || 3;
  const isOverLimit = isStarterDeck && collectedLoot.length > extractionLimit;

  // Check if player is at insertion gate
  const isAtInsertionGate = insertionGate &&
    playerPosition?.q === insertionGate.q &&
    playerPosition?.r === insertionGate.r;

  // Check if player is at ANY gate by matching coordinates against mapData.gates
  // Note: playerPosition is just {q, r} coordinates, not a hex object with type
  const isAtAnyGate = mapData?.gates?.some(gate =>
    gate.q === playerPosition?.q && gate.r === playerPosition?.r
  );

  // Extraction gate = at a gate BUT not the insertion gate
  const atExtractionGate = isAtAnyGate && !isAtInsertionGate;

  // Calculate totals from sections
  const totalHull = shipSections.reduce((sum, s) => sum + s.hull, 0);
  const totalMaxHull = shipSections.reduce((sum, s) => sum + s.maxHull, 0);
  const totalHullPercentage = totalMaxHull > 0 ? (totalHull / totalMaxHull) * 100 : 0;

  // Helper for hull color based on percentage
  const getHullColorClass = (percentage) => {
    if (percentage >= 70) return 'stat-value-healthy';
    if (percentage >= 40) return 'stat-value-warning';
    return 'stat-value-critical';
  };

  return (
    <div className="tactical-map-hud">
      {/* Top bar - Player stats */}
      <div className="hud-top">
        <div className="hud-stats-group">
          {/* Per-Section Hull */}
          {shipSections.map(section => {
            const pct = section.maxHull > 0 ? (section.hull / section.maxHull) * 100 : 0;
            return (
              <div key={section.id} className="hud-stat">
                <span className="stat-label">{section.type}</span>
                <span className={`stat-value ${getHullColorClass(pct)}`}>
                  {section.hull}/{section.maxHull}
                </span>
              </div>
            );
          })}

          {/* Total Hull */}
          <div className="hud-stat hud-stat-total">
            <span className="stat-label">Total</span>
            <span className={`stat-value ${getHullColorClass(totalHullPercentage)}`}>
              {totalHull}/{totalMaxHull}
            </span>
          </div>

          {/* Separator */}
          <div className="hud-stat-separator" />

          {/* Credits */}
          <div className="hud-stat">
            <span className="stat-label">Credits</span>
            <span className="stat-value stat-value-credits">
              {creditsEarned}
            </span>
          </div>

          {/* Loot */}
          <div className="hud-stat">
            <span className="stat-label">Loot</span>
            <span className="stat-value stat-value-loot">
              {collectedLoot.length}
            </span>
          </div>

          {/* Extraction Limit (only for Slot 0) */}
          {isStarterDeck && (
            <>
              <div className="hud-stat-separator" />
              <div className="hud-stat" title="Starter deck extraction limit">
                <span className="stat-label">Extract Limit</span>
                <span className={`stat-value ${isOverLimit ? 'stat-value-warning' : 'stat-value-healthy'}`}>
                  {Math.min(collectedLoot.length, extractionLimit)}/{extractionLimit}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom bar - Actions */}
      <div className="hud-bottom">
        <div className="hud-actions-group">
          {/* Inventory button */}
          <button
            onClick={onInventoryClick}
            className="btn-confirm flex items-center gap-2"
            title="View collected loot"
          >
            <IconInventory size={18} className="icon-inventory" />
            <span>Inventory ({collectedLoot.length})</span>
          </button>

          {/* Dynamic button: Extract at extraction gate, Abandon elsewhere */}
          {atExtractionGate ? (
            <button
              onClick={onExtractClick}
              className="btn-confirm flex items-center gap-2"
              title="Extract from the Eremos"
            >
              <IconExtract size={18} className="icon-extract" />
              <span>Extract</span>
            </button>
          ) : (
            <button
              onClick={onAbandonClick}
              className="btn-danger flex items-center gap-2"
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
