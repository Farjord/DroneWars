// ========================================
// EXTRACTION CONFIRM MODAL
// ========================================
// Modal for confirming extraction with blockade risk display
// Shows scanning animation and handles blockade encounters

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Target, AlertTriangle, Shield, Zap, KeyRound } from 'lucide-react';
import ExtractionController from '../../logic/singlePlayer/ExtractionController.js';
import './ExtractionConfirmModal.css';

// Hexagon portal icon for Extract (from TacticalMapHUD)
const IconExtract = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.8" />
  </svg>
);

// Scan messages (mixed navigation/stealth themed)
const scanMessages = [
  'Calculating exit vector...',
  'Scanning for patrols...',
  'Avoiding detection zones...',
  'Locking extraction coordinates...',
  'Securing escape route...',
  'Evading hostile signatures...',
];

/**
 * ExtractionConfirmModal - Confirmation modal for extraction with scanning animation
 *
 * @param {number} detection - Current detection level (blockade risk percentage)
 * @param {Function} onCancel - Callback when cancel is clicked
 * @param {Function} onExtract - Callback when extraction succeeds (no blockade)
 * @param {Function} onExtractWithItem - Callback when using Clearance Override item
 * @param {number} extractItemCount - Number of Clearance Override items available
 * @param {Function} onEngageCombat - Callback for standard deploy when blockade
 * @param {Function} onQuickDeploy - Callback for quick deploy when blockade
 * @param {Array} validQuickDeployments - Available quick deployment options
 */
function ExtractionConfirmModal({
  detection,
  onCancel,
  onExtract,
  onExtractWithItem,
  extractItemCount = 0,
  onEngageCombat,
  onQuickDeploy,
  validQuickDeployments = []
}) {
  // Modal states: 'confirmation' | 'scanning' | 'blocked'
  const [modalState, setModalState] = useState('confirmation');
  const [scanProgress, setScanProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const scanIntervalRef = useRef(null);
  const messageIntervalRef = useRef(null);

  // Get risk color class based on detection level
  const getRiskColorClass = () => {
    if (detection >= 80) return 'extraction-risk-critical';
    if (detection >= 50) return 'extraction-risk-warning';
    return '';
  };

  // Handle extract button click - start scanning
  const handleExtract = useCallback(() => {
    setModalState('scanning');
    setScanProgress(0);
    setCurrentMessageIndex(0);

    // Animate progress bar over 2 seconds
    const duration = 2000;
    const interval = 50;
    const steps = duration / interval;
    let step = 0;

    scanIntervalRef.current = setInterval(() => {
      step++;
      const progress = Math.min((step / steps) * 100, 100);
      setScanProgress(progress);

      if (step >= steps) {
        clearInterval(scanIntervalRef.current);
        clearInterval(messageIntervalRef.current);

        // Roll for blockade
        const blocked = ExtractionController.checkBlockade(detection);

        if (blocked) {
          setModalState('blocked');
        } else {
          // Safe extraction - call callback
          onExtract?.();
        }
      }
    }, interval);

    // Cycle through messages
    messageIntervalRef.current = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % scanMessages.length);
    }, 400);
  }, [detection, onExtract]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, []);

  // Render confirmation state
  const renderConfirmation = () => (
    <>
      {/* Header */}
      <div className="dw-modal-header">
        <div className="dw-modal-header-icon" style={{ color: 'var(--modal-action)' }}>
          <IconExtract size={32} />
        </div>
        <div className="dw-modal-header-info">
          <h2 className="dw-modal-header-title">EXTRACTION POINT</h2>
          <p className="dw-modal-header-subtitle">Prepare to leave the Eremos</p>
        </div>
      </div>

      {/* Body */}
      <div className="dw-modal-body">
        {/* Blockade Risk Display */}
        <div className="extraction-risk-container">
          <div className="extraction-risk-label">Extraction Blockade Chance</div>
          <div className={`extraction-risk-value ${getRiskColorClass()}`}>
            {Math.round(detection)}%
          </div>
          <div className="extraction-risk-bar">
            <div
              className={`extraction-risk-fill ${getRiskColorClass()}`}
              style={{ width: `${Math.min(detection, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning text */}
        <p className="extraction-warning-text">
          Enemy patrols may intercept your extraction. Higher detection increases blockade chance.
        </p>

        {/* Clearance Override option */}
        {extractItemCount > 0 && onExtractWithItem && (
          <div className="dw-modal-info-box" style={{ marginTop: '16px', background: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} style={{ color: '#06b6d4' }} />
                <span style={{ color: '#06b6d4', fontSize: '13px' }}>
                  Clearance Override available ({extractItemCount})
                </span>
              </div>
              <button
                onClick={onExtractWithItem}
                className="dw-btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'rgba(6, 182, 212, 0.2)',
                  borderColor: '#06b6d4',
                  color: '#06b6d4'
                }}
              >
                Use Override
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Bypass the blockade check and extract safely. Consumes 1 item.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="dw-modal-actions">
        <button className="dw-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="dw-btn-confirm" onClick={handleExtract}>
          <IconExtract size={18} />
          Extract
        </button>
      </div>
    </>
  );

  // Render scanning state
  const renderScanning = () => (
    <>
      {/* Header */}
      <div className="dw-modal-header">
        <div className="dw-modal-header-icon extraction-scanning-icon" style={{ color: 'var(--modal-action)' }}>
          <IconExtract size={32} />
        </div>
        <div className="dw-modal-header-info">
          <h2 className="dw-modal-header-title">INITIATING EXTRACTION</h2>
          <p className="dw-modal-header-subtitle">Please wait...</p>
        </div>
      </div>

      {/* Body */}
      <div className="dw-modal-body">
        {/* Scan Progress */}
        <div className="extraction-scan-container">
          <div className="extraction-scan-label">SCANNING FOR PATROLS...</div>
          <div className="extraction-scan-bar" data-testid="extraction-progress-bar">
            <div
              className="extraction-scan-fill"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="extraction-scan-percent" data-testid="progress-percent">
            {Math.round(scanProgress)}%
          </div>
        </div>

        {/* Current scan message */}
        <p className="extraction-scan-message" data-testid="scan-message">
          {scanMessages[currentMessageIndex]}
        </p>
      </div>

      {/* No actions during scanning */}
      <div className="dw-modal-actions">
        {/* Buttons hidden during scan */}
      </div>
    </>
  );

  // Render blocked state
  const renderBlocked = () => (
    <>
      {/* Header */}
      <div className="dw-modal-header">
        <div className="dw-modal-header-icon" style={{ color: 'var(--modal-danger)' }}>
          <AlertTriangle size={32} />
        </div>
        <div className="dw-modal-header-info">
          <h2 className="dw-modal-header-title" style={{ color: 'var(--modal-danger)' }}>
            BLOCKADE DETECTED
          </h2>
          <p className="dw-modal-header-subtitle">Enemy forces blocking extraction</p>
        </div>
      </div>

      {/* Body */}
      <div className="dw-modal-body">
        {/* Alert Box */}
        <div className="dw-modal-info-box extraction-blocked-alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Target size={28} style={{ color: 'var(--modal-danger)' }} />
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)', textTransform: 'uppercase' }}>
                Alert
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--modal-danger)' }}>
                HOSTILE CONTACT DETECTED
              </p>
            </div>
          </div>
        </div>

        <p className="extraction-blocked-text">
          Enemy forces are blocking your extraction route. Engage to break through.
        </p>

        {/* Cannot escape notice */}
        <p className="extraction-no-escape-text" style={{
          marginTop: '12px',
          fontSize: '12px',
          color: 'rgba(239, 68, 68, 0.8)',
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          You cannot escape this encounter.
        </p>
      </div>

      {/* Actions */}
      <div className="dw-modal-actions">
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
      </div>
    </>
  );

  return (
    <div className="dw-modal-overlay">
      <div
        className={`dw-modal-content dw-modal--full ${modalState === 'blocked' ? 'dw-modal--danger' : 'dw-modal--action'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {modalState === 'confirmation' && renderConfirmation()}
        {modalState === 'scanning' && renderScanning()}
        {modalState === 'blocked' && renderBlocked()}
      </div>
    </div>
  );
}

export default ExtractionConfirmModal;
