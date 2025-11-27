import React, { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import repairService from '../../logic/economy/RepairService.js';

/**
 * RepairBayModal Component
 * Shows damaged ship components and allows repairing them for credits
 * Uses RepairService for cost calculations and repair operations
 */
const RepairBayModal = ({ onClose }) => {
  const { gameState } = useGameState();
  const [feedback, setFeedback] = useState(null);

  const { singlePlayerProfile } = gameState;
  const credits = singlePlayerProfile?.credits || 0;

  /**
   * Handle repair button click
   */
  const handleRepair = (instance) => {
    const result = repairService.repairComponent(instance.instanceId);

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Component repaired for ${result.cost} credits`
    });

    setTimeout(() => setFeedback(null), 2000);
  };

  /**
   * Repair all damaged components
   */
  const handleRepairAll = () => {
    const result = repairService.repairAllComponents();

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      message: `${result.count} components repaired for ${result.cost} credits`
    });

    setTimeout(() => setFeedback(null), 2000);
  };

  const damagedComponents = repairService.getDamagedComponents();
  const totalRepairCost = repairService.getTotalRepairCost();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Repair Bay</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Credits Display */}
        <div className="mb-4 p-3 bg-gray-900 rounded">
          <span className="text-gray-400">Available Credits: </span>
          <span className="text-yellow-400 font-bold text-lg">{credits}</span>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className={`
            p-3 rounded mb-4
            ${feedback.type === 'success' ? 'bg-green-900 bg-opacity-30 border border-green-700 text-green-200' : ''}
            ${feedback.type === 'error' ? 'bg-red-900 bg-opacity-30 border border-red-700 text-red-200' : ''}
          `}>
            {feedback.message}
          </div>
        )}

        {/* Damaged Components List */}
        {damagedComponents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-lg">No damaged components</p>
            <p className="text-sm mt-2">All ship components are at full hull</p>
          </div>
        ) : (
          <>
            {/* Repair All Button */}
            <div className="mb-4">
              <button
                onClick={handleRepairAll}
                disabled={credits < totalRepairCost}
                className={`
                  w-full px-4 py-3 rounded-lg font-bold transition-colors
                  ${credits >= totalRepairCost
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                  }
                `}
              >
                Repair All ({totalRepairCost} credits)
              </button>
            </div>

            {/* Component List */}
            <div className="space-y-3">
              {damagedComponents.map(instance => {
                const repairCost = repairService.getHullRepairCost(instance);
                const hullPercentage = (instance.currentHull / instance.maxHull) * 100;
                const canAfford = credits >= repairCost;

                return (
                  <div
                    key={instance.instanceId}
                    className="p-4 bg-gray-900 rounded-lg border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-white">{instance.componentId}</h3>
                        <p className="text-sm text-gray-400">
                          Ship Slot {instance.shipSlotId}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Hull</div>
                        <div className={`font-bold ${
                          hullPercentage > 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {instance.currentHull} / {instance.maxHull}
                        </div>
                      </div>
                    </div>

                    {/* Hull Bar */}
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full transition-all ${
                          hullPercentage > 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${hullPercentage}%` }}
                      />
                    </div>

                    {/* Repair Button */}
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-400">
                        Repair Cost: <span className="text-yellow-400 font-bold">{repairCost}</span> credits
                      </div>
                      <button
                        onClick={() => handleRepair(instance)}
                        disabled={!canAfford}
                        className={`
                          px-4 py-2 rounded font-bold transition-colors
                          ${canAfford
                            ? 'bg-blue-600 hover:bg-blue-500'
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                          }
                        `}
                      >
                        Repair
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default RepairBayModal;
