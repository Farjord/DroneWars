import React from 'react';
import { X } from 'lucide-react';
import ShipSection from './ShipSection.jsx';
import { resolveShipSectionStats } from '../../utils/shipSectionImageResolver.js';
import { gameEngine } from '../../logic/gameLogic.js';

const ShipComponentDetailPopup = ({ component, onClose, ship }) => {
  if (!component) return null;

  const resolvedComponent = resolveShipSectionStats(component, ship);

  // Calculate effective stats with or without middle lane bonus
  const calculateMiddleLaneBonusStats = (comp, applyBonus) => {
    const baseStats = comp.stats.healthy;
    const bonus = comp.middleLaneBonus || {};
    const effectiveStats = {};

    Object.keys(baseStats).forEach(stat => {
      effectiveStats[stat] = baseStats[stat] + (applyBonus ? (bonus[stat] || 0) : 0);
    });

    return effectiveStats;
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-info" style={{ flex: 1 }}>
            <h2 className="dw-modal-header-title">{component.name}</h2>
            <p className="dw-modal-header-subtitle">{component.description}</p>
          </div>
          <button onClick={onClose} className="dw-modal-close">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Lane Comparison Notice */}
          <div className="dw-modal-info-box" style={{ marginBottom: '20px', textAlign: 'center', '--modal-theme': '#eab308', '--modal-theme-bg': 'rgba(234, 179, 8, 0.08)', '--modal-theme-border': 'rgba(234, 179, 8, 0.3)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#fde047', fontWeight: 600 }}>
              Compare standard lane stats with middle lane bonus stats. The middle lane provides enhanced performance!
            </p>
          </div>

          {/* Two Columns showing standard and bonus lanes */}
          <div className="grid grid-cols-2 gap-8">
            {/* Left/Right Lane */}
            <div>
              <h3 className="text-center font-orbitron text-lg mb-3" style={{ color: 'var(--modal-text-secondary)' }}>
                LEFT / RIGHT LANE
              </h3>
              <div className="h-[250px]">
                <ShipSection
                  section={component.key}
                  stats={resolvedComponent}
                  effectiveStatsForDisplay={calculateMiddleLaneBonusStats(component, false)}
                  isPlayer={true}
                  isInMiddleLane={false}
                  gameEngine={gameEngine}
                  isInteractive={false}
                  turnPhase="placement"
                  isMyTurn={() => false}
                  passInfo={{}}
                  getLocalPlayerId={() => 'player1'}
                  localPlayerState={{}}
                  shipAbilityMode={null}
                />
              </div>
            </div>

            {/* Middle Lane (Bonus) */}
            <div className="relative">
              <div className="absolute -top-2 -left-2 -right-2 -bottom-2 rounded-lg animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%)' }}></div>
              <div className="relative">
                <h3 className="text-center font-orbitron text-lg mb-3 font-bold" style={{ color: '#eab308' }}>
                  MIDDLE LANE (BONUS)
                </h3>
                <div className="h-[250px]">
                  <ShipSection
                    section={component.key}
                    stats={resolvedComponent}
                    effectiveStatsForDisplay={calculateMiddleLaneBonusStats(component, true)}
                    isPlayer={true}
                    isInMiddleLane={true}
                    gameEngine={gameEngine}
                    isInteractive={false}
                    turnPhase="placement"
                    isMyTurn={() => false}
                    passInfo={{}}
                    getLocalPlayerId={() => 'player1'}
                    localPlayerState={{}}
                    shipAbilityMode={null}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ability Info */}
          {component.ability && (
            <div className="dw-modal-info-box" style={{ marginTop: '20px', '--modal-theme': '#a855f7', '--modal-theme-bg': 'rgba(168, 85, 247, 0.1)', '--modal-theme-border': 'rgba(168, 85, 247, 0.4)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontFamily: 'Orbitron, sans-serif', color: '#a855f7', fontWeight: 700 }}>
                Ship Ability: {component.ability.name}
              </h4>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--modal-text-primary)' }}>
                {component.ability.description}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                Cost: {component.ability.cost.energy} Energy
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-cancel">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipComponentDetailPopup;
