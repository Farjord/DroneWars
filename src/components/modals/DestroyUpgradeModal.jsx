// ========================================
// DESTROY UPGRADE MODAL COMPONENT
// ========================================
// Allows player to select and destroy an opponent's upgrade
// Groups upgrades by drone type for easy navigation

import React, { useState } from 'react';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';

/**
 * DESTROY UPGRADE MODAL COMPONENT
 * Allows player to select and destroy an opponent's upgrade.
 * Groups upgrades by drone type for easy navigation.
 * @param {Object} selectionData - Contains card, targets, and opponent state
 * @param {Function} onConfirm - Callback when upgrade destruction is confirmed
 * @param {Function} onCancel - Callback when action is cancelled
 */
const DestroyUpgradeModal = ({ selectionData, onConfirm, onCancel }) => {
  const { card, targets: upgradedDrones, opponentState } = selectionData;
  const [selectedUpgrade, setSelectedUpgrade] = useState(null); // e.g., { droneName: 'Scout Drone', instanceId: '...' }

  return (
      <GamePhaseModal
          title={`System Sabotage`}
          text="Select an enemy upgrade to destroy. The upgrade will be permanently removed."
          onClose={onCancel}
          maxWidthClass="max-w-4xl"
      >
          <div className="my-4 p-2 bg-black/20 rounded-lg max-h-[60vh] overflow-y-auto space-y-4">
              {upgradedDrones.length > 0 ? (
                  upgradedDrones.map(drone => {
                      const upgradesOnThisDrone = opponentState.appliedUpgrades[drone.name] || [];
                      return (
                          <div key={drone.id} className="bg-slate-800/70 p-3 rounded-lg border border-pink-500/50">
                              <h4 className="font-bold text-pink-300 mb-2">Enemy: {drone.name}</h4>
                              <div className="space-y-2">
                                  {upgradesOnThisDrone.map(upgrade => (
                                      <div
                                          key={upgrade.instanceId}
                                          onClick={() => setSelectedUpgrade({ droneName: drone.name, instanceId: upgrade.instanceId })}
                                          className={`p-2 rounded-md border-2 transition-all cursor-pointer
                                              ${selectedUpgrade?.instanceId === upgrade.instanceId
                                                  ? 'bg-red-700 border-red-400'
                                                  : 'bg-slate-900/50 border-slate-600 hover:bg-slate-700'}`
                                          }
                                      >
                                          <p className="font-semibold text-white">{upgrade.name}</p>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })
              ) : (
                  <p className="text-center text-gray-500 italic">The opponent has no active upgrades to destroy.</p>
              )}
          </div>

          <div className="flex justify-center gap-4 mt-6">
              <button
                  onClick={onCancel}
                  className="btn-cancel"
              >
                  Cancel
              </button>
              <button
                  onClick={() => onConfirm(card, selectedUpgrade)}
                  disabled={!selectedUpgrade}
                  className="btn-confirm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  Destroy Upgrade
              </button>
          </div>
      </GamePhaseModal>
  );
};

export default DestroyUpgradeModal;