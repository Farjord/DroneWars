// ========================================
// INTERCEPTION OPPORTUNITY MODAL COMPONENT
// ========================================
// Modal that allows player to choose whether to intercept an incoming attack

import React from 'react';
import { Shield, Swords } from 'lucide-react';
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
    <div className="dw-modal-overlay" onClick={onDecline}>
      <div className="dw-modal-content dw-modal--xxl dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon dw-modal-header-icon--pulse">
            <Swords size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Interception Opportunity</h2>
            <p className="dw-modal-header-subtitle">{lane?.replace('lane', 'Lane ') || 'Unknown Lane'}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Combat Preview */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px 0' }}>
            <div className="flex items-start justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs uppercase tracking-widest text-red-400/60">Attacker</div>
                <DroneToken
                  drone={attacker}
                  isPlayer={false}
                  lane={lane}
                  droneRefs={droneRefs}
                  mandatoryAction={mandatoryAction}
                  localPlayerState={localPlayerState}
                />
              </div>

              <div className="text-4xl font-light text-cyan-500/30 px-4 pt-12">VS</div>

              <div className="flex flex-col items-center gap-2">
                <div className="text-xs uppercase tracking-widest text-cyan-400/60">Target</div>
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
                  <div style={{ width: '400px' }}>
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
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--modal-border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', justifyContent: 'center' }}>
              <Shield size={20} style={{ color: 'var(--modal-theme)' }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--modal-text-primary)' }}>Choose Interceptor</span>
            </div>
            <p className="dw-modal-text" style={{ textAlign: 'center', marginBottom: '20px' }}>
              Select a drone to intercept the attack
            </p>

            <div className="flex flex-wrap justify-center gap-8">
              {interceptors.map(drone => (
                <div
                  key={drone.id}
                  className="cursor-pointer transition-all hover:scale-105 hover:drop-shadow-[0_0_20px_rgba(0,255,136,0.4)]"
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
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onDecline}>
            Decline Interception
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterceptionOpportunityModal;