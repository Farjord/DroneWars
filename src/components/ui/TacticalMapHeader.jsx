import React from 'react';
import { HelpCircle } from 'lucide-react';
import MissionPanel from './MissionPanel.jsx';
import SoundManager from '../../managers/SoundManager.js';
import { ECONOMY } from '../../data/economyData.js';
import ReputationService from '../../logic/reputation/ReputationService.js';
import MissionService from '../../logic/missions/MissionService.js';

// Hull color helpers
const getSectionColorClass = (section) => {
  if (section.thresholds) {
    const { damaged, critical } = section.thresholds;
    if (section.hull <= critical) return 'stat-value-critical';
    if (section.hull <= damaged) return 'stat-value-warning';
    return 'stat-value-healthy';
  }
  const pct = section.maxHull > 0 ? (section.hull / section.maxHull) * 100 : 0;
  if (pct >= 70) return 'stat-value-healthy';
  if (pct >= 40) return 'stat-value-warning';
  return 'stat-value-critical';
};

const getHullColorClass = (percentage) => {
  if (percentage >= 70) return 'stat-value-healthy';
  if (percentage >= 40) return 'stat-value-warning';
  return 'stat-value-critical';
};

const TacticalMapHeader = ({
  shipSections,
  currentRunState,
  onShowTutorial,
  onShowMissionTracker,
}) => {
  const { creditsEarned, collectedLoot, shipSections: runShipSections } = currentRunState;

  // Calculate extraction limit
  const isStarterDeck = currentRunState.shipSlotId === 0;
  const baseLimit = isStarterDeck
    ? (ECONOMY.STARTER_DECK_EXTRACTION_LIMIT || 3)
    : (ECONOMY.CUSTOM_DECK_EXTRACTION_LIMIT || 6);
  const reputationBonus = isStarterDeck ? 0 : ReputationService.getExtractionBonus();
  const damagedCount = runShipSections
    ? Object.values(runShipSections).filter(section => {
        const threshold = section.thresholds?.damaged ?? 5;
        return section.hull <= threshold;
      }).length
    : 0;
  const extractionLimit = Math.max(0, baseLimit + reputationBonus - damagedCount);
  const isOverLimit = collectedLoot.length > extractionLimit;

  // Calculate total hull
  const totalHull = shipSections.reduce((sum, s) => sum + s.hull, 0);
  const totalMaxHull = shipSections.reduce((sum, s) => sum + s.maxHull, 0);
  const totalHullPercentage = totalMaxHull > 0 ? (totalHull / totalMaxHull) * 100 : 0;

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: '320px',
      background: 'linear-gradient(45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(-45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(20, 28, 42, 0.95) 0%, rgba(10, 14, 22, 0.95) 100%)',
      backgroundSize: '10px 10px, 10px 10px, 100% 100%',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
      zIndex: 150
    }}>
      {/* Left: Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h1 style={{
          fontSize: '1.5rem',
          color: '#e5e7eb',
          letterSpacing: '0.1em',
          margin: 0
        }}>TACTICAL MAP</h1>
        <button
          onClick={() => onShowTutorial('tacticalMap')}
          title="Show help"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#06b6d4',
            opacity: 0.7,
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Right: Stats */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Per-Section Hull */}
        {shipSections.map(section => (
          <div key={section.id} className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
            <span className="dw-stat-box-label">{section.type}</span>
            <span className={`dw-stat-box-value ${getSectionColorClass(section)}`}>
              {section.hull}/{section.maxHull}
            </span>
          </div>
        ))}

        {/* Total Hull */}
        <div className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px', borderColor: 'rgba(6, 182, 212, 0.5)' }}>
          <span className="dw-stat-box-label">Total</span>
          <span className={`dw-stat-box-value ${getHullColorClass(totalHullPercentage)}`}>
            {totalHull}/{totalMaxHull}
          </span>
        </div>

        {/* Credits */}
        <div className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
          <span className="dw-stat-box-label">Credits</span>
          <span className="dw-stat-box-value" style={{ color: '#fbbf24' }}>{creditsEarned}</span>
        </div>

        {/* Loot */}
        <div className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
          <span className="dw-stat-box-label">Loot</span>
          <span className="dw-stat-box-value" style={{ color: '#60a5fa' }}>{collectedLoot.length}</span>
        </div>

        {/* Extract Limit */}
        <div className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }} title={isStarterDeck ? "Starter deck extraction limit" : `Custom deck extraction limit (Base: ${baseLimit}${reputationBonus > 0 ? `, Rep: +${reputationBonus}` : ''}${damagedCount > 0 ? `, Damage: -${damagedCount}` : ''})`}>
          <span className="dw-stat-box-label">Extract Limit</span>
          <span className={`dw-stat-box-value ${isOverLimit ? 'stat-value-warning' : 'stat-value-healthy'}`}>
            {Math.min(collectedLoot.length, extractionLimit)}/{extractionLimit}
          </span>
        </div>

        {/* Mission Tracker */}
        <MissionPanel
          activeCount={MissionService.getActiveCount()}
          claimableCount={MissionService.getClaimableCount()}
          onClick={() => { SoundManager.getInstance().play('ui_click'); onShowMissionTracker(); }}
        />
      </div>
    </header>
  );
};

export default TacticalMapHeader;
