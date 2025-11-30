/**
 * ReputationProgressModal.jsx
 * Displays all reputation levels, progress, and upcoming rewards
 */

import { Award, Gift, ChevronRight, Lock } from 'lucide-react';
import ReputationService from '../../logic/reputation/ReputationService';
import { REPUTATION_LEVELS } from '../../data/reputationRewardsData';
import CardPackBadge from '../ui/CardPackBadge';

function ReputationProgressModal({ onClose, onClaimRewards }) {
  // Get current reputation data
  const levelData = ReputationService.getLevelData();
  const unclaimedRewards = ReputationService.getUnclaimedRewards();
  const unclaimedLevels = new Set(unclaimedRewards.map(r => r.level));

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 10000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Get pack display info
  const getPackInfo = (reward) => {
    if (!reward || reward.type !== 'pack') return null;
    const pack = packTypes[reward.packType];
    return pack ? {
      name: pack.name,
      color: pack.color,
      tier: reward.tier
    } : null;
  };

  // Determine level state
  const getLevelState = (level) => {
    if (unclaimedLevels.has(level.level)) {
      return 'unclaimed';
    }
    if (level.level < levelData.level) {
      return 'completed';
    }
    if (level.level === levelData.level) {
      return 'current';
    }
    return 'upcoming';
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--md"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '550px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: '#a855f7' }}>
            <Award size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">REPUTATION PROGRESS</h2>
            <p className="dw-modal-header-subtitle">
              {levelData.isMaxLevel
                ? `Level ${levelData.level} (MAX)`
                : `Working towards Level ${levelData.level + 1}`} • {formatNumber(levelData.currentRep)} Total Rep
            </p>
          </div>
        </div>

        {/* Current Progress Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--modal-border)',
          background: 'rgba(168, 85, 247, 0.05)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '12px',
            color: 'var(--modal-text-secondary)',
          }}>
            <span>Progress to Level {levelData.level + 1}</span>
            <span>
              {levelData.isMaxLevel
                ? 'MAX LEVEL'
                : `${formatNumber(levelData.currentInLevel)} / ${formatNumber(levelData.requiredForNext)}`}
            </span>
          </div>
          <div style={{
            height: '8px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${levelData.isMaxLevel ? 100 : levelData.progress * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #a855f7 0%, #c084fc 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease-out',
            }} />
          </div>
        </div>

        {/* Body - Scrollable Level List */}
        <div className="dw-modal-body dw-modal-scroll" style={{
          padding: '16px 20px',
          flex: 1,
          minHeight: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {REPUTATION_LEVELS.filter(level => {
              // Hide completed and current levels (only show upcoming levels)
              const state = getLevelState(level);
              return state !== 'completed' && state !== 'current';
            }).map((level, index) => {
              const state = getLevelState(level);
              const packInfo = getPackInfo(level.reward);
              const isUnclaimed = state === 'unclaimed';
              const isUpcoming = state === 'upcoming';
              // First non-unclaimed level is the target (what player is working towards)
              const isTarget = index === 0 && !isUnclaimed;

              return (
                <div
                  key={level.level}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: isUnclaimed
                      ? 'rgba(168, 85, 247, 0.15)'
                      : isTarget
                        ? 'rgba(168, 85, 247, 0.08)'
                        : 'var(--modal-surface)',
                    borderRadius: '6px',
                    border: isUnclaimed
                      ? '1px solid #a855f7'
                      : isTarget
                        ? '1px solid rgba(168, 85, 247, 0.4)'
                        : '1px solid var(--modal-border)',
                    opacity: isUpcoming && !isTarget ? 0.5 : 1,
                  }}
                >
                  {/* State Icon */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: isUnclaimed || isTarget
                      ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
                      : 'rgba(128, 128, 128, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isUnclaimed ? (
                      <Gift size={16} style={{ color: 'white' }} />
                    ) : isTarget ? (
                      <ChevronRight size={16} style={{ color: 'white' }} />
                    ) : (
                      <Lock size={14} style={{ color: '#666' }} />
                    )}
                  </div>

                  {/* Level Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '2px',
                    }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: (isUpcoming && !isTarget) ? '#666' : 'var(--modal-text-primary)',
                      }}>
                        Level {level.level}
                      </span>
                      {isTarget && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#a855f7',
                          color: 'white',
                          fontWeight: 600,
                        }}>
                          TARGET
                        </span>
                      )}
                      {isUnclaimed && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#ef4444',
                          color: 'white',
                          fontWeight: 600,
                        }}>
                          CLAIM
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: (isUpcoming && !isTarget) ? '#555' : 'var(--modal-text-secondary)',
                    }}>
                      {formatNumber(level.threshold)} Rep Required
                    </div>
                  </div>

                  {/* Reward */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: (isUpcoming && !isTarget) ? '#555' : 'var(--modal-text-secondary)',
                  }}>
                    {level.reward === null ? (
                      <span style={{ fontStyle: 'italic', opacity: 0.7 }}>—</span>
                    ) : packInfo ? (
                      <>
                        <Gift size={14} style={{ color: (isUpcoming && !isTarget) ? '#555' : packInfo.color }} />
                        <span style={{
                          maxWidth: '100px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {packInfo.name}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          background: (isUpcoming && !isTarget) ? 'rgba(128,128,128,0.2)' : 'rgba(168, 85, 247, 0.2)',
                          color: (isUpcoming && !isTarget) ? '#555' : '#a855f7',
                        }}>
                          T{packInfo.tier}
                        </span>
                      </>
                    ) : (
                      <span>Unknown Reward</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions" style={{
          borderTop: '1px solid var(--modal-border)',
          padding: '16px 20px',
        }}>
          {unclaimedRewards.length > 0 && (
            <button
              onClick={onClaimRewards}
              className="dw-btn dw-btn-primary"
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                borderColor: '#a855f7',
              }}
            >
              <Gift size={16} />
              Claim {unclaimedRewards.length} Reward{unclaimedRewards.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={onClose}
            className="dw-btn dw-btn-cancel"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReputationProgressModal;
