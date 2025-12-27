/**
 * ReputationProgressModal.jsx
 * Displays all reputation levels, progress, and upcoming rewards
 */

import { useState } from 'react';
import { Award, Gift, ChevronRight, Lock, HelpCircle } from 'lucide-react';
import ReputationService from '../../logic/reputation/ReputationService';
import { REPUTATION_LEVELS } from '../../data/reputationRewardsData';
import CardPackBadge from '../ui/CardPackBadge';

function ReputationProgressModal({ onClose, onClaimRewards }) {
  // State for tooltip
  const [showTooltip, setShowTooltip] = useState(false);

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
            <h2 className="dw-modal-header-title">
              REPUTATION PROGRESS
              <button
                onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
                style={{ marginLeft: '8px', padding: '4px', background: 'transparent',
                         border: 'none', color: '#a855f7', cursor: 'pointer',
                         display: 'inline-flex', alignItems: 'center' }}
                title="How combat reputation works"
              >
                <HelpCircle size={18} />
              </button>
            </h2>
            <p className="dw-modal-header-subtitle">
              {levelData.isMaxLevel
                ? `Level ${levelData.level} (MAX)`
                : `Working towards Level ${levelData.level + 1}`} • {formatNumber(levelData.currentRep)} Total Rep
            </p>
          </div>
        </div>

        {/* Tooltip Content */}
        {showTooltip && (
          <div style={{ margin: '12px 20px', padding: '16px',
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        borderRadius: '8px', fontSize: '13px', lineHeight: '1.6' }}>
            <h4 style={{ margin: '0 0 8px', color: '#a855f7', fontSize: '14px' }}>
              How Combat Reputation Works
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Defeat enemies to earn reputation during runs</li>
              <li>Reputation = min(Deck Value, Map Cap) × Enemy Difficulty</li>
              <li>Easy enemies: 0.5× | Medium: 1.0× | Hard: 1.5×</li>
              <li>Each combat is capped separately (can earn from multiple fights)</li>
              <li>Reputation only awarded on successful extraction</li>
              <li>MIA penalty: You keep only 25% of earned reputation</li>
              <li>Escaping combat grants no reputation</li>
            </ul>
          </div>
        )}

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
                    opacity: (isUpcoming && !isTarget) ? 0.5 : 1,
                  }}>
                    {level.reward && level.reward.type === 'pack' ? (
                      <CardPackBadge
                        packType={level.reward.packType}
                        tier={level.reward.tier}
                        compact={true}
                      />
                    ) : (
                      <span style={{ fontStyle: 'italic', opacity: 0.7, fontSize: '12px', color: 'var(--modal-text-secondary)' }}>—</span>
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
