// ========================================
// SALVAGE MODAL
// ========================================
// Modal for progressive POI salvage with escalating encounter risk
// Shows 1-5 slots based on zone, allows player to salvage one by one

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Target, Lock, CheckCircle, AlertTriangle, Scan, Shield, Zap, LogOut } from 'lucide-react';
import HiddenCard from '../ui/HiddenCard.jsx';
import { packTypes } from '../../data/cardPackData.js';
import './SalvageModal.css';

// Diamond/Cube icon for POIs (custom SVG)
const IconPOI = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M12 6L18 12L12 18L6 12L12 6Z" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
  </svg>
);

/**
 * SalvageModal - Progressive POI salvage interface
 *
 * @param {Object} salvageState - Current salvage state from SalvageController
 * @param {Object} tierConfig - Tier configuration
 * @param {number} detection - Current detection level
 * @param {Function} onSalvageSlot - Callback to attempt salvaging next slot
 * @param {Function} onLeave - Callback to leave POI (collect revealed items)
 * @param {Function} onEngageCombat - Callback when encounter triggered
 * @param {Function} onEscape - Callback to escape combat (takes damage, no rewards)
 * @param {Function} onQuit - Callback for MIA (quit when encounter triggered)
 */
function SalvageModal({
  salvageState,
  tierConfig,
  detection,
  onSalvageSlot,
  onLeave,
  onEngageCombat,
  onQuickDeploy,
  onEscape,
  validQuickDeployments = [],
  onQuit
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastRevealedSlot, setLastRevealedSlot] = useState(null);
  const scanIntervalRef = useRef(null);

  if (!salvageState) return null;

  const {
    poi,
    zone,
    totalSlots,
    slots,
    currentSlotIndex,
    currentEncounterChance,
    encounterTriggered
  } = salvageState;

  const poiData = poi?.poiData || {};

  // Get pack info for display
  const packInfo = poiData.rewardType ? packTypes[poiData.rewardType] : null;

  // Get pack description
  const getPackDescription = () => {
    if (!packInfo) return null;
    if (packInfo.cardCount.max === 0) {
      return `${packInfo.creditsRange.min}-${packInfo.creditsRange.max} credits`;
    }
    const cardType = packInfo.guaranteedTypes?.[0]?.toLowerCase() || 'mixed';
    return `${packInfo.cardCount.min}-${packInfo.cardCount.max} ${cardType} cards + credits`;
  };

  /**
   * Get threat level display based on detection
   */
  const getThreatDisplay = () => {
    if (detection >= 80) return { label: 'High Threat', color: '#ef4444' };
    if (detection >= 50) return { label: 'Medium Threat', color: '#f59e0b' };
    return { label: 'Low Threat', color: '#10b981' };
  };

  const threat = getThreatDisplay();

  /**
   * Handle salvage button click
   */
  const handleSalvage = useCallback(() => {
    if (isScanning || encounterTriggered || currentSlotIndex >= totalSlots) return;

    setIsScanning(true);
    setScanProgress(0);

    // Animate progress bar
    const duration = 1500; // 1.5 seconds
    const interval = 50;
    const steps = duration / interval;
    let step = 0;

    scanIntervalRef.current = setInterval(() => {
      step++;
      setScanProgress(Math.min((step / steps) * 100, 100));

      if (step >= steps) {
        clearInterval(scanIntervalRef.current);
        setIsScanning(false);
        setLastRevealedSlot(currentSlotIndex);

        // Trigger the actual salvage
        onSalvageSlot?.();
      }
    }, interval);
  }, [isScanning, encounterTriggered, currentSlotIndex, totalSlots, onSalvageSlot]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  /**
   * Render a single slot
   */
  const renderSlot = (slot, index) => {
    const isCurrentTarget = index === currentSlotIndex && !encounterTriggered;
    const isBeingScanned = isCurrentTarget && isScanning;

    let slotClass = 'salvage-slot';
    if (slot.revealed) {
      // Both card and salvageItem slots show a card back when revealed
      slotClass += slot.type === 'card' ? ' salvage-slot--card' : ' salvage-slot--salvage';
    } else if (isBeingScanned) {
      slotClass += ' salvage-slot--scanning';
    } else if (isCurrentTarget) {
      slotClass += ' salvage-slot--next';
    } else {
      slotClass += ' salvage-slot--locked';
    }

    return (
      <div key={index} className={slotClass}>
        <div className="salvage-slot-content">
          {slot.revealed ? (
            // Revealed slot - show card back for all types
            slot.type === 'card' ? (
              // Card slot: Show HiddenCard with rarity glow
              <div className="salvage-slot-card-back">
                <HiddenCard rarity={slot.content?.rarity || 'Common'} size="full" />
              </div>
            ) : (
              // Salvage item slot: Show gold HiddenCard
              <div className="salvage-slot-card-back">
                <HiddenCard variant="salvage" size="full" />
              </div>
            )
          ) : isBeingScanned ? (
            // Currently scanning
            <div className="salvage-slot-scanning">
              <Scan size={28} className="salvage-scan-icon" />
              <span className="salvage-slot-label">Scanning...</span>
            </div>
          ) : (
            // Locked slot
            <div className="salvage-slot-locked">
              <Lock size={28} />
              <span className="salvage-slot-label">?</span>
            </div>
          )}
        </div>
        <div className="salvage-slot-number">Slot {index + 1}</div>
      </div>
    );
  };

  /**
   * Determine which buttons to show
   */
  const canSalvage = !isScanning && !encounterTriggered && currentSlotIndex < totalSlots;
  const hasRevealedAny = slots.some(s => s.revealed);
  const allSlotsRevealed = currentSlotIndex >= totalSlots;

  return (
    <div className="dw-modal-overlay">
      <div className={`dw-modal-content dw-modal--full ${encounterTriggered ? 'dw-modal--danger' : 'dw-modal--action'}`} onClick={(e) => e.stopPropagation()}>
        {/* PoI Image */}
        {poiData.image && (
          <div className="salvage-poi-image">
            <img src={poiData.image} alt={poiData.name || 'Point of Interest'} />
          </div>
        )}

        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: poiData.color || 'var(--modal-action)' }}>
            <IconPOI size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{poiData.name || 'Unknown Location'}</h2>
            <p className="dw-modal-header-subtitle">{poiData.description || 'Point of Interest'}</p>
          </div>
        </div>

        {/* Pack Info */}
        {packInfo && (
          <div className="salvage-pack-info">
            <span className="salvage-pack-type" style={{ color: packInfo.color }}>
              {packInfo.name}
            </span>
            <span className="salvage-pack-desc">{getPackDescription()}</span>
          </div>
        )}

        {/* Body */}
        <div className="dw-modal-body">
          {/* Stats Row */}
          <div className="salvage-stats">
            <div className="salvage-stat">
              <span className="salvage-stat-label">ENCOUNTER</span>
              <span className="salvage-stat-value" style={{ color: currentEncounterChance >= 50 ? '#ef4444' : currentEncounterChance >= 30 ? '#f59e0b' : '#10b981' }}>
                {Math.round(currentEncounterChance)}%
              </span>
            </div>
            <div className="salvage-stat">
              <span className="salvage-stat-label">THREAT</span>
              <span className="salvage-stat-value" style={{ color: threat.color }}>
                {threat.label}
              </span>
            </div>
            <div className="salvage-stat">
              <span className="salvage-stat-label">DETECTION</span>
              <span className="salvage-stat-value">
                {detection.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Slot Grid */}
          <div className="salvage-slots-container">
            <div className="salvage-slots-grid" style={{ '--slot-count': totalSlots }}>
              {slots.map((slot, index) => renderSlot(slot, index))}
            </div>
          </div>

          {/* Scanning Progress Bar */}
          {isScanning && (
            <div className="salvage-scan-container">
              <div className="salvage-scan-label">SCANNING FOR THREATS...</div>
              <div className="salvage-scan-bar">
                <div
                  className="salvage-scan-fill"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="salvage-scan-percent">{Math.round(scanProgress)}%</div>
            </div>
          )}

          {/* Encounter Warning */}
          {encounterTriggered && (
            <div className="dw-modal-info-box" style={{
              marginTop: '16px',
              '--modal-theme': 'var(--modal-danger)',
              '--modal-theme-bg': 'var(--modal-danger-bg)',
              '--modal-theme-border': 'var(--modal-danger-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Target size={28} style={{ color: 'var(--modal-danger)' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)', textTransform: 'uppercase' }}>Alert</p>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--modal-danger)' }}>
                    HOSTILE CONTACT DETECTED
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info about leaving */}
          {hasRevealedAny && !encounterTriggered && !allSlotsRevealed && (
            <p className="salvage-info-text">
              {currentSlotIndex < totalSlots
                ? `${totalSlots - currentSlotIndex} slot${totalSlots - currentSlotIndex > 1 ? 's' : ''} remaining. Each salvage increases encounter chance.`
                : 'All slots salvaged.'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          {encounterTriggered ? (
            // Combat triggered - show abort, escape, or engage
            <>
              <button className="dw-btn-secondary" onClick={onQuit}>
                <AlertTriangle size={18} />
                Abort Mission
              </button>
              <button className="dw-btn-secondary" onClick={onEscape}>
                <LogOut size={18} />
                Escape
              </button>
              {validQuickDeployments.length > 0 ? (
                // Has quick deployments - show split buttons
                <>
                  <button className="dw-btn-secondary" onClick={onEngageCombat}>
                    <Shield size={18} />
                    Standard Deploy
                  </button>
                  <button className="dw-btn-danger" onClick={onQuickDeploy}>
                    <Zap size={18} />
                    Quick Deploy
                  </button>
                </>
              ) : (
                // No quick deployments - single engage button
                <button className="dw-btn-danger" onClick={onEngageCombat}>
                  <Target size={18} />
                  Engage Enemy
                </button>
              )}
            </>
          ) : allSlotsRevealed ? (
            // All slots done - only leave option
            <button className="dw-btn-confirm" onClick={onLeave}>
              <CheckCircle size={18} />
              Collect & Leave
            </button>
          ) : (
            // Normal salvage state
            <>
              <button className="dw-btn-secondary" onClick={onLeave}>
                {hasRevealedAny ? 'Leave with Loot' : 'Leave POI'}
              </button>
              <button
                className="dw-btn-confirm"
                onClick={handleSalvage}
                disabled={!canSalvage}
              >
                <Scan size={18} />
                {hasRevealedAny ? 'Continue Salvaging' : 'Salvage'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalvageModal;
