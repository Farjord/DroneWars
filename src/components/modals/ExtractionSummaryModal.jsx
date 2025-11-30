/**
 * ExtractionSummaryModal.jsx
 * Displays extraction results after successful run completion
 * Shows cards acquired, credits earned, and any drone damage
 */

import React from 'react';
import { CheckCircle, AlertTriangle, Star, X, Award, TrendingUp } from 'lucide-react';

/**
 * ExtractionSummaryModal - Shows extraction results
 *
 * @param {boolean} show - Whether to show the modal
 * @param {Object} summary - Extraction summary object
 * @param {Function} onContinue - Continue callback (return to hangar)
 */
function ExtractionSummaryModal({ show, summary, onContinue }) {
  if (!show || !summary) return null;

  const {
    cardsAcquired = 0,
    blueprintsAcquired = 0,
    creditsEarned = 0,
    dronesDamaged = [],
    finalHull = 0,
    maxHull = 0,
    hullPercent = 100,
    reputation = null
  } = summary;

  // Reputation display helpers
  const repGained = reputation?.repGained || 0;
  const leveledUp = reputation?.leveledUp || false;
  const newLevel = reputation?.newLevel || 1;
  const isStarterDeck = reputation?.isStarterDeck || false;

  // Hull color
  const getHullColor = () => {
    const pct = parseInt(hullPercent);
    if (pct >= 70) return 'var(--modal-success)';
    if (pct >= 40) return '#eab308';
    return 'var(--modal-danger)';
  };

  return (
    <div className="dw-modal-overlay">
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: 'var(--modal-success)' }}>
            <CheckCircle size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Extraction Complete</h2>
            <p className="dw-modal-header-subtitle">Mission Successful</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Stats Grid */}
          <div className="dw-modal-grid dw-modal-grid--2">
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">Cards Acquired</div>
              <div className="dw-modal-stat-value" style={{ color: 'var(--modal-action)' }}>
                {cardsAcquired}
              </div>
            </div>

            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">Credits Earned</div>
              <div className="dw-modal-stat-value" style={{ color: '#eab308' }}>
                +{creditsEarned}
              </div>
            </div>

            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">Final Hull</div>
              <div className="dw-modal-stat-value" style={{ color: getHullColor() }}>
                {finalHull}/{maxHull}
              </div>
            </div>

            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">Hull Status</div>
              <div className="dw-modal-stat-value" style={{ color: getHullColor() }}>
                {hullPercent}%
              </div>
            </div>
          </div>

          {/* Reputation Gained */}
          {reputation && (
            <div className="dw-modal-info-box" style={{
              marginTop: '16px',
              '--modal-theme': '#a855f7',
              '--modal-theme-bg': 'rgba(168, 85, 247, 0.08)',
              '--modal-theme-border': 'rgba(168, 85, 247, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Award size={24} style={{ color: '#a855f7' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                    Reputation Earned
                  </p>
                  <p style={{ margin: 0, fontWeight: 700, color: '#a855f7', fontSize: '18px' }}>
                    {isStarterDeck ? (
                      <span style={{ color: 'var(--modal-text-muted)', fontWeight: 400, fontSize: '14px' }}>
                        None (Starter Deck)
                      </span>
                    ) : (
                      `+${repGained.toLocaleString()}`
                    )}
                  </p>
                </div>
                {leveledUp && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    borderRadius: '6px',
                  }}>
                    <TrendingUp size={16} style={{ color: 'white' }} />
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>
                      Level {newLevel}!
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Blueprint Acquired (rare) */}
          {blueprintsAcquired > 0 && (
            <div className="dw-modal-info-box" style={{ marginTop: '16px', '--modal-theme': '#a855f7', '--modal-theme-bg': 'rgba(168, 85, 247, 0.08)', '--modal-theme-border': 'rgba(168, 85, 247, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Star size={24} style={{ color: '#a855f7' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)' }}>Rare Discovery</p>
                  <p style={{ margin: 0, fontWeight: 700, color: '#a855f7' }}>
                    {blueprintsAcquired} Blueprint{blueprintsAcquired > 1 ? 's' : ''} Acquired!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Drone Damage Warning */}
          {dronesDamaged.length > 0 && (
            <div className="dw-modal-info-box" style={{ marginTop: '16px', '--modal-theme': '#eab308', '--modal-theme-bg': 'rgba(234, 179, 8, 0.08)', '--modal-theme-border': 'rgba(234, 179, 8, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertTriangle size={24} style={{ color: '#eab308', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)' }}>Hull Damage Detected</p>
                  <p style={{ margin: '4px 0', fontWeight: 600, color: '#eab308' }}>
                    Damaged: {dronesDamaged.join(', ')}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-muted)' }}>
                    Visit the Repair Bay to restore damaged drones
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-confirm dw-btn--full" onClick={onContinue}>
            Return to Hangar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExtractionSummaryModal;
