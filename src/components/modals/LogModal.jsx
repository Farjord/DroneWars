// ========================================
// LOG MODAL COMPONENT
// ========================================
// Full-screen modal for viewing game log
// Used in experimental battlefield layout

import React from 'react';
import DEV_CONFIG from '../../config/devConfig.js';

function LogModal({
  isOpen,
  onClose,
  gameLog,
  downloadLogAsCSV,
  setAiDecisionLogToShow
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Game Log</h2>
          <div className="flex gap-3">
            <button
              onClick={downloadLogAsCSV}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 text-sm rounded-lg transition-colors"
            >
              Download CSV
            </button>
            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 text-sm rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Log Table */}
        <div className="flex-grow overflow-y-auto bg-black/30 rounded-lg p-2">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="p-2">Rnd</th>
                <th className="p-2">Timestamp (UTC)</th>
                <th className="p-2">Player</th>
                <th className="p-2">Action</th>
                <th className="p-2">Source</th>
                <th className="p-2">Target</th>
                <th className="p-2">Outcome</th>
                {DEV_CONFIG.features.logDebugSource && (
                  <th className="p-2 text-[10px] text-gray-500">Debug Source</th>
                )}
                {DEV_CONFIG.features.aiDecisionDrillDown && (
                  <th className="p-2"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {gameLog.map((entry, index) => (
                <tr key={index} className="border-b border-gray-700/50 hover:bg-slate-700/50">
                  <td className="p-2 font-bold">{entry.round}</td>
                  <td className="p-2 text-gray-500">
                    {new Date(entry.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC' })}
                  </td>
                  <td className="p-2 text-cyan-300">{entry.player}</td>
                  <td className="p-2 text-yellow-300">{entry.actionType}</td>
                  <td className="p-2">{entry.source}</td>
                  <td className="p-2">{entry.target}</td>
                  <td className="p-2 text-gray-400">{entry.outcome}</td>
                  {DEV_CONFIG.features.logDebugSource && (
                    <td className="p-2 text-[10px] text-gray-500">{entry.debugSource}</td>
                  )}
                  {DEV_CONFIG.features.aiDecisionDrillDown && (
                    <td className="p-2 text-center">
                      {entry.aiDecisionContext && (
                        <button
                          onClick={() => setAiDecisionLogToShow(entry.aiDecisionContext)}
                          className="text-gray-400 hover:text-white"
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
    </div>
  );
}

export default LogModal;
