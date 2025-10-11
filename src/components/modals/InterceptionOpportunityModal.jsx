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
      <div className="modal-container modal-container-xl">
        <button onClick={onDecline} className="modal-close">
          <X size={24} />
        </button>

        {/* Title */}
        <h2 className="modal-title">Interception!</h2>

        <p className="modal-text mb-6">
          Combat in {lane?.replace('lane', 'Lane ') || 'Unknown Lane'}
        </p>

          {/* Combat Preview */}
          <div className="mb-6 py-8">
            <div className="flex items-start justify-center gap-6">
              <div className="flex flex-col items-center gap-4">
                <div className="text-xs uppercase tracking-widest text-pink-400/60">Attacker</div>
                <div className="transform scale-150 origin-top">
                  <DroneToken
                    drone={attacker}
                    isPlayer={false}
                    lane={lane}
                    droneRefs={droneRefs}
                    mandatoryAction={mandatoryAction}
                    localPlayerState={localPlayerState}
                  />
                </div>
              </div>
              
              <div className="text-5xl font-light text-cyan-500/30 px-4 pt-16">VS</div>
              
              <div className="flex flex-col items-center gap-4">
                <div className="text-xs uppercase tracking-widest text-cyan-400/60">Target</div>
                {targetType === 'drone' ? (
                  <div className="transform scale-150 origin-top">
                    <DroneToken
                      drone={target}
                      isPlayer={true}
                      lane={lane}
                      droneRefs={droneRefs}
                      mandatoryAction={mandatoryAction}
                      localPlayerState={localPlayerState}
                    />
                  </div>
                ) : (
                  <div className="transform scale-[0.95] origin-top" style={{ width: '400px' }}>
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
          </div>

          {/* Interceptors Section */}
          <h3 className="modal-title text-2xl mt-6 mb-2">
            Choose Interceptor
          </h3>
          <p className="modal-text text-sm mb-4">
            Select a drone to intercept the attack
          </p>

          <div className="flex flex-wrap justify-center gap-12 mb-6">
            {interceptors.map(drone => (
              <div 
                key={drone.id} 
                className="cursor-pointer transition-all hover:scale-110 hover:drop-shadow-[0_0_20px_rgba(0,255,136,0.4)]"
              >
                <DroneToken
                  drone={drone}
                  isPlayer={true}
                  onClick={() => onIntercept(drone)}
                  lane={lane}
                  droneRefs={droneRefs}
                  mandatoryAction={mandatoryAction}
                  localPlayerState={localPlayerState}
                />
              </div>
            ))}
          </div>

        {/* Buttons */}
        <div className="flex justify-center gap-6 pt-4">
          <button
            onClick={onDecline}
            className="btn-cancel"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterceptionOpportunityModal;