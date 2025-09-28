// ========================================
// INTERCEPTION OPPORTUNITY MODAL COMPONENT
// ========================================
// Modal that allows player to choose whether to intercept an incoming attack

import React from 'react';
import { X } from 'lucide-react';
import DroneToken from '../ui/DroneToken.jsx';
import ShipSection from '../ui/ShipSection.jsx';

/**
 * INTERCEPTION OPPORTUNITY MODAL COMPONENT
 * Allows player to choose whether to intercept an incoming attack.
 * Shows attacker, target, and available interceptor drones.
 * @param {Object} choiceData - Contains attack details and available interceptors
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onIntercept - Callback when player chooses to intercept
 * @param {Function} onDecline - Callback when player declines interception
 * @param {Object} gameEngine - Game engine reference
 * @param {string} turnPhase - Current turn phase
 * @param {boolean} isMyTurn - Whether it's the local player's turn
 * @param {Object} passInfo - Pass information
 * @param {Function} getLocalPlayerId - Function to get local player ID
 * @param {Object} localPlayerState - Local player state
 * @param {Object} shipAbilityMode - Ship ability mode state
 * @param {Object} droneRefs - Drone references
 * @param {Object} mandatoryAction - Mandatory action state
 */
const InterceptionOpportunityModal = ({
  choiceData,
  show,
  onIntercept,
  onDecline,
  gameEngine,
  turnPhase,
  isMyTurn,
  passInfo,
  getLocalPlayerId,
  localPlayerState,
  shipAbilityMode,
  droneRefs,
  mandatoryAction
}) => {
  if (!show || !choiceData) return null;

  const { attackDetails, interceptors } = choiceData;
  const { attacker, target, targetType, lane } = attackDetails;

  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-3xl">
        {onDecline && (
          <button onClick={onDecline} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">Interception Opportunity!</h2>
        <p className="modal-text">Combat in {lane?.replace('lane', 'Lane ') || 'Unknown Lane'}</p>

        <div className="flex justify-around items-center my-4 p-4 bg-black/20 rounded-lg">
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-pink-400 mb-2">Attacker</h4>
            <DroneToken
              drone={attacker}
              isPlayer={false}
              lane={lane}
              droneRefs={droneRefs}
              mandatoryAction={mandatoryAction}
              localPlayerState={localPlayerState}
            />
          </div>
          <div className="text-4xl font-bold text-gray-500">VS</div>
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-cyan-400 mb-2">Target</h4>
            {targetType === 'drone' ? (
              <DroneToken
                drone={target}
                isPlayer={true}
                lane={lane}
                droneRefs={droneRefs}
                mandatoryAction={mandatoryAction}
                localPlayerState={localPlayerState}
              />
            ) : (
              <div className="transform scale-75">
                <ShipSection
                  section={target.name}
                  stats={localPlayerState.shipSections[target.name]}
                  isPlayer={true}
                  isInteractive={false}
                  gameEngine={gameEngine}
                  turnPhase={turnPhase}
                  isMyTurn={isMyTurn}
                  passInfo={passInfo}
                  getLocalPlayerId={getLocalPlayerId}
                  localPlayerState={localPlayerState}
                  shipAbilityMode={shipAbilityMode}
                />
              </div>
            )}
          </div>
        </div>

        <h3 className="text-center text-white text-xl font-semibold mt-6 mb-2">Choose an Interceptor</h3>
        <p className="text-center text-gray-400 mb-4">Drones with higher speed or special abilities can intercept the attack.</p>
        <div className="flex flex-wrap justify-center gap-8 my-4">
          {interceptors.map(drone => (
            <DroneToken
              key={drone.id}
              drone={drone}
              isPlayer={true}
              onClick={() => onIntercept(drone)}
              lane={lane}
              droneRefs={droneRefs}
              mandatoryAction={mandatoryAction}
              localPlayerState={localPlayerState}
            />
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={onDecline}
            className="btn-cancel"
          >
            Decline Interception
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterceptionOpportunityModal;