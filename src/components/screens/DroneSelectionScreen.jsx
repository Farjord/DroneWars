// ========================================
// DRONE SELECTION SCREEN COMPONENTS
// ========================================
// Screen components for drone selection during initial setup
// Includes both drone selection interface and waiting screen

import React from 'react';
import { Loader2 } from 'lucide-react';
import DroneCard from '../ui/DroneCard.jsx';

/**
 * WAITING FOR OPPONENT SCREEN COMPONENT
 * Displays waiting screen when opponent is still making selections.
 * Shows loading indicator and current status.
 * @param {string} phase - Current game phase
 * @param {string} localPlayerStatus - Local player completion status
 */
export const WaitingForOpponentScreen = ({ phase, localPlayerStatus }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center p-8">
        <Loader2 className="w-16 h-16 mx-auto text-cyan-400 animate-spin mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">
          Waiting for Your Opponent
        </h2>
        <p className="text-gray-400 text-lg mb-6">
          {phase === 'droneSelection' && 'Your opponent is still selecting their drones...'}
          {phase === 'deckSelection' && 'Your opponent is still choosing their deck...'}
        </p>
        {localPlayerStatus && (
          <div className="bg-slate-800 rounded-lg p-4 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-green-400 mb-2">✅ Your Selection Complete</h3>
            <p className="text-gray-300 text-sm">{localPlayerStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * DRONE SELECTION SCREEN COMPONENT
 * Provides interface for selecting drones during initial setup.
 * Shows trio choices and tracks selected drones.
 * @param {Function} onChooseDrone - Callback when drone is selected
 * @param {Array} currentTrio - Current trio of drones to choose from
 * @param {Array} selectedDrones - Array of already selected drones
 */
const DroneSelectionScreen = ({ onChooseDrone, currentTrio, selectedDrones }) => {
  return (
    <div className="flex flex-col items-center w-full p-4">
      <h2 className="text-3xl font-bold mb-2 text-white text-center">
        Choose Your Drones
      </h2>
      <p className="text-center text-gray-400 mb-6">Choice {selectedDrones.length + 1} of 5: Select one drone from the three options below to add to your Active Drone Pool.</p>

     {currentTrio.length > 0 && (
        <div className="flex flex-wrap justify-center gap-6 mb-8">
         {currentTrio.map((drone, index) => (
           <DroneCard key={drone.name || index} drone={drone} onClick={() => onChooseDrone(drone)} isSelectable={true} deployedCount={0}/>
          ))}
        </div>
      )}

      <div className="w-full mt-8 pt-8 border-t border-gray-700">
        <h3 className="text-2xl font-bold text-white text-center mb-4">Your Selection ({selectedDrones.length}/5)</h3>
       {selectedDrones.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-6">
           {selectedDrones.map((drone, index) => (
             <DroneCard key={index} drone={drone} isSelectable={false} deployedCount={0}/>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No drones selected yet.</p>
        )}
      </div>
    </div>
  );
};

export default DroneSelectionScreen;