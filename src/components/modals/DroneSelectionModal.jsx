// ========================================
// DRONE SELECTION MODAL
// ========================================
// Modal for selecting up to 5 drones in testing mode
// Displays all available drones as cards in a grid with visual selection feedback

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import DroneCard from '../ui/DroneCard.jsx';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * DroneSelectionModal - Select drones from full collection
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler (cancel)
 * @param {function} onConfirm - Confirm handler (selectedDrones) => void
 * @param {Array} initialSelection - Currently selected drones
 * @param {Array} allDrones - Full drone collection to choose from
 * @param {string} title - Modal title
 */
const DroneSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelection = [],
  allDrones = [],
  title = "Select Drones"
}) => {
  const [selectedDrones, setSelectedDrones] = useState([]);

  // Initialize selection from props
  useEffect(() => {
    if (isOpen) {
      // Convert initial selection to just the base drone data (no IDs)
      const baseDrones = initialSelection.map(drone => {
        const baseDrone = allDrones.find(d => d.name === drone.name);
        return baseDrone || drone;
      });
      setSelectedDrones(baseDrones);
    }
  }, [isOpen, initialSelection, allDrones]);

  if (!isOpen) return null;

  const MAX_SELECTION = 5;
  const selectionCount = selectedDrones.length;
  const isComplete = selectionCount === MAX_SELECTION;
  const canConfirm = isComplete;

  // Check if a drone is selected
  const isDroneSelected = (drone) => {
    return selectedDrones.some(d => d.name === drone.name);
  };

  // Toggle drone selection
  const handleDroneClick = (drone) => {
    const isSelected = isDroneSelected(drone);

    if (isSelected) {
      // Deselect
      setSelectedDrones(prev => prev.filter(d => d.name !== drone.name));
    } else {
      // Select (if under limit)
      if (selectionCount < MAX_SELECTION) {
        setSelectedDrones(prev => [...prev, drone]);
      } else {
        // Show feedback that limit is reached
        // Could add a toast notification here
        debugLog('DRONE_SELECTION', 'Maximum 5 drones already selected');
      }
    }
  };

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(selectedDrones);
    }
  };

  // Sort drones by cost for better organization
  const sortedDrones = [...allDrones].sort((a, b) => a.class - b.class);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border-2 border-cyan-500 p-8 shadow-2xl shadow-cyan-500/20 max-w-[1500px] max-h-[900px] w-[95vw] h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>
        </div>

        {/* Selection Counter */}
        <div className="flex-shrink-0 mb-6">
          <div className="text-center">
            <div className={`text-4xl font-orbitron font-bold ${
              isComplete ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {selectionCount}/{MAX_SELECTION} Drones Selected
            </div>
            {!isComplete && (
              <p className="text-gray-400 text-sm mt-2">
                Click on drones to select or deselect them
              </p>
            )}
            {isComplete && (
              <p className="text-green-400 text-sm mt-2">
                ✓ Ready to confirm selection
              </p>
            )}
          </div>
        </div>

        {/* Scrollable Drone Grid */}
        <div className="overflow-y-auto flex-grow pr-4 mb-6">
          <div className="max-w-[1300px] mx-auto">
            <div className="flex flex-wrap gap-[10px] justify-center">
              {sortedDrones.map((drone, index) => {
                const isSelected = isDroneSelected(drone);
                const canSelect = selectionCount < MAX_SELECTION || isSelected;

                return (
                  <div
                    key={`${drone.name}-${index}`}
                    className={`relative transition-all duration-200 ${
                      isSelected
                        ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-gray-900 scale-105'
                        : canSelect
                        ? 'hover:ring-2 hover:ring-cyan-600 hover:scale-102'
                        : 'opacity-40'
                    }`}
                    style={{
                      filter: isSelected ? 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.6))' : 'none'
                    }}
                  >
                    <DroneCard
                      drone={drone}
                      onClick={() => handleDroneClick(drone)}
                      isSelectable={canSelect}
                      isSelected={isSelected}
                      deployedCount={0}
                      appliedUpgrades={[]}
                      isViewOnly={false}
                    />
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-cyan-400 text-gray-900 font-bold text-sm px-2 py-1 rounded-full shadow-lg z-20 flex items-center gap-1">
                        <span>✓</span>
                        <span>Selected</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex justify-center gap-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="dw-btn dw-btn-cancel"
            style={{
              padding: '12px 32px',
              fontSize: '1.1rem',
              minWidth: '150px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`dw-btn dw-btn-confirm ${!canConfirm ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              padding: '12px 32px',
              fontSize: '1.1rem',
              minWidth: '150px'
            }}
          >
            {canConfirm ? 'Confirm Selection' : `Select ${MAX_SELECTION - selectionCount} More`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DroneSelectionModal;
