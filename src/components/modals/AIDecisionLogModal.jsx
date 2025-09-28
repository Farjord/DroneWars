// ========================================
// AI DECISION LOG MODAL COMPONENT
// ========================================
// Modal that displays AI decision matrix with scores and logic breakdown

import React from 'react';
import { X } from 'lucide-react';

/**
 * AI DECISION LOG MODAL COMPONENT
 * Shows all actions the AI considered for its turn, the score it assigned, and the logic behind that score.
 * @param {Array} decisionLog - Array of AI decision entries with scores and logic
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} getLocalPlayerId - Function to get local player ID
 */
const AIDecisionLogModal = ({ decisionLog, show, onClose, getLocalPlayerId }) => {
  if (!show || !decisionLog) return null;

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
    <div className="modal-overlay">
      <div className="modal-container max-w-7xl">
        {onClose && (
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">AI Decision Matrix</h2>
        <p className="modal-text">
          This log shows all actions the AI considered for its turn, the score it assigned, and the logic behind that score.
        </p>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="p-2">Type</th>
                <th className="p-2">Instigator</th>
                <th className="p-2">Target</th>
                <th className="p-2 w-1/3">Logic Breakdown</th>
                <th className="p-2">Score</th>
                <th className="p-2">Chosen</th>
              </tr>
            </thead>
            <tbody>
              {decisionLog.sort((a,b) => b.score - a.score).map((action, index) => (
                <tr key={index} className={`border-b border-gray-700/50 ${action.isChosen ? 'bg-purple-900/50' : 'hover:bg-slate-700/50'}`}>
                  <td className="p-2 capitalize">{action.type ? action.type.replace('_', ' ') : 'Deploy'}</td>
                  <td className="p-2 text-purple-300">{action.instigator}</td>
                  <td className="p-2 text-cyan-300">{formatTarget(action)}</td>
                  <td className="p-2 text-gray-400 text-xs">{action.logic.join(' -> ')}</td>
                  <td className="p-2 font-bold text-lg">{action.score}</td>
                  <td className="p-2 text-center">{action.isChosen && <span className="text-yellow-400">✔</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="btn-continue">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIDecisionLogModal;