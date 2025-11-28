// ========================================
// LOG MODAL COMPONENT
// ========================================
// Full-screen modal for viewing game log
// Used in experimental battlefield layout

import React from 'react';
import { ScrollText, Download } from 'lucide-react';
import DEV_CONFIG from '../../config/devConfig.js';

function LogModal({
  isOpen,
  onClose,
  gameLog,
  downloadLogAsCSV,
  setAiDecisionLogToShow,
  onCardInfoClick
}) {
  if (!isOpen) return null;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        style={{ maxWidth: '1400px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <ScrollText size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Game Log</h2>
            <p className="dw-modal-header-subtitle">{gameLog.length} entries recorded</p>
          </div>
        </div>

        {/* Body - Log Table */}
        <div className="dw-modal-body" style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
          <div style={{ height: '100%', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--modal-border)' }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--modal-surface)' }}>
                <tr>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Rnd</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Timestamp (UTC)</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Player</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Action</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Source</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Target</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Outcome</th>
                  {DEV_CONFIG.features.logDebugSource && (
                    <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)', fontSize: '10px' }}>Debug Source</th>
                  )}
                  {DEV_CONFIG.features.aiDecisionDrillDown && (
                    <th style={{ padding: '10px', borderBottom: '1px solid var(--modal-border)' }}></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {gameLog.map((entry, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--modal-border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 'bold', color: 'var(--modal-text-primary)' }}>{entry.round}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--modal-text-secondary)' }}>
                      {new Date(entry.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC' })}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--modal-theme)' }}>{entry.player}</td>
                    <td style={{ padding: '8px 10px', color: '#facc15' }}>{entry.actionType}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--modal-text-primary)' }}>
                      {entry.source}
                      {entry.actionType === 'PLAY_CARD' && onCardInfoClick && (
                        <button
                          onClick={() => onCardInfoClick(entry.source)}
                          style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--modal-text-secondary)', cursor: 'pointer' }}
                          title="View Card Details"
                        >
                          ℹ️
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--modal-text-primary)' }}>{entry.target}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--modal-text-secondary)' }}>{entry.outcome}</td>
                    {DEV_CONFIG.features.logDebugSource && (
                      <td style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--modal-text-secondary)' }}>{entry.debugSource}</td>
                    )}
                    {DEV_CONFIG.features.aiDecisionDrillDown && (
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {entry.aiDecisionContext && (
                          <button
                            onClick={() => setAiDecisionLogToShow(entry.aiDecisionContext)}
                            style={{ background: 'none', border: 'none', color: 'var(--modal-text-secondary)', cursor: 'pointer' }}
                            title="Show AI Decision Logic"
                          >
                            ℹ️
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )).reverse()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
          <button
            className="dw-btn dw-btn-confirm"
            onClick={downloadLogAsCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogModal;
