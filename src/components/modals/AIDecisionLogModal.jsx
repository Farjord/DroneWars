// ========================================
// AI DECISION LOG MODAL COMPONENT
// ========================================
// Modal that displays AI decision matrix with scores and logic breakdown

import React from 'react';
import { Brain, Download } from 'lucide-react';
import { exportSingleDecision } from '../../utils/csvExport.js';

/**
 * AI DECISION LOG MODAL COMPONENT
 * Shows all actions the AI considered for its turn, the score it assigned, and the logic behind that score.
 * @param {Array} decisionLog - Array of AI decision entries with scores and logic
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} getLocalPlayerId - Function to get local player ID
 */
const AIDecisionLogModal = ({ decisionLog, show, onClose, getLocalPlayerId, gameState }) => {
  if (!show || !decisionLog) return null;

  // Handler for exporting this decision to CSV
  const handleExportDecision = () => {
    // Infer phase from decision types
    const hasDeployType = decisionLog.some(d => d.type === 'deploy' || !d.type);
    const phase = hasDeployType ? 'deployment' : 'action';

    // Get turn from game state if available
    const turn = gameState?.turn || 'unknown';
    const gameTimestamp = new Date().toISOString();

    exportSingleDecision({
      decisions: decisionLog,
      phase,
      turn,
      gameTimestamp,
      gameState: gameState || {}
    });
  };

  // Helper to format the target display
  const formatTarget = (action) => {
    // Handle new, simpler deployment logs
    if (action.type === 'deploy' || !action.target) {
      return action.targetName;
    }

    // Handle attack display format
    if (action.type === 'attack') {
      const formattedName = action.target.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      return `${formattedName} (Lane ${action.attacker.lane.slice(-1)})`;
    }

    // Handle existing action logs
    const ownerPrefix = action.target.owner === getLocalPlayerId() ? 'Player' : 'AI';
    if (String(action.target.id).startsWith('lane')) {
      return `${ownerPrefix} Lane ${action.target.id.slice(-1)}`;
    }
    return `${ownerPrefix}: ${action.targetName}`;
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        style={{ maxWidth: '1400px', width: '95vw', height: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Brain size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">AI Decision Matrix</h2>
            <p className="dw-modal-header-subtitle">{decisionLog.length} actions evaluated</p>
          </div>
          <button
            className="dw-btn dw-btn-secondary"
            onClick={handleExportDecision}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Export this decision to CSV"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Body */}
        <div className="dw-modal-body" style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
          <p className="dw-modal-text" style={{ marginBottom: '12px' }}>
            This log shows all actions the AI considered for its turn, the score it assigned, and the logic behind that score.
          </p>
          <div style={{ height: 'calc(100% - 40px)', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--modal-border)' }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--modal-surface)' }}>
                <tr>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Type</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Instigator</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Target</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)', width: '35%' }}>Logic Breakdown</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Score</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)', textAlign: 'center' }}>Chosen</th>
                </tr>
              </thead>
              <tbody>
                {decisionLog.sort((a,b) => b.score - a.score).map((action, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid var(--modal-border)',
                      background: action.isChosen ? 'rgba(168, 85, 247, 0.2)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 12px', textTransform: 'capitalize', color: 'var(--modal-text-primary)' }}>
                      {action.type ? action.type.replace('_', ' ') : 'Deploy'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#c084fc' }}>{action.instigator}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--modal-theme)' }}>{formatTarget(action)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--modal-text-secondary)', fontSize: '12px' }}>{action.logic.join(' → ')}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', fontSize: '16px', color: 'var(--modal-text-primary)' }}>{action.score}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{action.isChosen && <span style={{ color: '#facc15' }}>✔</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIDecisionLogModal;