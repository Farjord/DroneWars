import React from 'react';
import SoundManager from '../../managers/SoundManager.js';
import ReputationTrack from './ReputationTrack';
import MissionPanel from './MissionPanel';
import ReputationService from '../../logic/reputation/ReputationService';
import MissionService from '../../logic/missions/MissionService';
import { HelpCircle } from 'lucide-react';

const HangarHeader = ({
  singlePlayerProfile,
  onShowHelp,
  onShowReputationProgress,
  onShowMissionTracker
}) => {
  const repData = ReputationService.getLevelData();
  const unclaimed = ReputationService.getUnclaimedRewards();

  return (
    <header style={{
      background: 'linear-gradient(45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(-45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(20, 28, 42, 0.95) 0%, rgba(10, 14, 22, 0.95) 100%)',
      backgroundSize: '10px 10px, 10px 10px, 100% 100%',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
      zIndex: 10
    }}>
      {/* Left: Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h1 style={{
          fontSize: '1.5rem',
          color: '#e5e7eb',
          letterSpacing: '0.1em'
        }}>HANGAR</h1>
        <button
          onClick={onShowHelp}
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
        {[
          { label: 'CREDITS', value: singlePlayerProfile?.credits || 0, color: '#fbbf24' },
          { label: 'AI CORES', value: singlePlayerProfile?.aiCores || 0, color: '#f97316' },
          { label: 'TOKENS', value: singlePlayerProfile?.securityTokens || 0, color: '#06b6d4' },
          { label: 'MAP KEYS', value: 0, color: '#60a5fa' },
          { label: 'RUNS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#e5e7eb' },
          { label: 'EXTRACTIONS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#22c55e' },
          { label: 'COMBATS WON', value: singlePlayerProfile?.stats?.totalCombatsWon || 0, color: '#10b981' },
          { label: 'MAX TIER', value: singlePlayerProfile?.stats?.highestTierCompleted || 1, color: '#a855f7' }
        ].map(({ label, value, color }) => (
          <div key={label} className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
            <span className="dw-stat-box-label">{label}</span>
            <span className="dw-stat-box-value" style={{ color }}>{value}</span>
          </div>
        ))}

        <ReputationTrack
          current={repData.currentRep}
          level={repData.level}
          progress={repData.progress}
          currentInLevel={repData.currentInLevel}
          requiredForNext={repData.requiredForNext}
          unclaimedCount={unclaimed.length}
          isMaxLevel={repData.isMaxLevel}
          onClick={() => { SoundManager.getInstance().play('ui_click'); onShowReputationProgress(); }}
        />

        <MissionPanel
          activeCount={MissionService.getActiveCount()}
          claimableCount={MissionService.getClaimableCount()}
          onClick={() => { SoundManager.getInstance().play('ui_click'); onShowMissionTracker(); }}
        />
      </div>
    </header>
  );
};

export default HangarHeader;
