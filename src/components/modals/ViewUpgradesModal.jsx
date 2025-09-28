// ========================================
// VIEW UPGRADES MODAL COMPONENT
// ========================================
// Displays all upgrades currently applied to a specific drone type
// Shows upgrade details in a scrollable list format

import React from 'react';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';

/**
 * VIEW UPGRADES MODAL COMPONENT
 * Displays all upgrades currently applied to a specific drone type.
 * Shows upgrade details in a scrollable list format.
 * @param {Object} modalData - Contains drone name and upgrades array
 * @param {Function} onClose - Callback when modal is closed
 */
const ViewUpgradesModal = ({ modalData, onClose }) => {
  const { droneName, upgrades } = modalData;

  return (
      <GamePhaseModal
          title={`Applied Upgrades: ${droneName}`}
          text="The following permanent upgrades have been applied to this drone type."
          onClose={onClose}
      >
          <div className="my-4 p-2 bg-black/20 rounded-lg max-h-80 overflow-y-auto space-y-3">
              {upgrades.length > 0 ? (
                  upgrades.map(upgrade => (
                      <div key={upgrade.instanceId} className="bg-slate-800/70 p-3 rounded-lg border border-purple-500/50">
                          <h4 className="font-bold text-purple-300">{upgrade.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{upgrade.description}</p>
                      </div>
                  ))
              ) : (
                  <p className="text-center text-gray-500 italic">No upgrades applied.</p>
              )}
          </div>
          <div className="flex justify-center mt-6">
              <button
                  onClick={onClose}
                  className="btn-continue"
              >
                  Close
              </button>
          </div>
      </GamePhaseModal>
  );
};

export default ViewUpgradesModal;